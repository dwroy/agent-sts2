"""Disposable per-run extraction caches for the legacy after-run statistics.

The original reducers still define every statistic. Cache keys include original
byte identities, implementation and incoming fight state; interleaved runs keep
cross-run closing order. No pickle, strategy values or inferred evidence.
"""
from collections import Counter, defaultdict
import atexit
import hashlib
import json
import os
from pathlib import Path
import sys
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[2] / "learner"))
from incremental_evidence import FrozenLogIndex, implementation, token

_CONTEXTS = {}


def pack(value):
    if isinstance(value, Counter):
        return ['counter', [[pack(k), pack(v)] for k, v in value.items()]]
    if isinstance(value, defaultdict):
        factory = value.default_factory
        return ['defaultdict', None if factory is None else pack(factory()),
                [[pack(k), pack(v)] for k, v in value.items()]]
    if isinstance(value, dict):
        return ['dict', [[pack(k), pack(v)] for k, v in value.items()]]
    if isinstance(value, (tuple, set, frozenset)):
        items = [pack(v) for v in value]
        if not isinstance(value, tuple):
            items.sort(key=lambda v: json.dumps(v, sort_keys=True))
        return [type(value).__name__, items]
    if isinstance(value, list):
        return ['list', [pack(v) for v in value]]
    if value is None or isinstance(value, (str, bool, int, float)):
        return ['value', value]
    if type(value).__name__ == 'Fight':
        return ['fight', pack(value.__dict__)]
    raise TypeError('unsupported intermediate: ' + type(value).__name__)


def unpack(value, fight_type=None):
    kind, *args = value
    if kind == 'value':
        return args[0]
    if kind == 'fight':
        if fight_type is None:
            raise ValueError('fight class required')
        fight = fight_type.__new__(fight_type)
        fight.__dict__.update(unpack(args[0], fight_type))
        return fight
    if kind in ('dict', 'counter', 'defaultdict'):
        if kind == 'defaultdict':
            prototype, entries = args
            out = defaultdict(None if prototype is None else lambda: unpack(prototype, fight_type))
        else:
            entries, = args
            out = Counter() if kind == 'counter' else {}
        for k, v in entries:
            out[unpack(k, fight_type)] = unpack(v, fight_type)
        return out
    constructors = dict(list=list, tuple=tuple, set=set, frozenset=frozenset)
    if kind not in constructors:
        raise ValueError('unsupported intermediate tag')
    return constructors[kind](unpack(v, fight_type) for v in args[0])


def context(path):
    directory = os.environ.get('STS2_REFRESH_CACHE_DIR')
    if not directory or not path or not Path(path).is_file():
        return None
    logs = Path(path).resolve().parent
    key = (str(Path(directory).resolve()), str(logs))
    if key not in _CONTEXTS:
        _CONTEXTS[key] = RunCache(Path(directory) / token(str(logs))[:16], logs)
    return _CONTEXTS[key]


class RunCache:
    def __init__(self, directory, logs):
        self.index = FrozenLogIndex(directory, logs)
        self.logs = Path(logs)
        self.started = time.monotonic()
        self.streams = set()
        self.timings = []
        self.extractions = {}
        self.code = implementation(__file__, Path(__file__).with_name('incremental_evidence.py'),
                                   Path(__file__).resolve().parents[2] / 'learner/evidence_identity.py')
        atexit.register(self.close)

    def close(self):
        if self.index is None:
            return
        row = dict(schema='legacy-refresh-cache-v1', pid=os.getpid(), seconds=time.monotonic()-self.started,
                   sources={s: self.index.metadata(s) for s in sorted(self.streams)},
                   stats=self.index.stats, phases=self.timings, extractions=self.extractions)
        with (self.index.directory / 'timing.jsonl').open('a') as out:
            out.write(json.dumps(row) + '\n')
        self.index.close()
        self.index = None

    def ready(self, path):
        stream = Path(path).stem
        if stream not in self.streams:
            started = time.monotonic()
            # A writer may be appending a row. Freeze only a newline-terminated prefix.
            with Path(path).open('rb') as source:
                end = source.seek(0, 2)
                while end:
                    source.seek(max(0, end-65536))
                    data = source.read(end-max(0, end-65536))
                    newline = data.rfind(b'\n')
                    if newline >= 0:
                        end = max(0, end-65536) + newline + 1
                        break
                    end = max(0, end-65536)
            self.index.update(stream, end)
            self.streams.add(stream)
            self.timings.append(dict(name='index:'+stream, seconds=time.monotonic()-started,
                                     bytes=end, rows=self.index.metadata(stream)['rows']))
        return stream

    def segments(self, path):
        stream = self.ready(path)
        previous, refs = object(), []
        for ref, rid, _reason in self.index.references(stream):
            if rid != previous and refs:
                yield previous, refs
                refs = []
            previous = rid
            refs.append(ref)
        if refs:
            yield previous, refs

    def groups(self, path, selected=None):
        stream = self.ready(path)
        sql = 'SELECT rid,min(offset) FROM rows WHERE stream=? GROUP BY rid ORDER BY min(offset)'
        for rid, _off in self.index.db.execute(sql, (stream,)):
            if selected is None or rid in selected:
                # NULL identities remain separate evidence; never assign them to a run.
                rows = self.index.db.execute('SELECT offset,line,bytes,sha FROM rows WHERE stream=? AND rid IS ? ORDER BY offset', (stream, rid))
                info = self.index.metadata(stream)
                refs = [dict(source=info['source'], offset=o, line=n, bytes=b, sha256=s) for o,n,b,s in rows]
                yield rid, refs

    def raw(self, path, refs):
        with Path(path).open('rb') as source:
            for ref in refs:
                source.seek(ref['offset'])
                raw = source.read(ref['bytes'])
                if hashlib.sha256(raw).hexdigest() != ref['sha256']:
                    raise ValueError('legacy indexed evidence changed')
                yield raw

    def cached(self, name, refs, produce, extra=None, code=None):
        started = time.monotonic()
        hits = self.index.stats['cache_hits']
        key = [self.code, code, str(self.logs), extra,
               [[r['offset'], r['bytes'], r['sha256']] for r in refs]]
        result = unpack(self.index.cached('legacy:'+name, key, lambda: pack(produce())))
        phase = self.extractions.setdefault(name,dict(seconds=0,hits=0,misses=0))
        phase['seconds'] += time.monotonic()-started
        phase['hits' if self.index.stats['cache_hits']>hits else 'misses'] += 1
        return result

    def products(self, name, inputs, outputs, produce):
        """Skip unchanged batch fits; new samples still use the original estimator."""
        def sha(path):
            return hashlib.sha256(Path(path).read_bytes()).hexdigest()
        stamp = self.index.directory / ('product-'+token([name,list(map(str,outputs))])+'.json')
        key = token([self.code,name,inputs])
        try:
            old = json.loads(stamp.read_text())
            if old['key']==key and old['outputs']==[sha(p) for p in outputs]:
                return False
        except (OSError,ValueError,KeyError,TypeError):
            pass
        produce()
        temporary = stamp.with_suffix('.tmp')
        temporary.write_text(json.dumps(dict(key=key,outputs=[sha(p) for p in outputs])))
        temporary.replace(stamp)
        return True

    def end_turns(self, path, extract):
        result = set()
        for rid, refs in self.groups(path):
            part = self.cached('end-turns', refs, lambda: extract(self.raw(path, refs)), code=implementation(Path(__file__).with_name('build-monster-db.py')))
            result.update(part)
        return result

    def room_scan(self, path, character, extract):
        runs, deaths, first, last = {}, {}, None, None
        # Per-run segments preserve the original first/last timestamp semantics.
        code = implementation(Path(__file__).with_name('build-room-costs.py'))
        for rid, refs in self.segments(path):
            rs, ds, lo, hi = self.cached('room-scan', refs, lambda: extract(self.raw(path, refs)), character, code)
            for run, floors in rs.items():
                for floor, mark in floors.items():
                    old = runs.setdefault(run, {}).setdefault(floor, mark)
                    old['last'] = mark['last']
                    old['type'] = mark['type'] or old['type']
                    old['avail'] = mark['avail'] or old['avail']
            deaths.update(ds)
            first = first or lo
            last = hi or last
        return runs, deaths, first, last

    def room_choices(self, path, fights, extract):
        chosen = {}
        code = implementation(Path(__file__).with_name('build-room-costs.py'))
        for rid, refs in self.segments(path):
            def produce():
                fs = {} if fights is not None else None
                return extract(self.raw(path, refs), fs), fs
            cs, fs = self.cached('room-choices', refs, produce, fights is not None, code)
            chosen.update(cs)
            if fights is not None:
                for key, pair in fs.items():
                    fights.setdefault(key, list(pair))[1] = pair[1]
        return chosen

    def outcome_decisions(self, path, runs, extract):
        outputs = [defaultdict(list) for _ in range(3)]
        code = implementation(Path(__file__).with_name('build-outcome-stats.py'))
        for rid, refs in self.groups(path, runs):
            part = self.cached('outcome-decisions', refs, lambda: extract({rid:runs[rid]}, self.raw(path, refs)), [rid,runs[rid]], code)
            for output, rows in zip(outputs, part):
                output.update(rows)
        return tuple(outputs)

    def outcome_states(self, path, runs, table_of, extract, iterator):
        result = dict(acquired_cards={}, acquired_relics={}, offered={}, max_act={}, event_screens={}, rest_screens={}, names_by_table=defaultdict(lambda:dict(card={},relic={},event={})))
        names = []
        code = implementation(Path(__file__).with_name('build-outcome-stats.py'))
        for rid, refs in self.groups(path, runs):
            def produce():
                # Name tie-breaking follows first raw offset, including interleaved runs.
                origins = {}
                def entries():
                    for ref, raw in zip(refs, self.raw(path, refs)):
                        for screen, row in iterator(path, [raw]):
                            s = row.get('state') or {}; run = s.get('run') or {}
                            items = [('card',c.get('card_id')) for c in run.get('deck') or []]
                            items += [('relic',r.get('relic_id')) for r in run.get('relics') or []]
                            if screen == 'REWARD':
                                items += [('card',c.get('card_id')) for c in (s.get('reward') or {}).get('card_options') or []]
                            if screen == 'EVENT':
                                items += [('event',(s.get('event') or {}).get('event_id'))]
                            for key in items:
                                if key[1]: origins.setdefault(key, ref['offset'])
                            yield screen, row
                return extract({rid:runs[rid]}, entries()), origins
            part, origins = self.cached('outcome-states', refs, produce, [rid,runs[rid],table_of(rid)], code)
            for key in result:
                if key != 'names_by_table': result[key].update(part[key])
            for table, kinds in part['names_by_table'].items():
                for kind, mapping in kinds.items():
                    for ident, name in mapping.items():
                        names.append((origins[(kind,ident)], table, kind, ident, name))
        for _off, table, kind, ident, name in sorted(names, key=lambda r:r[0]):
            result['names_by_table'][table][kind].setdefault(ident, name)
        return result

    def construction(self, root, logs, character, cutoff, extract, lookup):
        from datetime import datetime, timezone
        runs = {}
        for raw in (logs/'runs.jsonl').read_text().splitlines():
            row = json.loads(raw)
            if str(row.get('character','')).lower() == character: runs[row['run_id']]=row
        catalog = json.loads((root/'data/game-data.json').read_text())['collections']['cards']
        names = {c['name']:c['id'] for c in catalog if c.get('name')}
        names.update({c['id']:c['id'] for c in catalog})
        frames = lookup(root,character)
        self.ready(logs/'states.jsonl')
        rows, excluded, result = [], Counter(), None
        code = implementation(Path(__file__).with_name('build-construction-opportunities.py'))
        for rid,refs in self.groups(logs/'brain.jsonl',runs):
            own = {key:value for key,value in frames.items() if key[0]==rid}
            extra = [runs[rid],names,pack(own),self.index.run_signature(rid,['states']),cutoff]
            def produce():
                lines = ((ref['offset'],raw) for ref,raw in zip(refs,self.raw(logs/'brain.jsonl',refs)))
                return extract(root,logs,character,cutoff,({rid:runs[rid]},names,own),lines)
            result = self.cached('construction',refs,produce,extra,code)
            rows.extend(result['rows']); excluded.update(result['excluded'])
        if result is None:
            result=extract(root,logs,character,cutoff,({},names,{}),iter(()))
        rows.sort(key=lambda r:r['source']['offset'])
        meta = self.index.metadata('brain')
        return dict(result,generated=datetime.now(timezone.utc).isoformat(),rows=rows,excluded=dict(excluded) or result['excluded'],
                    digest=hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),
                    cutoff=cutoff or max((r['ts'] for r in rows),default=''),
                    source_digest=meta['source_sha256'],source_bytes=meta['source_size'])

    def potion_partitions(self, con, fetch, character=None):
        # LogDB can lag raw logs. Include compact table watermarks as well as raw
        # evidence identities, so a later sync cannot reuse an incomplete query.
        tables = ('frames','turns','fights','decisions','state_index','runs')
        versions = implementation(*(Path(__file__).resolve().parents[2] / 'agent/tools/logdb' / f
                                    for f in ('extract.py','sync.py','views.sql')))
        signatures = defaultdict(dict)
        for table in tables:
            for row in fetch(con, 'SELECT run_id, count(*) AS n FROM '+table+' GROUP BY run_id'):
                signatures[row['run_id']][table] = row['n']
        for stream in ('states','decisions','runs'):
            path = self.logs/(stream+'.jsonl')
            if path.exists():
                for rid,refs in self.groups(path):
                    signatures[rid][stream+':raw'] = token([[r['offset'],r['bytes'],r['sha256']] for r in refs])
        if character:
            # Resolve ownership once. Repeating runs_of() inside every per-run
            # query rescans all frames, including runs that cannot contribute.
            from characters import LEGACY
            owners = {row['run_id']: row['character'] for row in fetch(con,
                "SELECT run_id, lower(coalesce(arg_max(character, off), '" + LEGACY +
                "')) AS character FROM frames WHERE run_id IS NOT NULL GROUP BY run_id")}
            if character == LEGACY:
                signatures = {rid:part for rid,part in signatures.items()
                              if owners.get(rid or '', LEGACY) == LEGACY}
            else:
                signatures = {rid:part for rid,part in signatures.items()
                              if rid is not None and owners.get(rid) == character}
        return {rid:[versions,part] for rid,part in signatures.items()}

    def potion_cached(self, name, partitions, parameters, code, single, batch):
        class Missing(Exception):
            pass
        result, missing = {}, []
        def absent():
            raise Missing()
        for rid, signature in sorted(partitions.items(), key=lambda r: str(r[0])):
            try:
                result[rid] = self.cached(name, [], absent, [rid, signature, *parameters], code)
            except Missing:
                # This was a lookup only; count the eventual extraction once.
                self.index.stats['cache_misses'] -= 1
                missing.append(rid)
        if missing:
            started = time.monotonic()
            values = batch(missing) if len(missing) > 1 else {missing[0]: single(missing[0])}
            self.timings.append(dict(name=name+':query', seconds=time.monotonic()-started, runs=len(missing)))
            for rid in missing:
                result[rid] = self.cached(name, [], lambda: values[rid],
                                          [rid, partitions[rid], *parameters], code)
        return result

    def potion_logs(self, con, ascensions, character, extract, fetch, scope):
        code = implementation(Path(__file__).with_name('build-potion-equivalents.py'))
        result = dict(turns=[],fights=[],seen=Counter(),drinks=Counter(),boss_drinks=[],
                      entropic=dict(slots=None,n=0),questions=[],boss_drink_rows=[],last_fight='None',all_fights=0)
        boss, weighted = Counter(), []
        parts = self.potion_cached('potion-logs', self.potion_partitions(con,fetch,character),
            [list(ascensions),character], code,
            lambda rid: extract(con,ascensions,None,run_id=rid),
            lambda ids: extract(con,ascensions,None,run_ids=ids))
        for rid, part in sorted(parts.items(), key=lambda r: str(r[0])):
            for key in ('turns','fights','questions','boss_drink_rows'): result[key].extend(part[key])
            result['seen'].update(part['seen']); result['drinks'].update(part['drinks'])
            for row in part['boss_drinks']: boss[(row['id'],row['ascension'])] += row['n']
            if part['entropic']['n']:
                weighted.append(part['entropic']['slots']*part['entropic']['n'])
                result['entropic']['n'] += part['entropic']['n']
            if part['last_fight']!='None':
                result['last_fight']=max(result['last_fight'].replace('None',''),part['last_fight'])
            result['all_fights'] += part['all_fights']
        result['boss_drinks']=[dict(id=pid,ascension=asc,n=n) for (pid,asc),n in boss.items()]
        if result['entropic']['n']: result['entropic']['slots']=sum(weighted)/result['entropic']['n']
        for key in ('questions','boss_drink_rows'): result[key].sort(key=lambda r:r['off'])
        return result

    def potion_checks(self, logs, handle, names, mc_extract, check_extract):
        code = implementation(Path(__file__).with_name('build-potion-equivalents.py'))
        questions,drinks=defaultdict(list),defaultdict(list)
        for row in logs['questions']: questions[row['run_id']].append(row)
        for row in logs['boss_drink_rows']: drinks[row['run_id']].append(row)
        parts=[]
        for rid,refs in self.groups(Path(handle.name),set(questions)|set(drinks)):
            qs,ds=questions[rid],drinks[rid]
            def produce():
                # Keep the original per-observation MC inputs; merge in raw-offset
                # order before taking means, rather than averaging run averages.
                observed=[]
                for q in qs:
                    handle.seek(q['off']); line=handle.readline()
                    if b'"random"' not in line: continue
                    row=json.loads(line)
                    for entry in (row.get('potions') or {}).get('random') or []:
                        if isinstance(entry.get('hp_saved_mean'),(int,float)) and isinstance(entry.get('dmg_gained_mean'),(int,float)):
                            observed.append((q['off'],q['ascension'],entry['potion'],entry['hp_saved_mean'],entry['dmg_gained_mean']))
                return observed,check_extract(ds,qs,handle,names)
            parts.append(self.cached('potion-checks',refs,produce,[qs,ds,names],code))
        samples=defaultdict(lambda:defaultdict(list)); checks=defaultdict(list)
        for off,asc,pid,hp,dmg in sorted((row for rows,_ in parts for row in rows),key=lambda r:r[0]):
            samples[asc][pid].append((hp,dmg))
        for _,part in parts:
            for key,values in part.items(): checks[key].extend(values)
        mc={asc:{pid:dict(hp=sum(h for h,_ in values)/len(values),dmg=sum(d for _,d in values)/len(values),n=len(values))
                 for pid,values in by.items()} for asc,by in samples.items()}
        return mc,checks

    def potion_shops(self, con, handle, minimum, character, extract, fetch, scope):
        offers,visits=[],0
        code = implementation(Path(__file__).with_name('build-potion-equivalents.py'))
        parts = self.potion_cached('potion-shops', self.potion_partitions(con,fetch,character),
            [minimum,character], code,
            lambda rid: extract(con,handle,minimum,None,run_id=rid),
            lambda ids: extract(con,handle,minimum,None,run_ids=ids))
        for rid, (rows,n) in sorted(parts.items(), key=lambda r: str(r[0])):
            offers.extend(rows);visits+=n
        return offers,visits

    def boss_rows(self, path, character, extract, bosses):
        result = {}
        code = implementation(Path(__file__).with_name('build-boss-damage.py'))
        needles = [f'"enemy_id":"{enemy}"'.encode() for enemy in bosses]
        for rid, refs in self.groups(path):
            part = self.cached('boss-rows', refs, lambda: extract((raw for raw in self.raw(path,refs) if any(n in raw for n in needles)),character), character, code)
            for key, mapping in part.items():
                result.setdefault(key,{}).update(mapping)
        return result

    def card_rows(self, path, module):
        parts = []
        code = implementation(module.__file__)
        for rid, refs in self.groups(path):
            def produce():
                seen, faces, out = set(), set(), []
                for ref, raw in zip(refs, self.raw(path, refs)):
                    try: row = json.loads(raw)
                    except (ValueError, UnicodeError):
                        out.append((ref['offset'],raw.decode('utf8',errors='surrogateescape')))
                        continue
                    state = row.get('state',row); run = state.get('run') or {}
                    witnesses = []
                    for card in module.cards(state):
                        key = module.canonical({k:v for k,v in card.items() if k!='index'})
                        if key not in seen:
                            seen.add(key); witnesses.append(card)
                    deck = []
                    if state.get('in_combat') is False and (state.get('run_id') or run.get('run_id')):
                        for i,card in enumerate(run.get('deck',[])):
                            face = module.clean_face(card)
                            key = module.canonical(face) if face else None
                            if key and key not in faces:
                                faces.add(key)
                                while len(deck)<=i: deck.append({})
                                deck[i]=card
                    if not witnesses and not deck: continue
                    reduced = dict(ts=row.get('ts'), _raw_sha256=ref['sha256'],state={
                        '_cards':witnesses, 'in_combat':state.get('in_combat'), 'run_id':state.get('run_id'),
                        'run':{**{k:run[k] for k in ('run_id','character_id','ascension','ascension_level','floor') if k in run},'deck':deck}})
                    if row.get('source'): reduced['source']=row['source']
                    out.append((ref['offset'], json.dumps(reduced,ensure_ascii=False,separators=(',',':'))+'\n'))
                return out
            parts.extend(self.cached('card-witnesses', refs, produce, code=code))
        for off, raw in sorted(parts, key=lambda p:p[0]):
            yield off, raw.encode('utf8',errors='surrogateescape')


def merge_stuns(target, source, evidence_limit):
    for eid, row in source.items():
        out = target[eid]
        for key, value in row.items():
            if isinstance(value, Counter): out[key].update(value)
            elif isinstance(value, set): out[key].update(value)
            elif isinstance(value, list):
                for item in value:
                    if len(out[key]) < evidence_limit and item not in out[key]: out[key].append(item)
            else: out[key] += value


def consume_fights(module, builder, states, extra_code=None):
    cache = context(states)
    if not cache:
        for screen, entry in module.iter_entries(states): builder.feed(screen, entry)
        return
    code = implementation(module.__file__, *([extra_code] if extra_code else []))
    original_commit = builder.commit
    mechanics = module.MECHANICS
    original_frame = mechanics.frame
    game_identity = token(pack([module.GAME_TYPES,module.GAME_POWER_TYPES,module.STATUS_CARDS,module.TEMPORARY_POWERS]))
    for rid, refs in cache.segments(states):
        started = time.monotonic()
        # A segment can touch its own pending fights and close another open fight.
        # Unrelated pending runs are immutable until their own next segment or finish.
        involved = {rid, *builder.open}
        local_await = {r:fights for r,fights in builder.await_map.items() if r in involved}
        carry = pack((builder.open,local_await))
        extra = dict(carry=carry, await_order=list(builder.await_map), runs={r:builder.runs.get(r) for r in involved if r},
                     end_turns=sorted(t for t in module.END_TURNS or () if t[0] in involved),
                     checked=module.END_TURNS is not None, ok=mechanics.ok, error=mechanics.error,
                     game=game_identity)
        # Commits are replayed by the original reducer, in original order. The only
        # frame-level global accumulator is stuns; all other frame state is on Fight.
        identity = [cache.code,code,str(cache.logs),extra,[[r['offset'],r['bytes'],r['sha256']] for r in refs]]
        produced = False
        def produce():
            nonlocal produced
            produced = True
            committed = []
            frames = module.Mechanics(quiet=True)
            def frame(*args, **kwargs):
                frames.ok = mechanics.ok
                frames.frame(*args, **kwargs)
                if not frames.ok:
                    mechanics.ok,mechanics.error=frames.ok,frames.error
            def commit(fight):
                committed.append(dict(fight=pack(fight),ok=mechanics.ok,error=mechanics.error))
                original_commit(fight)
            builder.commit, mechanics.frame = commit, frame
            try:
                for screen, entry in module.iter_entries(states, cache.raw(states,refs)):
                    builder.feed(screen,entry)
                return dict(committed=committed, carry=pack((builder.open,{r:fights for r,fights in builder.await_map.items() if r in involved})),
                            await_order=list(builder.await_map), stuns=pack(frames.stuns),ok=mechanics.ok,error=mechanics.error)
            finally:
                builder.commit,mechanics.frame=original_commit,original_frame
        value = cache.index.cached('legacy:fights',identity,produce)
        builder.open,local_await=unpack(value['carry'],module.Fight)
        remaining = {r:fights for r,fights in builder.await_map.items() if r not in involved}
        remaining.update(local_await)
        builder.await_map = defaultdict(list,((r,remaining[r]) for r in value['await_order']))
        merge_stuns(mechanics.stuns,unpack(value['stuns']),module.EVIDENCE)
        if not produced:
            for item in value['committed']:
                mechanics.ok,mechanics.error=item['ok'],item['error']
                original_commit(unpack(item['fight'],module.Fight))
        mechanics.ok,mechanics.error=value['ok'],value['error']
        phase = cache.extractions.setdefault('fights', dict(seconds=0,hits=0,misses=0))
        phase['seconds'] += time.monotonic()-started
        phase['misses' if produced else 'hits'] += 1


def choice_lines(path, fallback):
    cache=context(path)
    if not cache:
        yield from fallback
        return
    code=implementation(Path(__file__).with_name('build-fight-value.py'))
    parts=[]
    for rid,refs in cache.groups(path):
        def produce():
            out=[]
            for ref,raw in zip(refs,cache.raw(path,refs)):
                if b'"combat/plan-choice' not in raw: continue
                try: row=json.loads(raw)
                except ValueError: continue
                out.append((ref['offset'],{k:row.get(k) for k in ('ts','turn','decider')}))
            return out
        parts.extend(cache.cached('fight-choices',refs,produce,code=code))
    for _off,row in sorted(parts,key=lambda p:p[0]):
        yield json.dumps(dict(row,label='combat/plan-choice'))

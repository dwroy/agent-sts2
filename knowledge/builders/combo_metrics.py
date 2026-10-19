"""Evidence-only combo statistics. No card, enemy or relic knowledge lives here."""
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import random
import statistics


METRICS = (
    'dpr_boss dpr_elite dpr_normal dpr_turns_1_3 dpr_turns_4_6 dpr_turns_7_plus '
    'peak_turn_damage aoe_damage block_per_turn hp_loss_per_turn startup_turn '
    'startup_energy startup_draw first_completed_floor formed_runs cleared_runs '
    'mean_reached_floor chain_reached chain_won chain_win_rate formation_rate '
    'deck_size_min deck_size_max deck_size_scaling potion_dependency sl_dependency '
    'key_relic_dependency').split()


def numeric(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def act_index(value):
    """The runtime serializes act_id as a zero-based numeric string or integer."""
    if isinstance(value, str) and value in {str(n) for n in range(10)}:
        return int(value)
    return value if isinstance(value, int) and not isinstance(value, bool) and 0 <= value < 10 else None


def quantile(values, q):
    values = sorted(values)
    at = (len(values) - 1) * q
    low = math.floor(at)
    return values[low] + (values[math.ceil(at)] - values[low]) * (at - low)


def evidence(row):
    out = {'run_id': row['run_id'], 'floor': row['floor']}
    if isinstance(row.get('turn'), int):
        out['turn'] = row['turn']
    return out


def statistic(samples, unit, method, reducer='median', reason='没有符合口径的可核实观察', with_distribution=False):
    """Samples are (value, observation), pre-aggregated once per independent run."""
    samples = [(v, r) for v, r in samples if numeric(v)]
    base = dict(n=len(samples), unit=unit, method=method, value=None, p25=None, p75=None,
                se=None, distribution=[], evidence=[], unknown_reason=reason, small_sample=True)
    if not samples:
        return base
    values = [v for v, _ in samples]
    reduce = {'median': statistics.median, 'mean': statistics.mean, 'sum': sum,
              'min': min, 'max': max}[reducer]
    clusters = defaultdict(list)
    for value, row in samples:
        clusters[row['run_id']].append(value)
    if len(clusters) != len(samples):
        raise ValueError('statistics require one pre-aggregated observation per independent run')
    # Match the learner's independent-run estimator, including its frozen seed.
    se = None
    if reducer == 'mean' and len(samples) >= 2:
        se = statistics.stdev(values) / math.sqrt(len(values))
    elif reducer == 'median' and len(samples) >= 3:
        rng = random.Random(20261019)
        se = statistics.stdev(statistics.median(rng.choices(values, k=len(values))) for _ in range(400))
    refs = {json.dumps(evidence(r), sort_keys=True): evidence(r) for _, r in samples}
    counts = Counter(float(v) for v in values)
    base.update(value=reduce(values), p25=quantile(values, .25) if reducer != 'sum' else None,
                p75=quantile(values, .75) if reducer != 'sum' else None, se=se,
                distribution=[{'label': str(v), 'count': counts[v]} for v in sorted(counts)] if with_distribution else [],
                evidence=list(refs.values()), small_sample=len(clusters) < 10, unknown_reason=None)
    base['method'] += f'；n按{unit}，独立局={len(clusters)}；{reducer}；中位数SE=400次固定种子20261019独立局bootstrap（n≥3），均值SE按局（n≥2），计数/极值SE未知；非因果'
    return base


def rate(samples, method, reason='没有可核独立局分母'):
    out = statistic(samples, 'independent_run', method+'；观察比例，边界SE=0不代表确定', 'mean', reason)
    if out['n']:
        out['se'] = math.sqrt(out['value'] * (1-out['value']) / out['n'])
    return out


def holding(requirements, deck):
    """Bipartite matching: alternatives/upgrade subsets cannot consume a copy twice.

    upgraded=false means no upgrade requirement, as in the learner's contract.
    """
    if not isinstance(deck, list):
        return None
    slots = []
    for req in requirements:
        if not isinstance(req.get('count'), int) or not 1 <= req['count'] <= 100 or not isinstance(req.get('upgraded'), bool):
            raise ValueError('cards require count=1..100 and explicit upgraded boolean')
        ids = req.get('any_of', [req.get('id')])
        if not ids or not all(isinstance(x, str) and x for x in ids):
            raise ValueError('invalid card requirement')
        candidates = [i for i, card in enumerate(deck) if card.get('card_id') in ids and
                      (not req['upgraded'] or card.get('upgraded') is True)]
        slots.extend([candidates] * req['count'])
    if len(slots) > len(deck):
        return False
    assigned = {}

    def match(slot, seen):
        for card in slots[slot]:
            if card in seen:
                continue
            seen.add(card)
            if card not in assigned or match(assigned[card], seen):
                assigned[card] = slot
                return True
        return False

    return all(match(s, set()) for s in sorted(range(len(slots)), key=lambda s: len(slots[s])))


def activation(rule, frame, plays, depth=0):
    """Restricted, declarative learner-supplied activation predicate; missing is unknown.

    This is deliberately separate from the combat predicate runtime. Each rule is
    bound to the source deck and same fight; no arbitrary expressions or code.
    """
    if depth > 12:
        raise ValueError('activation rule depth exceeds 12')
    if rule is None:
        return None
    if not isinstance(rule, dict) or len(rule) != 1:
        raise ValueError('activation rule needs one operator')
    op, value = next(iter(rule.items()))
    if op in ('all', 'any'):
        if not isinstance(value, list) or not 1 <= len(value) <= 100:
            raise ValueError('activation all/any requires 1..100 children')
        values = [activation(v, frame, plays, depth+1) for v in value]
        if op == 'all':
            return False if False in values else None if None in values else True
        return True if True in values else None if None in values else False
    if op not in ('played', 'player_power', 'enemy_power'):
        raise ValueError(f'unsupported activation operator: {op}')
    if not isinstance(value, dict) or set(value) != {'id', 'at_least'} or not isinstance(value['id'], str) or not numeric(value['at_least']) or value['at_least'] <= 0:
        raise ValueError('activation atom requires id and positive at_least')
    if op == 'played':
        amount = plays.get(value['id'], 0)
    elif op == 'player_power':
        powers = ((frame.get('combat') or {}).get('player') or {}).get('powers')
        if not isinstance(powers, list):
            return None
        amount = next((p.get('amount') for p in powers if p.get('power_id') == value['id']), 0)
    else:
        enemies = (frame.get('combat') or {}).get('enemies')
        if not isinstance(enemies, list) or not enemies or any(not isinstance(e.get('powers'), list) for e in enemies):
            return None
        amounts = [next((p.get('amount') for p in e['powers'] if p.get('power_id') == value['id']), 0) for e in enemies]
        amount = max(amounts) if all(numeric(x) for x in amounts) else None
    return amount >= value['at_least'] if numeric(amount) else None


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read_rows(path, limit, spans=None, audit=None, exclusions=None):
    """Read immutable byte cuts; hash every scanned range and each retained source row."""
    if not isinstance(limit, int) or not 0 <= limit <= path.stat().st_size:
        raise ValueError(f'invalid byte limit: {path}')
    ranges = spans if spans is not None else [(0, limit)]
    with path.open('rb') as handle:
        for start, end in ranges:
            if not 0 <= start <= end <= limit:
                raise ValueError(f'range outside frozen cut: {path}:{start}:{end}')
            handle.seek(start)
            sha = hashlib.sha256()
            while handle.tell() < end:
                offset = handle.tell()
                raw = handle.readline(end - offset)
                if not raw.endswith(b'\n'):
                    raise ValueError(f'partial JSONL row at {path}:{offset}')
                sha.update(raw)
                exclusion = (exclusions or {}).get((str(path.resolve()), offset))
                try:
                    row = json.loads(raw)
                except (ValueError, UnicodeDecodeError):
                    if (exclusion is None or exclusion['source_size'] != limit or
                        exclusion['bytes'] != len(raw) or exclusion['sha256'] != digest(raw)):
                        raise ValueError(f'unlisted or changed malformed JSONL row at {path}:{offset}')
                    continue
                if exclusion is not None:
                    raise ValueError(f'excluded row is valid JSON at {path}:{offset}')
                ref = dict(path=str(path), offset=offset, bytes=len(raw), sha256=digest(raw))
                yield row, ref
            if audit is not None:
                audit.append(dict(path=str(path), offset=start, bytes=end-start, sha256=sha.hexdigest()))


def snapshots_to_fights(rows, summaries, actions):
    """Separate resets; never merge two attempts or infer death from a missing frame."""
    fights, current, previous = [], None, None
    for row in rows:
        state = row['state']
        run = state.get('run') or {}
        if not state.get('in_combat'):
            if current:
                current['close'] = row
                fights.append(current)
            current, previous = None, None
            continue
        if not state.get('combat') or not isinstance(state.get('turn'), int):
            continue  # In-combat selection/animation does not end a fight.
        key = (run.get('act_id'), run.get('floor'))
        matches = [s for s in summaries if s['floor'] == key[1] and s.get('started_at') and
                   s['started_at'] <= row['ts'] <= s.get('ended_at', s['ts'])]
        summary = matches[0] if len(matches) == 1 else None
        window = summary['_source']['offset'] if summary else None
        player = state['combat'].get('player') or {}
        old_player = ((previous or {}).get('state', {}).get('combat') or {}).get('player') or {}
        reset = previous and (state['turn'] < previous['state']['turn'] or
                            (state['turn'] == previous['state']['turn'] and
                             numeric(player.get('cards_played_this_turn')) and numeric(old_player.get('cards_played_this_turn')) and
                             player['cards_played_this_turn'] < old_player['cards_played_this_turn']))
        if current and (key != current['key'] or reset or window != current['window']):
            fights.append(current)
            current = None
        if current is None:
            current = dict(run_id=state['run_id'], floor=key[1], key=key, frames=[], close=None,
                           summary=summary, window=window, ambiguous_summary=len(matches) > 1)
        current['frames'].append(row)
        previous = row
    if current:
        fights.append(current)
    # A unique explicit summary may cross a non-combat animation. It is the only
    # evidence permitting coalescing; floor/enemy equality alone is insufficient.
    merged, windows = [], {}
    for fight in fights:
        key = fight['window']
        if key is not None and key in windows:
            old = windows[key]
            old['frames'].extend(fight['frames'])
            old['close'] = fight['close']
        else:
            merged.append(fight)
            if key is not None:
                windows[key] = fight
    for fight in merged:
        start, end = fight['frames'][0]['ts'], fight['frames'][-1]['ts']
        fight['actions'] = [a for a in actions if start <= a['ts'] <= end]
    return merged


def compact(row, source):
    """Retain observed fields and the raw byte reference, not repeated rules text."""
    s = row['state']; r = s.get('run') or {}; c = s.get('combat') or {}
    run = {k: r[k] for k in ('character_id', 'floor', 'act_id', 'ascension', 'current_hp', 'max_hp') if k in r}
    if isinstance(r.get('deck'), list):
        run['deck'] = [{k: card[k] for k in ('card_id', 'upgraded') if k in card} for card in r['deck']]
    if isinstance(r.get('relics'), list):
        run['relics'] = [{'relic_id': relic.get('relic_id')} for relic in r['relics']]
    state = {k: s[k] for k in ('run_id', 'turn', 'screen', 'in_combat', 'game_over', 'map') if k in s}
    state['run'] = run
    if c:
        state['combat'] = {k: c[k] for k in ('player', 'action_readiness') if k in c}
        for key, fields in [('hand', ('index', 'card_id', 'upgraded', 'energy_cost')), ('enemies', ('index', 'enemy_id', 'current_hp', 'max_hp', 'block', 'is_alive', 'powers'))]:
            if isinstance(c.get(key), list):
                state['combat'][key] = [{k: item[k] for k in fields if k in item} for item in c[key]]
    for container, key in [('reward', 'card_options'), ('shop', 'cards')]:
        value = s.get(container) or {}
        if isinstance(value.get(key), list):
            state[container] = {key: [{k: card[k] for k in ('card_id', 'upgraded', 'index', 'is_stocked') if k in card} for card in value[key]]}
    return dict(ts=row['ts'], state=state, _source=source)


def extract(logs, character, limits, inventory=None, selected=None, exclusions=None):
    """Normalize actual runtime JSONL; no final-deck backfill or hidden simulator."""
    audit, runs, grouped = [], {}, defaultdict(list)
    for row, source in read_rows(logs/'runs.jsonl', limits['runs.jsonl'], audit=audit, exclusions=exclusions):
        if str(row.get('character', '')).lower() == character and row.get('ended') and (selected is None or row['run_id'] in selected):
            if row['run_id'] in runs and {k: v for k, v in runs[row['run_id']].items() if k != '_source'} != row:
                raise ValueError('conflicting ended run identity')
            runs[row['run_id']] = dict(row, _source=source)
    if selected and selected - runs.keys():
        raise ValueError('selected run is not ended or belongs to another character')
    by_id = None
    if inventory is not None:
        by_id = {r['run_id']: r for r in inventory}
        if runs.keys() - by_id.keys():
            raise ValueError('run inventory does not cover selected ended runs')

    def ranges(name):
        if by_id is None:
            return None
        # Merge overlapping ranges once, preserving raw order and preventing duplicate rows.
        spans = []
        for rid in runs:
            span = by_id[rid]['stream_ranges'][name]
            if span['rows']:
                spans.append((span['first_offset'], span['end_offset']))
        merged = []
        for start, end in sorted(spans):
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
            else:
                merged.append((start, end))
        return merged

    summaries, actions = defaultdict(list), defaultdict(list)
    for name, target in [('sl-attempts.jsonl', summaries), ('decisions.jsonl', actions)]:
        if name not in limits:
            continue
        for row, source in read_rows(logs/name, limits[name], ranges(name), audit, exclusions):
            if row.get('run_id') in runs:
                target[row['run_id']].append(dict(row, _source=source))
    for row, source in read_rows(logs/'states.jsonl', limits['states.jsonl'], ranges('states.jsonl'), audit, exclusions):
        state = row.get('state') or {}
        rid = state.get('run_id')
        if rid not in runs or row.get('ts', '') > runs[rid]['ended']:
            continue
        actual = str((state.get('run') or {}).get('character_id', '')).lower()
        if actual != character:
            raise ValueError('state character missing or mismatched')
        grouped[rid].append(compact(row, source))
    result = []
    for rid, run in runs.items():
        code = run.get('code')
        run['version'] = 'runs.code:' + str(code) if code else 'unknown:missing-runs.code'
        failed = [s for s in summaries[rid] if s.get('result') in ('predicted_death', 'died') or s.get('reload')]
        retries = [s for s in summaries[rid] if isinstance(s.get('attempt'), int) and s['attempt'] > 1]
        # A retry without a recorded failure censors before that retry, never at run end.
        cuts = [(s.get('ended_at', s['ts']), s['floor']) for s in failed] + [(s.get('started_at', s['ts']), s['floor']) for s in retries]
        first_cut = min(cuts, key=lambda item: item[0]) if cuts else None
        run['first_cut'] = first_cut[0] if first_cut else None
        run['first_cut_floor'] = first_cut[1] if first_cut else None
        run['summaries'] = summaries[rid]
        rows = grouped[rid]
        run['states'] = rows
        run['fights'] = snapshots_to_fights(rows, summaries[rid], actions[rid])
        result.append(run)
    return result, audit


def enemy_delta(a, b):
    """Observed HP depletion, never damage through block, overkill or causal credit."""
    def index(frame):
        enemies = (frame['state'].get('combat') or {}).get('enemies')
        if not isinstance(enemies, list) or not enemies:
            return None
        indexed = {}
        for e in enemies:
            if not isinstance(e.get('index'), int) or not e.get('enemy_id') or not numeric(e.get('current_hp')) or not numeric(e.get('max_hp')):
                return None
            key = (e['index'], e['enemy_id'])
            if key in indexed:
                return None
            indexed[key] = e
        if len({e['enemy_id'] for e in enemies}) != len(enemies):
            return None  # Target indices alone do not prove persistent entity identity.
        return indexed
    aa, bb = index(a), index(b)
    if aa is None or bb is None or aa.keys() != bb.keys():
        return None
    if any(aa[k]['max_hp'] != bb[k]['max_hp'] or aa[k]['current_hp'] < bb[k]['current_hp'] for k in aa):
        return None
    return {k: aa[k]['current_hp'] - bb[k]['current_hp'] for k in aa}


def fight_kind(fight, states):
    direct = (fight['summary'] or {}).get('fight_kind')
    if direct in ('boss', 'elite', 'hallway', 'normal'):
        return 'normal' if direct == 'hallway' else direct
    kinds = set()
    for row in states:
        s = row['state']
        if (s.get('run') or {}).get('floor') != fight['floor']:
            continue
        current = [n for n in (s.get('map') or {}).get('nodes', []) if n.get('is_current')]
        if len(current) == 1 and current[0].get('node_type'):
            kinds.add(current[0]['node_type'])
    return {'Monster': 'normal', 'Elite': 'elite', 'Boss': 'boss'}.get(next(iter(kinds)), 'unknown') if len(kinds) == 1 else 'unknown'


def won(fight):
    summary = fight['summary']
    if summary and summary.get('result') in ('won', 'died', 'predicted_death'):
        return summary['result'] == 'won'
    enemies = fight['frames'][-1]['state']['combat'].get('enemies')
    if isinstance(enemies, list) and enemies and all(e.get('is_alive') is False or e.get('current_hp') == 0 for e in enemies):
        return True
    close = fight['close']
    if close:
        s = close['state']
        if s.get('screen') == 'GAME_OVER' and isinstance((s.get('game_over') or {}).get('victory'), bool):
            return s['game_over']['victory']
        if numeric((s.get('run') or {}).get('current_hp')) and s['run']['current_hp'] <= 0:
            return False
    return None


def activation_frame(fight, requirements, rule, prerequisite=lambda frame: True):
    frames = fight['frames']
    if holding(requirements, frames[0]['state']['run'].get('deck')) is not True:
        return None
    # Executed play decisions only; stale/failed/planned choices do not activate a card.
    acts = [a for a in fight['actions'] if (a.get('chosen') or {}).get('action') == 'play_card' and
            isinstance(a.get('result'), str) and a['result'].startswith('completed:')]
    plays = Counter()
    index = 0
    for row in frames:
        while index < len(acts) and acts[index]['ts'] < row['ts']:
            action = acts[index]['chosen']
            # Runtime actions usually expose only card_index. Identity must come
            # from the exact pre-action hand, not the future hand or final deck.
            candidates = [f for f in frames if f['ts'] == acts[index]['ts']]
            if len(candidates) == 1:
                hand = candidates[0]['state']['combat'].get('hand')
                cards = [c for c in hand or [] if c.get('index') == action.get('card_index')]
                if len(cards) == 1 and cards[0].get('card_id'):
                    plays[cards[0]['card_id']] += 1
            index += 1
        if activation(rule, row['state'], plays) is True and prerequisite(row) is True:
            return row
    return None


def turn_observations(fight, active, exclusions=None):
    """Whole observed turns after activation; terminal/partial turns stay excluded."""
    groups = []
    for row in fight['frames']:
        turn = row['state']['turn']
        if not groups or groups[-1][0] != turn:
            groups.append((turn, []))
        groups[-1][1].append(row)
    observations = []
    def exclude(turn, rows, reason):
        if exclusions is not None:
            exclusions.append(dict(turn=turn, reason=reason, source=[r['_source'] for r in rows]))
    for i, (turn, rows) in enumerate(groups[:-1]):
        next_turn, next_rows = groups[i+1]
        if next_turn != turn + 1 or turn <= active['state']['turn']:
            exclude(turn, rows, '激活当回合/之前回合，或下一回合编号不连续')
            continue
        def ready(row):
            c = row['state']['combat']
            return (c.get('action_readiness') or {}).get('snapshot_stable') is True and (c.get('player') or {}).get('cards_played_this_turn') == 0
        begin = next((j for j, r in enumerate(rows) if ready(r)), None)
        finish = next((r for r in next_rows if ready(r)), None)
        if begin is None or finish is None:
            exclude(turn, rows+next_rows, '缺少完整稳定且未出牌的本回合/下一回合边界')
            continue
        rows = rows[begin:]
        start = rows[0]['state']['combat']
        player = start.get('player') or {}
        readiness = start.get('action_readiness') or {}
        if readiness.get('snapshot_stable') is not True or player.get('cards_played_this_turn') != 0:
            continue
        sequence = rows + [finish]
        deltas = [enemy_delta(a, b) for a, b in zip(sequence, sequence[1:])]
        damage = sum(sum(d.values()) for d in deltas) if all(d is not None for d in deltas) else None
        hp_loss = 0
        healing = False
        block = 0
        for a, b in zip(sequence, sequence[1:]):
            pa = a['state']['combat'].get('player') or {}
            pb = b['state']['combat'].get('player') or {}
            if numeric(pa.get('current_hp')) and numeric(pb.get('current_hp')) and hp_loss is not None:
                hp_loss += max(0, pa['current_hp'] - pb['current_hp'])
                healing = healing or pb['current_hp'] > pa['current_hp']
            else:
                hp_loss = None
            # Positive observed block deltas, excluding the next turn's start.
            if a['state']['turn'] != b['state']['turn']:
                continue
            if numeric(pa.get('block')) and numeric(pb.get('block')) and block is not None:
                block += max(0, pb['block'] - pa['block'])
            else:
                block = None
        # Multi-enemy total depletion is not necessarily an AoE effect.
        multi = sum(1 for e in start.get('enemies', []) if numeric(e.get('current_hp')) and e['current_hp'] > 0) >= 2
        if damage is None:
            exclude(turn, sequence, '敌实体缺失/身份重复或变化/生命上限变化/可见回血，无法量化HP推进')
            continue
        observations.append(dict(run_id=fight['run_id'], floor=fight['floor'], turn=turn,
                                 damage=damage, block=block, hp_loss=None if healing else hp_loss, multi=multi,
                                 source=[r['_source'] for r in sequence]))
    if groups:
        exclude(groups[-1][0], groups[-1][1], '终末可见回合没有下一回合完整边界')
    return observations


def compute_combo(combo, runs, options=None):
    """Independent-run estimates, aligned with the build-core learner's method.

    Activation witnesses are knowledge supplied by the learner; source verification
    happens at the CLI boundary. This function only joins their exact source rows.
    """
    options = options or {}
    if combo.get('prerequisites') is not None and 'prerequisite_results' not in options:
        raise ValueError('non-null prerequisites require source-verified W1 predicate results')
    def prerequisite(frame):
        if combo.get('prerequisites') is None:
            return True
        return options['prerequisite_results'].get(frame['_source']['sha256'], {}).get('value')
    rule = options.get('activation')
    if rule is not None:
        if len(json.dumps(rule)) > 16000:
            raise ValueError('activation rule too large')
        activation(rule, {}, Counter())
    witnesses = defaultdict(list)
    for w in options.get('witnesses', []):
        witnesses[w['run_id']].append(w)
    definition_known = rule is not None or options.get('has_definition', bool(witnesses))
    if len({r['run_id'] for r in runs}) != len(runs):
        raise ValueError('duplicate independent run identities')
    metrics, audit = [], []
    chain_ascensions = {r.get('ascension') for r in runs if any(s.get('floor') == 49 for s in r['summaries'])}
    population = runs
    for attempt in ('first', 'including_sl'):
        observations = defaultdict(list)
        boss_samples = defaultdict(lambda: {'reached': [], 'won': []})
        offers = defaultdict(list)
        normalization_rows, simulation_cases = [], []
        for run in population:
            rid = run['run_id']
            cutoff = run['first_cut'] if attempt == 'first' else None
            states = [s for s in run['states'] if cutoff is None or s['ts'] <= cutoff]
            if not states:
                continue
            initial_floor = (states[0]['state'].get('run') or {}).get('floor')
            if not isinstance(initial_floor, int):
                continue
            initial = dict(run_id=rid, floor=initial_floor)
            eligible, held, resource_rows = [], [], []
            for fight in run['fights']:
                if cutoff is not None and fight['frames'][0]['ts'] > cutoff:
                    continue
                if holding(combo['cards'], fight['frames'][0]['state']['run'].get('deck')) is not True:
                    continue
                condition = prerequisite(fight['frames'][0])
                if condition is not True:
                    audit.append(dict(combo=combo['id'], run_id=rid, floor=fight['floor'], attempt=attempt,
                                      entry=fight['frames'][0]['_source'], excluded='prerequisite_false' if condition is False else 'prerequisite_unknown',
                                      prerequisite=options.get('prerequisite_results', {}).get(fight['frames'][0]['_source']['sha256'])))
                    continue
                if options.get('required_relics'):
                    relics = fight['frames'][0]['state']['run'].get('relics')
                    if not isinstance(relics, list) or not set(options['required_relics']).issubset({r.get('relic_id') for r in relics}):
                        continue
                held.append(fight)
                clipped = dict(fight, frames=[f for f in fight['frames'] if cutoff is None or f['ts'] <= cutoff])
                if clipped['summary'] and cutoff is not None and clipped['summary'].get('ended_at', clipped['summary']['ts']) > cutoff:
                    clipped['summary'] = None
                if clipped['close'] and cutoff is not None and clipped['close']['ts'] > cutoff:
                    clipped['close'] = None
                active = None
                activation_witness = None
                for w in witnesses[rid]:
                    found = next((f for f in clipped['frames'] if f['_source']['offset'] == w['source']['offset'] and f['_source']['sha256'] == w['source']['sha256']), None)
                    if found and prerequisite(found) is True and (active is None or found['ts'] < active['ts']):
                        active, activation_witness = found, w
                if active is None and rule is not None:
                    active = activation_frame(clipped, combo['cards'], rule, prerequisite)
                audit_row = dict(combo=combo['id'], run_id=rid, floor=fight['floor'], attempt=attempt,
                                 kind=fight_kind(fight, states), outcome=won(clipped),
                                 entry=fight['frames'][0]['_source'], activation=active['_source'] if active else None,
                                 activation_rule=rule, learner_witness=activation_witness,
                                 entry_deck_size=len(fight['frames'][0]['state']['run']['deck']), turns=[], excluded_turns=[])
                audit.append(audit_row)
                if active is None:
                    continue
                audit_row['turns'] = turn_observations(clipped, active, audit_row['excluded_turns'])
                eligible.append((clipped, active, audit_row))
                resource_rows.append(dict(run_id=rid, floor=fight['floor'], summary=clipped['summary'],
                                          relics=active['state']['run'].get('relics')))
            holding_states = [s for s in states if holding(combo['cards'], (s['state'].get('run') or {}).get('deck')) is True]
            first_held = next((s for s in holding_states if prerequisite(s) is True), None)
            active_first = min(eligible, key=lambda v: v[1]['ts']) if eligible else None
            if definition_known and (active_first or not any(prerequisite(s) is None for s in holding_states)):
                observations['formed_runs'].append((int(bool(active_first)), initial))
                observations['formation_rate'].append((int(bool(active_first)), initial))
            run_audit = dict(combo=combo['id'], run_id=rid, attempt=attempt,
                             first_holding=first_held['_source'] if first_held else None,
                             first_activation=active_first[1]['_source'] if active_first else None,
                             resource_observations=resource_rows, deck_size_association=[])
            audit.append(run_audit)
            if active_first is None:
                continue
            first = active_first[1]
            ref = dict(run_id=rid, floor=first['state']['run']['floor'], turn=first['state']['turn'])
            observations['startup_turn'].append((ref['turn'], ref))
            observations['first_completed_floor'].append((ref['floor'], ref))
            observations['mean_reached_floor'].append((run.get('floor') if cutoff is None else run.get('first_cut_floor'), ref))
            if isinstance(run.get('victory'), bool):
                observations['cleared_runs'].append((int(run['victory'] and cutoff is None), ref))
            sizes = [a['entry_deck_size'] for _, _, a in eligible]
            observations['deck_size_min'].append((min(sizes), ref))
            observations['deck_size_max'].append((max(sizes), ref))
            # One chronological qualifying attempt per floor, even including SL.
            picked, seen = [], set()
            for f, a, record in eligible:
                if f['floor'] not in seen:
                    seen.add(f['floor']); picked.append(record)
            turns = [t for record in picked for t in record['turns']]
            for kind in ('boss', 'elite', 'normal'):
                vs = [t['damage'] for a in picked if a['kind'] == kind for t in a['turns'] if numeric(t['damage'])]
                if vs:
                    observations['dpr_'+kind].append((statistics.mean(vs), ref))
            for suffix, condition in [('1_3', lambda t: t <= 3), ('4_6', lambda t: 4 <= t <= 6), ('7_plus', lambda t: t >= 7)]:
                vs = [t['damage'] for t in turns if condition(t['turn']) and numeric(t['damage'])]
                if vs:
                    observations['dpr_turns_'+suffix].append((statistics.mean(vs), ref))
            for name, field in [('block_per_turn', 'block'), ('hp_loss_per_turn', 'hp_loss')]:
                vs = [t[field] for t in turns if numeric(t[field])]
                if vs:
                    observations[name].append((statistics.mean(vs), ref))
            if turns:
                observations['peak_turn_damage'].append((max(t['damage'] for t in turns), ref))
            # Match the learner's descriptive association, without inferring
            # a benefit from adding cards or controlling enemy/floor/resources.
            size_pairs = defaultdict(list)
            for record in picked:
                values = [t['damage'] for t in record['turns']]
                if values:
                    size_pairs[record['kind']].append(dict(floor=record['floor'],
                                                          size=record['entry_deck_size'], dpr=statistics.mean(values)))
            slopes = []
            for kind, points in size_pairs.items():
                if len({p['size'] for p in points}) < 2:
                    continue
                mx, my = statistics.mean(p['size'] for p in points), statistics.mean(p['dpr'] for p in points)
                slope = sum((p['size']-mx)*(p['dpr']-my) for p in points) / sum((p['size']-mx)**2 for p in points)
                slopes.append(slope)
                run_audit['deck_size_association'].append(dict(kind=kind, slope=slope, points=points))
            if slopes:
                observations['deck_size_scaling'].append((statistics.median(slopes), ref))
            # Startup energy is the observed cost of required contributing plays,
            # not all energy spent, net expenditure, or a theoretical minimum.
            witness = active_first[2]['learner_witness']
            if witness:
                need = Counter()
                for req in combo['cards']:
                    if 'id' in req:
                        need[req['id']] += req['count']
                used, costs = Counter(), []
                for w in witness.get('witness', []):
                    cid = w['card']['id']
                    if used[cid] < need[cid]:
                        used[cid] += 1; costs.append(w['card'].get('cost'))
                if need and used == need and all(numeric(c) and c >= 0 for c in costs):
                    observations['startup_energy'].append((sum(costs), ref))
            # Boss/chain histories are independent runs, not fight-attempt counts.
            # Only explicit outcome summaries identify results; missing summaries
            # do not become a recorded loss.
            run_bosses = defaultdict(list)
            chain = defaultdict(list)
            for fight in held:
                summary = fight['summary']
                if not summary or summary.get('fight_kind') != 'boss':
                    continue
                ended = summary.get('ended_at', summary['ts'])
                if ended < first['ts'] or (cutoff is not None and ended > cutoff):
                    continue
                boss = summary.get('encounter')
                if not boss:
                    continue
                key = (boss.replace('+', '-')+'-F'+str(fight['floor']))[:100]
                run_bosses[key].append(summary)
                if fight['floor'] in (48, 49):
                    chain[fight['floor']].append(summary)
            for boss, summaries in run_bosses.items():
                b_ref = dict(run_id=rid, floor=summaries[0]['floor'])
                boss_samples[boss]['reached'].append((1, b_ref))
                known = [s for s in summaries if s.get('result') in ('won', 'died', 'predicted_death')]
                if known:
                    boss_samples[boss]['won'].append((int(any(s['result'] == 'won' for s in known)), b_ref))
                    normalization_rows.append(dict(combo=combo['id'], direction=options.get('direction'),
                        run_id=rid, ascension=run.get('ascension'), version=run.get('version'),
                        target=boss, metric='win_rate', value=int(any(s['result']=='won' for s in known)), evidence=b_ref))
                # Completion/loss use the earliest FINISHED attempt, never a
                # predicted-death cutoff. Missing turn-1/end fields stay unknown.
                complete = next((f for f in held if f['summary'] in summaries and f['summary'].get('result') in ('won', 'died')
                                 and f['frames'][0]['state'].get('turn') == 1), None)
                if complete:
                    summary = complete['summary']; entry = complete['frames'][0]
                    for name, value in [('completion_turns', summary.get('turns')),
                                        ('hp_loss', (entry['state']['combat'].get('player') or {}).get('current_hp'))]:
                        if name == 'hp_loss':
                            value = value-summary['end_hp'] if numeric(value) and numeric(summary.get('end_hp')) else None
                        if numeric(value) and value >= 0:
                            normalization_rows.append(dict(combo=combo['id'], direction=options.get('direction'), run_id=rid,
                                ascension=run.get('ascension'), version=run.get('version'), target=boss, metric=name,
                                value=value, evidence=b_ref))
                candidate = next((f for f in held if f['summary'] in summaries and f['frames'][0]['state'].get('turn') == 1), None)
                if candidate:
                    simulation_cases.append(dict(combo=combo['id'], direction=options.get('direction'), run_id=rid,
                        ascension=run.get('ascension'), version=run.get('version'), target=boss, encounter=candidate['summary']['encounter'],
                        historical_max_hp=candidate['frames'][0]['state']['run'].get('max_hp'),
                        entry=candidate['frames'][0]['_source'], evidence=b_ref))
            if chain.get(48) and run.get('ascension') in chain_ascensions:
                c_ref = dict(run_id=rid, floor=48)
                observations['chain_reached'].append((1, c_ref))
                first_results = [s['result'] for s in chain[48]]
                second_results = [s['result'] for s in chain.get(49, [])]
                if 'won' in first_results and 'won' in second_results:
                    result = 1
                elif all(x in ('died', 'predicted_death') for x in first_results) or any(x in ('died', 'predicted_death') for x in second_results):
                    result = 0
                else:
                    result = None
                if result is not None:
                    observations['chain_won'].append((result, c_ref))
                    observations['chain_win_rate'].append((result, c_ref))
        # Availability denominator includes unformed runs; require explicit
        # upgrade evidence when the requirement needs an upgraded card.
        requirements = defaultdict(list)
        for req in combo['cards']:
            for cid in req.get('any_of', [req.get('id')]):
                requirements[cid].append(req['upgraded'])
        for run in population:
            cutoff = run['first_cut'] if attempt == 'first' else None
            visits = defaultdict(list)
            for row in run['states']:
                if cutoff is not None and row['ts'] > cutoff:
                    continue
                s = row['state']; r = s.get('run') or {}
                act = act_index(r.get('act_id'))
                if act is None or not isinstance(r.get('floor'), int):
                    continue
                cards = (s.get('reward') or {}).get('card_options') if s.get('screen') == 'REWARD' else (s.get('shop') or {}).get('cards') if s.get('screen') == 'SHOP' else None
                if not isinstance(cards, list) or not cards or any(not c.get('card_id') for c in cards):
                    continue
                if s['screen'] == 'SHOP':
                    if any(not isinstance(c.get('is_stocked'), bool) for c in cards):
                        continue
                    cards = [c for c in cards if c['is_stocked']]
                    if not cards:
                        continue
                visits[(act+1, r['floor'], s['screen'])].extend(cards)
            for act in sorted({a for a, _, _ in visits}):
                visible = [c for (a, _, _), cards in visits.items() if a == act for c in cards]
                floor = min(f for a, f, _ in visits if a == act)
                for card, upgraded in requirements.items():
                    candidates = [c for c in visible if c['card_id'] == card]
                    needs_upgrade = all(upgraded)
                    if needs_upgrade and candidates and any(not isinstance(c.get('upgraded'), bool) for c in candidates):
                        continue
                    seen = any(not needs_upgrade or c.get('upgraded') is True for c in candidates)
                    offers[(card, act)].append((int(seen), dict(run_id=run['run_id'], floor=floor)))
        reasons = {
            'aoe_damage': '多敌HP推进不能区分群体技能、逐个单攻、持续效果及遗物；多敌原始观察另存audit',
            'startup_energy': '缺少可核逐牌贡献施放的现场energy_cost；净能量变化不能代替花费',
            'startup_draw': '未保存累计实际抽牌计数；手牌净增/抽牌堆差不能当实际抽入数量',
            'deck_size_scaling': '缺同局同战斗类型且至少两种规模的完整回合表现；无变化不能补0',
            'potion_dependency': '有用药记录但没有可比不喝/早喝/保留反事实；资源原始观察另存audit',
            'sl_dependency': '首试/SL及最终胜利差可观察，不识别不SL反事实；原始记录另存audit',
            'key_relic_dependency': '遗物共现/入组条件不能识别移除后的因果依赖；原始观察另存audit',
        }
        by_run = {r['run_id']: r for r in population}
        for name, samples in observations.items():
            for value, ref in samples:
                if numeric(value):
                    rr = by_run[ref['run_id']]
                    normalization_rows.append(dict(combo=combo['id'], direction=options.get('direction'),
                        run_id=ref['run_id'], ascension=rr.get('ascension'), version=rr.get('version'),
                        target='overall', metric=name, value=value, evidence=ref))
        audit.append(dict(combo=combo['id'], attempt=attempt, normalization_rows=normalization_rows,
                          simulation_cases=simulation_cases,
                          raw_samples={k: [dict(value=v, evidence=e) for v, e in vs if numeric(v)] for k,vs in observations.items()},
                          raw_boss_samples={k:{name:[dict(value=v,evidence=e) for v,e in vs] for name,vs in groups.items()} for k,groups in boss_samples.items()}))
        observed = {}
        for name in METRICS:
            method = '所有进阶与版本合并，仅first与including_sl分开；首个已记录判死/实死/重载截尾；局内聚合后局间统计，不把SL/回合当独立局'
            if name.startswith('dpr') or name == 'peak_turn_damage':
                method += '；激活回合之后完整就绪回合的敌HP推进，排除缺帧/变身/回血；全部伤源、余血截断，非组合因果归因'
            elif name == 'block_per_turn':
                method += '；同回合可见正格挡增量之和下界，先局内均值'
            elif name == 'hp_loss_per_turn':
                method += '；无可见回血的完整就绪回合玩家HP首尾差，含自损，非敌人毛伤'
            elif name == 'startup_energy':
                method += '；最早激活见证中必需贡献施放的现场费用合计，非最低预算或全部过渡牌花费'
            elif name == 'first_completed_floor':
                method += '；逐局最早生效见证所在层；首次持有单列audit'
            elif name == 'deck_size_scaling':
                method += '；同局同战斗类型战斗DPR对牌组张数OLS斜率，局内各类型中位再跨局中位；敌人/层/资源未控，仅观察相关，不是加牌收益'
            reducer = 'sum' if name in ('formed_runs', 'cleared_runs', 'chain_reached', 'chain_won') else 'min' if name == 'deck_size_min' else 'max' if name in ('deck_size_max', 'peak_turn_damage') else 'mean' if name == 'mean_reached_floor' else 'median'
            reason = reasons.get(name, '无满足条件的可核观察；未给出激活条件/见证或缺完整边界，保留未知')
            if name.startswith('chain_') and not any(r.get('ascension') in chain_ascensions for r in population):
                reason = '冻结实战没有相应进阶F49连战结构见证；不能把F48单Boss后结束当连战失败'
            unit = 'independent_run_HP_per_turn_per_card' if name == 'deck_size_scaling' else 'independent_run'
            observed[name] = rate(observations[name], method, reason) if name.endswith('_rate') else statistic(observations[name], unit, method, reducer, reason, name == 'startup_turn')
        # Include n=0 slots for all explicitly observed or caller-specified targets.
        boss_keys = set(boss_samples) | set(options.get('bosses', []))
        for run in population:
            for summary in run['summaries']:
                if summary.get('fight_kind') == 'boss' and summary.get('encounter'):
                    boss_keys.add((summary['encounter'].replace('+', '-')+'-F'+str(summary['floor']))[:100])
        bosses = {}
        for boss in sorted(boss_keys):
            vs = boss_samples[boss]
            method = '已生效且入口仍持有所需牌的独立局；同局同Boss/层SL去重；未知结果不计胜率'
            bosses[boss] = dict(reached=statistic(vs['reached'], 'independent_run', method, 'sum'),
                                won=statistic(vs['won'], 'independent_run', method, 'sum'), win_rate=rate(vs['won'], method))
        metrics.append(dict(attempt=attempt, observed=observed, bosses=bosses,
                            availability=[dict(card=card, act=act, offered_rate=rate(offers[(card, act)], '同幕有完整奖励/商店牌供给的独立局中至少出现一次所需版本牌的比例；SL/重复访问按局幕去重，不是掉率/可购买率', '本层本幕没有可核完整牌供给的独立局')) for card in sorted(requirements) for act in options.get('acts', [1, 2, 3])],
                            simulation=[],
                            sources=[dict(run_id=r['run_id'], ascension=r.get('ascension'), version=r.get('version')) for r in population]))
    return metrics, audit

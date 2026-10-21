"""Read-only, stdlib-only external descriptive statistics. No production consumers.

The players table is denied by SQLite's authorizer. Player integers exist only in
memory for grouped inference; no run-level or player-level data is serialized.
"""
import argparse
import collections as C
import csv
import hashlib
import itertools
import json
import math
from pathlib import Path
import random
import sqlite3
import statistics as S

VERSIONS = tuple('v0.' + str(i) for i in range(107, 112))
BOOT = 1000
SEED = 240111


def cid(value):
    return value.removeprefix('CARD.').removeprefix('RELIC.')


def wilson(w, n):
    if not n:
        return [None, None]
    p, z = w / n, 1.959963984540054
    a = 1 + z*z/n
    b = z * math.sqrt(p*(1-p)/n + z*z/(4*n*n))
    return [(p+z*z/(2*n)-b)/a, (p+z*z/(2*n)+b)/a]


def quantile(a, q):
    if not a:
        return None
    a = sorted(a)
    pos = (len(a)-1)*q
    lo = int(pos)
    return a[lo] + (a[min(lo+1, len(a)-1)]-a[lo])*(pos-lo)


def interval(a):
    return [quantile(a, .025), quantile(a, .975)]


def connect(path):
    c = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)
    c.execute('PRAGMA query_only=ON')
    c.execute('PRAGMA cache_size=-16384')
    c.execute('PRAGMA mmap_size=0')

    def authorize(action, table, column, db, trigger):
        if action == sqlite3.SQLITE_READ and table != 'runs':
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    c.set_authorizer(authorize)
    return c


def lean_run(pid, version, win, raw):
    d = json.loads(raw)
    # Never retain the raw document or identifiers embedded in its player objects.
    deck = [(cid(x['id']), x.get('floor_added_to_deck', 0)) for x in d['players'][0]['deck']]
    relics = [cid(x['id']) for x in d['players'][0].get('relics', [])]
    offers, fights = [], []
    floor = 0
    audit = C.Counter()
    for act, points in enumerate(d['map_point_history'], 1):
        for point in points:
            floor += 1
            stats = point.get('player_stats', [])
            if len(stats) != 1:
                audit['non_solo_point'] += 1
                continue
            stat = stats[0]
            rooms = point.get('rooms', [])
            combat = [x for x in rooms if x.get('room_type') in ('monster', 'elite', 'boss')]
            choices = stat.get('card_choices', [])
            if choices:
                # Shops may mark purchases false; event rewards have different choice mechanics.
                if len(rooms) == 1 and len(combat) == 1:
                    parsed = [(cid(x['card']['id']), x.get('was_picked')) for x in choices]
                    # A point can flatten multiple rewards. Only one-choice screens
                    # of 3/4 cards are identifiable without guessing screen boundaries.
                    if len(parsed) in (3, 4) and sum(p is True for _, p in parsed) <= 1 and all(isinstance(p, bool) for _, p in parsed) and len({c for c, _ in parsed}) == len(parsed):
                        offers.append((act, floor, parsed))
                    else:
                        audit['invalid_or_duplicate_choice_screen'] += 1
                else:
                    audit['noncombat_choice_screen_excluded'] += 1
            if len(combat) == 1 and len(rooms) == 1:
                room = combat[0]
                if room['room_type'] in ('elite', 'boss'):
                    damage, turns = stat.get('damage_taken'), room.get('turns_taken')
                    if isinstance(damage, (int, float)) and isinstance(turns, (int, float)) and turns > 0:
                        fights.append((act, room.get('model_id', 'UNKNOWN'), room['room_type'], damage, turns,
                                       stat.get('current_hp', 0) <= 0))
                    else:
                        audit['fight_missing_or_zero_turns'] += 1
            elif combat:
                audit['multi_room_fight_excluded'] += 1
    return dict(pid=pid, version=version, win=int(win), deck=deck, relics=relics,
                offers=offers, fights=fights, reached_act3=len(d['map_point_history']) >= 3,
                build=d.get('build_id'), audit=audit)


def add(v, index, amount=1):
    v[index] += amount


class Inference:
    """Ordinary nonparametric player-cluster bootstrap, shared draws within version."""
    def __init__(self, players, reps=BOOT):
        self.players = sorted(players)
        rng = random.Random(SEED)
        self.weights = []
        for _ in range(reps):
            draw = C.Counter(rng.choices(self.players, k=len(self.players)))
            self.weights.append(draw)

    def ratio(self, rows, num, den):
        values = []
        for w in self.weights:
            n = sum(w[p]*v[den] for p, v in rows.items())
            if n:
                values.append(sum(w[p]*v[num] for p, v in rows.items())/n)
        return interval(values)

    def contrast(self, rows):
        values = []
        for w in self.weights:
            a = [sum(w[p]*v[i] for p, v in rows.items()) for i in range(4)]
            if a[0] and a[2]:
                values.append(a[1]/a[0]-a[3]/a[2])
        return interval(values), len(values)


def card_rows(runs, inf):
    groups = C.defaultdict(lambda: C.defaultdict(lambda: [0, 0, 0, 0]))
    strata = C.defaultdict(lambda: C.defaultdict(lambda: [0, 0, 0, 0]))
    screens = C.defaultdict(lambda: C.defaultdict(lambda: [0, 0]))
    player_n = C.Counter(r['pid'] for r in runs)
    for r in runs:
        for act, floor, offered in r['offers']:
            for bucket in ('all', str(act)):
                s = screens[bucket][r['pid']]
                s[0] += 1
                s[1] += not any(p for _, p in offered)
            for card, picked in offered:
                for bucket in ('all', str(act)):
                    v = groups[card, bucket][r['pid']]
                    i = 0 if picked else 2
                    v[i] += 1
                    v[i+1] += r['win']
                v = strata[card][r['pid'], act]
                v[i] += 1
                v[i+1] += r['win']
    result = []
    for (card, act), rows in sorted(groups.items()):
        totals = [sum(v[i] for v in rows.values()) for i in range(4)]
        pn, pw, nn, nw = totals
        ci, valid = inf.contrast(rows)
        frequent = {p:v for p,v in rows.items() if player_n[p] >= 10}
        f = [sum(v[i] for v in frequent.values()) for i in range(4)]
        # Standardize within players AND acts; overlap weights n1*n0/(n1+n0).
        adjusted = C.defaultdict(lambda: [0., 0.])
        matched_offers = 0
        matched_strata = 0
        for (p, a), v in strata[card].items():
            if act != 'all' and str(a) != act:
                continue
            if v[0] and v[2]:
                w = v[0]*v[2]/(v[0]+v[2])
                adjusted[p][0] += w*(v[1]/v[0]-v[3]/v[2])
                adjusted[p][1] += w
                matched_offers += v[0]+v[2]
                matched_strata += 1
        aw = sum(v[1] for v in adjusted.values())
        result.append(dict(card=card, act=act, offered=pn+nn, picked=pn, not_picked=nn,
                           players=len(rows), pick_rate=pn/(pn+nn),
                           pick_rate_cluster_ci=inf.ratio({p:[v[0], v[0]+v[2]] for p,v in rows.items()}, 0, 1),
                           picked_wins=pw, not_picked_wins=nw,
                           picked_win_rate=pw/pn if pn else None, picked_win_wilson=wilson(pw,pn),
                           not_picked_win_rate=nw/nn if nn else None, not_picked_win_wilson=wilson(nw,nn),
                           picked_win_cluster_ci=inf.ratio(rows,1,0), not_picked_win_cluster_ci=inf.ratio(rows,3,2),
                           win_difference=pw/pn-nw/nn if pn and nn else None,
                           win_difference_cluster_ci=ci, valid_bootstrap_draws=valid,
                           player_act_adjusted_difference=sum(v[0] for v in adjusted.values())/aw if aw else None,
                           adjusted_cluster_ci=inf.ratio(adjusted,0,1), matched_players=len(adjusted),
                           matched_strata=matched_strata, matched_offers=matched_offers,
                           frequent_player_offers=f[0]+f[2], frequent_players=len(frequent),
                           frequent_player_pick_rate=f[0]/(f[0]+f[2]) if f[0]+f[2] else None,
                           frequent_player_win_difference=f[1]/f[0]-f[3]/f[2] if f[0] and f[2] else None))
    skip = []
    for act, rows in sorted(screens.items()):
        n, s = (sum(v[i] for v in rows.values()) for i in range(2))
        skip.append(dict(act=act,screens=n,skipped=s,rate=s/n,cluster_ci=inf.ratio(rows,1,0)))
    return result, skip


def distribution(values):
    return dict(n=len(values), mean=S.mean(values), sd=S.stdev(values) if len(values)>1 else None,
                p10=quantile(values,.1), p25=quantile(values,.25), median=quantile(values,.5),
                p75=quantile(values,.75), p90=quantile(values,.9), p95=quantile(values,.95))


def fights_and_sizes(runs, inf):
    groups = C.defaultdict(list)
    sizes = C.defaultdict(lambda: C.defaultdict(lambda:[0,0]))
    for r in runs:
        size = len(r['deck'])
        bucket = f'{size//5*5}-{size//5*5+4}'
        for scope in ('all', 'reached_act3') if r['reached_act3'] else ('all',):
            v = sizes[scope,bucket][r['pid']]
            v[0] += 1
            v[1] += r['win']
        for act, encounter, typ, damage, turns, died in r['fights']:
            groups[act,encounter,typ].append((r['pid'],damage,turns,died))
    fights=[]
    for (act, encounter, typ), values in sorted(groups.items()):
        fights.append(dict(act=act,encounter=encounter,room_type=typ,n=len(values),
                           players=len({v[0] for v in values}),deaths=sum(v[3] for v in values),
                           damage=distribution([v[1] for v in values]),turns=distribution([v[2] for v in values])))
    deck=[]
    for (scope,bucket),rows in sorted(sizes.items()):
        n,w=(sum(v[i] for v in rows.values()) for i in range(2))
        deck.append(dict(scope=scope,size=bucket,n=n,wins=w,players=len(rows),win_rate=w/n,
                         wilson=wilson(w,n),cluster_ci=inf.ratio(rows,1,0)))
    return fights,deck


def normalize(v):
    length=math.sqrt(sum(x*x for x in v.values()))
    return {k:x/length for k,x in v.items()} if length else {}


def dot(a,b):
    return sum(v*b.get(k,0) for k,v in a.items())


def fit(vectors,k,seed):
    rng=random.Random(seed)
    centers=[dict(vectors[rng.randrange(len(vectors))])]
    for _ in range(1,k):
        dist=[max(0,1-max(dot(v,c) for c in centers))**2 for v in vectors]
        centers.append(dict(vectors[rng.choices(range(len(vectors)),weights=dist)[0]]))
    old=None
    for _ in range(40):
        labels=[max(range(k),key=lambda j:dot(v,centers[j])) for v in vectors]
        if labels==old:
            break
        old=labels
        sums=[C.Counter() for _ in range(k)]
        for v,j in zip(vectors,labels):
            sums[j].update(v)
        centers=[normalize(v) if v else centers[j] for j,v in enumerate(sums)]
    objective=sum(max(dot(v,c) for c in centers) for v in vectors)
    return centers,objective


def clusters(runs, scope, k, seed, inf):
    eligible=[r for r in runs if scope=='all' or r['reached_act3']]
    # Player-disjoint discovery/evaluation, labels learned without wins.
    train_players=set(random.Random(SEED).sample(inf.players,len(inf.players)//2))
    train=[r for r in eligible if r['pid'] in train_players]
    test=[r for r in eligible if r['pid'] not in train_players]
    df=C.Counter(c for r in train for c in {c for c,_ in r['deck']})
    vocab={c for c,n in df.items() if n>=max(10,.02*len(train)) and n<=.95*len(train)}
    idf={c:math.log((1+len(train))/(1+df[c]))+1 for c in sorted(vocab)}
    def vec(r):
        # Binary features keep duplicate copies and deck size from dominating distance.
        return normalize({c:idf[c] for c in sorted({c for c,_ in r['deck']} & vocab)})
    vectors=[vec(r) for r in train]
    centers,objective=fit(vectors,k,seed)
    assignments=[max(range(k),key=lambda j:dot(vec(r),centers[j])) for r in test]
    result=[]
    per_cluster=[]
    for j in range(k):
        subset=[r for r,label in zip(test,assignments) if label==j]
        counts=C.Counter(c for r in subset for c in {c for c,_ in r['deck']})
        rows=C.defaultdict(lambda:[0,0])
        for r in subset:
            rows[r['pid']][0]+=1
            rows[r['pid']][1]+=r['win']
        n=len(subset);wins=sum(r['win'] for r in subset)
        base=C.Counter(c for r in test for c in {c for c,_ in r['deck']})
        distinctive=sorted((dict(card=c,n=counts[c],prevalence=counts[c]/n,
                                 lift=(counts[c]/n)/(base[c]/len(test)))
                            for c in vocab if counts[c]>=max(5,.1*n)),
                           key=lambda v:(-v['lift'],v['card']))[:12] if n else []
        result.append(dict(scope=scope,k=k,seed=seed,cluster=j,n=n,wins=wins,players=len(rows),
                           win_rate=wins/n if n else None,wilson=wilson(wins,n),
                           cluster_ci=inf.ratio(rows,1,0),distinctive_cards=distinctive,
                           train_n=len(train),evaluation_n=len(test),features=len(vocab),
                           train_objective=objective))
        per_cluster.append(rows)
    pairs=[]
    # Cluster-robust delta SE with simultaneous normal intervals across k(k-1)/2 pairs.
    z=S.NormalDist().inv_cdf(1-.05/(2*(k*(k-1)//2)))
    for a,b in itertools.combinations(range(k),2):
        x,y=result[a],result[b]
        if not x['n'] or not y['n']:
            continue
        influence=[]
        for p in inf.players:
            v=per_cluster[a].get(p,[0,0]);w=per_cluster[b].get(p,[0,0])
            influence.append((v[1]-x['win_rate']*v[0])/x['n']-(w[1]-y['win_rate']*w[0])/y['n'])
        g=len(inf.players)
        se=math.sqrt(g/(g-1)*sum(v*v for v in influence))
        diff=x['win_rate']-y['win_rate']
        ci=[max(-1,diff-z*se),min(1,diff+z*se)]
        pairs.append(dict(scope=scope,k=k,seed=seed,a=a,b=b,difference=diff,
                          simultaneous_cluster_normal_ci=ci,distinguishable=ci[0]>0 or ci[1]<0))
    return result,pairs


def cooccurrence(runs):
    out=[]
    for scope in ('all','reached_act3'):
        rs=[r for r in runs if scope=='all' or r['reached_act3']]
        counts=C.Counter(c for r in rs for c in {c for c,_ in r['deck']})
        pairs=C.Counter(pair for r in rs for pair in itertools.combinations(sorted({c for c,_ in r['deck']}),2))
        for (a,b),n in pairs.items():
            if n>=20 and counts[a]<=.9*len(rs) and counts[b]<=.9*len(rs):
                out.append(dict(scope=scope,a=a,b=b,n=n,total=len(rs),a_n=counts[a],b_n=counts[b],
                                lift=n*len(rs)/(counts[a]*counts[b]),jaccard=n/(counts[a]+counts[b]-n)))
    return sorted(out,key=lambda r:(r['scope'],-r['lift'],r['a'],r['b']))


def write_json(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n')


def write_csv(path,rows):
    if not rows:
        path.write_text('')
        return
    with path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n')
        w.writeheader()
        w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()} for r in rows)


def sha_file(path,limit=None):
    h=hashlib.sha256();used=0
    with path.open('rb') as f:
        while limit is None or used<limit:
            b=f.read(min(1024*1024,limit-used) if limit is not None else 1024*1024)
            if not b: break
            h.update(b);used+=len(b)
    return h.hexdigest()


def frozen_rows(path, limit, audit=None):
    audit = audit if audit is not None else C.Counter()
    with path.open('rb') as f:
        while f.tell() < limit:
            line = f.readline(limit-f.tell())
            if not line.endswith(b'\n'):
                audit['partial_tail'] += 1
                break
            try:
                row = json.loads(line)
            except ValueError:
                audit['invalid_json'] += 1
                continue
            if not isinstance(row, dict):
                audit['non_object'] += 1
                continue
            yield row


def own_picks(root,catalog,frozen=None):
    logs=root/'logs'
    limits={name:(frozen[name]['bytes'] if frozen else (logs/name).stat().st_size)
            for name in ('brain.jsonl','runs.jsonl')}
    files={}
    for name,limit in limits.items():
        if not isinstance(limit,int) or limit<0 or limit>(logs/name).stat().st_size:
            raise ValueError('Invalid frozen byte limit: '+name)
        digest=sha_file(logs/name,limit)
        if frozen and digest!=frozen[name]['prefix_sha256']:
            raise ValueError('Frozen prefix hash mismatch: '+name)
        files[name]=dict(bytes=limit,prefix_sha256=digest)
    parse_audit={name:C.Counter() for name in limits}
    runs={}
    for d in frozen_rows(logs/'runs.jsonl',limits['runs.jsonl'],parse_audit['runs.jsonl']):
        if str(d.get('character','')).lower()=='silent' and d.get('ascension')==10:
            runs[d['run_id']]=d
    names={c['name']:c['id'] for c in catalog['collections']['cards']}
    known={c['id'] for c in catalog['collections']['cards']}
    cards=C.defaultdict(lambda:[0,0]);by_act=C.defaultdict(lambda:[0,0]);audit=C.Counter();seen=set()
    for d in frozen_rows(logs/'brain.jsonl',limits['brain.jsonl'],parse_audit['brain.jsonl']):
        if d.get('label')!='reward/card' or d.get('run_id') not in runs: continue
        if d.get('engine')!='codex' or not isinstance(d.get('answer'),dict) or d.get('error') or d.get('accepted') is False or d.get('problems'):
            audit['unsuccessful_or_non_codex']+=1;continue
        facts=d.get('payload',{}).get('facts',{})
        act=facts.get('act');floor=facts.get('floor')
        offered=[]
        for key,value in d.get('options',{}).items():
            if not key.startswith('card'): continue
            try:
                option=json.loads(value) if isinstance(value,str) else value
            except ValueError:
                offered.append((key,None));continue
            if not isinstance(option,dict):
                offered.append((key,None));continue
            card=option.get('card_id') or option.get('id') or names.get(option.get('card'))
            if card not in known: card=names.get(option.get('card','').rstrip('+'))
            offered.append((key,card))
        choice=d['answer'].get('choice')
        if not offered or any(c is None for _,c in offered) or choice not in {k for k,_ in offered}|{'skip'} or act not in (1,2,3) or not isinstance(floor,int):
            audit['unmapped_or_incomplete']+=1;continue
        # First accepted answer per natural reward screen; exclude SL/revisit multiplicity.
        identity=(d['run_id'],act,floor)
        if identity in seen: audit['revisit_or_duplicate']+=1;continue
        seen.add(identity);audit['screens']+=1;audit['skipped']+=choice=='skip'
        for key,card in offered:
            cards[card][0]+=1;cards[card][1]+=key==choice
            by_act[card,str(act)][0]+=1;by_act[card,str(act)][1]+=key==choice
    return cards,by_act,dict(audit),dict(files=files,parse_audit=parse_audit,
                                        eligible_finished_runs=len(runs),unique_runs_with_picks=len({x[0] for x in seen}))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db',type=Path,required=True)
    p.add_argument('--source-root',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--snapshot-date',required=True)
    p.add_argument('--own-manifest',type=Path,help='Prior summary.json: verify and replay its own-log byte prefixes')
    args=p.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    catalog_path=args.source_root/'data/game-data.json'
    catalog_bytes=catalog_path.read_bytes()
    catalog=json.loads(catalog_bytes)
    catalog_sha256=hashlib.sha256(catalog_bytes).hexdigest()
    frozen=json.loads(args.own_manifest.read_text())['own_manifest']['files'] if args.own_manifest else None
    own,own_act,own_audit,own_manifest=own_picks(args.source_root,catalog,frozen)
    c=connect(args.db)
    where="character='SILENT' AND ascension=10 AND n_players=1 AND is_valid=1 AND was_abandoned=0 AND has_modifiers=0"
    overview=[dict(version=v,n=n,wins=w,players=ps,win_rate=w/n,wilson=wilson(w,n))
              for v,n,w,ps in c.execute('SELECT patch_major,count(*),sum(win),count(distinct player_id) FROM runs WHERE '+where+' GROUP BY patch_major')]
    versions={v:[] for v in VERSIONS}
    sql='SELECT player_id,patch_major,win,raw_json FROM runs WHERE '+where+' AND patch_major IN ('+','.join('?'*len(VERSIONS))+') ORDER BY id'
    for pid,v,win,raw in c.execute(sql,VERSIONS):
        versions[v].append(lean_run(pid,v,win,raw))
    c.close()
    del raw
    print('loaded aggregate cohorts', {v:len(rs) for v,rs in versions.items()},flush=True)
    seen_cards=C.Counter();seen_relics=C.Counter();audits={};builds={};coverage={};cohort_inference={}
    known_cards={x['id'] for x in catalog['collections']['cards']}
    known_relics={x['id'] for x in catalog['collections']['relics']}
    all_cards=[];all_skip=[];all_fights=[];all_sizes=[]
    cluster_results=[];cluster_pairs=[]
    for version,runs in versions.items():
        inf=Inference({r['pid'] for r in runs})
        player_totals=C.defaultdict(lambda:[0,0])
        for r in runs:
            player_totals[r['pid']][0]+=1
            player_totals[r['pid']][1]+=r['win']
        cohort_inference[version]=dict(win_rate_cluster_ci=inf.ratio(player_totals,1,0),
                                      frequent_players=sum(v[0]>=10 for v in player_totals.values()),
                                      frequent_player_runs=sum(v[0] for v in player_totals.values() if v[0]>=10))
        builds[version]=dict(C.Counter(r['build'] for r in runs))
        unknown_cards=C.Counter();unknown_relics=C.Counter();clean=[]
        audit=C.Counter()
        for r in runs:
            audit.update(r['audit'])
            seen_cards.update(c for c,_ in r['deck']);seen_relics.update(r['relics'])
            for _,_,offers in r['offers']:seen_cards.update(c for c,_ in offers)
            cards={c for c,_ in r['deck']}|{c for _,_,offer in r['offers'] for c,_ in offer}
            uc=cards-known_cards;ur=set(r['relics'])-known_relics
            unknown_cards.update(uc);unknown_relics.update(ur)
            if not uc and not ur:clean.append(r)
        coverage[version]=dict(unmapped_card_run_counts=dict(sorted(unknown_cards.items())),
                               unmapped_relic_run_counts=dict(sorted(unknown_relics.items())),
                               all_ids_mapped_runs=len(clean),all_ids_mapped_wins=sum(r['win'] for r in clean))
        audits[version]=dict(audit)
        rows,skips=card_rows(runs,inf)
        fights,sizes=fights_and_sizes(runs,inf)
        for target,items in ((all_cards,rows),(all_skip,skips),(all_fights,fights),(all_sizes,sizes)):
            target.extend(dict(version=version,**r) for r in items)
        if version=='v0.111':
            clean_inf=Inference({r['pid'] for r in clean})
            clean_rows,clean_skips=card_rows(clean,clean_inf)
            write_csv(args.output/'card_choices_mapped_only.csv',clean_rows)
            write_csv(args.output/'skip_rates_mapped_only.csv',clean_skips)
            for scope in ('all','reached_act3'):
                for k in (3,4,5):
                    for seed in (24,240,2400):
                        cr,cp=clusters(runs,scope,k,seed,inf)
                        cluster_results.extend(cr);cluster_pairs.extend(cp)
            write_csv(args.output/'cooccurrence.csv',cooccurrence(runs))
        print('completed',version,flush=True)
    mappings=[]
    for kind,counts in (('cards',seen_cards),('relics',seen_relics)):
        known={x['id'] for x in catalog['collections'][kind]}
        prefix='CARD.' if kind=='cards' else 'RELIC.'
        for name,n in sorted(counts.items()):
            mappings.append(dict(kind=kind,external_id=prefix+name,local_id=name if name in known else None,
                                 mapped=name in known,occurrences=n))
    comparison=[]
    for row in all_cards:
        if row['version']!='v0.111':continue
        card,act=row['card'],row['act']
        n,picked=(own[card] if act=='all' else own_act[card,act])
        if not n:continue
        comparison.append(dict(card=card,act=act,human_offered=row['offered'],human_pick_rate=row['pick_rate'],
                               human_cluster_ci=row['pick_rate_cluster_ci'],own_offered=n,own_picked=picked,
                               own_pick_rate=picked/n,own_wilson=wilson(picked,n),
                               difference=picked/n-row['pick_rate'],
                               adequate_both=n>=30 and row['offered']>=30))
    comparison.sort(key=lambda r:(r['act'],-abs(r['difference']),r['card']))
    for name,rows in [('card_choices',all_cards),('skip_rates',all_skip),('encounters',all_fights),
                      ('deck_sizes',all_sizes),('id_mapping',mappings),('brain_comparison',comparison),
                      ('clusters',cluster_results),('cluster_pairs',cluster_pairs)]:
        write_csv(args.output/(name+'.csv'),rows)
    write_json(args.output/'summary.json',dict(source='external:sts2fun',cohorts=overview,
               builds=builds,audit=audits,id_coverage=coverage,cohort_inference=cohort_inference,
               own_audit=own_audit,own_manifest=own_manifest,
               bootstrap=dict(unit='player',draws=BOOT,seed=SEED),
               mapping=dict(unmapped=[r for r in mappings if not r['mapped']]),
               own_unmatched_cards=sorted(set(own)-{r['card'] for r in all_cards if r['version']=='v0.111'})))
    write_json(args.output/'provenance.json',dict(source='external:sts2fun',
        url='https://sts2.fun/static/sts2_public.db.zst',faq='https://sts2.fun/faq',
        downloaded_at='2026-10-21',analyzed_at=args.snapshot_date,
        compressed_bytes=759783329,compressed_sha256='0f3e1660cdd41665c5e29695232137252187713a5fde87fb888ab3e228c69ac7',
        compressed_hash_basis='issue #24 acquisition receipt; compressed file not re-downloaded',
        database_bytes=args.db.stat().st_size,database_sha256=sha_file(args.db),
        license='No explicit dataset redistribution license found on public FAQ; aggregate statistics with attribution only; no raw redistribution.',
        filter=where,primary_version='v0.111',adjacent_versions=list(VERSIONS[:-1]),
        catalog_sha256=catalog_sha256,script_sha256=sha_file(Path(__file__)),
        own_logs=own_manifest,privacy='No players-table reads; integers only in memory; no external player/run identifiers in outputs.'))
    write_json(args.output/'manifest.json',{p.name:sha_file(p) for p in sorted(args.output.iterdir()) if p.suffix in ('.csv','.json') and p.name!='manifest.json'})
    print('done',flush=True)


if __name__=='__main__':
    main()

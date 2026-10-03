import json, sys, glob, collections, math

files = sys.argv[1:] or glob.glob('/tmp/claude-1000/-home-dw-Projects-sts2-jev/27a9b548-f649-5f28-81f5-71c789f342c6/scratchpad/insat/all-*.jsonl')
rows = []
for f in files:
    for l in open(f):
        rows.append(json.loads(l))
print('rows', len(rows))

# A. reproduction
same = tot = 0
by_day = collections.Counter(); by_day_same = collections.Counter()
for r in rows:
    for k, o in r['options'].items():
        if not o['logged'] or not o['logged'].startswith('5-turn'):
            continue
        tot += 1
        same += o['same']
print(f'A. logged rollout sentences reproduced word for word: {same}/{tot}')

def mean(xs):
    return sum(xs) / len(xs) if xs else float('nan')

def brier(pairs):
    return mean([(p - y) ** 2 for p, y in pairs])

# Lines by type
def rows_with_lines():
    for r in rows:
        if not r.get('lines'):
            continue
        yield r

# B. per question, escape vs no-escape lines (only questions with both)
print('\nB. questions with both escape and no-escape lines rolled out (first decision of each turn)')
diff = collections.defaultdict(list)
for r in rows_with_lines():
    if not r['firstOfTurn']:
        continue
    esc = [x for x in r['lines'] if x['escapes'] > 0]
    non = [x for x in r['lines'] if x['escapes'] == 0]
    if not esc or not non:
        continue
    be = max(esc, key=lambda x: x['extra']['win'])
    bn = max(non, key=lambda x: x['extra']['win'])
    le = max(esc, key=lambda x: x['winProb']); ln = max(non, key=lambda x: x['winProb'])
    diff['live'].append(le['winProb'] - ln['winProb'])
    diff['h5'].append(be['extra']['win'] - bn['extra']['win'])
    diff['h15'].append(max(x['long']['win'] for x in esc) - max(x['long']['win'] for x in non))
for k, v in diff.items():
    print(f'  best escape line - best no-escape line, win: {k}: mean {mean(v):+.3f} over {len(v)} questions; escape better in {sum(1 for x in v if x > 0)}, worse in {sum(1 for x in v if x < 0)}')

# D. terminal bias: H5 (with terminal) - H15, by line type
print('\nD. H5 win (terminal at the horizon) minus H15 win (played to the end), all rolled-out lines, by type')
for typ in ('escape', 'none'):
    xs = []; alive5 = []; n5 = []
    for r in rows_with_lines():
        for x in r['lines']:
            if (x['escapes'] > 0) != (typ == 'escape'):
                continue
            if r['board'].get('sandpit') is None:
                continue
            xs.append(x['extra']['win'] - x['long']['win'])
            alive5.append(x['extra']['alive'] / x['extra']['samples'])
    print(f'  {typ}: mean {mean(xs):+.3f} over {len(xs)} lines; share alive (unfinished) at H5 {mean(alive5):.3f}')

# C. calibration of the chosen line
print('\nC. calibration: the chosen line\'s win estimate vs the attempt outcome')
def chosen_line(r):
    key = r['chosen']
    if not key or key not in r['options']:
        return None
    plays = r['options'][key]['plays']
    for x in r.get('lines') or []:
        if x['plays'] == plays:
            return x
    return None

groups = collections.defaultdict(list)
for r in rows_with_lines():
    x = chosen_line(r)
    if x is None:
        continue
    if r['board'].get('sandpit') is None:
        typ = 'T1 (no Sandpit yet)'
    else:
        typ = 'escape' if x['escapes'] > 0 else 'no escape'
    y = 1 if r['won'] else 0
    groups[typ].append({'live': x['winProb'], 'h5': x['extra']['win'], 'h15': x['long']['win'], 'y': y, 'first': r['firstOfTurn'], 'run': r['run'], 'turn': r['turn'], 'sp': r['board'].get('sandpit')})
for typ, g in groups.items():
    for sub, gg in (('all', g), ('first of turn', [e for e in g if e['first']])):
        if not gg:
            continue
        y = mean([e['y'] for e in gg])
        print(f'  {typ:20s} {sub:14s} n={len(gg):3d} runs={len(set(e["run"] for e in gg)):2d} won {y:.3f} | mean est live8 {mean([e["live"] for e in gg]):.3f} (Brier {brier([(e["live"], e["y"]) for e in gg]):.3f}) | 64@H5 {mean([e["h5"] for e in gg]):.3f} (Brier {brier([(e["h5"], e["y"]) for e in gg]):.3f}) | 64@H15 {mean([e["h15"] for e in gg]):.3f} (Brier {brier([(e["h15"], e["y"]) for e in gg]):.3f})')

# bins for the sandpit turns
print('\n  reliability (Sandpit up, first of turn), 64@H15 bins:')
allg = [e for t, g in groups.items() if t != 'T1 (no Sandpit yet)' for e in g if e['first']]
for lo, hi in ((0, .05), (.05, .2), (.2, .4), (.4, .6), (.6, .8), (.8, 1.01)):
    b = [e for e in allg if lo <= e['h15'] < hi]
    if b:
        print(f'    [{lo:.2f},{hi:.2f}) n={len(b):3d} est {mean([e["h15"] for e in b]):.3f} won {mean([e["y"] for e in b]):.3f} | live8 est {mean([e["live"] for e in b]):.3f}')
json.dump({k: v for k, v in groups.items()}, open('/tmp/claude-1000/-home-dw-Projects-sts2-jev/27a9b548-f649-5f28-81f5-71c789f342c6/scratchpad/insat/calib.json', 'w'))

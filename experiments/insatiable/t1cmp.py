import json, glob, collections
S = '/tmp/claude-1000/-home-dw-Projects-sts2-jev/27a9b548-f649-5f28-81f5-71c789f342c6/scratchpad/insat'
def load(m):
    out = {}
    for f in sorted(glob.glob(f'{S}/t1-{m}-*.jsonl')):
        for l in open(f):
            r = json.loads(l)
            out[r['off']] = r
    return out
off, on = load('off'), load('on')
def mean(x): return sum(x) / len(x) if x else float('nan')
keys = sorted(set(off) & set(on))
print('T1 questions', len(keys))
c = collections.Counter()
calib = collections.defaultdict(list)
changes = []
for k in keys:
    a, b = off[k], on[k]
    la = {x['plays']: x for x in a.get('lines') or []}
    lb = {x['plays']: x for x in b.get('lines') or []}
    if not la or not lb:
        continue
    c['q'] += 1
    # pit deaths now
    c['pit deaths H15 off'] += sum(x['long']['pit'] for x in la.values())
    c['pit deaths H15 on'] += sum(x['long']['pit'] for x in lb.values())
    c['samples H15'] += sum(x['long']['samples'] for x in lb.values())
    # the rollout's best (live 8: by value as rolloutDecision ranks; here the shown best flag)
    best_a = next((o['plays'] for o in a['optionsNow'].values() if o['best']), None)
    best_b = next((o['plays'] for o in b['optionsNow'].values() if o['best']), None)
    if best_a != best_b:
        c['rollout_best changed'] += 1
        changes.append((a['run'], a['turn'], best_a, best_b))
    ch = a['options'].get(a['chosen'] or '', {}).get('plays')
    y = 1 if a['won'] else 0
    if ch in la and ch in lb and a['firstOfTurn']:
        calib['live8 off'].append((la[ch]['winProb'], y)); calib['live8 on'].append((lb[ch]['winProb'], y))
        calib['64@H5 off'].append((la[ch]['extra']['win'], y)); calib['64@H5 on'].append((lb[ch]['extra']['win'], y))
        calib['64@H15 off'].append((la[ch]['long']['win'], y)); calib['64@H15 on'].append((lb[ch]['long']['win'], y))
    for p in la:
        if p in lb:
            c['lines'] += 1
            c['win drop live8'] += la[p]['winProb'] - lb[p]['winProb']
            c['win drop H15'] += la[p]['long']['win'] - lb[p]['long']['win']
print(dict(c))
print('mean win drop per line: live8 %.3f, 64@H15 %.3f' % (c['win drop live8'] / c['lines'], c['win drop H15'] / c['lines']))
for k, v in calib.items():
    print(f'  chosen line, first of turn, {k:12s} n={len(v)} est {mean([p for p, _ in v]):.3f} won {mean([y for _, y in v]):.3f} Brier {mean([(p - y) ** 2 for p, y in v]):.3f}')
for ch in changes:
    print('  best changed', ch)

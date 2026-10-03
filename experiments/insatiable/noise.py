import json, glob, collections, statistics
S = '/tmp/claude-1000/-home-dw-Projects-sts2-jev/27a9b548-f649-5f28-81f5-71c789f342c6/scratchpad/insat'
rows = [json.loads(l) for f in sorted(glob.glob(f'{S}/noise-*.jsonl')) for l in open(f)]
def mean(x): return sum(x) / len(x) if x else float('nan')
REF = slice(72, 136)
out = collections.defaultdict(list)
picks = collections.Counter()
bvjt = []
for r in rows:
    L = [x for x in (r.get('lines') or []) if x.get('extra', {}).get('values')]
    if len(L) < 2:
        continue
    ref = [mean(x['extra']['values'][REF]) for x in L]
    refw = [mean(x['extra']['wins'][REF]) for x in L]
    best_ref = max(range(len(L)), key=lambda i: ref[i])
    for m in (8, 16, 24, 32, 64):
        est = [mean(x['extra']['values'][:m]) for x in L]
        pick = max(range(len(L)), key=lambda i: est[i])
        out[m].append(ref[best_ref] - ref[pick])
        out[f'win{m}'].append(refw[best_ref] - refw[pick])
        out[f'miss{m}'].append(1 if pick != best_ref and ref[best_ref] - ref[pick] > 1 else 0)
        if m in (8, 24):
            picks[(m, 'escape' if L[pick]['escapes'] else 'none')] += 1
    picks[('ref', 'escape' if L[best_ref]['escapes'] else 'none')] += 1
    if r['run'] == 'BVJT7HFW6X2S':
        bvjt.append((r['turn'], [(x['line'][:40], round(mean(x['extra']['values'][:8]), 1), round(mean(x['extra']['values'][:24]), 1), round(mean(x['extra']['values']), 1), round(mean(x['extra']['wins'][:24]), 3), round(mean(x['extra']['wins']), 3)) for x in L]))
print('questions', len(out[8]))
for m in (8, 16, 24, 32, 64):
    print(f'samples {m:2d}: mean regret {mean(out[m]):.2f} HP-value (win {mean(out[f"win{m}"]):+.3f}); picks a line >1 HP worse than the reference best in {sum(out[f"miss{m}"])}/{len(out[m])}')
print(dict(picks))
for t, L in bvjt:
    print('BVJT T', t)
    for x in L:
        print('   ', x)

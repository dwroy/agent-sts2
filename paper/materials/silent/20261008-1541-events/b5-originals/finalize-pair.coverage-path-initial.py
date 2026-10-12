import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

S = Path(__file__).resolve().parent
ROOT = S.parents[2]

def rows(path):
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def canonical(row):
    r = copy.deepcopy(row)
    if r.get('sim'):
        r['sim'].pop('ms', None)
    return json.dumps(r, sort_keys=True, ensure_ascii=False)

def save(name, value):
    (S / name).write_text(json.dumps(value, ensure_ascii=False, indent=1)+'\n')

fights = rows(S / 'dataset/fights.jsonl')
before = rows(S / 'before-authoritative-results/results-0.jsonl')
replayed = rows(S / 'after-queen-results/results-0.jsonl')
expected = {(r['key'], start) for r in fights for start in ('t1','pre')}
queen_expected = {(r['key'], start) for r in fights if r['encounter'] == 'QUEEN+TORCH_HEAD_AMALGAM' for start in ('t1','pre')}
assert len(before) == len(expected) and {(r['key'],r['start']) for r in before} == expected
assert len(replayed) == len(queen_expected) and {(r['key'],r['start']) for r in replayed} == queen_expected
provenance = json.loads((S / 'before-provenance.json').read_text())
assert all(sha(ROOT / p) == h for p,h in provenance['input_files'].items())
assert sha(S / 'dataset/fights.jsonl') == provenance['dataset_sha256']
assert sha(S / 'dataset/sources.jsonl') == provenance['sources_sha256']
assert subprocess.check_output(['git','diff','--name-only',provenance['simulator_base'],'HEAD','--','agent/src','agent/tools','agent/tests','learner/tasks','ops','eval','knowledge/builders'], cwd=ROOT, text=True).strip() == ''
new = {(r['key'],r['start']):r for r in replayed}
after, reused, mismatches = [], [], []
for r in before:
    ident = (r['key'],r['start'])
    if ident in new:
        candidate = new[ident]
        assert r['actual'] == candidate['actual'] and r['character'] == candidate['character'] == 'silent'
        if canonical(r) != canonical(candidate):
            mismatches.append({'key':r['key'],'start':r['start'],'before_sha256':hashlib.sha256(canonical(r).encode()).hexdigest(), 'after_sha256':hashlib.sha256(canonical(candidate).encode()).hexdigest()})
        after.append(candidate)
    else:
        # Both sides use the identical committed simulator and frozen inputs; no other boss is changed.
        after.append(r)
        reused.append({'key':r['key'],'start':r['start'],'canonical_sha256':hashlib.sha256(canonical(r).encode()).hexdigest()})
for r in before + after:
    assert r.get('character') == 'silent'
    if r.get('sim'):
        assert r['sim']['samples'] == 200 and len(r['sim']['outcomes']) == 200
out = S / 'after-results'
out.mkdir(exist_ok=True)
(out / 'results-0.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in after))
save('after-provenance.json', {**provenance, 'replay_side':'after', 'candidate_source':provenance['simulator_base'], 'source_change':False})
save('pair-integrity.json', {'source_base':provenance['simulator_base'], 'source_head':provenance['simulator_base'],
    'rows_before':len(before),'rows_after':len(after),'queen_replayed_rows':len(replayed),'other_boss_reused_rows':len(reused),
    'dataset_sha256':provenance['dataset_sha256'],'sources_sha256':provenance['sources_sha256'],'turns_sha256':provenance['turns_sha256'],
    'before_results_sha256':sha(S / 'before-authoritative-results/results-0.jsonl'),'after_results_sha256':sha(out / 'results-0.jsonl'),
    'queen_semantic_mismatches':mismatches,'reused':reused,
    'rule':'200 samples, seed=1+original_fights_line_index*101, same immutable model; only elapsed sim.ms is ignored for comparison; no source correction is claimed'})
for side in ('before','after'):
    cmd = [sys.executable,str(ROOT/'agent/tools/boss-sim/trust.py'),'--character','silent','--results',str(S/f'{side}-results/results-0.jsonl'),
           '--fights',str(S/'dataset/fights.jsonl'),'--split',str(S/'split.json'),'--turns',str(S/'dataset/turns.jsonl'),
           '--provenance',str(S/f'{side}-provenance.json'),'--out',str(S/f'{side}-trust.json')]
    with (S/f'{side}-trust.log').open('w') as h:
        result = subprocess.run(['nice','-n','19',*cmd],stdout=h,stderr=subprocess.STDOUT,cwd=ROOT)
    save(f'{side}-trust.rc.json',{'rc':result.returncode,'command':cmd})
    if result.returncode:
        raise RuntimeError(f'{side} trust.py failed; retain original log')
    for start in ('t1','pre'):
        for split in ('tune','val'):
            cmd = [sys.executable,str(ROOT/'agent/tools/boss-sim/per-turn.py'),'--results',str(S/f'{side}-results/results-0.jsonl'),
                   '--set',split,'--start',start,'--enc','QUEEN','--split',str(S/'split.json'),'--turns',str(S/'dataset/turns.jsonl'),
                   '--json',str(S/f'{side}-per-turn-{split}-{start}.json')]
            with (S/f'{side}-per-turn-{split}-{start}.log').open('w') as h:
                subprocess.run(['nice','-n','19',*cmd],stdout=h,stderr=subprocess.STDOUT,cwd=ROOT,check=True)
print(json.dumps({'rows':len(before),'queen_replayed':len(replayed),'mismatches':len(mismatches),'trust_profiles':['before-trust.json','after-trust.json']}))

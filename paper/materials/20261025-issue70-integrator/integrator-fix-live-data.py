from pathlib import Path
import hashlib, json, shutil, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
state = json.loads((M / 'actual-live-consumer-state.json').read_text())
assert state['phase'] == 'stopped' and state['check_lock_released']
assert not Path('/proc/' + str(state['pid'])).exists()
old = M / 'live-targeted-attempt2'
old.mkdir(exist_ok=False)
for n in ['actual-live-consumer-state.json', 'actual-live-consumer-inputs.json', 'actual-live-tsc.log', 'actual-live-targeted.log', 'actual-live-consumer-tests.json', 'actual-live-consumer-error.log']:
    shutil.copy2(M / n, old / n)
for n in ['prepare-live.py', 'live-check.py']:
    shutil.copy2(A / n, old / n)
d = json.loads((M / 'actual-live-consumer-inputs.json').read_text())
L = R / '.worktrees/live'
F = Path(d['fixture'])
sha = lambda b: hashlib.sha256(b).hexdigest()
assert subprocess.check_output(['git', '-C', str(L), 'rev-parse', 'HEAD'], text=True).strip() == d['actual_live']
ns = subprocess.check_output(['git', '-C', str(L), 'ls-files', '-z', '--', 'knowledge']).decode().split('\0')
added = []
listed = {x['path'] for x in d['inputs']}
for n in ns:
    p = L / n
    if not n or not p.is_file() or p.suffix not in {'.json', '.md', '.csv', '.tsv'}:
        continue
    b = p.read_bytes()
    q = F / n
    if q.exists():
        assert n in listed and q.read_bytes() == b, ('unexpected fixture collision', n)
        continue
    q.parent.mkdir(parents=True, exist_ok=True)
    q.write_bytes(b)
    q.chmod(p.stat().st_mode & 0o777)
    row = dict(path=n, sha256=sha(b), bytes=len(b), mode=p.stat().st_mode & 0o777)
    d['baseline'].append(row)
    d['inputs'].append({k: v for k, v in row.items() if k != 'bytes'})
    added.append(row)
for row in added:
    assert sha((L / row['path']).read_bytes()) == row['sha256'], row['path']
d['at'] = subprocess.check_output(['date', '-Is'], text=True).strip()
d['previous_targeted_failures'] = 2
d['fixture_knowledge_correction'] = dict(
    reason='LIVE knowledge fixture data omitted; provenance/external lookup ENOENT and missing consumer inputs',
    files=len(added), bytes=sum(x['bytes'] for x in added),
    first_result='144 pass / 33 fail / 0 skip retained in live-targeted-attempt1',
    second_attempt='copy script stopped at an already copied builder before any data copy; an unintended unchanged-input rerun is retained in live-targeted-attempt2 and not used as evidence of a correction',
    production_changes=0, full_reruns=0)
(M / 'actual-live-consumer-inputs.json').write_text(json.dumps(d, indent=2) + '\n')
(M / 'live-knowledge-fixture-correction.json').write_text(json.dumps(dict(at=d['at'], **d['fixture_knowledge_correction']), indent=2) + '\n')
p = A / 'prepare-live.py'
s = p.read_text().replace("or (n.startswith(('agent/'", "or n.startswith('knowledge/') or (n.startswith(('agent/'").replace("'.md','.txt'", "'.md','.txt','.csv','.tsv'")
p.write_text(s)
print(json.dumps(d['fixture_knowledge_correction']))

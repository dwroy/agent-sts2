from pathlib import Path
import fcntl, hashlib, json, os, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
s = json.loads((M / 'actual-live-consumer-state.json').read_text())
d = json.loads((M / 'actual-live-consumer-inputs.json').read_text())
c = json.loads((A / 'full-context.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
assert s['phase'] == 'passed' and s['check_lock_released']
assert not Path('/proc', str(s['pid'])).exists(), 'worker still present'
with (R / 'ops/integrator-full-check.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    inode = os.fstat(lock.fileno()).st_ino
    assert inode == c['lock_inode']
F, L = Path(d['fixture']), R / '.worktrees/live'
actual = {str(p.relative_to(F)) for p in F.rglob('*') if p.is_file() and not p.is_symlink() and 'node_modules' not in p.parts and '.cache' not in p.relative_to(F).parts}
assert actual == {x['path'] for x in d['inputs']}
for x in d['inputs']:
    p = F / x['path']
    assert sha(p.read_bytes()) == x['sha256'] and p.stat().st_mode & 0o777 == x['mode'], x['path']
for x in d['baseline']:
    assert sha((L / x['path']).read_bytes()) == x['sha256'], x['path']
for x in d['overlay']:
    p = L / x['path']
    assert (sha(p.read_bytes()) if p.is_file() else None) == x['before_sha256'], x['path']
assert subprocess.check_output(['git', '-C', str(L), 'rev-parse', 'HEAD'], text=True).strip() == d['actual_live']
assert (F / 'agent/node_modules').resolve() == Path(c['node_root']).resolve()
for x in c['dependencies']:
    assert sha((Path(c['node_root']) / x['path']).read_bytes()) == x['sha256'], x['path']
r = json.loads((M / 'actual-live-consumer-tests.json').read_text())
assert r['success'] and len(r['testResults']) == 11 and r['numPassedTests'] == 177 and r['numFailedTests'] == r['numPendingTests'] == 0
out = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(), accepted=True, worker_absent=True, lock_available=True, lock_inode=inode, inputs=len(d['inputs']), actual_live_baseline_inputs=len(d['baseline']), overlay_files=len(d['overlay']), dependency_count=len(c['dependencies']), actual_live=d['actual_live'], inputs_and_dependencies_unchanged=True, actual_live_unchanged=True, files=11, passed=177, failed=0, skipped=0, tsc_rc=s['tsc_rc'], result_sha256=sha((M / 'actual-live-consumer-tests.json').read_bytes()), full_reruns=0, model_calls=0, production_operations=0)
(M / 'actual-live-terminal-readback.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(out))

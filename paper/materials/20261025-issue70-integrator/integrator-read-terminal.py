from pathlib import Path
import fcntl, hashlib, json, os, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
s = json.loads((M / 'full-state.json').read_text())
c = json.loads((A / 'full-context.json').read_text())
W = Path(c['worktree'])
sha = lambda b: hashlib.sha256(b).hexdigest()
assert s['phase'] in ['full-passed', 'full-stopped'], s
proc = Path('/proc') / str(s['worker_pid'])
worker_absent = not proc.exists()
if proc.exists():
    worker_absent = proc.joinpath('stat').read_text().rsplit(')', 1)[1].split()[19] != s['worker_birth']
assert worker_absent, 'original worker still present; wait for natural exit'
with (R / 'ops/integrator-full-check.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    lock_inode = os.fstat(lock.fileno()).st_ino
    assert lock_inode == c['lock_inode']
inputs = []
for x in c['inputs']:
    p = W / x['path']
    if sha(p.read_bytes()) != x['sha256'] or p.stat().st_mode & 0o777 != x['mode'] or (os.readlink(p) if p.is_symlink() else None) != x['symlink']:
        inputs.append(x['path'])
deps = [x['path'] for x in c['dependencies'] if sha((Path(c['node_root']) / x['path']).read_bytes()) != x['sha256']]
semantic = {}
for label, args in [('entries', ['ls-files', '--stage', '-z']), ('flags', ['ls-files', '-v', '-z'])]:
    semantic[label] = sha(subprocess.check_output(['git', '-C', str(W), *args]))
tree = subprocess.check_output(['git', '-C', str(W), 'write-tree'], text=True).strip()
r = json.loads((M / 'full.json').read_text())
files = r['testResults']
skipped = [x['fullName'] for f in files for x in f['assertionResults'] if x['status'] in ['pending', 'skipped', 'todo']]
failed = [{'file': f['name'], 'tests': [x['fullName'] for x in f['assertionResults'] if x['status'] == 'failed']} for f in files if f['status'] == 'failed']
allowed = json.loads((W / '.agents/queue-checks.json').read_text())['allowed_skips']
skip_policy_ok = len(skipped) == len(allowed) and all(any(name.endswith(rule) for rule in allowed) for name in skipped)
accepted = s['phase'] == 'full-passed' and s['rc'] == 0 and r['success'] and not inputs and not deps and semantic == c['index_semantic_before'] and tree == c['validation_tree'] and not failed and skip_policy_ok
out = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(), accepted=accepted, worker_absent=worker_absent, lock_available=True, lock_inode=lock_inode, state=s, input_count=len(c['inputs']), dependency_count=len(c['dependencies']), independent_input_drift=inputs, independent_dependency_drift=deps, index_semantic_unchanged=semantic == c['index_semantic_before'], tree_unchanged=tree == c['validation_tree'], files=len(files), passed=r['numPassedTests'], failed=r['numFailedTests'], skipped=r['numPendingTests'], skipped_names=skipped, skip_policy_ok=skip_policy_ok, failed_files=failed, result_sha256=sha((M / 'full.json').read_bytes()))
(M / 'terminal-readback.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(out, ensure_ascii=False))
assert accepted

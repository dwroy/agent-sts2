import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
TREE = Path.cwd()
OUT = TREE / 'learner/runs/20261012-140819-fix-batch'
PRIOR = ROOT / 'paper/materials/20261012-1301-ops/fix-original'


def git(*args, cwd=TREE):
    return subprocess.check_output(['git', '-C', str(cwd), *args], text=True).strip()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


base = git('rev-parse', 'HEAD')
live = git('rev-parse', 'HEAD', cwd=ROOT / '.worktrees/live')
queue = (ROOT / 'notes/fix-queue-v4.md').read_bytes()
old = json.loads((PRIOR / 'queue-commits.json').read_text())
assert digest(queue) == old['queue_sha256'], 'Queue changed; review its new entries first'
(OUT / 'queue-snapshot.md').write_bytes(queue)
save('prior-audit-reference.json', {
    'directory': str(PRIOR),
    'artifacts': {name: digest((PRIOR / name).read_bytes()) for name in
                  ['report.md', 'report.json', 'queue-review.md', 'queue-commits.json',
                   'source-recheck.json', 'no-change-proof.json']},
    'queue_unchanged': True,
})

rows = []
for item in old['items']:
    row = {'item': item['item'], 'commit': item['commit']}
    for name, head in [('base', base), ('live', live)]:
        row[name + '_ancestor'] = subprocess.run(
            ['git', 'merge-base', '--is-ancestor', item['commit'], head],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    rows.append(row)
save('queue-commits.json', {
    'base': base, 'live_readonly': live, 'queue_sha256': digest(queue),
    'prior_audit': str(PRIOR), 'items': rows,
})

checks = {}
for item in json.loads((PRIOR / 'source-recheck.json').read_text()):
    path = item['path']
    raw = (TREE / path).read_bytes()
    live_raw = subprocess.check_output(['git', 'show', live + ':' + path])
    checks[path] = {
        'path': path, 'sha256': digest(raw), 'prior_sha256': item['sha256'],
        'same_as_prior': digest(raw) == item['sha256'],
        'same_as_live': raw == live_raw,
    }
save('source-recheck.json', list(checks.values()))
(OUT / 'changes-since-prior.diff').write_text(subprocess.check_output([
    'git', 'diff', old['base'] + '..' + base, '--', 'ops/codex-ops-learner.sh',
    'ops/strategy_research_jobs.py', 'ops/tests/test_strategy_research_scheduling.py'], text=True))
(OUT / 'changes-since-prior.txt').write_text(subprocess.check_output([
    'git', 'diff', '--stat', old['base'] + '..' + base, '--',
    'agent', 'learner', 'ops', 'knowledge/builders'], text=True))
print(json.dumps({
    'base': base, 'live_readonly': live, 'queue_sha256': digest(queue),
    'historical_rows': len(rows), 'base_ancestors': sum(r['base_ancestor'] for r in rows),
    'live_ancestors': sum(r['live_ancestor'] for r in rows),
    'checked_paths': len(checks), 'changed_paths': [p for p, r in checks.items() if not r['same_as_prior']],
    'status': git('status', '--porcelain', '--untracked-files=all'),
}, ensure_ascii=False))

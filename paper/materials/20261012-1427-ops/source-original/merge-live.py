import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
OUT = Path(__file__).resolve().parent
TREE = OUT.parents[2]

def git(*args, check=True):
    return subprocess.run(['git', '-C', str(LIVE), *args], text=True,
                          capture_output=True, check=check)

def save(value):
    (OUT / 'live-merge-result.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(value, ensure_ascii=False))

source = subprocess.check_output(['git', '-C', str(TREE), 'rev-parse', 'HEAD'], text=True).strip()
base = '8711917187c7c9253699a30c8fedeba75369e1ea'
while subprocess.run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], stdout=subprocess.DEVNULL).returncode == 0:
    time.sleep(10)
result = {'source': source, 'merged': None, 'status': 'preflight', 'live_initial': git('rev-parse', 'HEAD').stdout.strip()}
if git('diff', '--cached', '--name-only').stdout.strip():
    result['status'] = 'blocked_existing_staged_changes'
    save(result)
    raise SystemExit(0)
refresh_paths = git('diff', '--name-only', '--', 'notes/fight-value-backtest.md', 'knowledge').stdout.splitlines()
result['refresh_paths'] = refresh_paths
if refresh_paths:
    git('add', 'notes/fight-value-backtest.md', 'knowledge')
    patch = git('diff', '--cached', '--binary').stdout
    with (OUT / 'live-refresh-gitleaks.log').open('w') as log:
        scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, text=True, stdout=log, stderr=subprocess.STDOUT)
    if scan.returncode:
        result['status'] = 'blocked_refresh_secret_scan'
        save(result)
        raise SystemExit(0)
    git('commit', '-m', 'Refresh knowledge data', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
result['pre_merge'] = git('rev-parse', 'HEAD').stdout.strip()
own_paths = subprocess.check_output(['git', '-C', str(TREE), 'diff', '--name-only', base, source], text=True).splitlines()
result['own_paths'] = own_paths
result['refresh_overlap'] = sorted(set(own_paths) & set(refresh_paths))
if result['refresh_overlap']:
    result['status'] = 'blocked_refresh_overlap'
    save(result)
    raise SystemExit(0)
dirty_paths = git('diff', '--name-only').stdout.splitlines()
result['dirty_paths'] = dirty_paths
result['dirty_overlap'] = sorted(set(dirty_paths) & set(own_paths))
if result['dirty_overlap']:
    result['status'] = 'blocked_dirty_overlap'
    save(result)
    raise SystemExit(0)
preflight = git('merge-tree', '--write-tree', 'HEAD', source, check=False)
(OUT / 'live-merge-preflight.txt').write_text(preflight.stdout + preflight.stderr)
result['preflight_exit'] = preflight.returncode
if preflight.returncode:
    result['status'] = 'blocked_preflight_conflicts'
    result['conflicts'] = [line for line in preflight.stdout.splitlines() if line.startswith('CONFLICT')]
    result['live_final'] = git('rev-parse', 'HEAD').stdout.strip()
    save(result)
    raise SystemExit(0)
merge = git('merge', '--no-edit', source, check=False)
(OUT / 'live-merge-command.log').write_text(merge.stdout + merge.stderr)
if merge.returncode:
    result['status'] = 'blocked_merge'
    result['merge_exit'] = merge.returncode
    save(result)
    raise SystemExit(0)
with (OUT / 'live-sandbox-tests.log').open('w') as log:
    test = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=log, stderr=subprocess.STDOUT)
result['live_tests_exit'] = test.returncode
if test.returncode:
    git('reset', '--merge', result['pre_merge'])
    result['status'] = 'rolled_back_failed_tests'
else:
    result['merged'] = git('rev-parse', 'HEAD').stdout.strip()
    result['status'] = 'merged_pending_release_records'
result['live_final'] = git('rev-parse', 'HEAD').stdout.strip()
save(result)

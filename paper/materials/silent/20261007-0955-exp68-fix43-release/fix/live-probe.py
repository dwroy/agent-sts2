import json
from pathlib import Path
import subprocess
import sys

live = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
out = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-091305-fix-batch')
source = sys.argv[1]
report = {'source': source, 'lock_acquired': True, 'merged': None}

def run(args, **kwargs):
    return subprocess.run(args, cwd=live, capture_output=True, text=True, **kwargs)

def git(*args):
    result = run(['git', *args])
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout.strip()

def finish(reason, code):
    report['blocked'] = reason
    (out / 'live-flow.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False), flush=True)
    sys.exit(code)

subprocess.run(['date'], check=True)
print('已取得 live 合入锁，等待知识刷新结束。', flush=True)
subprocess.run(['bash', '-c', "while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done"], check=True)
report['before_refresh'] = git('rev-parse', 'HEAD')
if git('diff', '--cached', '--name-only'):
    finish('live 已有暂存改动，保留现有索引并停止。', 2)
git('add', 'notes/fight-value-backtest.md', 'knowledge')
report['refreshed_paths'] = git('diff', '--cached', '--name-only').splitlines()
if report['refreshed_paths']:
    patch = run(['git', 'diff', '--cached', '--binary']).stdout
    scan = run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=patch)
    (out / 'live-refresh-gitleaks.log').write_text(scan.stdout + scan.stderr)
    report['refresh_gitleaks'] = scan.returncode
    if scan.returncode:
        git('restore', '--staged', '--', *report['refreshed_paths'])
        finish('刷新数据安全扫描未通过，停止提交和合入。', 2)
    git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit',
        '-m', 'Refresh knowledge data', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
report['before_merge'] = git('rev-parse', 'HEAD')
report['refresh_commit'] = report['before_merge'] if report['refreshed_paths'] else None
report['merge_bases'] = git('merge-base', '--all', 'HEAD', source).splitlines()
ours, theirs = set(), set()
for base in report['merge_bases']:
    ours.update(git('diff', '--name-only', base, source, '--', 'knowledge').splitlines())
    theirs.update(git('diff', '--name-only', base, 'HEAD', '--', 'knowledge').splitlines())
report['knowledge_overlap'] = sorted(ours & theirs)
probe = run(['git', 'merge-tree', '--write-tree', 'HEAD', source])
(out / 'live-locked-preflight.log').write_text(probe.stdout + probe.stderr)
report['preflight_exit'] = probe.returncode
report['conflicts'] = [line for line in probe.stdout.splitlines() if line.startswith('CONFLICT')]
report['knowledge_conflicts'] = [line for line in report['conflicts'] if 'knowledge/' in line]
report['live_head_after_probe'] = git('rev-parse', 'HEAD')
if probe.returncode:
    finish('锁内合入预检发现冲突；已保存刷新数据，未修改 live 的合入内容。', 2)
finish(None, 0)

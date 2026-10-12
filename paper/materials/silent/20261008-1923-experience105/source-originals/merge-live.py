import json
import os
import subprocess
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
SOURCE = (O / 'source-commit.txt').read_text().strip()
state = dict(source=SOURCE, branch='exp-silent', merged=None, refresh=None, pre=None, tests=None)

def run(args, check=True, log=True):
    p = subprocess.run(args, cwd=LIVE, text=True, capture_output=True)
    if log:
        with (O / 'live-merge.log').open('a') as h:
            h.write(' '.join(args) + '\n' + p.stdout + p.stderr)
    if check and p.returncode:
        raise RuntimeError('命令失败：' + ' '.join(args))
    return p

def save():
    (O / 'live-merge.json').write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')

try:
    state['initial'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
    state['initial_status'] = run(['git', 'status', '--short']).stdout
    if run(['git', 'diff', '--cached', '--name-only']).stdout.strip():
        state['result'] = 'live已有暂存改动，停止避免混入他人提交'
        save()
        raise SystemExit(0)
    refresh = run(['git', 'diff', '--name-only', '--', 'knowledge', 'notes/fight-value-backtest.md']).stdout.splitlines()
    if refresh:
        run(['git', 'add', 'knowledge'])
        if (LIVE / 'notes/fight-value-backtest.md').exists():
            run(['git', 'add', 'notes/fight-value-backtest.md'])
        patch = run(['git', 'diff', '--cached'], log=False).stdout
        scan = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, text=True, capture_output=True, cwd=LIVE)
        (O / 'gitleaks-refresh.log').write_text(scan.stdout + scan.stderr)
        if scan.returncode:
            state['result'] = '刷新数据gitleaks未通过，停止'
            save()
            raise SystemExit(0)
        (O / 'refresh.patch').write_text(patch)
        run(['git', 'commit', '-m', 'Refresh knowledge data', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'])
        state['refresh'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
    state['refresh_paths'] = refresh
    state['pre'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
    base = run(['git', 'merge-base', state['pre'], SOURCE]).stdout.strip()
    branch_paths = run(['git', 'diff', '--name-only', base, SOURCE, '--', 'knowledge']).stdout.splitlines()
    state['knowledge_overlap'] = sorted(set(refresh) & set(branch_paths))
    bad = []
    for path in state['knowledge_overlap']:
        p = run(['git', 'rev-parse', SOURCE + ':' + path], check=False)
        q = run(['git', 'rev-parse', state['pre'] + ':' + path], check=False)
        if p.returncode or q.returncode or p.stdout != q.stdout:
            bad.append(path)
    if bad:
        state['result'] = '刷新知识与本分支不同数据重叠，按任务停止'
        state['overlap_conflicts'] = bad
        save()
        raise SystemExit(0)
    preview = run(['git', 'merge-tree', '--write-tree', state['pre'], SOURCE], check=False)
    (O / 'merge-preview.txt').write_text(preview.stdout + preview.stderr)
    if preview.returncode:
        state['result'] = '锁内合并预检冲突，按任务停止，不实际合并或硬解'
        state['conflicts'] = [line for line in preview.stdout.splitlines() if line.startswith('CONFLICT')]
        save()
        raise SystemExit(0)
    p = run(['git', 'merge', '--no-edit', 'exp-silent'], check=False)
    if p.returncode:
        state['result'] = '实际合入冲突，停止，保留现场'
        save()
        raise SystemExit(0)
    state['merged'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
    save()
    env = dict(os.environ, SANDBOX_WORKERS='1', TMPDIR=str(O), PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'])
    env.pop('CHARACTER', None)
    with (O / 'test-live.log').open('w') as h:
        p = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', env=env, stdout=h, stderr=subprocess.STDOUT)
    state['tests'] = p.returncode
    if p.returncode:
        with (O / 'test-live-retry.log').open('w') as h:
            p = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', env=env, stdout=h, stderr=subprocess.STDOUT)
        state['tests_retry'] = p.returncode
        if p.returncode:
            run(['git', 'reset', '--merge', state['pre']])
            state['merged'] = None
            state['result'] = '合后测试失败，回退到合前提交、保留刷新数据'
            save()
            raise SystemExit(1)
    state['result'] = '实际合入且合后沙箱通过，待追加上线记录和eval版本'
    save()
except Exception as e:
    state['result'] = '合入流程异常：' + str(e)
    save()
    raise

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
OUT = ROOT / 'learner/runs/20261007-081302-fix-batch'
BRANCH = 'fix-batch-20261007-081302'
AUTHOR = ['-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com']
result = {}

def git(*args, check=True):
    run = subprocess.run(['git', '-C', str(LIVE), *args], capture_output=True, text=True)
    if check and run.returncode:
        raise RuntimeError(run.stdout + run.stderr)
    return run

def save():
    (OUT / 'live-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

print('已获得 live 合入锁，等待知识刷新并执行预检。', flush=True)
result['lock_acquired'] = True
save()

while subprocess.run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], stdout=subprocess.DEVNULL).returncode == 0:
    time.sleep(10)

if git('diff', '--cached', '--name-only').stdout.strip():
    result['blocked'] = 'live already has staged changes; preserved them'
    save()
    sys.exit(2)

result['before_refresh'] = git('rev-parse', 'HEAD').stdout.strip()
git('add', 'knowledge')
if (LIVE / 'notes/fight-value-backtest.md').exists():
    git('add', 'notes/fight-value-backtest.md')
result['refreshed_paths'] = git('diff', '--cached', '--name-only').stdout.splitlines()
if result['refreshed_paths']:
    with (OUT / 'live-refresh-gitleaks.txt').open('w') as log:
        scan = subprocess.run(['gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner', str(LIVE)], stdout=log, stderr=subprocess.STDOUT)
    if scan.returncode:
        result['blocked'] = 'refresh data secret scan failed; no commit or merge'
        save()
        sys.exit(2)
    git(*AUTHOR, 'commit', '-m', 'Refresh knowledge data', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
    result['refresh_commit'] = git('rev-parse', 'HEAD').stdout.strip()

result['before_merge'] = git('rev-parse', 'HEAD').stdout.strip()
result['source'] = git('rev-parse', BRANCH).stdout.strip()
base = git('merge-base', 'HEAD', BRANCH).stdout.strip()
live_knowledge = set(git('diff', '--name-only', base, 'HEAD', '--', 'knowledge').stdout.splitlines())
source_knowledge = set(git('diff', '--name-only', base, BRANCH, '--', 'knowledge').stdout.splitlines())
overlap = []
for path in sorted(live_knowledge & source_knowledge):
    if git('rev-parse', f'HEAD:{path}').stdout != git('rev-parse', f'{BRANCH}:{path}').stdout:
        overlap.append(path)
result['knowledge_conflicts'] = overlap
if overlap:
    result['blocked'] = 'knowledge changes overlap with different blobs; refresh preserved'
    save()
    sys.exit(2)

preview = git('merge-tree', '--write-tree', 'HEAD', BRANCH, check=False)
(OUT / 'live-merge-preflight.txt').write_text(preview.stdout + preview.stderr)
result['preflight_exit'] = preview.returncode
if preview.returncode:
    result['blocked'] = 'merge preflight conflict in paper/materials/decision-log.md; live not merged'
    save()
    sys.exit(2)

merged = git('merge', '--no-edit', BRANCH, check=False)
(OUT / 'live-merge.txt').write_text(merged.stdout + merged.stderr)
if merged.returncode:
    result['blocked'] = 'git merge failed; working tree requires operator inspection'
    save()
    sys.exit(2)
result['merged'] = git('rev-parse', 'HEAD').stdout.strip()
save()
env = dict(os.environ)
env['TMPDIR'] = str(OUT)
with (OUT / 'live-suite.txt').open('w') as log:
    tests = subprocess.run(['bash', 'tools/test-sandbox.sh', '--no-file-parallelism'], cwd=LIVE / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
result['tests_exit'] = tests.returncode
if tests.returncode:
    git('reset', '--merge', result['before_merge'])
    result['merged'] = None
    result['blocked'] = 'live tests failed; reset to the recorded post-refresh commit'
    save()
    sys.exit(2)

# Restore any pre-existing published record absent from the incoming main history.
record_path = 'paper/materials/decision-log.md'
old_records = git('show', f"{result['before_merge']}:{record_path}").stdout.splitlines()
records = (LIVE / record_path).read_text()
missing = [line for line in old_records if line.startswith('- ') and line not in records.splitlines()]
date_run = subprocess.run(['date', '+%Y-%m-%d %H:%M'], capture_output=True, text=True, check=True)
stamp = date_run.stdout.strip()
versions_path = LIVE / 'eval/versions.json'
versions = json.loads(versions_path.read_text())
existing = [int(m.group(1)) for v in versions['versions'] if (m := re.fullmatch(r'S1\.fix(\d+)', v['name']))]
result['version'] = f"S1.fix{max(existing, default=0) + 1}"
line = (f"- {stamp} Codex学习者纯bug自测后上线：fix-queue-v4 2026-10-07 08:00已建模中毒仍触发攻击八折；"
        f"源码{result['source']}→实际live代码{result['merged']}，eval {result['version']}。"
        "仅补POISON_POWER已有模型覆盖声明；证据K3676LU8B0UH SILENT A1 F17 T2、T3FW7R2R2306 SILENT A10 F8 T3/T4/T5；"
        "账本silent-0216仅learner:fix-batch proposed，交运维据fix-done核实际发布后登记shipped。"
        "固定7例撤源码6败1过、恢复7过，相关2文件17例通过；源及合后最终沙箱tsc/vitest0。"
        "源首轮旧绷带伤害断言与用药事实预算退化两败保留，绷带限定格挡损血、用药单例重跑通过，重复worker参数CLI失败保留，最终源原始沙箱入口通过；完整外部交调度器。"
        "同型中毒铁甲局面共用适配器亦纠正错误折扣，未导入其他角色知识；未知增益折扣和毒结算保持，不改打法或药水规则。"
        "知识刷新保留，无生成器变更；不停对局、不运行play、不推送。")
with (LIVE / record_path).open('a') as handle:
    for missing_line in missing:
        handle.write('\n' + missing_line)
    handle.write('\n' + line + '\n')
versions['versions'].append({'name': result['version'], 'family': 'Silent', 'commit': result['merged'], 'source': line[2:]})
versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
git('add', record_path, 'eval/versions.json')
with (OUT / 'live-release-gitleaks.txt').open('w') as log:
    scan = subprocess.run(['gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner', str(LIVE)], stdout=log, stderr=subprocess.STDOUT)
if scan.returncode:
    result['blocked'] = 'release record secret scan failed; records not committed'
    save()
    sys.exit(2)
git(*AUTHOR, 'commit', '-m', 'Record poison model coverage release', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
result['release'] = git('rev-parse', 'HEAD').stdout.strip()
save()

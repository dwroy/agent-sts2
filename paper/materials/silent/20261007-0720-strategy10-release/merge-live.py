import json
import os
from pathlib import Path
import re
import subprocess

scratch = Path(__file__).parent
live = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
branch = 'strategy-proposal-20261007-070020'
files = ['agent/src/hand/screens/rest.ts', 'agent/tests/silent-humidifier-rest.test.ts',
         'agent/tests/silent-humidifier-rest-evidence.json']
result = {'branch': branch, 'merged': None, 'version': None}

def finish(code, **extra):
    result.update(extra)
    (scratch / 'live-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(code)

def run(args, *, cwd=live, log=None, check=True):
    output = subprocess.run(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if log:
        (scratch / log).write_text(output.stdout)
    if check and output.returncode:
        finish(output.returncode, error='命令失败：' + ' '.join(args))
    return output

def git(*args, **kwargs):
    return run(['git', *args], **kwargs)

def scan(name):
    output = run(['nice', '-n', '19', 'gitleaks', 'git', '--staged', '--redact=100', '--no-banner'],
                 log=name + '.log', check=False)
    (scratch / (name + '.exit')).write_text(str(output.returncode) + '\n')
    if output.returncode:
        finish(output.returncode, error='敏感信息扫描未通过')

def commit(message, filename):
    path = scratch / filename
    path.write_text(message + '\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>\n')
    git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit', '--file', str(path))

source = git('rev-parse', branch).stdout.strip()
result['source_commit'] = source
if git('diff', '--cached', '--name-only').stdout.strip():
    finish(20, error='live已有暂存改动，停止')
result['initial_status'] = git('status', '--porcelain=v1').stdout
refreshed = git('diff', '--name-only', '--', 'notes/fight-value-backtest.md', 'knowledge').stdout.splitlines()
untracked = git('ls-files', '--others', '--exclude-standard', '--', 'notes/fight-value-backtest.md', 'knowledge').stdout.splitlines()
result['refreshed_files'] = sorted(set(refreshed + untracked))
git('add', 'notes/fight-value-backtest.md', 'knowledge')
if git('diff', '--cached', '--name-only').stdout.strip():
    scan('gitleaks-refresh')
    commit('Refresh knowledge data', 'refresh-message.txt')
    result['refresh_commit'] = git('rev-parse', 'HEAD').stdout.strip()
else:
    result['refresh_commit'] = None
pre = git('rev-parse', 'HEAD').stdout.strip()
result['pre_merge'] = pre
base = git('merge-base', 'HEAD', branch).stdout.strip()
incoming = git('diff', '--name-only', base, branch, '--', 'knowledge').stdout.splitlines()
result['incoming_knowledge'] = incoming
result['knowledge_overlap'] = sorted(set(incoming) & set(result['refreshed_files']))
if result['knowledge_overlap']:
    finish(23, error='刷新知识与本分支改动重叠，停止，不覆盖')
before = git('ls-tree', '-r', 'HEAD', '--', 'knowledge').stdout
preview = git('merge-tree', '--write-tree', '--messages', 'HEAD', branch, check=False, log='live-preflight.log')
result['preflight_exit'] = preview.returncode
if preview.returncode:
    finish(24, error='合入预检有冲突，停止')
message = f'Merge branch {branch} into live\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>'
merged = git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com',
             'merge', '--no-edit', '-m', message, branch, check=False, log='live-merge.log')
if merged.returncode:
    finish(merged.returncode, error='实际合入失败，停止')
code_merge = git('rev-parse', 'HEAD').stdout.strip()
result['code_merge'] = code_merge
# Tests run at low priority, using the fixed sandbox entry and task-local temporary directory.
with (scratch / 'live-suite.log').open('w') as handle:
    suite = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=live / 'agent', stdout=handle, stderr=subprocess.STDOUT)
(scratch / 'live-suite.exit').write_text(str(suite.returncode) + '\n')
result['suite_exit'] = suite.returncode
if suite.returncode:
    rollback = git('reset', '--merge', pre, check=False, log='live-rollback.log')
    result['rollback_exit'] = rollback.returncode
    finish(25, error='合后测试失败，按保存点回退，保留刷新与无关工作区差异')
if git('diff', source, 'HEAD', '--', *files).stdout:
    finish(26, error='合后源码或固定夹具不同，停止发布')
if git('ls-tree', '-r', 'HEAD', '--', 'knowledge').stdout != before:
    finish(27, error='知识blob不同，停止发布')
result['knowledge_preserved'] = True
versions_path = live / 'eval/versions.json'
versions = json.loads(versions_path.read_text())
numbers = [int(m.group(1)) for v in versions['versions'] if (m := re.fullmatch(r'S1\.strategy(\d+)', v['name']))]
version = f'S1.strategy{max(numbers, default=0) + 1}'
stamp = run(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
record = (f'- {stamp} Codex学习者策略事实子项自测后上线：来源{scratch}/proposal.md及fix-queue-v4路线／休息待定项；'
          f'静默活动石炉加湿器休息题分列回复、最大血增长和逐动作条件参考；源码{source}→实际live代码{code_merge}，eval {version}。'
          '证据UMVLWER4CD98 SILENT A10 F7/9/16/44/47（营火，无战斗回合）、F48末试T11；独立提案silent-0215，既有0204/0020。'
          'F7的52/70→75/75为回复18加增长5、总增23，F9锻造54/75不变，F16为51/85→81/90，F44为44/110→82/115，F47为31/115→70/120。'
          '十次回血增长5、总回复321来自同一局；同70进boss六次全败，没有替代路线或休息受控胜局。'
          '使用既有HEAL结果分账，HEAL/SMITH按当前动作列HP/最大HP，未知动作为null；相同最大HP只在该指标并列。'
          '不等待boss模拟即可展示触发和截断，保留原选项/动作/评分/投影/模拟；DeepSeek决定，Jev战斗不变，铁甲等价。'
          '不预支未来營火，不定血线或回血优先级，不新增药水代价、过滤、否决、提前或留药规则；怪物当前进阶首样本和房间代价五样本保持。'
          '固定十例撤完整生产源码9失败1通过、恢复10通过；首轮夹具缺state_version及F9假设HEAL截断预期校正历史保留。'
          '源码与合后固定沙箱tsc0/vitest0，gitleaks0；知识刷新逐blob保持，无生成器改动不重建。'
          '学习者仅经项目根ledger.py/by=learner:strategy-proposal登记0215 proposed及提交去向，0204/0020首证/状态/版本保持。'
          f'交运维据strategy-done及{scratch}/handoff-ops.md核实际发布后CLI登记shipped，完整外部套件交调度器；'
          '保血/全死权重、固定击杀顺序、巨兽拖延、SL阈值/范围、统一路线/休息血线和完整时钟证据不足，保持待定。不停对局、不运行play、不推送。')
with (live / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write('\n' + record + '\n')
versions['versions'].append({'name': version, 'family': 'Silent', 'commit': code_merge, 'source': record.lstrip('- ')})
versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
git('add', 'paper/materials/decision-log.md', 'eval/versions.json')
scan('gitleaks-release')
commit('Record Silent rest growth references deployment', 'release-message.txt')
result['version'] = version
result['merged'] = git('rev-parse', 'HEAD').stdout.strip()
result['tree'] = git('rev-parse', 'HEAD^{tree}').stdout.strip()
result['final_status'] = git('status', '--porcelain=v1').stdout
finish(0)

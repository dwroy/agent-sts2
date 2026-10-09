import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
LIVE = ROOT / '.worktrees/live'
source = (OUT / 'source-commit.txt').read_text().strip()
merge = (OUT / 'live-merge-commit.txt').read_text().strip()
ledger_id = (OUT / 'ledger-add.receipt').read_text().strip()

def git(*args):
    return subprocess.check_output(['git', '-C', str(LIVE), *args], text=True).strip()

assert git('merge-base', '--is-ancestor', source, 'HEAD') == ''
assert (OUT / 'live-sandbox.rc').read_text().strip() == '0'
assert git('diff', '--cached', '--name-only') == ''
subprocess.run(['date', '+%Y-%m-%d %H:%M:%S %Z'], check=True)
stamp = dt.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
versions_path = LIVE / 'eval/versions.json'
versions_text = versions_path.read_text()
versions = json.loads(versions_text)
numbers = [int(m[1]) for item in versions['versions'] if (m := re.fullmatch(r'S1\.apotheosis(\d+)', item['name']))]
version = 'S1.apotheosis' + str(max(numbers, default=0) + 1)
entry = dict(name=version, family='Silent', commit=merge,
             source=f'decision-log {stamp}：静默A10神化第九组触媒1→2配对；源{source}；VLZ6CCT8AQ0A F43T1/T4/T5、F45T5；{ledger_id}/silent-0237/0238/0027。撤源码5失败2通过、恢复4文件27例；源与合后原沙箱通过，其他角色/进阶等价；原10宽提案仍waiting，不承诺整场胜率。')
versions['versions'].append(entry)
prefix, separator, suffix = versions_text.rpartition('\n  ]')
assert separator
updated_text = prefix.rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + separator + suffix
assert json.loads(updated_text) == versions
versions_path.write_text(updated_text)

def append(path, content):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        data = content.encode()
        assert os.write(fd, data) == len(data)
        os.fsync(fd)
    finally:
        os.close(fd)

append(LIVE / 'paper/materials/decision-log.md',
       f'- {stamp} Codex学习者：静默A10神化触媒第九配对已实际合入，来源learner/runs/20261009-221059-strategy-proposal/proposal.md，证据VLZ6CCT8AQ0A F43T1/T4/T5、F45T5，账本{ledger_id}/silent-0237/0238/0027。源{source}→live合入{merge}，唯一{version}；同方案/已知抽牌/后续牌堆将额外毒触发1→2，固定12/16毒分别33/45，普通牌及其他角色/进阶等价。撤源码5失败2通过、恢复4文件27例，源与合后原沙箱tsc/vitest0；知识路径无重叠，刷新原件保持，无生成器改动。原10宽提案逐项waiting，未知升级/题面审计及预算/SL/目标顺序限制保留，不承诺整场胜率；CLI proposed、shipped交运维核实，完整外部检查交调度器，不推送/不运行play。\n')
notification = f'''\n### {stamp} Codex学习者通知Roy：{version} 静默神化触媒有限实现

- 旧规则：静默A10神化仅八组升级配对，普通触媒的模拟升级未验证，仍仅额外1次；不代表仅持有即已建立。
- 新规则：第九组已观察配对，在已施放神化路径上将普通触媒1转换为升级触媒2，通过同方案、已知抽牌和跨轮牌堆传播；普通牌、无神化和其他角色/进阶保持原行为，未知值/改费/重放/附魔仍未知。
- 证据/账本/任务：VLZ6CCT8AQ0A A10 F43T1施放神化，F43T4实建2/12毒扣33、T5的16毒扣45，F45T5普通动态值1；{ledger_id}/silent-0237/0238/0027，strategy-proposal批次20261009-221053。提案：{OUT / 'proposal.md'}。
- 预期影响：修正已观察触媒升级的候选数值供给，保留所有选项和Jev选择；没有整场胜负反事实，不调药水/SL/终局或预算。原10宽提案继续等待具体缺数据。
- 验证/发布：源{source}，实际live合入{merge}，版本{version}；撤源码5失败2通过/恢复4文件27例，源和合后规定沙箱tsc/vitest0；完整外部由调度器续验。新账本仍proposed，运维核实实际源码祖先和唯一版本后登记shipped。
- 回退：回退源码{source}，恢复原八配对/未知标记；保留全部证据、提案、账本、原失败和上线记录。
'''
scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=notification, text=True, capture_output=True)
(OUT / 'gitleaks-notification.log').write_text(scan.stdout + scan.stderr)
assert scan.returncode == 0
append(ROOT / 'notes/for-dai.md', notification)
append(ROOT / 'ops/inbox-dev.md', notification)

item = json.loads((OUT / 'narrow-proposal-item.json').read_text())
item['implemented_commit'] = source
(OUT / 'narrow-proposal-implemented.json').write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n')
result = subprocess.run([sys.executable, '-B', str(ROOT / 'learner/code_proposals.py'), 'add', '--character', 'silent'],
                        input=json.dumps(item, ensure_ascii=False), text=True, capture_output=True)
(OUT / 'narrow-proposal-cli.log').write_text(result.stdout + result.stderr)
assert result.returncode == 0
proposal_id = result.stdout.strip()
(OUT / 'narrow-proposal-id.txt').write_text(proposal_id + '\n')
change = dict(id=ledger_id, by='learner:strategy-proposal', status='proposed',
              where={'commits': [source, merge], 'proposal': [str(OUT / 'proposal.md')]},
              note=f'有限触媒配对实际live祖先{source}；唯一{version}；代码提案{proposal_id}；shipped由运维核实登记，原10父提案仍waiting。')
(OUT / 'ledger-release-update.json').write_text(json.dumps(change, ensure_ascii=False) + '\n')
result = subprocess.run([sys.executable, '-B', str(ROOT / 'learner/ledger.py'), 'update'],
                        input=json.dumps(change, ensure_ascii=False), text=True, capture_output=True)
(OUT / 'ledger-release-update.log').write_text(result.stdout + result.stderr)
assert result.returncode == 0
git('add', 'paper/materials/decision-log.md', 'eval/versions.json')
patch = subprocess.check_output(['git', '-C', str(LIVE), 'diff', '--cached', '--binary'])
scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner', '--report-format', 'json',
                       '--report-path', str(OUT / 'gitleaks-release.json')], input=patch, capture_output=True)
(OUT / 'gitleaks-release.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
git('diff', '--cached', '--check')
message = 'Record the Silent Apotheosis Accelerant release\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>\n'
(OUT / 'release-commit-message.txt').write_text(message)
git('commit', '--file', str(OUT / 'release-commit-message.txt'))
receipt = dict(source=source, merged=merge, release=git('rev-parse', 'HEAD'), version=version,
               ledger=ledger_id, code_proposal=proposal_id, notified=['notes/for-dai.md', 'ops/inbox-dev.md'],
               shipped=False)
(OUT / 'release.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(receipt, ensure_ascii=False))

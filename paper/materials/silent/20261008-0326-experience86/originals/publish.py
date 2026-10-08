import json
import re
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
source, merged = sys.argv[1:3]
stamp = subprocess.run(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True, capture_output=True, check=True).stdout.strip()
C = json.load(open(O / 'changes.json'))
L = json.load(open(O / 'ledger-result.json'))
mapping = json.load(open(O / 'ledger-map.json'))
p = LIVE / 'eval/versions.json'
versions = json.load(p.open())
number = max(int(m[1]) for v in versions['versions'] if (m := re.fullmatch(r'S1\.exp(\d+)', v['name']))) + 1
name = 'S1.exp'+str(number)
assert not any(v['name'] == name for v in versions['versions'])
versions['versions'].append(dict(name=name, family='Silent', commit=merged, source=f'decision-log {stamp}（源{source}；静默经验2026-10-08.3，第86批RC61MFQM63Y6 A10，增0改15退0，159 active/51598字。能力支付与实结毒、强制弃牌/朝向、临时敏捷/柔嫩/被动挡及赢战耗血分账；范围保持，不新增用药/SL门槛。旧112局七数组逐行一致，源及合后原沙箱0。仅知识前缀，三个strategy-proposal pending。）'))
p.write_text(json.dumps(versions, ensure_ascii=False, indent=2)+'\n')
subprocess.run(['git', '-C', str(LIVE), 'add', '--', 'eval/versions.json'], check=True)
diff = subprocess.run(['git', '-C', str(LIVE), 'diff', '--cached', '--binary'], text=True, capture_output=True, check=True).stdout
scan = subprocess.run(['gitleaks', 'stdin', '--no-banner', '--redact'], input=diff, text=True, capture_output=True)
(O / 'gitleaks-publication.log').write_text(scan.stdout+scan.stderr)
scan.check_returncode()
subprocess.run(['git', '-C', str(LIVE), 'commit', '-m', 'Register Silent experience 2026-10-08.3 deployment', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'], check=True)
publication = subprocess.run(['git', '-C', str(LIVE), 'rev-parse', 'HEAD'], text=True, capture_output=True, check=True).stdout.strip()
line = f'- {stamp[:16]} Codex学习者第86次静默经验实际上线：来源条目'+','.join(C['updated'])+'；证据RC61MFQM63Y6及每条原静默历史证据；账本'+','.join(L['proposed'])+f'；源{source}、合入{merged}、发布{publication}/唯一{name}。旧112局七数组/分档/回血/SL重算一致，增0改15退0，159 active；源和合后原沙箱通过。仅知识前缀，三个独立strategy-proposal pending，无关角色等价；运维据完成事件登记shipped与完整外部补验，学习者不标shipped。\n'
with (ROOT / 'paper/materials/decision-log.md').open('a') as h:
    h.write(line)
notice = f'\n### {stamp} 静默经验 {name} 已上线，通知 Roy／运维\n\n源{source}；实际合入{merged}；发布{publication}；经验2026-10-08.2→2026-10-08.3。以下为知识前缀旧新表述及证据，未把经验上线当源码提案实现。\n\n'
for c in C['entries']:
    a, z = c['before'], c['after']
    fresh = [r for r in z['evidence'] if r not in a['evidence']]
    notice += f'- {c["id"]}：旧规则／表述（n={a["n_support"]}，asc={a["asc"]}）：{a["lesson"]}；新规则／表述（n={z["n_support"]}，asc={z["asc"]}）：{z["lesson"]}；新增证据{",".join(fresh)}；账本{",".join(mapping[c["id"]])}。\n'
notice += '\n任务experience-update/20261008-024302→strategy-proposal；提案'+','.join(json.load(open(O / 'proposal-ids.json')))+'，均pending。预期影响：更准确表达已建能力/强制弃牌后的实际收益、临时敏捷/柔嫩与毒结算/遗物挡、SL及下一房资源，不宣称胜率提高，不新增喝药/留药阈值。回退：以三方逆向方式只恢复本次experience差量到合前原blob并提交新回退版本；保留刷新、所有并行代码/数据、提案与历史，禁止硬重置覆盖后续进展。完整证据、旧新全文及测试见本批report.md/changes.json。\n'
for path in ['notes/for-dai.md', 'ops/inbox-dev.md']:
    with (ROOT / path).open('a') as h:
        h.write(notice)
(O / 'publication.json').write_text(json.dumps(dict(source=source, merged=merged, publication=publication, version=name, ledger=L['proposed']), ensure_ascii=False, indent=2)+'\n')
print(name, publication)

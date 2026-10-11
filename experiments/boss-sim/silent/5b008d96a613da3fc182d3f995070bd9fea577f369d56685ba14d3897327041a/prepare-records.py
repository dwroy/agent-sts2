"""Archive this calibration candidate and append its proposed ledger evidence."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
TASK = HERE.name

def read(name):
    return json.loads((HERE / name).read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'never overwrite old artifacts'
added = read('new-since-live.json')
extraction = read('dataset/extraction.json')
sources = [json.loads(line) for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()]
f49 = [r for r in sources if r.get('floor') == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
report = (generated / 'report.md').read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
sentence = (f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，'
            '仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。')
assert sentence in report
report = report.replace(sentence, f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场；'
                        '数量缺口与失败指标分别报告。每场按实际进场资源评估，未验证 F48→F49 联合通关率。')
report += '''
## 本批固定模型刷新（20261010-221308）

相对实际 live 的上次发布，本次新增 24 次实际 boss 结局，达到 20 次阈值；最高已完局进阶仍为 A10。
213 个已结束 SILENT 局中有 964 次 boss 尝试、388 个可用开场。调参 107 keys 与 UTC 切点
2026-10-06T02:46:11.648000 保持，验证 257→281；模拟成功调参106、验证279，三场各两起点
`board: Error: no solve` 保留为缺预测，不补胜败。调参集残差未触发进阶项，Platt 与上次逐项一致。

上批未发布缓存 366777490334af806a77d8b68928a2d085f8a301181c90ce40fa4acbe64ef237 已逐文件核验，
它的387个开场和回合与本次提取前缀逐项相等，且模型、107调参keys和切点完全相同。
复用其中385场结果，重新回放2场控制与1场新增 LWQYSREHMMJ7 A10 F17 墨影幻灵、初试、10回合实胜；
控制4个起点的输出除耗时外完全相同。模型仍固定7e1193cef9467416bc10c8e344a49f4fd98390c7，
210项模型输入SHA全部验证，seed=1、200样本、原全数据行号种子不变。
指定 refresh-silent.py 命令的首次当前模型全量回放经自身会话中断130，完整提取、局部结果和日志保留；
随后只用固定模型结果经同一入口生成候选，重复内容跳过及更新previous后阈值跳过均已验证，跳过不启动子进程。

全部964条来源限定已完局SILENT；962个可定位开场按states原始offset/len/SHA重新核验，另2条无开场保留排除原因。
SL predicted_death只作为截断尝试留在来源清单，不当实际败局。其余389个含可用开场前的计数口径见提取表，
具体房间数以本报告开头的390个boss房间为准。A0–4与A5–9各0验证，各缺10场独立验证；固定切点不移动补数。
A10 B2/B3残差+5.7/+6.1个百分点；B3整体打穿比1.302略超1.3，逐boss仍逐项使用原四门槛。
F49验证17场（数量缺口0），B2/B3残差+35.7/+30.5个百分点、打穿比2.801/2.941，均保留低可信。
没有证据将F48胜利当通关，也没有验证F48→F49联合通关率。

相对实际live，知识恶魔新增进入B2/B3可信名单；其余可信项保持。候选名单是统计准入，尚未宣称实际发布或实战收益。
当前生产树相对固定模型有69项输入差异（model-changes.json），本批只验证所列固定模型，不能称这些后续变化已经过验证。

定期入口为 agent/tools/boss-sim/refresh-silent.py（传 --previous 当前live静默boss-trust.json）；
ops/learner_jobs.py 的 calibration_job 在调度tick（每小时:13/:43）及学习者完成事件检查。
仅严格已完局SILENT、去重实际won/died事件计数；升阶或新增20次实际boss结局触发，未达阈值无空版本。
缓存复用前必须核相同模型及历史输入；新样本只延伸验证。生成物按内容指纹新增目录，旧报告/数据/失败均保留。

Roy授权角色隔离、固定切分、整体Platt、四项准入与定期刷新架构；样本、胜败、残差及名单来自本角色对局。
复用现有实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36；本批只更新校准数据及报告，
未改变费用/药水/保血/目标/SL阈值，不新增机制或策略代码，code_proposals=[]、implementation_domains=[]。
'''
report = report.replace('其余389个含可用开场前的计数口径见提取表，\n具体房间数以本报告开头的390个boss房间为准。', '390个boss房间的初试/重试分母见本报告开头。')
records = read('new-run-code-provenance.json')
assert not records['missing']
report += '\n## 新验证局实际代码来源\n\n原runs索引版本为current，补核run-config原始offset/len/SHA；dirty只证明提交标识，不能恢复当时完整未提交树。\n\n| 局号 | 时间UTC | 实际启动提交 | dirty |\n|---|---|---|---|\n'
for r in records['records']:
    report += f'| {r["run_id"]} | {r["ts"]} | {r["code"]["commit"]} | {r["code"]["dirty"]} |\n'
first = min(added, key=lambda r: r['first_ts'])
item = {'character': 'silent', 'by': 'learner:fix-batch', 'kind': 'fight',
        'claim': 'Roy授权静默boss固定模型周期刷新：相对live新增24实结局，213完局/964尝试/388可用；107调参和切点/Platt不动，验证257→281（成功279）。B2/B3 Brier 0.1114/0.1127、各7可信；A10残差+5.7/+6.1百分点，F49低可信，低阶各0验证；只验证固定7e1193cef模型，未改策略阈值。',
        'first_run': first['run_id'], 'prior': 'unknown', 'status': 'proposed',
        'prior_note': '统计校准刷新，Roy授权不提供游戏事实，不据此认定理解打法。',
        'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                      'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]}、{r["turns"]}回合、实际{r["outcome"]}；{r["key"]}'} for r in added],
        'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'], 'proposal': [str(HERE / 'report.md')],
                  'changelog': ['paper/materials/silent/boss-sim-calibration.md', f'experiments/boss-sim/silent/{artifact}']},
        'note': f'来源任务{TASK}；包含上批未发布23场缓存及本批1新场，完整来源保持；Roy已授权新功能，非bug-infra；shipped仅由运维核实际发布登记。'}
assert not (HERE / 'ledger-id.txt').exists(), 'do not duplicate ledger registration'
(HERE / 'ledger-proposal.json').write_text(json.dumps(item, ensure_ascii=False, indent=1) + '\n')
(HERE / 'ledger-date.log').write_text(subprocess.check_output(['date'], text=True))
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'add'], input=json.dumps(item, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-add.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
ledger = r.stdout.strip()
assert re.fullmatch(r'silent-\d{4,}', ledger)
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
report += f'\n本批账本 {ledger}（fight/proposed），来源任务{TASK}；实际发布回执在scratch/report.md。\n'
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE / 'report.md').write_text(report + '\n## 发布状态\n\n候选已生成，完整沙箱仍运行；尚未合入live，未登记版本或shipped。\n')
shutil.copytree(generated, archive)
names = ['previous-live-trust.json', 'cached-trust.json', 'cadence-before.json', 'model-changes.json',
         'pinned-input-integrity.json', 'pinned-replay-audit.json', 'control-replay-comparison.json',
         'idempotency-audit.json', 'opening-audit.json', 'model-input-audit.json', 'input-audit-summary.json',
         'first-hit-identifiers.json', 'opening-source-integrity.json', 'new-run-code-provenance.json',
         'initial-interruption.json', 'refresh.log', 'prepare-pinned.py', 'prepare-pinned.log', 'finish-pinned.py',
         'finish-pinned.log', 'finish-pinned.exit', 'prepare-records.py', 'audit-sources.py', 'audit-sources.log',
         'new-fights.json', 'new-since-live.json', 'replay-identifiers.json', 'pinned-replay.log', 'pinned-replay.exit',
         'python-fixed.log', 'python-fixed.exit', 'dispatch-fixed.log', 'dispatch-fixed.exit', 'test-dispatch-fixtures.py',
         'ledger-proposal.json', 'ledger-date.log', 'ledger-add.log', 'ledger-id.txt']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
initial = HERE / read('initial-interruption.json')['artifact']
for src, dst in [('provenance.json', 'initial-provenance.json'), ('backtest.log', 'initial-backtest.log'), ('results/results-0.jsonl', 'initial-results.jsonl')]:
    shutil.copyfile(initial / src, archive / dst)
shutil.copyfile(HERE / 'pinned-results/results-0.jsonl', archive / 'control-and-new-results.jsonl')
shutil.copyfile(ROOT / 'paper/materials/silent/boss-sim-calibration.md', archive / 'candidate-report.md')
shutil.copyfile(PROJECT / '.worktrees/live/paper/materials/silent/boss-sim-calibration.md', archive / 'previous-published-report.md')
shutil.copyfile(PROJECT / 'data/game-data.json', archive / 'game-data-input.json')
(archive / 'README.md').write_text(f'# 静默boss固定模型刷新\n\n任务{TASK}；24新增实际结局，107调参/281验证。completed.json封存生成结果，candidate-report.md补充口径。385场缓存复用、2控制+1新增重放。旧目录保持；原脚本位置为任务scratch，模型/来源/失败全部留存。\n')
print(json.dumps({'artifact': artifact, 'ledger': ledger, 'archive': str(archive)}, ensure_ascii=False))

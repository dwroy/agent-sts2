"""Record the evidence through the ledger CLI and seal the new immutable calibration archive."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
data = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
extraction = json.loads((HERE / 'dataset/extraction.json').read_text())
added = json.loads((HERE / 'new-fights.json').read_text())
artifact = data['refresh']['artifact']
archive = HERE / artifact
target = ROOT / 'experiments/boss-sim/silent' / artifact
assert not target.exists()
coverage = json.loads((HERE / 'source-coverage.json').read_text())
assert coverage['complete'] and coverage['vitest'] == 0
assert (HERE / 'source-supplement.exit').read_text().strip() == '0'
log = (HERE / 'source-sandbox.log').read_text()
files = coverage['unique_files']
cases = coverage['unique_cases']
assert files > 300 and cases > 3000
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'source_log': str(HERE / 'source-sandbox.log'), 'sandbox_workers': 1, 'source_coverage': coverage,
         'python_calibration': {'cases': 12, 'exit': 0}, 'python_dispatch': {'cases': 48, 'exit': 0},
         'live': 'pending locked merge and sandbox check', 'external_full': 'scheduler after publication'}
for label in ('python-calibration', 'python-dispatch', 'audit-sources', 'audit-outcomes', 'audit-versions', 'finish'):
    assert (HERE / (label + '.exit')).read_text().strip() == '0'
(HERE / 'tests-summary.json').write_text(json.dumps(tests, ensure_ascii=False, indent=1) + '\n')
table = {boss: {'name': row['name'], **{use: {**row[start], 'trusted': boss in data['trusted_' + use]}
          for use, start in (('b2', 't1'), ('b3', 'pre'))}} for boss, row in sorted(data['bosses'].items())}
(HERE / 'boss-trust-table.json').write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n')
payload = {'character': 'silent', 'kind': 'fight', 'status': 'proposed', 'by': 'learner:silent-boss-calibration',
           'claim': f'Roy授权静默boss校准刷新：20新实结局只扩固定验证333→353，254完局/1146尝试/460可用；固定107调参keys、切点、模型与Platt不变。B2/B3校准Brier{data["overall"]["t1"]["brier"]}/{data["overall"]["pre"]["brier"]}，原四标准可信{len(data["trusted_b2"])}/{len(data["trusted_b3"])}。F49无新实结局、质量指标仍不达标；低进阶独立验证0，不能外推可靠性。不是bug-infra或新打法规则。',
           'first_run': min(added, key=lambda r: r['first_ts'])['run_id'], 'prior': 'unknown',
           'prior_note': '周期校准实验，未把实际胜利视为预训练或新规则因果收益。',
           'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                         'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]} T1–{r["turns"]} {r["outcome"]}；开场/SL结局/战后帧已核'} for r in added],
           'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'],
                     'proposal': [str(HERE / 'report.md')],
                     'changelog': ['paper/materials/silent/boss-sim-calibration.md']},
           'note': '任务20261013-023515-silent-boss-calibration，Roy授权架构/方法/门槛；误差/可信结论来自静默日志。只proposed，实际发布后shipped由运维确认。'}
(HERE / 'ledger-proposal.json').write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
result = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'add'], input=json.dumps(payload, ensure_ascii=False),
                        text=True, capture_output=True)
(HERE / 'ledger-add.log').write_text(result.stdout + result.stderr)
(HERE / 'ledger-add.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, result.stderr
ledger = result.stdout.strip()
assert re.fullmatch(r'silent-\d{4}', ledger), ledger
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
original = (archive / 'report.md').read_text()
(HERE / 'generated-report.md').write_text(original)
corrected = original.replace('这个数量不足单独验证第二场 boss 的可靠性',
                             '可信性还须通过四项指标，不能只根据场数判断可靠性')
header = f'''# 20261013-023515 静默 boss 校准刷新回执

本批是 Roy 已授权新功能的周期刷新，fix-batch 仅为调度通道。254个已结束SILENT局、1146次boss尝试、460场可用实际结局；685次预测死亡截断和1次缺手牌排除，完整来源/版本/尝试/回合/排除原因附后。相对live新增20实际结局（12胜/8死，11局且全A10），固定验证333→353；107调参keys和UTC切点2026-10-06T02:46:11.648000保持。

固定模型7e1193cef9467416bc10c8e344a49f4fd98390c7及210输入哈希、seed1/200样本保持；历史440场开场/逐回合输入相同，2场历史对照的4个结果除耗时外相同。整体Platt/进阶项选择与previous完全一致，新数据只延伸验证。3场旧模拟失败保留，不补造预测。当前生产候选81个输入不同于固定模型，本批不验证这些变化。

1144个开场来源SHA/偏移/长度/角色核验通过；2个缺开场来源保留排除。20场新增SL实际结束与战后帧一致，终末HP沿提取器取最小已观测值；1146次尝试均有开场前run-config（完整fight-code-provenance.json），只是启动/续跑观测，dirty差分/局中发布未完全还原。

B2/B3成功验证各{data['overall']['t1']['n']}场，Brier={data['overall']['t1']['brier']}/{data['overall']['pre']['brier']}，可信{len(data['trusted_b2'])}/{len(data['trusted_b3'])}；知识恶魔由验证32→34、打穿比1.311/1.315→1.287/1.297，两侧四项全部达标而新增准入；证据L6745E2ND5CT A10 F33尝试2 T1–12胜、0C3AR6J0Z8LD A10 F33尝试1 T1–10胜。无厌沙虫B2退回低可信：验证30→33，Brier0.1265→0.1532，超过新整体0.1158×1.25=0.1448；B3仍因Brier/打穿比失败。新增证据16UDD0430SXT A10 F33尝试1 T1–8胜、47731LKMZRBJ同层尝试1 T1–5死、G4PQBCJQ7NP0同层尝试6 T1–6死。不降低准入门槛或只靠数量判断。逐boss实际场数、还差场数和失败指标见下表。A0–4、A5–9各0独立验证，各仍差10场。A10残差（预测−实际）={data['residuals']['t1']['val']['A10']['gap']:+.3f}/{data['residuals']['pre']['val']['A10']['gap']:+.3f}；打穿比={data['residuals']['t1']['val']['A10']['leak_ratio']}/{data['residuals']['pre']['val']['A10']['leak_ratio']}。

F49本批无新实际结局，现有22实结局/20成功验证，数量差0，质量不达标仍低信度；B2/B3残差+33.0/+28.4百分点、打穿比2.994/3.144。F48胜利不记作整局通关，未验证F48→F49联合通关率。A10攻击数值48项来自A10，TEST_SUBJECT/BIG_POUNCE一项沿固定模型由A9估。

定期入口agent/tools/boss-sim/refresh-silent.py及ops/learner_jobs.py:calibration_job，每小时:13/:43和learner完成事件检查升阶或20新实胜/实死boss结局。此次使用入口的--dataset/--results/--provenance固定输入选项保留已发布实验模型，完整refresh-command.json留档；裸入口使用当前源码，不能冒称它仍是旧模型实验。相同内容直接复用、候选作为previous不足阈值跳过均已验证不启动模拟/拟合且不改输出。后续新样本继续沿本实验固定模型扩验证，模型更新须另记独立实验，不使用验证标签调参。

固定测试：tsc0，原完整沙箱3398过/1导入检查失败（扫描旧临时快照缺依赖），原exit1保留；相同1426个源码/夹具文件的完整隐藏快照仅补该项与未跑paths，12项通过（导入检查另有一次重复执行）。合计{files}文件/{cases}项覆盖齐全，未重跑整套或改断言/排除名单。Python校准12/调度48通过；无真实LLM/play/依赖安装。实际live合入/发布树/版本见本批scratch的result.json，锁内保存刷新、检查重叠/精确叶子预检、source-parent merge及合后自测通过才登记。正式release_id与shipped由运维核实际发布，完整外部检查交调度器；本报告不提前声明已发布。

新内容指纹experiments/boss-sim/silent/{artifact}/；旧目录/报告不覆盖，previous报告和trust随本批留存。账本{ledger}为fight/proposed，仅CLI追加；源码来源提交另经CLI关联。code_proposals=[]、implementation_domains=[]：纯校准数据刷新，无新出牌/药水/SL/终局/结构规则。复用源码cdf75af64fb5b118a5a808ecb3b05e2a05991c36已核为live祖先。Roy提供架构/方法/准入门槛，胜败/误差/名单结论只来自静默日志；策略阈值与铁甲行为/数据保持。

'''
report = header + corrected
(archive / 'report.md').write_text(report)
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE / 'report.md').write_text(report)
names = ['prepare.py', 'finish.py', 'seal.py', 'publish.py', 'previous-trust.json', 'previous-report.md',
         'new-fights.json', 'cadence-before.json', 'reuse-audit.json', 'pinned-input-integrity.json', 'model-changes.json',
         'control-replay-comparison.json', 'idempotency-audit.json', 'opening-audit.json', 'model-input-audit.json',
         'input-audit-summary.json', 'opening-source-integrity.json', 'new-outcome-audit.json', 'fight-code-provenance.json',
         'version-audit-summary.json', 'new-run-code-provenance.json', 'refresh-command.json', 'tests-summary.json',
         'boss-trust-table.json', 'ledger-proposal.json', 'ledger-id.txt', 'ledger-add.log', 'generated-report.md',
         'python-calibration.log', 'python-dispatch.log', 'source-sandbox.log', 'source-supplement.log', 'source-coverage.json', 'source-snapshot-integrity.json', 'isolate-source.py', 'base.txt']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
for path in HERE.glob('*.exit'):
    shutil.copyfile(path, archive / path.name)
shutil.copyfile(PROJECT / 'data/game-data.json', archive / 'game-data-input.json')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
completed = json.loads((archive / 'completed.json').read_text())
completed.update(report_sha256=sha(archive / 'report.md'),
                 files_sha256={p.name: sha(p) for p in archive.iterdir() if p.is_file() and p.name not in ('completed.json', 'audit-manifest.json')})
(archive / 'completed.json').write_text(json.dumps(completed, ensure_ascii=False, indent=1) + '\n')
manifest = {p.name: sha(p) for p in archive.iterdir() if p.is_file() and p.name != 'audit-manifest.json'}
(archive / 'audit-manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
shutil.copytree(archive, target)
assert all(sha(target / name) == value for name, value in manifest.items())
print(json.dumps({'ledger': ledger, 'artifact': artifact, 'files': files, 'cases': cases}, ensure_ascii=False))

"""Record the proposed calibration via CLI and seal the new immutable experiment."""
import collections
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

for label in ('source-supplement', 'python-calibration', 'python-dispatch', 'finish'):
    assert (HERE / (label + '.exit')).read_text().strip() == '0', label
data = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
extraction = json.loads((HERE / 'dataset/extraction.json').read_text())
added = json.loads((HERE / 'new-fights.json').read_text())
audit = json.loads((HERE / 'source-audit-summary.json').read_text())
version_audit = json.loads((HERE / 'version-audit-summary.json').read_text())
assert audit['new_actual_outcomes'] == len(added) == 21
assert version_audit['with_prior_config'] == extraction['attempts']
artifact = data['refresh']['artifact']
archive = HERE / artifact
target = ROOT / 'experiments/boss-sim/silent' / artifact
assert not target.exists()
log = re.sub(r'\x1b\[[0-9;]*m', '', (HERE / 'source-sandbox.log').read_text())
supplement = re.sub(r'\x1b\[[0-9;]*m', '', (HERE / 'source-supplement.log').read_text())
file_counts = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed', supplement)]
case_counts = [int(n) for n in re.findall(r'Tests\s+(\d+) passed', supplement)]
assert len(file_counts) == len(case_counts) == 2
assert file_counts == [2, 3] and case_counts[0] == 5
files = int(re.search(r'Test Files[^\n]*\((\d+)\)', log).group(1)) + 1
cases = int(re.search(r'\bTests[^\n]*\((\d+)\)', log).group(1)) + case_counts[1] - case_counts[0]
coverage = {'complete': True, 'tsc': 0, 'vitest': 0, 'unique_files': files, 'unique_cases': cases,
            'original_raw_exit': 1, 'original_passed_cases': 3484, 'original_failed_cases': 2,
            'supplement_exit': 0, 'supplement_executed_cases': sum(case_counts),
            'scope': 'Same 1513 source/fixture hashes; two missing snapshot dependencies supplied. Failed files and previously unrun paths pass; no assertions/exclusions changed.'}
write('source-coverage.json', coverage)
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'python_calibration': {'exit': 0, 'cases': 12}, 'python_dispatch': {'exit': 0, 'cases': 45},
         'source_log': str(HERE / 'source-sandbox.log'), 'source_coverage': coverage, 'live': 'pending locked merge and sandbox',
         'external_full': 'scheduler after completion event'}
write('tests-summary.json', tests)
table = {boss: {'name': item['name'], **{use: {**item[start], 'trusted': boss in data['trusted_' + use]}
         for use, start in (('b2', 't1'), ('b3', 'pre'))}} for boss, item in sorted(data['bosses'].items())}
write('boss-trust-table.json', table)
changes = {use: {'added': sorted(set(data['trusted_' + use]) - set(previous['trusted_' + use])),
                'removed': sorted(set(previous['trusted_' + use]) - set(data['trusted_' + use]))}
           for use in ('b2', 'b3')}
write('trust-list-changes.json', changes)
questions = [{'claim': '上一批知识恶魔B3通过四项准入、列为可信，打穿比1.297。',
              'finding': '新增独立验证后n=36、打穿比1.306，超过预先固定的1.3上限；场数不足为0，仍必须撤回B3可信。B2打穿比1.281且全部达标。',
              'evidence': ['WCDTYJKUDS4T A10 F33尝试6 T1–7 died', 'D9XJAX5KCSU2 A10 F33尝试1 T1–10 won',
                           '固定107调参keys/原Platt/7e1193cef模型；完整sources/results与逐回合记录随新指纹留存'],
              'knowledge': ['knowledge/characters/silent/boss-trust.json'],
              'recommendation': '按已有授权规则撤回B3可信；保持原阈值与B2结果，继续同模型定期扩验证。实际上线后双通知写入并交ops→watcher→Roy；不代填确认。'}]
write('questions.json', questions)
payload = {'character': 'silent', 'kind': 'fight', 'status': 'proposed', 'by': 'learner:silent-boss-calibration',
           'claim': f'Roy授权静默boss周期校准：21新实际结局仅扩验证353→374；270完局/1193尝试/481可用，107调参keys、切点、固定模型/Platt不变。B2/B3 Brier{data["overall"]["t1"]["brier"]}/{data["overall"]["pre"]["brier"]}，原四标准可信{len(data["trusted_b2"])}/{len(data["trusted_b3"])}。F49质量指标仍失败，低进阶没有独立验证，不能外推可靠性；这是校准数据刷新，不是bug-infra或新打法。',
           'first_run': min(added, key=lambda r: r['first_ts'])['run_id'], 'prior': 'unknown',
           'prior_note': '周期校准实验；没有把胜败或名单变化当作预训练判断或新规则的因果收益。',
           'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                         'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]} T1–{r["turns"]} {r["outcome"]}；开场字节SHA和实际SL胜败事件已核，末帧可早于结算'} for r in added],
           'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'], 'proposal': [str(HERE / 'report.md')],
                     'changelog': ['paper/materials/silent/boss-sim-calibration.md']},
           'note': '任务20261013-161307-silent-boss-calibration；Roy提供架构/方法/门槛，统计结论来自静默日志。仅proposed；实际发布后shipped和正式release_id交运维核实。'}
write('ledger-proposal.json', payload)
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'ledger-date.log').write_text(stamp + '\n')
result = subprocess.run(['nice', '-n', '19', 'python3', str(PROJECT / 'learner/ledger.py'), 'add'],
                        input=json.dumps(payload, ensure_ascii=False), text=True, capture_output=True)
(HERE / 'ledger-add.log').write_text(result.stdout + result.stderr)
(HERE / 'ledger-add.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, result.stderr
ledger = result.stdout.strip()
assert re.fullmatch(r'silent-\d{4}', ledger), ledger
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
f49 = {start: data['stage_metrics'][start]['F49']['val'] for start in ('t1', 'pre')}
residual = {start: data['residuals'][start]['val']['A10'] for start in ('t1', 'pre')}
original = (archive / 'report.md').read_text()
(HERE / 'generated-report.md').write_text(original)
original = original.replace('这个数量不足单独验证第二场boss的可靠性', '数量与质量须分别判断，质量失败仍保持低可信')
original = original.replace('这个数量不足单独验证第二场 boss 的可靠性', '数量与质量须分别判断，质量失败仍保持低可信')
header = f'''# 20261013-161307 静默 boss 校准刷新回执

生成时间：{stamp}。本批是 Roy 已授权新功能的周期刷新，fix-batch 仅为调度通道。实际提取270个已结束SILENT局、1193次boss尝试、481场可用实际结局；711次预测死亡截断和1次缺手牌排除。新增21实结局（16胜/5死，15局且全A10），只扩固定验证353→374，107调参keys及UTC切点2026-10-06T02:46:11.648000保持。同局所有boss和SL尝试同侧；原始来源、局号/boss/进阶/层/尝试/回合/版本/排除原因完整附后。

固定模型7e1193cef9467416bc10c8e344a49f4fd98390c7、210输入SHA、seed1/200样本不变。历史460场及逐回合输入完全相同；重放21新战及2场历史对照，4个对照结果除耗时外相同。整体Platt和进阶项选择与previous完全一致，没有用新验证样本调参。3场历史模拟失败保留。当前候选有88份模型输入与固定实验不同；本表仅验证固定实验模型，不宣称后来生产修改已获相同校准。

1191个开场原始字节SHA/偏移/长度/角色与进阶核验通过；2个缺开场样本保留排除。新增21场实际胜败由冻结SL won/died事件核实；末帧可能早于最终结算，不能要求最后COMBAT帧必有0HP或把预测死亡当已死。完整末帧/事件来源见new-outcome-integrity.json。全部1193次尝试有开场前run-config来源；fight-code-provenance.json给出实际启动/续跑代码，旧dirty树及局中更换仍未完整还原。

B2/B3成功验证各{data['overall']['t1']['n']}/{data['overall']['pre']['n']}场，Brier={data['overall']['t1']['brier']}/{data['overall']['pre']['brier']}，原四标准可信{len(data['trusted_b2'])}/{len(data['trusted_b3'])}。名单变化：{json.dumps(changes, ensure_ascii=False)}。每个boss的实际场数、还差场数、Brier/胜率差/打穿比及失败项见完整表；不降低门槛。A0–4和A5–9各0独立验证，各差10场，只有调参残差。A10残差（预测−实际）={residual['t1']['gap']:+.3f}/{residual['pre']['gap']:+.3f}，打穿比={residual['t1']['leak_ratio']}/{residual['pre']['leak_ratio']}。

本批没有新增F49实际结局；历史22实结局、20成功验证，数量差0，质量失败仍低信度。F49 B2/B3残差={f49['t1']['mean_pred']-f49['t1']['actual_win']:+.3f}/{f49['pre']['mean_pred']-f49['pre']['actual_win']:+.3f}，打穿比={f49['t1']['leak']['enemy_ratio']}/{f49['pre']['leak']['enemy_ratio']}。F48胜利不计作整局通关；未验证F48→F49联合存活率。A10攻击数值48项来自A10，TEST_SUBJECT/BIG_POUNCE一项由固定A9记录估；完整开场/攻击数值来源另存审计文件。

定期入口agent/tools/boss-sim/refresh-silent.py及ops/learner_jobs.py:calibration_job，每小时:13/:43和learner完成事件检查升阶或20新实际boss结局。先沿指定裸入口提取后发现其默认加载当前模型；未发布的当前模型重放exit130和5条部分结果保留在scratch，随后使用已有--dataset/--results/--provenance入口保持固定模型。重复同内容直接复用，候选作previous且不足阈值时跳过；两种幂等检查均不启动模拟/拟合、不改输出。后续继续同模型扩验证，换模型须另存独立实验；旧指纹目录不覆盖。

首轮单worker自测在汇总输出前由本任务中断exit130，不以无输出认定卡死；原记录保留。4-worker完整检查3484过/2失败，均为本任务快照遗漏既有venv路径或已提交账本；补齐同源固定依赖后仅补跑失败文件与未执行paths，全部通过，原exit1保留，完整覆盖见source-coverage.json，不改断言或排除名单。固定自测：tsc0，相同源码/固定夹具的完整隐藏快照（source-snapshot-integrity.json逐文件SHA）内沙箱vitest {tests['files']}文件/{tests['cases']}项通过；Python校准12、调度45通过。沙箱排除由既有脚本固定，完整外部检查交调度器；无真实LLM/play/依赖安装。两个审计脚本初版分别误用外层run_id及小写config角色，原失败日志留存，改按实际日志schema后核验通过，未修改生产源码或日志。

新档案experiments/boss-sim/silent/{artifact}/。账本{ledger}为fight/proposed，仅CLI追加；source提交随后经CLI关联，shipped和正式release_id由运维核实际发布。复用源码cdf75af64fb5b118a5a808ecb3b05e2a05991c36已核实际live祖先；本批仅校准数据/报告，不改费用、药水、保血、目标、SL或出牌规则。code_proposals=[]、implementation_domains=[]。实际合入提交/固定发布树/版本/合后自测见scratch/publication.json，锁内保存刷新、预检且逐blob保留其他角色及并行记录；回退仅本次两叶子与新指纹目录，保留合前刷新和历史档案。Roy提供架构/方法/准入门槛，胜败/残差/可信结论只来自静默对局。

'''
report = header + original
for path in (archive / 'report.md', ROOT / 'paper/materials/silent/boss-sim-calibration.md', HERE / 'report.md'):
    path.write_text(report)
names = ['prepare.py', 'finish.py', 'seal.py', 'publish.py', 'notify-publication.py', 'run-command.py', 'audit-sources.py', 'audit-versions.py',
         'previous-trust.json', 'previous-report.md', 'new-fights.json', 'reuse-audit.json', 'pinned-input-integrity.json',
         'model-changes.json', 'control-replay-comparison.json', 'idempotency-audit.json', 'opening-audit.json', 'questions.json',
         'model-input-audit.json', 'input-audit-summary.json', 'opening-source-integrity.json', 'new-outcome-integrity.json',
         'source-audit-summary.json', 'fight-code-provenance.json', 'version-audit-summary.json', 'instruction-source-manifest.json',
         'initial-refresh-status.json', 'initial-refresh.exit', 'tests-summary.json', 'boss-trust-table.json', 'trust-list-changes.json',
         'ledger-proposal.json', 'ledger-date.log', 'ledger-add.log', 'ledger-add.exit', 'ledger-id.txt', 'refresh-command.json',
         'generated-report.md', 'source-consumer-read.json', 'source-consumer.log', 'source-consumer.exit', 'source-sandbox.initial.log', 'source-sandbox.initial.exit', 'source-sandbox-retry.json', 'source-snapshot-integrity.json', 'source-fixture-supplement.json', 'source-coverage.json', 'isolate-source.py', 'read-consumer.mts', 'audit-sources.initial-failure.log', 'audit-versions.initial-failure.log']
for label in ('source-sandbox', 'source-supplement', 'python-calibration', 'python-dispatch', 'audit-board', 'replay', 'finish', 'audit-sources', 'audit-versions'):
    names += [label + '.log', label + '.exit']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
completed = json.loads((archive / 'completed.json').read_text())
completed['report_sha256'] = sha(archive / 'report.md')
completed['files_sha256'] = {p.name: sha(p) for p in archive.iterdir() if p.is_file() and p.name not in ('completed.json', 'audit-manifest.json')}
(archive / 'completed.json').write_text(json.dumps(completed, indent=1) + '\n')
manifest = {p.name: sha(p) for p in archive.iterdir() if p.is_file() and p.name != 'audit-manifest.json'}
(archive / 'audit-manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
shutil.copytree(archive, target)
print(json.dumps({'artifact': artifact, 'ledger': ledger, 'tests': tests, 'changes': changes}, ensure_ascii=False))

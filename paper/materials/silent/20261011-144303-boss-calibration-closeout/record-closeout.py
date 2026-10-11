"""Record an unchanged calibration candidate and its current publication blocker."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-144303-boss-calibration-closeout'


def read(name):
    return json.loads((HERE / name).read_text())


def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')


for name in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'extract', 'audit-sources', 'verify-identical', 'refresh'):
    assert (HERE / (name + '.exit')).read_text().strip() == '0', name
trust = read('cached-trust.json')
extraction = read('dataset/extraction.json')
state = read('live-release-state.json')
existing = read('existing-live-calibration.json')
assert state.get('pending_merge_head') and state['previous_unchanged'] and not state['merged']
log = (HERE / 'source-sandbox.log').read_text()
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', log)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', log)))
assert files and cases and not re.search(r'(?:Test Files|Tests).*\d+ failed', log)
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
         'idempotency': 0, 'source_integrity': 0,
         'full_external': '未运行；实际发布后交调度器'}
table = []
for boss, data in trust['bosses'].items():
    row = {'boss': boss, 'validation_n': data['t1']['n'], 'missing': data['t1']['missing']}
    for start, use in (('t1', 'b2'), ('pre', 'b3')):
        row[use] = {k: data[start][k] for k in ('brier', 'mean_pred', 'actual_win', 'leak_ratio', 'failed')}
        row[use]['trusted'] = not data[start]['failed']
    table.append(row)
base = (HERE / 'base.txt').read_text().strip()
summary = {'task': 'fix-batch', 'base': base,
           'item': 'Roy 已授权新功能：静默 boss 模拟校准',
           'source_commit': base, 'new_code_commit': None,
           'source_implementation': existing['implementation_commit'],
           'candidate_tree': existing['candidate_tree'],
           'model_commit': trust['source']['simulator_base'],
           'merged': None, 'actual_code_merge': None, 'release_commit': None,
           'release_tree': None, 'version': None,
           'ledger': ['silent-0408'], 'ledger_status': 'proposed',
           'code_proposals': [], 'implementation_domains': [],
           'tests': tests, 'observed_live': state, 'existing_live_calibration': existing,
           'artifact': trust['refresh']['artifact'], 'new_artifact': False,
           'refresh_status': 'identical_artifact_skipped', 'new_since_candidate': 0, 'new_since_live': 45,
           'sample_counts': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'usable_by_asc', 'usable_outcomes', 'exclusions')},
           'split': {k: trust['split'][k] for k in ('cutoff_ts', 'tune_n', 'val_n')},
           'boss_trust': table,
           'a10': {k: v['val']['A10'] for k, v in trust['residuals'].items()},
           'low_ascension': {'A0-4': {'validation_n': 0, 'missing': 10}, 'A5-9': {'validation_n': 0, 'missing': 10}},
           'f49': {k: {'validation_n': v['F49']['val']['n'], 'missing': 0,
                       'mean_pred': v['F49']['val']['mean_pred'], 'actual_win': v['F49']['val']['actual_win'],
                       'leak_ratio': v['F49']['val']['leak']['enemy_ratio'], 'low_confidence': True}
                   for k, v in trust['stage_metrics'].items()},
           'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence': '每小时:13/:43及learner完成事件检查；升阶或新增20次实际boss结局触发。'}
write('precommit-summary.json', summary)
write('boss-trust-table.json', table)
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
blocker = (f"锁内 live={state['initial_live']}，他人 MERGE_HEAD={state['pending_merge_head']}，"
           f"{len(state['conflict_paths'])} 个未解冲突。本批未改 live 的索引、刷新或合并现场。")
receipt = f'''## 20261011-144303 本批幂等核验与发布状态

{timestamp}：本批全量重提取与既有候选逐字节相同；没有新模拟、拟合、模型/策略修改或内容指纹目录。
已结束 SILENT 227局，boss尝试1009次，可用409场（299胜/110死）；SL预测死亡截断599次、
另外1次缺首回合决策帧；三场模拟失败保留，各起点可用调参106/107、验证300/302。
冻结结局切点为2026-10-11T04:48:50.649Z。该结果与上一候选相同，不冒称本批新增45场。
相对实际上线的live基准仍有45个新实际结局，因上一候选未发布而保持due；相对候选为0，
正常入口以identical artifact already complete跳过。用候选作previous的纯幂等测试返回new=0、threshold not reached；
这不改变实际发布触发基准。所有临时产物位于本批scratch。

固定候选源码/数据提交：{base}；候选树：{existing['candidate_tree']}。
既有功能实现：{existing['implementation_commit']}；固定模型：{trust['source']['simulator_base']}，两者均已是live祖先；
候选提交尚非live祖先。107调参keys、UTC切点、整体Platt和模型选择不变，新样本只延伸验证。
本批复用并重新验完整SHA清单的归档：experiments/boss-sim/silent/{trust['refresh']['artifact']}/。
旧目录和报告保持；paper/materials/silent/boss-sim-calibration.md仅追加本批记录。

原入口自测含tsc退出0，vitest {files}文件/{cases}例通过；Python12校准及8调度固定夹具通过。
调度测试包装只为既有fixture补临时工作树目录，不改生产源码、断言、测试入口或排除名单。
本批核210项固定模型输入、409完整开场状态、1007个来源帧offset/len/SHA，2个缺帧来源仍排除。
四项准入逐项重算核对名单，完整归档与当前提取fights/sources/turns/extraction均字节相同；
刷新入口两次幂等分支均未调用子进程模拟/拟合。未重跑旧控制战，不把旧控制日志冒成本批模拟。

B2/B3整体Brier=0.1086/0.1079；A10验证300场，预测−实际=+4.6/+5.1百分点，打穿比1.308/1.316。
逐boss仍有6/6项可信，全部boss验证数量已≥10，数量不足均0；其余由Brier/gap/leak质量指标拒绝。
A0–4和A5–9各0独立验证、各差10场，不把调参样本当验证。F49验证17场、数量差0，
实际胜率5.9%，B2/B3预测41.6%/36.4%、打穿比2.801/2.941，继续低信度；没有验证F48→F49联合通关率。
A10模型48项攻击记录来自A10；TEST_SUBJECT/BIG_POUNCE一项由固定A9记录估算，适用限制保留。
当前生产输入较固定模型有69项变动，本批只验证指定旧模型，不证明当前生产模型等价或策略效果。
Roy的授权涉及架构/校准方法和门槛；表中胜败、残差与准入结论源于静默对局，未引入人写机制。

{blocker}
实际合入、固定发布commit/tree、新eval版本均null；现有live为{existing['existing_live_version']['name']}。
这是合入现场阻塞，无需Roy重新批准。未执行保存刷新/预检/自己的合并或合后测试，
以免破坏他人合并；没有本批合入可回退。解除后仍按原锁内完整流程保存刷新、查重叠、预检、
合入固定源、合后自测，失败只回退自己的合入、保留原刷新，通过才登记唯一版本和双通知。
账本复用silent-0408（fight/proposed），仅经CLI补本批核验与来源，不重复新建发现、不标shipped。
code_proposals=[]、implementation_domains=[]：本批仅幂等工具核验，未改combat/potion/sl/terminal/structure规则。
完整外部检查交实际发布后的调度器；未发布故不造版本或通知规则已上线。

定期入口与事件：agent/tools/boss-sim/refresh-silent.py，ops/learner_jobs.py:calibration_job，
每小时:13/:43及learner完成事件检查；升阶或累计20个新实际boss结局触发，SL截断不计。
来源、完整逐boss可信表/不足场数、提取/切分/拟合/残差报告及全部来源清单如下；
最终记录提交与CLI回执见本scratch/result.json、record-commit.txt、ledger-update.json。

'''
(HERE / 'report.md').write_text(receipt + '\n' + (HERE / 'generated-report.md').read_text())
(HERE / 'handoff-ops.md').write_text(receipt)
with (ROOT / 'paper/materials/silent/boss-sim-calibration.md').open('a') as handle:
    handle.write('\n\n' + receipt)
with (ROOT / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f'\n- {timestamp} Codex学习者 / {HERE.name}：Roy授权静默boss校准定期核验；227完局/1009尝试/409可用与候选{base}逐字节相同，本批新增0、相对live45实际结局。复用指纹{trust["refresh"]["artifact"]}，固定107调参/302验证（成功300）及Platt/模型不变，正常入口幂等跳过、不新拟合/目录/空版本。210模型输入、409完整状态、1007来源帧及四指标核实；tsc/沙箱{files}文件{cases}例、Python12/调度8通过。{blocker} 无本批实际合入/发布树/版本/shipped；沿silent-0408 fight/proposed仅CLI追加核验与来源，不新建游戏发现或代码提案。回执{CLOSEOUT.relative_to(ROOT)}/。\n')
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['precommit-summary.json', 'report.md', 'handoff-ops.md', 'base.txt', 'live-release-state.json',
         'live-status.txt', 'existing-live-calibration.json', 'boss-trust-table.json', 'criteria-audit.json',
         'candidate-input-comparison.json', 'idempotency-audit.json', 'initial-cadence.json', 'cadence-before.json',
         'new-run-code-provenance.json', 'model-changes.json', 'opening-source-integrity.json',
         'refresh-command.json', 'verify-identical.py', 'record-closeout.py', 'check-live.py',
         'test-dispatch-fixtures.py', 'audit-sources.py', 'closeout-date.log']
for stem in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'extract', 'audit-sources', 'verify-identical', 'refresh', 'check-live-initial'):
    names += [stem + '.log', stem + '.exit']
for name in names:
    shutil.copyfile(HERE / name, CLOSEOUT / name)
(CLOSEOUT / 'manifest.json').write_text(json.dumps({p.name: hashlib.sha256(p.read_bytes()).hexdigest()
    for p in sorted(CLOSEOUT.iterdir())}, indent=1) + '\n')
print(json.dumps({'tests': tests, 'closeout': str(CLOSEOUT), 'candidate': base, 'merged': None}, ensure_ascii=False))

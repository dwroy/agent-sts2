"""Seal the validation-only refresh and register its evidence via the ledger CLI."""
import collections
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

data = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
extraction = json.loads((HERE / 'dataset/extraction.json').read_text())
added = json.loads((HERE / 'new-fights.json').read_text())
for label in ('source-supplement', 'python-calibration', 'python-dispatch', 'finish', 'audit-sources', 'audit-versions', 'source-consumer'):
    assert (HERE / (label + '.exit')).read_text().strip() == '0', label
assert len(added) == data['refresh']['new_completed_boss_attempts'] == 21
assert json.loads((HERE / 'version-audit-summary.json').read_text())['with_prior_config'] == extraction['attempts']
tests = json.loads((HERE / 'tests-summary.json').read_text())
assert json.loads((HERE / 'source-coverage.json').read_text())['complete']
artifact = data['refresh']['artifact']
archive = HERE / artifact
target = ROOT / 'experiments/boss-sim/silent' / artifact
assert not target.exists()
table = {boss: {'name': item['name'], **{use: {**item[start], 'trusted': boss in data['trusted_' + use]}
         for use, start in (('b2', 't1'), ('b3', 'pre'))}} for boss, item in sorted(data['bosses'].items())}
write('boss-trust-table.json', table)
changes = {use: {'added': sorted(set(data['trusted_' + use]) - set(previous['trusted_' + use])),
                'removed': sorted(set(previous['trusted_' + use]) - set(data['trusted_' + use]))}
           for use in ('b2', 'b3')}
write('trust-list-changes.json', changes)
questions = [{'claim': '上一批知识恶魔B2通过四指标，36场验证、打穿比1.281，列为可信。',
              'finding': '新增3场独立验证后n=39、打穿比1.325，超过预先固定1.3上限；其余三项通过，数量缺口0仍必须撤回B2可信。B3打穿比1.347，继续低可信。',
              'evidence': ['Y82C2NV7WM2M A10 F33尝试6 T1–6 died',
                           '1269Y20SKHUM A10 F33尝试1 T1–10 won',
                           'EEVP0QTLMSX9 A10 F33尝试1 T1–11 won'],
              'knowledge': ['knowledge/characters/silent/boss-trust.json'],
              'recommendation': '沿既有四标准撤回B2可信；不改门槛或策略，继续同模型扩验证。实际发布后双收件箱通知ops→watcher→Roy，不代填确认。'}]
write('questions.json', questions)
payload = {'character': 'silent', 'kind': 'fight', 'status': 'proposed', 'by': 'learner:silent-boss-calibration',
           'claim': f'Roy授权静默boss周期校准：21新实结局仅扩固定验证374→395；284完局/1245尝试/502可用；107调参keys、切点、固定模型/Platt不变。B2/B3 Brier{data["overall"]["t1"]["brier"]}/{data["overall"]["pre"]["brier"]}，原四标准可信{len(data["trusted_b2"])}/{len(data["trusted_b3"])}。F49质量指标仍失败，低进阶没有独立验证；这是授权新功能数据刷新，不是bug或新打法。',
           'first_run': min(added, key=lambda r: r['first_ts'])['run_id'], 'prior': 'unknown',
           'prior_note': '周期校准；版本、进阶、资源、SL选择共变，不把校准变化当成策略的因果收益。',
           'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                         'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]} T1–{r["turns"]} {r["outcome"]}；开场SHA及实际SL won/died事件已核；末帧可能早于结算'} for r in added],
           'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'], 'proposal': [str(HERE / 'report.md')],
                     'changelog': ['paper/materials/silent/boss-sim-calibration.md']},
           'note': f'任务{HERE.name}；Roy提供架构/方法/门槛，统计结论来自静默日志。仅proposed，shipped和正式release_id交运维核实际发布。'}
write('ledger-proposal.json', payload)
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'ledger-date.log').write_text(stamp + '\n')
result = subprocess.run(['nice', '-n', '19', 'python3', str(PROJECT / 'learner/ledger.py'), 'add'],
                        input=json.dumps(payload, ensure_ascii=False), text=True, capture_output=True)
(HERE / 'ledger-add.log').write_text(result.stdout + result.stderr)
(HERE / 'ledger-add.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, result.stderr
ledger = result.stdout.strip()
assert ledger.startswith('silent-') and '\n' not in ledger
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
f49 = {start: data['stage_metrics'][start]['F49']['val'] for start in ('t1', 'pre')}
a10 = {start: data['residuals'][start]['val']['A10'] for start in ('t1', 'pre')}
audit = json.loads((HERE / 'source-audit-summary.json').read_text())
scope = json.loads((HERE / 'input-audit-summary.json').read_text())
generated = (archive / 'report.md').read_text()
(HERE / 'generated-report.md').write_text(generated)
header = f'''# {HERE.name} 静默 boss 校准刷新回执

生成时间：{stamp}。这是 Roy 已授权新功能的周期刷新，fix-batch 仅为调度通道。提取 {extraction['finished_runs']} 个已结束 SILENT 局、{extraction['attempts']} 次 boss 尝试、{extraction['written']} 场有实际结局且取得开场帧；{sum(v for k,v in extraction['exclusions'].items() if 'predicted_death' in k)} 次预测死亡截断和 1 次缺手牌不进拟合。新增21场（15胜/6死，11局，均A10），只扩固定验证374→395；107调参keys及UTC切点2026-10-06T02:46:11.648000保持。同局所有boss/SL在同侧，完整来源、排除原因和未进入boss的局号在下表及extraction.json。

固定模型 {previous['source']['simulator_base']}、210输入SHA、seed1/200样本保持；历史481场和逐回合输入完全相同，新21战及2场历史对照重放，4个对照结果除耗时外相同。整体Platt及进阶项选择与previous完全一致，没有用新增验证标签调参；历史3场模拟失败保留。当前代码/知识有{len(json.loads((HERE / 'model-changes.json').read_text()))}项固定模型输入不同；本表只验证所列固定实验模型，不声称后续生产模型获得相同校准。

{audit['verified_openings']}个开场原始字节SHA/偏移/长度/角色/进阶核验通过，{audit['excluded_missing_openings']}个缺开场排除。全部1245次尝试具有开场前run-config来源，完整启动/续跑版本见fight-code-provenance.json；旧dirty树及局中代码变化未完整还原。21个新增胜败与冻结SL实际won/died事件一致；5个赢局末战斗帧HP比结算事件低1，沿既有提取器取最小观测HP，并分别保留两值。审计初稿错误要求两值相等的exit1/源码已保留，未修改提取器或原日志，也不从该差异补写机制。

B2/B3成功验证各{data['overall']['t1']['n']}/{data['overall']['pre']['n']}场，Brier={data['overall']['t1']['brier']}/{data['overall']['pre']['brier']}；四指标可信{len(data['trusted_b2'])}/{len(data['trusted_b3'])}，名单变化{json.dumps(changes, ensure_ascii=False)}。逐boss数量缺口及质量失败项完整列出，阈值保持验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3。A0–4和A5–9各0独立验证，各差10场，只有调参残差；A10残差={a10['t1']['gap']:+.3f}/{a10['pre']['gap']:+.3f}，打穿比={a10['t1']['leak_ratio']}/{a10['pre']['leak_ratio']}。

反证：知识恶魔B2由上一批36场/打穿比1.281的可信，变为39场/1.325超标，数量缺口0仍撤回可信；B3为1.347，继续低可信。三个新增证据为Y82C2NV7WM2M F33尝试6 T1–6 died、1269Y20SKHUM F33尝试1 T1–10 won、EEVP0QTLMSX9 F33尝试1 T1–11 won，均A10。完整质疑见questions.json；实际发布后双通知交ops→watcher→Roy，不强行支持旧分类，不代填后续角色确认。

本批无新增F49实结局；历史22实结局、20成功验证，数量缺口0，质量超标仍低可信：B2/B3残差={f49['t1']['mean_pred']-f49['t1']['actual_win']:+.3f}/{f49['pre']['mean_pred']-f49['pre']['actual_win']:+.3f}，打穿比={f49['t1']['leak']['enemy_ratio']}/{f49['pre']['leak']['enemy_ratio']}。F48胜利仅算该战胜利，未评估F48→F49联合通关率。固定A10攻击数值来源{scope['a10_move_damage_asc_sources']}，TEST_SUBJECT/BIG_POUNCE一项取最近A9；开场/逐招来源单列审计，未重拟合boss侧。

指定裸刷新入口已执行并完成提取；其默认加载当前模型，随后在本任务固定模型重放前中断exit130，原不完整档案40c27fcaaff2ce9999582ce29e3574f5305b5bf774cb88fc5625519c41229026及部分结果保留，不发布。后续沿已有--dataset/--results/--provenance入口保持固定实验；同内容完成档案幂等跳过，候选作previous不足阈值时跳过，均无模拟/拟合/输出变动。定期入口agent/tools/boss-sim/refresh-silent.py和ops/learner_jobs.py:calibration_job，每小时:13/:43与learner完成事件检查升阶或20新实际结局；新样本只扩验证，旧指纹目录不覆盖。

固定自测tsc0，沙箱组合覆盖{tests['files']}文件{tests['cases']}项通过，Python校准12及调度45项通过。原4-worker整套377文件3610过/1超时、exit1保持；唯一既有rollout排序不变性题超过原120000ms，只用相同源码/固定夹具/原预算单worker补验通过，并补跑原未执行paths，source-coverage.json给出组合覆盖，不称原完整命令exit0。源码/夹具在scratch完整隐藏快照逐SHA保持，补齐已有venv软链和原已提交账本，未安装依赖或变动断言/排除名单。生产B2/B3已对候选做真实读取探针，证明读取，不证明自然采用或通关改善。完整外部检查交调度器。复用已有源码cdf75af64fb5b118a5a808ecb3b05e2a05991c36（实际live祖先），本批只校准数据/报告，无新源码、打法或费用/药水/保血/目标/SL阈值更改。code_proposals=[]、implementation_domains=[]。新档案experiments/boss-sim/silent/{artifact}/，账本{ledger}为fight/proposed，仅CLI追加；来源提交经CLI补链接，shipped和正式release_id由ops核实际发布后登记。合入/固定发布树/合后测试见本批publication.json；若合后失败，仅撤本次两叶和新实验路径，保留合前刷新与旧档案。

首轮单worker完整自测在仅输出启动横幅时受控中断exit130，日志及相同快照重跑记录保留；不据此认定卡死。随后采用仓库默认4-worker配置执行同一完整沙箱入口，原超时及补验分别保留，所有断言、预算及固定排除名单保持。

Roy提供架构、校准方式和准入门槛；上述样本/胜败/残差/可信结论来自已结束静默对局。boss代码/common数值仅为用户允许复用的固定模型，铁甲样本/Platt/数据不参与，其他角色保持等价。

'''
generated = generated.replace('这个数量不足单独验证第二场boss的可靠性', '质量指标超标，第二场boss仍保持低可信')
generated = generated.replace('这个数量不足单独验证第二场 boss 的可靠性', '数量缺口为0，质量指标超标，第二场 boss 仍保持低可信')
generated = generated.replace('下一次定期重跑固定当时的模型', '后续沿同一固定模型扩验证，模型变更另存独立实验')
report = header + generated
(archive / 'report.md').write_text(report)
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE / 'report.md').write_text(report)
names = ['previous-trust.json', 'previous-report.md', 'pinned-input-integrity.json', 'reuse-audit.json', 'model-changes.json',
         'opening-audit.json', 'model-input-audit.json', 'input-audit-summary.json', 'opening-source-integrity.json',
         'new-outcome-integrity.json', 'source-audit-summary.json', 'fight-code-provenance.json', 'version-audit-summary.json',
         'control-replay-comparison.json', 'idempotency-audit.json', 'boss-trust-table.json', 'trust-list-changes.json',
         'replay.command.json', 'replay.log', 'replay.exit', 'tests-summary.json', 'source-sandbox.log', 'source-sandbox.exit', 'questions.json',
         'python-calibration.log', 'python-calibration.exit', 'python-dispatch.log', 'python-dispatch.exit',
         'source-consumer-read.json', 'source-snapshot-integrity.json', 'ledger-proposal.json', 'ledger-add.log',
         'audit-sources.initial.py', 'audit-sources.initial.log', 'audit-sources.py', 'audit-versions.py', 'prepare.py', 'finish.py',
         'seal-batch.py', 'refresh.exit', 'refresh.log', 'generated-report.md']
names += ['source-sandbox.initial.log', 'source-sandbox.initial.exit', 'source-sandbox-retry.json']
names += ['source-supplement.log', 'source-supplement.exit', 'source-coverage.json', 'source-paths.exit', 'source-rollout-supplement.exit']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
audit_files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in archive.iterdir()
               if p.is_file() and p.name not in ('completed.json', 'audit-manifest.json')}
(archive / 'audit-manifest.json').write_text(json.dumps(audit_files, ensure_ascii=False, indent=1) + '\n')
files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in archive.iterdir() if p.is_file() and p.name != 'completed.json'}
(archive / 'completed.json').write_text(json.dumps({'artifact': artifact, 'trust_sha256': files['boss-trust.json'],
       'report_sha256': files['report.md'], 'files_sha256': files}, ensure_ascii=False, indent=1) + '\n')
shutil.copytree(archive, target)
print(json.dumps({'artifact': artifact, 'ledger': ledger, 'changes': changes}, ensure_ascii=False))

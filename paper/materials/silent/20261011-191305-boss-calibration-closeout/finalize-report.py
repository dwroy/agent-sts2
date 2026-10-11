"""Retain calibration evidence and exact checks without claiming an unobserved release."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-191305-boss-calibration-closeout'


def read(name):
    return json.loads((HERE / name).read_text())


trust = read('candidate-boss-trust.json')
summary = read('candidate-summary.json')
tests = read('tests-summary.json')
assert tests['tsc'] == 0 and tests['vitest'] == 0
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'record-date.log').write_text(timestamp + '\n')
base = (HERE / 'base.txt').read_text().strip()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
header = f'''# 20261011-191305 静默 boss 校准刷新回执

{timestamp}：本批候选与自测完成，实际发布以最后的 live 回执为准。
Roy已授权新功能；task=fix-batch只用于既有调度通道，不是bug-infra。
开工工作树干净；合main时decision-log一处并行追加冲突机械保留双方，合并基线{base}。

233个已结束SILENT局，1040次boss尝试，419场可用（完整逐战及排除列表附后）。
较live S1.boss-calibration11新增55实际结局；较前候选新增1场：NYQW6JAD30K4 A10 F17
瀑布巨兽，第6次尝试，开场55HP，T1–13，SL died/end_hp=0与下一GAME_OVER/HP0双证。
其前5次预测死亡截断不冒充实际败局；最后战斗帧6HP与结算帧0HP分别保留。
原始帧偏移/长度/SHA及run-config版本见new-outcome-audit.json和new-run-code-provenance.json。
新增局run-config记录commit=56268f61928e0330d91293e585efab075839bb4a、code=56268f6+dirty；
生成表中的current标签不能代替该来源，未保存完整dirty差分，不把该局归因于单一干净版本。

固定107调参keys、UTC切点2026-10-06T02:46:11.648000、模型7e1193cef9467416bc10c8e344a49f4fd98390c7、
210输入SHA、seed1/200样本及整体Platt不变。验证257→312，成功310；调参成功106。
三场历史模拟失败（调参1/验证2、共6条起点结果）保留，不补造预测。
原418场输入/逐回合结果前缀相同；两控制战四结果除耗时外完全相同；新增战只进验证。
419完整开场state、1038个来源帧SHA/offset/length/角色核验通过，2个缺开场来源保持排除。
新内容指纹{trust['refresh']['artifact']}，48份封存文件核验通过；旧目录及报告均保留。
两种幂等跳过均验证不启动模拟或拟合：相同档案直接复用；候选作previous时new=0/threshold not reached。
实际生产触发基准仍取live，未把未发布候选冒充已发布。

B2/B3整体Brier=0.1099/0.1086，A10验证310场，残差+5.0/+5.4百分点，打穿比1.293/1.303。
逐boss四指标重算与可信名单一致，可信6/6；全部12个boss数量已≥10、各差0场，失败项见表。
A0–4/A5–9各0独立验证、各差10场。F49实际20/验证18，数量差0；B2/B3预测41.2%/36.2%，
实际5.6%，打穿比2.861/2.979，继续低可信。未验证F48→F49联合通关率。
A10攻击数值48项来自A10，TEST_SUBJECT/BIG_POUNCE一项沿固定A9估值。
只验证原固定模型，不证明当前生产源码/刷新数据变化已被验证；当前工作树70个输入已与原模型不同。
Roy指定的是架构、方法、门槛和刷新方式；这里胜败、残差、名单只来自静默对局，不新增人写机制。

测试：tsc通过；固定沙箱覆盖{tests['files']}文件/{tests['cases']}用例。
原source-sandbox退出{tests['initial_sandbox_exit']}，失败详情原件保留；排序一致性原失败项按原断言/原超时单独复验通过，
其余完整套件结果与原入口paths单fork续验合并核对，不降低门槛、不修改测试或排除名单。
Python校准12、调度8固定夹具通过；不运行真实LLM、play或安装依赖。
完整外部tsc/vitest交实际发布后的调度器；未声称已经运行。
gitleaks原扫描及两处历史证据SHA256误报均保留，重算目标文件哈希确认后仅本次扫描排除精确指纹，未改生产规则。

账本{ledger}只经CLI登记fight/proposed及来源提交；shipped由运维确认实际发布后登记。
code_proposals=[]、implementation_domains=[]：本批纯数据校准刷新，无新策略规则或结构不一致提案。
既有实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36和固定模型已核为实际live祖先；
本批数据源/实际合入/固定发布树/版本分别记result.json，不把原实现误报为本批新代码。

定期入口agent/tools/boss-sim/refresh-silent.py，调度ops/learner_jobs.py:calibration_job；
每小时:13/:43及learner完成事件检查，升阶或累计20次实际boss结局触发；SL截断不计数。
发布按live-merge.lock内等待刷新、保存含新增数据、查重叠、预检、合固定源、合后自测、唯一版本登记执行。
失败保留日志并只回退本批合入，保留原刷新；他人的合并/未提交编辑/锁不能由本批覆盖。

'''
generated = (HERE / 'generated-report.md').read_text()
generated = generated.replace('F49 实际结局 20 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估',
                              'F49 实际结局 20 场，其中验证18场，数量达到门槛但偏差仍不达标，保持低可信。本表只评估')
generated = generated.replace('下一次定期重跑固定当时的模型。', '后续本实验继续固定相同模型；不同模型须另立实验，不与本验证序列混算。')
report = header + generated
(HERE / 'report.md').write_text(report)
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
with (ROOT / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f'\n- {timestamp} Codex学习者 / {HERE.name}：Roy授权静默boss定期校准刷新候选；233完局/1040尝试/419可用，较live55实际结局，107调参/312验证（成功310）、固定模型/Platt/UTC切点不变。新证NYQW6JAD30K4 A10 F17尝试6 T1–13 died并核GAME_OVER/HP0；B2/B3 Brier0.1099/0.1086、可信6/6、A10残差+5.0/+5.4百分点，F49质量及低阶缺样限制保留。原源sandbox exit{tests["initial_sandbox_exit"]}失败日志保留、失败项原断言复验及paths续验通过，总{tests["files"]}文件/{tests["cases"]}例，Python12/调度8通过；账本{ledger}仅fight/proposed。指纹{trust["refresh"]["artifact"]}，实际发布以锁内回执为准，不冒造版本/shipped；回执{CLOSEOUT.relative_to(ROOT)}/。\n')
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['candidate-summary.json','tests-summary.json','report.md','base.txt','commands.md','scope-audit.json',
         'criteria-audit.json','existing-live-calibration.json','main-live-integration-scope.json',
         'source-live-code-differences.json','simulation-failures.json','initial-cadence.json',
         'artifact-integrity.json','candidate-vs-live.json','final-boss-table.json','record-date.log',
         'merge-main-false-positive-proof.json','merge-main-scan-triage.json','sandbox-launch-failure.log',
         'live-release-state-initial.json','finalize-report.py','publish-live.py','test-dispatch-fixtures.py']
for stem in ['source-sandbox','rollout-ranking-recheck','source-paths-continuation','python-fixtures','dispatch-fixtures',
             'merge-main-gitleaks','merge-main-staged-gitleaks','merge-main-verified2-gitleaks','ledger-check']:
    names.extend([stem+'.log',stem+'.exit'])
for name in names:
    shutil.copyfile(HERE / name, CLOSEOUT / name)
(CLOSEOUT/'manifest.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()
    for p in sorted(CLOSEOUT.iterdir())},indent=1)+'\n')
print(json.dumps({'closeout':str(CLOSEOUT),'tests':tests,'ledger':ledger},ensure_ascii=False))

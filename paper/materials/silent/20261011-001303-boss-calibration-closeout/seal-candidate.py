"""Preserve tests and the locked publication check with this candidate."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-001303-boss-calibration-closeout'

def read(name):
    return json.loads((HERE/name).read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in ('source-sandbox','python-fixtures','dispatch-fixtures','finish-pinned','ledger-check','candidate-gitleaks'):
    assert (HERE/f'{name}.exit').read_text().strip() == '0',name
state = read('live-release-state.json')
assert state.get('blocked') and state.get('pending_merge_head') and state['previous_unchanged']
assert state['lock_acquired'] and state['merged'] is None
log = (HERE/'source-sandbox.log').read_text()
files = sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)))
cases = sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
assert files and cases and not re.search(r'(?:Test Files|Tests).*\d+ failed',log)
trust = json.loads((ROOT/'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
extraction = read('dataset/extraction.json')
ledger = (HERE/'ledger-id.txt').read_text().strip()
base = (HERE/'base.txt').read_text().strip()
new = read('new-fights.json')
added = read('new-since-live.json')
reason = (f"锁内live={state['initial_live']}，已有他人MERGE_HEAD={state['pending_merge_head']}、"
          f"{len(state['conflict_paths'])}个冲突。本批未写live、未保存刷新或开始自己的合并预检，保留既有现场；无需Roy再次批准。")
timestamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
(HERE/'closeout-date.log').write_text(timestamp+'\n')
tests = {'tsc':0,'vitest':0,'files':files,'cases':cases,'python':0,'python_cases':12,
         'dispatch':0,'dispatch_cases':8,'control_replays_equal':4,'idempotency':True,
         'gitleaks_candidate':0,'live':None,'external_full':None}
summary = {'task':'fix-batch','base':base,'item':'Roy 已授权新功能：静默 boss 模拟校准',
           'source_implementation':'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
           'source_status':'Precommit evidence; final source and tree in scratch/result.json',
           'merged':None,'actual_code_merge':None,'release_commit':None,'release_tree':None,'version':None,
           'ledger':[ledger],'ledger_status':'proposed','code_proposals':[],'implementation_domains':[],
           'tests':tests,'observed_live':state,'blocker':reason,'artifact':trust['refresh']['artifact'],
           'existing_live_calibration':read('existing-live-calibration.json'),
           'sample_counts':{k:extraction[k] for k in ('finished_runs','attempts','written','usable_by_asc','exclusions')},
           'new_since_live':len(added),'split':{k:trust['split'][k] for k in ('cutoff_ts','tune_n','val_n')},
           'boss_trust':trust['bosses'],
           'a10':{s:trust['residuals'][s]['val']['A10'] for s in ('t1','pre')},
           'f49':{s:trust['stage_metrics'][s]['F49']['val'] for s in ('t1','pre')},
           'refresh_entry':'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence':'每小时:13/:43及learner完成事件检查；升阶或新增20次实际boss结局触发。'}
(HERE/'precommit-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=1)+'\n')
receipt = f'''
## 本批发布检查与测试回执

{timestamp}：候选完成，自测通过，实际尚未发布。{reason}

基线{base}，开工干净、合main为Already up to date；复用实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36已核为live祖先。
本批只刷新静默校准数据；源码提交完成后在scratch/source-commit.txt、result.json及账本CLI补来源。
tsc0、固定沙箱{files}文件{cases}例通过；Python12校准夹具与调度8夹具通过，未调用真实LLM。
两场控制战四起点除耗时外相同；210项模型SHA及967开场来源核验通过；双幂等检查没有模拟/拟合子进程且输出字节不变。
固定模型中A10唯一回退A9的攻击数值是TEST_SUBJECT/BIG_POUNCE：日志值45×1、比例1、来源A9（ratioN=4）；其余48个有伤害定义的招式取A10。所有A10开场HP/首招均取A10记录。此处是复用模型的来源审计，不新增机制规则。
原沙箱排除名单保持。候选gitleaks0，提交前再扫最终暂存内容。完整外部检查交实际合入后的调度器。

实际源码合入、固定发布commit/tree、eval版本均null；{ledger}只登记fight/proposed。
live已有其他会话未完成合并，未执行本批刷新保存、重叠预检、代码合入、合后测试或回退他人工作。
后续须先处理原合并，再锁内保存刷新（含新增文件）、检查重叠、预检、合入固定本批源、合后测试，必要时重建本角色并复测，最后登记唯一版本。
若合后失败须保留日志、只回退本次合入并保留原刷新；shipped由运维核实际后登记。
原报告与候选不覆盖；本次不发布空版本，也不将阻塞描述为待Roy批准。
'''
with (HERE/'report.md').open('a') as handle:
    handle.write(receipt)
with (ROOT/'paper/materials/silent/boss-sim-calibration.md').open('a') as handle:
    handle.write(receipt)
b2,b3 = trust['overall']['t1'],trust['overall']['pre']
a10 = [trust['residuals'][s]['val']['A10']['gap']*100 for s in ('t1','pre')]
with (ROOT/'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f"\n- {timestamp} Codex学习者 / {HERE.name}：Roy已授权静默boss固定模型刷新候选，{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用，较live新增{len(added)}实际结局；107调参/UTC切点/Platt/7e1193cef模型保持，验证{previous['split']['val_n']}→{trust['split']['val_n']}（成功{b2['n']}）。2控制战及U1QYLX1AE1WX A10 F17 T1–12/F33 T1–8新战重放核实；B2/B3 Brier{b2['brier']}/{b3['brier']}、可信{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}，A10残差{a10[0]:+.1f}/{a10[1]:+.1f}百分点；F49仍低可信、低阶各0验证。tsc/固定沙箱{files}文件{cases}例、Python12/调度8例通过；210输入SHA、967开场来源及幂等核验通过。锁内live {state['initial_live']}仍有他人MERGE_HEAD {state['pending_merge_head']}及{len(state['conflict_paths'])}冲突，未写live/未合入/无新版本或shipped；{ledger}仅CLI fight/proposed，来源提交回执见scratch/source-commit.txt。不改策略阈值/其他角色/其他队列；固定指纹{trust['refresh']['artifact']}，测试与阻塞封存{CLOSEOUT.relative_to(ROOT)}/。\n")
(HERE/'handoff-ops.md').write_text(receipt)
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['precommit-summary.json','report.md','base.txt','live-release-state.json','live-status.txt',
         'check-live.py','check-live.log','check-live.exit','existing-live-calibration.json',
         'source-sandbox.log','source-sandbox.exit','python-fixtures.log','python-fixtures.exit',
         'dispatch-fixtures.log','dispatch-fixtures.exit','test-dispatch-fixtures.py',
         'candidate-gitleaks.log','candidate-gitleaks.exit','candidate-gitleaks.json',
         'ledger-check.log','ledger-check.exit','artifact-integrity.json','candidate-vs-live.json',
         'boss-trust-table.json','candidate-scope-audit.json','closeout-date.log','seal-candidate.py','handoff-ops.md','commands.md',
         'commit-and-report.py']
for name in names:
    shutil.copyfile(HERE/name,CLOSEOUT/name)
(CLOSEOUT/'manifest.json').write_text(json.dumps({p.name:sha(p) for p in sorted(CLOSEOUT.iterdir())},indent=1)+'\n')
print(json.dumps({'ledger':ledger,'tests':tests,'closeout':str(CLOSEOUT),'merged':None},ensure_ascii=False))

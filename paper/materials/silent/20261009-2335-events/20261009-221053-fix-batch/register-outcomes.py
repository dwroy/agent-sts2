import fcntl
import json
import os
from pathlib import Path
import subprocess

scratch = Path(__file__).resolve().parent
root = Path('/home/dw/Projects/agent-sts2')
live = root/'.worktrees/live'
release = json.loads((scratch/'release.json').read_text())
merged = (scratch/'live-final.txt').read_text().strip()
subprocess.run(['git','-C',str(live),'merge-base','--is-ancestor',merged,'HEAD'],check=True)
entries = [
 ('silent-0338','RMNXHZKV716Y','proposal-diagnostic.md',
  '仅把已计入的奥利哈钢回合末挡接入来源诊断；F49T2固定回归，数值和动作保持等价。'),
 ('silent-0272','9Z9H2EXKLF3T','proposal-shop-preview.md',
  '仅静默A10商店移除名单的预测/现场契约；F37实际页完整副本不一致时暂停原承诺并依现场重问，不增加删牌偏好。'),
]
ids = []
for ledger,run,markdown,summary in entries:
    item = {'character':'silent','ledger':[ledger],'runs':[run],'source_task':'fix-batch',
            'target_task':'strategy-proposal','domains':['structure'],'summary':summary,
            'proposal':str(scratch/markdown),'rule_changes':False,
            'authorization':'Roy-2026-10-07-learning','implemented_commit':release['commits'][ledger]}
    path = scratch/(ledger+'-proposal-item.json')
    path.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
    output = subprocess.check_output(['python3',str(root/'learner/code_proposals.py'),'add','--character','silent'],
                                    input=json.dumps(item,ensure_ascii=False),text=True).strip()
    ids.append(output)
(scratch/'registered-proposals.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
stamp = os.environ['FIX_BATCH_NOTICE_TS']
commits = release['commits']
message = (f'\n## {stamp} — 离线fix-batch三项实际合入 live {merged} / {release["version"]}\n\n'
           f'- silent-0272，来源任务20261009-221100-fix-batch，源{commits["silent-0272"]}。旧规则：商店尚未打开选牌页，按原牌组前25份预判不可选并拒绝目标；新规则：仅已观察静默A10标明预测，进入移除页核对完整多重集；不同保留原计划/目标/预测与实际名单，暂停承诺并由既有大脑依现场重选，相同按当帧索引执行。证据9Z9H2EXKLF3T/F37/非战斗turn=null，d281240—281242、s287619（REGRET牌组33）/s287620（现场0），账本silent-0272；本批CLI {ids[1]}，原c32b04d610b1f62d来源链保留。预期减少错误不可选事实和过时承诺，未设删牌优先级或胜率承诺；铁甲及未观察进阶原预检查保持。回退：锁内保留刷新数据，revert本独立源提交并追加回退记录/版本，不覆盖经验和原证据。\n'
           f'- silent-0338：旧诊断漏已计入的奥利哈钢挡，新诊断取原同一计算结果列来源；数值/排名/动作等价。证据RMNXHZKV716Y/A10/F49末试T2，d313188/d313190、s321678/s321683/s321684；账本silent-0338，源{commits["silent-0338"]}，本批CLI {ids[0]}。预期诊断解释一致；回退仅revert此源。\n'
           f'- silent-0254：旧统计只从COMBAT决策开战斗窗口，漏F49无决策开场死亡；新统计纳入同局真实状态帧且不造决策，输出实际死亡层与敌ID。证据TXZ6RVMQA09D/A10/F49T1，s281563/s281565/s281566、d275405；账本silent-0254，源{commits["silent-0254"]}。预期后续局报正确归因，不改打法；回退仅revert此源，不回写历史局报。\n'
           f'- 三项各自撤源码失败/恢复通过，各提交前及合后沙箱tsc/vitest0，合后{release["tests"]["files"]}文件{release["tests"]["cases"]}例、另Python3例0、gitleaks0。刷新数据先保存、交集为空；无知识生成脚本更改。完整沙箱外检查由调度器续跑，原失败/初稿保留。账本已CLI追加commit且仅proposed，请运维依据这些实际live祖先与唯一{release["version"]}登记shipped，勿把实现队列状态当shipped。报告{scratch/"report.md"}。其他策略沿原独立提案链，无新增派发、停对局、play、推送或运维prompt更改。\n')
for relative in ('notes/for-dai.md','ops/inbox-dev.md'):
    with (root/relative).open('a') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        handle.write(message)
        handle.flush()
(scratch/'notifications.txt').write_text(message)
print(json.dumps({'code_proposals':ids,'notified':['notes/for-dai.md','ops/inbox-dev.md'],
                  'merged':merged,'version':release['version']},ensure_ascii=False))

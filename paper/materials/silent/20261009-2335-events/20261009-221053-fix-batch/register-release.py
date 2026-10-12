import json
import os
from pathlib import Path
import re
import subprocess

scratch = Path('/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261009-221053/learner/runs/20261009-221100-fix-batch')
live = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
stamp = os.environ['FIX_BATCH_RELEASE_TS']
source = subprocess.check_output(['git', '-C', str(live), 'rev-parse', 'codex-fix-silent-20261009-221053'], text=True).strip()
commits = {'silent-0338': 'c1d84804956bedbd29a7f0e81294114e18415b9d',
           'silent-0254': '3b48088dec5fc6eafe576a1296bbdadde43432ee',
           'silent-0272': source}
for commit in commits.values():
    subprocess.run(['git','-C',str(live),'merge-base','--is-ancestor',commit,'HEAD'],check=True)
log = (scratch/'live-sandbox.log').read_text()
files = sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)))
cases = sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
merge = (scratch/'live-code-merge.txt').read_text().strip()
path = live/'eval/versions.json'
text = path.read_text()
data = json.loads(text)
numbers = [int(match.group(1)) for entry in data['versions']
           if (match := re.fullmatch(r'S1\.fix(\d+)',entry['name']))]
version = 'S1.fix' + str(max(numbers,default=0)+1)
entry = {'name':version,'family':'Silent','commit':merge,
         'source':f'decision-log {stamp}: fix-batch 20261009-221100；silent-0272/源{source}，9Z9H2EXKLF3T A10 F37 turn=null。商店移除预判标为预测，现场完整多重集不一致暂停原承诺并重问；铁甲及未观察进阶保持原预检查。另两纯诊断/统计修复silent-0338/0254不改数值和动作；三项撤源码红/恢复绿，源及合后沙箱tsc/vitest0，合后{files}文件{cases}例，Python3例0；完整沙箱外检查待调度器。'}
end = text.rfind(']')
if end < 0: raise ValueError('version list closing bracket missing')
updated = text[:end].rstrip() + ',\n    ' + json.dumps(entry,ensure_ascii=False) + '\n  ' + text[end:]
json.loads(updated)
path.write_text(updated)
line = (f'- {stamp} fix-batch 20261009-221100实际上线{version}：来源notes/fix-queue-v4.md；'
        f'silent-0338（RMNXHZKV716Y/A10/F49末试T2；源{commits["silent-0338"]}）接已计入的奥利哈钢挡诊断，数值/动作等价；'
        f'silent-0254（TXZ6RVMQA09D/A10/F49T1；源{commits["silent-0254"]}）无决策开场死亡按实际帧归因，保留floor/enemy_ids且不造决策；'
        f'silent-0272（9Z9H2EXKLF3T/A10/F37非战斗turn=null；源{source}）仅静默A10商店移除预测与现场核对，差异回原选牌流程，无新玩法参数。'
        f'合前刷新已保存{(scratch/"live-premerge.txt").read_text().strip()}、路径无重叠，实际源码合入{merge}；'
        f'每项独立提交且撤源码失败/恢复通过，三次提交前及合后沙箱tsc/vitest0，合后{files}文件{cases}例，Python3例0，gitleaks0。'
        f'原失败/初稿和知识刷新保留；其余机制策略沿已有strategy-proposal链，exp100及0332缺触发数据保持待证，未补游戏知识。'
        f'对应账本仅proposed，运维据本实际祖先/唯一版本登记shipped并补完整外部检查；未停对局、未play、未推送。\n')
with (live/'paper/materials/decision-log.md').open('a') as handle:
    handle.write(line)
(scratch/'release.json').write_text(json.dumps({'version':version,'code_merge':merge,'commits':commits,
    'tests':{'tsc':0,'vitest':0,'files':files,'cases':cases,'python_cases':3}},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'version':version,'code_merge':merge,'files':files,'cases':cases},ensure_ascii=False))

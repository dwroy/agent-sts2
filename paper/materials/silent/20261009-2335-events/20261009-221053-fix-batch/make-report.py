import json
from pathlib import Path
import subprocess

scratch = Path(__file__).resolve().parent
release = json.loads((scratch/'release.json').read_text())
merged = (scratch/'live-final.txt').read_text().strip()
proposals = json.loads((scratch/'registered-proposals.json').read_text())
base = '3db9b61ee8145552b083e7b5ace52a6db09f1893'
fixes = [
 {'item':'silent-0338：奥利哈钢回合末格挡诊断漏来源','commit':release['commits']['silent-0338'],
  'test':'agent/tests/end-turn-guard-sources.test.ts','case':'F49 T2: explains the six Orichalcum block already included in the ten-HP loss','fails_without_fix':True},
 {'item':'silent-0254：无决策开场死亡误归上一胜战','commit':release['commits']['silent-0254'],
  'test':'agent/tests/report_death_fight_test.py','case':'ReportDeathFightTest.test_opening_death_without_decisions_is_the_last_fight','fails_without_fix':True},
 {'item':'silent-0272：商店移除预判误报现场可选牌','commit':release['commits']['silent-0272'],
  'test':'agent/tests/shop-removal-preview.test.ts','case':'F37: pauses the original commitment and preserves both lists when the real page differs','fails_without_fix':True},
]
strategies = {
 'silent-0250':'SL自爆占位残血排序','silent-0256':'狡诈药水生成','silent-0260':'紧勒逐牌失血',
 'silent-0263':'背击取整','silent-0266':'SL首牌身份','silent-0268':'生存者单弃','silent-0271':'毒胜保血候选',
 'silent-0273':'死亡段接续','silent-0279':'升级改标抽序','silent-0287':'联合伤害上界',
 'silent-0290':'战斗专注禁抽','silent-0291':'苦无新敏捷','silent-0293':'螺线飞镖敏捷',
 'silent-0295':'随机施毒确定性','silent-0296':'逃脱计划抽牌条件挡','silent-0297':'凋萎可见牌堆缓存',
 'silent-0300':'全弃重抽入口','silent-0308':'单行动沙坑截止','silent-0311':'库存恢复血上限',
 'silent-0317':'升级计算下注','silent-0319':'升级蛇咬','silent-0320':'同线坚定不移',
 'silent-0322':'升级神化','silent-0324':'刀刃之舞生成','silent-0329':'饮药临时力量',
 'silent-0334':'升级隐秘匕首','silent-0339':'复活误核销','silent-0344':'坚韧之环延迟挡',
 'silent-0347':'组装师召唤','silent-0349':'虚弱下临时减力取整',
}
skipped = [{'item':f'{key}：{title}','reason':'策略类；沿已有独立 strategy-proposal 实现链，保留原行为和证据边界，不重复派发。'}
           for key,title in strategies.items()]
skipped += [
 {'item':'S1.exp100：rollout addedSomewhere 断言失败','reason':'证据不足：原失败时的冻结模型/触发条件未取得；当前定向1例及完整沙箱通过仅是核查，不登记已修，原完整exit1保留。'},
 {'item':'silent-0332：双boss接续资源契约异常','reason':'证据不足：缺触发seed与首战末帧，无法隔离资源缺失/非正HP；不吞异常造模拟数字，沿原提案等待核实。'},
 {'item':'校准154302有限结束报告/补验交接','reason':'太大：涉及已注册batch/worktree、源码祖先、固定发布、迟到及独立回执契约；原124/out/err/failed和未完成外部补验保留，未只放宽JSON读取。'},
 {'item':'arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression','reason':'太大：独立架构与归因任务，本普通纯bug批次不混入。'},
 {'item':'B4/B5、性能实测、codex-brain-cache及probe-home续办','reason':'太大：队列明确指定独立功能/受控实验批次，离线普通fix不调用模型或网络。'},
]
already = [
 ('silent-0237：普通神化','772b839f8ada31664cb764ea9ad3bdb03da27f64'),
 ('silent-0246：子弹时间','a6ed582e8c26e1cc7d51fd21459d1c46481bfa10'),
 ('silent-0245：懒惰防御重放','790b76d00dc23dedb970cb82a00cb3db6ff1cbb7'),
 ('legacy脑helper note','ccd8bb8e017da9c30b408138d04e6d2bc985836d'),
 ('usage旧断言regex','1cf0490492bd8a430b85f95f3fdee91eba251191'),
 ('SL固定时钟夹具','3d6340e00f3ca05dd526012ccede35268b65eda8'),
 ('rollout固定时钟夹具','955941fa54e7787576baa47e0669308284f89543'),
 ('生产rollout单调截止','9889436c3b332a3984cdb7f850a1349f464182d1'),
 ('完成报告裸JSON','6f86ff6b6b971fb38b96308ebdd34dec574e5b13'),
 ('安全autoplay热交接','1bea40ab96d2b1ace8d5461a92984aec180110c5'),
 ('隔离任务入口/status误判/大会话日志','e04cffa915cfa0b2120f1e087efc0627dae9ad2e'),
]
report = {'task':'fix-batch','base':base,'fixes':[{k:v for k,v in f.items() if k!='case'} for f in fixes],
          'skipped':skipped,'merged':merged,'tests':{k:release['tests'][k] for k in ('tsc','vitest','cases')},
          'code_proposals':proposals,'implementation_domains':['structure'],'report':str(scratch/'report.md')}
evidence = {'silent-0338':'RMNXHZKV716Y/F49/末试T2，账本silent-0338',
            'silent-0254':'TXZ6RVMQA09D/F49/开场T1，账本silent-0254',
            'silent-0272':'9Z9H2EXKLF3T/F37/非战斗turn=null，账本silent-0272'}
lines = ['## 修 bug 回报','',f'- 合并基线：main → {base}']
for f in fixes:
    detail=evidence[f['item'].split('：')[0]]
    lines.append(f'- 修复（每条一行）：{f["item"]}（{detail}） — {f["commit"]} — 测试 {f["test"]}:{f["case"]} — 去掉修复时失败：是')
for item,commit in already:
    lines.append(f'- 已被别人修掉的：{item} — {commit}')
for item in skipped:
    lines.append(f'- 没修的：{item["item"]} — {item["reason"]}')
lines += [f'- 测试：tsc 退出码 0；vitest {release["tests"]["files"]} 文件 / {release["tests"]["cases"]} 用例 / 退出码 0；三个提交前与合后各跑完整沙箱。额外Python 3例通过。重跑component-usage.test.ts、shop-potions.test.ts、shop-removal-preview.test.ts：补既有venv软链、固定检查期间变动的源码/测试、修正夹具初始化后通过，早期失败保留；没有超时用例靠重跑登记成功。沙箱外完整套件待调度器。',
          f'- 合入：{merged}（{release["version"]}）','- 需要 Dai 定的事：无','',
          '```json',json.dumps(report,ensure_ascii=False,indent=2),'```','',
          '证据与审计记录：','',
          '- silent-0338：RMNXHZKV716Y / A10 / F49末试T2，d313188/d313190、s321678/s321683/s321684；同一既有计算结果接诊断，数值与动作等价。撤源码1失败/2通过，恢复3通过。',
          '- silent-0254：TXZ6RVMQA09D / A10 / F49开场T1，s281563奖励4血、s281565实验体111血/玩家4血、s281566玩家0血，d275405终局且本场无COMBAT决策。撤源码1失败/1错误/1通过，恢复3通过。',
          '- silent-0272：9Z9H2EXKLF3T / A10 / F37非战斗turn=null，d281240/281241/281242，s287619牌组索引33、s287620现场索引0。撤四个源码4失败/3通过，恢复7通过。无牌优先级、玩法参数或未观察进阶泛化。',
          '- 上述证据原始日志按偏移/索引逐对象核验；0254/0272核验保存在evidence-verification.json，测试均为固定输入，不读刷新知识、不调用真实LLM。原红绿/失败/初稿全部保留。',
          '- 早期0338-sandbox.log与batch-precommit-1.log的失败涉及venv路径和边跑边改导致的模块缓存混用；final-focused.log工作目录错误也保留。补本树data/logdb-venv软链并固定源码后，0338-precommit-final.log、0254-precommit.log、0272-precommit.log及live-sandbox.log均通过。未加排除、未提高生产预算、未安装依赖。',
          '- 合前刷新和路径交集见live-overlap.json；现场生成的notes/fight-value-backtest-silent.md不在本分支改动中且按指定stage范围保留。没有修改知识生成脚本，不重建数据。',
          f'- 源码合并 {release["code_merge"]}，最终发布 {merged}；根notes/for-dai.md及ops/inbox-dev.md已追加双通知，账本仅proposed，实际shipped由运维登记。',
          '- 策略条目不因人定规则需要审批而推回Dai：已有Roy授权，但本普通批次不混入独立策略实现；原提案链保留，不派下级agent。早期V4历史项沿队列已有关闭记录，不重复实施。',
          '- 本分支只含三项独立源码提交；主检出/main不改代码，不推送、不play、不停对局、不改运维prompt。',
          ]
(scratch/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(scratch/'report.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'report':report['report'],'merged':merged,'version':release['version'],'fixes':len(fixes)},ensure_ascii=False))

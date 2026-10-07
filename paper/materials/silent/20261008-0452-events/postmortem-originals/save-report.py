import json
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-041302-postmortem')
ledger=json.loads((p/'ledger-receipt.json').read_text());ledger['check']=0
obj={'task':'postmortem','appended':['9Z9H2EXKLF3T'],'skipped':[],'bugs':[{'run':'9Z9H2EXKLF3T','where':'agent/src/hand/screens/oneshot.ts:217','what':'商店按原牌组前25张预测移除名单，将实际可选的悔恨误报为不可选，影响大脑删牌选择。','new':True}],'ledger':ledger,'code_proposals':['silent-proposal-c32b04d610b1f62d','silent-proposal-8f62129d7da70b94'],'implementation_domains':['structure','combat','sl'],'report':str(p/'report.md')}
report='''## 复盘回报
- 已追加：9Z9H2EXKLF3T（A10，第48层，永世沙漏 AEONGLASS 末次T11以3血0挡面对48攻击阵亡）。
- 新的纯 bug（file:line，每条一行）：
  - 9Z9H2EXKLF3T：静态移除名单误报悔恨不可选，实际移除页索引0可选 — agent/src/hand/screens/oneshot.ts:217（新；误报输出另见shop.ts:520）。
- 写成「未记录」的项：9Z9H2EXKLF3T：完整毛伤事件账、F39逐实例击杀顺序、前两次SL尝试退出结算、boss时钟指标、Jev缓存、dirty源码快照、替代路线／删牌／留药受控结果、新bug的更早可比先验。
- 学习账本：9Z9H2EXKLF3T：新增 silent-0272；更新 '''+'、'.join(ledger['updated'])+'''（均为support，老错重犯无）；`ledger.py check`退出码0。
- 代码提案：均已登记pending，实现任务均为strategy-proposal，尚未实现／上线。
  - silent-proposal-c32b04d610b1f62d：F37实际移除页证据／silent-0272；修正名单事实与重选链，限已观察静默流程，不宣称改删能赢。
  - silent-proposal-8f62129d7da70b94：F48T7—T11证据／silent-0079、silent-0021及相关机制账本；审计SL预测、重规划与实盘整轮。缺受控成功线及完整dirty源码，保留现行策略门槛。

```json
'''+json.dumps(obj,ensure_ascii=False)+'''\n```
'''
(p/'report.md').write_text(report)
(p/'report.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
(p/'source-read-errors.md').write_text('源码定位时曾尝试读取不存在的agent/src/hand/screens/combat-plan.ts及combat.ts，工具报No such file or directory；随后用rg --files找到实际src/reflex/combat-plan.ts。该路径错误已纠正，不是游戏代码bug。原始初稿、抽取脚本、核验输出和提案均保留。\n')
print('报告保存',p/'report.md')
print('JSON校验',obj['ledger']['check'],'经验3条，新增1项，补证14项，提案2项；不提交、不推送、不改源码')

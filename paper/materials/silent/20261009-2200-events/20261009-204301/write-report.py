import json,pathlib,hashlib
p=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-204303-postmortem');ids=['silent-proposal-43156dee9f23ae43','silent-proposal-4215d1a68ed970e6'];registered=[]
with pathlib.Path('/home/dw/Projects/agent-sts2/paper/materials/learning/code-proposals.jsonl').open() as f:
 for line in f:
  if any(i in line for i in ids):registered.append(json.loads(line))
assert all(any(row.get('id')==i for row in registered) for i in ids)
(p/'proposal-registration.json').write_text(json.dumps(registered,ensure_ascii=False,indent=2)+'\n')
report={'task':'postmortem','appended':['54G5683J0E5S'],'skipped':[],'bugs':[{'run':'54G5683J0E5S','where':'agent/src/reflex/rollout-live.ts:831','what':'组装师攻击召唤未接入五回合推演；活体召唤只读ILLUSION_MOVE','new':True}],'ledger':{'added':['silent-0347','silent-0348'],'updated':['silent-0020','silent-0125','silent-0005','silent-0013','silent-0046','silent-0233','silent-0162','silent-0312','silent-0259'],'repeats':[],'check':0},'code_proposals':ids,'implementation_domains':['combat','potion'],'report':str(p/'report.md')}
text='''## 复盘回报
- 已追加：54G5683J0E5S（A10，第44层，组装师及机器人战T3以21血8挡面对毒杀后32攻击阵亡）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 54G5683J0E5S：组装师攻击召唤未接入五回合推演 — agent/src/reflex/rollout-live.ts:831（新；账本silent-0347）。
- 写成「未记录」的项：54G5683J0E5S：完整dirty源码／知识快照、缺帧的逐只伤害及内部结算、原线与替线路径的整场反事实、三幕boss时钟需要／估计和实打、真实总费用。
- 学习账本：54G5683J0E5S：新增silent-0347、silent-0348；更新silent-0020、silent-0125、silent-0005、silent-0013、silent-0046、silent-0233、silent-0162、silent-0312、silent-0259（均支持；老错repeat无）；ledger.py check退出码0。
- 代码提案：silent-proposal-43156dee9f23ae43（F44T1—T3／0347、0348／召唤接线）；silent-proposal-4215d1a68ed970e6（F42T6及F42→F44资源链／0020、0125／护栏与药水验证）。两项均关联strategy-proposal、未实现；召唤分布及原线整场证据不足，保留原规则等待验证。
'''
(p/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');(p/'report.md').write_text(text+'\n```json\n'+json.dumps(report,ensure_ascii=False)+'\n```\n');print('报告已保存，提案登记已核实。')

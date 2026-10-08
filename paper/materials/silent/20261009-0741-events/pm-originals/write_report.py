import json,hashlib
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-071302-postmortem'
ids=[(p/f'{x}.out').read_text().strip() for x in ('proposal-combat-terminal','proposal-sl-tradeoff')]
check=int((p/'ledger-check.exit').read_text());assert check==0
seen={}
with (root/'paper/materials/learning/code-proposals.jsonl').open() as f:
 for line in f:
  try:r=json.loads(line)
  except ValueError:continue
  if r.get('id') in ids and r.get('op')=='add':seen[r['id']]=r
assert set(seen)==set(ids)
for ident,row in seen.items():
 assert row['character']=='silent' and row['runs']==['CSLHFCBSC1UM']
 assert row['target_task']=='strategy-proposal' and row['source_task']=='postmortem'
 assert row['state']=='pending' and 'implemented_commit' not in row
 assert hashlib.sha256(Path(row['proposal']).read_bytes()).hexdigest()==row['proposal_sha256']
updated=['silent-0019','silent-0030','silent-0079','silent-0020','silent-0021','silent-0200','silent-0235']
report={"task":"postmortem","appended":["CSLHFCBSC1UM"],"skipped":[],"bugs":[],"ledger":{"added":[],"updated":updated,"repeats":["silent-0079"],"check":check},"code_proposals":ids,"implementation_domains":["combat","sl","terminal"],"report":str(p/'report.md')}
body='''## 复盘回报
- 已追加：CSLHFCBSC1UM（A10，第17层，族母末试T10以10血6挡对25攻击阵亡，毒结算后敌剩56血）。
- 新的纯 bug：
  - 无。
- 写成「未记录」的项：CSLHFCBSC1UM：完整dirty源码、前五试最终结算／退出HP、逐击毛伤及部分归零帧、实际执行最优比例、原线／留药／换线／构筑的受控胜负、路线误差完整归因、后续幕资源、boss时钟比值、Jev缓存及双方实际费用。
- 学习账本：CSLHFCBSC1UM：新增无；更新silent-0019、silent-0030、silent-0079、silent-0020、silent-0021、silent-0200、silent-0235（老错silent-0079）；`ledger.py check`退出码0。
- 代码提案：{combat}（F17负属性／毒终局，账本0030／0021／0200／0235）；{sl}（F17T2／T3换线血价，账本0079）。均关联独立strategy-proposal；证据不足以改规则，维持原行为，未标implemented／shipped。追加后数字复核通过，无勘误。
'''.format(combat=ids[0],sl=ids[1])
(p/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(p/'report.md').write_text(body+'\n```json\n'+json.dumps(report,ensure_ascii=False)+'\n```\n')
(p/'proposal-registration-checked.json').write_text(json.dumps({'核实CLI':ids,'SHA一致':True,'来源任务':'postmortem','实现任务':'strategy-proposal','状态':'pending'},ensure_ascii=False,indent=2)+'\n')
print(body)
print(json.dumps(report,ensure_ascii=False))

import json,hashlib,pathlib
p=pathlib.Path('learner/runs/20261009-011302-postmortem')
added=['silent-0317','silent-0318']
updated=['silent-0297','silent-0079','silent-0228','silent-0005','silent-0046','silent-0024','silent-0027','silent-0173','silent-0067','silent-0183','silent-0011','silent-0276','silent-0260','silent-0261']
repeats=['silent-0297','silent-0079']
names=['gamble-upgrade','wither-visible','saturated-setup','strangle-upgrade']
ids=[(p/f'proposal-{n}-receipt.txt').read_text().strip() for n in names]
entries=json.loads((p/'ledger-final.json').read_text())
assert {e['id'] for e in entries}==set(added+updated)
assert int((p/'ledger-check-exit.txt').read_text())==0
for e in entries:
 assert 'HEMND3SMQYB8' in e.get('where',{}).get('lessons',[])
 assert any(v.get('run')=='HEMND3SMQYB8' for v in e.get('evidence',[]))
seen={}
with open('paper/materials/learning/code-proposals.jsonl') as f:
 for line in f:
  if not any(i in line for i in ids): continue
  v=json.loads(line)
  if v.get('op')=='add' and v.get('id') in ids: seen[v['id']]=v
assert set(seen)==set(ids)
for i in ids:
 v=seen[i]; assert v['character']=='silent' and v['runs']==['HEMND3SMQYB8'] and v['target_task']=='strategy-proposal'
 assert v['state']=='pending' and v['domains']==['combat']
 assert hashlib.sha256(pathlib.Path(v['proposal']).read_bytes()).hexdigest()==v['proposal_sha256']
 for lid in v['ledger']:
  e=next(e for e in entries if e['id']==lid)
  assert v['proposal'] in e.get('where',{}).get('proposal',[])
result={'task':'postmortem','appended':['HEMND3SMQYB8'],'skipped':[],
'bugs':[{'run':'HEMND3SMQYB8','where':'agent/src/reflex/card-model.ts:920','what':'升级计算下注未接入全弃重抽，方案保留已弃手牌','new':True}],
'ledger':{'added':added,'updated':updated,'repeats':repeats,'check':0},'code_proposals':ids,'implementation_domains':['combat'],
'report':'/home/dw/Projects/agent-sts2/learner/runs/20261009-011302-postmortem/report.md'}
body=f'''## 复盘回报

- 已追加：HEMND3SMQYB8（A10，第49层，女王 QUEEN／火炬头聚合体 TORCH_HEAD_AMALGAM，末试T4以1血11挡对19攻击阵亡）。
- 新的纯 bug（file:line，每条一行）：
  - HEMND3SMQYB8：计算下注+未接入全弃重抽，推演保留已弃手牌 — agent/src/reflex/card-model.ts:920（新）。
- 写成「未记录」的项：HEMND3SMQYB8：完整dirty源码；部分完整毛伤、重复敌体身份与末击帧；前五次SL的退出结算；替代出牌／用药整场胜线；实际执行最优比例；F49投影HP及boss时钟；Jev缓存命中、实际费用；末轮预测损7与实需损8的根因。
- 学习账本：HEMND3SMQYB8：新增 {', '.join(added)}；更新 {', '.join(updated)}（老错 silent-0297、silent-0079）；`ledger.py check` 退出码0。
- 代码提案：全部交 `strategy-proposal`，状态pending：
  - {ids[0]}：F48T3／F49T1，账本0317、0318，补计算下注+全弃分支。
  - {ids[1]}：F48T4，账本0297、0024，同步可见凋萎6伤。
  - {ids[2]}：F49T3，账本0079、0011，核能力兑现窗口及6HP血价；调权须固定对照，当前不足以证明替代线能赢。
  - {ids[3]}：F48T3，账本0260、0261，给既有紧勒待办补升级触发证据，不重复登记新bug。
'''
encoded=json.dumps(result,ensure_ascii=False)
(p/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(p/'report.md').write_text(body+'\n```json\n'+encoded+'\n```\n')
(p/'ledger-final-summary.json').write_text(json.dumps([{'id':e['id'],'kind':e['kind'],'status':e['status'],'run_evidence':len([v for v in e['evidence'] if v.get('run')=='HEMND3SMQYB8'])} for e in entries],ensure_ascii=False,indent=2)+'\n')
print('回报已保存；16条账本关联及4份提案指纹、pending状态全部核对通过。')
print(p/'report.md')

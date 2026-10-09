import json,hashlib,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-191302-postmortem');root=Path('/home/dw/Projects/agent-sts2')
ids=[(p/(s+'-cli.out')).read_text().strip() for s in ['combat-budget','hp-guard-tradeoffs','potion-resource-chain']]
assert all(re.fullmatch(r'silent-proposal-[a-f0-9]{16}',i) for i in ids)
found={}
with (root/'paper/materials/learning/code-proposals.jsonl').open() as src:
 for line in src:
  if any(i in line for i in ids):
   d=json.loads(line)
   if d.get('op')=='add' and d.get('id') in ids:found[d['id']]=d
assert set(found)==set(ids)
for i,v in found.items():
 assert v['character']=='silent' and v['runs']==['HNX4A2WBC34W'] and v['target_task']=='strategy-proposal'
 assert 'implemented_commit' not in v
 assert hashlib.sha256(Path(v['proposal']).read_bytes()).hexdigest()==v['proposal_sha256']
check=int((p/'ledger-check.rc').read_text());assert check==0
updated=[x['id'] for x in map(json.loads,(p/'ledger-updates.jsonl').read_text().splitlines())]
after=json.loads((p/'ledger-after.json').read_text());assert set(updated)<=set(d['id'] for d in after)
assert all(e['role']=='support' for d in after for e in d['evidence'] if e['run']=='HNX4A2WBC34W')
for d in after:
 for i,v in found.items():
  if d['id'] in v['ledger']:assert v['proposal'] in d['where']['proposal']
report={'task':'postmortem','appended':['HNX4A2WBC34W'],'skipped':[],'bugs':[],'ledger':{'added':[],'updated':updated,'repeats':[],'check':check},'code_proposals':ids,'implementation_domains':['combat','potion'],'report':str(p/'report.md')}
unknown='dirty完整运行源码；三次判死出口及五场获胜的敌归零中间帧；逐击毛伤、过量、总格挡与真实未裁剪末轮失血／先后；T8预计损30与末帧预算32的差额归因；完整最优方案执行率及同ID永久实体击杀次序；未执行的护栏／药时／构筑／路线／休息反事实；F49资源与身份；旧boss时钟两比值；Jev缓存及实际费用。'
text='## 复盘回报\n\n'
text+='- 已追加：HNX4A2WBC34W（A10，第48层，永世沙漏 AEONGLASS 末次T8以2血17挡对40攻击及9伤凋萎阵亡，敌剩130/535）。\n'
text+='- 新的纯 bug：\n  - 无。\n'
text+='- 写成「未记录」的项：HNX4A2WBC34W：'+unknown+'\n'
text+='- 学习账本：HNX4A2WBC34W：新增无；更新 '+ '、'.join(updated)+'；老错重犯无，均为支持证据；`ledger.py check`退出码0。\n'
text+='- 代码提案（均关联本局证据、账本及独立`strategy-proposal`实现任务，已登记，未实现）：\n'
text+=f'  - {ids[0]}：F48T7—T8完整血量预算，关联silent-0024／0023／0027／0011／0005；2点预算差额尚未归因。\n'
text+=f'  - {ids[1]}：F14T4、F33T3／T5护栏取舍，关联silent-0125；缺同资源整场反事实，保持参数。\n'
text+=f'  - {ids[2]}：F33药时与全局药栏链，关联silent-0253／0005／0020；药时和其他行动共同变化，不制定饮药／留药门槛。\n\n'
text+='```json\n'+json.dumps(report,ensure_ascii=False)+'\n```\n'
(p/'report.md').write_text(text);(p/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(p/'proposal-verification.json').write_text(json.dumps({'ids':ids,'sha_and_ledger_links':'通过','implementation_claim':False},ensure_ascii=False,indent=2)+'\n')
print(text)

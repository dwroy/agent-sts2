import hashlib,json,importlib.util
from pathlib import Path
ROOT=Path('/home/dw/Projects/agent-sts2');P=ROOT/'learner/runs/20261008-204302-postmortem';updated=['silent-0209','silent-0030','silent-0079','silent-0125','silent-0211','silent-0158','silent-0005','silent-0277','silent-0020']
proposal_ids=[(P/('proposal-'+s+'.cli.txt')).read_text().strip() for s in ['combat-facts','sl-tradeoff','potion-timing']]
report={'task':'postmortem','appended':['2H311EAD34GD'],'skipped':[],'bugs':[],'ledger':{'added':[],'updated':updated,'repeats':['silent-0079'],'check':0},'code_proposals':proposal_ids,'implementation_domains':['combat','potion','sl','structure'],'report':str(P/'report.md')}
spec=importlib.util.spec_from_file_location('proposals',ROOT/'learner/code_proposals.py');cp=importlib.util.module_from_spec(spec);spec.loader.exec_module(cp);queue=cp.fold(ROOT/cp.QUEUE);errors=cp.report_links(report,queue,'silent');assert not errors,errors
for ident in proposal_ids:
 item=queue[ident];assert item['character']=='silent' and item['runs']==['2H311EAD34GD'] and item['source_task']=='postmortem' and item['target_task']=='strategy-proposal';assert hashlib.sha256(Path(item['proposal']).read_bytes()).hexdigest()==item['proposal_sha256'];assert not item.get('implemented_commit')
spec=importlib.util.spec_from_file_location('ledger',ROOT/'learner/ledger.py');l=importlib.util.module_from_spec(spec);spec.loader.exec_module(l);items=l.fold();snapshot={r['id']:r for r in json.loads((P/'ledger-selected.json').read_text())}
for ident in updated:
 item=items[ident];assert item['character']=='silent';e=[e for e in item['evidence'] if e['run']=='2H311EAD34GD'];assert len(e)==1,(ident,e);assert e[0]['role']==('repeat' if ident=='silent-0079' else 'support');assert '2H311EAD34GD' in item['where']['lessons']
 if ident in snapshot:
  for key in ['first_run','prior','claim']:assert item[key]==snapshot[ident][key],(ident,key)
before=json.loads((P/'lessons-before.json').read_text());h=hashlib.sha256()
with (ROOT/'notes/lessons.md').open('rb') as f:
 remaining=before['bytes']
 while remaining:
  chunk=f.read(min(1048576,remaining));h.update(chunk);remaining-=len(chunk)
assert h.hexdigest()==before['sha256']
inside=False;rows=[]
with (ROOT/'notes/lessons.md').open() as f:
 for line in f:
  if line.startswith('## 2H311EAD34GD'):inside=True
  elif inside and line.startswith('## '):break
  if inside:rows.append(line)
section=''.join(rows);draft=(P/'lessons-draft.md').read_text().lstrip('\n');assert section.startswith(draft);assert section.count('### 勘误')==1 and 'S1.exp107' in section[len(draft):]
(P/'append-final-verification.json').write_text(json.dumps({'原前缀保持':True,'主体字节与61项核验草稿一致':True,'仅追加一条账本归类勘误':True,'最终节sha256':hashlib.sha256(section.encode()).hexdigest(),'代码提案链接核验':True,'账本角色/证据/先验保持核验':True},ensure_ascii=False,indent=2)+'\n')
(P/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
body='''## 复盘回报
- 已追加：2H311EAD34GD（A10，第17层，族母T12以11血8挡对25攻击阵亡，敌余79血）；账本归类勘误已追加。
- 新的纯 bug：无。
- 写成「未记录」的项：2H311EAD34GD：dirty源码、SL截断结算、部分末击及毛伤、实际执行推演最优比例、整场反事实与药水时点对照、boss时钟需伤/估伤及比值、Jev缓存和实际费用、未到三幕资源。
- 学习账本：2H311EAD34GD：新增 无；更新 silent-0209、silent-0030、silent-0079、silent-0125、silent-0211、silent-0158、silent-0005、silent-0277、silent-0020（老错 silent-0079）；`ledger.py check`退出码0。
- 代码提案：均关联2H311EAD34GD及独立strategy-proposal实现任务，尚未实现；缺少整场受控对照，保留当前规则。
  - F8/F17退场与攻防事实：账本0209/0030/0211/0005/0158，CLI `{combat}`。
  - F17T4/T10护栏与SL血价：账本0079/0125，CLI `{sl}`。
  - F17铁心剩余覆甲：账本0277，CLI `{potion}`。
'''.format(combat=proposal_ids[0],sl=proposal_ids[1],potion=proposal_ids[2])
(P/'report.md').write_text(body+'\n```json\n'+json.dumps(report,ensure_ascii=False)+'\n```\n')
print('最终追加、9条账本证据、3份提案链接与指纹均核验通过；报告已保存。')

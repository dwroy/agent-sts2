import hashlib,json,pathlib,re
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-231302-postmortem';lesson=root/'notes/lessons.md'
with lesson.open('rb') as h:
 for tag in ['M','Z']:
  a=json.loads((p/('lessons-prefix-before-'+tag+'.json')).read_text());h.seek(0);remaining=a['bytes'];sha=hashlib.sha256()
  while remaining:
   part=h.read(min(remaining,1<<20));assert part;sha.update(part);remaining-=len(part)
  assert sha.hexdigest()==a['sha256'],tag
runs=['M0GY0A4M2F7H','Z91JN3S3PQX2'];sections={r:[] for r in runs};active=None;counts={r:0 for r in runs}
with lesson.open() as h:
 for line in h:
  if line.startswith('## '):
   active=next((r for r in runs if line.startswith('## '+r+'（')),None)
   if active:counts[active]+=1
  if active:sections[active].append(line)
for r in runs:
 assert counts[r]==1,(r,counts)
 actual=''.join(sections[r]).rstrip();expected=(p/(r+'-final.md')).read_text().strip();assert actual.strip()==expected,r
 assert sum(x.startswith('- [') for x in sections[r])==4
inputs={tag:[json.loads(x) for x in (p/(tag+'-ledger-update.jsonl')).read_text().splitlines()] for tag in ['M','Z']}
for tag,r in zip(['M','Z'],runs):
 items={x['id']:x for x in json.loads((p/(tag+'-ledger-final.json')).read_text())}
 for update in inputs[tag]:
  assert update['id'] in items
  for e in update['evidence']:
   assert any(all(candidate.get(k)==v for k,v in e.items()) for candidate in items[update['id']]['evidence']),(tag,update['id'])
 assert items[next(iter(items))]['character']=='silent'
added=(p/'Z-ledger-new-result.txt').read_text().strip();assert added=='silent-0313'
zitems={x['id']:x for x in json.loads((p/'Z-ledger-final.json').read_text())};assert zitems[added]['first_run']==runs[1] and zitems[added]['prior']=='unknown' and zitems[added]['kind']=='mechanic'
proposal_keys=['M-combat-sl','Z-combat','Z-sandpit-sl','potion-facts'];queue={}
with (root/'paper/materials/learning/code-proposals.jsonl').open() as h:
 for line in h:
  x=json.loads(line)
  if x['op']=='add':queue[x['id']]=x
  elif x['op']=='update' and x.get('id') in queue:queue[x['id']].update(x)
proposals=[]
for key in proposal_keys:
 ident=(p/('proposal-'+key+'-result.txt')).read_text().strip();row=queue[ident];data=json.loads((p/('proposal-'+key+'.json')).read_text())
 for k,v in data.items():assert row[k]==v,(ident,k)
 assert row['proposal_sha256']==hashlib.sha256(pathlib.Path(row['proposal']).read_bytes()).hexdigest()
 assert not row.get('implemented_commit'),ident
 assert row['state'] in ['pending','waiting'],(ident,row['state'])
 proposals.append(ident)
updated=list(dict.fromkeys(x['id'] for tag in ['M','Z'] for x in inputs[tag]));repeats=list(dict.fromkeys(x['id'] for tag in ['M','Z'] for x in inputs[tag] if any(e['role']=='repeat' for e in x['evidence'])))
check=int((p/'ledger-check.exit').read_text());assert check==0
report={'task':'postmortem','appended':runs,'skipped':[],'bugs':[],'ledger':{'added':[added],'updated':updated,'repeats':repeats,'check':check},'code_proposals':proposals,'implementation_domains':['combat','potion','sl'],'report':str(p/'report.md')}
(p/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(p/'final-audit.json').write_text(json.dumps({'旧前缀校验':'通过','追加节与定稿一致':'通过','数字核对':['M-number-check.json','Z-number-check.json'],'主经验各三条':'通过','CLI账本本次证据':'通过','提案数量':len(proposals),'提案已实现':False,'新增':[added],'更新既有':len(updated),'重犯':repeats,'check':check},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))

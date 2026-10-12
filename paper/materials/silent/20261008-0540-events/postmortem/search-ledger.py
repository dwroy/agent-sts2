import subprocess,json,pathlib
p=pathlib.Path('learner/runs/20261008-051302-postmortem')
for term in ['异螨','MYTE','地道虫','TUNNELER','小血瓶','报告','SL','护栏','生存者','磨蚀']:
 x=subprocess.run(['python3','learner/ledger.py','find','--character','silent','--text',term,'--json'],capture_output=True,text=True)
 (p/('ledger-'+term+'.json')).write_text(x.stdout)
 try:rows=json.loads(x.stdout)
 except:print(term,x.stdout[:500]);continue
 print('关键词',term,len(rows))
 for r in rows:
  if term in ['SL','生存者','护栏','报告'] and r['kind']!='bug-infra' and r['id'] not in ['silent-0079','silent-0125']:continue
  print(r['id'],r['status'],r.get('version'),r['claim'][:330])

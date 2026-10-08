import json,subprocess,pathlib
out=pathlib.Path('learner/runs/20261009-031301-postmortem')
for n,word in enumerate(['骇鳗','TERROR_EEL','刀刃之舞','BLADE_DANCE','生成','技能药水','免费','灵动步法','高血量','早期','毒源']):
 p=subprocess.run(['python3','learner/ledger.py','find','--character','silent','--text',word,'--json'],capture_output=True,text=True)
 (out/f'ledger-search-{n}.json').write_text(p.stdout)
 try:a=json.loads(p.stdout)
 except: print(word,p.stdout[:200],p.stderr);continue
 print('SEARCH',word)
 for r in a: print(r['id'],r['kind'],r['status'],r.get('version'),'first',r['first_run'],r['claim'][:440])

import json,subprocess
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem')
for kw in ['未建模','80%','0.8','低估','POISON_POWER','中毒折扣']:
 r=subprocess.run(['python3','learner/ledger.py','find','--character','silent','--kind','bug-infra','--text',kw,'--json'],text=True,capture_output=True)
 (p/('bug-search-'+kw+'.json')).write_text(r.stdout)
 print('账本检索',kw)
 for ob in json.loads(r.stdout):print(ob['id'],ob['claim'][:500])
priors=[]
for l in open('logs/runs.jsonl'):
 r=json.loads(l)
 if (r.get('character') or '').lower()=='silent' and r['ended']<'2026-10-06T22:51:36.622Z':priors.append(r)
(p/'prior-ids.txt').write_text('\n'.join(r['run_id'] for r in priors)+'\n')
heading=''
print('更早复盘中的同项')
for n,l in enumerate(open('notes/lessons.md'),1):
 if l.startswith('## '):heading=l.strip()
 if '静默猎手' in heading and any(k in l for k in ['未建模','80%','0.8','低报','低估']):
  for phrase in l.split('。'):
   if any(k in phrase for k in ['未建模','80%','0.8','低报','低估']) and any(k in phrase for k in ['毒','折扣','乘','伤害','扣血']):print(n,heading,phrase[:650])

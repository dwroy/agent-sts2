import json
from pathlib import Path
want={'silent-0020','silent-0079','silent-0278','silent-0046','silent-0057','silent-0132','silent-0011','silent-0005','silent-0153'}
cut='2026-10-09T09:22:36'; fold={}
for line in Path('paper/materials/learning/ledger.jsonl').open():
 x=json.loads(line)
 if x.get('id') not in want or x.get('ts','')[:19]>cut: continue
 ident=x['id']; y=fold.setdefault(ident,{})
 for k in ['claim','status','version','first_run','prior','prior_runs','prior_note']:
  if k in x: y[k]=x[k]
print(json.dumps(fold,ensure_ascii=False,indent=2))

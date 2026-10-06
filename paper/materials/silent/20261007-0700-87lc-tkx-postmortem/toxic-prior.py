import json,sys
for l in sys.stdin:
 d=json.loads(l)
 if d.get('expect',{}).get('card',{}).get('id')=='TOXIC':print(json.dumps({k:d.get(k) for k in ['ts','run_id','floor','turn','label','rationale','chosen']},ensure_ascii=False))

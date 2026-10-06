import json,sys
for line in sys.stdin:
 d=json.loads(line)
 if d['label']!='combat/lethal':continue
 fp=json.loads(d['fingerprint'])
 if any(k in fp.get('hand','') for k in ['TOXIC','WITHER','BURN','BECKON','REGRET','DECAY']):
  print(json.dumps({k:d.get(k) for k in ['ts','run_id','floor','turn','label','fingerprint','rationale','chosen']},ensure_ascii=False))

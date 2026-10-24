from own_conn import *
import hashlib
refs=[]
for row in rows("select off,len from frames where run_id='C48LLXBGKXQ9' and floor=14 and screen='SHOP' order by off limit 2"):
 assert row['off']+row['len']<=scope['raw_stream_cutoffs']['states']['max_bytes']
 with (R/'logs/states.jsonl').open('rb') as f:f.seek(row['off']);b=f.read(row['len'])
 refs.append({'stream':'states','off':row['off'],'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 d=json.loads(b)['state'];print(json.dumps({'shop':d['shop'],'available_actions':d['available_actions'],'selection':d['selection']},ensure_ascii=False))
(S/'inspect-fields-refs.json').write_text(json.dumps(refs,indent=2)+'\n')

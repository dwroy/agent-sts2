from own_conn import *
import hashlib
r=rows("select off,len from decisions where run_id='0QDRNCRMC8BU' and floor=24 and action='remove_card_at_shop' limit 1")[0]
assert r['off']+r['len']<=scope['raw_stream_cutoffs']['decisions']['max_bytes']
with (R/'logs/decisions.jsonl').open('rb') as f:f.seek(r['off']);b=f.read(r['len'])
d=json.loads(b);print('keys',list(d));print(json.dumps({k:v for k,v in d.items() if k in ['action','chosen','questions','result','rationale','brain','prompt','question','decisions','decision']},ensure_ascii=False)[:8000])
(S/'inspect-decision-ref.json').write_text(json.dumps(dict(stream='decisions',offset=r['off'],bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))+'\n')

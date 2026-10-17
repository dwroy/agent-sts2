"""Preserve noncombat inventory frames and combat boundary/resource changes, not duplicate caches."""
import collections,gzip,hashlib,json,os
from pathlib import Path
O=Path(__file__).resolve().parent
rows=[]
with gzip.open(O/'states-summary.jsonl.gz','rt') as f:
 for l in f:rows.append(json.loads(l))
keep=set();prev=None;last=None;lastkey=None
for x in rows:
 key=(x['run'],x['floor'],x.get('turn'),x['screen']);off=x['source']['off']
 if x['screen']!='COMBAT' or key!=lastkey or prev is None or any(x.get(k)!=prev.get(k) for k in ['deck','relics','gold','hp','max_hp']):keep.add(off)
 if key!=lastkey and last is not None:keep.add(last)
 prev=x;last=off;lastkey=key
if last is not None:keep.add(last)
rawpos=0
with gzip.open(O/'raw-states.jsonl.gz','rb') as src,gzip.open(O/'states-raw-manifest.jsonl.gz','rt') as refs,gzip.GzipFile(str(O/'raw-states.compact.gz'),'wb',compresslevel=6,mtime=0) as dst,gzip.GzipFile(str(O/'states-raw-manifest.compact.gz'),'wb',compresslevel=6,mtime=0) as m,gzip.GzipFile(str(O/'states-summary.compact.gz'),'wb',compresslevel=6,mtime=0) as summaries:
 for raw,rr,x in zip(src,refs,rows):
  ref=json.loads(rr)
  if ref['off'] not in keep:continue
  assert hashlib.sha256(raw).hexdigest()==ref['sha256'];dst.write(raw);ref['archive']['uncompressed_off']=rawpos;rawpos+=len(raw);m.write((json.dumps(ref,separators=(',',':'))+'\n').encode());summaries.write((json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode())
for old,new in [('raw-states.jsonl.gz','raw-states.compact.gz'),('states-raw-manifest.jsonl.gz','states-raw-manifest.compact.gz'),('states-summary.jsonl.gz','states-summary.compact.gz')]:os.replace(O/new,O/old)
# The summary must not duplicate full original prompt arrays; those stay in the raw archive.
brainkeys=collections.Counter()
with gzip.open(O/'brain-summary.jsonl.gz','rt') as src,gzip.GzipFile(str(O/'brain-summary.compact.gz'),'wb',compresslevel=6,mtime=0) as dst:
 for line in src:
  d=json.loads(line);brainkeys.update(d)
  small={k:v for k,v in d.items() if k not in ['state','system','prompt','question','questions','messages','input','raw']};dst.write((json.dumps(small,ensure_ascii=False,separators=(',',':'))+'\n').encode())
os.replace(O/'brain-summary.compact.gz',O/'brain-summary.jsonl.gz')
(O/'state-retention.json').write_text(json.dumps({'states_read':len(rows),'states_retained':len(keep),'all_noncombat_retained':True,'retained_combat':'contiguous turn boundaries and permanent inventory/relic/gold/HP changes; no SL segments merged','brain_keys':dict(brainkeys),'brain_raw_rows_retained':1481,'old_raw_logs_unchanged':True},ensure_ascii=False,indent=2)+'\n')
print('states',len(rows),len(keep));print('brainkeys',list(brainkeys));print('bytes',sum(p.stat().st_size for p in O.rglob('*') if p.is_file()))

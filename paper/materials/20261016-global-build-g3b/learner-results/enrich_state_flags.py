"""Preserve the native combat flag from the already saved original byte lines."""
import gzip,hashlib,json,os
from pathlib import Path
O=Path(__file__).resolve().parent
rows={x['source']['off']:x for x in (json.loads(l) for l in gzip.open(O/'states-summary.jsonl.gz','rt'))}
with gzip.open(O/'raw-states.jsonl.gz','rb') as raw,gzip.open(O/'states-raw-manifest.jsonl.gz','rt') as refs,gzip.GzipFile(str(O/'states-summary.flags.gz'),'wb',compresslevel=6,mtime=0) as dst:
 for line,rr in zip(raw,refs):
  ref=json.loads(rr);assert hashlib.sha256(line).hexdigest()==ref['sha256'];x=rows[ref['off']];x['in_combat']=json.loads(line)['state'].get('in_combat');dst.write((json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode())
os.replace(O/'states-summary.flags.gz',O/'states-summary.jsonl.gz');print('native_flags_rows',len(rows))

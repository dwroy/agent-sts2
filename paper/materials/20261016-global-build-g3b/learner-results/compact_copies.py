"""Keep all anchor/noncombat rows and explicit cast witnesses; retain original source hashes."""
import collections,gzip,hashlib,json,os
from pathlib import Path
O=Path(__file__).resolve().parent
anchors={x['source']['off'] for x in json.loads(Path('/home/dw/Projects/agent-sts2/paper/materials/20261016-global-build-g3b/coordination/anchor-index.json').read_text())}
seen=set();keep=set();counts=collections.Counter();off2=0
with gzip.open(O/'raw-decisions.jsonl.gz','rb') as src,gzip.open(O/'decisions-raw-manifest.jsonl.gz','rt') as refs,gzip.GzipFile(str(O/'raw-decisions.compact.gz'),'wb',compresslevel=6,mtime=0) as dst,gzip.GzipFile(str(O/'decisions-raw-manifest.compact.gz'),'wb',compresslevel=6,mtime=0) as m:
 for raw,refline in zip(src,refs):
  ref=json.loads(refline);d=json.loads(raw);action=(d.get('chosen') or {}).get('action');take=ref['off'] in anchors or action not in ['play_card','end_turn','use_potion']
  if action=='play_card':
   fp=json.loads(d.get('fingerprint') or '{}');hand=dict((part.split(':',1)[0],part.split(':')[1]) for part in fp.get('hand','').split('|') if ':' in part);card=hand.get(str((d.get('chosen') or {}).get('card_index')))
   key=(d.get('run_id'),d.get('floor'),d.get('sl_attempt'),d.get('sl_reloads'),card)
   if card and key not in seen:take=True;seen.add(key)
  if take:
   assert hashlib.sha256(raw).hexdigest()==ref['sha256'];keep.add(ref['off']);dst.write(raw);ref['archive']['uncompressed_off']=off2;off2+=len(raw);m.write((json.dumps(ref,separators=(',',':'))+'\n').encode());counts['retained']+=1
  else:counts['not_referenced_repeated_combat_rows']+=1
with gzip.open(O/'decisions-summary.jsonl.gz','rb') as src,gzip.GzipFile(str(O/'decisions-summary.compact.gz'),'wb',compresslevel=6,mtime=0) as dst:
 for line in src:
  if json.loads(line)['source']['off'] in keep:dst.write(line)
for old,new in [('raw-decisions.jsonl.gz','raw-decisions.compact.gz'),('decisions-raw-manifest.jsonl.gz','decisions-raw-manifest.compact.gz'),('decisions-summary.jsonl.gz','decisions-summary.compact.gz')]:os.replace(O/new,O/old)
(O/'copy-compaction.json').write_text(json.dumps({'counts':counts,'all_anchor_rows_preserved':anchors<=keep,'cast_observation_scope':'同局/层/SL分支/牌名的首个completed动作见证；不是完整施放总次数，缺后续不填0','no_raw_source_changed':True},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts));print('current_bytes',sum(p.stat().st_size for p in O.rglob('*') if p.is_file()))

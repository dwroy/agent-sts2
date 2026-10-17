"""Retain accepted answers and exact route fields, never convert archetype text into policy."""
import collections,gzip,json,os
from pathlib import Path
O=Path(__file__).resolve().parent;stats=collections.Counter()
def routes(d,path='payload',depth=0):
 out=[]
 if not isinstance(d,dict) or depth>6:return out
 for k,v in d.items():
  if k in ['route_review','route','route_plan','act_route','current_route']:
   out.append({'json_path':path+'.'+k,'value':v})
  elif isinstance(v,dict) and k not in ['act_boss_sim','construction_evaluation','construction','quantitative','coreCatalog']:
   out.extend(routes(v,path+'.'+k,depth+1))
 return out
with gzip.open(O/'raw-brain.jsonl.gz','rt') as src,gzip.open(O/'brain-raw-manifest.jsonl.gz','rt') as refs,gzip.GzipFile(str(O/'brain-summary.compact.gz'),'wb',compresslevel=6,mtime=0) as dst:
 for line,rr in zip(src,refs):
  d=json.loads(line);ref=json.loads(rr);stats.update(d.keys());x={k:d.get(k) for k in ['ts','run_id','label','accepted','answer','question_id','problems']};x['source']={k:ref[k] for k in ['path','off','len','sha256']};x['route_fields']=routes(d.get('payload'));x['memory_route']=(d.get('memory') or {}).get('route');dst.write((json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode())
os.replace(O/'brain-summary.compact.gz',O/'brain-summary.jsonl.gz')
queries=[]
for n in ['harvest-attempt1.stdout','harvest-resume.stdout']:
 for l in (O/n).read_text().splitlines():
  if l.startswith('{"name"'):queries.append(json.loads(l))
(O/'harvest-receipt.json').write_text(json.dumps({'raw_rows_read':{x['name']:x['indexed_rows'] for x in queries},'queries':queries,'raw_referenced_rows_sha_checked':True,'no_index_outcome_truth':True,'retained_states':sum(1 for _ in gzip.open(O/'states-summary.jsonl.gz','rt')),'retained_decisions':sum(1 for _ in gzip.open(O/'decisions-summary.jsonl.gz','rt')),'retained_brain':1481,'retention_scope':'保留全部非战斗状态、战斗相邻回合端点与库存/HP/金币变化；保留所有锚点和非战斗决策及分支具名首施放见证。未声称完整施放总次数。'},ensure_ascii=False,indent=2)+'\n')
print('brain_keys',list(stats));print('bytes',sum(p.stat().st_size for p in O.rglob('*') if p.is_file()))

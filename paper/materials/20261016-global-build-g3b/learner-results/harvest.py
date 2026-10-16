"""Read selected frozen raw rows once. Parquet supplies addresses, never outcome truth."""
import collections,gzip,hashlib,json,os,subprocess,time
from pathlib import Path
import duckdb
ROOT=Path('/home/dw/Projects/agent-sts2');B=ROOT/'paper/materials/20261016-global-build-g3b'
OUT=ROOT/'.worktrees/codex-strategy-silent-20261012-024317/learner/runs/20261016-135541-9b95a56c-ddfa-4e65-b94d-cbe7a5f57947-strategy-proposal/learner-results'
M=json.loads((B/'inputs/manifest.json').read_text());RUNS=M['selected_runs'];c=duckdb.connect(config={'threads':1,'memory_limit':'512MB','temp_directory':str(OUT)})
def enc(x):return (json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode()
def cards(a):return [{'id':v.get('card_id'), 'upgraded':v.get('upgraded'), 'index':v.get('index',i),'price':v.get('price')} for i,v in enumerate(a or []) if isinstance(v,dict)]
def view(s):
 r=s.get('run') or {};sel=s.get('selection') or {};rew=s.get('reward') or {};shop=s.get('shop') or {};rest=s.get('rest') or {};event=s.get('event') or {}
 return {'run':s.get('run_id'),'floor':r.get('floor'),'act':r.get('act_id'),'hp':r.get('current_hp'),'max_hp':r.get('max_hp'),'gold':r.get('gold'),'screen':s.get('screen'),'in_combat':s.get('in_combat'),
 'deck':cards(r.get('deck')),'relics':[x.get('relic_id') for x in r.get('relics',[]) if isinstance(x,dict)],'boss':r.get('boss_id'),
 'map':s.get('map'),'selection':{k:v for k,v in sel.items() if k!='cards'}|{'cards':cards(sel.get('cards'))},
 'reward':{k:v for k,v in rew.items() if k!='card_options'}|{'card_options':cards(rew.get('card_options'))},
 'shop':{'cards':cards(shop.get('cards')),'relics':shop.get('relics'),'card_removal':shop.get('card_removal'),'is_open':shop.get('is_open')},
 'rest':rest,'event':event,'game_over':s.get('game_over'),'available_actions':s.get('available_actions'),'turn':s.get('turn')}
counts={};indexed=[]
for name,folder,extra in [('states','frames',''),('decisions','decisions',''),('brain','llm_calls_raw'," AND src='brain'")]:
 if name!='brain' and (OUT/'copy-compaction.json').exists():continue
 bound=M['source_bounds'][name];path=ROOT/bound['path'];marks=','.join('?' for _ in RUNS)
 sql=f'SELECT DISTINCT off,len FROM read_parquet(?) WHERE run_id IN ({marks}) AND off>=0 AND off+len<=?'+extra+' ORDER BY off'
 parquet=str(ROOT/'data/logdb'/folder/'*.parquet');addresses=c.execute(sql,[parquet,*RUNS,bound['complete_prefix_bytes']]).fetchall()
 indexed.append({'name':name,'query':sql,'parquet':parquet,'prefix_bytes':bound['complete_prefix_bytes'],'indexed_rows':len(addresses),'raw_bytes':sum(x[1] for x in addresses)})
 print(json.dumps(indexed[-1]),flush=True)
 rawoff=0;written=0
 with path.open('rb') as f,gzip.GzipFile(str(OUT/f'raw-{name}.jsonl.gz'),'wb',compresslevel=1,mtime=0) as archive,gzip.GzipFile(str(OUT/f'{name}-summary.jsonl.gz'),'wb',compresslevel=1,mtime=0) as summaries,gzip.GzipFile(str(OUT/f'{name}-raw-manifest.jsonl.gz'),'wb',compresslevel=1,mtime=0) as refs:
  for off,length in addresses:
   assert off+length<=bound['complete_prefix_bytes'];f.seek(off);raw=f.read(length);assert len(raw)==length and raw.endswith(b'\n')
   d=json.loads(raw);s=d.get('state',d);run=s.get('run_id') if name=='states' else d.get('run_id');assert run in RUNS,(name,off,run)
   if name=='states':assert str((s.get('run') or {}).get('character_id','')).lower()=='silent' and (s.get('run') or {}).get('ascension')==10,(off,'role')
   ref={'path':bound['path'],'off':off,'len':length,'sha256':hashlib.sha256(raw).hexdigest()}
   refs.write(enc(ref|{'archive':{'path':f'raw-{name}.jsonl.gz','uncompressed_off':rawoff,'len':length},'run':run}));archive.write(raw);rawoff+=length
   if name=='states':x=view(s)|{'ts':d.get('ts'),'observed_at':d.get('observed_ts'),'fingerprint':d.get('fingerprint'),'source':ref}
   elif name=='decisions':
    x={k:d.get(k) for k in ['ts','observed_ts','run_id','decision_id','floor','turn','label','screen','fingerprint','chosen','result','decider','sl_attempt','sl_reloads','route_review','deepseek','answers','journal','request_ids','selection_dispatch']};x['source']=ref
    if 'combat' not in str(d.get('label','')):x['questions']=d.get('questions')
   else:x=d|{'source':ref}
   summaries.write(enc(x));written+=1
   if written%5000==0:print(name,written,flush=True)
 counts[name]=written
 print(name,'done',written,'compressed', (OUT/f'raw-{name}.jsonl.gz').stat().st_size,flush=True)
 if sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())>250*1024*1024:raise RuntimeError('bounded local artifact budget exceeded; keep completed evidence, do not expand')
(OUT/'harvest-receipt.json').write_text(json.dumps({'counts':counts,'queries':indexed,'cutoff':M['at'],'raw_source_bounds':M['source_bounds'],'no_index_outcomes_used':True,'raw_bytes_sha_and_line_end_checked':True},ensure_ascii=False,indent=2)+'\n')

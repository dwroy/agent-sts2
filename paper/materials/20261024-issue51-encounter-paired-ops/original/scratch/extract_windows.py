import json,pathlib,hashlib,duckdb,collections
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OUT=pathlib.Path(__file__).resolve().parent
S=json.loads((ROOT/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_text())
C=duckdb.connect(':memory:');C.execute('SET threads=2');C.execute('CREATE TABLE allowed(run_id VARCHAR)');C.executemany('INSERT INTO allowed VALUES (?)',[(x['run_id'],) for x in S['runs']])
for table,stream in [('frames','states'),('decisions','decisions'),('run_plans','run-plans')]:
 paths=[str(ROOT/x['path']) for x in S['verified_read_only_shards'] if x['table']==table]
 C.execute('CREATE TEMP TABLE '+table+' AS SELECT p.* FROM read_parquet(?) p JOIN allowed USING(run_id) WHERE p.off+p.len<=?',[paths,S['raw_stream_cutoffs'][stream]['max_bytes']])
def rows(sql,args=[]):
 cur=C.execute(sql,args);return [dict(zip([x[0] for x in cur.description],row)) for row in cur.fetchall()]
AUD=[]
def seek(stream,off,n):
 cut=S['raw_stream_cutoffs'][stream];assert 0<=off and n>0 and off+n<=cut['max_bytes']
 with (ROOT/cut['path']).open('rb') as f:f.seek(off);raw=f.read(n)
 assert len(raw)==n
 obj=json.loads(raw);assert obj.get('run_id',obj.get('state',{}).get('run_id')) in {x['run_id'] for x in S['runs']}
 dest=OUT/'raw'/f'{stream}-{off}-{n}.json';dest.parent.mkdir(exist_ok=True);dest.write_bytes(raw)
 AUD.append({'stream':stream,'source':str(ROOT/cut['path']),'offset':off,'bytes':n,'sha256':hashlib.sha256(raw).hexdigest(),'cutoff':cut['max_bytes'],'path':str(dest)})
 (OUT/'raw-seek-audit.json').write_text(json.dumps(AUD,ensure_ascii=False,indent=2)+'\n')
 return obj,str(dest)
CASES=[('bygone','0CLP16ZR4ZZC',8,[1,2,3]),('vantom','0CLP16ZR4ZZC',17,[1,2,3,4]),('kin','KUHYZBFFLALU',17,[2,3,4]),('demon','KUHYZBFFLALU',33,[1,2,3]),('millipede','FZT053H9PSC5',31,[1,2,3]),('crab','LKC9YXKZWTKR',33,[1,2,3,4,5,6,7,8])]
REPORT=[]
for name,run,floor,turns in CASES:
 ds=rows("SELECT * FROM decisions WHERE run_id=? AND floor=? AND label LIKE 'combat%' ORDER BY off",[run,floor]);fs=rows('SELECT * FROM frames WHERE run_id=? AND floor=? AND in_combat ORDER BY off',[run,floor]);info={'case':name,'run':run,'floor':floor,'decisions':ds,'frames':fs,'windows':[]}
 # Read all selected combat frames and all selected decisions, retaining every original record.
 for d in ds:
  if d['turn'] in turns:
   obj,path=seek('decisions',d['off'],d['len']);info['windows'].append({'kind':'decision','off':d['off'],'path':path})
 for f in fs:
  if f['turn'] in turns:
   obj,path=seek('states',f['off'],f['len']);info['windows'].append({'kind':'state','off':f['off'],'path':path})
 (OUT/f'window-{name}.json').write_text(json.dumps(info,ensure_ascii=False,indent=2,default=str)+'\n')
 REPORT.append({'case':name,'run':run,'floor':floor,'frames':len(fs),'decisions':len(ds),'raw_selected':len(info['windows']),'turns':turns})
(OUT/'raw-seek-audit.json').write_text(json.dumps(AUD,ensure_ascii=False,indent=2)+'\n');(OUT/'window-index.json').write_text(json.dumps(REPORT,indent=2)+'\n')
print(json.dumps(REPORT,indent=2));print('raw',len(AUD),'bytes',sum(x['bytes'] for x in AUD))

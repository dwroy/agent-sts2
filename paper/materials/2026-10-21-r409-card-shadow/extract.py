import datetime,hashlib,json,pathlib,subprocess,gzip
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2'); OUT=pathlib.Path(__file__).parent/'frozen'; OUT.mkdir(exist_ok=True)
runs=['7XS2Y920KA6E','SVBEFF7YAZMA','BQXQJQ9GN51L','MGB1D1T0Y8G0','CLCR3DUH66HK','CESK0EFSJ2C4']
cutoff=datetime.datetime.now(datetime.timezone.utc).isoformat()
(OUT/'runs.txt').write_text('\n'.join(runs)+'\n')
summary={'cutoff':cutoff,'runs':runs,'logs':{}}
for name in ['states','decisions','brain','run-plans']:
 source=ROOT/'logs'/f'{name}.jsonl'; count=0; sizes={r:0 for r in runs}; first=None
 proc=subprocess.Popen(['rg','-F','-f',str(OUT/'runs.txt'),str(source)],stdout=subprocess.PIPE)
 with gzip.open(OUT/f'{name}.jsonl.gz','wt',encoding='utf8') as f:
  for line in proc.stdout:
   row=json.loads(line); ts=row.get('ts','')
   if ts and ts>cutoff: continue
   run=row.get('run_id') or row.get('run') or row.get('state',{}).get('run_id')
   if run not in runs: continue
   f.write(line.decode());count+=1;sizes[run]+=1
   if first is None: first=row
 proc.wait();summary['logs'][name]={'source':str(source),'source_bytes_at_end':source.stat().st_size,'rows':count,'per_run':sizes,'sha256':hashlib.sha256((OUT/f'{name}.jsonl.gz').read_bytes()).hexdigest()}
 print(name,count,sizes,flush=True)
 if first:
  compact={k:v for k,v in first.items() if k not in ['state','prompt','memory','request','input','output','messages','situation','result']}
  (OUT/f'{name}-first-keys.json').write_text(json.dumps({'keys':list(first),'compact':compact},ensure_ascii=False,indent=2))
(OUT/'extraction.json').write_text(json.dumps(summary,indent=2))

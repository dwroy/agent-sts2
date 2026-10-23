from pathlib import Path
import subprocess,os,json,gzip,hashlib
D=Path(__file__).resolve().parent;A=json.loads((D/'assembly.json').read_text());W=Path(A['worktree'])
sha=lambda x:hashlib.sha256(x).hexdigest()
def inputs():
 names=subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD','--','agent','ops','learner','knowledge','eval','tools','.agents'],cwd=W).decode().splitlines();out=[]
 for name in names:
  p=W/name
  if p.is_file() and not p.is_symlink() and name!='ops/instance-binding.json' and not name.endswith('.env'):
   raw=p.read_bytes();out.append(dict(path=name,bytes=len(raw),sha256=sha(raw)))
 return out
before=inputs();(D/'inputs-before.json.gz').write_bytes(gzip.compress((json.dumps(before,indent=2)+'\n').encode(),mtime=0))
files=['external-strategy-evidence','strategy-entries','brain-query-guidance','brain-reflex-knowledge','brain-agent-mode','brain-knowledge','external-stats-tools','reward-external-stats','gkb-tools']
steps=[('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),('vitest-directed',['node','node_modules/vitest/vitest.mjs','run',*['tests/'+n+'.test.ts' for n in files],'--pool=threads','--maxWorkers=1','--fileParallelism=false'])]
rows=[]
for name,argv in steps:
 start=subprocess.check_output(['date','-Iseconds'],text=True).strip()
 with (D/(name+'.log')).open('wb') as out:p=subprocess.run(['nice','-n','19',*argv],cwd=W/'agent',env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'PYTHONDONTWRITEBYTECODE':'1'},stdout=out,stderr=subprocess.STDOUT)
 row=dict(name=name,argv=['nice','-n','19',*argv],start=start,finish=subprocess.check_output(['date','-Iseconds'],text=True).strip(),exit=p.returncode,log=name+'.log',log_sha256=sha((D/(name+'.log')).read_bytes()));rows.append(row);print(json.dumps(row),flush=True)
 if name=='tsc' and p.returncode:break
after=inputs();(D/'inputs-after.json.gz').write_bytes(gzip.compress((json.dumps(after,indent=2)+'\n').encode(),mtime=0));r=dict(state='passed' if all(r['exit']==0 for r in rows) and len(rows)==2 and before==after else 'failed',checks=rows,input_count=len(before),inputs_unchanged=before==after,tree=A['tree'],full_started=False,main_product_written=False,live_written=False,workers=1,nice=19)
(D/'checks.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True)

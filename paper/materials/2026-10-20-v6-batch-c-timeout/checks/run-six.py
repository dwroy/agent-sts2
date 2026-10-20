from pathlib import Path
import datetime,hashlib,json,os,subprocess,time,statistics
w=Path(__file__).resolve().parents[2]; a=Path(__file__).resolve().parent; r=w.parent.parent
now=lambda:datetime.datetime.now().astimezone().isoformat()
expected=json.loads((r/'.artifacts/ops-five-item-repaired-20261020-1956/host-inputs-before.json').read_text())
refs={'live':'64c218a04ebe029fdda0b5f25025302ebf2a4124','candidate':(a/'candidate-snapshot.txt').read_text().strip()}
env=dict(os.environ);env['PATH']=str(Path.home()/'.local/node/bin')+os.pathsep+env.get('PATH','')
scratch=r/'.cache/w8b';scratch.mkdir(parents=True,exist_ok=True)
for k in ['TMPDIR','TMP','TEMP']:env[k]=str(scratch)
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS']:env[k]='1'
def manifest():
 rows=[]
 for row in expected:
  p=w/row['path']
  if not p.is_file():rows.append({'path':row['path'],'missing':True});continue
  b=p.read_bytes();rows.append({'path':row['path'],'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 return rows
def save(name,d): (a/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def cpu():return [int(x) for x in Path('/proc/stat').read_text().splitlines()[0].split()[1:]]
status={'started_at':now(),'pid':os.getpid(),'nice':os.getpriority(os.PRIO_PROCESS,0),'refs':refs,'candidate_tree':'496948c2f9a9fb4d45056aa2394940cb81e0862b','test_filter':'the logged elite T1 with the clock past the budget','steps':[]}
save('status.json',status)
for i,label in enumerate(['live','candidate']*3):
 n=1+i//2; prefix=f'{label}-{n}'
 with (a/(prefix+'-checkout.log')).open('w') as f:subprocess.run(['git','checkout','--detach',refs[label]],cwd=w,stdout=f,stderr=subprocess.STDOUT,check=True)
 before=manifest();save(prefix+'-inputs-before.json',before)
 same=before==expected
 if label=='candidate' and not same:raise RuntimeError('candidate does not match original 2379 input bytes')
 cmd=['node','node_modules/vitest/vitest.mjs','run','tests/batch-c.test.ts','--maxWorkers=1','--testNamePattern',status['test_filter'],'--reporter=json','--outputFile',str(a/(prefix+'.json'))]
 step={'label':label,'repeat':n,'started_at':now(),'command':cmd,'tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=w).decode().strip(),'original_2379_match':same,'input_count':len(before),'input_sha256':hashlib.sha256((json.dumps(before,ensure_ascii=False,indent=2)+'\n').encode()).hexdigest(),'load_before':Path('/proc/loadavg').read_text().strip()}
 status['steps'].append(step);save('status.json',status);start=time.monotonic();c0=cpu()
 with (a/(prefix+'.log')).open('wb') as f:
  child=subprocess.Popen(cmd,cwd=w/'agent',env=env,stdout=f,stderr=subprocess.STDOUT);step['pid']=child.pid;save('status.json',status);step['exit_code']=child.wait(timeout=180)
 c1=cpu();d=[b-a for a,b in zip(c0,c1)];total=sum(d[:8]);step.update(wall_seconds=time.monotonic()-start,ended_at=now(),load_after=Path('/proc/loadavg').read_text().strip(),host_cpu_busy_fraction=(1-(d[3]+d[4])/total) if total else None)
 after=manifest();save(prefix+'-inputs-after.json',after);step['inputs_unchanged']=before==after
 if (a/(prefix+'.json')).exists():
  result=json.loads((a/(prefix+'.json')).read_text());step['result']={k:result.get(k) for k in ['success','numPassedTests','numFailedTests','numPendingTests']}
  step['assertions']=[{'title':q['fullName'],'duration_ms':q.get('duration'),'status':q['status']} for f in result['testResults'] for q in f.get('assertionResults',[]) if status['test_filter'] in q.get('fullName','')]
 save('status.json',status);print(json.dumps(step,ensure_ascii=False),flush=True)
status['ended_at']=now();status['state']='complete';save('status.json',status)

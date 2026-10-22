from pathlib import Path
import os,json,hashlib,subprocess,time,fcntl,traceback,select
R=Path('/home/dw/Projects/agent-sts2');W=R/'.worktrees/ops-issue33-live-20261022-0930';A=R/'.artifacts/ops-issue33-release-20261022';M=R/'paper/materials/20261022-issue33-live-ops';locks=[];status={}
def now():return subprocess.check_output(['date','-Is'],text=True).strip()
def save(v):
 b=(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode();(A/'checks.json').write_bytes(b);(M/'checks.json').write_bytes(b)
def git(*args):return subprocess.check_output(['git','-C',str(W),*args],stderr=subprocess.PIPE)
def digest(b):return hashlib.sha256(b).hexdigest()
def manifest():
 names=git('ls-files','-z','agent','ops','learner','eval','knowledge','.agents').decode().split('\0');names+=['paper/materials/issue29-brain-speed/results.jsonl'];out=[]
 for p in sorted(set(names)):
  f=W/p
  if f.is_file() and not f.is_symlink() and not f.name.startswith('.env') and not p.startswith(('ops/instance-binding','ops/autoplay.log','ops/refresh.log','ops/restarts.log','ops/win-notified','ops/inbox-dev.md')):
   b=f.read_bytes();out.append(dict(path=p,bytes=len(b),sha256=digest(b)))
 return out
try:
 old=json.loads((A/'checks.json').read_text());assert old.get('tsc_or_full_started') is False and old['state']=='blocked-or-failed-retain-live' and old.get('ended_at')=='2026-10-22T10:44:56+08:00'
 assert not any((A/(n+'.log')).exists() for n in ['rebuild','tsc','full']),'first full already started'
 leaves=json.loads((M/'source-leaves.json').read_text())
 assert all(digest((W/v['path']).read_bytes())==v['sha256'] for v in leaves),'candidate changed'
 assert git('write-tree').decode().strip()==json.load(open(A/'prepared.json'))['tree']
 guard=os.open(A/'check-continuation-1044.guard',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(guard)
 status=dict(state='queued-on-original-kernel-locks',queued_at=now(),runner_pid=os.getpid(),runner_start=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],worktree=str(W),tsc_or_full_started=False,new_model_API_MC_game_actions=0,setup_attempt1_preserved=True)
 status.update(continuation_of='resource gate ended09:37 before any rebuild/tsc/full',authorization='paper/materials/20261022-issue33-window-ops/authorization-original.md')
 status.update(state='queued-on-original-kernel-locks',continuation_of='original unstarted combination check; 1044 knowledge lock gate preserved');save(status)
 for p in ['ops/codex-ops/ordinary-close.lock','ops/codex-ops/paper-dataset.lock','ops/codex-ops/tick-snapshot.lock','ops/live-merge.lock']:
  h=(R/p).open('a');fcntl.flock(h,fcntl.LOCK_EX);locks.append(h)
 assert subprocess.check_output(['git','-C',str(R/'.worktrees/live'),'rev-parse','HEAD']).decode().strip()==json.load(open(A/'prepared.json'))['base']
 active=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   if (p/'comm').read_text().strip()=='node' and b'vitest' in (p/'cmdline').read_bytes() and str((p/'cwd').resolve()).startswith(str(R)):active.append(int(p.name))
  except (OSError,RuntimeError):pass
 assert not active,active
 status.update(state='waiting-original-knowledge-refresh-lock',knowledge_lock_wait_started_at=now());save(status)
 h=(R/'ops/knowledge-refresh.lock').open('a');fcntl.flock(h,fcntl.LOCK_EX)
 knowledge=[]
 try:
  for f in sorted((R/'.worktrees/live/knowledge').rglob('*.json')):
   p=str(f.relative_to(R/'.worktrees/live'));b=f.read_bytes();q=W/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);knowledge.append(dict(path=p,bytes=len(b),sha256=digest(b)))
 finally:fcntl.flock(h,fcntl.LOCK_UN);h.close()
 # Test the newest knowledge snapshot; publication preserves later writer changes separately.
 before=manifest();(A/'inputs-before.json').write_text(json.dumps(before,indent=2)+'\n');tree=git('write-tree').decode().strip()
 status=dict(state='running',tsc_or_full_started=False,continuation_of='original 0937 resource gate; first actual full',started_at=now(),runner_pid=os.getpid(),runner_start=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],worktree=str(W),source_tree=tree,knowledge_count=len(knowledge),knowledge_snapshot=knowledge,input_count=len(before),source_plan=json.load(open(A/'prepared.json')),steps=[],nice=os.getpriority(os.PRIO_PROCESS,0),new_model_API_MC_game_actions=0);save(status)
 env={**os.environ,'SANDBOX_WORKERS':'1','PATH':str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH',''),'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1'}
 jobs=[('rebuild',['python3','agent/tools/build-external-stats.py','--check'],W),('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),('full',['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(A/'vitest.json')],W/'agent')]
 for name,cmd,cwd in jobs:
  step=dict(name=name,command=cmd,started_at=now());status['steps'].append(step);start=time.monotonic()
  with (A/(name+'.log')).open('wb') as log:
   child=subprocess.Popen(['nice','-n','19',*cmd],cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT);step['pid']=child.pid;status['tsc_or_full_started']=name in ['tsc','full'] or status.get('tsc_or_full_started',False);save(status);step['exit_code']=child.wait()
  step['seconds']=time.monotonic()-start;save(status);print(name,step['exit_code'],flush=True)
  if step['exit_code']:raise RuntimeError(name+' failed; original log retained')
 after=manifest();(A/'inputs-after.json').write_text(json.dumps(after,indent=2)+'\n');assert before==after,'fixed inputs changed'
 status.update(state='passed-exact-live-combination-await-publication',ended_at=now(),input_unchanged=True);save(status)
except BaseException as e:
 status.update(state='blocked-or-failed-retain-live',ended_at=now(),error=type(e).__name__,message=str(e));save(status);(A/'error.txt').write_text(traceback.format_exc());print(type(e).__name__,str(e),flush=True)
finally:
 for h in reversed(locks):fcntl.flock(h,fcntl.LOCK_UN);h.close()

 event=R/'ops/codex-ops/queue'/f'{time.time_ns()}-manual.md'
 event.write_text('原#33+#26精确live组合唯一宿主检查终局：'+json.dumps({k:v for k,v in status.items() if k not in ['knowledge_snapshot','source_plan']},ensure_ascii=False)+'；原件paper/materials/20261022-issue33-live-ops/checks.json。失败保留原件/live，不重复full或模型；通过后沿原准入及自然边界发布，首局读回待验。不做A/B或新增实验局。\n')

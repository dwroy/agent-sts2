from pathlib import Path
import os,json,hashlib,subprocess,time,fcntl,traceback
R=Path('/home/dw/Projects/agent-sts2');A=R/'.artifacts/ops-issue33-high-20261022';M=R/'paper/materials/20261022-issue33-high-ops';P=json.loads((A/'prepared.json').read_text());W=Path(P['worktree']);locks=[];status={}
def now():return subprocess.check_output(['date','-Is'],text=True).strip()
def save():
 b=(json.dumps(status,ensure_ascii=False,indent=2)+'\n').encode()
 for p in [A/'checks.json',M/'checks.json']:
  q=p.with_suffix('.tmp');q.write_bytes(b);os.replace(q,p)
def manifest():
 names=subprocess.check_output(['git','ls-files','-z','agent','ops','learner','eval','knowledge'],cwd=W).decode().split('\0');out=[]
 for p in sorted(set(names)):
  f=W/p
  if f.is_file() and not f.is_symlink() and not f.name.startswith('.env') and not p.startswith(('ops/instance-binding','ops/autoplay.log','ops/refresh.log','ops/restarts.log','ops/win-notified','ops/inbox-dev.md')):
   b=f.read_bytes();out.append(dict(path=p,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
 return out
try:
 fd=os.open(A/'once.guard',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
 status=dict(state='queued-original-locks',started_at=now(),runner_pid=os.getpid(),runner_start=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],worktree=str(W),source_tree=P['tree'],base=P['base'],nice=os.getpriority(os.PRIO_PROCESS,0),steps=[],full_started=False,new_model_API_MC_game_actions=0);save()
 for p in ['ops/codex-ops/ordinary-close.lock','ops/codex-ops/paper-dataset.lock','ops/codex-ops/tick-snapshot.lock','ops/live-merge.lock']:
  f=(R/p).open('a');fcntl.flock(f,fcntl.LOCK_EX);locks.append(f)
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=R/'.worktrees/live',text=True).strip()==P['base'],'live changed; rebase required'
 for row in P['paths']:assert hashlib.sha256((W/row['path']).read_bytes()).hexdigest()==row['sha256']
 active=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   if (p/'comm').read_text().strip()=='node' and b'vitest' in (p/'cmdline').read_bytes() and str((p/'cwd').resolve()).startswith(str(R)):active.append(int(p.name))
  except (OSError,RuntimeError):pass
 assert not active,active
 with (R/'ops/knowledge-refresh.lock').open('a') as k:
  fcntl.flock(k,fcntl.LOCK_EX)
  for f in sorted((R/'.worktrees/live/knowledge').rglob('*.json')):
   q=W/f.relative_to(R/'.worktrees/live');q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(f.read_bytes())
 before=manifest();(A/'inputs-before.json').write_text(json.dumps(before,indent=2)+'\n');status.update(state='running',input_count=len(before));save()
 env={**os.environ,'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','PATH':str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH','')}
 jobs=[('rebuild',['python3','agent/tools/build-external-stats.py','--check'],W),('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),('full',['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(A/'vitest.json')],W/'agent')]
 for name,cmd,cwd in jobs:
  step=dict(name=name,command=cmd,started_at=now());status['steps'].append(step);start=time.monotonic()
  with (A/(name+'.log')).open('wb') as out:
   child=subprocess.Popen(['nice','-n','19',*cmd],cwd=cwd,env=env,stdout=out,stderr=subprocess.STDOUT);step['pid']=child.pid;status['full_started']=status['full_started'] or name=='full';save();step['exit_code']=child.wait()
  step['seconds']=time.monotonic()-start;save()
  if step['exit_code']:raise RuntimeError(name+' failed; retain original log')
 after=manifest();(A/'inputs-after.json').write_text(json.dumps(after,indent=2)+'\n');assert before==after,'fixed inputs changed'
 status.update(state='passed-await-original-publication',ended_at=now());save()
except Exception as error:
 status.update(state='blocked-or-failed-retain-live',ended_at=now(),error=type(error).__name__,message=str(error));save();(A/'error.txt').write_text(traceback.format_exc())
finally:
 for f in reversed(locks):fcntl.flock(f,fcntl.LOCK_UN);f.close()
 event=R/'ops/codex-ops/queue'/f'{time.time_ns()}-manual.md';event.write_text('原#33 high窄回补唯一固定宿主检查终局：'+json.dumps(status,ensure_ascii=False)+'；原件paper/materials/20261022-issue33-high-ops/checks.json。这是新三叶源码的检查，非重跑原#33整包；失败留原件/live，不重复full或模型；通过后沿原锁、实际最新知识/绑定门、自测提交、自然新局发布并核原生high。不得热切当前局，不代#33整包完成。\n')

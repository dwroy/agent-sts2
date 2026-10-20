from pathlib import Path
import os,json,hashlib,datetime,subprocess,time,fcntl
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-r404-wiring-joint-20261020';w=r/'.worktrees/ops-r404-wiring-joint-20261020';frozen=json.load(open(a/'frozen.json'));now=lambda:datetime.datetime.now().astimezone().isoformat()
def atomic(p,d):
 q=p.with_suffix(p.suffix+'.tmp');q.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');q.replace(p)
lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
assert subprocess.check_output(['git','-C',str(r/'.worktrees/live'),'rev-parse','HEAD'],text=True).strip()==frozen['actual_live_base']
assert subprocess.check_output(['git','-C',str(w),'write-tree'],text=True).strip()==frozen['staged_tree']
for x in frozen['knowledge_snapshot']:assert hashlib.sha256((r/'.worktrees/live'/x['path']).read_bytes()).hexdigest()==x['sha256']
active=[]
for p in Path('/proc').iterdir():
 if not p.name.isdigit():continue
 try:
  comm=(p/'comm').read_text();cmd=(p/'cmdline').read_bytes();cwd=(p/'cwd').resolve()
  if 'node' in comm and b'vitest' in cmd and str(cwd).startswith(str(r)):active.append(int(p.name))
 except (OSError,RuntimeError):pass
assert not active,active
index=subprocess.check_output(['git','-C',str(w),'rev-parse','--path-format=absolute','--git-path','index'],text=True).strip()
def manifest():
 args=['git','ls-files','-z','agent/src','agent/tools','agent/tests','agent/package.json','agent/package-lock.json','agent/tsconfig*.json','agent/vitest*','learner/*.ts','learner/*.py','learner/lib','learner/tasks','ops/*.py','ops/*.sh','ops/codex','ops/tests','eval/*.py','eval/*.ts','eval/cost-config.json','knowledge'];names=subprocess.check_output(args,cwd=w,env={**os.environ,'GIT_INDEX_FILE':index,'GIT_OPTIONAL_LOCKS':'0'}).decode().split('\0');rows=[]
 for n in sorted(set(names)):
  if not n or Path(n).name.startswith('.env'):continue
  p=w/n
  if p.is_file() and not p.is_symlink():
   b=p.read_bytes();rows.append(dict(path=n,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
 return rows
before=manifest();raw=(json.dumps(before,ensure_ascii=False,indent=2)+'\n').encode();(a/'host-inputs-before.json').write_bytes(raw);status=dict(request=frozen['request'],state='running',started_at=now(),runner_pid=os.getpid(),runner_start_ticks=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],nice=os.getpriority(os.PRIO_PROCESS,0),worktree=str(w),actual_live_base=frozen['actual_live_base'],allocation_base=frozen['allocation_base'],staged_tree=frozen['staged_tree'],source_count=5,knowledge_count=frozen['knowledge_snapshot_count'],input_count=len(before),input_sha256=hashlib.sha256(raw).hexdigest(),steps=[],held_original_lock='ops/live-merge.lock',window_preflight_other_vitest_PIDs=active,no_actual_live_or_active_actor_change=True);atomic(a/'host-status.json',status);atomic(a/'native-start-readback.json',status)
env=dict(os.environ);env['PATH']=str(Path.home()/'.local/node/bin')+os.pathsep+env.get('PATH','')
for k in ['TMPDIR','TMP','TEMP']:env.pop(k,None)
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS']:env[k]='1'
for name,cmd in [('tsc',['npx','tsc','-p','tsconfig.json','--noEmit']),('full',['node','tools/with-temp.mjs','node_modules/vitest/vitest.mjs','run','--maxWorkers=1'])]:
 step=dict(name=name,command=cmd,started_at=now(),log=str(a/(name+'.log')));status['steps'].append(step);start=time.monotonic()
 with (a/(name+'.log')).open('wb') as out:
  child=subprocess.Popen(cmd,cwd=w/'agent',env=env,stdout=out,stderr=subprocess.STDOUT);step['pid']=child.pid;atomic(a/'host-status.json',status);atomic(a/'native-start-readback.json',status);step['exit_code']=child.wait()
 b=(a/(name+'.log')).read_bytes();step.update(ended_at=now(),seconds=time.monotonic()-start,log_bytes=len(b),log_sha256=hashlib.sha256(b).hexdigest());atomic(a/'host-status.json',status)
 if step['exit_code']:break
after=manifest();atomic(a/'host-inputs-after.json',after);same=before==after;status.update(ended_at=now(),input_unchanged=same,combined_full_rc=next((x['exit_code'] for x in status['steps'] if x['exit_code']),0) if same else 2);status['state']='passed-await-original-ops-next-natural-boundary-exact-publication-consumer-and-reward-readback' if status['combined_full_rc']==0 else 'failed-retain-fixed-input-and-current-R404-report-original-owner-watcher';fcntl.flock(lock,fcntl.LOCK_UN);lock.close();status['original_full_window_lock_released']=True;atomic(a/'host-status.json',status)
msg=f"原Claude22:05/W4 R404奖励Boss/实耗时五叶精确actual-live组合终局：request={status['request']}，state={status['state']}，combined_full_rc={status['combined_full_rc']}；冻结live={status['actual_live_base']}、tree={status['staged_tree']}、{status['knowledge_count']}知识/{status['input_count']}输入SHA={status['input_sha256']}，input_unchanged={same}。原件{a/'host-status.json'}及host-inputs-before/after、tsc/full.log。仅source903fbfabb五叶，无整main/base/805/新工厂依赖；原owner原5红/定向96过与扫描原件保留。nice19/ionice3/单worker/主盘短TMPDIR/原阈值，原live-merge锁持有至终局后已释放，未改live/actor/开关/STOP，未API/model/生产dataset/模拟批次。先核PID退出/固定输入身份，绿后按原授权在自然开局边界保最新live知识窄集成、实际消费者及奖励题/新release双通知/下一局配置真实动作；失败保原件告原W4/watcher/Claude，不重复未变源full，不代ACK/宽父/恢复Regent。"
queue=r/'ops/codex-ops/queue';queue.mkdir(exist_ok=True);event=queue/f'{time.time_ns()}-manual.md';event.write_text(msg+'\n');status['terminal_event_path']=str(event);atomic(a/'host-status.json',status)

from pathlib import Path
import os,json,hashlib,datetime,subprocess,time
r=Path('/home/dw/Projects/agent-sts2'); a=r/'.artifacts/ops-five-item-final-20261020-1912'; w=r/'.worktrees/ops-five-item-live-20261020-1855'
frozen=json.loads((a/'frozen.json').read_text()); now=lambda:datetime.datetime.now().astimezone().isoformat()
def atomic(p,d):
 q=p.with_suffix(p.suffix+'.tmp');q.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');q.replace(p)
def manifest():
 args=['git','ls-files','-z','agent/src','agent/tools','agent/tests','agent/package.json','agent/package-lock.json','agent/tsconfig*.json','agent/vitest*','learner/*.ts','learner/*.py','learner/lib','learner/tasks','ops/*.py','ops/*.sh','ops/codex','ops/tests','eval/*.py','eval/*.ts','eval/cost-config.json','knowledge']
 names=subprocess.check_output(args,cwd=w,env={**os.environ,'GIT_INDEX_FILE':str(r/'.artifacts/ops-five-item-joint-20261020/candidate-index'),'GIT_OPTIONAL_LOCKS':'0'}).decode().split('\0');rows=[]
 for name in sorted(set(names)):
  if not name or Path(name).name.startswith('.env'):continue
  p=w/name
  if not p.is_file() or p.is_symlink():continue
  b=p.read_bytes();rows.append({'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 return rows
before=manifest();raw=(json.dumps(before,ensure_ascii=False,indent=2)+'\n').encode();(a/'host-inputs-before.json').write_bytes(raw)
status={'request':'roy-all-five-exact-live-joint-20261020-1912','state':'running','started_at':now(),'runner_pid':os.getpid(),'runner_start_ticks':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],'nice':os.getpriority(os.PRIO_PROCESS,0),'worktree':str(w),'allocation_base':frozen['allocation_base'],'actual_live_base':frozen['actual_live_base'],'staged_tree':frozen['staged_tree'],'source_count':frozen['source_count'],'knowledge_count':frozen['knowledge_snapshot_count'],'input_count':len(before),'input_sha256':hashlib.sha256(raw).hexdigest(),'steps':[],'no_actual_live_or_active_actor_change':True}
atomic(a/'host-status.json',status);atomic(a/'native-start-readback.json',status)
env=dict(os.environ);env['PATH']=str(Path.home()/'.local/node/bin')+os.pathsep+env.get('PATH','')
for k in ['TMPDIR','TMP','TEMP']:env.pop(k,None)
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS']:env[k]='1'
for name,cmd in [('tsc',['npx','tsc','-p','tsconfig.json','--noEmit']),('full',['node','tools/with-temp.mjs','node_modules/vitest/vitest.mjs','run','--maxWorkers=1'])]:
 step={'name':name,'command':cmd,'started_at':now(),'log':str(a/(name+'.log'))};status['steps'].append(step);start=time.monotonic()
 with (a/(name+'.log')).open('wb') as out:
  child=subprocess.Popen(cmd,cwd=w/'agent',env=env,stdout=out,stderr=subprocess.STDOUT);step['pid']=child.pid;atomic(a/'host-status.json',status);atomic(a/'native-start-readback.json',status);step['exit_code']=child.wait()
 b=(a/(name+'.log')).read_bytes();step.update(ended_at=now(),seconds=time.monotonic()-start,log_bytes=len(b),log_sha256=hashlib.sha256(b).hexdigest());atomic(a/'host-status.json',status)
 if step['exit_code']:break
after=manifest();(a/'host-inputs-after.json').write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n');same=before==after
status.update(ended_at=now(),input_unchanged=same,combined_full_rc=(next((s['exit_code'] for s in status['steps'] if s['exit_code']),0) if same else 2));status['state']='passed-await-original-ops-all-five-live-publication-consumer-readback-and-release' if status['combined_full_rc']==0 else 'failed-retain-fixed-input-no-live-publication';atomic(a/'host-status.json',status)
msg=f"Roy全部五项唯一精确联合终局：request={status['request']}，state={status['state']}，combined_full_rc={status['combined_full_rc']}；固定tree={status['staged_tree']}、{status['input_count']}输入SHA={status['input_sha256']}，input_unchanged={same}。原件{a/'host-status.json'}及host-inputs-before/after、tsc/full.log。只含实际live64上的infra/蛇咬/W4严格战胜三选一A/B及input接线/W8方向off搭车和严格路由/COMBAT off配置，保护458知识，未整main/805。先核终局PID退出；完整0后原锁核实际live知识及源码漂移、一次精确发布、五项消费者和配置读回/登记release双通知，再由ops核原JWJ终局STOP并移除开局；任一失败保持等待、写inbox并告watcher/Claude，由Claude与Roy决定，不排除失败项部分开局。旧39部分绿/失败/原源证据保留，不代ACK/科学父验收或恢复Regent。"
queue=r/'ops/codex-ops/queue';queue.mkdir(exist_ok=True);event=queue/f'{time.time_ns()}-manual.md';event.write_text(msg+'\n');status['terminal_event_path']=str(event);atomic(a/'host-status.json',status)

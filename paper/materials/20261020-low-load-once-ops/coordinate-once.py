from pathlib import Path
import os,json,fcntl,select,datetime,hashlib,subprocess,time,runpy
R=Path('/home/dw/Projects/agent-sts2'); A=R/'.artifacts/ops-five-item-low-load-20261020'; D=R/'ops/codex-ops'
owner=json.loads((A/'resource-owner.json').read_text()); held=[]; pins=[]; full_started=False; full_finished=False
now=lambda:datetime.datetime.now().astimezone().isoformat()
def save(x):
 t=A/'coordinator-status.tmp';t.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');t.replace(A/'coordinator-status.json')
def queued(message):
 q=D/'queue'/f'{time.time_ns()}-manual.md';q.write_text(message+'\n')
def cpu():
 v=list(map(int,Path('/proc/stat').read_text().splitlines()[0].split()[1:]));return {'total':sum(v),'idle':v[3]+v[4],'at_ns':time.time_ns()}
state={'request':owner['request'],'runner_pid':os.getpid(),'runner_start_ticks':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],'started_at':now(),'phase':'pin-original-inflight-tasks-and-wait-existing-heavy-locks','no_sleep_poll_loop_timer_model_or_new_learner':True,'original_batches':owner['original_running_batches_to_finish_naturally'],'full_started':False};save(state)
try:
 for row in owner['original_running_batches_to_finish_naturally']:
  p=Path('/proc',str(row['pid']))
  if p.exists():
   assert p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==row['start_ticks'],'original PID identity changed'
   pins.append(os.pidfd_open(row['pid']))
 for name in ['ordinary-close.lock','paper-dataset.lock','tick-snapshot.lock']:
  f=(D/name).open('a');held.append(f);state['waiting_original_heavy_lock']=name;save(state)
  # A blocking kernel lock waits for an already-running writer; no polling or sleep.
  fcntl.flock(f,fcntl.LOCK_EX)
 state.update(phase='wait-original-batches-natural-exit',waiting_original_heavy_lock=None,held_existing_locks=['ordinary-close.lock','paper-dataset.lock','tick-snapshot.lock']);save(state)
 for fd in pins: select.select([fd],[],[])
 state.update(original_pinned_PIDs_naturally_exited=True,phase='verify-frozen-candidate-and-low-load');save(state)
 c1=cpu(); w=R/'.worktrees/ops-five-item-live-20261020-1855';env={**os.environ,'GIT_INDEX_FILE':str(R/'.artifacts/ops-five-item-joint-20261020/candidate-index'),'GIT_OPTIONAL_LOCKS':'0'}
 tree=subprocess.check_output(['git','write-tree'],cwd=w,env=env).decode().strip();assert tree=='496948c2f9a9fb4d45056aa2394940cb81e0862b'
 before=(R/'.artifacts/ops-five-item-repaired-20261020-1956/host-inputs-before.json').read_bytes();assert hashlib.sha256(before).hexdigest()=='17053663e821d3a754b6d84f4a5dc2987c1ec958a64d1295b6cd04cfeb3e1775'
 for row in json.loads(before):
  raw=(w/row['path']).read_bytes();assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'],row['path']
 batches=json.loads((D/'learn.json').read_text()).get('batches',{});active=[{'batch':bid,'pid':b.get('pid')} for bid,b in batches.items() if b.get('state')=='running' and Path('/proc',str(b.get('pid'))).exists()];assert not active,('existing tasks remain',active)
 marker=D/'ACCOUNT_DRAIN';assert hashlib.sha256(marker.read_bytes()).hexdigest()==owner['marker_sha256'],'owned admission marker changed'
 assert (R/'ops/STOP').is_file(),'STOP must remain during check'
 c2=cpu();load=os.getloadavg();ncpu=len(os.sched_getaffinity(0));busy=1-(c2['idle']-c1['idle'])/max(1,c2['total']-c1['total']);load_limit=max(2,ncpu/3)
 pre={'at':now(),'tree':tree,'input_count':len(json.loads(before)),'input_sha256':hashlib.sha256(before).hexdigest(),'old_tasks_finished':True,'held_heavy_locks':state['held_existing_locks'],'affinity_cpus':ncpu,'loadavg':load,'max_load1_for_this_preflight':load_limit,'CPU_busy_short_interval':busy,'max_CPU_busy_short_interval':.20,'CPU_sample_interval_seconds':(c2['at_ns']-c1['at_ns'])/1e9,'new_learning_admission_marker_SHA_verified':True,'lower_load_gate':load[0]<=load_limit and busy<=.20};(A/'preflight.json').write_text(json.dumps(pre,ensure_ascii=False,indent=2)+'\n')
 if not pre['lower_load_gate']:raise RuntimeError('low-load gate not yet met; no full started, retain resource drain and wait next original ops event')
 os.close(os.open(A/'same-input-full-started-once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600));full_started=True;state.update(phase='one-authorized-identical-input-tsc-full-running',full_started=True,preflight=pre);save(state)
 runpy.run_path(str(A/'run-exact-host.py'),run_name='__main__');full_finished=True;state.update(phase='original-full-terminal-resource-window-closing',full_terminal=True,ended_at=now());save(state)
except Exception as e:
 state.update(phase='attention-retain-original-input-and-resource-admission-hold',reason=f'{type(e).__name__}: {e}',full_started=full_started,ended_at=now());save(state)
 queued('Roy20:5x同源低负载一次复验准入停点：'+str(A/'coordinator-status.json')+'；'+state['reason']+'。原tree496/输入1705/STOP保留，未另派学习者或改阈值；先核本原件，不重复已开始full。')
finally:
 for fd in pins:os.close(fd)
 for f in reversed(held):f.close()
 if full_finished:
  marker=D/'ACCOUNT_DRAIN'
  if marker.exists() and hashlib.sha256(marker.read_bytes()).hexdigest()==owner['marker_sha256'] and marker.stat().st_ino==owner['marker_identity']['ino']:
   marker.unlink();state['owned_new_dispatch_hold_released_after_terminal']=True
  else:state['owned_new_dispatch_hold_release_pending_identity_review']=True
 else:state['owned_new_dispatch_hold_retained']=True
 state['heavy_writer_locks_released']=True;save(state)

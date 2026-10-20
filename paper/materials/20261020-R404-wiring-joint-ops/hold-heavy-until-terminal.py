from pathlib import Path
import os,fcntl,json,datetime,select
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-r404-wiring-joint-20261020';pid=1111701;ticks='139884141';now=lambda:datetime.datetime.now().astimezone().isoformat()
def save(s):
 p=a/'heavy-admission-hold.json';q=p.with_suffix('.json.tmp');q.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');q.replace(p)
assert Path(f'/proc/{pid}/stat').read_text().rsplit(')',1)[1].split()[19]==ticks
watch=os.pidfd_open(pid);state=dict(authorization='Claude22:4x/Roy docs/v6-plan.md §12 at0ee818a8f',started_at=now(),pid=os.getpid(),start_ticks=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],watched_full_runner=pid,watched_runner_start_ticks=ticks,held=[],waiting_lock=None,learning_dispatch='normal; no ACCOUNT_DRAIN/PAUSE',phase='acquire-original-heavy-writer-locks-no-new-heavy-tasks');save(state);held=[]
try:
 for name in ['ordinary-close.lock','paper-dataset.lock','tick-snapshot.lock']:
  state['waiting_lock']=name;save(state);f=(r/'ops/codex-ops'/name).open('a');fcntl.flock(f,fcntl.LOCK_EX);held.append(f);state['held'].append(name);save(state)
 state.update(phase='original-heavy-writer-locks-held-until-known-P0-runner-exit',waiting_lock=None);save(state)
 select.select([watch],[],[])
 state.update(phase='known-P0-runner-exited-release-own-heavy-writer-locks',ended_at=now());save(state)
finally:
 os.close(watch)
 for f in reversed(held):fcntl.flock(f,fcntl.LOCK_UN);f.close()
 state.update(heavy_locks_released=True,released_at=now());save(state)

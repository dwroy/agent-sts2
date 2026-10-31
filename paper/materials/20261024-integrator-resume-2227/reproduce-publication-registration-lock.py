from pathlib import Path
import tempfile,subprocess,fcntl,time,json,os
R=Path('/home/dw/Projects/agent-sts2');W=R/'.worktrees/integrator57-20261024-2230';M=R/'paper/materials/20261024-integrator-resume-2227'
source=(W/'ops/codex-ops-learner.sh').read_text();begin=source.index('if [ "$audit_ready" = 1 ] && [ "$check_admission" = 1 ]; then');end=source.index('\nfi',begin)+3;block=source[begin:end];assert '8> "$DIR/learn.lock"' in block
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);dest=root/'state';dest.mkdir();ops=root/'ops';ops.mkdir();hit=root/'helper-called';(ops/'publication_gate.py').write_text('from pathlib import Path\nPath('+repr(str(hit))+').write_text("fixed check reached\\n")\n')
 with (dest/'learn.lock').open('a') as parent,(dest/'batch-registration.lock').open('a') as barrier:
  fcntl.flock(parent,fcntl.LOCK_EX);fcntl.flock(barrier,fcntl.LOCK_EX);fcntl.flock(barrier,fcntl.LOCK_UN)
  env={**os.environ,'DIR':str(dest),'OPS':str(ops),'ROOT':str(root),'audit_ready':'1','check_admission':'1','batch':'20260101-000001-strategy-proposal','worktree':str(root),'learner_merge':'no','out':str(root/'out'),'err':str(root/'err')}
  start=time.monotonic();p=subprocess.Popen(['bash','-c',block],env=env);time.sleep(.3);before=dict(child_running=p.poll() is None,helper_called=hit.exists(),elapsed=time.monotonic()-start)
  assert before['child_running'] and not before['helper_called'];fcntl.flock(parent,fcntl.LOCK_UN);rc=p.wait(timeout=5);assert rc==0 and hit.exists()
 result=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),source57='ce3e9b86092a3050e91dd51eab9d1bfd08f0b995',exact_new_admission_block=block,released_batch_barrier=True,parent_global_lock_retained=True,before_parent_release=before,after_parent_release=dict(rc=rc,helper_called=True),finding='New #57 admission check still waits for global learn.lock even after the #56 per-batch registration barrier is released. A parent validating subsequent sources can again hold this wrapper until the original 120-second timeout.',scope='fixed real lock and exact submitted shell block with helper observation stub; no model or production state',full_runs=0,model_calls=0)
 (M/'publication-registration-lock-reproduction.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='exact_new_admission_block'}))

from pathlib import Path
import subprocess,json,hashlib,fcntl
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue63-combination-integrator';Q=R/'paper/materials/20261025-issue62-combination-integrator'
sha=lambda b:hashlib.sha256(b).hexdigest();a=json.loads((M/'assembly.json').read_text());p=json.loads((Q/'terminal-readback.json').read_text());assert p['original_worker_exited'] and p['original_check_lock_available'] and p['full_result']['failed']==0
assert not (A/'full.once').exists()
def git(w,*args):return subprocess.check_output(['git','-C',str(w),*args],stderr=subprocess.PIPE)
locks=[]
try:
 for n in ('ops/integrator-full-check.lock','ops/knowledge-refresh.lock','ops/live-merge.lock'):
  f=(R/n).open('a');fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);locks.append(f)
 roots=json.loads((M/'root-preimages.json').read_text());changed=[x['path'] for x in roots if not (R/x['path']).is_file() or sha((R/x['path']).read_bytes())!=x['sha256']];assert not changed,('actual ROOT inputs changed; reassemble before checking',changed)
 L=R/'.worktrees/live';G=Path(a['game_worktree']);W=Path(a['worktree']);accepted={'agent/src/reflex/combat-plan.ts','agent/tests/silent-paels-legion.test.ts','agent/tests/silent-paels-legion-evidence.json'}
 live=git(L,'rev-parse','HEAD').decode().strip();assert live==a['live'],('actual LIVE changed; reassemble',live)
 assert git(G,'rev-parse','HEAD').decode().strip()==a['runtime_anchor'] and git(G,'write-tree').decode().strip()==a['runtime_tree']
 for n in git(L,'ls-files','agent/src').decode().splitlines():assert (G/n).read_bytes()==(R/n if n in accepted else L/n).read_bytes(),n
 for n in accepted:assert (G/n).read_bytes()==(R/n).read_bytes(),n
 counts={}
 for label,base,file in [('root',W,'inputs-before.json'),('runtime',G,'runtime-inputs-before.json'),('dependencies',(W/'agent/node_modules').resolve(),'dependencies-before.json')]:
  xs=json.loads((A/file).read_text());diff=[x['path'] for x in xs if sha((base/x['path']).read_bytes())!=x['sha256']];assert not diff,(label,diff);counts[label]=len(xs)
 fixture='paper/materials/issue29-brain-speed/results.jsonl';assert (R/fixture).read_bytes()==(W/fixture).read_bytes()==git(R,'show',a['developer_base']+':'+fixture)
 result=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),issue62_terminal_sha256=sha((Q/'terminal-readback.json').read_bytes()),actual_root_inputs_unchanged=len(roots),actual_main=git(R,'rev-parse','HEAD').decode().strip(),actual_live=live,original59_runtime_image_unchanged=True,original_issue29_fixture_sha256=sha((W/fixture).read_bytes()),isolated_inputs=counts,full_started=False,production_operations=0)
 (M/'fresh-admission.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:
 for f in reversed(locks):f.close()

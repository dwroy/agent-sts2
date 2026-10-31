from pathlib import Path
import subprocess,json,hashlib,os,fcntl
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent
M=R/'paper/materials/20261025-issue63-combination-integrator';W=R/'.worktrees/integrator63-combination-20261025'
P=R/'paper/materials/20261025-issue59-production-trap-combination-integrator';O=json.loads((P/'assembly.json').read_text());G=Path(O['game_worktree']);L=R/'.worktrees/live'
D='f95114df313e4e2b65b8acd5fc5339cc46a2fbae';B='062cd855366bd0a8d3f4f8b61286e98990db4058'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None,env=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def put(w,n,b):p=w/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
M.mkdir(exist_ok=False);locks=[]
try:
 for n in ('ops/knowledge-refresh.lock','ops/live-merge.lock'):
  f=(R/n).open('a');fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);locks.append(f)
 main=git(R,'rev-parse','HEAD').decode().strip();live=git(L,'rev-parse','HEAD').decode().strip()
 assert git(W,'rev-parse','HEAD').decode().strip()==main
 assert live==O['live'] and git(G,'rev-parse','HEAD').decode().strip()==O['runtime_anchor']
 assert git(G,'write-tree').decode().strip()==O['runtime_tree']
 # Reuse only the immutable, unchanged original LIVE compatibility image; no old test result is reused.
 runtime=json.loads((R/'.artifacts/integrator59-production-trap-combination-20261025/runtime-inputs-before.json').read_text())
 for x in runtime:assert sha((G/x['path']).read_bytes())==x['sha256'],x['path']
 accepted={'agent/src/reflex/combat-plan.ts','agent/tests/silent-paels-legion.test.ts','agent/tests/silent-paels-legion-evidence.json'}
 for n in git(L,'ls-files','agent/src').decode().splitlines():assert (G/n).read_bytes()==(R/n if n in accepted else L/n).read_bytes(),n
 for n in accepted:assert (G/n).read_bytes()==(R/n).read_bytes(),n
 paths=git(R,'diff','--name-only',B,D).decode().splitlines();merged={};leaves=[]
 for n in paths:
  b=git(R,'show',D+':'+n);old=subprocess.run(['git','-C',str(R),'show',B+':'+n],capture_output=True);pre=(R/n).read_bytes() if (R/n).exists() else None
  if n=='paper/materials/decision-log.md':
   assert b.startswith(old.stdout);addition=b[len(old.stdout):];current=git(R,'show',main+':'+n);assert addition not in current;b=current+addition
  elif old.returncode==0:assert pre==old.stdout,('actual ROOT overlap',n)
  else:assert pre is None,('new file present',n)
  merged[n]=b;leaves.append(dict(path=n,preimage_sha256=sha(pre) if pre is not None else None,integrated_sha256=sha(b),bytes=len(b),scope='host ROOT/actual OPS verifier pair' if n in ['ops/learner_tabs.py','ops/learner_tui.py'] else 'ROOT test/documentation only'))
 oldroot=json.loads((R/'paper/materials/20261025-issue62-combination-integrator/root-preimages.json').read_text());names={x['path'] for x in oldroot};names.update(n for n in paths if n.startswith(('ops/','docs/')))
 root=[]
 for n in sorted(names):
  if (R/n).is_file():
   b=(R/n).read_bytes();root.append(dict(path=n,bytes=len(b),sha256=sha(b)));put(W,n,b)
 for n,b in merged.items():put(W,n,b)
 fixture='paper/materials/issue29-brain-speed/results.jsonl';assert (W/fixture).read_bytes()==git(R,'show',B+':'+fixture)
 inputs=[dict(path=n,bytes=(W/n).stat().st_size,sha256=sha((W/n).read_bytes())) for n in sorted(names)]
 deps=json.loads((R/'.artifacts/integrator62-combination-20261025/dependencies-before.json').read_text());node=(W/'agent/node_modules').resolve()
 for x in deps:assert sha((node/x['path']).read_bytes())==x['sha256'],x['path']
 scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(merged.values()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});(M/'delivery-gitleaks.log').write_bytes(scan.stdout+scan.stderr);assert scan.returncode==0
 env={**os.environ,'GIT_INDEX_FILE':str(A/'candidate.index')};assert not Path(env['GIT_INDEX_FILE']).exists();git(R,'read-tree',main,env=env)
 for n,b in merged.items():
  blob=git(R,'hash-object','-w','--stdin',data=b).decode().strip();git(R,'update-index','--add','--cacheinfo',f'100644,{blob},{n}',env=env)
 tree=git(R,'write-tree',env=env).decode().strip();candidate=git(R,'commit-tree',tree,'-p',main,data=b'Integrate registered-account learner sealing compatibility (#63)\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\nAgent: codex@xdwin1\n').decode().strip()
 assert set(git(R,'diff','--name-only',main,candidate).decode().splitlines())==set(paths)
 git(W,'read-tree',candidate);git(W,'add','--sparse','-f','--',*sorted(names));vt=git(W,'write-tree').decode().strip();anchor=git(W,'commit-tree',vt,'-p',candidate,data=b'Freeze actual ROOT inputs for issue63 independent combination\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(W,'update-ref','HEAD',anchor,main)
 (W/'.worktrees').mkdir(exist_ok=True);(W/'.worktrees/live').symlink_to(G)
 for n,x in [('inputs-before.json',inputs),('dependencies-before.json',deps),('runtime-inputs-before.json',runtime)]:save(A/n,x)
 for n,x in [('source-inputs.json',inputs),('root-preimages.json',root),('runtime-inputs.json',runtime),('delivery-leaves.json',leaves)]:save(M/n,x)
 marker=json.loads((R/'ops/codex-ops/PUBLICATION_ADMISSION.json').read_text());safe_marker={k:marker.get(k) for k in ('schema','scope','owner','phase','pid')}
 result=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),worktree=str(W),game_worktree=str(G),main=main,live=live,developer=D,developer_base=B,candidate_commit=candidate,candidate_tree=tree,validation_anchor=anchor,validation_tree=vt,runtime_anchor=O['runtime_anchor'],runtime_tree=O['runtime_tree'],input_count=len(inputs),dependencies=len(deps),runtime_input_count=len(runtime),candidate_paths=paths,original59_gate=safe_marker,new_full_runs=0,production_or_source_mutations=0,issue62_included=False,issue64_included=False,scope='isolated host-only seal repair; current62 check unmodified; original59 transaction retained')
 save(M/'assembly.json',result);(M/'delivery-exact.patch').write_bytes(git(R,'diff','--binary',main,candidate));print(json.dumps(result))
finally:
 for f in reversed(locks):f.close()

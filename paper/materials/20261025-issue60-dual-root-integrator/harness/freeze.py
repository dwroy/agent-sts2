from pathlib import Path
import subprocess,json,hashlib,os,fcntl
R=Path.cwd();A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue60-dual-root-integrator';M.mkdir(exist_ok=True)
H=R/'.worktrees/integrator60-dual-root-20261025';G=R/'.worktrees/integrator60-runtime-closure-20261025';L=R/'.worktrees/live'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None):return subprocess.check_output(['git','-C',str(w),*args],input=data)
def save(name,body):(M/name).write_text(json.dumps(body,ensure_ascii=False,indent=2)+'\n')
locks=[]
try:
 for name in ('ops/integrator-full-check.lock','ops/knowledge-refresh.lock','ops/live-merge.lock'):
  f=(R/name).open('a');fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);locks.append(f)
 main=git(R,'rev-parse','HEAD').decode().strip();live=git(L,'rev-parse','HEAD').decode().strip()
 assert main=='21e8bb09def1f59129b3646a9d6d07be05e2d177' and live=='d0d9da10063c623f3036a6910e83f4ae3c30c06e'
 assert git(H,'rev-parse','HEAD').decode().strip()==main
 assert git(G,'rev-parse','HEAD').decode().strip()=='caa480132a67dc94b24be231d889cf37aa7b67d1'
 manifest=json.loads((R/'paper/materials/20261025-issue60-runtime-closure-integrator/deployment-manifest.json').read_text())
 names=set()
 for n in git(R,'ls-files','-z','--','agent','learner','ops','knowledge','eval','docs').decode().split('\0'):
  if not n or n.startswith(('ops/codex-ops/','learner/runs/','ops/learner/')):continue
  p=R/n
  if not p.is_file() or p.is_symlink() or p.suffix in ('.log','.sqlite','.db') or p.name.startswith('.env') or n in ('ops/win-notified','ops/inbox-dev.md','ops/refresh.log','ops/restarts.log','ops/autoplay.log'):continue
  # Copy fixed source/tests/data, never account homes or operational task state.
  b=p.read_bytes();dest=H/n;dest.parent.mkdir(parents=True,exist_ok=True);assert not dest.is_symlink();dest.write_bytes(b);os.chmod(dest,p.stat().st_mode&0o777);names.add(n)
 old_inputs=json.loads((R/'.artifacts/integrator60-fixture-composition-20261025-0306/inputs-before.json').read_text())
 for x in old_inputs:
  n=x['path']
  if not n.startswith('paper/'):continue
  b=(R/n).read_bytes();dest=H/n;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b);names.add(n)
 # Actual game postimage is the old frozen production image; compare every production source leaf.
 old_src={str(p.relative_to(G)):sha(p.read_bytes()) for p in (G/'agent/src').rglob('*') if p.is_file()}
 live_src={str(p.relative_to(L)):sha(p.read_bytes()) for p in (L/'agent/src').rglob('*') if p.is_file()}
 game_rows=[];host_rows=[]
 for x in manifest['files']:
  n=x['path']
  if x['deployment_root']=='live':
   assert sha((G/n).read_bytes())==x['sha256'];pre=(L/n).read_bytes() if (L/n).exists() else None
   assert (sha(pre) if pre is not None else None)==x['live_preimage_sha256']
   game_rows.append({**x,'actual_postimage_sha256':sha((G/n).read_bytes())})
   if n.startswith('agent/src/'):live_src[n]=x['sha256']
  else:
   b=(R/n).read_bytes();assert (H/n).read_bytes()==b
   host_rows.append({**x,'actual_host_sha256':sha(b),'formal_same':sha(b)==x['formal_sha256'],'override':'#27 high handoff source 9f25e8b2' if n=='ops/tests/test_llm_handoff.py' else None})
 assert old_src==live_src
 # Frozen ROOT has a distinct LIVE; production paths are never linked into this fixture.
 (H/'.worktrees').mkdir(exist_ok=True);(H/'.worktrees/live').symlink_to(G)
 inputs=[{'path':n,'bytes':(H/n).stat().st_size,'sha256':sha((H/n).read_bytes())} for n in sorted(names)]
 deps=json.loads((R/'.artifacts/integrator60-fixture-composition-20261025-0306/dependencies-before.json').read_text());node=(H/'agent/node_modules').resolve()
 for d in deps:assert sha((node/d['path']).read_bytes())==d['sha256'],d['path']
 (A/'inputs-before.json').write_text(json.dumps(inputs)+'\n');(A/'dependencies-before.json').write_text(json.dumps(deps)+'\n')
 git(H,'add','--sparse','-f','--',*[x['path'] for x in inputs]);tree=git(H,'write-tree').decode().strip();anchor=git(H,'commit-tree',tree,'-p',main,data=b'Freeze actual ROOT host and separate LIVE issue60 production image\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(H,'update-ref','HEAD',anchor,main)
 assembly={'at':subprocess.check_output(['date','-Is'],text=True).strip(),'worktree':str(H),'game_worktree':str(G),'main':main,'live':live,'anchor':anchor,'validation_tree':tree,'inputs':len(inputs),'dependencies':len(deps),'host_leaves':host_rows,'game_leaves':game_rows,'all_game_production_sources':len(old_src),'game_production_exact_old_full':True,'old_full_scope':'Every game production source leaf matches the old caa480 frozen image. Its 6628 passing tests/2 skips remain valid only for its original profile. New full checks actual current ROOT host input; cross-root fixed probes exercise actual CLI/finish/game readers.','credential_or_production_state_copied':False,'production_mutations':0,'new_full_runs':0}
 save('assembly.json',assembly);save('source-inputs.json',inputs);save('dependency-inputs.json',deps)
 print(json.dumps({k:v for k,v in assembly.items() if k not in ('host_leaves','game_leaves')},ensure_ascii=False))
finally:
 for f in reversed(locks):f.close()

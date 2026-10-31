from pathlib import Path
import subprocess,json,os,hashlib,fcntl
R=Path('/home/dw/Projects/agent-sts2');L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-20-r434-integrator';W=R/'.worktrees/integrator37-20-r434-20261024-1828'
C=json.loads((A/'sources.json').read_bytes());S=C['source37'];S20='403577593891669cd201355b3899a0104d03ed3f';P='070cac9b586767d063ff34434f31a86174b26ab5';base='26215c4ffdd358a46f228c131726e49f3f6401cb'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,stderr=subprocess.PIPE)
def save(n,v):(M/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def row(n,b,**extra):return dict(path=n,bytes=len(b),sha256=sha(b),**extra)
def put(n,b):
 p=W/n;assert not p.is_symlink();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
assert git(W,'rev-parse','HEAD').decode().strip()==base
fiftyone=json.loads((R/'paper/materials/20261024-issue51-speed-ops/source-candidate.json').read_bytes())
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 with(R/'ops/knowledge-refresh.lock').open('a') as kl:
  print('unique check window reserved; waiting for active knowledge refresh transaction',flush=True)
  fcntl.flock(kl,fcntl.LOCK_EX)
  with(R/'ops/live-merge.lock').open('a') as ll:
   fcntl.flock(ll,fcntl.LOCK_EX|fcntl.LOCK_NB)
   os.close(os.open(A/'prepare.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600))
   assert git(L,'rev-parse','HEAD').decode().strip()==base
   hosthead=git(R,'rev-parse','HEAD').decode().strip();knowledge=[]
   for p in sorted((L/'knowledge').rglob('*')):
    if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or 'builders' in p.relative_to(L/'knowledge').parts:continue
    n=str(p.relative_to(L));b=p.read_bytes();put(n,b);knowledge.append(row(n,b))
   names={x['path'] for x in knowledge}
   for p in(W/'knowledge').rglob('*'):
    if p.is_file() and not p.is_symlink() and 'builders' not in p.relative_to(W/'knowledge').parts and '__pycache__' not in p.parts:assert str(p.relative_to(W)) in names,'stale knowledge'
   products=[]
   for x in json.loads((R/'paper/materials/20261024-issue37-runtime-rework-integrator/product-leaves.json').read_bytes()):
    n=x['path'];b=git(R,'show',P+':'+n);assert sha(b)==x['sha256'];assert git(R,'show',hosthead+':'+n)==b;put(n,b);products.append(row(n,b,source=P,before_blob=git(L,'rev-parse',base+':'+n).decode().strip()))
   host=[];tests=[];helpers=[]
   for n in git(R,'ls-files','ops','learner').decode().splitlines():
    p=R/n
    if not p.is_file() or p.is_symlink() or 'codex-ops' in p.parts or 'accounts' in p.parts or p.name.startswith('.env'):continue
    if p.suffix not in ('.py','.sh','.ts') and not(n.startswith('learner/tasks/') and p.suffix=='.md'):continue
    b=p.read_bytes();assert b==git(R,'show',hosthead+':'+n),'dirty host '+n;put(n,b);host.append(row(n,b,source=hosthead))
   for n in git(R,'ls-files','agent/tests').decode().splitlines():
    p=R/n
    if not p.is_file() or p.suffix!='.ts':continue
    b=p.read_bytes()
    if n.endswith('.test.ts'):
     if not any(t in b for t in (b'../ops/',b'../../ops/',b'"ops/',b"'ops/",b'../learner/',b'../../learner/')):continue
     dest=tests
    else:dest=helpers
    assert b==git(R,'show',hosthead+':'+n),'dirty helper '+n;put(n,b);dest.append(row(n,b,source=hosthead))
   n='.agents/board.yaml';b=(R/n).read_bytes();assert b==git(R,'show',hosthead+':'+n);put(n,b);helpers.append(row(n,b,source=hosthead))
   overlays=[]
   for n in C['test37_paths']:
    b=git(R,'show',S+':'+n);put(n,b);overlays.append(row(n,b,source=S,role='test-only-37'))
   for x in json.loads((R/'paper/materials/20261024-issue20-channel-integrator/source-leaves.json').read_bytes()):
    n=x['path'];b=git(R,'show',S20+':'+n);assert sha(b)==x['sha256'];assert git(R,'show',hosthead+':'+n)==git(R,'show',S20+'^:'+n);put(n,b);overlays.append(row(n,b,source=S20,role='issue20'))
   excluded=[]
   for x in fiftyone['leaves']:
    n=x['source_path'];b=git(R,'show',hosthead+':'+n)
    assert (W/n).read_bytes()==b,'old51 must remain baseline: '+n
    assert sha(b)!=x['candidate']['sha256'],'obsolete leaf present: '+n
    excluded.append(row(n,b,excluded_candidate_sha256=x['candidate']['sha256'],baseline_source=hosthead,old51_included=False))
   save('excluded-old51-leaves.json',excluded)
   # Host snapshots record the deployed baseline; overlays separately identify the prospective host.
   save('actual-game-knowledge.json',knowledge);save('host-sources-baseline.json',host);save('host-tests-baseline.json',tests);save('helpers-and-config-baseline.json',helpers);save('product-leaves.json',products);save('source-overlays.json',overlays)
 # Production locks end here. The check lock remains through the isolated freeze.
 fixed=[]
 for x in json.loads((R/'paper/materials/20261024-issue37-r428-integrator/revision5/additional-main-fixed-knowledge.json').read_bytes()):
  n=x['path']
  if n in names:continue
  b=git(R,'show',P+':'+n);assert sha(b)==x['sha256'];put(n,b);fixed.append(row(n,b,test_only_not_deployed=True))
 n='paper/materials/issue29-brain-speed/results.jsonl';b=git(R,'show',P+':'+n);put(n,b);fixed.append(row(n,b,test_only_not_deployed=True));save('fixed-test-data.json',fixed)
 for x in products+overlays:assert sha((W/x['path']).read_bytes())==x['sha256'],x['path']
 paths=set(git(W,'ls-files','agent','ops','learner','eval','knowledge/builders','docs').decode().splitlines())|{x['path'] for x in knowledge+host+tests+helpers+fixed+overlays}
 inputs=[]
 for n in sorted(paths):
  p=W/n
  if not p.is_file() or p.is_symlink() or 'accounts' in p.parts or 'codex-ops' in p.parts or p.name.startswith('.env') or p.suffix in ('.out','.log'):continue
  inputs.append(row(n,p.read_bytes()))
 git(W,'add','--sparse','-f','--',*[x['path'] for x in inputs]);tree=git(W,'write-tree').decode().strip();anchor=git(W,'commit-tree',tree,'-p',base,data=b'Freeze actual R434 knowledge and issue37 plus issue20 only validation\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(W,'update-ref','HEAD',anchor,base)
 deps=[];node=(W/'agent/node_modules').resolve()
 for p in sorted(node.rglob('*')):
  if p.is_file() and not p.is_symlink() and not any(v in p.parts for v in ('.vite','.vitest-cache','.cache','__pycache__')):deps.append(row(str(p.relative_to(node)),p.read_bytes()))
 save('inputs-before.json',inputs);save('dependencies-before.json',deps)
 assembly=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),live_base=base,host_head=hosthead,source37=S,source20=S20,source51=None,old51_included=False,excluded_old51_leaves=8,patch51_sha256=fiftyone['patch']['sha256'],product_source=P,validation_anchor=anchor,validation_tree=tree,worktree=str(W),inputs=len(inputs),dependencies=len(deps),game_knowledge=len(knowledge),fixed_test_data=len(fixed),host_sources=len(host),host_tests=len(tests),helpers_config=len(helpers),source_overlays=len(overlays),product_leaves=9,source091302=None,candidate091302_included=False,validation_snapshot_not_deployment=True)
 save('assembly.json',assembly);print(json.dumps(assembly))

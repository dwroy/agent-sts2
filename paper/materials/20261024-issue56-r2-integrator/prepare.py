from pathlib import Path
import subprocess,json,os,hashlib,fcntl,tempfile
R=Path('/home/dw/Projects/agent-sts2');L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue56-r2-integrator';W=R/'.worktrees/integrator56-r2-20261024-2026'
S='55754e1c4276094bc78856adf05427ac8ce12008';B='2b0f1ebc1fcced5685387905fcde708908eacc8f'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,stderr=subprocess.PIPE)
def save(n,v):(M/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def row(n,b,**extra):return dict(path=n,bytes=len(b),sha256=sha(b),**extra)
def put(n,b):
 p=W/n;assert not p.is_symlink();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
base=git(W,'rev-parse','HEAD').decode().strip()
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 with(R/'ops/knowledge-refresh.lock').open('a') as kl:
  fcntl.flock(kl,fcntl.LOCK_EX)
  with(R/'ops/live-merge.lock').open('a') as ll:
   fcntl.flock(ll,fcntl.LOCK_EX|fcntl.LOCK_NB)
   os.close(os.open(A/'prepare.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600))
   assert git(L,'rev-parse','HEAD').decode().strip()==base,'live advanced before freeze'
   hosthead=git(R,'rev-parse','HEAD').decode().strip();knowledge=[]
   for p in sorted((L/'knowledge').rglob('*')):
    if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or 'builders' in p.relative_to(L/'knowledge').parts:continue
    n=str(p.relative_to(L));b=p.read_bytes();put(n,b);knowledge.append(row(n,b))
   names={x['path'] for x in knowledge}
   for p in(W/'knowledge').rglob('*'):
    if p.is_file() and not p.is_symlink() and 'builders' not in p.relative_to(W/'knowledge').parts and '__pycache__' not in p.parts:assert str(p.relative_to(W)) in names,'stale knowledge'
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
   paths=[x['path'] for x in json.loads((R/'.artifacts/integrator56-20261024-1948/source-overlay.json').read_bytes())]+['docs/learner-retention.md']
   overlays=[];integration=[]
   for n in paths:
    src=git(R,'show',S+':'+n)
    def blob(rev):
     try:return git(R,'show',rev+':'+n)
     except subprocess.CalledProcessError:return None
    old=blob(B);current=blob(hosthead)
    if src==current:merged=current
    elif current==old:merged=src
    elif old is None:assert current is None,n;merged=src
    else:
     with tempfile.TemporaryDirectory(dir=A) as td:
      fs=[Path(td)/v for v in ('current','base','source')]
      for p,b in zip(fs,[current,old,src]):p.write_bytes(b)
      q=subprocess.run(['git','merge-file','-p',*[str(p) for p in fs]],capture_output=True)
      assert q.returncode==0,'conflict '+n;merged=q.stdout
    put(n,merged);overlays.append(row(n,merged,source=S,source_sha256=sha(src),merged=src!=merged))
    if merged!=current:
     mode=git(R,'ls-tree',S,'--',n).decode().split()[0]
     integration.append(row(n,merged,preimage_sha256=sha(current) if current is not None else None,source_sha256=sha(src),mode=mode))
   save('actual-game-knowledge.json',knowledge);save('host-sources-baseline.json',host);save('host-tests-baseline.json',tests);save('helpers-and-config-baseline.json',helpers);save('source-overlays.json',overlays);save('source-integration.json',integration)
   save('freeze-release-context.json',dict(live=base,main=hosthead,versions=json.loads((L/'eval/versions.json').read_bytes())['versions'][-3:]))
 fixed=[]
 for x in json.loads((R/'paper/materials/20261024-issue37-r428-integrator/revision5/additional-main-fixed-knowledge.json').read_bytes()):
  n=x['path']
  if n in names:continue
  b=git(R,'show',hosthead+':'+n);assert sha(b)==x['sha256'];put(n,b);fixed.append(row(n,b,test_only_not_deployed=True))
 n='paper/materials/issue29-brain-speed/results.jsonl';b=git(R,'show',hosthead+':'+n);put(n,b);fixed.append(row(n,b,test_only_not_deployed=True));save('fixed-test-data.json',fixed)
 paths=set(git(W,'ls-files','agent','ops','learner','eval','knowledge/builders','docs').decode().splitlines())|{x['path'] for x in knowledge+host+tests+helpers+fixed+overlays}
 inputs=[]
 for n in sorted(paths):
  p=W/n
  if not p.is_file() or p.is_symlink() or 'accounts' in p.parts or 'codex-ops' in p.parts or p.name.startswith('.env') or p.suffix in ('.out','.log'):continue
  inputs.append(row(n,p.read_bytes()))
 git(W,'add','--sparse','-f','--',*[x['path'] for x in inputs]);tree=git(W,'write-tree').decode().strip();anchor=git(W,'commit-tree',tree,'-p',base,data=b'Freeze R438 game knowledge plus current host and issue56 retirement fix validation\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(W,'update-ref','HEAD',anchor,base)
 deps=[];node=(W/'agent/node_modules').resolve()
 for p in sorted(node.rglob('*')):
  if p.is_file() and not p.is_symlink() and not any(v in p.parts for v in ('.vite','.vitest-cache','.cache','__pycache__')):deps.append(row(str(p.relative_to(node)),p.read_bytes()))
 save('inputs-before.json',inputs);save('dependencies-before.json',deps)
 assembly=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),live_base=base,host_head=hosthead,source56=S,source56_base=B,old51_semantics_included=False,validation_anchor=anchor,validation_tree=tree,worktree=str(W),inputs=len(inputs),dependencies=len(deps),game_knowledge=len(knowledge),fixed_test_data=len(fixed),host_sources=len(host),host_tests=len(tests),helpers_config=len(helpers),source_overlays=len(overlays),integration_paths=len(integration),source091302=None,candidate091302_included=False,validation_snapshot_not_deployment=True)
 save('assembly.json',assembly);print(json.dumps(assembly))

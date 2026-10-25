from pathlib import Path
import hashlib,json,os,subprocess
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue70-integrator';L=R/'.worktrees/live';F=A/'actual-live-consumer';D=R/'.worktrees/issue-70-brain-budget-evidence'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert not F.exists()
a=json.loads((M/'assembly.json').read_text());before=subprocess.check_output(['git','-C',str(L),'rev-parse','HEAD'],text=True).strip()
tracked=subprocess.check_output(['git','-C',str(L),'ls-files','-z']).decode().split('\0');rows=[]
for n in tracked:
    selected=(n.startswith(('agent/src/','agent/tests/','agent/tools/','learner/lib/','learner/tasks/','ops/tests/','ops/codex/','knowledge/builders/')) or (n.startswith(('agent/','learner/','ops/','eval/')) and n.count('/')==1 and Path(n).suffix in {'.ts','.py','.json','.mjs','.js'}))
    if not selected or Path(n).suffix not in {'.ts','.py','.json','.mjs','.js','.md','.txt'}:continue
    assert 'third_party/' not in n and not Path(n).name.startswith('.env')
    p=L/n
    if not p.is_file():continue
    b=p.read_bytes();q=F/n;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);q.chmod(p.stat().st_mode&0o777)
    rows.append(dict(path=n,sha256=sha(b),bytes=len(b),mode=p.stat().st_mode&0o777))
overlay=[]
for n in a['live_source_leaves']+[n for n in a['delivery_paths'] if n.startswith('agent/tests/')]:
    p=L/n;b=(D/n).read_bytes();fixed=subprocess.check_output(['git','show',a['developer']+':'+n],cwd=R);assert b==fixed
    q=F/n;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);q.chmod(0o644)
    overlay.append(dict(path=n,before_sha256=sha(p.read_bytes()) if p.is_file() else None,sha256=sha(b),bytes=len(b)))
node=(R/'agent/node_modules').resolve();os.symlink(node,F/'agent/node_modules',target_is_directory=True)
target=json.loads((D/'paper/materials/20261025-issue70-brain-budget/targeted-final.json').read_text());tests=['tests/'+Path(x['name']).name for x in target['testResults'] if Path(x['name']).name not in {'check-imports.test.ts','ordinary-close-isolation.test.ts'}]
assert len(tests)==11
assert subprocess.check_output(['git','-C',str(L),'rev-parse','HEAD'],text=True).strip()==before
for x in rows:assert sha((L/x['path']).read_bytes())==x['sha256'],x['path']
inputs=[dict(path=str(p.relative_to(F)),sha256=sha(p.read_bytes()),mode=p.stat().st_mode&0o777) for p in F.rglob('*') if p.is_file() and not p.is_symlink() and 'node_modules' not in p.parts]
out=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),fixture=str(F),actual_live=before,actual_live_unchanged_during_copy=True,baseline=rows,overlay=overlay,inputs=inputs,tests=tests,node_root=str(node),full_runs=0,scope='actual LIVE working source and learner baseline plus exactly nine delivered production leaves and four fixed test fixtures; eleven direct brain consumer files, no model/game/production writes')
(M/'actual-live-consumer-inputs.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in {'baseline','inputs'}},indent=2))

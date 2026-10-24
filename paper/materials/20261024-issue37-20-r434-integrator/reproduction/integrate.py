from pathlib import Path
import subprocess, json, hashlib, os, fcntl

R=Path('/home/dw/Projects/agent-sts2'); A=Path(__file__).resolve().parent
M=R/'paper/materials/20261024-issue37-20-r434-integrator'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*args,data=None,env=None):
    return subprocess.check_output(['git',*args],cwd=R,input=data,env=env,stderr=subprocess.PIPE)

s=json.loads((M/'full-state.json').read_bytes())
assert s['phase']=='full-passed' and s['failed']==0 and s['rc']==0
assert all(s[k] for k in ['inputs_unchanged','dependencies_unchanged','index_entries_unchanged','index_flags_unchanged','tree_unchanged','check_lock_released'])
t=json.loads((M/'full-terminal-verification.json').read_bytes())
assert t['worker_absent'] and t['check_lock_independently_acquired']
plan=json.loads((A/'final-integration-plan.json').read_bytes()); files={}
for x in plan['files']:
    b=(A/'final-payload'/x['path']).read_bytes();assert sha(b)==x['sha256'];files[x['path']]=b
line=(A/'integration-ledger-line.txt').read_bytes()
with(R/'ops/live-merge.lock').open('a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    assert git('branch','--show-current').strip()==b'main'
    assert not git('diff','--cached','--name-only').strip()
    parent=git('rev-parse','HEAD').decode().strip()
    for manifest in ['host-sources-baseline.json','host-tests-baseline.json','helpers-and-config-baseline.json']:
        for x in json.loads((M/manifest).read_bytes()):
            assert sha(git('show',parent+':'+x['path']))==x['sha256'],x['path']
            assert sha((R/x['path']).read_bytes())==x['sha256'],x['path']
    for x in plan['sources']:
        n=x['path'];p=R/n
        if x['preimage_sha256'] is None:
            assert not p.exists(),n
            assert subprocess.run(['git','cat-file','-e',parent+':'+n],cwd=R,capture_output=True).returncode!=0,n
        else:
            assert sha(git('show',parent+':'+n))==x['preimage_sha256'],n
            assert sha(p.read_bytes())==x['preimage_sha256'],n
    for x in json.loads((M/'product-leaves.json').read_bytes()):
        assert sha(git('show',parent+':'+x['path']))==x['sha256']
        assert sha((R/x['path']).read_bytes())==x['sha256']
    ledger='paper/materials/decision-log.md';oldledger=(R/ledger).read_bytes()
    files['notes/integrator-current.md']=(R/'notes/integrator-current.md').read_bytes()
    files[ledger]=git('show',parent+':'+ledger)+line
    scan=b'\n'.join(b for n,b in files.items() if n!=ledger)+line
    result=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=scan,capture_output=True,env={**os.environ,'GOMAXPROCS':'1'})
    (A/'integration-scan.log').write_bytes(result.stdout+result.stderr);assert result.returncode==0
    index=Path(git('rev-parse','--path-format=absolute','--git-path','index').decode().strip())
    guard=Path(str(index)+'.lock');fd=os.open(guard,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        private=A/'integration.index';assert not private.exists();private.write_bytes(index.read_bytes())
        env={**os.environ,'GIT_INDEX_FILE':str(private)}
        assert git('write-tree',env=env).strip()==git('rev-parse',parent+'^{tree}').strip()
        modes={x['path']:x['mode'] for x in plan['sources']}
        for n,b in files.items():
            blob=git('hash-object','-w','--stdin',data=b).decode().strip()
            git('update-index','--add','--cacheinfo',f'{modes.get(n,"100644")},{blob},{n}',env=env)
        tree=git('write-tree',env=env).decode().strip()
        changed=git('diff','--name-only',parent,tree).decode().splitlines();assert set(changed)<=set(files)
        assert {x['path'] for x in plan['sources']}<=set(changed)
        commit=git('commit-tree',tree,'-p',parent,data=b'Integrate verified profile fixes and allocation publication boundaries (#37 #20)\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\nAgent: codex@xdwin1\n').decode().strip()
        assert (R/ledger).read_bytes()==oldledger
        for n,b in files.items():
            if n==ledger or n in modes:continue
            assert (R/n).read_bytes()==b,n
        # Install dependencies before their callers and never expose a partial source file.
        priorities={'ops/strategy_external_jobs.py':0,'ops/worktree_retention.py':0,
                    'learner/lib/external-source.ts':0,'ops/learner_jobs.py':1,
                    'ops/worktree_checkout.py':1,'ops/issue_session_project.py':2,
                    'learner/lib/launcher.ts':2,'ops/codex-ops-learn.py':2,
                    'ops/codex-ops-learner.sh':3}
        source_write_started_at=subprocess.check_output(['date','-Iseconds'],text=True).strip()
        for x in sorted(plan['sources'],key=lambda x:(priorities.get(x['path'],10),x['path'])):
            p=R/x['path'];p.parent.mkdir(parents=True,exist_ok=True)
            temporary=p.with_name(p.name+'.integrator-'+str(os.getpid())+'.tmp')
            source_fd=os.open(temporary,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(source_fd,'wb') as f:
                f.write(files[x['path']]);f.flush();os.fsync(f.fileno())
                os.fchmod(f.fileno(),0o755 if x['mode']=='100755' else 0o644)
            os.replace(temporary,p)
        for x in plan['sources']:
            assert sha((R/x['path']).read_bytes())==x['sha256'],x['path']
        source_write_ended_at=subprocess.check_output(['date','-Iseconds'],text=True).strip()
        with(R/ledger).open('ab') as f:f.write(line);f.flush();os.fsync(f.fileno())
        git('update-ref','refs/heads/main',commit,parent)
        with os.fdopen(fd,'wb') as f:fd=None;f.write(private.read_bytes());f.flush();os.fsync(f.fileno())
        os.replace(guard,index);guard=None
        assert not git('diff','--cached','--name-only').strip()
        (A/'integration-commit.json').write_text(json.dumps(dict(commit=commit,parent=parent,tree=tree,paths=changed,sources=plan['sources'],game_products_already_in_main=True,live_written=False,host_deployed=False,host_source_files_written=True,source_write_started_at=source_write_started_at,source_write_ended_at=source_write_ended_at,all_source_postimages_read_back_exact=True,ops_deployment_verified=False,natural_invocation_observed=False),indent=2)+'\n')
        print(commit)
    finally:
        if fd is not None:os.close(fd)
        if guard is not None and guard.exists():guard.unlink()

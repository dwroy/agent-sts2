import datetime, fcntl, hashlib, json, os, subprocess, time, traceback
from pathlib import Path
ROOT=Path('/home/dw/Projects/agent-sts2')
WORKTREE=Path('/home/dw/Projects/agent-sts2/.worktrees/ops-core-output-research-20261010')
EVIDENCE=WORKTREE/'paper/materials/20261010-core-output-research-entry/venv-restored-full-check-20261010'
PRIOR=WORKTREE/'paper/materials/20261010-core-output-research-entry'
REQUEST='roy-20261010-silent-core-output-value'
OWNER='agent:/root/core_output_research_entry'
CONTINUATION=ROOT/'paper/materials/silent/20261010-core-output-value/host-continuation-receipt.json'
PATHS=['ops/strategy_research_jobs.py','ops/codex-ops-learner.sh','learner/tasks/strategy-proposal.md','ops/tests/test_strategy_research_scheduling.py']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def stamp(): return datetime.datetime.now().astimezone().isoformat()
def write(name,value):
    dest=EVIDENCE/name; tmp=dest.with_name('.'+dest.name+'.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,dest)
def git(*args): return subprocess.check_output(['git',*args],cwd=WORKTREE,text=True).strip()
base=json.loads((PRIOR/'preparation.json').read_text())
git_dir=Path(git('rev-parse','--git-dir'))
lock=(git_dir/'entry-full-check.lock').open('a+b')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
assert git('rev-parse','HEAD')==base['base']
assert git('branch','--show-current')=='ops-core-output-research-20261010'
assert not git('diff','--cached','--name-only')
assert {f:sha(WORKTREE/f) for f in PATHS}==base['source_sha256']
assert json.loads(CONTINUATION.read_text())['request_id']==REQUEST
previous=PRIOR/'normal-full-check-20261010'
old_owner=json.loads((previous/'owner.json').read_text())
assert old_owner['owner']==OWNER and old_owner['state']=='source-uncommitted-full-test-failed'
for sealed in [PRIOR,previous]:
    for item in json.loads((sealed/'manifest.json').read_text())['files']:
        assert sha(sealed/item['path'])==item['sha256'], 'original evidence changed'
venv=ROOT/'data/logdb-venv'
assert venv.is_dir() and not venv.is_symlink() and venv.resolve()==venv
assert sha(venv/'pyvenv.cfg')=='61a0ba249deced06917f03cf393f1aa8d7dbec6cfeb8096919c507e14aa8428b'
identity_argv=['nice','-n','19',str(venv/'bin/python'),'-B','-c','import duckdb,json,sys; print(json.dumps(dict(sys_prefix=sys.prefix,sys_base_prefix=sys.base_prefix,python_version=sys.version.split()[0],duckdb_version=duckdb.__version__,executable=sys.executable)))']
identity=json.loads(subprocess.check_output(identity_argv,cwd=WORKTREE,text=True))
assert identity['sys_prefix']==str(venv) and identity['duckdb_version']=='1.5.6'
source_wrapper=WORKTREE/'ops/codex-ops-learner.sh'
assert 'mkdir -p "$worktree/data" && ln -s ../../../data/logdb-venv "$worktree/data/logdb-venv"' in source_wrapper.read_text()
parent=WORKTREE/'data';target=parent/'logdb-venv'
assert not os.path.lexists(target), 'existing environment path must not be overwritten'
assert not parent.is_symlink(), 'unexpected data ownership'
parent.mkdir(exist_ok=True)
os.symlink('../../../data/logdb-venv',target)
assert target.resolve()==venv and (target/'bin/python').exists()
write('environment-restoration.json',{'request_id':REQUEST,'restored_at':stamp(),'exclusive_tree_lock_held':True,'previous_owner':old_owner['owner'],'previous_state':old_owner['state'],'previous_evidence_preserved':True,'symlink':str(target),'link_value':os.readlink(target),'resolved_target':str(target.resolve()),'standard_initializer':'ops/codex-ops-learner.sh:85-86','initializer_sha256':sha(source_wrapper),'existing_fixture':'ops/tests/test_strategy_concurrency.py:test_second_slot_wrapper_links_existing_python_environment','fixture_sha256':sha(WORKTREE/'ops/tests/test_strategy_concurrency.py'),'documented_environment':'docs/logdb.md:22-25','document_sha256':sha(WORKTREE/'docs/logdb.md'),'root_venv_identity':identity,'pyvenv_cfg_sha256':sha(venv/'pyvenv.cfg'),'identity_command':identity_argv,'installed_dependencies':False,'configuration_changed':False,'credentials_read_or_changed':False,'fixed_exclusions_changed':False,'production_source_changed_for_environment':False})
started=stamp()
owner={'request_id':REQUEST,'owner':OWNER,'worktree':str(WORKTREE),'branch':'ops-core-output-research-20261010','state':'checking','started_at':started,'lock_path':str(git_dir/'entry-full-check.lock'),'lock':'exclusive flock held through test, conditional source commit and completion event','host_pid':None,'process_identity':'owned unified exec session; no host PID claim','instructions':'Other ops must preserve this owned source tree and await its completion receipt before parallel checks or commits.'}
write('owner.json',owner)
argv=['nice','-n','19','timeout','--signal=TERM','--kill-after=5s','1200s','bash','tools/test-sandbox.sh']
env=os.environ.copy();env['SANDBOX_WORKERS']='4';env['PATH']=os.path.expanduser('~/.local/node/bin')+':'+env.get('PATH','');env['npm_config_offline']='true'
log=EVIDENCE/'sandbox-normal.log'
start={'request_id':REQUEST,'owner':OWNER,'started_at':started,'argv':argv,'cwd':str(WORKTREE/'agent'),'sandbox_workers':4,'worker_limit':4,'hard_wall_seconds':1200,'test_script_sha256':sha(WORKTREE/'agent/tools/test-sandbox.sh'),'source_base':base['base'],'source_sha256':base['source_sha256'],'prior_artifacts_unchanged':['sandbox.log','sandbox-interrupted.receipt.json','sandbox-final-bounded.log','sandbox-final-bounded.receipt.json','closure.json','manifest.json'],'parent_continuation_path':str(CONTINUATION),'parent_continuation_sha256_at_start':sha(CONTINUATION),'source_commit':None,'actual_research_dispatched':False,'log':str(log)}
write('started.json',start);print(json.dumps(start,ensure_ascii=False),flush=True)
result={**start,'state':'checking'}
try:
    with log.open('w') as f: test=subprocess.run(argv,cwd=WORKTREE/'agent',env=env,stdout=f,stderr=subprocess.STDOUT)
    content=log.read_text();unchanged={f:sha(WORKTREE/f) for f in PATHS}==base['source_sha256']
    result={**start,'finished_at':stamp(),'test_exit_code':test.returncode,'test_log_sha256':sha(log),'source_unchanged':unchanged,'tsc_exit_code':0 if ' RUN ' in content else None,'full_sandbox_pass':test.returncode==0,'state':'tests-finished'}
    write('sandbox-normal.receipt.json',result)
    assert unchanged,'source changed while checking'
    if test.returncode==0:
        assert git('rev-parse','HEAD')==base['base']
        assert set(git('diff','--name-only').splitlines())==set(PATHS)
        assert not git('diff','--cached','--name-only')
        scan=['nice','-n','19','gitleaks','dir',str(PRIOR/'scan'),'--redact','--no-banner','--report-format','json','--report-path',str(EVIDENCE/'gitleaks-source-findings.json')]
        # The frozen scan copies must exactly match the tested source bytes.
        assert all(sha(PRIOR/'scan'/f)==sha(WORKTREE/f) for f in PATHS)
        with (EVIDENCE/'gitleaks-source.log').open('w') as f: leak=subprocess.run(scan,cwd=WORKTREE,stdout=f,stderr=subprocess.STDOUT)
        write('gitleaks-source.receipt.json',{'argv':scan,'exit_code':leak.returncode,'log_sha256':sha(EVIDENCE/'gitleaks-source.log'),'tested_source_sha256':base['source_sha256']})
        assert leak.returncode==0,'gitleaks failed'
        subprocess.run(['git','diff','--check'],cwd=WORKTREE,check=True)
        subprocess.run(['git','add','--',*PATHS],cwd=WORKTREE,check=True)
        assert set(git('diff','--cached','--name-only').splitlines())==set(PATHS)
        subprocess.run(['git','diff','--cached','--check'],cwd=WORKTREE,check=True)
        message='Register Silent core output report-only research\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
        with (EVIDENCE/'source-commit.log').open('w') as f: commit=subprocess.run(['git','commit','-m',message],cwd=WORKTREE,stdout=f,stderr=subprocess.STDOUT)
        assert commit.returncode==0,'source commit failed'
        commit_id=git('rev-parse','HEAD');assert git('rev-parse','HEAD^')==base['base']
        assert set(git('show','--format=','--name-only','HEAD').splitlines())==set(PATHS)
        result.update({'source_commit':commit_id,'source_tree':git('rev-parse','HEAD^{tree}'),'commit_paths':PATHS,'source_commit_log_sha256':sha(EVIDENCE/'source-commit.log'),'state':'source-tested-committed'})
        write('source-commit.receipt.json',result)
    else:
        result['state']='source-uncommitted-full-test-timeout' if test.returncode==124 else 'source-uncommitted-full-test-failed'
except Exception as exc:
    result.update({'state':'source-verification-or-commit-exception','error_type':type(exc).__name__,'error':str(exc),'finished_at':stamp()})
    (EVIDENCE/'exception.log').write_text(traceback.format_exc())
# Use exactly the existing manual enqueue atomic filename format. No drain or new learner batch is started.
text=f"request_id={REQUEST}；同一父请求的入口检查续办更新。owner={OWNER}；state={result['state']}；完整固定 sandbox exit={result.get('test_exit_code')}，workers=4，原排除未改；source_commit={result.get('source_commit')}；source_tree={result.get('source_tree')}；工作树={WORKTREE}；检查回执={EVIDENCE/'sandbox-normal.receipt.json'}；原130/124和旧新源字节全保留；承接既有 {CONTINUATION}。"
if result.get('source_commit'):
    text+='入口已完整自测、gitleaks通过且仅四源文件提交，请承接原续办去重集成 main/live 与同一请求正式派发；不要重复运行已通过源码检查，不新建第二父请求或批次，不把入口提交写成知识上线。'
else:
    text+='未得到可提交完整通过结果，保留源树未提交，交 ops 按真实日志决定下一步；不冒造已合入、已派发、版本或知识。'
queue=ROOT/'ops/codex-ops/queue';queue.mkdir(parents=True,exist_ok=True); name=str(time.time_ns())+'-manual.md';tmp=queue/('.'+name);dest=queue/name
with tmp.open('x') as f:f.write(text+'\n');f.flush();os.fsync(f.fileno())
os.replace(tmp,dest)
event={'request_id':REQUEST,'kind':'manual','event_path':str(dest),'event_sha256':sha(dest),'event_bytes':dest.stat().st_size,'parent_continuation_path':str(CONTINUATION),'source_commit':result.get('source_commit'),'research_batch':None,'actual_research_dispatched':False,'state':result['state'],'created_at':stamp()};write('completion-event.receipt.json',event)
result['completion_event']=event;write('completion.json',result)
owner.update({'state':result['state'],'finished_at':stamp(),'source_commit':result.get('source_commit'),'lock':'released at normal helper exit; original agent retains source-tree ownership until ops integration handoff'});write('owner.json',owner)
print(json.dumps(result,ensure_ascii=False),flush=True)

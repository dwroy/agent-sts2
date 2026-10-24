from pathlib import Path
import json, hashlib, subprocess, sys, os
R=Path('/home/dw/Projects/agent-sts2'); A=Path(__file__).resolve().parent
M=R/'paper/materials/20261024-issue36-resume-2327-integrator'
H=lambda b:hashlib.sha256(b).hexdigest()
def run(*args):return subprocess.check_output(args,cwd=R)
def save(name,data): (M/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def proof(p,b=None,offset=None):
 p=Path(p);b=p.read_bytes() if b is None else b
 d=dict(path=str(p.relative_to(R)),bytes=len(b),sha256=H(b))
 if offset is not None:d['offset']=offset
 return d
at=run('date','-Is').decode().strip();head=run('git','rev-parse','HEAD').decode().strip()
old=json.loads((R/'paper/materials/20261024-issue36-resume-2121-integrator/full-coverage.json').read_text())
F=R/'paper/materials/20261024-issue56-registration-integrator'
context=json.loads((F/'full-context.json').read_text());inputs={x['path']:x for x in context['inputs']}
rows=[]
for x in old['rows']:
 p=x['path'];raw=(R/p).read_bytes();actual=H(raw);frozen=inputs[p]['sha256'];blob=H(run('git','show',head+':'+p))
 assert actual==frozen==blob,(p,actual,frozen,blob)
 rows.append(dict(path=p,bytes=len(raw),current_sha256=actual,head_sha256=blob,full_input_sha256=frozen,exact=True,changed_since_2121=actual!=x['current_sha256']))
raw=(F/'full.json').read_bytes();full=json.loads(raw);terminal=json.loads((F/'full-terminal-verification.json').read_text())
assert H(raw)==terminal['result_sha256'] and full['success'] and full['numFailedTests']==0
assert terminal['original_worker_exited'] and terminal['inputs_unchanged'] and terminal['dependencies_unchanged'] and terminal['check_lock_released']
suites=[]
for x in rows:
 if not x['path'].endswith('.test.ts'):continue
 tests=[r for r in full['testResults'] if r['name'].endswith('/'+x['path'])];assert len(tests)==1
 t=tests[0];assert t['status']=='passed' and all(a['status']=='passed' for a in t['assertionResults'])
 suites.append(dict(path=x['path'],assertions=len(t['assertionResults']),status=t['status']))
save('full-coverage.json',dict(at=at,head=head,rows=rows,suites=suites,assertions=sum(x['assertions'] for x in suites),full_result=proof(F/'full.json'),full_terminal=proof(F/'full-terminal-verification.json'),terminal=terminal,new_full_runs=0,python_scope='Python wrapper assertions counted once; other Python leaves prove frozen input equality only',entire_current_main_or_live_verified=False))
sys.path.insert(0,str(R/'ops'))
from strategy_backfill_jobs import retired
state=json.loads((R/'ops/codex-ops/learn.json').read_bytes())
def birth(pid):
 p=Path('/proc')/str(pid)/'stat'
 try:return p.read_text().rsplit(')',1)[1].split()[19]
 except FileNotFoundError:return None
def native(j):
 p=Path(j['rollout']);contexts=[];prompts=[];terminals=[];offset=0;session=None
 binding=j['bindings'][-1];assert binding['turn_id']==j['turn']
 with p.open('rb') as f:
  for line in f:
   if not line.endswith(b'\n'):break
   e=json.loads(line);payload=e.get('payload',{});typ=e.get('type');w=proof(p,line,offset);offset+=len(line)
   if typ=='session_meta':session=payload.get('id')
   if typ=='turn_context' and payload.get('turn_id')==j['turn']:
    actual={k:payload.get(k) for k in ['turn_id','cwd','model','effort','service_tier']};assert actual['model']=='gpt-6.1-sol' and actual['effort']=='high' and actual['cwd']==j['cwd'];contexts.append(dict(**w,actual=actual))
   text=None
   if typ=='response_item' and payload.get('type')=='message' and payload.get('role')=='user':
    text='\n'.join(c.get('text','') for c in payload.get('content',[]) if c.get('type')=='input_text')
   elif typ=='event_msg' and payload.get('type')=='user_message':text=payload.get('message')
   if text and H(text.replace('\r\n','\n').rstrip().encode())==binding['prompt_sha256']:
    assert text.startswith(binding['marker']);prompts.append(dict(**w,canonical_text_sha256=binding['prompt_sha256']))
   if typ=='event_msg' and payload.get('type')=='task_complete' and payload.get('turn_id')==j['turn']:
    if j.get('result',{}).get('reason')=='native-task-complete':assert payload['last_agent_message']==j['result']['message']
    terminals.append(dict(**w,at=e.get('timestamp'),message_sha256=H(payload.get('last_agent_message','').encode())))
 assert session==j['session'] and contexts and prompts
 return dict(session=session,turn=j['turn'],context=contexts,prompt=prompts,terminal=terminals)
finished=[];active=[]
for batch in ['20261024-223228-strategy-proposal','20261024-231302-postmortem','20261024-231317-fix-batch','20261024-231317-s2-strategy-proposal','20261024-231317-strategy-proposal']:
 p=R/f'ops/codex-ops/learner/learner-{batch}.tui.json';raw=p.read_bytes();j=json.loads(raw);batch_key=batch if batch in state['batches'] else batch.removesuffix('-postmortem');record=state['batches'][batch_key]
 details=dict(batch=batch,receipt=proof(p,raw),state=j['state'],native=native(j),pid=j['pid'],birth=j['birth'],current_birth=birth(j['pid']),retirement_authorized=j['retirement_authorized'])
 query=subprocess.run(['herdr','pane','get',j['pane']],cwd=R,capture_output=True)
 details['pane_query_rc']=query.returncode
 if query.returncode:
  error=json.loads(query.stderr or query.stdout);assert j['state']=='session-ended' and error['error']['code']=='pane_not_found';details['pane_missing']=True;details['pane_query']=error
 else:
  pane=json.loads(query.stdout);actual=pane['result']['pane'];assert actual['label']==j['label']
  tab=json.loads(run('herdr','tab','get',actual['tab_id']));details['pane']=actual;details['tab']=tab['result']['tab']
  assert details['tab']['label'].startswith('学习大脑 · '+batch[:15]+' · ')
 if j['state']=='session-ended':
  assert j['result']['code']==0 and j['result']['reason']=='native-task-complete' and record['state']=='done' and record['rc']==0 and len(details['native']['terminal'])==1
  assert details['current_birth']!=str(j['birth']) and j['retirement_authorized']
  retired(batch,record,R/'ops/codex-ops')
  details.update(wrapper=j['wrapper'],output=j['output'],original_retirement_verifier_passed=True)
  assert H(Path(j['output']['path']).read_bytes())==j['output']['sha256']
  finished.append(details)
 else:
  assert j['state']=='native-accepted' and str(details['current_birth'])==str(j['birth'])
  active.append(details)
save('natural-readback.json',dict(at=at,ordinary_completed=finished,active=active,exception75_or_bounded_observation_verified=False,disk_sha_is_not_loaded_code_proof=True))
scan=[]
for p in sorted((R/'ops/codex-ops/learner').glob('learner-20261024-*.tui.json')):
 if p.name<'learner-20261024-110000':continue
 j=json.loads(p.read_bytes());result=j.get('result',{});batch=p.name[len('learner-'):-len('.tui.json')]
 row=dict(batch=batch,receipt=proof(p),state=j['state'],code=result.get('code'),reason=result.get('reason'),failure_reason=result.get('failure_reason'),retirement_authorized=j.get('retirement_authorized'))
 # Launcher structured logs, rather than the final TUI state, retain transient hold/resume events.
 logs=[];candidate=R/f'ops/codex-ops/learner/{batch}.learner-log-ref.json'
 logpath=j.get('artifacts',{}).get('log')
 if not logpath:
  for ext in ('log-ref.json','learner-log-ref.json'):
   ref=R/f'ops/codex-ops/learner/{batch}.{ext}'
   if ref.exists():
    data=json.loads(ref.read_bytes());logpath=data.get('path') or data.get('log');break
 if logpath and Path(logpath).is_file():
  q=Path(logpath);raw=q.read_bytes()
  for n,line in enumerate(raw.splitlines(),1):
   if b'learner_tui_input_hold' in line or b'learner_tui_input_resumed' in line:
    try:ev=json.loads(line)
    except json.JSONDecodeError:continue
    if ev.get('type') in ('learner_tui_input_hold','learner_tui_input_resumed'):logs.append(dict(line=n,event=ev))
  row['launcher_log']=proof(q,raw)
 row['hold_resume_events']=logs;scan.append(row)
save('natural-branch-inventory.json',dict(at=at,rows=scan,no_injection=True,scope='final TUI states plus available structured launcher logs after 11:00, not all screen history',holds_seen=sum(len(x['hold_resume_events']) for x in scan)))
config=R/'logs/run-config.jsonl'
with config.open('rb') as f:f.seek(max(0,config.stat().st_size-65536));tail=f.read()
last=tail.splitlines()[-1];runid=json.loads(last)['run_id'];cp=proof(config,last+b'\n',config.stat().st_size-len(last)-1)
pane=json.loads(run('herdr','pane','get','w1H:pBA'))['result']['pane'];tab=json.loads(run('herdr','tab','get',pane['tab_id']))['result']['tab'];assert tab['label']=='对局大脑 · '+runid
screen=run('herdr','pane','read','w1H:pBA','--source','recent-unwrapped','--lines','180');(A/'brain-screen.txt').write_bytes(screen)
sample=run('nice','-n','19','python3','ops/brain_view.py','sample');(A/'brain-sample.txt').write_bytes(sample)
result=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=screen+b'\n'+sample,capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});(A/'view-scan.log').write_bytes(result.stdout+result.stderr);assert result.returncode==0
markers={x:sample.decode().count(x) for x in ['工具','耗时','选择','理由','codex','DeepSeek','题','楼层']}
save('game-view.json',dict(at=at,run_id=runid,config_window=cp,pane=pane,tab=tab,screen_sha256=H(screen),sample_sha256=H(sample),sample_bytes=len(sample),sample_markers=markers,gitleaks_rc=0,no_view_restart_or_keys=True,prior_natural_run='5ZT1SKS66C1N',prior_receipt='paper/materials/20261024-issue36-natural-tabs-ops/receipt.json',natural_run_rename_verified=True))
comment=json.loads(run('gh','api','repos/dwroy/agent-sts2/issues/comments/6386005172'));assert comment['user']['login']=='dwroy'
save('shared-mas-readback.json',dict(at=at,id=comment['id'],author=comment['user']['login'],body=comment['body'],body_sha256=H(comment['body'].encode()),original_20_window_reset=False,project_migration_acceptance_substituted=False))
print(json.dumps(dict(at=at,head=head,full_leaves=len(rows),ts_suites=len(suites),ts_assertions=sum(x['assertions'] for x in suites),completed=len(finished),active=len(active),inventory=len(scan),holds_seen=sum(len(x['hold_resume_events']) for x in scan),game_run=runid,markers=markers),ensure_ascii=False))

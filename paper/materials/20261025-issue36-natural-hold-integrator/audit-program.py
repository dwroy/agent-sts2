from pathlib import Path
import json,hashlib,subprocess,sys,os,datetime
sys.dont_write_bytecode=True
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue36-natural-hold-integrator'
H=lambda b:hashlib.sha256(b).hexdigest()
def run(*args):return subprocess.check_output(args,cwd=R)
def public_projection(value):
 if isinstance(value,list):return [public_projection(x) for x in value]
 if isinstance(value,dict):return {('registration_dedup_sha256' if k=='key' and isinstance(v,str) and len(v)==64 and all(c in '0123456789abcdef' for c in v) else k):public_projection(v) for k,v in value.items()}
 return value
def save(n,j):(M/n).write_text(json.dumps(public_projection(j),ensure_ascii=False,indent=2)+'\n')
def proof(p,b=None,offset=None):
 p=Path(p);b=p.read_bytes() if b is None else b;d=dict(path=str(p.relative_to(R)),bytes=len(b),sha256=H(b))
 if offset is not None:d['offset']=offset
 return d
def birth(pid):
 try:return (Path('/proc')/str(pid)/'stat').read_text().rsplit(')',1)[1].split()[19]
 except FileNotFoundError:return None
at=run('date','-Is').decode().strip();head=run('git','rev-parse','HEAD').decode().strip()
source=(R/'paper/materials/20261024-issue36-resume-2327-integrator/audit-program.py').read_text();exec(source[source.index('def native(j):'):source.index('finished=[];active=[]')])
sys.path.insert(0,str(R/'ops'))
from strategy_backfill_jobs import retired
from learner_tui import verification_blocked,verified_code,REGISTRATION_FIELDS
statepath=R/'ops/codex-ops/learn.json';stateraw=statepath.read_bytes();state=json.loads(stateraw)
rows=[];finished=[];held=[]
for p in sorted((R/'ops/codex-ops/learner').glob('learner-2026102[45]-*.tui.json')):
 if p.name<'learner-20261024-231302':continue
 raw=p.read_bytes();j=json.loads(raw);batch=p.name[len('learner-'):-len('.tui.json')];key=batch if batch in state['batches'] else batch.removesuffix('-postmortem');record=state['batches'][key]
 logpath=j.get('artifacts',{}).get('log');events=[]
 if logpath:
  q=Path(logpath);lograw=q.read_bytes();off=0
  for line in lograw.splitlines(keepends=True):
   e=json.loads(line)
   if e.get('type') in ('learner_tui_input_hold','learner_tui_input_resumed'):
    events.append(dict(**proof(q,line,off),event=e))
   off+=len(line)
 row=dict(batch=batch,receipt=proof(p,raw),state=j['state'],code=j.get('result',{}).get('code'),failure_reason=j.get('result',{}).get('failure_reason'),events=events)
 if logpath:row['launcher_log']=proof(q,lograw)
 rows.append(row)
 if batch in ['20261025-011301-strategy-proposal','20261024-231302-postmortem','20261024-231317-fix-batch','20261024-231317-s2-strategy-proposal','20261024-231317-strategy-proposal'] or row['code']==75:
  detail=dict(**row,native=native(j),pid=j['pid'],birth=j['birth'],current_birth=birth(j['pid']),batch_key=key,registration={k:record.get(k) for k in REGISTRATION_FIELDS},learn_state=record['state'],learn_rc=record.get('rc'))
  panequery=subprocess.run(['herdr','pane','get',j['pane']],cwd=R,capture_output=True);detail['pane_query_rc']=panequery.returncode
  if panequery.returncode==0:
   pane=json.loads(panequery.stdout)['result']['pane'];assert pane['label']==j['label'];tab=json.loads(run('herdr','tab','get',pane['tab_id']))['result']['tab'];detail.update(pane=pane,tab=tab)
   screen=run('herdr','pane','read',j['pane'],'--source','recent-unwrapped','--lines','100');(A/(batch+'.screen.json')).write_bytes(screen);detail['current_screen']=dict(bytes=len(screen),sha256=H(screen),historical_hold_screen_equivalence_unproven=True)
  else:detail['pane_query']=json.loads(panequery.stderr or panequery.stdout)
  if row['code']==75:
   assert j['state']=='needs-attention' and not j['retirement_authorized'] and j['result']['stopped'] is False and j['result']['failure_reason']=='pending-input-timeout'
   assert verification_blocked(p,75)
   assert len(events)==1 and events[0]['event']['type']=='learner_tui_input_hold';event=events[0]['event']
   assert event['session']==j['session'] and event['turn']==j['turn'] and event['deadline_ms']-event['since_ms']==120000 and j['input_hold']['screen_sha256']==event['screen_sha256']
   dp=Path(record['verification_deferred']);draw=dp.read_bytes();d=json.loads(draw)
   assert d['batch']==key and d['reason']=='terminal-unverified-receipt' and d['launcher_rc']==75 and d['receipt']==str(p) and d['supervisor']['pid']==record['pid']
   assert all(d[k] is False for k in ['finish_authorized','retirement_authorized','automatic_replay_authorized']) and all(record.get(k)==v for k,v in d['registration'].items())
   assert record['state']=='awaiting_review' and record['review_required']=='terminal-unverified-receipt' and 'wrapper' not in j and record.get('rc') is None
   elapsed=datetime.datetime.fromisoformat(d['at']).timestamp()*1000-event['since_ms'];assert 120000<=elapsed<135000
   assert len(detail['native']['terminal'])==1
   # Independently bind the original completed message even though transport retirement failed.
   matches=[];off=0
   for line in Path(j['rollout']).read_bytes().splitlines(keepends=True):
    e=json.loads(line);v=e.get('payload',{})
    if e.get('type')=='event_msg' and v.get('type')=='task_complete' and v.get('turn_id')==j['turn']:
     assert v['last_agent_message']==j['result']['message'];matches.append(proof(Path(j['rollout']),line,off))
    off+=len(line)
   detail.update(deferral=proof(dp,draw),deferral_record=d,hold_to_deferral_ms=round(elapsed,3),original_supervisor_current_birth=birth(d['supervisor']['pid']),terminal_message_matches=matches,verification_blocked_readonly=True,native_process_preserved=str(birth(j['pid']))==str(j['birth']))
   assert detail['original_supervisor_current_birth']!=str(d['supervisor']['birth'])
   for suffix in ['.out','.err','.wrapper-attention-verify.json']:
    artifact=R/'ops/codex-ops/learner'/(key+suffix)
    if artifact.exists():detail[suffix]=proof(artifact)
   held.append(detail)
  else:
   assert j['state']=='session-ended' and j['result']['code']==0 and record['state'] in ('done','failed','rejected') and record['rc']==0 and j['retirement_authorized'] and detail['current_birth']!=str(j['birth'])
   assert verified_code(p,Path(j['output']['path']),j['wrapper']['launcher_rc'])==0;assert H(Path(j['output']['path']).read_bytes())==j['output']['sha256']
   if batch=='20261025-011301-strategy-proposal':
    assert len(events)==2;h,res=[e['event'] for e in events];assert h['type']=='learner_tui_input_hold' and res['type']=='learner_tui_input_resumed' and res['since_ms']==h['since_ms'] and res['session']==h['session']==j['session'] and res['turn']==h['turn']==j['turn'] and h['since_ms']<res['at_ms']<h['deadline_ms'];detail['observed_hold_resumed_ms']=res['at_ms']-h['since_ms']
   detail.update(wrapper=j['wrapper'],output=j['output'],original_retirement_verifier_passed=True);finished.append(detail)
save('natural-hold-readback.json',dict(at=at,head=head,learn_snapshot=proof(statepath,stateraw),held=held,ordinary_completed=finished,scope='read-only current artifacts; no keys, restart, finish, seal or replay',historical_draft_authorship_unknown=True,hold_resume_success_batch='20261025-011301-strategy-proposal',historical_human_draft_authorship_unproven=True))
save('natural-branch-inventory.json',dict(at=at,rows=rows,scope='available TUI and structured launcher logs from 20261024-231302',no_injection=True))
F=R/'paper/materials/20261025-issue60-fixture-composition-integrator';fullraw=(F/'full.json').read_bytes();full=json.loads(fullraw);term=json.loads((F/'full-terminal-verification.json').read_bytes());assert H(fullraw)==term['result_sha256'] and full['success']
inputs={line.split('  ',1)[1]:line.split('  ',1)[0] for line in (F/'inputs-before.sha256').read_text().splitlines()}
old=json.loads((R/'paper/materials/20261024-issue36-resume-2327-integrator/full-coverage.json').read_bytes());coverage=[];suites=[]
for x in old['rows']:
 p=x['path'];actual=H((R/p).read_bytes());committed=H(run('git','show',head+':'+p));frozen=inputs.get(p);coverage.append(dict(path=p,current_sha256=actual,head_sha256=committed,full_input_sha256=frozen,exact=actual==committed==frozen))
 if p.endswith('.test.ts'):
  matches=[t for t in full['testResults'] if t['name'].endswith('/'+p)];assert len(matches)==1;suites.append(dict(path=p,status=matches[0]['status'],assertions=len(matches[0]['assertionResults'])))
save('full-coverage.json',dict(at=at,head=head,rows=coverage,suites=suites,full_result=proof(F/'full.json'),terminal=term,all_17_exact=all(r['exact'] for r in coverage),new_full_runs=0,entire_current_main_or_live_verified=False,loaded_source_identity_not_proven=True))
config=R/'logs/run-config.jsonl';raw=config.read_bytes();line=raw.splitlines(keepends=True)[-1];runid=json.loads(line)['run_id'];pane=json.loads(run('herdr','pane','get','w1H:pBA'))['result']['pane'];tab=json.loads(run('herdr','tab','get',pane['tab_id']))['result']['tab'];assert tab['label']=='对局大脑 · '+runid
screen=run('herdr','pane','read','w1H:pBA','--source','recent-unwrapped','--lines','100');(A/'brain-screen.json').write_bytes(screen)
sample=run('nice','-n','19','python3','ops/brain_view.py','sample');(A/'brain-sample.txt').write_bytes(sample)
scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=screen+sample+b'\n'.join(p.read_bytes() for p in A.glob('*.screen.json')),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});(A/'screen-scan.log').write_bytes(scan.stdout+scan.stderr);assert scan.returncode==0
save('game-view.json',dict(at=at,run_id=runid,config_window=proof(config,line,len(raw)-len(line)),pane=pane,tab=tab,screen_sha256=H(screen),sample_sha256=H(sample),gitleaks_rc=0,no_restart=True))
print(json.dumps(dict(at=at,held=len(held),ordinary_completed=len(finished),inventory=len(rows),log_count=sum('launcher_log' in x for x in rows),all17exact=all(r['exact'] for r in coverage),mismatches=[x['path'] for x in coverage if not x['exact']],holds=sum(len(x['events']) for x in rows),game_run=runid,supervisors_out=all(x['original_supervisor_current_birth']!=str(x['deferral_record']['supervisor']['birth']) for x in held),native_preserved=sum(x['native_process_preserved'] for x in held)),ensure_ascii=False))

from pathlib import Path
import json,hashlib,subprocess,sys
from datetime import datetime
R=Path.cwd();M=R/'paper/materials/20261024-issue56-registration-integrator';sys.path.insert(0,str(R/'ops'))
from strategy_backfill_jobs import retired
sha=lambda b:hashlib.sha256(b).hexdigest()
p=R/'paper/materials/20261024-issue51-removal-detail-ops/window-completed-units.json';raw=p.read_bytes();w=json.loads(raw);lo,hi=map(datetime.fromisoformat,w['window_CST']);state=json.loads((R/'ops/codex-ops/learn.json').read_bytes())
out={'at':subprocess.check_output(['date','-Iseconds'],text=True).strip(),'window':w['window_CST'],'ops_receipt':{'path':str(p.relative_to(R)),'sha256':sha(raw)},'rows':[],'read_only':True,'model_calls':0,'production_changes':0}
prior=json.loads((R/'paper/materials/20261024-integrator-resume-2227/natural-ab-terminal-readback.json').read_bytes());priors={x['batch']:x for x in prior['rows']}
for unit in w['completed_original_units']:
 batch=unit['batch'];p=R/'ops/codex-ops/learner'/('learner-'+batch+'.tui.json');raw=p.read_bytes();j=json.loads(raw);row=state['batches'][batch]
 assert j['state']=='session-ended' and j['retirement_authorized'] and j['result']['reason']=='native-task-complete' and j['result']['code']==0
 assert row['state']=='done' and row['rc']==0 and row['external_source']==unit['source']
 assert j['session']==unit['original_session'] and j['turn']==unit['original_turn'] and j['cwd']==row['worktree']
 windows=[];offset=0;context=[];prompts=[];terminal=[]
 for line in Path(j['rollout']).open('rb'):
  e=json.loads(line);pyl=e.get('payload',{});win={'path':str(Path(j['rollout']).relative_to(R)),'offset':offset,'bytes':len(line),'sha256':sha(line)}
  if e.get('type')=='turn_context' and pyl.get('turn_id')==j['turn']:
   assert pyl['cwd']==j['cwd'] and pyl['model']=='gpt-6.1-sol' and pyl['effort']=='high';context.append({**win,'actual':{k:pyl.get(k) for k in ['turn_id','cwd','model','effort','service_tier']}})
  if e.get('type')=='response_item' and pyl.get('role')=='user':
   for c in pyl.get('content',[]):
    text=c.get('text','')
    for b in j['bindings']:
     if b['marker'] in text:
      assert b['turn_id']==j['turn'] and sha(text.encode())==b['prompt_sha256'];prompts.append({**win,'prompt_sha256':sha(text.encode()),'marker':b['marker'],'exact_binding':True})
  if e.get('type')=='event_msg' and pyl.get('type')=='task_complete' and pyl.get('turn_id')==j['turn']:
   assert pyl['last_agent_message']==j['result']['message'] and e['timestamp']==unit['task_complete_UTC'] and lo<=datetime.fromisoformat(e['timestamp'])<hi
   terminal.append({**win,'at':e['timestamp'],'message_sha256':sha(pyl['last_agent_message'].encode()),'matches_original_result':True})
  offset+=len(line)
 assert len(context)==len(prompts)==len(terminal)==1
 assert sha(Path(j['output']['path']).read_bytes())==j['output']['sha256']
 identities=[]
 for name,pid,birth in [('native',j['pid'],j['birth']),('supervisor',j['wrapper']['supervisor']['pid'],j['wrapper']['supervisor']['birth'])]:
  stat=Path('/proc')/str(pid)/'stat';current=stat.read_text().rsplit(')',1)[1].split()[19] if stat.exists() else None
  assert current!=str(birth);identities.append({'kind':name,'pid':pid,'birth':birth,'current_birth':current,'original_exited':True})
 retired(batch,row,R/'ops/codex-ops')
 out['rows'].append({'batch':batch,'source':unit['source'],'lane':unit['lane'],'session':j['session'],'turn':j['turn'],'receipt':{'path':str(p.relative_to(R)),'sha256':sha(raw)},'context':context[0],'prompt':prompts[0],'terminal':terminal[0],'output':j['output'],'identities':identities,'batch_state':row['state'],'batch_rc':row['rc'],'original_retirement_verifier_passed':True})
assert len(out['rows'])==5 and len({r['session'] for r in out['rows']})==5
out.update(independently_completed_units=5,original_window_at_least_four_verified=True,all_completed_before_registration_repair_install=True,five_parallel_slots_verified=False,repair_effect_verified=False,actual_ultrafast_verified=False,excluded=['A221314 rc3','223228 continuation','old 211311 before window','214311 no model','C214312 no model','D214313 no model'])
(M/'window-five-independent.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='rows'},ensure_ascii=False))

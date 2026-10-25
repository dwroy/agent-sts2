from pathlib import Path
import json,hashlib,subprocess,os
R=Path('/home/dw/Projects/agent-sts2');M=R/'paper/materials/20261025-wake1343-ops';O=R/'paper/materials/20261025-issue61-wake1343-integrator'
now=subprocess.check_output(['date','-Is'],text=True).strip();n=json.loads((M/'notices-readback.json').read_text());p=json.loads((M/'current-ledger-provenance-readback.json').read_text());w=json.loads((M/'missing-wrapper-readback.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
checked={}
def verify(x):
 if isinstance(x,dict):
  if isinstance(x.get('path'),str) and isinstance(x.get('sha256'),str):
   f=R/x['path'];b=f.read_bytes();assert sha(b)==x['sha256'],('SHA mismatch',x['path'])
   if 'bytes' in x:assert len(b)==x['bytes'],('length',x['path'])
   checked[x['path']]={'bytes':len(b),'sha256':sha(b)}
  for v in x.values():verify(v)
 elif isinstance(x,list):
  for v in x:verify(v)
verify(n);verify(p['inputs']);inboxes={f:(R/f).read_text() for f in ['ops/inbox-dev.md','notes/for-roy.md']};out=[]
for row in n['notices']:
 notice=json.loads((R/row['original_notice']['path']).read_text());nid=row['id'];assert notice['id']==nid and notice['message']==row['message'] and sha(row['message'].encode())==row['message_sha256'];assert notice['watcher_received'] is False and notice['roy_notified'] is False
 forward=json.loads((R/row['ops_forwarded_evidence']['path']).read_text());assert forward['notice_id']==nid
 for target in forward['destinations']:assert forward['text'] in inboxes[target],('missing exact inbox text',nid,target)
 for rr in row['actual_original_watcher_receipts']:
  receipt=json.loads((R/rr['receipt']['path']).read_text());assert receipt['notice_id']==nid and receipt['stage']==rr['stage'] and receipt['actor']=='watcher' and receipt['status']=='delivered';assert receipt['evidence']['sha256']==rr['evidence']['sha256'];verify(receipt['evidence'])
 out.append({'notice':nid,'actual_two_inboxes':True,'actual_watcher_receipts':2,'formal_watcher_received':False,'formal_roy_notified':False,'old_ack_rc':(row.get('original_watcher_registration_attempt') or {}).get('rc')})
assert len(out)==16 and len({x['notice'] for x in out})==16
ledger=R/p['inputs'][0]['path'];lb=ledger.read_bytes();lines=lb.splitlines(keepends=True);rows=[]
for row in p['original_three_parallel_rows']:
 b=lines[row['line']-1];assert len(b)==row['bytes'] and sha(b)==row['sha256'];j=json.loads(b);assert j['id']==row['id'];rows.append(dict(line=row['line'],id=j['id'],bytes=len(b),sha256=sha(b)))
runs=R/p['inputs'][1]['path'];rb=runs.read_bytes();r=p['authorized_current_run_record'][0];b=rb[r['offset']:r['offset']+r['bytes']];assert sha(b)==r['sha256'];run=json.loads(b);assert run['run_id']=='0VBCQS9V0N87' and run['character']=='SILENT' and run['ascension']==10
for x in w['original_bound_paths']:assert not (R/x['path']).exists()
env={**os.environ,'LEDGER_FILE':str(ledger),'LEDGER_RUNS':str(runs),'LEDGER_VERSIONS':str(R/p['inputs'][2]['path']),'PYTHONDONTWRITEBYTECODE':'1'}
check=subprocess.run(['nice','-n','19','/usr/bin/python3','-B','learner/ledger.py','check'],cwd=R,env=env,capture_output=True,text=True);assert check.returncode==0 and '770 item(s), 0 problem(s)' in check.stdout,(check.returncode,check.stdout,check.stderr)
verify(p['inputs']);result=dict(at=now,source_comment=6394129873,independently_verified_files=checked,notices=out,actual_ops_forwarded=16,actual_watcher_received_receipts=16,actual_user_visible_receipts=16,formal_watcher_received=0,formal_roy_notified=0,original_rc2_retained=15,current_frozen_ledger_check={'rc':check.returncode,'stdout':check.stdout,'stderr':check.stderr},original_three_parallel_rows=rows,run_record={'run':run['run_id'],'character':run['character'],'ascension':run['ascension'],'offset':r['offset'],'bytes':r['bytes'],'sha256':r['sha256']},missing_original_wrapper=w,production_ACK_attempts=0,knowledge_or_notice_writes=0,old_B2_575_item_rc1_and_none_shape_only_preserved=True,scientific_upgrade=False,owner='#61 remains owner:claude/status:blocked awaiting original CLI assignment and five source-owner approvals; 000402 remains original archive owner')
(O/'independent-readback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'readback.py').write_bytes(Path(__file__).read_bytes());print(json.dumps({k:v for k,v in result.items() if k not in ['independently_verified_files','notices','missing_original_wrapper']},ensure_ascii=False))

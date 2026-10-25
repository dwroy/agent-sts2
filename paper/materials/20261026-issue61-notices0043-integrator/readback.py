from pathlib import Path
import hashlib,json,subprocess
R=Path('/home/dw/Projects/agent-sts2');M=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
source=R/'paper/materials/20261026-notices0043-ops/readback.json';raw=source.read_bytes();d=json.loads(raw)
old=json.loads((R/'paper/materials/20261025-wake1343-ops/notices-readback.json').read_text());prior={x['id']:x for x in old['notices']}
assert d['event_count']==d['unique_notices']==16 and len(d['checked_original_files'])==92
verified={}
for n,x in d['checked_original_files'].items():
 b=(R/n).read_bytes();assert len(b)==x['bytes'] and sha(b)==x['sha256'],n;verified[n]=x
inboxes={n:(R/n).read_text() for n in ['notes/for-roy.md','ops/inbox-dev.md']};rows=[]
for current in d['notices']:
 nid=current['id'];p=prior[nid];b=(R/p['original_notice']['path']).read_bytes();n=json.loads(b)
 assert n['id']==nid and n['message']==p['message']
 assert sha(n['message'].encode())==current['message_sha256']==p['message_sha256']
 assert n['watcher_received'] is False and n['roy_notified'] is False
 forward=json.loads((R/p['ops_forwarded_receipt']['path']).read_text());ev=json.loads((R/p['ops_forwarded_evidence']['path']).read_text())
 assert forward['notice_id']==ev['notice_id']==nid and forward['actor']=='ops' and forward['stage']=='ops_forwarded' and forward['status']=='delivered'
 assert n['ops_forwarded']['sha256']==p['ops_forwarded_receipt']['sha256'] and Path(n['ops_forwarded']['path'])==R/p['ops_forwarded_receipt']['path']
 for target in ev['destinations']:assert ev['text'] in inboxes[target]
 for role in p['actual_original_watcher_receipts']:
  receipt=json.loads((R/role['receipt']['path']).read_text())
  assert receipt['notice_id']==nid and receipt['actor']=='watcher' and receipt['stage']==role['stage'] and receipt['status']=='delivered'
  assert receipt['evidence']['sha256']==role['evidence']['sha256']
 rows.append(dict(id=nid,message_unchanged=True,two_inboxes_verified=True,actual_role_receipts=2,formal_watcher_received=False,formal_roy_notified=False,current_notice_sha256=sha(b),equals_ops_snapshot=sha(b)==current['current_notice_sha256']))
missing=[]
for x in d['missing_wrapper_paths']:
 assert x['exists'] is False and not (R/x['path']).exists();missing.append(x)
assert d['formal_watcher_received']==d['formal_roy_notified']==d['production_ACK_attempts']==0
out=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),ops_readback=dict(path=str(source.relative_to(R)),bytes=len(raw),sha256=sha(raw)),unique_notices=16,original_files_verified=92,verified_files=verified,notices=rows,actual_original_role_receipts=32,formal_watcher_received=0,formal_roy_notified=0,production_ACK_commands=0,notification_or_learning_state_writes=0,missing_wrapper_paths=missing,required_wrapper_sha256=d['required_original_wrapper_sha256'],compatibility_wait=d['blockers'],ledger_rerun=False,current_notice_queue_metadata_mutable=True,priority='#70 unique full passed; LIVE isolated closure follows; no model/game/replay or full rerun')
(M/'independent-readback.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ['verified_files','notices']},ensure_ascii=False));print('all_current_notice_sha_equals_ops_snapshot',all(x['equals_ops_snapshot'] for x in rows))

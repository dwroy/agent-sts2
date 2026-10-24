from pathlib import Path
import json,hashlib,sys,datetime
R=Path('/home/dw/Projects/agent-sts2');M=R/'paper/materials/20261025-issue27-source-compat'
sys.path.insert(0,str(R/'ops'));import learning_requests as cli
H=json.loads((R/'paper/materials/20261024-2313-notices-ops/notice-handoff.json').read_text())
state_bytes=(R/'ops/codex-ops/learn.json').read_bytes();state=json.loads(state_bytes)
prior=json.loads((R/'paper/materials/20261025-issue27-role-receipts/registration-results.json').read_text())
def ref(p):
 p=Path(p);p=p if p.is_absolute() else R/p;b=p.read_bytes();return dict(path=str(p.relative_to(R)),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b))
def readj(p):return json.loads((R/p).read_bytes())
groups=[]
for key,sourcepath in [('13','paper/materials/20261021-issues-13-14-terminal-ops/7430982d1c28981e46d44d75-manual-source.json'),('14','paper/materials/20261021-issues-13-14-terminal-ops/751e5b79d972608c69f79626-manual-source.json'),('27-B1','paper/materials/20261022-1913-ops/issue27-notice-source.json'),('27-B2','paper/materials/20261023-issue27-batch2-terminal-ops/notice-source.json')]:
 groups.append(dict(group=key,source_binding=ref(sourcepath),source=readj(sourcepath)))
log='learner/runs/20261021-104418-def3aea5-81a4-47a6-85d4-5dd8fb129249-issue-4-elite-calibration-task.jsonl'
ev=[json.loads(l) for l in (R/log).read_text().splitlines() if l.strip()];la=next(e for e in ev if e.get('type')=='learner_launch')
s=dict(schema='manual-learning-notice-v1',request_id='silent-elite-simulation-pessimism-20261021',task=la['task'],character='silent',thread_id=next(e['thread_id'] for e in ev if e.get('type')=='thread.started'),worktree=la['cwd'],batch=la['params']['batch'],original_log=ref(log),input=ref(la['params']['evidence']),original_message=ref(Path(log).with_suffix('')/'disagreements.json'))
# This new candidate is audit material, not a source-owner attestation or accepted CLI provenance.
(M/'issue4-source-candidate.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
groups.insert(0,dict(group='4',source_binding=ref(M/'issue4-source-candidate.json'),binding_status='derived readonly candidate; source owner confirmation pending',source=s))
rows=[]
for g in groups:
 s=g['source'];refs={k:ref(s[k]['path']) for k in ['original_log','input','original_message']}
 assert all(refs[k]['sha256']==s[k]['sha256'] for k in refs)
 events=[json.loads(l) for l in (R/s['original_log']['path']).read_text().splitlines() if l.strip()]
 launches=[e for e in events if e.get('type')=='learner_launch'];summaries=[e for e in events if e.get('type')=='learner_summary'];threads={e.get('thread_id') for e in events if e.get('type')=='thread.started'}
 assert len(launches)==len(summaries)==1 and threads=={s['thread_id']}
 launch=launches[0];params=launch['params'];scratch=(R/s['original_log']['path']).with_suffix('')
 assert launch['engine']=='codex' and launch['task']==s['task'] and launch['cwd']==s['worktree'] and params['worktree']==s['worktree'] and params['scratch']==str(scratch) and params['batch']==s['batch'] and summaries[0]['exit_code']==0
 assert Path(params['evidence'])==R/s['input']['path'] and (R/s['original_message']['path']).parent==scratch
 frozen=readj(s['input']['path']);orig=(R/s['original_message']['path']).read_bytes();value=json.loads(orig)
 assert all(frozen[k]==s[k] for k in ['request_id','task','batch','character'])
 leaves=value if isinstance(value,list) else value['findings'] if g['group']=='14' else [value]
 g.update(verified_sources=refs,input_schema=frozen.get('schema'),input_identity={k:frozen.get(k) for k in ['issue','request_id','task','batch','character','worktree']},launch_identity_verified=True,summary_exit_code=0,thread_verified=True,original_shape='list' if isinstance(value,list) else 'object',original_items=len(leaves),item_container='/' if isinstance(value,list) else '/findings' if g['group']=='14' else '',current_contract_failures=['task not in manual V6 allowlist','input outside original manual V6 ops/codex-ops/learner layout'])
 if s['request_id'] not in launch.get('prompt',''):g['current_contract_failures'].append('request id absent from launch prompt; original evidence path plus frozen input binds request')
 for h in H['notices']:
  n=readj(h['notice_path'])
  if n['request_id']!=s['request_id'] or n['request_sha256'] not in [s['original_message']['sha256'],s['input']['sha256']]:continue
  mid=n['id'];p=next(x for x in prior['notices'] if x['notice_id']==mid)
  token=cli.digest(cli.canonical([n['request_sha256'],n['kind'],n['message']]))[:24];assert token==mid
  payload=readj(p['watcher_received_receipt']['path'])
  try: cli.ack_request(R,state,n,payload,s);error=None
  except ValueError as e:error=str(e)
  # Only pure source validation called; no main(), locks, CLI ACK, state or notice writes.
  whole=cli.contains_original(orig,n['message'].encode(),inline=True)
  try:sent=json.loads(n['message'])
  except ValueError:sent=None
  matches=[i for i,v in enumerate(leaves) if cli.canonical(v)==cli.canonical(sent)]
  assert len(matches)==1,(g['group'],mid,matches)
  if not whole and 'whole-file producer words do not match a per-item notice' not in g['current_contract_failures']:g['current_contract_failures'].append('whole-file producer words do not match a per-item notice')
  if n['kind'] not in ['learner-dissent','disagreement']:
   g['current_contract_failures'].append('notice kind outside current manual V6 allowlist: '+n['kind'])
  verified_receipts={}
  for stage in ['watcher_received','roy_notified']:
   rr=p[stage+'_receipt'];actual=ref(rr['path']);assert actual['sha256']==rr['sha256'];rp=readj(rr['path']);assert rp['notice_id']==mid and rp['stage']==stage and rp['actor']=='watcher' and rp['status']=='delivered';er=ref(rp['evidence']['path']);assert er['sha256']==rp['evidence']['sha256'];verified_receipts[stage]=dict(receipt=actual,evidence=er)
  op=n['ops_forwarded'];oref=ref(op['path']);assert oref['sha256']==op['sha256'];opsreceipt=readj(op['path']);assert opsreceipt['actor']=='ops' and opsreceipt['status']=='delivered' and opsreceipt['notice_id']==mid;assert ref(opsreceipt['evidence']['path'])['sha256']==opsreceipt['evidence']['sha256']
  assert not n.get('watcher_received') and not n.get('roy_notified')
  rows.append(dict(group=g['group'],notice_id=mid,notice=ref(h['notice_path']),request_sha256=n['request_sha256'],kind=n['kind'],canonical_notice_token_verified=True,source_binding=g['source_binding'],item_index=matches[0],item_id=leaves[matches[0]].get('id'),item_sha256=cli.digest(cli.canonical(leaves[matches[0]])),whole_original_matches_current_guard=whole,exact_full_item_match=True,pure_current_source_validation_error=error,CLI_ACK_invocations=0,ops_forwarded_verified=oref,verified_frozen_own_receipts=verified_receipts,watcher_received=False,roy_notified=False))
 g['notices']=[r['notice_id'] for r in rows if r['group']==g['group']]
assert all(r['source_binding'] for r in rows)
assert len(rows)==15 and len({r['notice_id'] for r in rows})==15
assert all(g['source']['request_id'] not in state.get('learning_requests',{}) for g in groups)
missing=readj('paper/materials/20261023-1956-ops/missing-original-log-review.json')
missing_id='0ca61b2ba10a18ca2e12f5b3';mn=readj('ops/codex-ops/learning-notices/'+missing_id+'.json');assert not mn.get('watcher_received') and not mn.get('roy_notified')
parent=state['learning_requests'][mn['request_id']];assert parent['state']=='blocked'
paths=['.worktrees/exp/learner/runs/20261013-000403-experience-update.jsonl','learner/runs/20261013-000403-experience-update.jsonl'];assert all(not (R/p).exists() for p in paths)
result=dict(at=datetime.datetime.now().astimezone().isoformat(timespec='seconds'),role='watcher',scheduler_snapshot_sha256=hashlib.sha256(state_bytes).hexdigest(),research_source_requests_registered=False,missing_original_parent_state=parent['state'],CLI=ref('ops/learning_requests.py'),pure_source_validation_only=True,production_CLI_ACK_invocations=0,groups=groups,notices=rows,missing_original=dict(notice_id=missing_id,request_id=mn['request_id'],review=ref('paper/materials/20261023-1956-ops/missing-original-log-review.json'),required_original_sha256='b1be2be174208edcafe23f3e0e47f4236560577c2752b6a02f88bd094755a765',absent_paths=paths,manual_source_route_allowed=False),formal_stages=dict(ops_forwarded=16,watcher_received=0,roy_notified=0),notice_or_parent_or_role_state_written=False)
(M/'source-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for g in groups:print(g['group'],len(g['notices']),g['input_schema'],g['current_contract_failures'])
print('15 exact original items; formal stages ops16 watcher0 roy0; production CLI ACK calls0')

from pathlib import Path
import hashlib,json,subprocess
R=Path('/home/dw/Projects/agent-sts2');P=R/'paper/materials/20261024-issue51-encounter-paired-ops'; B=R/'paper/materials/20261024-issue51-blade-paired-ops'; M=R/'paper/materials/20261024-issue37-20-r434-integrator/notice51';M.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
now=subprocess.check_output(['date','-Iseconds'],text=True).strip()
notice=(P/'original/scratch/supervisor-notice.md').read_bytes()
f=json.loads((P/'supervisor-forwarding.json').read_bytes());assert sha(notice)==f['original_notice']['sha256']
for n in ['notes/for-roy.md','ops/inbox-dev.md']:assert notice in (R/n).read_bytes(),n
v=json.loads((P/'verification.json').read_bytes()); actual=[]
for x in v['actual_main_live_rows']:
 root=R if x['root']=='main' else R/'.worktrees/live';data=(root/x['path']).read_bytes()
 assert sha(data)==x['sha256'] and len(data)==x['bytes'],x
 actual.append(dict(root=x['root'],path=x['path'],sha256=sha(data),bytes=len(data)))
consumers=json.loads((P/'actual-live-consumers.json').read_bytes());assert consumers['passed']
blade=json.loads((B/'actual-live-consumers.json').read_bytes()); assert blade['passed']
for n,x in json.loads((P/'R435-return-verified.json').read_bytes())['original_receipts'].items():assert sha((R/x['path']).read_bytes())==x['sha256'],n
publication=json.loads((B/'publication.json').read_bytes());protected=[]
for label,root,commit in [('main',R,publication['source']['commit']),('live',R/'.worktrees/live',publication['behavior']['commit'])]:
 for key,name in [('strategies','strategy-entries.json'),('rows','reflex.json')]:
  n='knowledge/characters/silent/'+name
  current={e['id']:e for e in json.loads((root/n).read_bytes())['entries']}
  old={e['id']:e for e in json.loads(subprocess.check_output(['git','show',commit+':'+n],cwd=R))['entries']}
  ids=[e['id'] for e in blade['strategies']] if key=='strategies' else [e['rk_id'] for e in blade['rows']]
  assert len(ids)==6
  for i in ids:assert current[i]==old[i],(label,name,i)
  protected.append(dict(root=label,path=n,exact_ids=ids,original_published_commit=commit))
rows=json.loads((P/'original/scratch/source-ledger.json').read_bytes());assert len(rows)==6
assert sum(x['disposition']=='new_context' for x in rows)==2
assert sum(x['disposition']=='update_same_id' for x in rows)==4
assert len({s for x in rows for s in x['own_support_runs']})==4
assert all(x['rk_qualification']=='descriptive_tag_only' and x['executable_comparisons']==0 for x in rows)
replay=json.loads((P/'original/scratch/replay-inventory.json').read_bytes());assert all(x['state']=='waiting' and x['original_complete_request_board'] is None and x['original_plans'] is None for x in replay['cases'])
proof=[]
for n in ['supervisor-forwarding.json','original/scratch/supervisor-notice.md','original/scratch/source-ledger.json','original/scratch/replay-inventory.json','original/scratch/plan-gap-audit.json','verification.json','publication.json','actual-live-consumers.json','R435-return-verified.json','knowledge-preserved.json','issue-comment-readback.json']:
 p=P/n;b=p.read_bytes();proof.append(dict(path=str(p.relative_to(R)),sha256=sha(b),bytes=len(b)))
receipt=dict(at=now,actor='watcher',stage='watcher_received',status='delivered',issue=51,source_type='strategy-proposal',source_batch='C182343',release_id='V6-R436',original_notice_path=f['original_notice']['path'],original_notice_sha256=sha(notice),actual_original_received=True,both_inboxes_original_exact=True,proof=proof,actual_data_readback=actual,R435_six_strategy_six_rk_exact=protected,contexts=6,new_contexts=2,updated_contexts=4,independent_support_runs=4,descriptive_rk=6,executable_comparisons=0,original_full_Plan_missing=6,scientific_parents_open=True,natural_adoption_benefit='pending',formal_ack_cli_invoked=False,manual_notice_fabricated=False,other_role_ack=False,ops_original_status_rewritten=False,full_runs_added=0,production_operations=0)
(M/'watcher-received.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
message='''Roy，C182343 六遭遇已发布 V6-R436，六组文字/rk 已固定读回。学习者提醒：这批只有 **2 个新情境、4 个同 ID 更新**；六个 rk 都是描述标签，可执行比较仍为 0。原完整 request.state、Plan.steps/outcome 和同 seed 结果矩阵仍缺，下一步由原 owner 在原 506 名单及截止范围内补原件，或保持 waiting；不扩批、不重开旧 005，科学父保持开放。

每个情境只有 1 次动作窗口，来自 4 个独立支持局；反例不能因本次发布被覆盖，自然采用和收益仍待。R435 知识会保留。当前 #37＋#20 唯一 full 已报告 118 文件、暂未报失败，继续等终态。'''
(M/'roy-visible-message.md').write_text(message+'\n')
p=M/'roy-visible-message.md'
(M/'roy-notified.json').write_text(json.dumps(dict(at=now,actor='watcher',stage='roy_notified',status='delivered',delivery='user-visible commentary in current integrator conversation',source_batch='C182343',release_id='V6-R436',evidence=dict(path=str(p.relative_to(R)),sha256=sha(p.read_bytes())),watcher_receipt=dict(path=str((M/'watcher-received.json').relative_to(R)),sha256=sha((M/'watcher-received.json').read_bytes())),roy_personally_acknowledged=False,formal_ack_cli_invoked=False,other_role_ack=False,scientific_parents_open=True),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(received=str(M/'watcher-received.json'),notified=str(M/'roy-notified.json'),protected=len(protected),proofs=len(proof))))

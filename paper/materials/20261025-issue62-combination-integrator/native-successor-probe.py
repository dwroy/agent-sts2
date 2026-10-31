from pathlib import Path
import json, hashlib, subprocess
R=Path('/home/dw/Projects/agent-sts2');M=R/'paper/materials/20261025-issue62-combination-integrator';O=R/'paper/materials/20261025-issue62-native-evidence-ops'
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
d=read(O/'gap-and-successor-readback.json');idx=read(O/'successor-raw-context-readback.json');new=d['new_natural_evidence'];ref=new['brain_ref']
with (R/ref['path']).open('rb') as f:f.seek(ref['offset']);brain_bytes=f.read(ref['bytes'])
assert len(brain_bytes)==ref['bytes'] and sha(brain_bytes)==ref['sha256']
brain=json.loads(brain_bytes)
assert brain['run_id']==new['run']=='5K2E6HYNAAG1' and brain['question_id']==new['question']=='mvne69l3-107318-12' and brain['accepted'] is True
assert brain['label']==new['label']=='shop/plan' and brain['native_receipt']==new['native_receipt']
contexts=[]
for x in idx['retained_contexts']:
 b=(R/x['retained_path']).read_bytes()
 assert len(b)==x['bytes'] and sha(b)==x['sha256'] and b.endswith(b'\n') and b.count(b'\n')==1
 assert sha(b[:-1])==x['adapter_line_without_newline_sha256']
 row=json.loads(b);p=row['payload'];assert row['type']=='turn_context' and p['turn_id']==x['turn']
 assert p['cwd']==x['source_cwd'] and p['model']==x['model']=='gpt-6.1-sol' and p['effort']==x['effort']=='high'
 assert p['collaboration_mode']['settings']['model']==p['model'] and p['collaboration_mode']['settings']['reasoning_effort']==p['effort']
 source=Path(x['original_path']);available=source.is_file(); source_checked=False
 if available:
  with source.open('rb') as f:f.seek(x['source_offset']);original=f.read(x['bytes'])
  assert original==b;source_checked=True
 contexts.append(dict(retained_path=x['retained_path'],bytes=len(b),sha256=sha(b),adapter_line_sha256=sha(b[:-1]),turn=p['turn_id'],model=p['model'],effort=p['effort'],original_path_present=available,original_slice_compared=source_checked))
primary=new['raw_context'];raw=(R/primary['durable_public_path']).read_bytes();assert raw==(R/primary['retained_path']).read_bytes()
assert len(raw)==816 and sha(raw)==primary['sha256']=='0fc545069cdc5b622b463d0fb8c99586edb741ff2b777ca108c7f147d16497b7'
p=json.loads(raw)['payload'];receipt=brain['native_receipt']
assert receipt['sha256']==sha(raw[:-1])=='565301efd797b691ca00b0aff54fc9e6652ccbc92c3e6b1d3f6ca95277abd1c2'
assert receipt['turn_id']==p['turn_id']==primary['turn'] and receipt['thread_id']==primary['session_meta_id']=='01a17194-7add-7c52-8de6-2bbd56a54d2d'
assert receipt['engine']=='codex' and receipt['source']=='turn_context' and receipt['model']==p['model'] and receipt['effort']==p['effort']
prior=M/'natural-runtime-release-readback.json';assert sha(prior.read_bytes())=='041fa647d369db55b77681fd6e8aad9a6634181a1a926c0a9ee331c7e8636401'
old=d['old_first_context'];oldops=R/'paper/materials/20261025-issue62-natural-publication-ops/natural-native-context.json'
assert old in read(oldops) and old['session']!=receipt['thread_id'] and old['turn']!=receipt['turn_id']
assert not (R/old['path']).exists()
source_hashes=[]
for x in d['source']:
 b=(R/x['path']).read_bytes();e=(R/x['excerpt']).read_bytes()
 assert sha(b)==x['sha256'] and sha(e)==x['excerpt_sha256']
 source_hashes.append(dict(path=x['path'],sha256=sha(b),excerpt_sha256=sha(e)))
session=(R/d['source'][0]['path']).read_text();adapter=(R/d['source'][1]['path']).read_text()
assert session.index('const receipt = nativeReceipt(')<session.index('await this.revert(server, threadId, turn);')
assert '"thread/delete"' in session and '"thread/revert"' in session and 'closeSync()' in session
assert 'createHash("sha256").update(line)' in adapter and 'text.split("\\n")' in adapter
now=subprocess.check_output(['date','-Is'],text=True).strip()
result=dict(at=now,authority_comment=6394096750,natural_run=brain['run_id'],question_id=brain['question_id'],label=brain['label'],accepted=True,
 original_brain_slice=dict(**ref,verified=True),raw_context=dict(path=primary['durable_public_path'],bytes=len(raw),sha256=sha(raw),adapter_line_sha256=sha(raw[:-1])),
 native_receipt=receipt,raw_context_matches_actual_brain_receipt=True,independently_verified_model=p['model'],independently_verified_effort=p['effort'],
 thread_id_provenance='Actual accepted brain native_receipt matches ops retained-context session_meta index; retained turn_context has turn_id and cwd, not thread id. Original rollout no longer present at this readback.',
 retained_contexts=contexts,old_first_context=dict(expected=old,original_path_still_absent=True,raw_independent_verification_gap_open=True),prior_independent_readback_sha256=sha(prior.read_bytes()),
 source_hashes_verified=source_hashes,cleanup_source_order_verified=True,historical_deletion_time_or_syscall_known=False,
 old_first_context_replaced_or_reconstructed=False,old_receipts_modified=False,new_model_game_full_product_production_release_listener_actions=0,
 specific_new_learning_adoption_or_benefit_claimed=False,
 followup='Lead to assign original brain-adapter owner separately to assess durable exact native receipt retention before cleanup; do not add code to issue63/64 or reopen released issue62 UI.',
 source_receipts={str(q.relative_to(R)):sha(q.read_bytes()) for q in [O/'gap-and-successor-readback.json',O/'successor-raw-context-readback.json',oldops]})
out=M/'natural-successor-independent-readback.json';assert not out.exists();out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(M/'native-successor-probe.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps(dict(at=now,result_sha256=sha(out.read_bytes()),question=brain['question_id'],model=p['model'],effort=p['effort'],retained_contexts_verified=len(contexts),original_paths_present=sum(c['original_path_present'] for c in contexts),first_gap_open=True)))

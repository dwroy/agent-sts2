from pathlib import Path
import copy,hashlib,json,subprocess,sys,os,shutil
R=Path.cwd();L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue51-shop-paired-ops';D=R/'ops/codex-ops';sys.path.insert(0,str(R/'ops'));from learner_checks import read_report
sha=lambda b:hashlib.sha256(b).hexdigest();raw=lambda j:(json.dumps(j,ensure_ascii=False,indent=2)+'\n').encode()
def put(p,j):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(j if isinstance(j,bytes) else raw(j))
def ref(p):b=p.read_bytes();return {'path':str(p.relative_to(R)),'bytes':len(b),'sha256':sha(b)}
bid='20261024-184318-strategy-proposal';b=json.loads((D/'learn.json').read_bytes())['batches'][bid];assert b['state']=='done' and b['rc']==0 and not b.get('proposal_audit_errors');report=b['report'];P=Path(report['report']).parent;W=P.parents[2];S=P/'scratch';assert read_report(str(D/'learner'/f'{bid}.out'))==read_report(str(P/'report.md'))==report;assert json.loads((P/'result.json').read_bytes())==report
put(M/'retired-worktree-boundary.json',{'original_base':report['base'],'git_metadata_present':(W/'.git').exists(),'current_git_fallback_not_used_as_learner_head':True,'batch_done_rc0':True,'no_source_proposals':report['code_proposals']==[],'source_commit':None,'original_report_and_scheduler_audit_agree':True});assert report['code_proposals']==[] and report['merged'] is None
for field in ['input_manifest','work_spec']:
 r=b['external_binding'][field];v=(R/r['path']).read_bytes();assert len(v)==r['bytes'] and sha(v)==r['sha256']
verified=[]
omitted=[]
for row in json.loads((S/'artifact-manifest.json').read_bytes())['files']:
 p=W/row['path'];assert p.is_relative_to(P);v=p.read_bytes();assert len(v)==row['bytes'] and sha(v)==row['sha256'],str(p);verified.append(row)
 if p.name in ['shop-state-projections.json','shop-enriched.json','shop-contexts.json']:omitted.append({**row,'reason':'Rebuildable bulk process projection, not a published source. Original remains untouched; keep SHA, raw refs and extraction scripts.'})
 else:put(M/'original'/p.relative_to(P),v)
put(M/'unarchived-process-copies.json',{'original_files_not_deleted':True,'omitted':omitted})
for n in ['report.md','result.json','scratch/artifact-manifest.json']:put(M/'original'/n,(P/n).read_bytes())
input_verified=json.loads((P/'input-verification.json').read_bytes())['checks']
for row in input_verified:
 p=Path(row['path']);v=p.read_bytes();assert len(v)==row['bytes'] and sha(v)==row['sha256']
scope=json.loads((R/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_bytes());allowed={x['run_id'] for x in scope['runs']};windows=json.loads((S/'raw-read-inventory.json').read_bytes())['refs'];selected_raw=json.loads((S/'selected-raw-refs.json').read_bytes());selected_keys={(x['stream'],x['offset']) for x in selected_raw};selected_states={};raw_verified=[]
for row in windows:
 stream=row['stream'];off=row.get('offset',row.get('off'));cut=scope['raw_stream_cutoffs'][stream];assert off+row['bytes']<=cut['max_bytes'];src=R/cut['path']
 with src.open('rb') as f:f.seek(off);v=f.read(row['bytes'])
 assert len(v)==row['bytes'] and sha(v)==row['sha256'];j=json.loads(v);run=j.get('run_id') or j.get('state',{}).get('run_id');assert run in allowed
 raw_verified.append({'stream':stream,'path':cut['path'],'offset':off,'bytes':len(v),'sha256':sha(v),'cutoff':cut['max_bytes'],'run':run})
 if (stream,off) in selected_keys:
  path=M/'original/scratch/ops-raw'/f'{stream}-{off}.jsonl';put(path,v)
  if stream=='states':selected_states[off]={'path':str(path),'sha256':sha(v)}
assert len(windows)==4228 and len(selected_keys)==42
put(M/'verified-raw-windows.json',raw_verified)
# Rebase provenance paths only to the byte-identical durable archive; preserve learner originals.
relP=str(P.relative_to(W));rebase={};
def relocate(x):
 if isinstance(x,dict):return {k:relocate(v) for k,v in x.items()}
 if isinstance(x,list):return [relocate(v) for v in x]
 if isinstance(x,str):
  if x.startswith(str(P)+'/'):
   new=str(M/'original')+x[len(str(P)):];rebase[x]=new;return new
  if x.startswith(relP+'/'):
   new=str((M/'original').relative_to(R))+x[len(relP):];rebase[x]=new;return new
 return x
original_strategy=json.loads((S/'strategy-candidates.json').read_bytes());original_draft={'reflex':json.loads((S/'reflex-candidates.json').read_bytes()),'vocab':json.loads((S/'reflex-vocab-candidates.json').read_bytes())};strategydoc=relocate(original_strategy);draft=relocate(original_draft);strategies=strategydoc['entries'];rks=draft['reflex']['entries'];vocab=draft['vocab'];put(A/'normalized-strategy.json',strategydoc);put(A/'normalized-reflex.json',draft['reflex']);put(A/'normalized-vocab.json',vocab)
# A reverse rebase must restore the complete original values, with no game-knowledge edits.
reverse={v:k for k,v in rebase.items()}
def restore(x):
 if isinstance(x,dict):return {k:restore(v) for k,v in x.items()}
 if isinstance(x,list):return [restore(v) for v in x]
 return reverse.get(x,x) if isinstance(x,str) else x
assert restore(strategydoc)==original_strategy and restore(draft)==original_draft
for e in rks:
 assert e['signal']['kind']=='tag'
 for r in e['sources']:assert sha((R/r['path']).read_bytes())==r['sha256']
mapping=json.loads((S/'context-mapping.json').read_bytes());paired=[x for x in mapping if x['disposition']=='new'];selected=[]
for pair in paired:
 witnesses=json.loads((S/(pair['context']+'-evidence.json')).read_bytes());case=witnesses[0];st=selected_states[case['pre']['ref']['offset']];selected.append({'strategy_id':pair['strategy_id'],'rk_id':pair['rk_id'],'knowledge_candidate_id':pair['knowledge_id'],'context':pair['context'],'support_run':case['pre']['run_id'],'original_case':{'state':st},'condition':'Exact current shop facts only; read body for dynamic budget, removal eligibility and action legality','action':next(e['label_en'] for e in rks if e['id']==pair['rk_id'])})
ids=[e['id'] for e in strategies];rk_ids=[e['id'] for e in rks];assert len(ids)==len(rk_ids)==len(selected)==6;held=[]
reused=json.loads((S/'reused-full-potion-entry.json').read_bytes());reused_id='silent-brain-potion-full-shop-replacement'
leaves=['knowledge/characters/silent/strategy-entries.json','knowledge/characters/silent/reflex.json','knowledge/characters/silent/reflex-vocab.json'];snap={}
for tag,root in [('main',R),('live',L)]:
 before={leaf:(root/leaf).read_bytes() for leaf in leaves}
 for leaf,v in before.items():assert v==subprocess.check_output(['git','-C',str(root),'show','HEAD:'+leaf]),'uncommitted target drift'
 lib=json.loads(before[leaves[0]]);assert not set(ids)&{e['id'] for e in lib['entries']};assert next(e for e in lib['entries'] if e['id']==reused_id)==reused;updates=[];lib['entries']+=strategies
 reflex=json.loads(before[leaves[1]]);assert not set(rk_ids)&{e['id'] for e in reflex['entries']};reflex['entries']+=rks
 vo=json.loads(before[leaves[2]])
 for dim,items in vocab['dimensions'].items():
  current={x['id'] for x in vo['dimensions'][dim]};assert not current&{x['id'] for x in items};vo['dimensions'][dim]+=items
 candidates=dict(zip(leaves,map(raw,[lib,reflex,vo])));snap[tag]={'before':{leaf:{'sha256':sha(v),'bytes':len(v)} for leaf,v in before.items()},'after':{leaf:{'sha256':sha(v),'bytes':len(v)} for leaf,v in candidates.items()},'updates':updates,'before_strategy_count':len(lib['entries'])-6,'after_strategy_count':len(lib['entries']),'before_reflex_count':len(reflex['entries'])-6,'after_reflex_count':len(reflex['entries'])}
 candidate_root=A/(tag+'-candidate-root');knowledge=candidate_root/'knowledge';silent=knowledge/'characters/silent';silent.mkdir(parents=True,exist_ok=True)
 for p in (root/'knowledge').iterdir():
  if p.name=='characters':continue
  dest=knowledge/p.name
  if not dest.exists():dest.symlink_to(p,target_is_directory=p.is_dir())
 for p in (root/'knowledge/characters').iterdir():
  if p.name=='silent':continue
  dest=knowledge/'characters'/p.name
  if not dest.exists():dest.symlink_to(p,target_is_directory=p.is_dir())
 for p in (root/'knowledge/characters/silent').iterdir():
  leaf=str(p.relative_to(root));dest=silent/p.name
  if leaf in candidates:put(dest,candidates[leaf])
  elif not dest.exists():dest.symlink_to(p,target_is_directory=p.is_dir())
 for leaf,v in before.items():put(M/'preimages'/tag/leaf,v)
put(M/'provenance-rebase.json',{'only_paths_changed':True,'reverse_exact':True,'map':rebase,'normalized_strategy':strategydoc,'normalized_reflex':draft['reflex']})
put(M/'assembly.json',{'at':subprocess.check_output(['date','-Is'],text=True).strip(),'batch':bid,'authority_comment':6382974399,'selected_strategy_ids':ids,'selected_rk_ids':rk_ids,'selected_pairs':selected,'held_pairs':held,'source_counts':report['decision_output_counts'],'snapshots':snap,'source_files':{'strategy':ref(A/'normalized-strategy.json'),'rk':ref(A/'normalized-reflex.json'),'vocab':ref(A/'normalized-vocab.json')},'verified_inventory_files':len(verified),'verified_input_files':len(input_verified),'raw_windows_verified':len(windows),'new_models_full_games':0,'data_only':True,'complete_playbook_publication':False,'executable_card_pick_advice':0,'strategy_projection_ids_added':6,'knowledge_new_contexts':6,'knowledge_updated_contexts':0,'knowledge_custom_candidates_formal_consumer':'pending','byte_reused_strategy':reused_id,'archived_files':len(verified)-len(omitted),'bulk_process_copies_not_duplicated':len(omitted)})
put(M/'verified-inventory.json',verified)
tp=D/'learner'/f'learner-{bid}.tui.json';t=json.loads(tp.read_bytes());binding=t['bindings'][0];context=None;prompt=None;terminal=None;off=0
with Path(t['rollout']).open('rb') as f:
 for v in f:
  j=json.loads(v);p=j.get('payload',{});start=off;off+=len(v)
  if j.get('type')=='turn_context' and p.get('turn_id')==binding['turn_id'] and context is None:context={'at':j.get('timestamp'),'offset':start,'bytes':len(v),'sha256':sha(v),**{k:p.get(k) for k in ['model','effort','service_tier','cwd','sandbox_policy']}}
  if j.get('type')=='response_item' and p.get('role')=='user':
   for part in p.get('content',[]):
    text=part.get('text','')
    if sha(text.encode())==binding['prompt_sha256']:prompt={'at':j['timestamp'],'offset':start,'bytes':len(v),'sha256':sha(v),'prompt_sha256':binding['prompt_sha256'],'frozen_input_matched':report['input_sha256'] in text}
  if j.get('type')=='event_msg' and p.get('type')=='task_complete' and p.get('turn_id')==binding['turn_id']:terminal={'at':j.get('timestamp'),'offset':start,'bytes':len(v),'sha256':sha(v)}
assert context and prompt and terminal and context['model']=='gpt-6.1-sol' and context['effort']=='high' and t['retirement_authorized'] is True
launch=json.loads((D/'learner'/f'{bid}.external-launch.json').read_bytes());put(M/'native.json',{'tui':ref(tp),'context':context,'prompt':prompt,'terminal':terminal,'retirement_authorized':True,'launch_request':launch['external_tier'],'service_tier_actual':context['service_tier'],'tier_unknown_not_inferred_from_request':True,'source_permissions_changed':False})
q=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(p.read_bytes() for p in M.rglob('*') if p.is_file()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});put(A/'input-gitleaks.log',q.stdout+q.stderr);assert q.returncode==0
print(json.dumps({'contexts':6,'new':6,'knowledge_updates':0,'strategy_ids_added':6,'rk':6,'rk_waiting_contexts':0,'inventory':len(verified),'raw_windows':4228,'snapshots':{n:(s['after_strategy_count'],s['after_reflex_count']) for n,s in snap.items()},'native_tier':context['service_tier'],'provenance_rebase_reverse_exact':True}))

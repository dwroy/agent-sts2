from pathlib import Path
import copy,hashlib,json,subprocess,sys,os
R=Path.cwd();L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue51-relic-paired-ops';D=R/'ops/codex-ops';sys.path.insert(0,str(R/'ops'));from learner_checks import read_report
sha=lambda b:hashlib.sha256(b).hexdigest();raw=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def put(p,j):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(j if isinstance(j,bytes) else raw(j))
def ref(p):v=p.read_bytes();return {'path':str(p.relative_to(R)),'bytes':len(v),'sha256':sha(v)}
bid='20261024-191311-strategy-proposal';b=json.loads((D/'learn.json').read_bytes())['batches'][bid];report=b['report'];P=Path(report['report']).parent;W=P.parents[2];S=P/'scratch';assert b['state']=='done' and b['rc']==0 and not b.get('proposal_audit_errors');assert read_report(str(D/'learner'/f'{bid}.out'))==read_report(str(P/'report.md'))==report==json.loads((P/'result.json').read_bytes());assert report['merged'] is None and report['code_proposals']==[] and report['fixes']==[]
put(M/'original-report-boundary.json',{'batch':bid,'report_out_result_equal':True,'original_base':report['base'],'git_metadata_present':(W/'.git').exists(),'source_commit':None,'original_tests':report['tests'],'batch_done_rc0':True,'source_audit_errors':b.get('proposal_audit_errors',[]),'no_upward_git_fallback':True})
for key in ['input_manifest','work_spec']:
 v=b['external_binding'][key];p=R/v['path'];assert ref(p)['bytes']==v['bytes'] and ref(p)['sha256']==v['sha256'];put(M/(key+'.json'),v)
archive=[];omitted=[]
for p in sorted(P.rglob('*')):
 if not p.is_file() or '__pycache__' in p.parts or p.is_symlink() or p.name in ['tui.sh','tui.pid','tui-prompt.txt']:continue
 v=p.read_bytes();row={'path':str(p.relative_to(W)),'bytes':len(v),'sha256':sha(v)};archive.append(row)
 if len(v)>2_000_000:omitted.append({**row,'reason':'rebuildable bulk projection retained at original; raw references/scripts and SHA archived'})
 else:put(M/'original'/p.relative_to(P),v)
put(M/'verified-inventory.json',archive);put(M/'unarchived-process-copies.json',{'original_files_not_deleted':True,'omitted':omitted})
inputs=[]
for row in json.loads((S/'input-verification.json').read_bytes())['checks']:
 name=row['path'];p=W/name
 if not p.is_file():p=R/name
 if p.is_file():
  h=hashlib.sha256()
  with p.open('rb') as f:
   for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
  assert p.stat().st_size==row['bytes'] and h.hexdigest()==row['sha256'],name
  inputs.append({**row,'verified_path':str(p.relative_to(R))})
 else:
  v=subprocess.check_output(['git','show',report['base']+':'+name]);assert len(v)==row['bytes'] and sha(v)==row['sha256'];inputs.append({**row,'verified_git_base':report['base']})
put(M/'verified-inputs.json',inputs)
scope=json.loads((R/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_bytes());allowed={v['run_id'] for v in scope['runs']};windows=[]
for p in sorted(S.glob('*seeks.json')):windows+=json.loads(p.read_bytes())
assert len(windows)==1765
mapping=json.loads((S/'context-mapping.json').read_bytes());selected=[];need={}
for pair in mapping:
 ev=json.loads(Path(pair['evidence']).read_bytes());case=(ev if isinstance(ev,list) else ev['purchases'])[0];st=case['before']['ref'];need[(st['stream'],st['offset'])]=st
 selected.append({'strategy_id':pair['strategy_id'],'rk_id':pair['rk_id'] if pair['paired'] else None,'knowledge_candidate_id':pair['knowledge_id'],'context':pair['context'],'support_run':case['before']['run_id'],'state_ref':st,'label':case['decision']['label']})
verified=[];seen=set();selected_states={}
for row in windows:
 stream=row['stream'];off=row['offset'];cut=scope['raw_stream_cutoffs'][stream];assert row['cutoff']<=cut['max_bytes'] and off+row['bytes']<=row['cutoff'];p=R/cut['path']
 with p.open('rb') as f:f.seek(off);v=f.read(row['bytes'])
 assert len(v)==row['bytes'] and sha(v)==row['sha256'];j=json.loads(v);run=j.get('run_id') or j.get('state',{}).get('run_id');assert run in allowed,(stream,off,run)
 verified.append({**row,'run_id':run});seen.add((stream,off))
 if (stream,off) in need:
  dest=M/'original/scratch/ops-raw'/f'{stream}-{off}.jsonl';put(dest,v);selected_states[(stream,off)]={'path':str(dest),'sha256':sha(v)}
assert set(need)<=seen
for pair in selected:st=pair.pop('state_ref');pair['original_case']={'state':selected_states[(st['stream'],st['offset'])]}
put(M/'verified-raw-windows.json',verified)
relP=str(P.relative_to(W));rebase={}
def relocate(v):
 if isinstance(v,dict):return {k:relocate(w) for k,w in v.items()}
 if isinstance(v,list):return [relocate(w) for w in v]
 if isinstance(v,str):
  if v.startswith(str(P)+'/'):new=str(M/'original')+v[len(str(P)):];rebase[v]=new;return new
  if v.startswith(relP+'/'):new=str((M/'original').relative_to(R))+v[len(relP):];rebase[v]=new;return new
 return v
source_strategy=json.loads((S/'strategy-candidates.json').read_bytes());source_rk=json.loads((S/'rk-candidates.json').read_bytes());strategydoc=relocate(source_strategy);rkdoc=relocate(source_rk);reverse={v:k for k,v in rebase.items()}
def restore(v):
 if isinstance(v,dict):return {k:restore(w) for k,w in v.items()}
 if isinstance(v,list):return [restore(w) for w in v]
 return reverse.get(v,v) if isinstance(v,str) else v
assert restore(strategydoc)==source_strategy and restore(rkdoc)==source_rk
strategies=strategydoc['entries'];rks=rkdoc['entries'];assert len(strategies)==7 and len(rks)==6
vocab={'schema':'reflex-vocab-v1','character':'silent','dimensions':{d:[] for d in ['enemy_threat','card_role','line_tempo','resource_cost','potion_category']}}
for e in rks:
 assert e['signal']['kind']=='tag'
 vocab['dimensions']['resource_cost'].append({'id':e['signal']['value'],'label_en':e['label_en'],'evidence':e['evidence']['observations']})
 for r in e['sources']:assert sha((R/r['path']).read_bytes())==r['sha256']
put(A/'normalized-strategy.json',strategydoc);put(A/'normalized-reflex.json',rkdoc);put(A/'normalized-vocab.json',vocab);put(M/'vocab-derivation.json',{'new_game_knowledge':False,'rule':'Exact learner signal.value/label_en/evidence.observations copied into existing resource_cost vocabulary dimension','value':vocab})
ids=[e['id'] for e in strategies];rk_ids=[e['id'] for e in rks];leaves=['knowledge/characters/silent/strategy-entries.json','knowledge/characters/silent/reflex.json','knowledge/characters/silent/reflex-vocab.json'];snap={}
for tag,root in [('main',R),('live',L)]:
 before={leaf:(root/leaf).read_bytes() for leaf in leaves}
 for leaf,v in before.items():assert v==subprocess.check_output(['git','-C',str(root),'show','HEAD:'+leaf]),'uncommitted target drift'
 lib=json.loads(before[leaves[0]]);assert not set(ids)&{e['id'] for e in lib['entries']};lib['entries']+=strategies
 reflex=json.loads(before[leaves[1]]);assert not set(rk_ids)&{e['id'] for e in reflex['entries']};reflex['entries']+=rks
 vo=json.loads(before[leaves[2]])
 for dim,items in vocab['dimensions'].items():
  current={x['id'] for x in vo['dimensions'][dim]};assert not current&{x['id'] for x in items};vo['dimensions'][dim]+=items
 candidates=dict(zip(leaves,map(raw,[lib,reflex,vo])));snap[tag]={'before':{leaf:{'sha256':sha(v),'bytes':len(v)} for leaf,v in before.items()},'after':{leaf:{'sha256':sha(v),'bytes':len(v)} for leaf,v in candidates.items()},'updates':[],'before_strategy_count':len(lib['entries'])-7,'after_strategy_count':len(lib['entries']),'before_reflex_count':len(reflex['entries'])-6,'after_reflex_count':len(reflex['entries'])}
 candidate_root=A/(tag+'-candidate-root');knowledge=candidate_root/'knowledge';silent=knowledge/'characters/silent';silent.mkdir(parents=True,exist_ok=True)
 for p in (root/'knowledge').iterdir():
  if p.name!='characters' and not (knowledge/p.name).exists():(knowledge/p.name).symlink_to(p,target_is_directory=p.is_dir())
 for p in (root/'knowledge/characters').iterdir():
  if p.name!='silent' and not (knowledge/'characters'/p.name).exists():(knowledge/'characters'/p.name).symlink_to(p,target_is_directory=p.is_dir())
 for p in (root/'knowledge/characters/silent').iterdir():
  leaf=str(p.relative_to(root));dest=silent/p.name
  if leaf in candidates:put(dest,candidates[leaf])
  elif not dest.exists():dest.symlink_to(p,target_is_directory=p.is_dir())
 for leaf,v in before.items():put(M/'preimages'/tag/leaf,v)
put(M/'provenance-rebase.json',{'only_paths_changed':True,'reverse_exact':True,'map':rebase,'normalized_strategy':strategydoc,'normalized_reflex':rkdoc})
put(M/'assembly.json',{'at':subprocess.check_output(['date','-Is'],text=True).strip(),'batch':bid,'authority_comment':6382974399,'selected_strategy_ids':ids,'selected_rk_ids':rk_ids,'selected_pairs':[p for p in selected if p['rk_id']],'text_only_contexts':[p for p in selected if not p['rk_id']],'held_pairs':report['partial_waiting'],'source_counts':report['decision_output_counts'],'snapshots':snap,'source_files':{'strategy':ref(A/'normalized-strategy.json'),'rk':ref(A/'normalized-reflex.json'),'vocab':ref(A/'normalized-vocab.json')},'verified_inventory_files':len(archive),'verified_input_files':len(inputs),'raw_windows_verified':len(windows),'new_models_full_games':0,'data_only':True,'complete_playbook_publication':False,'executable_card_pick_advice':0,'strategy_projection_ids_added':7,'knowledge_new_contexts':7,'knowledge_updated_contexts':0,'knowledge_custom_candidates_formal_consumer':'pending','archived_files':len(archive)-len(omitted),'bulk_process_copies_not_duplicated':len(omitted)})
tp=D/'learner'/f'learner-{bid}.tui.json';t=json.loads(tp.read_bytes());binding=t['bindings'][0];context=prompt=terminal=None;off=0
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
print(json.dumps({'contexts':7,'rk':6,'waiting_rk':1,'raw_windows':len(windows),'archived':len(archive)-len(omitted),'omitted':len(omitted),'native_tier':context['service_tier'],'snapshots':snap['live']['after_strategy_count']}))

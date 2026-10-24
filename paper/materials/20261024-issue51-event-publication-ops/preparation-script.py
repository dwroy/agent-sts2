from pathlib import Path
import copy,hashlib,json,subprocess,sys,os
R=Path.cwd();L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue51-event-publication-ops';D=R/'ops/codex-ops';sys.path.insert(0,str(R/'ops'));from learner_checks import read_report
sha=lambda v:hashlib.sha256(v).hexdigest();raw=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def put(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(v if isinstance(v,bytes) else raw(v))
def ref(p):return {'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
bid='20261024-204311-strategy-proposal';b=json.loads((D/'learn.json').read_bytes())['batches'][bid];report=b['report'];P=Path(report['report']).parent;W=P.parents[2];S=P/'scratch';assert b['state']=='done' and b['rc']==0 and not b.get('proposal_audit_errors');assert read_report(str(P/'report.md'))==read_report(str(D/'learner'/f'{bid}.out'))==report==json.loads((P/'result.json').read_bytes());assert report['merged'] is None and report['fixes']==[] and report['code_proposals']==[]
for k in ['input_manifest','work_spec']:
 v=b['external_binding'][k];p=R/v['path'];assert ref(p)['sha256']==v['sha256'] and p.stat().st_size==v['bytes'];put(M/(k+'.json'),v)
verified=[];omitted=[]
for row in json.loads((S/'artifacts.json').read_bytes())['files']:
 p=Path(row['path']);assert p.is_relative_to(P);h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 assert p.stat().st_size==row['bytes'] and h.hexdigest()==row['sha256'];verified.append(row)
 if row['bytes']>2_000_000:omitted.append({**row,'reason':'rebuildable process index/raw extract; retain original, SHA, references and extraction scripts'})
 elif p.name not in ['tui.sh','tui.pid','tui-prompt.txt']:put(M/'original'/p.relative_to(P),p.read_bytes())
put(M/'original/scratch/artifacts.json',(S/'artifacts.json').read_bytes());put(M/'verified-inventory.json',verified);put(M/'unarchived-process-copies.json',{'omitted':omitted,'no_original_files_deleted':True})
inputs=json.loads((S/'input-verification.json').read_bytes())['checks']+json.loads((S/'own-shard-verification.json').read_bytes());iv=[]
for row in inputs:
 p=W/row['path']
 if not p.is_file():p=R/row['path']
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 assert p.stat().st_size==row['bytes'] and h.hexdigest()==row['sha256'],row['path'];iv.append({'path':row['path'],'verified_path':str(p.relative_to(R)),'bytes':row['bytes'],'sha256':row['sha256']})
put(M/'verified-inputs.json',iv)
scope=json.loads((R/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_bytes());allowed={v['run_id'] for v in scope['runs']};rawrefs=json.loads((S/'bounded-own-source-refs.json').read_bytes());assert len(rawrefs)==1927;valid=[]
for row in rawrefs:
 cut=scope['raw_stream_cutoffs'][row['stream']];assert row['cutoff']<=cut['max_bytes'] and row['offset']+row['bytes']<=row['cutoff'] and row['source_path']==cut['path']
 with (R/row['source_path']).open('rb') as f:f.seek(row['offset']);v=f.read(row['bytes'])
 assert len(v)==row['bytes'] and sha(v)==row['sha256'];j=json.loads(v);run=j.get('run_id') or j.get('run') or j.get('state',{}).get('run_id');assert run in allowed;valid.append({**row,'run_id':run})
put(M/'verified-raw-windows.json',valid)
for row in json.loads((S/'sample-source-refs.json').read_bytes()):
 p=Path(row['path']);assert p.is_relative_to(P);assert p.stat().st_size==row['bytes'] and sha(p.read_bytes())==row['sha256']
original=json.loads((S/'strategy-candidates.json').read_bytes());assert len(original['entries'])==6;strategies=copy.deepcopy(original['entries']);metadata=[]
for e in strategies:
 meta={k:e.pop(k) for k in ['formal_publication','consumer_readback'] if k in e};metadata.append({'id':e['id'],'removed_delivery_metadata':meta});restored={**e,**meta};assert restored==next(v for v in original['entries'] if v['id']==e['id'])
put(M/'delivery-metadata-normalization.json',{'game_content_unchanged':True,'reverse_exact':True,'removed_from_runtime_only':metadata,'original_source_preserved':True});put(A/'normalized-strategy.json',{'schema':original['schema'],'character':original['character'],'entries':strategies})
mapping=json.loads((S/'experience-strategy-rk-map.json').read_bytes());rows=[]
for item in mapping:
 p=S/f"sample-{item['event_id']}-states.json";assert p.exists();new=M/'original/scratch'/p.name;assert new.read_bytes()==p.read_bytes();rows.append({'runtime_entry':next(e for e in strategies if e['id']==item['strategy_id']),'source_archive':str((M/'original/scratch/strategy-candidates.json').relative_to(R)),'sha256':sha((S/'strategy-candidates.json').read_bytes()),'event_id':item['event_id'],'sample':ref(new),'rk_waiting':item['rk_id']})
leaf='knowledge/characters/silent/strategy-entries.json';snap={}
for tag,root in [('main',R),('live',L)]:
 before=(root/leaf).read_bytes();assert before==subprocess.check_output(['git','-C',str(root),'show','HEAD:'+leaf]);doc=json.loads(before);assert not {v['id'] for v in strategies}&{v['id'] for v in doc['entries']};doc['entries']+=strategies;c=raw(doc);put(A/(tag+'-candidate.json'),c);put(A/(tag+'-candidate-root')/leaf,c);put(M/'preimages'/tag/leaf,before);snap[tag]={'before_sha256':sha(before),'candidate_sha256':sha(c),'before_entries':len(doc['entries'])-6,'after_entries':len(doc['entries'])}
put(M/'assembly.json',{'batch':bid,'ids':[v['id'] for v in strategies],'snapshots':snap,'source_rows':rows,'source_counts':report['decision_output_counts'],'verified_inputs':len(iv),'verified_artifacts':len(verified),'raw_windows':len(valid),'rk_published':0,'rk_waiting':6,'formal_experience_consumers':'pending6','data_only':True,'new_models_full_games_ticks':0})
tp=D/'learner'/f'learner-{bid}.tui.json';t=json.loads(tp.read_bytes());binding=t['bindings'][0];context=prompt=terminal=None;off=0
with Path(t['rollout']).open('rb') as f:
 for v in f:
  j=json.loads(v);p=j.get('payload',{});start=off;off+=len(v)
  if j.get('type')=='turn_context' and p.get('turn_id')==binding['turn_id'] and context is None:context={'at':j.get('timestamp'),'offset':start,'bytes':len(v),'sha256':sha(v),**{k:p.get(k) for k in ['model','effort','service_tier','cwd','sandbox_policy']}}
  if j.get('type')=='response_item' and p.get('role')=='user':
   for part in p.get('content',[]):
    text=part.get('text','')
    if sha(text.encode())==binding['prompt_sha256']:prompt={'at':j['timestamp'],'offset':start,'bytes':len(v),'sha256':sha(v),'prompt_sha256':binding['prompt_sha256'],'input_sha256_present':report['input_sha256'] in text}
  if j.get('type')=='event_msg' and p.get('type')=='task_complete' and p.get('turn_id')==binding['turn_id']:terminal={'at':j.get('timestamp'),'offset':start,'bytes':len(v),'sha256':sha(v)}
assert context and prompt and terminal and context['model']=='gpt-6.1-sol' and context['effort']=='high' and t['retirement_authorized'] is True
launch=json.loads((D/'learner'/f'{bid}.external-launch.json').read_bytes());put(M/'native.json',{'tui':ref(tp),'context':context,'prompt':prompt,'terminal':terminal,'retirement_authorized':True,'request_tier':launch['external_tier'],'actual_service_tier':context['service_tier'],'unknown_not_inferred_from_request':True,'permissions_changed':False})
put(M/'original-report-boundary.json',{'original_report_output_result_equal':True,'original_base':report['base'],'original_merged':report['merged'],'original_tests':report['tests'],'source_commit':None,'no_source_or_proposals':True,'source_native_permissions_unchanged':True})
q=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(p.read_bytes() for p in M.rglob('*') if p.is_file()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});put(A/'preparation-gitleaks.log',q.stdout+q.stderr);assert q.returncode==0;print(json.dumps({'entries':6,'rk_published':0,'rk_waiting':6,'inputs':len(iv),'artifacts':len(verified),'bulk_not_copied':len(omitted),'raw_refs':len(valid),'candidate_entries':snap['live']['after_entries'],'native_tier':context['service_tier']}))

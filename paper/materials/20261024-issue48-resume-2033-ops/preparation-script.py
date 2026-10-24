from pathlib import Path
import copy,hashlib,json,subprocess,sys,os
R=Path.cwd();L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue48-resume-2033-ops';D=R/'ops/codex-ops';sys.path.insert(0,str(R/'ops'));from learner_checks import read_report
sha=lambda v:hashlib.sha256(v).hexdigest();raw=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def put(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(v if isinstance(v,bytes) else raw(v))
bid='20261024-164315-strategy-proposal';b=json.loads((D/'learn.json').read_bytes())['batches'][bid];report=b['report'];P=Path(report['report']).parent;W=P.parents[2];assert b['state']=='done' and b['rc']==0 and not b.get('proposal_audit_errors');assert read_report(str(P/'report.md'))==read_report(str(D/'learner'/f'{bid}.out'))==report==json.loads((P/'result.json').read_bytes());assert report['fixes']==[] and report['merged'] is None and report['code_proposals']==[];prior=json.loads((R/'paper/materials/20261024-issue48-checkpoint-1750-ops/readback.json').read_bytes())
for name,v in prior['source_artifacts'].items():p=R/v['path'];assert p.stat().st_size==v['bytes'] and sha(p.read_bytes())==v['sha256']
archive=[];omitted=[]
for p in sorted(P.rglob('*')):
 if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or p.name in ['tui.sh','tui.pid','tui-prompt.txt']:continue
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 row={'path':str(p.relative_to(W)),'bytes':p.stat().st_size,'sha256':h.hexdigest()};archive.append(row)
 if row['bytes']>2_000_000:omitted.append({**row,'reason':'rebuildable process extract; original retained, SHA/reference/scripts archived, no duplicate bulk copy'})
 else:put(M/'original'/p.relative_to(P),p.read_bytes())
put(M/'verified-artifact-manifest.json',archive);put(M/'unarchived-process-copies.json',{'omitted':omitted,'original_not_deleted_by_ops':True})
refs=[]
for v in json.loads((P/'candidate-source-refs.json').read_bytes()):
 for key in ['ref','entry','exit']:
  if key in v:refs.append({**v[key],'run_id':v['run_id']})
for v in json.loads((P/'existing-plans-counterevidence.json').read_bytes()):refs.append({**v['ref'],'run_id':v['run_id']})
for v in json.loads((P/'candidate-validation.json').read_bytes())['cases']:refs.append({**v['source'],'run_id':v['run_id']})
verified=[];cases=[]
for row in refs:
 p=Path(row['source']);assert p.is_relative_to(R/'logs');off=row['offset'];assert off+row['bytes']<=row['source_size']
 with p.open('rb') as f:f.seek(off);v=f.read(row['bytes'])
 assert len(v)==row['bytes'] and sha(v)==row['sha256'];j=json.loads(v);run=j.get('run_id') or j.get('run') or j.get('state',{}).get('run_id');assert run==row['run_id'] and run in report['runs'],(p.name,off,list(j),run,row['run_id']);verified.append(row);dest=M/'original/raw'/f'{p.stem}-{off}.jsonl';put(dest,v)
for c in json.loads((P/'candidate-validation.json').read_bytes())['cases']:
 row=c['source'];dest=M/'original/raw'/f'{Path(row["source"]).stem}-{row["offset"]}.jsonl';cases.append({**c,'raw_path':str(dest),'raw_sha256':row['sha256']})
put(M/'verified-raw-refs.json',verified)
original=json.loads((P/'brain-strategy-candidates.json').read_bytes());assert len(original['entries'])==1;source=copy.deepcopy(original['entries'][0]);entry=copy.deepcopy(source);relP=str(P.relative_to(W));rebases={}
for ev in entry['evidence']:
 old=ev['ref'];assert old.startswith(str(P)+'/');new=str(M/'original')+old[len(str(P)):];rebases[old]=new;ev['ref']=new;assert Path(new.split('#')[0]).exists()
# Only provenance and publication metadata change; all learner game content stays exact.
assert entry['publication']=='scratch_candidate_only';entry['publication']='registered-query-library-by-ops';restored=copy.deepcopy(entry);restored['publication']=source['publication'];reverse={v:k for k,v in rebases.items()}
for ev in restored['evidence']:ev['ref']=reverse[ev['ref']]
assert restored==source
put(M/'provenance-metadata-normalization.json',{'path_rebase':rebases,'publication_metadata_old':source['publication'],'publication_metadata_new':entry['publication'],'reverse_exact':True,'game_content_changed':False,'source_archive':str((M/'original/brain-strategy-candidates.json').relative_to(R))});put(A/'runtime-entry.json',entry)
leaf='knowledge/characters/silent/strategy-entries.json';snap={}
for tag,root in [('main',R),('live',L)]:
 before=(root/leaf).read_bytes();assert before==subprocess.check_output(['git','-C',str(root),'show','HEAD:'+leaf]);doc=json.loads(before);assert not any(e['id']==entry['id'] for e in doc['entries']);doc['entries'].append(entry);candidate=raw(doc);put(A/(tag+'-candidate.json'),candidate);snap[tag]={'before_sha256':sha(before),'candidate_sha256':sha(candidate),'before_entries':len(doc['entries'])-1,'after_entries':len(doc['entries'])};put(M/'preimages'/tag/leaf,before);dest=A/(tag+'-candidate-root')/leaf;put(dest,candidate)
put(M/'assembly.json',{'batch':bid,'ids':[entry['id']],'snapshots':snap,'source_rows':[{'runtime_entry':entry,'source_archive':str((M/'original/brain-strategy-candidates.json').relative_to(R)),'sha256':sha((P/'brain-strategy-candidates.json').read_bytes())}],'cases':cases,'input_mapping':prior['mapping_counts'],'original_ledger_id':'silent-0618','parent_ledger_status_preserved':'proposed','new_rk':0,'old244_backfill_processed':0,'new_full_models_games':0})
for label,row in [('context',prior['native_context']),('prompt',prior['first_prompt'])]:
 p=R/prior['native_reference']
 with p.open('rb') as f:f.seek(row['offset']);v=f.read(row['bytes'])
 assert len(v)==row['bytes'] and sha(v)==row.get('sha256',row.get('line_sha256'));put(M/(label+'-original-reference.json'),{'path':prior['native_reference'],**row,'sha_verified':True})
put(M/'original-report-status.json',{'batch_done_rc0':True,'report_output_result_equal':True,'report_base':report['base'],'dispatch_base':b['ordinary_baseline'].get('head',b['ordinary_baseline']),'no_fallback_git_identity':True,'original_merged':report['merged'],'original_tests':report['tests'],'new_source_commit':None,'original_report_not_rewritten':True,'ordinary_close_not_repeated':True})
q=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(p.read_bytes() for p in M.rglob('*') if p.is_file()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});put(A/'preparation-gitleaks.log',q.stdout+q.stderr);assert q.returncode==0;print(json.dumps({'candidate':entry['id'],'raw_refs':len(verified),'artifacts':len(archive),'archived':len(archive)-len(omitted),'bulk_not_copied':len(omitted),'snapshots':snap}))

from pathlib import Path
import hashlib,json,sqlite3,subprocess,sys,os
R=Path('/home/dw/Projects/agent-sts2');L=R/'.worktrees/live';M=R/'paper/materials/20261025-issue62-combination-integrator';O=R/'paper/materials/20261025-issue62-natural-publication-ops';A=R/'.artifacts/integrator62-combination-20261025'
sys.path.insert(0,str(R/'ops'));import publication_gate

def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text())
def git(tree,*args):return subprocess.check_output(['git','-C',str(tree),*args])
def rowhash(row):return sha(json.dumps(dict(row),ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
def born(pid):
 try:return Path(f'/proc/{pid}/stat').read_text().split(') ',1)[1].split()[19]
 except FileNotFoundError:return None
h=read(M/'deployment-handoff.json');p=read(O/'publication.json');worker=read(O/'worker-state.json');before=read(O/'knowledge-before.json');after=read(O/'knowledge-after.json');approval=read(R/'paper/materials/20261025-issue62-fact-coverage-ops/owner-approved-source.json')
assert p['published'] and p['release_id']=='V6-R451' and worker['rc']==0 and worker['phase']=='published-registered-verified-admission-released'
checks={}
for tag,tree,key,commit in [('root',R,'root_delivery',p['root_source']['commit']),('live',L,'runtime_install_delivery',p['live_source']['commit'])]:
 expected=sorted(e['path'] for e in h[key]);assert sorted(git(tree,'diff-tree','--no-commit-id','--name-only','-r',commit).decode().splitlines())==expected
 for e in h[key]:
  b=(tree/e['path']).read_bytes();committed=git(tree,'show',commit+':'+e['path'])
  if e['path']=='paper/materials/decision-log.md':
   assert e['path'] in p['root_source']['paths']
   for paragraph in (R/'.artifacts/ops-issue62-natural-publication-20261025/accepted-decision-log-append.txt').read_bytes().strip().split(b'\n\n'):
    assert paragraph in b and paragraph in committed
  else:assert sha(b)==e['integrated_sha256'] and sha(committed)==e['integrated_sha256'],e['path']
 checks[tag]=dict(count=len(expected),source_commit=commit,working_and_committed_postimages_equal=True,decision_parallel_append_preserved=tag=='root')
inputs=read(M/'runtime-inputs.json');excluded='agent/tests/knowledge-runtime.test.ts'
for e in inputs:
 if e['path']!=excluded:assert sha((L/e['path']).read_bytes())==e['sha256'],e['path']
assert (L/excluded).read_bytes()==git(L,'show','16da215d83d39ee8b79827fbe0d72337c48a4dce:'+excluded)
for tree,tag in [(R,'main'),(L,'live')]:
 reg=read(tree/'eval/versions.json');entries=[x for x in reg['release_numbering']['releases'] if x['release_id']=='V6-R451'];assert len(entries)==1 and entries[0]['commit']==p['live_source']['commit']
 assert git(tree,'merge-base','--is-ancestor',p['registrations'][tag]['commit'],'HEAD')==b''
db=sqlite3.connect('file:'+str(R/'data/knowledge-runtime/knowledge.sqlite')+'?mode=ro',uri=True);db.row_factory=sqlite3.Row;db.execute('BEGIN')
try:
 assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok';meta=dict(db.execute('SELECT key,value FROM metadata'));assert meta['schema']=='2';current=meta['current'];assert current==p['knowledge_version']
 for table,key in [('candidates','id'),('events','request'),('releases','version'),('run_bindings','run_id')]:
  actual={str(x[key]):rowhash(x) for x in db.execute('SELECT * FROM '+table)}
  assert all(actual.get(k)==v for k,v in before['history'][table].items()),table
 bindings=[dict(x) for x in db.execute('SELECT * FROM run_bindings')];assert all(x in bindings for x in before['bindings'])
 manifests={}
 for version in [before['version'],current]:
  manifests[version]=json.loads(db.execute('SELECT manifest FROM releases WHERE version=?',(version,)).fetchone()[0])
  for path,digest in manifests[version]['files'].items():assert sha((R/'data/knowledge-runtime/snapshots'/version/path).read_bytes())==digest,path
 oldfiles=before['manifest']['files'];newfiles=manifests[current]['files'];assert len(oldfiles)==8 and len(newfiles)==11
 assert all(newfiles.get(k)==v for k,v in oldfiles.items())
 assert sorted(set(newfiles)-set(oldfiles))==sorted(e['path'] for e in approval['sources'])
 fact_counts={}
 for version in [before['version'],current]:
  rows=list(db.execute("SELECT b.character,b.original_id,b.payload,b.tool_payload,r.path FROM business_items b JOIN revisions r ON r.revision=b.revision JOIN release_entries e ON e.revision=b.revision WHERE e.version=? AND b.type='fact'",(version,)))
  fact_counts[version]={c:sum(x['character']==c for x in rows) for c in ['common','silent']}
  if version==before['version']:assert not rows
  else:
   assert len(rows)==1074
   for source in approval['sources']:
    if not source['path'].endswith('open-book.json'):continue
    data=read(R/'.artifacts/ops-issue62-fact-coverage-20261025/frozen-published'/source['path']);expected={(x['id'],x['kind']):x for x in data['entries']};actual=[x for x in rows if x['path']==source['path']];assert len(expected)==len(actual)
    for row in actual:assert json.loads(row['payload'])==expected[(row['original_id'],json.loads(row['payload'])['kind'])] and json.loads(row['tool_payload'])==expected[(row['original_id'],json.loads(row['payload'])['kind'])]
  if version==current:assert fact_counts[version]==dict(common=974,silent=100)
 for e in approval['sources']:assert newfiles[e['path']]==e['sha256']
 newbindings=[x for x in bindings if x not in before['bindings']]
finally:db.rollback();db.close()
backup=read(O/'backup-receipt.json');assert sha(Path(backup['path']).read_bytes())==backup['sha256']
bdb=sqlite3.connect('file:'+backup['path']+'?mode=ro',uri=True)
try:assert bdb.execute('PRAGMA quick_check').fetchone()[0]=='ok';assert dict(bdb.execute('SELECT key,value FROM metadata'))['schema']=='1'
finally:bdb.close()
toolrecord=read(O/'actual-deployed-tools.json');assert toolrecord['rc']==0;tools=json.loads(toolrecord['stdout']);assert tools['base']==before['version'] and tools['extended']==current and tools['missing_bound_version_rejected_no_git_fallback']
entities=[x for x in tools['results'] if 'id' in x];geometry=[x for x in tools['results'] if 'geometry' in x];assert len(entities)==36 and len(geometry)==2
for x in entities:
 expected=x['version']==current and (x['scope']=='common' or x['role']=='silent');assert x['found']==expected and x['invalid_category_rejected'] and (not expected or x['all_source_fields_equal'])
marker=publication_gate.read(R);safe_marker={k:marker.get(k) for k in ['owner','phase','pid','pid_birth','owner_alive']} if marker else None
assert not marker or marker.get('owner')!=p['owner']
for f in ['notes/for-roy.md','ops/inbox-dev.md']:
 text=(R/f).read_text();assert '#62实际上线' in text and 'V6-R451' in text
result=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),state='ACTUAL_DEPLOYMENT_INDEPENDENTLY_VERIFIED',release_id=p['release_id'],checks=checks,live=p['live'],main_at_registration=p['main'],current_main=git(R,'rev-parse','HEAD').decode().strip(),current_live=git(L,'rev-parse','HEAD').decode().strip(),runtime_input_leaves_checked=len(inputs)-1,excluded_ROOT_only_test_preserved=True,knowledge_before=before['version'],knowledge_current=current,schema=2,old_documents_preserved=8,new_documents_only=3,all_original_history_rows_and_bindings_preserved=True,new_bindings_observed=newbindings,fact_counts=fact_counts,all_1074_fact_payload_and_tool_payload_fields_equal_sources=True,actual_ops_tools_entity_cases=len(entities),actual_ops_geometry_cases=len(geometry),actual_ops_missing_bound_version_rejected=True,fresh_schema1_backup_sha256=backup['sha256'],worker_pid=worker['worker_pid'],original_worker_exited=born(worker['worker_pid'])!=worker['worker_birth'],publication_admission_released=True,current_other_marker=safe_marker,dual_notices_present=True,independent_new_full_runs=0,independent_model_or_game_or_production_writes=0,natural_adoption_or_benefit_claimed=False,source_receipts={str(x.relative_to(R)):sha(x.read_bytes()) for x in [O/'publication.json',O/'knowledge-before.json',O/'knowledge-after.json',O/'actual-deployed-tools.json',O/'backup-receipt.json',O/'worker-state.json']})
(M/'actual-deployment-readback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))

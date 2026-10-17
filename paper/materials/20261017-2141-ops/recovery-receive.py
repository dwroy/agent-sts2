from pathlib import Path
import hashlib,json,subprocess,sys,tarfile,re
r=root=Path.cwd();p=r/'ops/codex-ops/record-staging/20261017-2141';pub=r/'paper/materials/20261017-2141-ops';sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda f:json.loads(f.read_bytes())
def write(f,x):f.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def git(*a,cwd=r):return subprocess.check_output(['git','-C',str(cwd),*a],stderr=subprocess.PIPE)
bid='20261017-211302-fix-batch';batch=load(r/'ops/codex-ops/learn.json')['batches'][bid];sys.path.insert(0,str(r/'ops'));from learner_checks import read_report
out=r/f'ops/codex-ops/learner/{bid}.out';report=read_report(str(out));s=Path(report['report']).parent;wt=Path(batch['worktree']);handoff=load(s/'source-handoff.json');source=handoff['source'];base=handoff['base'];v=load(s/'validation.json');audit=load(s/'source-audit.json');integration=load(s/'live-integration.json')
assert batch['state']=='failed' and batch['rc']==0 and batch['merged'] is None and batch['proposal_audit_errors']==[];assert source=='0b1807b159a1e3d7fc09aad541ea6f97be627a91' and git('rev-parse',source+'^').decode().strip()==base==report['base'];assert git('rev-parse',source+'^{tree}').decode().strip()==handoff['source_tree'];assert report['fixes'][0]['commit']==source and report['tests']==handoff['source_tests']==dict(tsc=0,vitest=0,files=481,cases=4417)
paths=[x['path'] for x in handoff['source_files']];assert len(paths)==6 and set(git('diff','--name-only',base,source).decode().splitlines())==set(paths);assert git('rev-parse','HEAD',cwd=wt).decode().strip()==source and not git('status','--porcelain','--untracked-files=no',cwd=wt).strip()
leaves=[]
for x in handoff['source_files']:
 raw=git('show',source+':'+x['path']);assert git('rev-parse',source+':'+x['path']).decode().strip()==x['source_blob'];assert (wt/x['path']).read_bytes()==raw;leaves.append(dict(path=x['path'],sha256=sha(raw),source_blob=x['source_blob']))
assert sha((s/'source.patch').read_bytes())==handoff['source_patch_sha256']==v['source_patch_sha256'];assert sha((s/'source-sandbox.log').read_bytes())==v['source_test_log_sha256'];assert (s/'source-sandbox.exit').read_text().strip()=='0';text=(s/'source-sandbox.log').read_text();assert all(x in text for x in ['480 passed (480)','4406 passed (4406)','11 passed (11)']);assert '3 failed | 27 passed (30)' in (s/'without-fix.log').read_text() and '55 passed (55)' in (s/'with-fix.log').read_text();assert 'no leaks found' in (s/'gitleaks-source.log').read_text()
assert integration['merged'] is None and integration['preview_exit']==1 and len(integration['conflict_messages'])==31;assert integration['refresh_commit']=='72ce99f6ddc37bfe30af8082b0f8f32027ec95d0';assert len(audit['already_fixed'])==42 and len(audit['source_blobs'])==181
for x in audit['already_fixed']:
 for ref in set([audit['base'],audit['main'],audit['live']]):git('merge-base','--is-ancestor',x['commit'],ref)
for path,x in audit['source_blobs'].items():
 assert git('rev-parse',audit['base']+':'+path).decode().strip()==x['blob'];assert git('rev-parse',audit['live']+':'+path).decode().strip()==x['live_blob']
assert sha((s/'fix-queue-snapshot.md').read_bytes())==audit['queue_sha256'];q=load(s/'unchecked-items-disposition.json');assert len(q)==audit['unchecked_items']
lines=(s/'fix-queue-snapshot.md').read_text().splitlines()
for x in q:assert lines[x['line']-1]==x['original'] and x['original'].startswith('- [ ]')
evidence=load(s/'g2-original-evidence.json');assert sha(Path(evidence['source']).read_bytes())==evidence['sha256'];refs=[]
with (r/'logs/decisions.jsonl').open('rb') as fd:
 for x in evidence['cases']:
  ref=x['source'];fd.seek(ref['offset']);raw=fd.read(ref['length']);assert sha(raw)==ref['sha256'];json.loads(raw);refs.append(ref)
exec((r/'ops/codex-ops/record-staging/20261016-0557/readonly-runtime.py').read_text());native=runtime(bid,report,out.read_text(),worktree=wt)
# Only named handoff artifacts, not test-generated process copies, are archived.
names=['source-handoff.json','source-audit.json','validation.json','live-integration.json','runtime-readback.json','g2-original-evidence.json','source.patch','source-sandbox.log','source-sandbox.exit','without-fix.log','with-fix.log','gitleaks-source.log','gitleaks-refresh.log','report.md','report.json','unchecked-items-disposition.json','fix-queue-snapshot.md','audit-initial-failure.log','ledger-g2.json','ledger-run.json']
files=[s/name for name in names]+[out,out.with_suffix('.err')];manifest=[]
with tarfile.open(pub/'original-source-reports.tar.gz','w:gz',compresslevel=6) as archive:
 for f in files:
  assert f.is_file() and f.stat().st_size<1000000;rel=str(f.relative_to(r));raw=f.read_bytes();archive.add(f,arcname=rel,recursive=False);manifest.append(dict(path=rel,bytes=len(raw),sha256=sha(raw)))
with tarfile.open(pub/'original-source-reports.tar.gz') as archive:
 for x in manifest:assert sha(archive.extractfile(x['path']).read())==x['sha256']
write(pub/'original-source-manifest.json',dict(files=manifest,archive_sha256=sha((pub/'original-source-reports.tar.gz').read_bytes()),readback_verified=True,originals_deleted=False))
at=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip();receipt=dict(at=at,batch=bid,source=source,base=base,tree=handoff['source_tree'],paths=leaves,source_tests=handoff['source_tests'],source_full_log_sha256=v['source_test_log_sha256'],without_fix=dict(rc=1,failed=3,passed=27),restored_related=dict(rc=0,files=6,passed=55),source_gitleaks=0,original_canonical_state='failed',original_canonical_rc=0,original_merged=None,original_live_refresh=integration['refresh_commit'],original31_history_conflicts=integration['conflict_messages'],existing42_ancestors_and181_blobs_verified=True,unchecked_items=len(q),native=native,original_run_refs=refs,classification='G2 shadow diagnostic/provenance/cache observation fix; no action/rank/budget/threshold/SL/potion or other-role policy change, no behavior release number',source_full_not_repeated=True,actual_main_live_integration=False,other_role_ACK=False)
write(pub/'source-received.json',receipt)
pending=r/f'ops/codex-ops/pending-integrations/{bid}.json';assert not pending.exists();write(pending,dict(at=at,batch=bid,source=source,source_commit=source,source_parent=base,source_tree=receipt['tree'],source_received=True,source_receipt=str((pub/'source-received.json').relative_to(r)),paths=paths,classification='pure G2 shadow diagnostics',behavior_number_required=False,release_id=None,previous_latest_release_id='V5-R388',source_sync_complete=False,host_started=False,host_complete=False,status='Exact six-leaf source received before original lock/builder gates; narrow main/live integration pending',next_step='Run original2141 publish.py under live lock/builder gate, preserving all knowledge/index/records and versions; then invoke original211302 learner-recheck once for actual final tree. No unchanged-source full/model/game restart.'))
print(json.dumps(dict(source_received=source,files=6,source_tests=0,existing_fixes=42,original_conflicts=31,scope='pure shadow diagnostics')),flush=True)

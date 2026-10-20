import datetime,gzip,hashlib,json,os,pathlib,shutil,subprocess
W=pathlib.Path.cwd();R=pathlib.Path('/home/dw/Projects/agent-sts2');O=W/'paper/materials/2026-10-21-v6-refresh-p4/checks'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def git(*args,env=None):return subprocess.check_output(['git',*args],cwd=W,env=env)
rs={r['name']:r for r in json.loads((O/'capture-v2/receipts.json').read_text())}
a=json.loads((O/'audit.json').read_text()); proofs=[]
for r in a['ended_runs']:
 name=r['first_complete_packet']; packpath=R/'ops/codex-ops/v6-refresh/silent'/name/'v6-history.json';b=packpath.read_bytes()
 assert sha(b)==rs[name]['pack']['file_sha256'], name
 pack=json.loads(b);rid=r['run_id'];cs=[]
 for c in pack['data']['combo_metrics']:
  ms=[]
  for i,m in enumerate(c['metrics']):
   ss=[s for s in m['sources'] if rid in s['run_ids']]
   if ss:ms.append({'metric_index':i,'metric_identity':{k:v for k,v in m.items() if k in ['name','key','metric','kind','scope','stratum']},'sources':ss})
  if ms:cs.append({'combo_id':c['id'],'metrics':ms})
 assert len(cs)==r['combos_with_explicit_run_sources']==17
 receipt=json.loads(gzip.decompress((O/'capture-v2'/f'{name}-receipt.json.gz').read_bytes()))
 assert rid in receipt['ended_runs']
 proofs.append({'run_id':rid,'receipt_name':name,'receipt_frozen_sha256':sha(gzip.decompress((O/'capture-v2'/f'{name}-receipt.json.gz').read_bytes())),'pack_path':str(packpath),'pack_file_sha256':sha(b),'pack_content_sha256':pack['content_sha256'],'ended_runs_member':rid,'combo_source_fragments':cs})
(O/'pack-membership-proofs.json.gz').write_bytes(gzip.compress((json.dumps(proofs,ensure_ascii=False,indent=2)+'\n').encode(),mtime=0))
p=R/'paper/materials/20261020-2342-ops/receipt.json';b=p.read_bytes();(O/'publication-lock-ops-receipt.json.gz').write_bytes(gzip.compress(b,mtime=0));dump(O/'publication-lock-source.json',{'path':str(p),'bytes':len(b),'sha256':sha(b),'copy':'publication-lock-ops-receipt.json.gz'})
for dirname in ['verification','reproduction']:(O/dirname).mkdir(exist_ok=True)
for p in (W/'.artifacts/checks').iterdir():
 if p.is_file():shutil.copyfile(p,O/'verification'/p.name)
for n in ['capture.py','benchmark.py','package-p4.py']:shutil.copyfile(W/'.artifacts'/n,O/'reproduction'/n)
source=git('rev-parse','HEAD').decode().strip();base='a7d07949efb03278a62050ca39447941309b4b7e';paths=json.loads((W/'.artifacts/source-paths.json').read_text())
new4=set(git('diff-tree','--no-commit-id','--name-only','-r',source).decode().splitlines());combo={'knowledge/builders/combo_metrics.py','knowledge/builders/build-combo-metrics.py','knowledge/builders/test_combo_metrics.py'}
def blob(ref,p):
 try:
  b=git('show',ref+':'+p);h=git('rev-parse',ref+':'+p).decode().strip();return {'exists':True,'sha256':sha(b),'blob':h,'bytes':len(b)}
 except subprocess.CalledProcessError:return {'exists':False,'sha256':None,'blob':None,'bytes':0}
entries=[]
for p in paths:
 before=blob(base,p);after=blob(source,p);lp=R/'.worktrees/live'/p;wb=lp.read_bytes() if lp.exists() else None
 assert after['sha256']==sha((W/p).read_bytes()),p
 entries.append({'path':p,'layers':(['old-combo-3'] if p in combo else ['old-public-26'])+(['new-checkpoint-4'] if p in new4 else []),'before':before,'after':after,'actual_live_work_bytes':None if wb is None else {'sha256':sha(wb),'bytes':len(wb)},'actual_live_matches_r407_preimage':before['sha256']==(sha(wb) if wb is not None else None)})
patch=git('diff','--binary',base,source,'--',*paths);(O/'minimal-transport.patch').write_bytes(patch)
idx=W/'.artifacts/p4-transport.index';idx.unlink(missing_ok=True);env=dict(os.environ,GIT_INDEX_FILE=str(idx));git('read-tree',base,env=env);git('apply','--cached','--check',str(O/'minimal-transport.patch'),env=env);git('apply','--cached',str(O/'minimal-transport.patch'),env=env);tree=git('write-tree',env=env).decode().strip()
for e in entries:assert blob(tree,e['path'])==e['after'],e['path']
dump(O/'source-manifest.json',{'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'native_session':'01a15382-761a-76a2-922d-271169b2463c','account':'codex1','task_branch':'v6-refresh-p4-r407-20261021','source':source,'parent':git('rev-parse',source+'^').decode().strip(),'tree':git('rev-parse',source+'^{tree}').decode().strip(),'task_base':'5056cf4b6de4ebdb0576ac0ae1f1648f1d606c0f','transport_base':base,'actual_live_head_at_packaging':subprocess.check_output(['git','-C',str(R/'.worktrees/live'),'rev-parse','HEAD'],text=True).strip(),'dependencies':{'old_public_26':'e16464f877943240d909f9b598593333f49946dc','old_combo_3_original':'88c861525','old_combo_3_replay':'68c03b61ae982bfa8c22b408c1caf68bbd8677ba','new_checkpoint_4':source},'leaf_count':len(entries),'entries':entries,'patch_sha256':sha(patch)})
dump(O/'transport-proof.json',{'base':base,'source':source,'patch_sha256':sha(patch),'private_index':str(idx),'check_exit_code':0,'apply_exit_code':0,'transport_tree':tree,'leaf_count':len(entries),'every_postimage_equal':True,'full_run':False,'main_changed':False,'live_changed':False})
print(json.dumps({'proofs':len(proofs),'leaves':len(entries),'all_live_preimages_match':all(e['actual_live_matches_r407_preimage'] for e in entries),'transport_tree':tree,'source_manifest_sha256':sha((O/'source-manifest.json').read_bytes())}))

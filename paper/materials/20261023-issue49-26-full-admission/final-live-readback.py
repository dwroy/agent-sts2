from pathlib import Path
import hashlib,json,os,subprocess
R=Path('/home/dw/Projects/agent-sts2');B=Path(__file__).resolve().parent;N=json.loads((B/'live-net-assembly.json').read_text());W=Path(N['worktree'])
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=W)
D=json.loads((B/'live-net-directed-checks.json').read_text());assert D['state']=='passed' and D['inputs_unchanged']
assert not (B/'live-net-final-readback.json').exists()
fixture='paper/materials/issue29-brain-speed/results.jsonl';fixture_source='351d31fabfe0f22efb0e344257761b4dae908fd6';raw=git('show',fixture_source+':'+fixture);assert sha(raw)=='8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef'
p=W/fixture;p.parent.mkdir(parents=True,exist_ok=True)
assert not p.exists() or p.read_bytes()==raw
p.write_bytes(raw)
env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'PYTHONDONTWRITEBYTECODE':'1'};env.pop('CHARACTER',None)
with (B/'live-net-all-imports.log').open('xb') as out:
 c=subprocess.run(['nice','-n','19','node','--import','tsx','tools/check-imports.ts'],cwd=W/'agent',env=env,stdout=out,stderr=subprocess.STDOUT)
assert c.returncode==0
with (B/'live-net-actual-rk-probe.stderr').open('xb') as err:
 r=subprocess.run(['nice','-n','19','node','--import','tsx','--input-type=module'],cwd=W/'agent',env=env,input=(B/'actual-rk-probe.mjs').read_bytes(),stdout=subprocess.PIPE,stderr=err)
assert r.returncode==0
rk=json.loads(r.stdout);old=json.loads((B/'actual-rk-readback.json').read_text())
assert rk['status']=='loaded' and not rk['isError'] and len(rk['entries'])==9 and rk['audit']['rk']['queried'] and not rk['audit']['experience']['queried']
for key in ['entries','sources','audit','omitted','bytes','tool_count','combat_entries_env','model_API_calls']:assert rk[key]==old[key],key
(B/'live-net-actual-rk-readback.json').write_text(json.dumps(rk,ensure_ascii=False,indent=2)+'\n')
assert len(N['knowledge_manifest'])==469
products={x['path']:x for x in N['paths']};schema='knowledge/schemas/brain-strategies-v1.schema.json'
for x in N['knowledge_manifest']:
 expected=products[x['path']]['sha256'] if x['path']==schema else x['sha256']
 assert sha((W/x['path']).read_bytes())==expected,x['path']
for x in N['paths']:assert sha((W/x['path']).read_bytes())==x['sha256'],x['path']
assert git('write-tree').decode().strip()==N['tree'] and not git('diff','--name-only').strip()
a=json.loads((B/'live-net-directed-inputs-before.json').read_text());b=json.loads((B/'live-net-directed-inputs-after.json').read_text());assert a==b
for x in a:assert sha((W/x['path']).read_bytes())==x['sha256'],x['path']
rec=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),knowledge_count=469,knowledge_snapshot_unchanged=True,explicit_schema_product_exception=schema,import_check_exit=0,fixture=dict(path=fixture,sha256=sha(raw),bytes=len(raw),source_anchor=fixture_source,exact_git_bytes=True,net_anchor_tracked=False),product_tree_unchanged=True,inputs_unchanged=True,actual_rk_same_as_main_probe=True,rk_hit_ids=[x['id'] for x in rk['entries']],production_written=False,model_API_calls=0)
(B/'live-net-final-readback.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
manifest=dict(base=N['base'],net_product_tree=N['net_product_tree'],net_product_anchor=N['net_product_anchor'],test_overlay_anchor=N['anchor'],test_overlay_tree=N['tree'],paths=N['paths'],only_main_difference=N['only_different_leaf'],knowledge_count=469,knowledge_snapshot=N['knowledge_manifest'],preserve_latest_actual_live_data=True,copy_entire_anchor=False,brain_main_difference='remove unshipped #35 construction-log import and corresponding reason-schema branch',source49=N['sources'][0]['source'],source26=N['sources'][1]['source'],full_reuse='original full environment failure preserved; exact tracked fixture recheck green; supervisor authorized; net 93-file 1263 tests green')
(B/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(rec,ensure_ascii=False))

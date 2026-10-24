import json,hashlib,pathlib,subprocess
W=pathlib.Path.cwd();R=pathlib.Path('/home/dw/Projects/agent-sts2');S=pathlib.Path(__file__).parent
M=json.loads((W/'paper/materials/20261024-issue51-speed-ops/inputs/issue51-decision-shop-001-20261024.json').read_bytes())
def check(ref):
 p=W/ref['path'];b=p.read_bytes();h=hashlib.sha256(b).hexdigest();assert len(b)==ref['bytes'] and h==ref['sha256'],str(p)
 return dict(ref,verified=True)
f=json.loads((W/M['additional_packages']['three_input_freeze']['path']).read_bytes())
refs=[M['work_spec']]+M['contracts']+list(M['additional_packages'].values())+[M['provenance']['build_manifest']]
for pkg in f['packages']:refs += [pkg['manifest']]+pkg['artifacts']
seen={r['path']:r for r in refs};checks=[check(r) for r in seen.values()]
sc=json.loads((W/M['own_contrast_scope']['scope']['path']).read_bytes())
shards=[]
for ref in sc['verified_read_only_shards']:
 p=R/ref['path'];b=p.read_bytes();assert len(b)==ref['bytes'] and hashlib.sha256(b).hexdigest()==ref['sha256'],str(p)
 shards.append(dict(ref,verified=True,nlink=p.stat().st_nlink))
learn=json.loads((R/'ops/codex-ops/learn.json').read_bytes())
def find(x):
 if isinstance(x,dict):
  for k,v in x.items():
   if k=='20261024-184318-strategy-proposal':return v
   a=find(v)
   if a:return a
 elif isinstance(x,list):
  for v in x:
   a=find(v)
   if a:return a
b=find(learn);assert b and b['external_source']==M['batch_plan_id'] and b['worktree']==str(W)
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==b['external_binding']['dispatch_base']=='a2f5c84819a5d761dec6ce17b9ce292b8379679e'
check(b['external_binding']['input_manifest']);check(b['external_binding']['work_spec'])
report={'batch':'20261024-184318-strategy-proposal','base':b['external_binding']['dispatch_base'],'identity_verified':True,'binding':b['external_binding'],'checks':checks,'package_artifact_count':sum(len(p['artifacts']) for p in f['packages']),'shards':shards}
(S/'input-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'identity':True,'package_artifacts':report['package_artifact_count'],'unique_checks':len(checks),'shards':len(shards)}))

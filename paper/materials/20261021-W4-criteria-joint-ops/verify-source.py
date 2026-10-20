from pathlib import Path
import json,subprocess,hashlib,gzip,os,re
r=Path('/home/dw/Projects/agent-sts2');os.chdir(r);a=r/'.artifacts/ops-W4-criteria-R408-joint-20261021';wt=r/'.worktrees/v6-card-criteria-20261021';prefix='paper/materials/2026-10-21-v6-card-criteria';p=wt/prefix
source='024612ef747f63d4a86eb6f57ff2d39f78795d5e';mat='8176954bf6f33bdd6b4ee8fbe567601cfb7534ff';live=r/'.worktrees/live';base=subprocess.check_output(['git','-C',str(live),'rev-parse','HEAD']).decode().strip();assert base=='150890f8bac0253f4e9216af3259784705c7550e'
def git(*v):return subprocess.check_output(['git',*v])
def sha(b):return hashlib.sha256(b).hexdigest()
for n,h in {'source-manifest.json':'d697c1527c3f68a8ab493fe61b1b5e40a9131be0502d994562d360281a0a316f','minimal-source.patch':'3c7df8489b434c6d1e91f1a40d75da881b5e4ec30d2e2cc6d5a118979a57c5d4','source-receipt.json':'6e3955c9e90c682645c7b05cf4f082ce70b14be13c3fd8147dd53abe42738ec5','materials-manifest.json':'6684b65cccfedd8dedea73e58a7e00ff3123fb1a55beb1d2f6943d7a2fb27b49'}.items():assert sha((p/'checks'/n).read_bytes())==h,n
mf=json.loads((p/'checks/source-manifest.json').read_text());assert git('rev-parse',source+'^{tree}').decode().strip()==mf['source_tree'];rows=mf['files'];assert len(rows)==8
assert set(git('diff-tree','--no-commit-id','--name-only','-r',source).decode().splitlines())=={e['path'] for e in rows}
for e in rows:
 b=git('show',source+':'+e['path']);assert sha(b)==e['sha256'] and (wt/e['path']).read_bytes()==b;assert git('rev-parse',source+':'+e['path']).decode().strip()==e['git_blob']
 if e['live']:assert sha((live/e['path']).read_bytes())==e['live']['sha256'] and git('show',base+':'+e['path'])==(live/e['path']).read_bytes()
 else:assert not (live/e['path']).exists()
files=git('ls-tree','-r','--name-only',mat,'--',prefix).decode().splitlines();assert len(files)==72,len(files)
for f in files:
 b=git('show',mat+':'+f);assert (wt/f).read_bytes()==b;dest=r/f;assert not dest.exists() or dest.read_bytes()==b;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
mm=json.loads((p/'checks/materials-manifest.json').read_text())
for e in mm['files']:
 b=(p/e['path']).read_bytes();assert sha(b)==e['sha256'] and len(b)==e['bytes'],e['path']
receipt=json.loads((p/'checks/source-receipt.json').read_text())
for f,d in receipt['checks'].items():assert sha((p/'checks'/f).read_bytes())==d['sha256'],f
raws=[gzip.decompress((r/f).read_bytes()) for f in files if f.endswith('.gz')];assert len(raws)==11,len(raws)
config=(p/'checks/gitleaks-scoped.toml').read_text();assert 'useDefault = true' in config and 'regexTarget = "secret"' in config
allowed=set(re.findall(r"\^([A-Z0-9]+)\\-f(\d+)\$",config));assert len(allowed)==14 and not any(x in config for x in ['paths =','stopwords','useDefault = false'])
for run,floor in allowed:assert f'{run}-f{floor}' in ''.join(raw.decode(errors='replace') for raw in raws)
scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner','--config',str(p/'checks/gitleaks-scoped.toml')],input=b'\n'.join([git('show',source+':'+e['path']) for e in rows]+[(r/f).read_bytes() for f in files]+raws),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'});(a/'intake-gitleaks-scoped.log').write_bytes(scan.stdout);assert scan.returncode==0
out={'source':source,'base':base,'source_tree':mf['source_tree'],'materials':mat,'material_files':len(files),'material_manifest_entries':len(mm['files']),'gzip_verified_unpacked':len(raws),'exact_source_preimages_current_live_verified':8,'source_paths':[e['path'] for e in rows],'source_after':{e['path']:e['sha256'] for e in rows},'gitleaks_rc':0,'gitleaks_scope':'local exact14 run-floor labels; useDefault true; no global change','source_checks_readback':{'tsc':0,'directed':52,'dependency':26,'nova_success':16},'quality_limitations':receipt['limitations'],'B_actual_runtime':'0/204 miss; not fixed or accepted','CARD':'brain','REFLEX':'off','P2':'paused pending Roy','full_not_yet_started':True}
(a/'source-intake.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['source_after','quality_limitations']},ensure_ascii=False))

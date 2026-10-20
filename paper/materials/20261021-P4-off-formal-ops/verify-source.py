from pathlib import Path
import subprocess,json,hashlib,gzip,os
r=Path('/home/dw/Projects/agent-sts2'); os.chdir(r)
a=r/'.artifacts/ops-P4-off-formal-intake-20261021'; wt=r/'.worktrees/v6-refresh-p4-r407-20261021'; rel='paper/materials/2026-10-21-v6-off-boss-fixture'; p=wt/rel
source='88b51030b906700aa30ea2e8f79eb10be2b623bb'; material='eeb94b8bfd059c098d4d85e492a0b522e5b4a96e'; base='5628371e35d26465df06514f7f4384c269fd1182'
def git(*v,env=None):return subprocess.check_output(['git',*v],env=env)
def sha(b):return hashlib.sha256(b).hexdigest()
checks={'source-manifest.json':'1ce2366e320f985e1b169a3bee77898215eca04209a8db85a49e9798c0c4b4c4','minimal-source.patch':'4844612ec3c7b4934cc0170fdcfcb97f3e342ff55f7bfcfc151abcc293b6c70b','source-receipt.json':'0b75bd136de4a160b63ec6540421240637220a2648e9a07c6ca253f89afae2c4'}
for n,h in checks.items():assert sha((p/'checks'/n).read_bytes())==h,n
m=json.loads((p/'checks/source-manifest.json').read_text());assert git('rev-parse',source+'^{tree}').decode().strip()==m['tree']
assert set(git('diff-tree','--no-commit-id','--name-only','-r',source).decode().splitlines())=={e['path'] for e in m['entries']}
for e in m['entries']:
 b=git('show',source+':'+e['path']);assert sha(b)==e['after']['sha256'];assert git('rev-parse',source+':'+e['path']).decode().strip()==e['after']['blob']; assert (wt/e['path']).read_bytes()==b
 if e['before']:assert sha(git('show',base+':'+e['path']))==e['before']['sha256']
idx=a/'transport-private-index';env={**os.environ,'GIT_INDEX_FILE':str(idx)};git('read-tree',base,env=env)
subprocess.run(['git','apply','--cached','--check',str(p/'checks/minimal-source.patch')],env=env,check=True)
subprocess.run(['git','apply','--cached',str(p/'checks/minimal-source.patch')],env=env,check=True)
tree=git('write-tree',env=env).decode().strip(); paths=git('diff','--name-only',base,tree).decode().splitlines();assert set(paths)=={e['path'] for e in m['entries']}
for e in m['entries']:assert git('rev-parse',tree+':'+e['path']).decode().strip()==e['after']['blob']
files=git('ls-tree','-r','--name-only',material,'--',rel).decode().splitlines();assert files
for f in files:
 b=git('show',material+':'+f);assert (wt/f).read_bytes()==b,f
 dest=r/f;assert not dest.exists() or dest.read_bytes()==b;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
manifest=json.loads((p/'checks/artifact-manifest.json').read_text())
for e in manifest['entries']:
 b=(p/e['path']).read_bytes();assert len(b)==e['bytes'] and sha(b)==e['sha256'],e['path']
fm=json.loads((p/'checks/frame-manifest.json').read_text());assert len(fm)==54
for e in fm:
 b=(p/e['path']).read_bytes();raw=gzip.decompress(b);assert sha(b)==e['gzip_sha256'] and sha(raw)==e['uncompressed_sha256'] and len(raw)==e['uncompressed_bytes']
# Independent re-extraction from immutable W0 Git objects; no knowledge or test files written.
prov=json.loads((p/'checks/fixture-provenance.json').read_text()); originals={}
for e in prov['files']:
 b=git('show',prov['commit']+':'+e['path']);assert sha(b)==e['sha256'] and len(b)==e['bytes'];assert git('rev-parse',prov['commit']+':'+e['path']).decode().strip()==e['git_blob'];originals[e['path']]=json.loads(b)
c=originals['knowledge/common/monster-db.json']; rec=originals['knowledge/characters/ironclad/monster-records.json']; shares=originals['knowledge/characters/ironclad/boss-damage.json']; bosses=set(prov['selection']['bosses']); monsters=set(prov['selection']['monsters'])
fixed={'monster_db':{'bosses':{k:v for k,v in rec['bosses'].items() if k in bosses},'encounters':{k:v for k,v in rec['encounters'].items() if set(k.split('+'))&monsters},'monsters':{k:{**v,'threat_by_asc':rec['threat_by_asc'][k]} for k,v in c['monsters'].items() if k in monsters}},'shares':{k:v for k,v in shares.items() if k in bosses}}
assert (json.dumps(fixed,ensure_ascii=False,indent=1)+'\n').encode()==git('show',source+':agent/tests/fixtures/v6-off-boss-clock.json')
# Recompute exact JSON.stringify byte comparisons using Node, no simulator or tests.
js="""const fs=require('fs'),z=require('zlib'),crypto=require('crypto');const p=process.argv[1];const rows=JSON.parse(fs.readFileSync(p+'/checks/frame-byte-comparison.json')).rows;for(const e of rows){const n=e.frame;const x=JSON.parse(z.gunzipSync(fs.readFileSync(p+'/checks/frames/'+n)));const y=JSON.parse(z.gunzipSync(fs.readFileSync(p+'/checks/frames/previous-'+n)));if(JSON.stringify(x.resolved)!==JSON.stringify(y.resolved))throw Error(n);for(const [v,key] of [[x,'current_hash'],[y,'previous_hash']])if(crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')!==e[key])throw Error('hash '+n)}process.stdout.write(JSON.stringify({frames:rows.length,resolved_byte_equal:rows.length}));"""
node=subprocess.check_output(['node','-e',js,str(p)]);frame_result=json.loads(node)
target=json.loads((p/'checks/fixed-targeted.json').read_text());assert target['numPassedTests']==75 and target['numFailedTests']==0 and len(target['testResults'])==4
assert json.loads((p/'checks/fixed-tsc-status.json').read_text())['exit_code']==0
old=json.loads((p/'checks/original-full-source.json').read_text());assert gzip.decompress((p/'checks/original-full.log.gz').read_bytes())==Path(old['path']).read_bytes()
scanbytes=b'\n'.join(git('show',source+':'+e['path']) for e in m['entries'])+b'\n'+b'\n'.join(gzip.decompress((r/f).read_bytes()) if f.endswith('.gz') else (r/f).read_bytes() for f in files)
scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=scanbytes,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'});(a/'gitleaks.log').write_bytes(scan.stdout);assert scan.returncode==0
result=dict(source=source,source_tree=m['tree'],materials=material,material_files=len(files),manifest_entries=len(manifest['entries']),source_leaves=paths,transport_base=base,private_transport_tree=tree,fixture_rebuilt_identical=True,frame_verification=frame_result,compressed_frames_verified=len(fm),source_checks_readback={'tsc':0,'targeted_files':4,'passed':75},source_checks_not_rerun=True,gitleaks_rc=0,old_full_bytes_retained=True,ordinary_dependency='original014301 formal dependency still pending; not included',main_source_published=False,live_published=False,new_full_started=False)
(a/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))

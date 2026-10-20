from pathlib import Path
import json,subprocess,os,hashlib,fcntl
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-five-item-publication-20261020-2125';live=r/'.worktrees/live';src=r/'.worktrees/ops-five-item-live-20261020-1855';old=r/'.artifacts/ops-five-item-low-load-20261020'
def g(w,*args,data=None,env=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
def s(b):return hashlib.sha256(b).hexdigest()
def put(n,x):(a/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
f=json.loads((old/'frozen.json').read_text());h=json.loads((old/'host-status.json').read_text());assert h['combined_full_rc']==0 and h['input_unchanged'];tree=f['staged_tree'];assert tree==h['staged_tree']
for t in h['steps']:assert t['exit_code']==0 and s(Path(t['log']).read_bytes())==t['log_sha256']
assert all(not Path('/proc/'+str(p)).exists() for p in [887363,899802,900140]); assert (r/'ops/STOP').exists()
for x in json.loads((old/'host-inputs-after.json').read_text()):assert s((src/x['path']).read_bytes())==x['sha256'],x['path']
lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
assert g(live,'rev-parse','HEAD').decode().strip()==f['actual_live_base'];assert not g(live,'diff','--cached','--name-only').strip()
for x in f['knowledge_snapshot']:assert s((live/x['path']).read_bytes())==x['sha256'],x['path']
paths=f['source_paths'];assert not g(live,'diff','--name-only','--',*paths).strip();assert not g(r,'diff','--cached','--name-only').strip();assert not g(r,'diff','--name-only','--',*paths).strip()
data={p:g(r,'show',tree+':'+p) for p in paths};scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(data.values()),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'});(a/'source-gitleaks.log').write_bytes(scan.stdout);assert scan.returncode==0
# Main integration preserves two unrelated newer fixture wiring leaves; neither is transported to live.
preserve=['agent/tests/oneshot-support.ts','ops/tests/test_disk_admission.py'];main0=g(r,'rev-parse','HEAD').decode().strip();md={p:b for p,b in data.items() if p not in preserve and (not (r/p).exists() or (r/p).read_bytes()!=b)}
idx=Path(g(r,'rev-parse','--path-format=absolute','--git-path','index').decode().strip());il=Path(str(idx)+'.lock');fd=os.open(il,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
try:
 private=a/'main-index';private.write_bytes(idx.read_bytes());env={**os.environ,'GIT_INDEX_FILE':str(private)}
 for p,b in md.items():
  oid=g(r,'hash-object','-w','--stdin',data=b).decode().strip();g(r,'update-index','--add','--cacheinfo',f'100644,{oid},{p}',env=env)
 mt=g(r,'write-tree',env=env).decode().strip();assert set(g(r,'diff','--name-only',main0,mt).decode().splitlines())==set(md)
 msg=b'V6: atomically integrate strict reward results and direction rides\n\nExact deployed source closure accepted in live-combination tree496948c2 (623 files5909 pass2 skip); main retains unrelated fixture wiring and its untransported research files. Main whole-tree green is not claimed.\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n';mc=g(r,'commit-tree',mt,'-p',main0,data=msg).decode().strip();assert g(r,'rev-parse','HEAD').decode().strip()==main0
 for p,b in md.items():(r/p).parent.mkdir(parents=True,exist_ok=True);(r/p).write_bytes(b)
 g(r,'update-ref','HEAD',mc,main0);os.write(fd,private.read_bytes());os.fsync(fd);os.close(fd);fd=None;os.replace(il,idx)
finally:
 if fd is not None:os.close(fd)
 if il.exists():il.unlink()
# Commit exactly the fully checked live tree, preserving every frozen knowledge byte.
msg=b'V6: publish Roy all-five strict reward and V5 combat bundle\n\nRoy20:5x explicit identical-input low-load rerun passed tsc/full623 files5909 pass2 skips. Exact84 source leaves and458 knowledge snapshots; strict post-victory three-card Jev only, brain shop/rest/potion, direction rides off, V5 combat off, snakebite retain, owned temp lifecycle. No whole-main/805 transport; old expected-win audit formula unchanged.\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n';lc=g(live,'commit-tree',tree,'-p',f['actual_live_base'],data=msg).decode().strip();g(live,'update-ref','refs/ops-live-before/roy-all-five-20261020-2125',f['actual_live_base'])
# Use a private live index; leave all unrelated working records untouched.
li=Path(g(live,'rev-parse','--path-format=absolute','--git-path','index').decode().strip());ll=Path(str(li)+'.lock');lf=os.open(ll,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
try:
 pe={**os.environ,'GIT_INDEX_FILE':str(a/'live-index')};g(live,'read-tree',tree,env=pe)
 for p,b in data.items():(live/p).parent.mkdir(parents=True,exist_ok=True);(live/p).write_bytes(b)
 g(live,'update-ref','HEAD',lc,f['actual_live_base']);os.write(lf,(a/'live-index').read_bytes());os.fsync(lf);os.close(lf);lf=None;os.replace(ll,li)
finally:
 if lf is not None:os.close(lf)
 if ll.exists():ll.unlink()
for p,b in data.items():assert (live/p).read_bytes()==b
for x in f['knowledge_snapshot']:assert s((live/x['path']).read_bytes())==x['sha256']
assert g(live,'write-tree').decode().strip()==tree;assert not g(live,'diff','--name-only','--',*paths).strip()
put('source-integration.json',dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),main_before=main0,main_commit=mc,main_paths=list(md),main_preserved_unrelated_fixtures=preserve,main_whole_tree_checked=False,live_before=f['actual_live_base'],live_commit=lc,live_tree=tree,accepted_status=h,knowledge_sha_match=458,source_sha_match=84,whole_main_805_transported=False,STOP_kept=True,release_id=None))
print(json.dumps(dict(main=mc,live=lc,tree=tree,knowledge=458)))

from pathlib import Path
import hashlib,subprocess,json
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-20-r434-integrator';L=R/'.worktrees/live';sha=lambda b:hashlib.sha256(b).hexdigest();head=lambda:subprocess.check_output(['git','-C',str(L),'rev-parse','HEAD'],text=True).strip();before=head();old={x['path']:x for x in json.loads((M/'actual-game-knowledge.json').read_bytes())};current={};unstable=[]
for p in sorted((L/'knowledge').rglob('*')):
 if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or 'builders' in p.relative_to(L/'knowledge').parts:continue
 n=str(p.relative_to(L));s=p.stat();b=p.read_bytes();t=p.stat();current[n]=dict(path=n,bytes=len(b),sha256=sha(b))
 if (s.st_ino,s.st_size,s.st_mtime_ns)!=(t.st_ino,t.st_size,t.st_mtime_ns):unstable.append(n)
changed=[dict(path=n,frozen_sha256=old.get(n,{}).get('sha256'),observed_sha256=current.get(n,{}).get('sha256')) for n in sorted(set(old)|set(current)) if old.get(n,{}).get('sha256')!=current.get(n,{}).get('sha256')];after=head();r=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),live_head_before=before,live_head_after=after,frozen_leaves=len(old),observed_leaves=len(current),changed=changed,unstable_during_read=unstable,head_stable=before==after,read_without_production_locks=True,scope='Read-only observation; no exact-current-knowledge verification or deployment claim; integration has no knowledge paths',knowledge_written=False)
(M/'knowledge-drift-at-integration.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(dict(at=r['at'],live=after,changed=len(changed),unstable=unstable)))

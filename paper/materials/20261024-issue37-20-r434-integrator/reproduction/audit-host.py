from pathlib import Path
import subprocess,json,hashlib
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-20-r434-integrator';sha=lambda b:hashlib.sha256(b).hexdigest();head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();changed=[];counts={}
for name in ['host-sources-baseline.json','host-tests-baseline.json','helpers-and-config-baseline.json','product-leaves.json']:
 rows=json.loads((M/name).read_bytes());counts[name]=len(rows)
 for x in rows:
  p=R/x['path'];disk=sha(p.read_bytes()) if p.is_file() else None;b=subprocess.check_output(['git','show',head+':'+x['path']],cwd=R);commit=sha(b)
  if disk!=x['sha256'] or commit!=x['sha256']:changed.append(dict(path=x['path'],expected=x['sha256'],disk=disk,commit=commit))
old=[]
for x in json.loads((M/'excluded-old51-leaves.json').read_bytes()):
 b=(R/x['path']).read_bytes();old.append(dict(path=x['path'],baseline_still_exact=sha(b)==x['sha256'],revoked_candidate_absent=sha(b)!=x['excluded_candidate_sha256']))
r=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),head=head,counts=counts,changed=changed,excluded_old51=old,read_only=True)
(M/'host-preintegration-audit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
assert not changed and all(x['baseline_still_exact'] and x['revoked_candidate_absent'] for x in old)

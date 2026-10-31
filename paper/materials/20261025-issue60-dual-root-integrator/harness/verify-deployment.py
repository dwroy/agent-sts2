from pathlib import Path
import json,hashlib,subprocess
R=Path('/home/dw/Projects/agent-sts2');M=R/'paper/materials/20261025-issue60-dual-root-integrator'
a=json.loads((M/'assembly.json').read_text());H=Path(a['worktree']);G=Path(a['game_worktree']);L=R/'.worktrees/live'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
inputs=json.loads((M/'source-inputs.json').read_text())
if isinstance(inputs,dict):raise ValueError('inspect manifest schema before use')
callbacks=[]
for x in inputs:
 p=x['path']
 if (p.startswith('ops/') and Path(p).suffix in ('.py','.sh')) or (p.startswith('learner/') and len(Path(p).parts)==2 and Path(p).suffix in ('.py','.sh')):
  assert sha(R/p)==x['sha256'],p
  callbacks.append({'path':p,'sha256':x['sha256']})
for x in a['host_leaves']:assert sha(R/x['path'])==x['actual_host_sha256'],x['path']
for x in a['game_leaves']:
 assert sha(G/x['path'])==x['actual_postimage_sha256'],x['path']
 assert sha(L/x['path'])==x['live_preimage_sha256'],('live preimage changed',x['path'])
tracked=subprocess.check_output(['git','-C',str(G),'ls-files','-z','agent/src']).decode().split('\0')
masked={x['path'] for x in a['game_leaves']};production=[]
for p in filter(None,tracked):
 assert p in masked or sha(G/p)==sha(L/p),('unmasked live source drift',p)
 production.append({'path':p,'sha256':sha(G/p),'actual_live_preimage_sha256':sha(L/p),'source_patch_leaf':p in masked})
assert len(production)==a['all_game_production_sources']
subprocess.run(['git','-C',str(L),'apply','--check',str(R/'paper/materials/20261025-issue60-runtime-closure-integrator/game-source.patch')],check=True)
out={'at':subprocess.check_output(['date','-Is'],text=True).strip(),'host_leaves_exact':len(a['host_leaves']),'game_leaves_exact':len(a['game_leaves']),'python_shell_inputs':callbacks,'python_shell_input_count':len(callbacks),'game_production_inputs':production,'game_production_count':len(production),'live_head':subprocess.check_output(['git','-C',str(L),'rev-parse','HEAD'],text=True).strip(),'game_patch_apply_check':0,'production_mutations':0}
(M/'deployment-final-verification.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ('python_shell_inputs','game_production_inputs')}))

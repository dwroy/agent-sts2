import json,subprocess,hashlib
from pathlib import Path
D=Path('.artifacts/issue50-resume-20261024');a=json.loads((D/'preflight.json').read_text());base=a['base'];tree=a['resolved_tree'];old='2921da7638a43db380aabce070628369dcd559ba';review='eed9751983cf7bf6027ac4ba5d5c88b7c14cbde6'
def g(*x):return subprocess.check_output(['git',*x])
checks={}
for n in ['agent/src/brain/brain.ts','agent/tools/brain-agent-report.ts']:
 before=g('show',old+':'+n).decode();now=g('show',base+':'+n).decode();prior=g('show',review+':'+n).decode();combined=g('show',tree+':'+n).decode()
 if n.endswith('/brain.ts'):
  old_line=next(s for s in before.splitlines() if s.startswith('  const guidance ='))
  new_line=next(s for s in now.splitlines() if s.startswith('  const guidance ='))
  checks[n]={'prior_plus_exact_r420_guidance':prior.replace(old_line,new_line)==combined,'new_guidance_exact':new_line in combined}
 else:
  # Merge the already reviewed #50 additions into the R420 report preserves the full #49 delta.
  stripped=combined.replace('import { endgameRequired, endgameCheckpointRequired, endgameProblems, parseEndgamePlan } from "../src/memory/endgame-plan.js";\n','')
  block_start=stripped.index('  const endgame = data.filter(');block_end=stripped.index('  return { schema:',block_start)
  stripped=stripped[:block_start]+stripped[block_end:]
  stripped='\n'.join(line for line in stripped.split('\n') if not line.startswith('    endgame_groups:') and not line.startswith('    endgame_limitation:'))
  checks[n]={'remove_only_reviewed_endgame_additions_equals_r420':stripped==now}

for r in a['r421_preservation']:
 r['resolved']=g('rev-parse',tree+':'+r['path']).decode().strip();assert r['resolved']==r['main']==r['live']
assert all(all(r.values()) for r in checks.values())
a['preservation_checks']=checks;a['eight_prior_leaves_unchanged']=sum(r['resolved']==r['prior'] for r in a['paths'])==8
assert a['eight_prior_leaves_unchanged']
(D/'preflight.json').write_text(json.dumps(a,indent=2)+'\n');print(json.dumps(checks))

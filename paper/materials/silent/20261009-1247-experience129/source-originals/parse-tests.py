import json,re
from pathlib import Path
O=Path(__file__).parent
rc=int((O/'test-exp.exit').read_text());s=(O/'test-exp.log').read_text();assert rc==0
files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',s)));cases=sum(map(int,re.findall(r'^\s*Tests\s+(\d+) passed',s,re.M)))
assert files and cases
r={'tsc':0,'vitest':rc,'files':files,'cases':cases,'rerun':(O/'test-exp-retry.log').exists()};(O/'test-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(r)

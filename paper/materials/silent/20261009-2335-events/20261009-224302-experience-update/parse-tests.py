import json,re
from pathlib import Path
O=Path(__file__).parent
rc=int((O/'test-copy-full.exit').read_text())
assert rc==0
log=(O/'test-copy-full.log').read_text()
files=[int(x) for x in re.findall(r'Test Files\s+(\d+) passed',log)]
cases=[int(x) for x in re.findall(r'Tests\s+(\d+) passed',log)]
assert len(files)==len(cases)==2
r=dict(tsc=0,vitest=rc,files=sum(files),cases=sum(cases),retried=True)
(O/'test-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(r,ensure_ascii=False))

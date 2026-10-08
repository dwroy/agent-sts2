import hashlib, json, re
from pathlib import Path
O=Path(__file__).parent.resolve()
rc=int((O/'test-source.rc').read_text());log=(O/'test-source.log').read_text()
files=[int(x) for x in re.findall(r'Test Files\s+(\d+) passed',log)]
cases=[int(x) for x in re.findall(r'Tests\s+(\d+) passed',log)]
assert rc==0 and len(files)==len(cases)==2,(rc,files,cases)
assert (O/'test-source-before.sha256').read_text()==(O/'test-source-after.sha256').read_text()
current=hashlib.sha256((O.parents[2]/'knowledge/characters/silent/experience.json').read_bytes()).hexdigest()
assert current==(O/'test-source-before.sha256').read_text().split()[0]
result=dict(tsc=0,vitest=rc,files=sum(files),cases=sum(cases),final_sha256=current,snapshot_unchanged=True,rerun=False)
(O/'test-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))

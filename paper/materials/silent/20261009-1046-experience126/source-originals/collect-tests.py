import json
import re
from pathlib import Path

O = Path(__file__).parent
rc = int((O/'test-source.rc').read_text().strip())
assert rc==0, rc
text = (O/'test-source.log').read_text()
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed',text)]
cases = [int(n) for n in re.findall(r'\bTests\s+(\d+) passed',text)]
assert len(files)==2 and len(cases)==2
result = {'tsc':0,'vitest':0,'files':sum(files),'cases':sum(cases),'rerun':False,'suite_files':files,'suite_cases':cases}
(O/'test-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(result)

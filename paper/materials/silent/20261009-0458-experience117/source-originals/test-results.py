import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent.resolve()
rows = []
for stem in ['test-source', 'test-source-final']:
    rc = int((O / (stem + '.rc')).read_text())
    log = (O / (stem + '.log')).read_text()
    files = [int(x) for x in re.findall(r'Test Files\s+(\d+) passed', log)]
    cases = [int(x) for x in re.findall(r'Tests\s+(\d+) passed', log)]
    assert rc == 0 and len(files) == len(cases) == 2, (stem, rc, files, cases)
    rows.append(dict(stem=stem, tsc=0, vitest=rc, files=sum(files), cases=sum(cases)))
assert (O / 'test-source-final-before.sha256').read_text() == (O / 'test-source-final-after.sha256').read_text()
current = hashlib.sha256((O.parents[2] / 'knowledge/characters/silent/experience.json').read_bytes()).hexdigest()
assert current == (O / 'test-source-final-before.sha256').read_text().split()[0]
result = dict(**{k:v for k,v in rows[-1].items() if k != 'stem'}, runs=rows, final_sha256=current, snapshot_unchanged=True, rerun_reason='首轮运行期间经验措辞及证据定稿；对最终静态快照完整重跑，非测试失败重试')
(O / 'test-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))

import hashlib
import json
import statistics
from pathlib import Path

O = Path(__file__).parent
B = json.load(open(O / 'slice-before.json'))
E = json.load(open(O / 'slice-after.json'))
rows, before, after, diffs = [], [], [], []
for b, e in zip(B, E):
    assert b['sample'] == e['sample']
    delta = [y - x for x, y in zip(b['sizes'], e['sizes'])]
    before += b['sizes']; after += e['sizes']; diffs += delta
    rows.append(dict(sample=b['sample'], before_median=b['median'], before_max=b['max'], after_median=e['median'], after_max=e['max'], paired_median=statistics.median(delta)))
summary = dict(rows=rows, before_median=statistics.median(before), after_median=statistics.median(after), median_growth=statistics.median(after)-statistics.median(before), paired_median=statistics.median(diffs), before_max=max(before), after_max=max(after), delta_range=[min(diffs), max(diffs)])
(O / 'slice-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
before_root = O / 'slice-knowledge-before'; after_root = O / 'slice-knowledge-after'
files = []
for file in before_root.rglob('*.json'):
    if file.name == 'experience.json':
        continue
    other = after_root / file.relative_to(before_root)
    assert file.read_bytes() == other.read_bytes()
    files.append(dict(file=str(file.relative_to(before_root)), sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
(O / 'slice-other-data-verification.json').write_text(json.dumps(files, ensure_ascii=False, indent=2)+'\n')

print('切片',summary['before_median'],summary['after_median'],'最大',summary['after_max'])

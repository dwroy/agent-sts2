import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
RUNS = json.loads((OUT / 'dispatch.json').read_text())['runs']
NEEDLES = [run.encode() for run in RUNS]
summary_path = OUT / 'extraction-summary.json'
summary = json.loads(summary_path.read_text()) if summary_path.exists() else {}
for name in sys.argv[1:] or ['runs', 'run-config', 'states', 'decisions', 'sl-attempts']:
    counts = Counter()
    offset = 0
    with (ROOT / 'logs' / (name + '.jsonl')).open('rb') as src, \
            (OUT / (name + '.jsonl')).open('wb') as dst, \
            (OUT / (name + '-locators.jsonl')).open('w') as loc:
        for line_no, raw in enumerate(src, 1):
            if any(needle in raw for needle in NEEDLES):
                row = json.loads(raw)
                run = row.get('state', {}).get('run_id') if name == 'states' else row.get('run_id')
                if run in RUNS:
                    if name == 'runs':
                        assert row['character'].lower() == 'silent'
                    if name == 'states':
                        assert row['state']['run']['character_id'].lower() == 'silent'
                        assert row['state']['run']['ascension'] == 10
                    dst.write(raw)
                    loc.write(json.dumps({'run_id': run, 'line': line_no,
                                          'offset': offset, 'bytes': len(raw),
                                          'sha256': hashlib.sha256(raw).hexdigest()}) + '\n')
                    counts[run] += 1
            offset += len(raw)
    summary[name] = dict(counts)
    print(name, dict(counts), flush=True)
summary_path.write_text(json.dumps(summary, indent=2) + '\n')

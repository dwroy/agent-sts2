"""Read-only gate for this development check before production queue rollout."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'ops'))
from board_resources import observe

parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);args=parser.parse_args()
root=Path(args.root).resolve();value=observe(root)
for path in root.glob('paper/materials/*-live-ops/checks.json'):
    data=json.loads(path.read_text())
    if data.get('state') not in ('queued-on-original-kernel-locks','waiting-original-issue35-process-exit','running'):
        continue
    pid=data['runner_pid'];start=data['runner_start']
    try:
        fields=Path('/proc',str(pid),'stat').read_text().rsplit(')',1)[1].split()
        if fields[0] not in ('Z','X') and fields[19]==str(start):
            value['legacy'].append(dict(pid=pid,start=str(start),role='ops',task='original-ops-check'))
    except FileNotFoundError:pass
print(json.dumps(value))

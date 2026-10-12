import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
source = sys.argv[1]
title = '2026-10-08 静默猎手 第八十八次增量：1 局 A10（version 2026-10-08.5，分支 exp-silent，'+source[:8]+'）'
mapping = json.load(open(O / 'ledger-map.json'))
owned = {}
for eid, lids in mapping.items():
    for lid in lids:
        owned.setdefault(lid, []).append(eid)
rows = [dict(id=lid, by='learner:experience-update', status='proposed', where={'experience': eids, 'commits': [source], 'changelog': [title]}, note='第88批经验已自测并提交；新证据/反例和旧repeat完整保持。是否实际合入由本批合入回执证明，运维据完成事件登记shipped，学习者不标accepted/shipped。') for lid, eids in sorted(owned.items())]
payload = ''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in rows)
(O / 'ledger-final-input.jsonl').write_text(payload)
p = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'update'], input=payload, text=True, capture_output=True)
(O / 'ledger-final.log').write_text(p.stdout+p.stderr)
assert p.returncode == 0, p.stderr
p = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'check'], text=True, capture_output=True)
(O / 'ledger-check.log').write_text(p.stdout+p.stderr)
assert p.returncode == 0, p.stderr
result = dict(added=[], proposed=sorted(owned), retired=[], check=0)
(O / 'ledger-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(result)

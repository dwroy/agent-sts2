"""Read existing log indexes only; no sync, one DuckDB thread, bounded references."""
import json
import sys
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = ROOT / 'learner/runs/20261022-184754-e08ce39d-b6e8-490b-9b69-c66a8f59dd38-issue-27-brain-strategies-task'
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query

c = query.connect(str(ROOT / 'data/logdb'), threads=1)
for name, sql, cap in [
    ('state-index.json', "SELECT run_id, act, floor, turn, screen, off, len FROM state_index WHERE run_id IN ('VGNDNGPFYRE3','FETDVL1P59B9','YZQEEDWQ6AY6') AND floor IN (17,18,33) AND off+len<=15698862740 ORDER BY off", 1300),
    ('sl-index.json', "SELECT * FROM sl_attempts WHERE run_id IN ('VGNDNGPFYRE3','FETDVL1P59B9','YZQEEDWQ6AY6') AND off+len<=54798485 ORDER BY off", 100),
]:
    result = query.run_query(c, sql, max_rows=cap)
    assert not result['truncated']
    (OUT / name).write_text(json.dumps(result) + '\n')
    print(name, result['row_count'])

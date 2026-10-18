#!/usr/bin/env python3
"""Only scalar engineering metadata, never prompt state or card facts, enters this report."""
from collections import Counter
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
DEST = OUT / 'delegation-readback.json'
ROOT = OUT.parents[2]
SOURCE = ROOT / 'logs/human-pace-shadow.jsonl'
CUTOFF = json.loads(DEST.read_text())['cutoff_bytes'] if DEST.exists() else SOURCE.stat().st_size
refs = []
offset = 0
with SOURCE.open('rb') as handle:
    while offset < CUTOFF:
        raw = handle.readline(CUTOFF - offset)
        if not raw:
            raise ValueError('original source truncated')
        here = offset
        offset += len(raw)
        try:
            row = json.loads(raw)
        except ValueError:
            continue
        if not '2026-10-17T09:00:00' <= str(row.get('ts'))[:19] < '2026-10-18T05:20:00':
            continue
        shadow = row.get('jev_shadow')
        if not isinstance(shadow, dict):
            continue
        item = {key: shadow.get(key) for key in ('module_first', 'agreement', 'module_agreement', 'fallback')}
        item.update(ts=row['ts'], run=row.get('run'), floor=row.get('floor'), delivered=row.get('delivered'),
                    actual_decision_unchanged=row.get('actual_decision_unchanged'),
                    primary=(row.get('card_facts') or {}).get('primary'))
        if any(isinstance(value, (dict, list)) for value in item.values()):
            raise ValueError('unexpected non-scalar metadata; do not export raw prompt state')
        refs.append({**item, 'source_offset': here, 'source_bytes': len(raw),
                     'sha256': hashlib.sha256(raw).hexdigest()})
groups = {'aligned': refs, 'after_support_0150': [r for r in refs if r['ts'] >= '2026-10-17T17:50:00']}
summary = {}
for name, rows in groups.items():
    counters = {key: dict(Counter(json.dumps(r[key], ensure_ascii=False) for r in rows))
                for key in ('module_first', 'primary', 'agreement', 'module_agreement')}
    summary[name] = dict(questions=len(rows), **counters,
                         all_actual_unchanged=all(r['actual_decision_unchanged'] for r in rows),
                         any_delivered=any(r['delivered'] for r in rows))
DEST.write_text(json.dumps(dict(source=str(SOURCE), cutoff_bytes=CUTOFF, summary=summary, refs=refs,
    limitation='Read-only engineering counts; agreement is not quality. Post-support is temporal, not causal attribution.'),
    ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))

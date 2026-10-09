"""Summarize observed ascension sources without fitting any mechanism."""
import collections
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
fights = [json.loads(l) for l in (HERE / 'dataset/fights.jsonl').read_text().splitlines()]
audit = json.loads((HERE / 'opening-audit.json').read_text())
inputs = json.loads((HERE / 'model-input-audit.json').read_text())
asc = {r['key']: r['asc'] for r in fights}
parts = [p for r in audit if asc[r['key']] == 10 for p in r['source']]
moves = [m for a in inputs if a['asc'] == 10 for monster in a['monsters'] for m in monster['moves']]
summary = {
    'openings': len(audit),
    'a10_hp_asc_sources': dict(collections.Counter(str(p['hpAsc']) for p in parts)),
    'a10_opening_asc_sources': dict(collections.Counter(str(p['openingAsc']) for p in parts)),
    'corrected_first_hit': sum(r['needs_corrected_first_hit_replay'] for r in audit),
    'a10_move_damage_asc_sources': dict(collections.Counter(str(m['damage']['from']) for m in moves if m['damage'])),
    'a10_no_damage_records': [monster['id'] + ':' + m['move'] for a in inputs if a['asc'] == 10
                            for monster in a['monsters'] for m in monster['moves'] if not m['damage']],
}
assert len(audit) == len(fights) and set(asc) == {r['key'] for r in audit}
(HERE / 'input-audit-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(summary, ensure_ascii=False))

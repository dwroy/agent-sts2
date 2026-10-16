#!/usr/bin/env python3
"""Read actual F48/F49 boundary snapshots without assigning gameplay values."""
import csv
import gzip
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT / 'paper/materials/20261016-v5s-regression-diagnosis'


def main():
    freeze = json.loads((OLD/'freeze.json').read_text())
    bosses = list(csv.DictReader((OLD/'bosses.csv').open()))
    by = {(b['run_id'], int(b['floor'])): b for b in bosses}
    sl = [json.loads(line) for line in gzip.open(HERE/'inputs/sl.original.jsonl.gz', 'rt')]
    index = {f['off']: f for f in (json.loads(line) for line in gzip.open(OLD/'inputs-lean/frames.jsonl.gz', 'rt'))}
    output, raw_refs = [], []
    with (ROOT/freeze['sources']['states']['path']).open('rb') as source:
        for run, floor in sorted(by):
            if floor != 49:
                continue
            a, b = by[run, 48], by[run, 49]
            states = []
            for boss in [a, b]:
                off = int(boss['first_frame_off'])
                meta = index[off]
                assert off + meta['len'] <= freeze['sources']['states']['complete_prefix_bytes']
                source.seek(off)
                raw = source.read(meta['len'])
                state = json.loads(raw)['state']
                assert state['run_id'] == run and state['run']['floor'] == int(boss['floor'])
                states.append(state)
                raw_refs.append(dict(run_id=run, floor=int(boss['floor']),
                                     source=dict(path='logs/states.jsonl', off=off, len=meta['len'], sha256=hashlib.sha256(raw).hexdigest()),
                                     hp=meta['hp'], potions=state['run'].get('potions'), relics=state['run'].get('relics')))
            first_won = next(s for s in sl if s['run_id'] == run and s['floor'] == 48 and s['result'] == 'won')
            second = [s for s in sl if s['run_id'] == run and s['floor'] == 49]
            occupied = lambda state: [dict(slot=p.get('index'), id=p.get('potion_id'), name=p.get('name'), usage=p.get('usage'))
                                      for p in state['run'].get('potions', []) if p.get('occupied')]
            output.append(dict(cohort=b['cohort'], run_id=run, F48_entry_hp=int(a['entry_hp']),
                               F48_winning_attempt=first_won['attempt'], F48_win_hp=first_won['end_hp'], F49_entry_hp=int(b['entry_hp']),
                               F48_use_events=first_won['summary']['potions'], F49_use_events_by_attempt=[s['summary']['potions'] for s in second],
                               F48_entry_occupied_slots=occupied(states[0]), F49_entry_occupied_slots=occupied(states[1]),
                               F49_attempts=len(second), F49_end_turns=[s['turns'] for s in second], F49_final_outcome=b['final_outcome'],
                               F48_win_source=first_won['_source'], F49_first_source=second[0]['_source']))
    (HERE/'resource-transitions.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
    with gzip.open(HERE/'inputs/F48-F49-entry-frames.jsonl.gz', 'wt') as out:
        for row in raw_refs:
            out.write(json.dumps(row, ensure_ascii=False)+'\n')
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

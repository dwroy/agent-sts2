import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'learner/runs/20261012-074301-postmortem'
RUN = 'N1ZEBMHZM4KC'
verified = {}
records = {}
for name in ('states', 'decisions'):
    rows = []
    with (ROOT / f'logs/{name}.jsonl').open('rb') as original:
        for line in (SOURCE / f'{name}.jsonl').open():
            row = json.loads(line)
            state = row.get('state', row)
            floor = state.get('run', {}).get('floor', row.get('floor'))
            if floor not in (20, 21):
                continue
            original.seek(row['_offset'])
            data = original.readline()
            parsed = json.loads(data)
            assert parsed == {k: v for k, v in row.items() if not k.startswith('_')}
            assert parsed.get('state', parsed).get('run_id') == RUN
            rows.append(row)
    records[name] = rows
    target = OUT / f'{name}-verified.json'
    target.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    verified[name] = {'rows': len(rows), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

states = {r['_line']: r['state'] for r in records['states']}
decisions = {r['_line']: r for r in records['decisions']}
before, selected, after, end, next_turn = [states[n] for n in (366200, 366202, 366203, 366204, 366205)]
assert selected['run']['character_id'] == 'SILENT' and selected['run']['ascension'] == 10
assert selected['turn'] == 4 and selected['run']['floor'] == 21
assert [selected['combat']['player'][k] for k in ('current_hp', 'block', 'energy')] == [22, 17, 3]
assert [c['card_id'] for c in selected['selection']['cards']] == ['ASCENDERS_BANE', 'DEFEND_SILENT', 'HAZE']
assert decisions[355908]['chosen'] == {'action': 'select_deck_card', 'option_index': 2}
assert [c['card_id'] for c in after['combat']['hand']] == ['ASCENDERS_BANE', 'DEFEND_SILENT']
assert [end['combat']['player'][k] for k in ('current_hp', 'block', 'energy')] == [22, 24, 2]
assert next_turn['combat']['player']['current_hp'] == 22
original_plan = json.loads(decisions[355906]['questions']['plan']['criteria']['plan1'])
assert original_plan['damage_dealt'] == 38 and original_plan['hp_lost'] == 0
actual_damage = sum(e['current_hp'] for e in before['combat']['enemies']) - sum(e['current_hp'] for e in next_turn['combat']['enemies'])
assert actual_damage == 14
assert 'dmg 14' in decisions[355909]['rationale']
fixture = {'run': RUN, 'selection': selected, 'after': after, 'end': end, 'next_turn': next_turn,
           'original_full_plan_prediction': {k: original_plan[k] for k in ('hp_lost', 'damage_dealt', 'block_gained')},
           'actual_damage': actual_damage, 'decision_ids': {str(n): decisions[n]['decision_id'] for n in range(355906, 355911)}}
(OUT / 'discard-evidence.json').write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n')
(OUT / 'evidence-verification.json').write_text(json.dumps({'verified': verified, 'actual_damage': actual_damage, 'predicted_damage': 38, 'conditional_gap': 24}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(verified, ensure_ascii=False))
for n, d in decisions.items():
    if d['floor'] == 20 and d.get('turn') == 4:
        print(n, d.get('label'), d.get('rationale'))

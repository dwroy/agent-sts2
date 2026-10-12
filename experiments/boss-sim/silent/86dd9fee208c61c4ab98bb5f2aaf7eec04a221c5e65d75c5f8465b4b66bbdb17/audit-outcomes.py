"""Cross-check every new outcome against source SL events and settlement frames."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOGS = Path('/home/dw/Projects/agent-sts2/logs')
fights = json.loads((HERE / 'new-fights.json').read_text())
sources = {r['key']: r for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()
           if (r := json.loads(line)).get('key')}
events = {}
with (LOGS / 'sl-attempts.jsonl').open('rb') as handle:
    while True:
        off = handle.tell()
        raw = handle.readline()
        if not raw:
            break
        r = json.loads(raw)
        if r.get('fight_kind') == 'boss':
            events[(r['run_id'], r['floor'], r['attempt'])] = (
                r, {'offset': off, 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})

checked = []
with (LOGS / 'states.jsonl').open('rb') as handle:
    for fight in fights:
        source = sources[fight['key']]
        event, event_ref = events[(fight['run_id'], fight['floor'], fight['attempt'])]
        assert event['result'] == fight['outcome']
        if fight['outcome'] == 'died':
            assert event.get('end_hp') == fight['end_hp'] == 0
        handle.seek(source['source']['last_off'])
        settlement = None
        for _ in range(200):
            off = handle.tell()
            raw = handle.readline()
            if not raw:
                break
            row = json.loads(raw)
            state = row['state']
            if state.get('run_id') != fight['run_id']:
                break
            run = state.get('run') or {}
            if state.get('in_combat') or state.get('screen') == 'COMBAT':
                continue
            assert run.get('character_id') == 'SILENT'
            assert run.get('floor') == fight['floor']
            hp = run.get('current_hp')
            if fight['outcome'] == 'died':
                assert state['screen'] == 'GAME_OVER' and hp == 0
            else:
                assert hp > 0
            settlement = {'offset': off, 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                          'screen': state['screen'], 'hp': hp, 'ts': row['ts']}
            break
        assert settlement is not None, fight['key']
        if fight['outcome'] == 'won':
            assert fight['end_hp'] == min(source['source']['last_logged_hp'], event['end_hp'], settlement['hp'])
        checked.append({'key': fight['key'], 'outcome': fight['outcome'],
                        'entry_hp': fight['entry_hp'], 'last_combat_hp': source['source']['last_logged_hp'],
                        'end_hp': fight['end_hp'], 'sl_reported_hp': event['end_hp'],
                        'hp_convention': 'existing extractor: won uses minimum observed terminal HP; died uses zero',
                        'sl_source': event_ref, 'settlement': settlement})
(HERE / 'new-outcome-audit.json').write_text(json.dumps(checked, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'new_outcomes': len(checked), 'sl_and_settlement_agree': True}))

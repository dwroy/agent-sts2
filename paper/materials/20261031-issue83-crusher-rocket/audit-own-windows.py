#!/usr/bin/env python3
"""Audit the original tune and named diagnostic failures without fitting on val."""
import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
TREE = Path(__file__).resolve().parents[3]
OUT = TREE / '.artifacts/issue83/crusher-rocket'


def powers(values):
    return {p['power_id']: p['amount'] for p in values}


def lean(row):
    state = row['state']
    combat = state.get('combat') or {}
    player = combat.get('player') or {}
    return {'ts': row['ts'], 'turn': state.get('turn'), 'hp': player.get('current_hp'),
            'block': player.get('block'), 'energy': player.get('energy'),
            'cards_played': player.get('cards_played_this_turn'),
            'player_powers': powers(player.get('powers', [])),
            'ready': (combat.get('action_readiness') or {}).get('can_use_combat_actions'),
            'enemies': [{'id': e['enemy_id'], 'hp': e['current_hp'], 'max_hp': e['max_hp'],
                         'block': e['block'], 'alive': e['is_alive'], 'move': e.get('move_id'),
                         'powers': powers(e.get('powers', [])), 'intents': e.get('intents')}
                        for e in combat.get('enemies', [])],
            'hand': [{'id': c.get('card_id'), 'name': c.get('name'), 'cost': c.get('cost'),
                      'upgrades': c.get('upgrades')} for c in combat.get('hand', [])]}


def main():
    inventory = json.loads((OUT / 'combined-own-inventory.json').read_text())['CRUSHER+ROCKET']
    ops = json.loads((TREE / '.artifacts/issue83/own/ops-manifest.json').read_text())
    split_ref = ops['files']['split.json']
    raw = (ROOT / split_ref['path']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == split_ref['sha256']
    tune = set(json.loads(raw)['tune'])
    failures = {r['run_id'] for r in inventory['today_terminal_deaths']}
    selected = [r for r in inventory['rows'] if r['key'] in tune or r['run_id'] in failures]
    report = {'schema': 'issue83-crusher-own-window-audit-v1', 'rows': [],
              'policy': 'Only original tune learns mechanisms; five named censored/terminal failures are diagnostic, never promoted to actual first-outcome val.'}
    with (ROOT / 'logs/states.jsonl').open('rb') as handle:
        for source in selected:
            ref = source['source']
            handle.seek(ref['last_off'])
            last_length = len(handle.readline())
            handle.seek(ref['first_off'])
            raw = handle.read(ref['last_off'] + last_length - ref['first_off'])
            snapshots = []
            off = ref['first_off']
            for line in raw.splitlines(keepends=True):
                row = json.loads(line)
                state = row.get('state') or {}
                if state.get('run_id') == source['run_id'] and state.get('screen') == 'COMBAT':
                    item = lean(row)
                    if any(e['id'] in ('CRUSHER', 'ROCKET') for e in item['enemies']):
                        snapshots.append(dict(item, off=off, length=len(line), sha256=hashlib.sha256(line).hexdigest()))
                off += len(line)
            turns = {}
            for item in snapshots:
                if item['ready']:
                    turns.setdefault(item['turn'], []).append(item)
            report['rows'].append({'key': source['key'], 'run_id': source['run_id'],
                'attempt': source['attempt'], 'asc': source['asc'], 'outcome': source['outcome'],
                'purpose': 'original_tune' if source['key'] in tune else 'named_failure_diagnostic',
                'window': {'off': ref['first_off'], 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()},
                'turns': [{'turn': t, 'first': ss[0], 'last': ss[-1]} for t, ss in sorted(turns.items())],
                'all_snapshots': snapshots})
    (OUT / 'own-window-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    for row in report['rows']:
        print(row['key'], row['purpose'], 'outcome', row['outcome'])
        for t in row['turns']:
            s = t['first']
            print(' T', t['turn'], 'hp', s['hp'], [(e['id'], e['hp'], e['block'], e['move'], e['powers'].get('STRENGTH_POWER', 0)) for e in s['enemies']])


if __name__ == '__main__':
    main()

import bisect
import collections
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
EXP = ROOT / '.worktrees/exp/learner/runs'
PROPOSALS = json.loads((OUT / 'claimed-proposals.json').read_text())
RUN_IDS = sorted({r for p in PROPOSALS.values() for r in p['runs']})


def dump(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def read_at(handle, offset):
    handle.seek(offset)
    raw = handle.readline()
    return raw, json.loads(raw)


def lower_timestamp(handle, timestamp):
    handle.seek(0, 2)
    low, high = 0, handle.tell()
    while high - low > 131072:
        middle = (low + high) // 2
        handle.seek(middle)
        handle.readline()
        raw = handle.readline()
        row = json.loads(raw)
        if row['ts'] < timestamp:
            low = handle.tell()
        else:
            high = middle
    handle.seek(low)
    while True:
        pos = handle.tell()
        raw = handle.readline()
        if not raw:
            raise ValueError('timestamp beyond frozen file')
        row = json.loads(raw)
        if row['ts'] >= timestamp:
            return pos, raw, row


def reference(source, offset, raw, row):
    return {'source': source, 'offset': offset, 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(), 'ts': row['ts']}


def powers(raw):
    return {p['power_id']: p.get('amount') for p in raw or []}


def summarize(state):
    run = state['run'] or {}
    combat = state.get('combat') or {}
    player = combat.get('player') or {}
    return {'run': state['run_id'], 'floor': run.get('floor'), 'turn': state.get('turn'),
            'screen': state.get('screen'), 'hp': run.get('current_hp'), 'max_hp': run.get('max_hp'),
            'energy': player.get('energy'), 'block': player.get('block'),
            'ready': (combat.get('action_readiness') or {}).get('can_use_combat_actions'),
            'powers': powers(player.get('powers')),
            'hand': [{'id': c.get('card_id'), 'index': c.get('index'), 'upgraded': c.get('upgraded'),
                      'cost': c.get('energy_cost'), 'damage_base': next((v.get('base_value') for v in c.get('dynamic_values', []) if v.get('name') == 'Damage'), None)}
                     for c in combat.get('hand', [])],
            'potions': [{'index': p.get('index'), 'id': p.get('potion_id')} for p in run.get('potions', [])],
            'enemies': [{'id': e.get('enemy_id'), 'index': e.get('index'), 'hp': e.get('current_hp'),
                         'block': e.get('block'), 'alive': e.get('is_alive'), 'move': e.get('move_id'),
                         'powers': powers(e.get('powers')), 'intents': e.get('intents')}
                        for e in combat.get('enemies', [])],
            'lamp': [r for r in run.get('relics', []) if r.get('relic_id') == 'UNSETTLING_LAMP']}


runs = {}
with (ROOT / 'logs/runs.jsonl').open() as handle:
    for line in handle:
        row = json.loads(line)
        if row.get('run_id') in RUN_IDS:
            assert row['character'].lower() == 'silent'
            runs[row['run_id']] = row
assert set(runs) == set(RUN_IDS)
dump('all-authorized-runs.json', runs)

bound = {
    'KEN58SH9SLZ6': '20261007-214301-experience-update',
    'TXZ6RVMQA09D': '20261007-223544-experience-update',
    'WQZVENQ7DTRP': '20261007-223544-experience-update',
    '1913SE84AXQF': '20261007-234302-experience-update',
    'Q6M2Y34MWKRE': '20261007-234302-experience-update',
    'NHA2KW0RB7VP': '20261008-004303-experience-update',
}
summary = {}
sources = []
with (ROOT / 'logs/states.jsonl').open('rb') as handle:
    for run_id, directory in bound.items():
        index_path = EXP / directory / run_id / 'states-offsets.json'
        index = json.loads(index_path.read_text())
        handle.seek(index['first'])
        frames = []
        while handle.tell() <= index['last']:
            offset = handle.tell()
            raw = handle.readline()
            row = json.loads(raw)
            state = row['state']
            if state.get('run_id') != run_id:
                continue
            assert state['run']['character_id'].lower() == 'silent'
            ref = reference('states', offset, raw, row)
            sources.append(ref)
            frame = summarize(state)
            frame.update({'source': ref, 'fingerprint': row['fingerprint']})
            frames.append(frame)
        assert len(frames) == index['n'], (run_id, len(frames), index['n'])
        dump(run_id + '.frames.json', frames)
        start, end = frames[0]['source']['ts'], frames[-1]['source']['ts']
        decisions = []
        with (ROOT / 'logs/decisions.jsonl').open('rb') as decisions_handle:
            offset, raw, row = lower_timestamp(decisions_handle, start)
            decisions_handle.seek(offset)
            while True:
                offset = decisions_handle.tell()
                raw = decisions_handle.readline()
                if not raw:
                    break
                row = json.loads(raw)
                if row['ts'] > end:
                    break
                if row.get('run_id') != run_id:
                    continue
                ref = reference('decisions', offset, raw, row)
                sources.append(ref)
                decisions.append({'source': ref, 'row': row})
        assert decisions, run_id
        dump(run_id + '.decisions.json', decisions)
        summary[run_id] = {'states': len(frames), 'decisions': len(decisions), 'start': start, 'end': end,
                           'state_index': str(index_path), 'ascension': runs[run_id]['ascension']}

    history = json.loads((EXP / '20261007-223544-experience-update/cunning-history.json').read_text())
    observed = []
    for case in history['cases']:
        if case['run'] not in RUN_IDS:
            continue
        offset, raw, row = lower_timestamp(handle, case['ts'])
        assert row['ts'] == case['ts'], (case['ts'], row['ts'])
        before = row['state']
        assert before['run_id'] == case['run'] and before['run']['character_id'].lower() == 'silent'
        ref_before = reference('states', offset, raw, row)
        handle.seek(offset + len(raw))
        offset_after = handle.tell()
        raw_after = handle.readline()
        after_row = json.loads(raw_after)
        after = after_row['state']
        assert after['run_id'] == case['run']
        ref_after = reference('states', offset_after, raw_after, after_row)
        sources.extend([ref_before, ref_after])
        bh, ah = before['combat']['hand'], after['combat']['hand']
        new = ah[len(bh):]
        assert len(bh) == case['before'] and len(ah) == case['after']
        assert len(new) == min(3, 10 - len(bh))
        assert all(c['card_id'] == 'SHIV' and c['upgraded'] is True and
                   next(v['base_value'] for v in c['dynamic_values'] if v['name'] == 'Damage') == 6 for c in new)
        assert before['combat']['player']['energy'] == after['combat']['player']['energy']
        assert before['run']['current_hp'] == after['run']['current_hp']
        assert next(p for p in before['run']['potions'] if p['index'] == case['slot'])['potion_id'] == 'CUNNING_POTION'
        assert next(p for p in after['run']['potions'] if p['index'] == case['slot'])['potion_id'] is None
        observed.append({'run': case['run'], 'floor': case['floor'], 'turn': case['turn'],
                         'attempt': case['attempt'], 'before_count': len(bh), 'after_count': len(ah),
                         'added': len(new), 'slot': case['slot'], 'before': ref_before, 'after': ref_after})
    dump('cunning-observations.json', observed)
    summary['cunning'] = {'drinks': len(observed), 'runs': sorted({r['run'] for r in observed}),
                          'added_counts': dict(collections.Counter(r['added'] for r in observed))}

with (ROOT / 'logs/sl-attempts.jsonl').open('rb') as handle:
    sl = []
    while True:
        offset = handle.tell()
        raw = handle.readline()
        if not raw:
            break
        row = json.loads(raw)
        if row.get('run_id') in bound:
            ref = reference('sl-attempts', offset, raw, row)
            sources.append(ref)
            sl.append({'source': ref, 'row': row})
dump('sl-attempts.json', sl)
dump('source-references.json', sources)
dump('evidence-extraction-summary.json', summary)
print(json.dumps(summary, ensure_ascii=False, indent=2))

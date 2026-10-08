import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
VLZ = ROOT / 'learner/runs/20261007-154302-postmortem'
JRE = ROOT / 'learner/runs/20261007-164302-postmortem'
checks = []
manifest = []
snapshots = {}
decisions = {}


def check(name, condition):
    assert condition, name
    checks.append(name)


def powers(player):
    return {p['power_id']: p['amount'] for p in player.get('powers', [])}


def dyn(card, name):
    return next(v['current_value'] for v in card['dynamic_values'] if v['name'] == name)


def hand(state, card_id):
    return next(c for c in state['combat']['hand'] if c['card_id'] == card_id)


def record(name, line, offset, row, raw):
    expected = {k: v for k, v in row.items() if k not in ('_line', '_offset')}
    check(f'{name}:{line} 原日志对象一致', json.loads(raw) == expected)
    run = expected.get('run_id') or expected.get('state', {}).get('run_id')
    check(f'{name}:{line} 本角色局号', run in allowed)
    manifest.append({'file': str(ROOT / 'logs' / name), 'line': line, 'offset': offset,
                     'sha256': hashlib.sha256(raw).hexdigest(), 'run': run})
    if name == 'states.jsonl':
        s = expected['state']
        check(f'状态:{line} 静默A10', s['run']['character_id'] == 'SILENT' and s['run']['ascension'] == 10)
        snapshots[str(line)] = s
    else:
        decisions[str(line)] = expected


batch = json.loads((OUT / 'batch.json').read_text())
allowed = set(batch['runs'])
runs = {}
for ln in (ROOT / 'logs/runs.jsonl').open():
    r = json.loads(ln)
    if r['run_id'] in allowed:
        runs[r['run_id']] = r
check('六个来源局全部存在且均为静默A10', set(runs) == allowed and all(r['character'] == 'SILENT' and r['ascension'] == 10 for r in runs.values()))
(OUT / 'run-metadata.json').write_text(json.dumps(runs, ensure_ascii=False, indent=2) + '\n')

selected = {
    'states.jsonl': {275564, 275565, 275679, 275680, 275687, 275722, 275732, 275746, 275750},
    'decisions.jsonl': {269706, 269707, 269748, 269754, 269770},
}
last = {}
for name, wanted in selected.items():
    last_row = None
    with (ROOT / 'logs' / name).open('rb') as source:
        for ln in (VLZ / name).open():
            r = json.loads(ln)
            last_row = r
            if r['_line'] not in wanted:
                continue
            source.seek(r['_offset'])
            raw = source.readline()
            record(name, r['_line'], r['_offset'], r, raw)
        source.seek(last_row['_offset'])
        raw = source.readline()
        last[name] = (last_row['_line'] + 1, source.tell())

# The original eight-JRE slice has line numbers but no offsets. Start directly after VLZ.
for name, preserved, wanted in [
    ('states.jsonl', JRE / '8JRE1C4H4Z2W-states-lines.jsonl', {276433, 276434}),
    ('decisions.jsonl', JRE / '8JRE1C4H4Z2W-decisions.jsonl', {270216, 270282, 270264}),
]:
    expected = {}
    for ln in preserved.open():
        if name == 'states.jsonl':
            n, ln = ln.split(':', 1)
            r = json.loads(ln)
            n = int(n)
        else:
            r = json.loads(ln)
            n = r['_line']
        if n in wanted:
            expected[n] = r
    check(f'{name} JRE 所需原帧齐全', set(expected) == wanted)
    n, offset = last[name]
    with (ROOT / 'logs' / name).open('rb') as source:
        source.seek(offset)
        while n <= max(wanted):
            offset = source.tell()
            raw = source.readline()
            assert raw
            if n in expected:
                record(name, n, offset, expected[n], raw)
            n += 1

# Source pointers saved by the earlier own-character verification.
seen = set()
with (ROOT / 'logs/states.jsonl').open('rb') as source:
    for ln in Path('learner/runs/20261007-170245-strategy-proposal/verified-evidence.jsonl').open():
        r = json.loads(ln)
        s = r['row']['state']
        run = s['run']
        c = s.get('combat') or {}
        target = ((r['run'] == 'CA5KE8GFJ9X2' and run['floor'] == 13 and s.get('turn') in (1, 3, 5)) or
                  (r['run'] == '61E2QS63Y9WU' and run['floor'] in (17, 23) and s.get('turn') in (4, 5, 6)) or
                  (r['run'] == '5PM6JAQG6FNQ' and run['floor'] == 39 and s.get('turn') == 2) or
                  (r['run'] == 'DUZUBAJ3A8GP' and run['floor'] == 30 and s.get('turn') in (1, 4, 5, 6)))
        key = (r['run'], run['floor'], s.get('turn'))
        if not target or key in seen or not c.get('action_readiness', {}).get('can_use_combat_actions'):
            continue
        seen.add(key)
        source.seek(r['offset'])
        raw = source.readline()
        check(f'{key} 原字节SHA一致', hashlib.sha256(raw).hexdigest() == r['sha256'])
        record('states.jsonl', f"offset-{r['offset']}", r['offset'], r['row'], raw)

a, b = snapshots['275564'], snapshots['275565']
check('F35 神化实际花2能且HP不变', a['combat']['player']['energy'] - b['combat']['player']['energy'] == 2 and a['combat']['player']['current_hp'] == b['combat']['player']['current_hp'])
for cid, field, before, after in [('DEFEND_SILENT', 'Block', 5, 8), ('STRIKE_SILENT', 'Damage', 7, 10), ('DAGGER_SPRAY', 'Damage', 5, 7)]:
    check(f'F35 {cid} {before}→{after}', dyn(hand(a, cid), field) == before and dyn(hand(b, cid), field) == after)
check('F35 必备工具费用1→0', hand(a, 'TOOLS_OF_THE_TRADE')['energy_cost'] == 1 and hand(b, 'TOOLS_OF_THE_TRADE')['energy_cost'] == 0)
check('F35 不可升级牌与已升级牌保持观察值', not hand(b, 'ASCENDERS_BANE')['upgraded'] and dyn(hand(b, 'NOXIOUS_FUMES'), 'PoisonPerTurn') == 3)
a, b = snapshots['275679'], snapshots['275680']
for cid, field, before, after in [('FASTEN', 'ExtraBlock', 4, 6), ('PIERCING_WAIL', 'StrengthLoss', 6, 8), ('SUCKER_PUNCH', 'WeakPower', 1, 2), ('SUCKER_PUNCH', 'Damage', 9, 11)]:
    check(f'F43 {cid}/{field} {before}→{after}', dyn(hand(a, cid), field) == before and dyn(hand(b, cid), field) == after)
check('F43 后续抽到已升级毒雾', hand(snapshots['275687'], 'NOXIOUS_FUMES')['upgraded'])
check('F45 持有神化未兑现全手升级', not hand(snapshots['275750'], 'NOXIOUS_FUMES')['upgraded'])
check('沙虫首试/第三试T2完全同盘', decisions['270216']['fingerprint'] == decisions['270282']['fingerprint'])
c = snapshots['276433']['combat']
check('沙虫末轮完整损血15而非截断5', c['player']['current_hp'] == 5 and c['player']['block'] == 22 and c['enemies'][0]['intents'][0]['total_damage'] == 37)
check('沙虫死亡后毒结算敌仍130HP', snapshots['276434']['combat']['enemies'][0]['current_hp'] == 130)

(OUT / 'fixed-states.json').write_text(json.dumps(snapshots, ensure_ascii=False, indent=2) + '\n')
(OUT / 'fixed-decisions.json').write_text(json.dumps(decisions, ensure_ascii=False, indent=2) + '\n')
(OUT / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(OUT / 'evidence-verification.json').write_text(json.dumps({'checks': checks, 'frames': len(manifest), 'runs': list(runs)}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'核验通过': len(checks), '原日志对象': len(manifest), '来源局': len(runs)}, ensure_ascii=False))

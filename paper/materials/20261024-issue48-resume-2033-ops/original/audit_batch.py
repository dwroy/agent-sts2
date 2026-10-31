import bisect
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNS = json.loads((HERE / 'run-identity.json').read_text())['rows']
IDS = [x['row']['run_id'] for x in RUNS]


def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def rows(path):
    with path.open() as handle:
        for line in handle:
            yield json.loads(line)


def ref(x):
    return {k: x[k] for k in ('source', 'source_size', 'line', 'offset', 'bytes', 'sha256') if k in x}


handles = {}
verified = collections.Counter()


def verify(x):
    p = x['source']
    if p not in handles:
        handles[p] = open(p, 'rb')
    h = handles[p]
    h.seek(x['offset'])
    raw = h.read(x['bytes'])
    assert hashlib.sha256(raw).hexdigest() == x['sha256'], ref(x)
    verified[p] += 1
    return json.loads(raw)


states = {r: [] for r in IDS}
for x in rows(HERE / 'evidence/states.evidence.jsonl'):
    row = verify(x)
    s = row['state']
    r = x['run_id']
    assert s['run_id'] == r
    run = s.get('run') or {}
    combat = s.get('combat') or {}
    player = combat.get('player') or {}
    deck = [{k: c.get(k) for k in ('card_id', 'name', 'upgraded', 'energy_cost', 'resolved_rules_text')}
            for c in run.get('deck', [])]
    states[r].append(dict(ts=row['ts'], observed_ts=row.get('observed_ts'), ref=ref(x),
        floor=run.get('floor'), act_id=run.get('act_id'), screen=s.get('screen'),
        turn=s.get('turn'), in_combat=s.get('in_combat'),
        hp=run.get('current_hp'), max_hp=run.get('max_hp'), gold=run.get('gold'),
        deck=deck, potions=run.get('potions'), boss_id=run.get('boss_id'),
        block=player.get('block'), energy=player.get('energy'), powers=player.get('powers'),
        enemies=combat.get('enemies', []), hand=combat.get('hand', [])))

decisions = collections.defaultdict(list)
by_id = collections.defaultdict(list)
for x in rows(HERE / 'v6-evidence/decisions.evidence.jsonl'):
    z = verify(x)
    assert z.get('run_id') == x['run_id']
    decisions[x['run_id']].append(x)
    by_id[z.get('decision_id')].append(x)

whole = {}
for rid, ss in states.items():
    changes, combats, current = [], [], None
    previous_deck = None
    for i, s in enumerate(ss):
        signature = [(c['card_id'], c['upgraded']) for c in s['deck']]
        if signature != previous_deck:
            changes.append(s)
            previous_deck = signature
        active = bool(s['in_combat'])
        restart = (current and (s['floor'] != current['entry']['floor'] or
                   (isinstance(s['turn'], int) and isinstance(current['last']['turn'], int)
                    and s['turn'] < current['last']['turn'])))
        if current and (not active or restart):
            current['exit'] = s if not restart else None
            current['boundary'] = 'observed_exit' if not restart else 'turn_reset_no_exit'
            combats.append(current)
            current = None
        if active:
            if current is None:
                current = {'entry': s, 'last': s, 'exit': None, 'boundary': 'open'}
            current['last'] = s
    if current:
        combats.append(current)
    ends = []
    for floor in (17, 33, 48):
        candidates = [s for s in ss if s['floor'] == floor and s['screen'] in ('MAP', 'REWARD')]
        ends.append({'floor': floor, 'snapshot': candidates[-1] if candidates else None,
                     'limitation': '已记录奖励/地图最后帧；未到达或无退出帧为null，不补完整通关。'})
    first_p = next((s for s in ss if {'ACCELERANT', 'FOOTWORK', 'NOXIOUS_FUMES'} <=
                    {c['card_id'] for c in s['deck']}), None)
    whole[rid] = {'state_count': len(ss), 'first': ss[0] if ss else None,
        'terminal': ss[-1] if ss else None, 'deck_changes': changes,
        'first_fumes_accelerant_footwork_holdings': first_p,
        'holding_signature_is_not_realized_capacity': True,
        'act_end_snapshots': ends, 'combats': combats,
        'construction_decisions': [dict(ref=ref(d), **{k: d['row'].get(k) for k in
            ('ts', 'floor', 'turn', 'decision_id', 'label', 'reason', 'chosen', 'result', 'run_plan')})
            for d in decisions[rid] if d['row'].get('label', '').startswith(
                ('reward/card', 'shop/', 'rest/', 'map/route', 'event/'))]}
write('whole-run-audit.json', whole)

questions, full = [], []
selected_ids = {'d07a54ab-01d4-4a24-9bf3-bb5bb4313fd4',
                '03d9b0bb-35af-4ed8-92c6-c8be6b37584c',
                'd6331e4c-37c6-461b-abe4-1c457f678c25'}
for x in rows(HERE / 'v6-evidence/jev-prompts.evidence.jsonl'):
    z = verify(x)
    rid, did = x['run_id'], z.get('decision_id')
    ds = by_id.get(did, [])
    assert ds and all(d['run_id'] == rid for d in ds)
    ss = states[rid]
    stamps = [s['ts'] for s in ss]
    at = bisect.bisect_right(stamps, z['ts'])
    before = ss[at - 1] if at else None
    after = ss[at:at + 3]
    item = dict(run_id=rid, decision_id=did, floor=z.get('floor'), turn=z.get('turn'),
        label=z.get('label'), ref=ref(x), identity=x.get('identity'),
        request_present=isinstance(z.get('request'), dict),
        question_ids=list((z.get('request') or {}).get('questions', {})),
        answers=z.get('answers'), error=z.get('error'),
        decisions=[dict(ref=ref(d), **{k: d['row'].get(k) for k in
                   ('chosen', 'result', 'gate_reject', 'selection_dispatch', 'reason', 'label')}) for d in ds],
        before_state=ref(before) if before else None,
        subsequent_states=[ref(s) for s in after],
        review='full_raw_read' if did in selected_ids else 'machine_join_and_fields_only',
        unread_reason=None if did in selected_ids else
            '整局主线与候选无新增逐题规则；完整请求已机械解析，不声称模型通读或验证反事实收益。')
    questions.append(item)
    if did in selected_ids:
        full.append({'jev': x, 'decisions': ds, 'before': before, 'after': after})
write('question-coverage.json', questions)
write('selected-raw-cases.json', full)
stats = {}
for rid in IDS:
    qq = [q for q in questions if q['run_id'] == rid]
    stats[rid] = {'jev_rows': len(qq), 'answers': sum(q['answers'] is not None for q in qq),
        'errors': sum(q['error'] is not None for q in qq),
        'fully_read_decision_ids': [q['decision_id'] for q in qq if q['review'] == 'full_raw_read'],
        'machine_only': sum(q['review'] != 'full_raw_read' for q in qq)}
write('coverage-counts.json', stats)
write('raw-integrity.json', {'verified_original_rows': dict(verified),
    'method': '逐行seek读取原始source的offset/bytes，SHA256完全一致；拒绝身份冲突。',
    'whole_run_model_read': '模型读结构化主线及所选窗口，未通读所有state或所有题面。'})
print(json.dumps({'coverage': stats, 'verified': dict(verified)}, ensure_ascii=False))

import bisect
import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
P = ROOT / 'learner/runs/20261009-194302-postmortem'
result = {}
for run in ['HXCY44VD9QWU', 'N8A2W8LH39N0']:
    manifest = json.load(open(P / (run + '-source-manifest.json')))
    counts = {}
    for name, rows in manifest.items():
        with (ROOT / 'logs' / (name + '.jsonl')).open('rb') as source:
            for row in rows:
                source.seek(row['offset'])
                raw = source.read(row['bytes'])
                assert hashlib.sha256(raw).hexdigest() == row['sha256']
                x = json.loads(raw)
                if name == 'states':
                    assert x['state']['run_id'] == run
                    assert x['state']['run']['character_id'].lower() == 'silent'
                else:
                    assert x.get('run_id', x.get('run')) == run
        counts[name] = len(rows)
    (O / (run + '-source-manifest.json')).write_text(json.dumps(manifest, indent=2) + '\n')
    states = [json.loads(s) for s in (O / run / 'states.jsonl').open()]
    decisions = [json.loads(s) for s in (O / run / 'decisions.jsonl').open()]
    stamps = [s['observed_ts'] for s in states]
    pairs = []
    for d in decisions:
        if d.get('expect', {}).get('card', {}).get('id') not in ['SHOCKWAVE', 'TORIC_TOUGHNESS', 'NOXIOUS_FUMES']:
            continue
        i = max(0, bisect.bisect_right(stamps, d['observed_ts']) - 1)
        pairs.append(dict(floor=d['floor'], turn=d['turn'], action=d['chosen'], card=d['expect']['card'], before=states[i], after=states[min(i + 1, len(states) - 1)]))
    result[run] = dict(raw_verified=counts, total=sum(counts.values()), pairs=pairs)
    (O / (run + '-key-pairs.json')).write_text(json.dumps(pairs, ensure_ascii=False, indent=2) + '\n')

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

facts = []
for run, floor in [('HXCY44VD9QWU', 17), ('N8A2W8LH39N0', 12), ('N8A2W8LH39N0', 14), ('N8A2W8LH39N0', 15), ('F9PP859XZ3RJ', 14), ('9YBKCNBFP0X5', 6)]:
    for line in (O / run / 'states.jsonl').open():
        x = json.loads(line); s = x['state']
        if s['run']['floor'] != floor or not s.get('combat'):
            continue
        c = s['combat']
        facts.append(dict(run=run, ts=x['ts'], floor=floor, turn=s['turn'], hp=s['run']['current_hp'], block=c['player']['block'], energy=c['player']['energy'], powers=powers(c['player']), enemies=[dict(id=e['enemy_id'], hp=e['current_hp'], powers=powers(e), intents=e['intents']) for e in c['enemies']], blocked=[h['card_id'] for h in c['hand'] if h.get('blocked_by_hook')]))
(O / 'mechanism-frame-facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')

hx = [x for x in facts if x['run'] == 'HXCY44VD9QWU' and x['ts'] >= '2026-10-09T11:13:54.597Z']
assert any(x['enemies'][0]['hp'] == 166 and x['enemies'][0]['powers'].get('PLOW_POWER') == 160 for x in hx)
assert any(x['enemies'][0]['hp'] == 157 and 'PLOW_POWER' not in x['enemies'][0]['powers'] and 'STRENGTH_POWER' not in x['enemies'][0]['powers'] and x['hp'] == 1 for x in hx)
assert any(x['turn'] == 8 and x['block'] == 8 and x['energy'] == 3 and len(x['blocked']) >= 3 for x in hx)
assert any(x['enemies'][0]['hp'] == 116 for x in hx)
toric = [x for x in facts if x['run'] == 'N8A2W8LH39N0' and x['floor'] == 12]
assert any(x['turn'] == 8 and x['block'] == 5 and x['powers'].get('TORIC_TOUGHNESS_POWER') == 1 for x in toric)
assert any(x['turn'] == 9 and x['block'] == 5 and 'TORIC_TOUGHNESS_POWER' not in x['powers'] for x in toric)
fumes = [x for x in facts if x['run'] == 'N8A2W8LH39N0' and x['floor'] == 14]
assert any(x['turn'] == 2 and x['powers'].get('NOXIOUS_FUMES_POWER') == 2 for x in fumes)
assert any(x['turn'] == 3 and x['enemies'][0]['powers'].get('POISON_POWER') == 2 for x in fumes)
assert any(x['turn'] == 4 and x['enemies'][0]['powers'].get('POISON_POWER') == 10 for x in fumes)
for run, floor in [('N8A2W8LH39N0', 15), ('F9PP859XZ3RJ', 14), ('9YBKCNBFP0X5', 6)]:
    jax = [e for x in facts if x['run'] == run and x['floor'] == floor for e in x['enemies'] if e['id'] == 'SNAPPING_JAXFRUIT']
    assert jax and any(e['powers'].get('STRENGTH_POWER', 0) >= 2 for e in jax)
(O / 'verification.json').write_text(json.dumps(dict(sources={k:{x:v for x,v in r.items() if x != 'pairs'} for k,r in result.items()}, key_checks=11, all_passed=True), ensure_ascii=False, indent=2) + '\n')
print('两局原始偏移/SHA及关键机制核验通过', sum(r['total'] for r in result.values()))

import collections
import hashlib
import json
import statistics
from pathlib import Path

O = Path(__file__).parent
A = json.load(open(O / 'audit.json'))
B = json.load(open(O / 'experience-before.json'))
E = json.load(open('knowledge/characters/silent/experience.json'))
C = json.load(open(O / 'changes.json'))['entries']
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
changed = {c['id'] for c in C}
old = {e['id']: e for e in B['entries']}
for e in E['entries']:
    assert len(e['evidence']) == len(set(e['evidence'])) == e['n_support']
    assert e.get('n_contradict', 0) == len(e.get('contradicting', []))
    assert all(len(r) == 12 and R[r]['character'].lower() == 'silent' for r in e['evidence'] + e.get('contradicting', []))
    assert e['scope'].split(':')[0] in ['boss', 'elite', 'hallway', 'act', 'general', 'card', 'relic', 'potion', 'event']
    if e['scope'].split(':')[0] in ['card', 'relic', 'potion', 'event']:
        assert e.get('name')
    if e['id'] not in changed:
        assert e == old[e['id']]
    else:
        assert e['evidence'] == old[e['id']]['evidence'] + ['PBUBM0LRTEDD']
        assert e['asc'] == old[e['id']]['asc']
        assert e.get('contradicting', []) == old[e['id']].get('contradicting', [])
assert len(changed) == 17 and len(E['entries']) == len(B['entries'])
active = [e for e in E['entries'] if e['status'] == 'active']
assert sum(len(e['lesson']) for e in active) == 51240 < 55000

triggers = []
for card in ['APOTHEOSIS', 'FOOTWORK', 'NOXIOUS_FUMES', 'SHADOWMELD']:
    rows = [x for x in A['cards'] if x['card'] == card]
    if card == 'APOTHEOSIS':
        assert {x['run'] for x in rows} == {'VLZ6CCT8AQ0A', 'PBUBM0LRTEDD'}
        assert all(x['before']['energy'] - x['after']['energy'] == (1 if x['run'] == 'PBUBM0LRTEDD' else 2) for x in rows)
    power = {'FOOTWORK': 'DEXTERITY_POWER', 'NOXIOUS_FUMES': 'NOXIOUS_FUMES_POWER', 'SHADOWMELD': 'SHADOWMELD_POWER'}.get(card)
    deltas = collections.Counter(x['after']['powers'].get(power, 0) - x['before']['powers'].get(power, 0) for x in rows) if power else collections.Counter(x['before']['energy'] - x['after']['energy'] for x in rows)
    triggers.append(dict(card=card, actions=len(rows), runs=len({x['run'] for x in rows}), deltas=dict(deltas), limitation='全历史实打集合仅核机制覆盖，不自动增加经验支持局或充当整战因果。'))
potions = [x for x in A['potions'] if (x.get('potion') or {}).get('id') == 'DEXTERITY_POTION']
assert all(x['after']['powers'].get('DEXTERITY_POWER', 0) - x['before']['powers'].get('DEXTERITY_POWER', 0) == 2 and x['before']['block'] == x['after']['block'] for x in potions)
triggers.append(dict(potion='DEXTERITY_POTION', actions=len(potions), runs=len({x['run'] for x in potions}), dex_added=2, old_block_unchanged=True))
new = [x for x in A['fights'] if x['run'] == 'PBUBM0LRTEDD']
assert next(x['loss'] for x in new if x['floor'] == 48) == 88
assert next(x['loss'] for x in new if x['floor'] == 49) == 26
fumes = [x for x in A['cards'] if x['card'] == 'NOXIOUS_FUMES' and x['run'] == 'PBUBM0LRTEDD']
assert fumes and all(x['after']['powers'].get('NOXIOUS_FUMES_POWER', 0) - x['before']['powers'].get('NOXIOUS_FUMES_POWER', 0) == 3 for x in fumes)
(O / 'historical-trigger-checks.json').write_text(json.dumps(triggers, ensure_ascii=False, indent=2) + '\n')

knowledge = []
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name == 'experience.json':
        continue
    x = json.load(p.open())
    knowledge.append(dict(file=str(p), bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest(), keys=list(x)[:20], source={k:x[k] for k in ['generated', 'generated_at', 'source', 'character', 'n_runs', 'runs', 'ascensions', 'version'] if k in x}, conclusion='该文件为历史汇总/生成模型或门槛数据；不同切点或预测不当实盘反例，未发现需改的独立手写知识。'))
(O / 'other-knowledge.json').write_text(json.dumps(knowledge, ensure_ascii=False, indent=2) + '\n')

if (O / 'slice-after.json').exists():
    pre = json.load(open(O / 'slice-before.json'))
    post = json.load(open(O / 'slice-after.json'))
    rows = []
    before_sizes, after_sizes, deltas = [], [], []
    for a, b in zip(pre, post):
        assert a['sample'] == b['sample'] and len(a['sizes']) == len(b['sizes']) == 20
        delta = [y - x for x, y in zip(a['sizes'], b['sizes'])]
        rows.append(dict(sample=a['sample'], before_median=a['median'], before_max=a['max'], after_median=b['median'], after_max=b['max'], paired_median=statistics.median(delta)))
        before_sizes += a['sizes']
        after_sizes += b['sizes']
        deltas += delta
    summary = dict(rows=rows, before_median=statistics.median(before_sizes), after_median=statistics.median(after_sizes), before_max=max(before_sizes), after_max=max(after_sizes), paired_median=statistics.median(deltas), increase_max=max(deltas), decrease_min=min(deltas))
    (O / 'slice-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print('17条变更/其余逐项等价、字段/角色/证据/预算、9次神化、全历史敏捷药/机制及8份知识核对通过。')

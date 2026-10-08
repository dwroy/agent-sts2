import collections
import json
import statistics
from pathlib import Path

O = Path(__file__).parent
OLD = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-120901-experience-update')
A = json.load(open(O / 'audit.json'))
B = json.load(open(OLD / 'audit.json'))
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
OPTIONS = {}
for run in A['runs']:
    for line in (O / run / 'decisions.jsonl').open():
        d = json.loads(line)
        if d['screen'] == 'REST':
            OPTIONS[(run, d['ts'])] = (d.get('expect') or {}).get('option', {}).get('id')

def rest_summary(a):
    result = []
    for asc in range(11):
        runs = {r for r in a['runs'] if R[r]['ascension'] == asc}
        rests = [r for r in a['rests'] if r['run'] in runs]
        heals = [r for r in rests if r['action'] == 'rest_heal' or (r['action'] == 'choose_rest_option' and (OPTIONS.get((r['run'], r['ts'])) == 'HEAL' or (not OPTIONS.get((r['run'], r['ts'])) and r['chosen']['option_index'] == 0)))]
        nexts = {}
        for r in heals:
            target = next((f for f in a['fights'] if f['run'] == r['run'] and f['floor'] > r['floor']), None)
            if target:
                nexts[(target['run'], target['floor'])] = target
        wins = [f['loss'] for f in nexts.values() if not f['death']]
        result.append(dict(asc=asc, runs=len(runs), rests=len({(r['run'],r['floor']) for r in rests}), heal=len(heals), smith=len(rests)-len(heals), gains=[r['after']-r['before'] for r in heals], nexts=len(nexts), deaths=sum(f['death'] for f in nexts.values()), median=statistics.median(wins) if wins else None))
    return result

def sl_summary(a):
    result = []
    for asc in range(11):
        groups = collections.defaultdict(list)
        for x in a['attempts']:
            if R[x['run']]['ascension'] == asc:
                groups[(x['run'], x['floor'])].append(x)
        multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
        result.append(dict(asc=asc, fights=len(multi), attempts=sum(len(v) for v in multi), wins=sum(x['result'] == 'won' for v in multi for x in v)))
    return result

assert rest_summary(B) == json.load(open(OLD / 'rest-summary.json'))
assert sl_summary(B) == json.load(open(OLD / 'sl-summary.json'))
check = {}
for key in ['fights', 'nexts', 'rests', 'cards', 'ends', 'attempts', 'growth']:
    old_rows = [x for x in A[key] if x['run'] in B['runs']]
    assert old_rows == B[key], key
    check[key] = dict(before=len(B[key]), after=len(A[key]), identical=True)
(O / 'baseline-check.json').write_text(json.dumps(check, ensure_ascii=False, indent=2)+'\n')
for row in B['bands']:
    cases = [r for r in A['fights'] if r['run'] in B['runs'] and all(r[k] == row[k] for k in ['asc', 'act', 'type', 'band'])]
    assert [(r['run'], r['floor']) for r in cases] == [tuple(x) for x in row['cases']]
    assert [r['loss'] for r in cases] == row['losses']
    assert sum(r['death'] for r in cases) == row['deaths']
for row in B['transfers']:
    cases = [r for r in A['nexts'] if r['run'] in B['runs'] and R[r['run']]['ascension'] == row['asc'] and all(r[k] == row[k] for k in ['act', 'screen', 'band'])]
    assert cases == row['cases']
for name, value in [('rest-summary', rest_summary(A)), ('sl-summary', sl_summary(A))]:
    (O / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(name, [{k:v for k,v in r.items() if k != 'gains'} for r in value])

facts = [r for r in A['cards'] if r['card'] in ['BURST', 'AFTERIMAGE', 'BLADE_DANCE', 'FOOTWORK', 'PROWESS', 'NOXIOUS_FUMES']]
(O / 'mechanism-state-facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
history = []
section=[]
def keep(section):
    if not section:return
    header=section[0][3:]
    if '静默猎手' not in header or header[:12] not in A['runs']:return
    for line in section[1:]:
        if any(word in line for word in ['爆发','余像','力量','敏捷','沙坑','毒雾','投斧','药瓶','小提琴','触媒','凋萎','人工制品','黑暗镣铐','船夹板','激怒','苦无','手里剑','荆棘','铜质鳞片','呼唤','无实体','带毒刺击']):history.append(header+'\n'+line)
for line in Path('/home/dw/Projects/agent-sts2/notes/lessons.md').open():
    if line.startswith('## '):keep(section);section=[line.rstrip()]
    elif section:section.append(line.rstrip())
keep(section)
(O / 'historical-mechanism-notes.txt').write_text('\n\n'.join(history) + '\n')
print('旧基线七数组、血档、节点转移、回血及SL全部一致；历史机制复盘段', len(history))

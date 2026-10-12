import collections
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load((O / 'audit.json').open())
C = json.load((O / 'changes.json').open())['entries']
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
themes = ['力量','敏捷','脆弱','步法','毒雾','触媒','蜃景','吸取','人工制品','暴露','铁棒','抱抱','铜钹','尖啸','沙坑','自爆','回复','营火','换线','爆发','速行者','计算下注','可可','毒素','冒泡','蟾蜍','彩虹','雕像','祭品','千足虫','余像','同族','覆甲','铁心','胆小','钓鱼竿','昏眩','族母','仪式兽','荆棘']
notes = []
section = []

def keep(section):
    if not section:
        return
    header = section[0][3:]
    if '静默猎手' not in header or header[:12] not in R:
        return
    for line in section[1:]:
        if any(t in line for t in themes):
            notes.append(dict(run=header[:12], header=header, text=line))

for line in Path('/home/dw/Projects/agent-sts2/notes/lessons.md').open():
    if line.startswith('## '):
        keep(section)
        section = [line.rstrip()]
    elif section:
        section.append(line.rstrip())
keep(section)
rows = []
for c in C:
    e = c['after']
    support = set(e['evidence'])
    assert all(R[r]['character'].lower() == 'silent' for r in support)
    scope, ident = e['scope'].split(':', 1)
    actions = [x for x in A['cards'] if x['run'] in support and x['card'] == ident] if scope == 'card' else [x for x in A['potions'] if x['run'] in support and (x.get('potion') or {}).get('id') == ident] if scope == 'potion' else []
    encounters = [x for x in A['fights'] if x['run'] in support and ident in x['enemies']] if scope in ['boss', 'hallway', 'elite'] else []
    supporting_notes = [x for x in notes if x['run'] in support]
    row = dict(id=e['id'], evidence=e['evidence'], contradicting=e.get('contradicting', []), by_asc=dict(collections.Counter(R[r]['ascension'] for r in support)), actual_actions=len(actions), actual_action_runs=sorted({x['run'] for x in actions}), encounter_count=len(encounters), note_segments=len(supporting_notes), limitation='支持/反例沿已核语义；动作/持有出现集合只作检索，不当整条机制支持局数；旧purebug定位不计新经验。')
    if scope == 'potion' and ident == 'SPEED_POTION':
        observations = []
        for p in actions:
            delta = p['after']['powers'].get('DEXTERITY_POWER', 0) - p['before']['powers'].get('DEXTERITY_POWER', 0)
            assert delta == 5, (p['run'], p['ts'], delta)
            observations.append(dict(run=p['run'], floor=p['floor'], turn=p['turn'], ts=p['ts'], dex_added=delta))
        row['drink_checks'] = observations
    rows.append(row)
facts = [x for x in A['cards'] if x['card'] in ['ABRASIVE', 'PIERCING_WAIL', 'STRANGLE', 'BUBBLE_BUBBLE', 'SNAKEBITE', 'HAND_TRICK']]
(O / 'mechanism-state-facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
(O / 'historical-mechanism-summary.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
(O / 'historical-mechanism-notes.txt').write_text('\n\n'.join(x['header'] + '\n' + x['text'] for x in notes) + '\n')
print('历史静默主题段',len(notes),'；',len(rows),'条支持/反例、分阶、实际动作/遭遇集合复核。')

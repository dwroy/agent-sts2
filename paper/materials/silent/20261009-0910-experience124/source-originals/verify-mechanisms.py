import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
S = {x['_line']:x['state'] for x in map(json.loads, (O/'pm-states.jsonl').open())}
D = list(map(json.loads, (O/'pm-decisions.jsonl').open()))
checks = []
def check(name, actual, expected):
    assert actual == expected, (name, actual, expected)
    checks.append(dict(item=name, value=actual))
def powers(entity):
    return {p['power_id']:p['amount'] for p in entity.get('powers', [])}
def p(n):
    return S[n]['combat']['player']
def enemy(n, i=0):
    return S[n]['combat']['enemies'][i]
check('力量药建2力不补旧挡', (powers(p(316230)), p(316230)['block']), ({'STRENGTH_POWER':2},5))
check('二力打击8伤及胆小7挡', (enemy(316230,3)['current_hp']-enemy(316231,3)['current_hp'],enemy(316231,3)['block']), (8,7))
check('二力中和5只抵挡不扣血', (enemy(316231,3)['current_hp'],enemy(316232,3)['current_hp'],enemy(316232,3)['block']), (11,11,2))
check('匕首雨三无挡目标各12', [enemy(316232,i)['current_hp']-enemy(316233,i)['current_hp'] for i in range(3)], [12]*3)
check('第四目标挡2抵12后实扣10', (enemy(316233,3)['current_hp'],enemy(316233,3)['block']), (1,0))
check('换战力量不继承', powers(p(316250)).get('STRENGTH_POWER',0), 0)
check('本局敏捷未建立', max(powers(s['combat']['player']).get('DEXTERITY_POWER',0) for s in S.values() if s.get('combat')), 0)
actual=list(map(json.loads, (O/'SDY5T9XCSQN2/states.jsonl').open()))
prior=[{k:v for k,v in x.items() if not k.startswith('_')} for x in map(json.loads,(O/'pm-states.jsonl').open())]
check('新抽帧与复盘原件全等', actual == prior, True)
T=json.load(open(O/'pm-turns.json'))
last=[t for t in T if t['sequence']==13]
steam=[dict(t['start']['enemies'][0]['powers']).get('STEAM_ERUPTION_POWER') for t in last if t['turn']>=2]
check('末试蒸汽T2至15每轮加3', steam, list(range(20,60,3)))
replies=[]
poison=0
for t in last:
    en=t['end']['enemies'][0]
    dose=dict(en['powers']).get('POISON_POWER',0)
    poison+=min(en['hp'],dose)
    if t['next'] and en['move']=='SIPHON_MOVE':
        replies.append(t['next']['enemies'][0]['hp']-en['hp']+dose)
check('相邻帧核三次回复15', replies, [15,15,15])
check('末试实际毒结算75',poison,75)
check('末试T14实结毒及回复', (last[-2]['start']['enemies'][0]['hp'],last[-2]['end']['enemies'][0]['hp'],dict(last[-2]['start']['enemies'][0]['powers'])['POISON_POWER'],dict(last[-2]['end']['enemies'][0]['powers'])['POISON_POWER'],last[-1]['start']['enemies'][0]['hp']), (38,26,2,5,36))
explosions=[]
for seq in [8,9,11,12]:
    t=next(t for t in T if t['sequence']==seq and t['turn']==16)
    explosions.append((t['start']['enemies'][0]['intents'][0]['total_damage'],t['end']['enemies'][0]['intents'][0]['total_damage'],t['end']['hp'],t['end']['block']))
check('四试59弱化44且零挡',explosions,[(59,44,8,0),(59,44,11,0),(59,44,11,0),(59,44,6,0)])
check('两药实饮无丢弃', (sum(x['chosen']['action']=='use_potion' for x in D),sum(x['chosen']['action']=='discard_potion' for x in D)),(2,0))
(O/'mechanism-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')

A=json.load(open(O/'audit.json'))
R={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))}
history=[]
for ident in ['STRENGTH_POTION']:
    rows=[x for x in A['potions'] if (x.get('potion') or {}).get('id')==ident]
    history.append(dict(topic=ident,drinks=len(rows),runs=len({x['run'] for x in rows}),strength_delta=dict(collections.Counter(x['after']['powers'].get('STRENGTH_POWER',0)-x['before']['powers'].get('STRENGTH_POWER',0) for x in rows)),cases=[{k:x[k] for k in ['run','floor','turn','ts','before','after']} for x in rows],limitation='共现饰品等来源另核；全局经验支持不等于全部药水参数验证分母，不拟时点。'))
rows=[x for x in A['cards'] if x['card']=='POISONED_STAB']
base=collections.Counter(v['base_value'] for x in rows for v in x['dynamic'] or [] if v['name']=='PoisonPower')
assert set(base)<={3,4}
history.append(dict(topic='POISONED_STAB',actions=len(rows),runs=len({x['run'] for x in rows}),base_poison=dict(base),limitation='基础与修饰值分账；制品/触媒/剩血/阶段另核。'))
giant=[x for x in A['fights'] if 'WATERFALL_GIANT' in x['enemies']]
history.append(dict(topic='WATERFALL_GIANT',fights=len(giant),by_asc=dict(collections.Counter(x['asc'] for x in giant)),cases=giant,limitation='同房SL一场，结束本体不等实际胜，判死截断非实死。'))
(O/'historical-formula-checks.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
previous=json.load(open(O.parent/'20261009-075800-experience-update/other-knowledge.json'))
old={x['file']:x for x in previous}
metadata=[]
for f in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
    if f.name=='experience.json':continue
    data=json.load(open(f));rel=str(f.relative_to(O.parents[2]));sha=hashlib.sha256(f.read_bytes()).hexdigest()
    metadata.append(dict(file=rel,sha256=sha,same_as_previous=sha==old.get(rel,{}).get('sha256'),keys=list(data)[:20],source=data.get('source'),generated=data.get('generated'),character=data.get('character'),assessment='生成统计/校准数据，需按文件切点、房/尝试/模型口径区别于本次净HP统计；无静默手写攻略。'))
(O/'other-knowledge.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print('本局机制核验',len(checks),'项通过；历史基础施毒',len(rows),'动作；其他知识',len(metadata),'份。')

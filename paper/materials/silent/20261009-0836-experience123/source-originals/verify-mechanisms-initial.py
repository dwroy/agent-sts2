import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
S = {x['_line']: x['state'] for x in map(json.loads, (O/'pm-states.jsonl').open())}
checks = []

def check(name, value, expected):
    assert value == expected, (name, value, expected)
    checks.append(dict(item=name, value=value))

def powers(p):
    return {x['power_id']: x['amount'] for x in p['powers']}

def player(n):
    return S[n]['combat']['player']

check('步法建立2敏且旧挡不补', (powers(player(316000)), player(316000)['block']), ({'DEXTERITY_POWER':2},0))
check('随后防御实加7', player(316001)['block'], 7)
check('第三轮三挡分别7/10/7', [player(n)['block'] for n in [316006,316007,316008,316010]], [0,7,17,24])
check('第三轮20攻覆盖且零损', (S[316010]['combat']['enemies'][0]['intents'][0]['total_damage'], S[316011]['run']['current_hp']), (20,38))
check('换战敏捷撤', powers(player(316019)), {})
check('末轮翻滚实挡和延后层', (player(316070)['block'],powers(player(316070))), (4,{'BLOCK_NEXT_TURN_POWER':4}))
check('防御后9挡不预支下轮4', player(316071)['block'], 9)
check('末轮6损至少7血才能活', (15-player(316071)['block'], S[316071]['run']['current_hp']), (6,4))
check('钙化与潮湿仪式分别2/6', [powers(e)['RITUAL_POWER'] for e in S[316058]['combat']['enemies']], [2,6])
check('下一轮分别2/6力', [powers(e)['STRENGTH_POWER'] for e in S[316063]['combat']['enemies']], [2,6])
check('潮湿同招3/9/15随力0/6/12', [(powers(S[n]['combat']['enemies'][-1]).get('STRENGTH_POWER',0),S[n]['combat']['enemies'][-1]['intents'][0]['total_damage']) for n in [316058,316063,316067]], [(0,3),(6,9),(12,15)])
check('刺击直伤6且加3毒', (S[316065]['combat']['enemies'][0]['current_hp']-S[316066]['combat']['enemies'][0]['current_hp'], powers(S[316066]['combat']['enemies'][0])['POISON_POWER']-powers(S[316065]['combat']['enemies'][0])['POISON_POWER']), (6,3))
check('7毒清6血钙化取消13攻', (S[316066]['combat']['enemies'][0]['current_hp'],powers(S[316066]['combat']['enemies'][0])['POISON_POWER'],S[316066]['combat']['enemies'][0]['intents'][0]['total_damage'],len(S[316067]['combat']['enemies']),S[316067]['run']['current_hp']), (6,7,13,1,4))
check('致命普通施5不扣本体', (powers(S[316059]['combat']['enemies'][1])['POISON_POWER']-powers(S[316058]['combat']['enemies'][1])['POISON_POWER'], S[316059]['combat']['enemies'][1]['current_hp']-S[316058]['combat']['enemies'][1]['current_hp']), (5,0))
check('固化已有5变15', [player(n)['block'] for n in [315967,315968]], [5,15])
check('护栏替线实0损9伤', (S[315956]['run']['current_hp'],S[315961]['run']['current_hp'],S[315956]['combat']['enemies'][0]['current_hp']-S[315961]['combat']['enemies'][0]['current_hp']), (38,38,9))
actual = list(map(json.loads,(O/'RZ6YAC7K89NM/states.jsonl').open()))
prior = [{k:v for k,v in x.items() if not k.startswith('_')} for x in map(json.loads,(O/'pm-states.jsonl').open())]
check('本次重新抽取与复盘原帧全等',actual==prior,True)
(O/'mechanism-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('本局机制与数字核验',len(checks),'项通过')

A = json.load(open(O/'audit.json'))
R = {x['run_id']:x for x in json.load(open(O/'run-metadata.json'))}
roll = []
for x in A['cards']:
    if x['card'] != 'DODGE_AND_ROLL':
        continue
    b,z = x['before'],x['after']
    amount = z['powers'].get('BLOCK_NEXT_TURN_POWER',0)-b['powers'].get('BLOCK_NEXT_TURN_POWER',0)
    block = z['block']-b['block']
    roll.append(dict(run=x['run'],asc=R[x['run']]['ascension'],floor=x['floor'],turn=x['turn'],ts=x['ts'],block_delta=block,next_power_delta=amount,player_powers=b['powers'],dynamic=x['dynamic'],text=x['text'],supported=amount>0 and block>=amount))
support = sorted({x['run'] for x in roll if x['supported']},key=lambda n:R[n]['ended'])
assert 'RZ6YAC7K89NM' in support
result=dict(actions=roll,evidence=support,contradicting=[],by_asc=dict(collections.Counter(R[n]['ascension'] for n in support)),limitation='只支持按实建层数分当轮/下轮的边界；零层/余像/重放/倍率另列，不推所有组合的基础公式或优先打法。出现但未核成功的窗口不算支持，也不当反例。')
(O/'delayed-block-history.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('闪躲翻滚实建延后挡支持',len(support),'局；实际动作',len(roll),'；分阶',result['by_asc'])

E=json.load(open(O/'experience-before.json'))
formulas=[]
for ident,allowed in [('DEADLY_POISON',{5,7}),('POISONED_STAB',{3,4})]:
    rows=[x for x in A['cards'] if x['card']==ident]
    counts=collections.Counter(v['base_value'] for x in rows for v in x['dynamic'] or [] if v['name']=='PoisonPower')
    assert set(counts)<=allowed,(ident,counts)
    formulas.append(dict(card=ident,actions=len(rows),base_poison=dict(counts)))
fort=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='FORTIFIER']
for x in fort:
    assert x['after']['block']==3*x['before']['block'],x
formulas.append(dict(potion='FORTIFIER',runs=len({x['run'] for x in fort}),drinks=len(fort),windows=fort))
(O/'historical-formula-checks.json').write_text(json.dumps(formulas,ensure_ascii=False,indent=2)+'\n')
print('历史施毒模板及固化窗口',[(x.get('card',x.get('potion')),x.get('actions',x.get('drinks'))) for x in formulas])

previous=json.load(open(O.parent/'20261009-073010-experience-update/other-knowledge.json'))
previous={x['file']:x for x in previous}
files=[]
for f in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
    if f.name=='experience.json':continue
    relative=str(f.relative_to(O.parents[2]));j=json.load(open(f));sha=hashlib.sha256(f.read_bytes()).hexdigest()
    files.append(dict(file=relative,sha256=sha,same_as_previous=sha==previous.get(relative,{}).get('sha256'),keys=list(j)[:12],source=j.get('source'),character=j.get('character'),generated=j.get('generated')))
(O/'other-knowledge.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print('其他静默知识',len(files),'份；与上一批相同',sum(x['same_as_previous'] for x in files))

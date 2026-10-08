import bisect, collections, hashlib, json
from pathlib import Path
O=Path(__file__).parent
N='SY0WMJNNVRLM'
S=[json.loads(l) for l in (O/N/'states.jsonl').open()]
D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()]
T=[s['ts'] for s in S]
checks=[]
def check(name, condition, data=None):
    assert condition, (name,data)
    checks.append(dict(name=name,data=data,passed=True))
def powers(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def pair(d):
    i=bisect.bisect_left(T,d['ts']);assert T[i]==d['ts']
    return S[i]['state'],S[i+1]['state']
def card(f,t,c,a=1):
    d=next(d for d in D if d['floor']==f and d['turn']==t and (d.get('sl_attempt') or 1)==a and (d.get('expect') or {}).get('card',{}).get('id')==c and str(d.get('result','')).startswith('completed'))
    return (*pair(d),d)
check('角色与日志计数',len(S)==722 and len(D)==636 and all(s['state']['run']['character_id'].lower()=='silent' for s in S),[len(S),len(D)])
for f in [30,31]:
    b,z,d=card(f,1,'FIGHT_ME');i=d['chosen']['target_index']
    check('升级与我一战先12伤后双向增力F'+str(f),d['expect']['card']['upgraded'] and b['combat']['enemies'][i]['current_hp']-z['combat']['enemies'][i]['current_hp']==12 and powers(z['combat']['player']).get('STRENGTH_POWER')==4 and powers(z['combat']['enemies'][i]).get('STRENGTH_POWER')==1)
for c,damage in [('SUCKER_PUNCH',12),('NEUTRALIZE',7)]:
    b,z,d=card(31,1,c);i=d['chosen']['target_index']
    check('4力后续兑现'+c,b['combat']['enemies'][i]['current_hp']-z['combat']['enemies'][i]['current_hp']==damage)
boss=[s for s in S if s['state']['run']['floor']==33 and s['state'].get('combat')]
check('六试boss无玩家力量也未打力量牌',all(powers(s['state']['combat']['player']).get('STRENGTH_POWER',0)==0 for s in boss) and not any(d['floor']==33 and (d.get('expect') or {}).get('card',{}).get('id')=='FIGHT_ME' for d in D))
ghost=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion' and (d.get('expect') or {}).get('potion',{}).get('id')=='GHOST_IN_A_JAR']
check('实际六饮幽灵均T4',len(ghost)==6 and all(d['turn']==4 for d in ghost))
for d in ghost:
    b,z=pair(d);a=d.get('sl_attempt') or 1
    check('幽灵无攻击轮建1试'+str(a),powers(z['combat']['player']).get('INTANGIBLE_POWER')==1 and b['combat']['enemies'][0]['move_id']=='SALIVATE_MOVE' and sum(i.get('total_damage') or 0 for i in b['combat']['enemies'][0]['intents'])==0)
    later=[s['state'] for s in S if s['ts']>d['ts'] and s['state'].get('turn')==5 and s['state'].get('combat') and s['state']['run']['floor']==33]
    t5=later[0]
    check('次轮无实体到期试'+str(a),not powers(t5['combat']['player']).get('INTANGIBLE_POWER'))
    end=next(x for x in D if x['ts']>d['ts'] and x['floor']==33 and x['turn']==5 and (x.get('sl_attempt') or 1)==a and (x.get('chosen') or {}).get('action')=='end_turn' and str(x.get('result','')).startswith('completed'))
    b,z=pair(end)
    check('T5零挡承24实损24试'+str(a),b['combat']['player']['block']==0 and sum(i.get('total_damage') or 0 for i in b['combat']['enemies'][0]['intents'])==24 and b['run']['current_hp']-z['run']['current_hp']==24)
b,z,d=card(33,4,'FOOTWORK',6);check('末试步法2敏',powers(z['combat']['player']).get('DEXTERITY_POWER')==2)
defs=[d for d in D if d['floor']==33 and d['turn']==6 and d.get('sl_attempt')==6 and (d.get('expect') or {}).get('card',{}).get('id')=='DEFEND_SILENT']
check('末试两防御各7',len(defs)==2 and all(pair(d)[1]['combat']['player']['block']-pair(d)[0]['combat']['player']['block']==7 for d in defs))
b,z,d=card(33,1,'ACCELERANT',6);check('触媒1与冰晶7分账',powers(z['combat']['player']).get('ACCELERANT_POWER')==1 and z['combat']['player']['block']-b['combat']['player']['block']==7)
b,z,d=card(33,1,'BACKFLIP',6);check('臂甲首后空翻升级16',z['combat']['player']['block']-b['combat']['player']['block']==16)
b,z,d=card(33,4,'FOOTWORK',6);check('第二能力不重给冰晶7',z['combat']['player']['block']==b['combat']['player']['block'])
b,z,d=card(33,5,'SNAKEBITE',1);check('爆发蛇咬实14毒',powers(z['combat']['enemies'][0]).get('POISON_POWER')==14)
b,z,d=card(33,5,'SNAKEBITE',6);check('单蛇咬7毒',powers(z['combat']['enemies'][0]).get('POISON_POWER')==7)
end=next(d for d in D if d['floor']==33 and d['turn']==5 and d.get('sl_attempt')==6 and (d.get('chosen') or {}).get('action')=='end_turn')
b,z=pair(end);check('7加6毒与6荆棘分账',b['combat']['enemies'][0]['current_hp']-z['combat']['enemies'][0]['current_hp']==19 and powers(z['combat']['enemies'][0]).get('POISON_POWER')==5)
last=S[-1]['state'];check('末轮攻击死而非沙坑归零',last['run']['current_hp']==0 and last['combat']['enemies'][0]['current_hp']==179 and powers(last['combat']['enemies'][0]).get('SANDPIT_POWER')==2)
end=next(d for d in D if d['floor']==33 and d['turn']==9 and (d.get('chosen') or {}).get('action')=='end_turn')
b,z=pair(end);check('末轮11血7挡对30完整损23至少差13',b['run']['current_hp']==11 and b['combat']['player']['block']==7 and sum(i.get('total_damage') or 0 for i in b['combat']['enemies'][0]['intents'])==30)
reward=next(s['state'] for s in S if s['state']['run']['floor']==31 and s['state']['screen']=='REWARD')
check('按勘误F31出口三段归零',all(e['current_hp']==0 and not e['is_alive'] for e in reward['combat']['enemies']))
check('实际Codex37请求无DS',sum(1 for l in (O/N/'brain.jsonl').open())==37 and all(json.loads(l)['engine']=='codex' for l in (O/N/'brain.jsonl').open()) and (O/N/'deepseek-reasoning.jsonl').stat().st_size==0)
A=json.load((O/'audit.json').open()); F=[x for x in A['fights'] if x['run']==N]
check('13独立房与12胜房净损171',len(F)==13 and sum(x['loss'] for x in F if not x['death'])==171 and F[-1]['loss']==70,[len(F),sum(x['loss'] for x in F if not x['death'])])
check('正路径守恒',56+154+44-7-6-171==70)
sl=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
check('异螨三试一赢/沙虫六试零赢',[(x['attempt'],x['result']) for x in sl if x['floor']==21]==[(1,'predicted_death'),(2,'predicted_death'),(3,'won')] and [(x['attempt'],x['result']) for x in sl if x['floor']==33]==[(1,'predicted_death'),(2,'predicted_death'),(3,'predicted_death'),(4,'predicted_death'),(5,'predicted_death'),(6,'died')])
other=[]
for p in sorted(Path('knowledge/characters/silent').iterdir()):
    if p.is_file() and p.name!='experience.json':
        x=json.load(p.open());other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),limitation=x.get('limitation'),meta=x.get('meta'),generated=x.get('generated')))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('独立实帧核验通过',len(checks),'项')

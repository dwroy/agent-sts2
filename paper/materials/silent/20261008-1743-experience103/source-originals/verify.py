import bisect
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load((O / 'audit.json').open())
checks = []
def check(name, condition, data=None):
    assert condition, (name, data)
    checks.append(dict(name=name, data=data, passed=True))
def powers(e):
    return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def record(n):
    s=[json.loads(l) for l in (O/n/'states.jsonl').open()]
    d=[json.loads(l) for l in (O/n/'decisions.jsonl').open()]
    return s,d
def card(d):
    return (d.get('expect',{}).get('card') or {}).get('id')
def action(ss,ds,f,t,c,attempt=1):
    d=next(x for x in ds if x['floor']==f and x['turn']==t and card(x)==c and (x.get('sl_attempt') or 1)==attempt and str(x.get('result')).startswith('completed'))
    i=bisect.bisect_left([s['ts'] for s in ss],d['ts'])
    assert ss[i]['ts']==d['ts']
    return ss[i]['state'],ss[i+1]['state'],d
def first(ss,f,t,attempt_start=0):
    return next(x['state'] for x in ss[attempt_start:] if x['state']['run']['floor']==f and x['state'].get('turn')==t and x['state'].get('combat'))
B,BD=record('BJLTVSYXCSGS');Y,YD=record('Y5H4CFAQ2WTG')
check('两局角色/状态/决策计数',len(B)==628 and len(BD)==594 and len(Y)==517 and len(YD)==496 and all(s['state']['run']['character_id'].lower()=='silent' for s in B+Y),[len(B),len(BD),len(Y),len(YD)])
bf=[x for x in A['fights'] if x['run']=='BJLTVSYXCSGS'];yf=[x for x in A['fights'] if x['run']=='Y5H4CFAQ2WTG']
check('BJL18房17赢净损229末死12',len(bf)==18 and sum(x['loss'] for x in bf if not x['death'])==229 and bf[-1]['loss']==12)
check('Y5十五房14赢净损162末死59',len(yf)==15 and sum(x['loss'] for x in yf if not x['death'])==162 and yf[-1]['loss']==59)
check('正路径HP守恒与SL不叠加',56+111+104+7-229-37==12 and 56+84+25+15+41-162==59)
b,z,d=action(B,BD,39,1,'FOOTWORK');check('步法实建2敏不倒补挡',powers(z['combat']['player']).get('DEXTERITY_POWER')==2 and z['combat']['player']['block']==0)
b,z,d=action(B,BD,39,1,'DEFEND_SILENT');check('复制防御+两次各10共20',z['combat']['player']['block']-b['combat']['player']['block']==20 and powers(b['combat']['player']).get('DUPLICATION_POWER')==1)
b,z,d=action(B,BD,42,2,'MIRAGE',3);check('末试蜃景6毒+1敏给7挡',sum(powers(e).get('POISON_POWER',0) for e in b['combat']['enemies'])==6 and z['combat']['player']['block']-b['combat']['player']['block']==7)
b,z,d=action(B,BD,42,2,'EXPOSE',3);be=b['combat']['enemies'][0];ze=z['combat']['enemies'][0];check('暴露清8挡施2易伤HP不变',be['block']==8 and ze['block']==0 and be['current_hp']==ze['current_hp']==50 and powers(ze).get('VULNERABLE_POWER')==2)
b,z,d=action(B,BD,42,3,'DEFEND_SILENT',3);check('末试脆弱防御4挡',powers(b['combat']['player']).get('FRAIL_POWER')==1 and z['combat']['player']['block']==4)
for att in [1,2]:
    b,z,d=action(B,BD,42,2,'ACCELERANT',att);check('触媒+实建2层试'+str(att),powers(z['combat']['player']).get('ACCELERANT_POWER')==2)
check('末次无触媒',not any(card(d)=='ACCELERANT' and d['floor']==42 and d.get('sl_attempt')==3 and str(d.get('result')).startswith('completed') for d in BD))
s=first(B,17,7);check('族母吸取后负力敏/毒雾6',powers(s['combat']['player']).get('STRENGTH_POWER')==-2 and powers(s['combat']['player']).get('DEXTERITY_POWER')==-2 and powers(s['combat']['player']).get('NOXIOUS_FUMES_POWER')==6)
s=first(B,17,10);check('族母末轮40血51毒',s['combat']['enemies'][0]['current_hp']==40 and powers(s['combat']['enemies'][0]).get('POISON_POWER')==51)
for n,ss,ds in [('BJLTVSYXCSGS',B,BD),('Y5H4CFAQ2WTG',Y,YD)]:
    pd=[d for d in ds if (d.get('chosen') or {}).get('action')=='use_potion']
    check(n+'实际用药计数',len(pd)==(11 if n.startswith('BJL') else 8),len(pd))
    for d in pd:
        if (d.get('expect',{}).get('potion') or {}).get('id')=='DEXTERITY_POTION':
            i=bisect.bisect_left([s['ts'] for s in ss],d['ts']);b,z=ss[i]['state'],ss[i+1]['state']
            check(n+'药敏+2且已有挡不补',powers(z['combat']['player']).get('DEXTERITY_POWER',0)-powers(b['combat']['player']).get('DEXTERITY_POWER',0)==2 and b['combat']['player']['block']==z['combat']['player']['block'])
b,z,d=action(Y,YD,31,3,'MIRAGE');check('脆弱蜃景6挡',z['combat']['player']['block']==6)
b,z,d=action(Y,YD,31,3,'DEFEND_SILENT');check('脆弱防御5合11挡',b['combat']['player']['block']==6 and z['combat']['player']['block']==11)
b,z,d=action(Y,YD,33,5,'PIERCING_WAIL');check('尖啸敌力3到负3',powers(b['combat']['enemies'][0]).get('STRENGTH_POWER')==3 and powers(z['combat']['enemies'][0]).get('STRENGTH_POWER')==-3)
s=first(Y,33,6);check('下一轮尖啸恢复力3',powers(s['combat']['enemies'][0]).get('STRENGTH_POWER')==3)
for turn,force,total in [(5,3,24),(9,6,30)]:
    s=first(Y,33,turn);e=s['combat']['enemies'][0];check('沙虫力量双击T'+str(turn),powers(e).get('STRENGTH_POWER')==force and e['intents'][0]['total_damage']==total)
b,z,d=action(Y,YD,33,10,'FRANTIC_ESCAPE');check('逃离沙坑1加至2',powers(b['combat']['enemies'][0]).get('SANDPIT_POWER')==1 and powers(z['combat']['enemies'][0]).get('SANDPIT_POWER')==2)
b,z,d=action(Y,YD,33,10,'MIRAGE');check('末轮23毒给23挡共28仍差血',powers(b['combat']['enemies'][0]).get('POISON_POWER')==23 and z['combat']['player']['block']==28 and z['run']['current_hp']==1)
last=Y[-1]['state'];check('末战实际攻击死/沙坑仍1/敌剩71',last['run']['current_hp']==0 and powers(last['combat']['enemies'][0]).get('SANDPIT_POWER')==1 and last['combat']['enemies'][0]['current_hp']==71)
sl=[x for x in A['attempts'] if x['run']=='BJLTVSYXCSGS' and x['floor']==42];check('三试零赢首两判死非实死',len(sl)==3 and [x['result'] for x in sl]==['predicted_death','predicted_death','died'])
check('Y5无实际重打',all(x['attempt']==1 for x in A['attempts'] if x['run']=='Y5H4CFAQ2WTG'))
for n in ['BJLTVSYXCSGS','Y5H4CFAQ2WTG']:
    check(n+'实际脑Codex无DS推理',all(json.loads(l).get('engine')=='codex' for l in (O/n/'brain.jsonl').open()) and (O/n/'deepseek-reasoning.jsonl').stat().st_size==0)
other=[]
for p in sorted(Path('knowledge/characters/silent').iterdir()):
    if p.is_file() and p.name!='experience.json':
        x=json.load(p.open());other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),limitation=x.get('limitation'),note=x.get('note'),meta=x.get('meta'),generated=x.get('generated')))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('独立实帧核验通过',len(checks),'项')

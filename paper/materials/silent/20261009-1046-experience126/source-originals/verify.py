import collections
import hashlib
import json
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
N='NTMAU4XZ2NN2'
PM=ROOT/'learner/runs/20261009-094302-postmortem'
checks=[]
def check(name, condition):
    assert condition, name
    checks.append(name)

for stem in ['states','decisions','run-plans']:
    rows=json.load(open(PM/f'{N}-{stem}.json'))
    with (ROOT/'logs'/f'{stem}.jsonl').open('rb') as h:
        for row in rows:
            h.seek(row['_offset'])
            check(f'{stem}:{row["_line"]}原字节',json.loads(h.readline())=={k:v for k,v in row.items() if k not in ['_offset','_line']})
    if stem in ['states','decisions']:
        extracted=[json.loads(s) for s in (O/N/f'{stem}.jsonl').open()]
        check(stem+'本批时间窗全等',extracted==[{k:v for k,v in row.items() if k not in ['_offset','_line']} for row in rows])

A=json.load(open(O/'audit.json'))
new=[x for x in A['fights'] if x['run']==N]
check('六场首末HP',[(x['floor'],x['hp'],x['last_hp'],x['type'],x['death']) for x in new]==[(2,56,51,'Monster',False),(4,51,43,'Monster',False),(8,43,41,'Monster',False),(11,62,45,'Unknown',False),(13,66,43,'Monster',False),(14,43,0,'Elite',True)])
rests=[x for x in A['rests'] if x['run']==N]
check('两火实回42',[(x['floor'],x['before'],x['after']) for x in rests]==[(9,41,62),(12,45,66)])
check('HP总账',56+42-sum(x['loss'] for x in new)==0)
cards=[x for x in A['cards'] if x['run']==N]
stab=next(x for x in cards if x['floor']==8 and x['turn']==4 and x['card']=='POISONED_STAB')
check('刺击9到3加3毒',stab['before']['enemies'][0]['hp']==9 and stab['after']['enemies'][0]['hp']==3 and stab['after']['enemies'][0]['powers']['POISON_POWER']-stab['before']['enemies'][0]['powers'].get('POISON_POWER',0)==3)
ring=next(x for x in cards if x['floor']==11 and x['turn']==4 and x['card']=='TORIC_TOUGHNESS')
check('附魔环实7建2次',ring['after']['block']-ring['before']['block']==7 and ring['after']['powers']['TORIC_TOUGHNESS_POWER']==2)
ends=[x for x in A['ends'] if x['run']==N]
for t in [5,6]:
    e=next(x for x in ends if x['floor']==11 and x['turn']==t-1)
    check(f'环后T{t}轮初7挡',e['after']['block']==7)
ss=json.load(open(PM/f'{N}-states.json'))
S={x['_line']:x['state'] for x in ss}
ds=json.load(open(PM/f'{N}-decisions.json'))
D={x['_line']:x for x in ds}
check('末轮8血5挡三感染',S[318295]['run']['current_hp']==8 and S[318295]['combat']['player']['block']==5 and sum(c['card_id']=='INFECTION' for c in S[318295]['combat']['hand'])==3)
check('末敌22及4',[(e['current_hp'],e['max_hp']) for e in S[318296]['combat']['enemies']]==[(22,22),(4,19)])
check('代码负7为剩HP', '(-7)' in D[310049]['rationale'] and 8-(9+11-5)==-7)
check('一护栏12改2',sum('HP guard' in x['rationale'] for x in ds)==1 and 'hp -12' in D[310016]['rationale'] and 'hp -2' in D[310016]['rationale'])
potions=[x for x in A['potions'] if x['run']==N]
check('两瓶实际饮用',[(x['floor'],x['turn'],x['potion']['id']) for x in potions]==[(4,1,'STRENGTH_POTION'),(8,2,'WEAK_POTION')])
check('力量药建2力',potions[0]['after']['powers']['STRENGTH_POWER']==2 and potions[0]['after']['hp']==potions[0]['before']['hp'])
strikes=[x for x in cards if x['floor']==4 and x['turn']==2 and x['card']=='STRIKE_SILENT']
check('两次打击各8',len(strikes)==2 and all(x['before']['enemies'][0]['hp']-x['after']['enemies'][0]['hp']==8 for x in strikes))
opening={}
for x in ss:
    s=x['state']; combat=s.get('combat') or {}
    if s['run']['floor']==14 and combat.get('action_readiness',{}).get('can_use_combat_actions'):
        opening.setdefault(s['turn'],s)
power=lambda p:{x['power_id']:x['amount'] for x in p.get('powers',[])}
check('覆甲轮初4到0', [power(opening[t]['combat']['player']).get('PLATING_POWER',0) for t in range(1,6)]==[4,3,2,1,0])
check('末战没有玩家力量敏捷',[power(s['combat']['player']).get('STRENGTH_POWER',0) for s in opening.values()]==[0]*10 and [power(s['combat']['player']).get('DEXTERITY_POWER',0) for s in opening.values()]==[0]*10)
e2=next(x for x in ends if x['floor']==14 and x['turn']==2)
e4=next(x for x in ends if x['floor']==14 and x['turn']==4)
check('覆甲T2挡15加3对20损2',e2['before']['block']==15 and e2['before']['powers']['PLATING_POWER']==3 and sum(i.get('total_damage') or 0 for i in e2['before']['enemies'][0]['intents'])==20 and e2['before']['hp']-e2['after']['hp']==2)
check('覆甲T4挡8加1对12损3',e4['before']['block']==8 and e4['before']['powers']['PLATING_POWER']==1 and sum(i.get('total_damage') or 0 for i in e4['before']['enemies'][0]['intents'])==12 and e4['before']['hp']-e4['after']['hp']==3)
f8end=next(x for x in ends if x['floor']==8 and x['turn']==4)
check('F8实毒杀取消4攻',f8end['before']['enemies'][0]['hp']==3 and f8end['before']['enemies'][0]['powers']['POISON_POWER']==3 and f8end['before']['enemies'][0]['intents'][0]['total_damage']==4 and not f8end['after']['enemies'] and f8end['after']['hp']==41)
bites={(e['powers'].get('STRENGTH_POWER',0),i['total_damage']) for x in ends if x['floor']==14 for e in x['before']['enemies'] if e['id']=='WRIGGLER' and e['move']=='NASTY_BITE_MOVE' for i in e['intents'] if i.get('total_damage') is not None}
check('扭动虫同招力量0/2/4对应7/9/11',bites=={(0,7),(2,9),(4,11)})
for t,count in [(9,2),(10,3)]:
    end=next(x for x in ends if x['floor']==14 and x['turn']==t)
    state=next(x['state'] for x in ss if x['ts']==end['ts'])
    check(f'T{t}留感染{count}张',sum(c['card_id']=='INFECTION' for c in state['combat']['hand'])==count)
check('T9毒药施5不即时伤',any(x['floor']==14 and x['turn']==9 and x['card']=='DEADLY_POISON' and x['before']['enemies'][2]['hp']==x['after']['enemies'][2]['hp']==19 and x['after']['enemies'][2]['powers']['POISON_POWER']==5 for x in cards))
check('无能力实打',not any(x['card'] in ['FOOTWORK','NOXIOUS_FUMES','AFTERIMAGE','ACCELERANT'] for x in cards))
check('无SL',not (O/N/'sl-attempts.jsonl').read_text())
check('无DS推理',not (O/N/'deepseek-reasoning.jsonl').read_text())
check('13次Codex',len([x for x in ds if x.get('deepseek') and not x['deepseek'].get('reused')])==13 and all(x['deepseek']['brain']['engine']=='codex' for x in ds if x.get('deepseek') and not x['deepseek'].get('reused')))

C=json.load(open(O/'changes.json'))
metadata={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))}
history=[]
for c in C:
    e=c['after']
    check(e['id']+'证据去重',e['n_support']==len(set(e['evidence'])))
    check(e['id']+'角色隔离',all(metadata[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[])))
    for r in e['evidence']:
        check(e['id']+':'+r+'状态角色',json.loads((O/r/'states.jsonl').open().readline())['state']['run']['character_id'].lower()=='silent')
    prefix,item=e['scope'].split(':',1)
    cases=[x for x in A['cards'] if x['run'] in e['evidence'] and x['card']==item] if prefix=='card' else [x for x in A['fights'] if x['run'] in e['evidence']]
    if item=='TORIC_TOUGHNESS':check('环8局32实打',len(cases)==32 and len({x['run'] for x in cases})==8)
    history.append({'entry':e['id'],'support':e['n_support'],'contradict':e['n_contradict'],'evidence':e['evidence'],'contradicting':e.get('contradicting',[]),'asc':dict(collections.Counter(metadata[r]['ascension'] for r in e['evidence'])),'actions_or_rooms':len(cases),'parameter_runs':len({x['run'] for x in cases}),'parameter_cases':cases if prefix=='card' else []})
(O/'mechanism-evidence.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps({'checks':len(checks),'passed':checks},ensure_ascii=False,indent=2)+'\n')
print('通过',len(checks),'项原字节/数据/历史机制验证')

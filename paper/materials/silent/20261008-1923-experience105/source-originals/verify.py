import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
N = '4XLZURXMD872'
S = [json.loads(l) for l in (O/N/'states.jsonl').open()]
D = [json.loads(l) for l in (O/N/'decisions.jsonl').open()]
T = [s['ts'] for s in S]
checks = []
def check(name, condition, data=None):
    assert condition, (name, data)
    checks.append(dict(name=name, data=data, passed=True))
def powers(e):
    return {p['power_id']:p['amount'] for p in e.get('powers', [])}
def pair(d):
    i=bisect.bisect_left(T,d['ts'])
    assert T[i]==d['ts']
    return S[i]['state'],S[i+1]['state']
def card(f,t,c,a=1):
    d=next(d for d in D if d['floor']==f and d['turn']==t and (d.get('sl_attempt') or 1)==a and (d.get('expect') or {}).get('card',{}).get('id')==c and str(d.get('result','')).startswith('completed'))
    return (*pair(d),d)
def end(f,t,a=1):
    d=next(d for d in D if d['floor']==f and d['turn']==t and (d.get('sl_attempt') or 1)==a and (d.get('chosen') or {}).get('action')=='end_turn')
    return (*pair(d),d)
check('角色/原始计数',len(S)==610 and len(D)==591 and all(s['state']['run']['character_id'].lower()=='silent' for s in S),[len(S),len(D)])
raw=[]
for line in Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-181302-postmortem/states-lines.jsonl').open():
    x=json.loads(line.split(':',1)[1]);x.pop('_line',None);x.pop('_offset',None);raw.append(x)
check('与复盘原帧逐帧一致',raw==S)
b,z,d=card(17,3,'NOXIOUS_FUMES')
check('毒雾建立3不立即补毒',powers(z['combat']['player']).get('NOXIOUS_FUMES_POWER')==3 and powers(b['combat']['enemies'][0])['POISON_POWER']==powers(z['combat']['enemies'][0])['POISON_POWER']==12)
b,z,d=card(17,6,'ECHOING_SLASH')
check('吸取后负2力量及负2敏捷',powers(b['combat']['player']).get('STRENGTH_POWER')==-2 and powers(b['combat']['player']).get('DEXTERITY_POWER')==-2 and b['combat']['enemies'][0]['current_hp']-z['combat']['enemies'][0]['current_hp']==8)
b,z,d=card(17,7,'BACKFLIP')
check('负2敏捷后空翻5到3挡',z['combat']['player']['block']-b['combat']['player']['block']==3)
b,z,d=card(17,7,'PIERCING_WAIL')
check('尖啸2到负4力/双击24到12',powers(b['combat']['enemies'][0])['STRENGTH_POWER']==2 and powers(z['combat']['enemies'][0])['STRENGTH_POWER']==-4 and b['combat']['enemies'][0]['intents'][0]['total_damage']==24 and z['combat']['enemies'][0]['intents'][0]['total_damage']==12)
b,z,d=end(17,7)
check('尖啸当轮实际损9且次轮力恢复2',b['combat']['player']['block']==3 and b['run']['current_hp']-z['run']['current_hp']==9 and powers(z['combat']['enemies'][0])['STRENGTH_POWER']==2)
b,z,d=card(17,6,'BUBBLE_BUBBLE')
check('爆发两次冒泡18到36毒不即时伤',powers(b['combat']['enemies'][0])['POISON_POWER']==18 and powers(z['combat']['enemies'][0])['POISON_POWER']==36 and b['combat']['enemies'][0]['current_hp']==z['combat']['enemies'][0]['current_hp']==129)
b,z,d=end(17,6)
check('36毒实际结算并减1',b['combat']['enemies'][0]['current_hp']==129 and z['combat']['enemies'][0]['current_hp']==93 and powers(z['combat']['enemies'][0])['POISON_POWER']==38)
for a in [1,2]:
    b,z,d=card(31,2,'PIERCING_WAIL',a)
    check('蟾蜍爆发尖啸25到13试'+str(a),powers(z['combat']['enemies'][0])['STRENGTH_POWER']==-12 and z['combat']['enemies'][0]['intents'][0]['total_damage']==13)
b,z,d=card(31,2,'CALCULATED_GAMBLE',2)
check('换手三抽速行者2额外6伤',powers(b['combat']['player']).get('SPEEDSTER_POWER')==2 and len(z['combat']['hand'])==3 and b['combat']['enemies'][0]['current_hp']==103 and z['combat']['enemies'][0]['current_hp']==97)
for a,loss in [(1,13),(2,2)]:
    b,z,d=end(31,2,a)
    check('T2实际损血试'+str(a),b['run']['current_hp']-z['run']['current_hp']==loss)
b,z,d=card(31,5,'ULTIMATE_DEFEND',2)
check('爆发究极防御两次11合22挡',b['combat']['player']['block']==0 and z['combat']['player']['block']==22)
b,z,d=end(30,5)
check('留1毒素先损5再敌退场',b['run']['current_hp']==20 and b['combat']['player']['block']==0 and sum(c['card_id']=='TOXIC' for c in b['combat']['hand'])==1 and z['run']['current_hp']==15 and not z['in_combat'])
boss=[s['state'] for s in S if s['state']['run']['floor']==33 and s['state'].get('combat')]
check('六试未建毒雾/谋划专家/速行者',all(not any(k in powers(s['combat']['player']) for k in ['NOXIOUS_FUMES_POWER','MASTER_PLANNER_POWER','SPEEDSTER_POWER']) for s in boss))
b,z,d=card(33,3,'FRANTIC_ESCAPE',6)
check('末试逃离沙坑3到4但挡仍0',powers(b['combat']['enemies'][0])['SANDPIT_POWER']==3 and powers(z['combat']['enemies'][0])['SANDPIT_POWER']==4 and z['combat']['player']['block']==0)
b,z,d=end(33,3,6)
check('末试毒15实际扣15后死/沙坑尚3',b['run']['current_hp']==23 and b['combat']['player']['block']==0 and b['combat']['enemies'][0]['intents'][0]['total_damage']==31 and z['run']['current_hp']==0 and z['combat']['enemies'][0]['current_hp']==275 and b['combat']['enemies'][0]['current_hp']==290 and powers(z['combat']['enemies'][0])['SANDPIT_POWER']==3)
check('末试整战扣66/需341尚缺275',341-275==41+0+25)
P=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion']
check('实际饮药15/毒药7/弃药0',len(P)==15 and sum((d.get('expect') or {}).get('potion',{}).get('id')=='POISON_POTION' for d in P)==7 and not any((d.get('chosen') or {}).get('action')=='discard_potion' for d in D))
for d in P:
    if d['expect']['potion']['id']=='POISON_POTION':
        b,z=pair(d);i=d['chosen']['target_index']
        check('毒药实际+6且不即时扣血'+d['ts'],powers(z['combat']['enemies'][i]).get('POISON_POWER',0)-powers(b['combat']['enemies'][i]).get('POISON_POWER',0)==6 and b['combat']['enemies'][i]['current_hp']==z['combat']['enemies'][i]['current_hp'])
sl=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
check('蟾蜍两试1胜/沙虫六试0胜',[(x['attempt'],x['result']) for x in sl if x['floor']==31]==[(1,'predicted_death'),(2,'won')] and [(x['attempt'],x['result']) for x in sl if x['floor']==33]==[(1,'predicted_death'),(2,'predicted_death'),(3,'predicted_death'),(4,'predicted_death'),(5,'predicted_death'),(6,'died')])
b1,z1,d1=card(31,2,'BURST',1);b2,z2,d2=card(31,2,'BURST',2)
check('蟾蜍T2同原手牌/能量/意图但敌血不同',b1['combat']['hand']==b2['combat']['hand'] and b1['combat']['player']['energy']==b2['combat']['player']['energy'] and b1['combat']['enemies'][0]['intents']==b2['combat']['enemies'][0]['intents'] and b1['combat']['enemies'][0]['current_hp']==111 and b2['combat']['enemies'][0]['current_hp']==103)
A=json.load((O/'audit.json').open());F=[x for x in A['fights'] if x['run']==N]
check('16独立战房/15胜战净损212',len(F)==16 and sum(x['loss'] for x in F if not x['death'])==212,[len(F),sum(x['loss'] for x in F if not x['death'])])
check('正路径血量守恒',56+147+39-7-212==23)
check('末营火前三赢净损55',sum(x['loss'] for x in F if x['floor'] in [29,30,31])==55)
B=[json.loads(x) for x in (O/N/'brain.jsonl').open()]
check('实际33Codex请求/DS0',len(B)==33 and all(x['engine']=='codex' for x in B) and (O/N/'deepseek-reasoning.jsonl').stat().st_size==0)
other=[]
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name!='experience.json':
        x=json.load(p.open());other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),limitation=x.get('limitation'),meta=x.get('meta'),generated=x.get('generated')))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('独立实帧核验通过',len(checks),'项')

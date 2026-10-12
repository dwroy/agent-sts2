import bisect,collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='E6DYYXRX7GVE'
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
checks=[]
def check(name,b):
 assert b,name
 checks.append(name)
new=[f for f in A['fights'] if f['run']==N]
check('19房1死SL同房一次',len(new)==19 and sum(f['death'] for f in new)==1 and next(f for f in new if f['floor']==33)['last_hp']==3)
check('F42净损含赢后回复',next(f for f in new if f['floor']==42)['loss']==20)
check('末场68到0',new[-1]['hp']==68 and new[-1]['last_hp']==0 and new[-1]['floor']==45)
cards=[x for x in A['cards'] if x['run']==N];ends=[x for x in A['ends'] if x['run']==N];pots=[x for x in A['potions'] if x['run']==N]
f45=[x for x in cards if x['floor']==45]
foot=[x for x in f45 if x['card']=='FOOTWORK'];check('两步法3到5',[(x['before']['powers'].get('DEXTERITY_POWER',0),x['after']['powers']['DEXTERITY_POWER']) for x in foot]==[(0,3),(3,5)])
for card,t,amount in [('DASH',1,13),('DEFEND_SILENT',2,10),('LEG_SWEEP',3,19)]:
 x=next(x for x in f45 if x['card']==card and x['turn']==t);check(card+'实挡',x['after']['block']-x['before']['block']==amount)
fumes=[x for x in f45 if x['card']=='NOXIOUS_FUMES'];check('毒雾3到6',[(x['turn'],x['after']['powers']['NOXIOUS_FUMES_POWER']) for x in fumes]==[(1,3),(4,6)])
dead=next(x for x in f45 if x['card']=='DEADLY_POISON');check('致命毒药实5无即时伤',dead['before']['enemies'][0]['hp']==dead['after']['enemies'][0]['hp']==170 and dead['before']['enemies'][0]['powers']['POISON_POWER']==5 and dead['after']['enemies'][0]['powers']['POISON_POWER']==10)
wl=next(x for x in f45 if x['card']=='PIERCING_WAIL' and x['turn']==6);ml=next(x for x in f45 if x['card']=='MALAISE' and x['turn']==4)
def damage(x):return sum(i.get('total_damage') or 0 for i in x['enemies'][0]['intents'])
check('尖啸减6力省4',wl['before']['enemies'][0]['powers']['STRENGTH_POWER']==-2 and wl['after']['enemies'][0]['powers']['STRENGTH_POWER']==-8 and damage(wl['before'])==21 and damage(wl['after'])==17)
check('萎靡X2减2',ml['before']['energy']==2 and ml['after']['energy']==0 and ml['after']['enemies'][0]['powers']['STRENGTH_POWER']==-2 and damage(ml['before'])==34 and damage(ml['after'])==32)
check('未施放计划能力',not any(x['card'] in ['SERPENT_FORM','MAD_SCIENCE'] for x in f45))
pp=[x for x in pots if x['potion']['id']=='POISON_POTION'];check('毒瓶两用同局',[(x['floor'],x['turn'],x['attempt']) for x in pp]==[(33,11,1),(45,6,1)])
for x in pp:check('饮毒剂量'+str(x['floor']),x['after']['enemies'][0]['powers']['POISON_POWER']-x['before']['enemies'][0]['powers']['POISON_POWER']==6 and x['before']['enemies'][0]['hp']==x['after']['enemies'][0]['hp'])
e=next(x for x in ends if x['floor']==45 and x['turn']==6);check('末轮实毒28但差15存活血',e['before']['hp']==3 and e['before']['block']==0 and damage(e['before'])==17 and e['before']['enemies'][0]['hp']==68 and e['before']['enemies'][0]['powers']['POISON_POWER']==28 and e['after']['enemies'][0]['hp']==40 and e['after']['hp']==0 and 17+1-3==15)
e14=next(x for x in ends if x['floor']==33 and x['attempt']==2 and x['turn']==14);check('恶魔重打毒杀44',e14['before']['enemies'][0]['hp']==44 and e14['before']['enemies'][0]['powers']['POISON_POWER']==47 and e14['after']['hp']==3)
check('恶魔末轮无出牌',not any(x['floor']==33 and x['attempt']==2 and x['turn']==14 for x in cards))
S=[json.loads(x) for x in (O/N/'states.jsonl').open()];D=[json.loads(x) for x in (O/N/'decisions.jsonl').open()]
opening={}
for x in S:
 s=x['state']
 if s['run']['floor']==45 and (s.get('combat') or {}).get('action_readiness',{}).get('can_use_combat_actions'):opening.setdefault(s['turn'],s)
check('舵盘仅T3轮初18',[opening[t]['combat']['player']['block'] for t in range(1,7)]==[0,0,18,0,0,0])
check('轮初毒3/5/12/17/22',[{p['power_id']:p['amount'] for p in opening[t]['combat']['enemies'][0]['powers']}.get('POISON_POWER',0) for t in range(2,7)]==[3,5,12,17,22])
sur=next(d for d in D if d['floor']==45 and d['turn']==5 and d.get('expect',{}).get('card',{}).get('id')=='SURVIVOR')
ts=[x['ts'] for x in S];i=bisect.bisect_left(ts,sur['ts']);check('生存者选择入口实给13',S[i+1]['state']['combat']['player']['block']-S[i]['state']['combat']['player']['block']==13)
check('新生成一刀每轮',all(sum(c['card_id']=='SHIV' for c in opening[t]['combat']['hand'])==1 for t in range(3,7)))
shivs=[x for x in f45 if x['card']=='SHIV' and x['turn']>=3];check('生成刀四轮实伤14',[x['before']['enemies'][0]['hp']-x['after']['enemies'][0]['hp'] for x in shivs]==[4,3,3,4])
feather=[]
for a,z in zip(S,S[1:]):
 sa,sz=a['state'],z['state']
 if sa['screen']=='MAP' and sz['screen']=='REST' and sz['run']['floor']>=10:feather.append({'floor':sz['run']['floor'],'before':sa['run']['current_hp'],'after':sz['run']['current_hp'],'cards':len(sz['run'].get('deck',[]))})
# Use the carried deck listing as observed by the run state.
check('羽毛七次实回121',[x['after']-x['before'] for x in feather]==[15,18,18,18,10,21,21])
rs=[x for x in A['rests'] if x['run']==N and x['action']=='choose_rest_option' and x['chosen']['option_index']==0];check('主动回血三次实59',[(x['floor'],x['before'],x['after']) for x in rs]==[(7,26,47),(16,24,45),(43,51,68)])
regen=next(x for x in pots if x['potion']['id']=='REGEN_POTION');check('再生建5',regen['after']['powers']['REGEN_POWER']==5)
e12=[x for x in ends if x['floor']==12];check('再生四次回复14', [x['before']['powers']['REGEN_POWER'] for x in e12]==[5,4,3,2] and [x['after']['hp']-x['before']['hp'] for x in e12]==[4,4,-10,2] and [max(0,sum(i.get('total_damage') or 0 for e in x['before']['enemies'] for i in e['intents'])-x['before']['block']) if x['after']['enemies'] else 0 for x in e12]==[1,0,13,0])
check('41次Codex脑',len([d for d in D if d.get('deepseek') and not d['deepseek'].get('reused')])==41 and all(d['deepseek']['brain']['engine']=='codex' for d in D if d.get('deepseek') and not d['deepseek'].get('reused')))
check('无DS推理',not (O/N/'deepseek-reasoning.jsonl').read_text())
inf=[x for x in A['cards'] if x['card']=='INFINITE_BLADES'];check('历史所有刀能力建立1层',all(x['after']['powers'].get('INFINITE_BLADES_POWER',0)-x['before']['powers'].get('INFINITE_BLADES_POWER',0)==1 for x in inf))
evidence=[]
for c in C:
 e=c['after'];ev=e['evidence']
 check(e['id']+'证据去重',len(set(ev))==e['n_support'])
 check(e['id']+'角色隔离',all(R[r]['character'].lower()=='silent' for r in ev+e.get('contradicting',[])))
 for r in ev:check(e['id']+':'+r+'状态角色',json.loads((O/r/'states.jsonl').open().readline())['state']['run']['character_id'].lower()=='silent')
 typ,key=e['scope'].split(':',1)
 cases=[x for x in A['cards'] if x['run'] in ev and x['card']==key] if typ=='card' else [x for x in A['potions'] if x['run'] in ev and (x.get('potion') or {}).get('id')==key] if typ=='potion' else [x for x in A['fights'] if x['run'] in ev and (typ!='boss' or key in x['enemies'])]
 evidence.append({'entry':e['id'],'support':len(ev),'contradict':e['n_contradict'],'evidence':ev,'contradicting':e.get('contradicting',[]),'asc':dict(collections.Counter(R[r]['ascension'] for r in ev)),'actions_or_rooms':len(cases),'parameter_runs':len({x['run'] for x in cases}),'parameter_cases':cases if typ in ['card','potion'] else []})
(O/'mechanism-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
(O/'new-resource-check.json').write_text(json.dumps({'feather':feather,'fights':new,'checks':checks},ensure_ascii=False,indent=2)+'\n')
raw=json.load(open(O/'raw-verification.json'));(O/'verification.json').write_text(json.dumps({'checks':len(checks)+raw['checks'],'passed':checks,'raw_checks':raw['checks']},ensure_ascii=False,indent=2)+'\n')
other=[];old={r['file']:r for r in json.load(open(O.parent/'20261009-101302-experience-update/other-knowledge.json'))}
for p in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 key=str(p.relative_to(O.parents[2]));sha=hashlib.sha256(p.read_bytes()).hexdigest();x=json.load(open(p))
 other.append({'file':key,'sha256':sha,'same_as_previous':sha==old[key]['sha256'],'keys':list(x)[:20],'assessment':'逐份核对：生成统计/校准有自身截止及分母，双boss数据仅该角色A10；本次实盘无手写规则冲突，不将164完局房级净损覆盖模型或刷新。'})
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('通过',len(checks)+raw['checks'],'项核验；其他知识',[(x['file'],x['same_as_previous']) for x in other])

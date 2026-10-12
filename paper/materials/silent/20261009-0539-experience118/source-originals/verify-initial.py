import bisect, collections, hashlib, json
from pathlib import Path

O=Path(__file__).parent
N='J8PHG72DGD90'
S=[json.loads(l) for l in (O/N/'states.jsonl').open()]
D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()]
B=[json.loads(l) for l in (O/N/'brain.jsonl').open()]
checks=[]
def check(name,value):
    assert value,name
    checks.append(name)
check('新局状态决策脑数量',(len(S),len(D),len(B))==(978,818,33))
by={i:x['state'] for i,x in enumerate(S,312182)}
def pw(s):return {x['power_id']:x['amount'] for x in s.get('powers',[])}
def ep(i):return by[i]['combat']['enemies'][0]
def pp(i):return by[i]['combat']['player']
def hp(i):return by[i]['run']['current_hp']
check('978帧角色局号',all(x['state']['run']['character_id'].lower()=='silent' and x['state']['run_id']==N for x in S))
check('末轮实死与残敌',hp(313158)==3 and pp(313158)['block']==7 and ep(313158)['intents'][0]['total_damage']==24 and hp(313159)==0 and ep(313159)['current_hp']==177)
check('T12相同起点',all(hp(i)==3 and ep(i)['current_hp']==207 and pw(ep(i))['POISON_POWER']==24 for i in [313074,313148]))
check('T12省2血少9伤',pp(313078)['block']==14 and pp(313152)['block']==20 and hp(313080)==1 and hp(313153)==3 and ep(313080)['current_hp']==204 and ep(313153)['current_hp']==213)
check('回血独立30帧',ep(313079)['current_hp']==174 and ep(313080)['current_hp']==204)
check('小刀未执行',len(by[313158]['combat']['hand'])==2 and all(c['card_id']=='SHIV' and not c['playable'] and c['unplayable_reason']=='blocked_by_hook' for c in by[313158]['combat']['hand']))
check('满额饮毒不占牌计数',pw(ep(313157))['POISON_POWER']==30 and pw(ep(313158))['POISON_POWER']==36 and ep(313157)['current_hp']==ep(313158)['current_hp']==213 and by[313157]['combat']['cards_played_this_turn']==by[313158]['combat']['cards_played_this_turn'])
check('步法实建2敏/冰晶7挡',pw(pp(313094)).get('DEXTERITY_POWER',0)==0 and pw(pp(313095))['DEXTERITY_POWER']==2 and pp(313095)['block']==7)
stamps=[x['ts'] for x in S];sm={x['ts']:x['state'] for x in S}
facts=[]
for d in D:
    if not d.get('chosen'):continue
    a=sm[d['ts']];z=S[min(bisect.bisect_right(stamps,d['ts']),len(S)-1)]['state']
    c=(d.get('expect') or {}).get('card') or {}
    if d['screen']=='REST' or c.get('id') in ['MALAISE','PIERCING_WAIL','PHANTOM_BLADES','FOOTWORK','HIDDEN_DAGGERS'] or d['chosen']['action']=='use_potion':
        facts.append(dict(floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],chosen=d['chosen'],expect=d.get('expect'),before=a,after=z))
def fact(card,turn):return next(f for f in facts if f['floor']==33 and f['attempt']==6 and f['turn']==turn and (f['expect'].get('card') or {}).get('id')==card)
f=fact('MALAISE',4);ae=f['before']['combat']['enemies'][0];ze=f['after']['combat']['enemies'][0]
check('萎靡X3力与弱',pw(ae).get('STRENGTH_POWER',0)==0 and pw(ze)['STRENGTH_POWER']==-3 and pw(ze)['WEAK_POWER']==3 and ae['intents'][0]['total_damage']==13 and ze['intents'][0]['total_damage']==7)
f=fact('PIERCING_WAIL',11);ae=f['before']['combat']['enemies'][0];ze=f['after']['combat']['enemies'][0]
check('尖啸三段减18',pw(ae)['STRENGTH_POWER']==3 and pw(ze)['STRENGTH_POWER']==-3 and ae['intents'][0]['total_damage']==36 and ze['intents'][0]['total_damage']==18)
f=fact('PHANTOM_BLADES',3)
check('幻影只建9',pw(f['after']['combat']['player'])['PHANTOM_BLADES_POWER']==9)
def candle(s):return next((r['stack'] for r in s['run']['relics'] if r['relic_id']=='PUMPKIN_CANDLE'),None)
f=next(f for f in facts if f['floor']==29 and (f['expect'].get('option') or {}).get('id')=='KINDLE')
check('新蜡烛1到6不回血',candle(f['before'])==1 and candle(f['after'])==6 and f['before']['run']['current_hp']==f['after']['run']['current_hp']==50)
P=O/'ZVYUL2YP3518';ss=[json.loads(l) for l in (P/'states.jsonl').open()];ts=[x['ts'] for x in ss];old=[]
for line in (P/'decisions.jsonl').open():
    d=json.loads(line)
    if d['screen']!='REST' or (d.get('expect',{}).get('option') or {}).get('id')!='KINDLE':continue
    i=bisect.bisect_right(ts,d['ts']);a=ss[max(0,i-1)]['state'];z=ss[min(i,len(ss)-1)]['state']
    old.append(dict(run='ZVYUL2YP3518',floor=d['floor'],ts=d['ts'],before=candle(a),after=candle(z),hp_before=a['run']['current_hp'],hp_after=z['run']['current_hp']))
check('旧蜡烛F42已1到6',any(f['floor']==42 and f['before']==1 and f['after']==6 and f['hp_before']==f['hp_after']==80 for f in old))
check('三回血各22',sum(1 for f in facts if (f['expect'].get('option') or {}).get('id')=='HEAL' and f['after']['run']['current_hp']-f['before']['run']['current_hp']==22)==3)
check('饮14弃0',sum(d['chosen'].get('action')=='use_potion' for d in D)==14 and not any(d['chosen'].get('action')=='discard_potion' for d in D))
other=[]
for path in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
    if path.name=='experience.json':continue
    j=json.load(open(path))
    other.append(dict(file=str(path.relative_to(O.parents[2])),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),fields=list(j),metadata={k:j[k] for k in ['meta','generated','generated_from','note','_about','source','split'] if k in j},classification='生成/校准/观察数据，依其切点与口径；无独立手写攻略，不把模型胜率当实战保证'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'new-state-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
(O/'candle-old-evidence.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
(O/'verified.json').write_text(json.dumps(dict(checks=checks,passed=len(checks)),ensure_ascii=False,indent=2)+'\n')
print('关键帧核验通过',len(checks),'，旧蜡烛证据',old)

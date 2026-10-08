import bisect, collections, hashlib, json
from pathlib import Path

O=Path(__file__).parent
N='KSX97DF5H3NY'
P=O/N
S=[json.loads(l) for l in (P/'states.jsonl').open()]
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
T=[s['ts'] for s in S]
SM={s['ts']:s['state'] for s in S}
checks=[]
def ok(name,value):
    assert value,name
    checks.append(name)
def power(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def pair(d):return SM[d['ts']],S[min(bisect.bisect_right(T,d['ts']),len(S)-1)]['state']
def action(f,t,card,attempt=1):
    return next(d for d in D if d['floor']==f and d['turn']==t and (d.get('sl_attempt') or 1)==attempt and (d.get('expect') or {}).get('card',{}).get('id')==card and (d.get('chosen') or {}).get('action')=='play_card')
ok('544状态517决策',len(S)==544 and len(D)==517)
ok('本角色局号',all(s['state']['run_id']==N and s['state']['run']['character_id'].lower()=='silent' for s in S))
ok('30次纯Codex脑',collections.Counter(json.loads(l)['engine'] for l in (P/'brain.jsonl').open())=={'codex':30})
ok('无DeepSeek同窗',(P/'deepseek-reasoning.jsonl').stat().st_size==0)
drinks=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion']
ok('九次实际饮药含两pending',len(drinks)==9 and sum(str(d['result']).startswith('pending') for d in drinks)==2)
for d in drinks:
    a,b=pair(d)
    slot=d['chosen']['option_index']
    pid=d['expect']['potion']['id']
    ok(f'F{d["floor"]}T{d["turn"]}槽{slot}饮{pid}',any(p['index']==slot and p.get('potion_id')==pid for p in a['run']['potions']) and not any(p['index']==slot and p.get('occupied') for p in b['run']['potions']))
rests=[]
for d in D:
    if d['screen']=='REST' and (d.get('chosen') or {}).get('action') in ['rest_heal','rest_smith','choose_rest_option']:
        a,b=pair(d)
        rests.append(dict(floor=d['floor'],option=(d.get('expect') or {}).get('option',{}).get('id'),gain=b['run']['current_hp']-a['run']['current_hp']))
ok('两次枕头回血各36',[r['gain'] for r in rests if r['option']=='HEAL']==[36,36])
ok('三锻造不回血',len(rests)==5 and all(r['gain']==0 for r in rests if r['option']!='HEAL'))
a,b=pair(action(30,1,'AFTERIMAGE'))
ok('余像建1自身不补',power(b['combat']['player'])['AFTERIMAGE_POWER']==1 and a['combat']['player']['block']==b['combat']['player']['block']==10)
a,b=pair(action(31,5,'AFTERIMAGE',4))
ok('末轮余像建前5挡建后仍5',a['combat']['player']['block']==b['combat']['player']['block']==5)
last=[x['state'] for x in S if x['state']['run']['floor']==31 and x['state']['screen']=='COMBAT'][-1]
ok('末轮1血13挡45攻击',last['run']['current_hp']==1 and last['combat']['player']['block']==13 and sum(i.get('total_damage') or 0 for e in last['combat']['enemies'] for i in e['intents'])==45)
ok('末轮覆甲0无敏',power(last['combat']['player']).get('PLATING_POWER',0)==0 and power(last['combat']['player']).get('DEXTERITY_POWER',0)==0)
for att in [2,3,4]:
    a,b=pair(action(31,3,'BOUNCING_FLASK',att))
    mom=lambda st:next(e for e in st['combat']['enemies'] if e['enemy_id']=='OVICOPTER')
    ok(f'第{att}试母体毒2→5血55不变',power(mom(a))['POISON_POWER']==2 and power(mom(b))['POISON_POWER']==5 and mom(a)['current_hp']==mom(b)['current_hp']==55)
    ok(f'第{att}试总毒11',sum(power(e).get('POISON_POWER',0) for e in b['combat']['enemies'])==11)
    a,b=pair(action(31,3,'MIRAGE',att))
    ok(f'第{att}试蜃景补11',b['combat']['player']['block']-a['combat']['player']['block']==11)
    d=action(31,3,'BOUNCING_FLASK',att)
    question=next(x for x in D if x['floor']==31 and x['turn']==3 and (x.get('sl_attempt') or 1)==att and x['decider']=='jev' and 'BOUNCING_FLASK' in json.dumps(x))
    (O/f'plan-31-{att}-3.json').write_text(json.dumps(question,ensure_ascii=False,indent=2)+'\n')
a,b=pair(action(30,6,'NOXIOUS_FUMES'))
ok('升级雾实建3',power(b['combat']['player'])['NOXIOUS_FUMES_POWER']==3)
a,b=pair(action(30,8,'DEADLY_POISON'))
e1=a['combat']['enemies'][0];e2=b['combat']['enemies'][0]
ok('普通致命毒5→10血6未即时扣',power(e1)['POISON_POWER']==5 and power(e2)['POISON_POWER']==10 and e1['current_hp']==e2['current_hp']==6)
ok('敌甲虫当轮8力',power(e2)['STRENGTH_POWER']==8)
sl=[json.loads(l) for l in (P/'sl-attempts.jsonl').open() if json.loads(l)['floor']==31]
ok('四次同前30抽序',len(sl)==4 and all(x['draws']['order'][:30]==sl[0]['draws']['order'][:30] for x in sl))
ok('四试无赢',all(x['result']!='won' for x in sl))
A=json.load(open(O/'audit.json'))
f=[x for x in A['fights'] if x['run']==N]
ok('16独立房1实际死',len(f)==16 and sum(x['death'] for x in f)==1)
ok('15赢房净损179',sum(x['loss'] for x in f if not x['death'])==179)
ok('末两房54→19→0',[(x['hp'],x['last_hp']) for x in f[-2:]]==[(54,19),(19,0)])
before=next(x['state'] for x in S if x['state']['screen']=='REWARD' and x['state']['run']['floor']==17)
after=next(x['state'] for x in S if x['state']['run']['floor']==18)
ok('跨幕38→63上限70',before['run']['current_hp']==38 and after['run']['current_hp']==63 and before['run']['max_hp']==after['run']['max_hp']==70)
(O/'verified.json').write_text(json.dumps(dict(checks=checks,rests=rests),ensure_ascii=False,indent=2)+'\n')
print('原帧核验',len(checks),'项全部通过')

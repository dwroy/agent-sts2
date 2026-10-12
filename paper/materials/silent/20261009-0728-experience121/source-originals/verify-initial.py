import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
N = 'SV2GP9NX4HQD'
P = O / N
S = [json.loads(x) for x in (P/'states.jsonl').open()]
D = [json.loads(x) for x in (P/'decisions.jsonl').open()]
SM = {x['ts']: x['state'] for x in S}
T = [x['ts'] for x in S]
checks = []
facts = []
def ok(name, test):
    assert test, name
    checks.append(name)
def powers(e): return {p['power_id']: p['amount'] for p in e.get('powers', [])}
def pair(d): return SM[d['ts']], S[min(bisect.bisect_right(T,d['ts']),len(S)-1)]['state']
def card(turn, ident, attempt=6):
    return next(d for d in D if d['floor']==48 and d['turn']==turn and (d.get('sl_attempt') or 1)==attempt and (d.get('chosen') or {}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id')==ident)
def enemy(s): return s['combat']['enemies'][0]
ok('1244状态1108决策',len(S)==1244 and len(D)==1108)
ok('角色局号一致',all(x['state']['run_id']==N and x['state']['run']['character_id'].lower()=='silent' for x in S))
ok('46次纯Codex脑',collections.Counter(json.loads(x)['engine'] for x in (P/'brain.jsonl').open())=={'codex':46})
ok('无同窗DeepSeek推理',(P/'deepseek-reasoning.jsonl').stat().st_size==0)
a,b = pair(card(2,'FOOTWORK'))
ok('步法建立3敏捷无追补',powers(b['combat']['player'])['DEXTERITY_POWER']==3 and a['combat']['player']['block']==b['combat']['player']['block']==0)
for turn,ident,lo,hi in [(2,'DEFEND_SILENT',0,8),(2,'BACKFLIP',8,16),(10,'SURVIVOR',0,11),(10,'DEFLECT',11,21)]:
    a,b=pair(card(turn,ident))
    ok(f'T{turn}{ident}格挡{lo}→{hi}',a['combat']['player']['block']==lo and b['combat']['player']['block']==hi)
    facts.append(dict(turn=turn,card=ident,before=a['combat']['player'],after=b['combat']['player']))
for turn,ident,delta in [(2,'DEADLY_POISON',7),(6,'SNAKEBITE',10),(8,'DEADLY_POISON',5)]:
    a,b=pair(card(turn,ident))
    ok(f'T{turn}{ident}施{delta}毒不即时扣血',powers(enemy(b)).get('POISON_POWER',0)-powers(enemy(a)).get('POISON_POWER',0)==delta and enemy(a)['current_hp']==enemy(b)['current_hp'])
    facts.append(dict(turn=turn,card=ident,before=enemy(a),after=enemy(b)))
a,b=pair(card(1,'PIERCING_WAIL'))
ok('尖啸减6力26→20',powers(enemy(a)).get('STRENGTH_POWER',0)-powers(enemy(b)).get('STRENGTH_POWER',0)==6 and sum(i.get('total_damage') or 0 for i in enemy(a)['intents'])==26 and sum(i.get('total_damage') or 0 for i in enemy(b)['intents'])==20)
last=[x['state'] for x in S if x['state']['screen']=='COMBAT'][-1]
end=S[-1]['state']
withers=[c for c in last['combat']['hand'] if c['card_id']=='WITHER']
ok('末轮1血21挡30攻击12持牌伤',last['run']['current_hp']==1 and last['combat']['player']['block']==21 and sum(i.get('total_damage') or 0 for i in enemy(last)['intents'])==30 and len(withers)==1 and withers[0]['dynamic_values']['Damage']['base_value']==12)
ok('末轮毒32结算178→146余31',enemy(last)['current_hp']==178 and powers(enemy(last))['POISON_POWER']==32 and enemy(end)['current_hp']==146 and powers(enemy(end))['POISON_POWER']==31)
ok('末帧死亡未到49',end['screen']=='GAME_OVER' and end['run']['current_hp']==0 and max(x['state']['run']['floor'] for x in S)==48)
sl=[json.loads(x) for x in (P/'sl-attempts.jsonl').open() if json.loads(x)['floor']==48]
ok('六试五截断一实死零赢',[x['result'] for x in sl]==['predicted_death']*5+['died'])
ok('六试同前35抽序',all(x['draws']['order'][:35]==sl[0]['draws']['order'][:35] for x in sl))
ok('六试退出回合9/8/9/9/11/10',[x['turns'] for x in sl]==[9,8,9,9,11,10])
drinks=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion']
ok('主动饮22含沙漏12',len(drinks)==22 and sum(d['floor']==48 for d in drinks)==12)
for d in drinks:
    a,b=pair(d); slot=d['chosen']['option_index']; ident=d['expect']['potion']['id']
    ok(f'F{d["floor"]}试{d.get("sl_attempt") or 1}T{d["turn"]}饮药{ident}',any(p['index']==slot and p.get('potion_id')==ident for p in a['run']['potions']) and not any(p['index']==slot and p.get('occupied') for p in b['run']['potions']))
    if ident=='POISON_POTION':
        ok('毒药水实加6不即时扣血',powers(enemy(b)).get('POISON_POWER',0)-powers(enemy(a)).get('POISON_POWER',0)==6 and enemy(a)['current_hp']==enemy(b)['current_hp'])
rests=[]
for d in D:
    if d['screen']=='REST' and (d.get('chosen') or {}).get('action')=='choose_rest_option':
        a,b=pair(d);rests.append(dict(floor=d['floor'],option=d['expect']['option']['id'],gain=b['run']['current_hp']-a['run']['current_hp']))
ok('六次营火回血各24',[r['gain'] for r in rests if r['option']=='HEAL']==[24]*6)
ok('六次锻造不回血',len(rests)==12 and all(r['gain']==0 for r in rests if r['option']=='SMITH'))
for before_floor,after_floor,hp1,hp2 in [(17,18,28,70),(33,34,9,66)]:
    a=next(x['state'] for x in S if x['state']['run']['floor']==before_floor and x['state']['screen']=='REWARD')
    b=next(x['state'] for x in S if x['state']['run']['floor']==after_floor)
    ok(f'跨幕{hp1}→{hp2}',a['run']['current_hp']==hp1 and b['run']['current_hp']==hp2 and int((81-hp1)*.8)==hp2-hp1)
facts.append(dict(last=last,end=end,rests=rests))
(O/'new-state-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
(O/'verified.json').write_text(json.dumps(dict(checks=checks,rests=rests,sl=[{k:v for k,v in x.items() if k in ['attempt','result','turns']} for x in sl]),ensure_ascii=False,indent=2)+'\n')
print('原帧核验',len(checks),'项全部通过')

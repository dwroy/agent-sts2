import collections,json
from pathlib import Path
O=Path(__file__).parent;N='MCT1GPTL8D35'
S=[json.loads(l) for l in (O/N/'states.jsonl').open()];D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()];SM={x['ts']:x['state'] for x in S};SL=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
def eh(s):return sum(e['current_hp'] for e in s['combat']['enemies'] if e['is_alive'])
groups=collections.defaultdict(list)
for d in D:
 if d.get('chosen') and d['screen']=='COMBAT':groups[(d['floor'],d.get('sl_attempt') or 1,d['turn'])].append(d)
expected={(17,1):([221,189,175,144,108,104,66,42,28],[70,70,58,55,55,55,55,32,28]),(33,1):([341,253,234,199,185,148,90],[63,63,63,36,36,22,18]),(33,2):([341,270,247,213,171,144,93,48,9],[63,63,54,35,35,34,30,9,9]),(42,1):([281,248,211,184,132,73],[34,34,34,34,15,15]),(42,2):([281,248,211,184,132,73],[34,34,34,34,7,7]),(42,3):([281,248,211,184,135,60],[34,34,34,34,7,7]),(42,4):([281,248,211,196,148,103],[34,34,34,34,7,7])}
turns=[]
for sl in SL:
 gg=sorted((t,ds) for (f,a,t),ds in groups.items() if (f,a)==(sl['floor'],sl['attempt']));ss=[SM[ds[0]['ts']] for t,ds in gg];needs=[eh(s) for s in ss];hps=[s['run']['current_hp'] for s in ss]
 assert (needs,hps)==expected[(sl['floor'],sl['attempt'])]
 turns.append(dict(floor=sl['floor'],attempt=sl['attempt'],result=sl['result'],needs=needs,hps=hps,dealt=[needs[i]-needs[i+1] for i in range(len(needs)-1)],loss=[hps[i]-hps[i+1] for i in range(len(hps)-1)]))
a=SM[groups[(42,1,4)][0]['ts']];b=SM[groups[(42,2,4)][0]['ts']];assert a['combat']==b['combat'] and a['run']['current_hp']==b['run']['current_hp']==34
assert turns[3]['dealt'][3]==turns[4]['dealt'][3]==52 and turns[3]['loss'][3]==19 and turns[4]['loss'][3]==27
draws=[]
for f in [33,42]:
 xs=[x for x in SL if x['floor']==f];order=0;when=0
 for i in range(min(x['draws']['clean'] for x in xs)):
  if len({x['draws']['order'][i] for x in xs})==1:order+=1
  else:break
 for i in range(order):
  if len({str(x['draws']['turns'][i]) for x in xs})==1:when+=1
  else:break
 draws.append(dict(floor=f,attempts=len(xs),wins=sum(x['result']=='won' for x in xs),initial_order=order,arrival_turn_prefix=when))
assert [(x['initial_order'],x['arrival_turn_prefix']) for x in draws]==[(28,10),(34,18)]
F=json.load(open(O/N/'facts.json'));plays=[x for x in F if x['card'] and x['action']=='play_card']
for x in plays:
 if x['floor']==33 and x['card']=='PIERCING_WAIL':
  assert x['before']['enemies'][0]['powers']['STRENGTH_POWER']==3 and x['after']['enemies'][0]['powers']['STRENGTH_POWER']==-3
afterimage=[x for x in plays if (x['floor'],x['attempt'],x['turn'])==(33,2,7)]
assert len(afterimage)==4 and all(x['after']['block']-x['before']['block']==1 for x in afterimage)
assert not any(x['card']=='NOXIOUS_FUMES' for x in plays if x['floor']==42)
assert not any(x['card']=='MASTER_PLANNER' for x in plays if x['floor']==42 and x['attempt']!=2)
assert not any(x['before']['powers'].get(p,0)>0 or x['after']['powers'].get(p,0)>0 for x in F if x['floor'] in [17,33,39,42] for p in ['STRENGTH_POWER','DEXTERITY_POWER'])
last=F[-1];assert last['after']['hp']==0 and last['before']['hp']==7 and last['before']['block']==8 and last['after']['enemies'][0]['hp']==72
assert sum(i['total_damage'] or 0 for i in last['before']['enemies'][0]['intents'])==32
assert last['before']['enemies'][0]['hp']==80 and last['before']['enemies'][0]['powers']['POISON_POWER']==8
flags=[]
for d in D:
 x=d.get('sl_explore') or {};p=x.get('replay') or {};v=x.get('avoid') or {}
 if x.get('replacement') or p.get('overridden') or v.get('replacement'):flags.append(dict(ts=d['ts'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt'),detail=x))
(O/'verified-battles.json').write_text(json.dumps(dict(turns=turns,draws=draws,sl_overrides=flags,local_cost=8,final_full_loss=24,final_shortfall=17),ensure_ascii=False,indent=2)+'\n')
print('逐轮、同盘8血价、抽序/到手轮、余像/尖啸、未建能力及死亡完整缺口核对通过')

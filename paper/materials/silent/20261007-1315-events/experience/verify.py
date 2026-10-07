import collections,json
from pathlib import Path
O=Path(__file__).parent;N='W7BHM8U02RKG'
S=[json.loads(l) for l in (O/N/'states.jsonl').open()];D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()];SM={x['ts']:x['state'] for x in S};SL=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
def eh(s):return sum(e['current_hp'] for e in s['combat']['enemies'] if e['is_alive'])
groups=collections.defaultdict(list)
for d in D:
 if d.get('chosen') and d['screen']=='COMBAT':groups[(d['floor'],d.get('sl_attempt') or 1,d['turn'])].append(d)
expected={1:([233,233,233,226,189],[24,24,24,24,3]),2:([233,233,233,226,203],[24,24,24,24,3]),3:([233,233,233,233,208,193,182,180],[24,24,24,24,9,7,7,7]),4:([233,233,233,233,208,199,188,186,178],[24,24,24,24,9,7,7,7,1]),5:([233,233,233,233,208,199,185,184,180],[24,24,24,24,9,7,7,7,2]),6:([233,233,233,233,214,202,188,184,179],[24,24,24,24,9,7,7,7,2])}
turns=[]
for sl in SL:
 gg=sorted((t,ds) for (f,a,t),ds in groups.items() if (f,a)==(17,sl['attempt']));ss=[SM[ds[0]['ts']] for t,ds in gg];needs=[eh(s) for s in ss];hps=[s['run']['current_hp'] for s in ss]
 assert (needs,hps)==expected[sl['attempt']],(sl['attempt'],needs,hps)
 turns.append(dict(floor=17,attempt=sl['attempt'],result=sl['result'],needs=needs,hps=hps,dealt=[needs[i]-needs[i+1] for i in range(len(needs)-1)],loss=[hps[i]-hps[i+1] for i in range(len(hps)-1)]))
F=json.load(open(O/N/'facts.json'))
ends={x['attempt']:x for x in F if x['floor']==17 and x['turn']==4 and x['action']=='end_turn'}
assert ends[1]['before']['enemies'][0]['powers']['POISON_POWER']==13
assert ends[1]['before']['enemies'][0]['hp']-ends[1]['after']['enemies'][0]['hp']==25
assert ends[3]['before']['enemies'][0]['hp']-ends[3]['after']['enemies'][0]['hp']==13
assert ends[6]['before']['enemies'][0]['hp']-ends[6]['after']['enemies'][0]['hp']==7
assert all(ends[i]['before']['enemies'][0]['powers']['STRENGTH_POWER']==-6 and ends[i]['after']['hp']==9 for i in [3,4,5,6])
assert turns[2]['dealt'][3]==25 and turns[5]['dealt'][3]==19 and turns[2]['loss'][3]==turns[5]['loss'][3]==15
last=F[-1];assert last['before']['hp']==2 and last['before']['block']==3 and last['after']['hp']==0
assert last['before']['enemies'][0]['hp']==166 and last['before']['enemies'][0]['powers']['POISON_POWER']==8 and last['after']['enemies'][0]['hp']==151
assert sum(i['total_damage'] or 0 for i in last['before']['enemies'][0]['intents'])==18
assert not any(x['before']['powers'].get(p,0)>0 for x in F if x['floor']==17 for p in ['STRENGTH_POWER','DEXTERITY_POWER'])
order=next((i for i in range(21) if len({x['draws']['order'][i] for x in SL})>1),21)
arrival=next((i for i in range(order) if len({str(x['draws']['turns'][i]) for x in SL})>1),order)
assert (order,arrival)==(21,21)
assert all(SM[groups[(17,a,1)][0]['ts']]['combat']==SM[groups[(17,1,1)][0]['ts']]['combat'] for a in range(2,7))
assert all(SM[groups[(17,a,4)][0]['ts']]['combat']==SM[groups[(17,3,4)][0]['ts']]['combat'] for a in [4,5,6])
flags=[dict(ts=d['ts'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt'),detail=d['sl_explore']) for d in D if d.get('sl_explore')]
(O/'verified-battles.json').write_text(json.dumps(dict(turns=turns,draws=dict(initial_order=order,arrival_turn_prefix=arrival),sl_overrides=flags,local_damage_cost=6,final_full_loss=15,final_shortfall=13),ensure_ascii=False,indent=2)+'\n')
print('六次逐轮、同盘少6毒伤/损血相同、21项同抽序同到手轮、临时减力与末轮15损/差13核对通过')

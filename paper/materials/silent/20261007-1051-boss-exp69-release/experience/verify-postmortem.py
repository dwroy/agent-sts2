import json,collections
from pathlib import Path
P=Path(__file__).parent
D=[json.loads(l) for l in (P/'7ZUC4VPMDS41/decisions.jsonl').open()]
S=[json.loads(l) for l in (P/'7ZUC4VPMDS41/states.jsonl').open()]
B={x['ts']:x['state'] for x in S}
def hp(x):return x['run']['current_hp']
def ehp(x):return sum(e['current_hp'] for e in (x.get('combat') or {}).get('enemies',[]) if e['is_alive'])
expected={
1:([262,232,226,218,198,172,156,142,132,115,93,82,67,45],[30,6,8,20,26,16,14,10,17,22,11,15,22],[0,4,6,13,19,0,0,7,3,0,5,10,0]),
2:([262,232,226,215,191,155,138,138,129,107,107,98,75],[30,6,11,24,36,17,0,9,22,0,9,23],[0,4,1,18,0,0,9,9,0,13,2,0]),
3:([262,232,226,218,198,170,152,132,122,119,102,92],[30,6,8,20,28,18,20,10,3,17,10],[0,4,6,18,16,0,0,7,0,0,11]),
4:([262,232,226,200,174,138,117,115,89,59],[30,6,26,26,36,21,2,26,30],[0,4,17,18,0,0,9,9,0]),
5:([262,232,216,197,171,135,118,118,96,66,61,54,35],[30,16,19,26,36,17,0,22,30,5,7,19],[0,9,6,18,0,0,9,9,0,13,0,0]),
6:([262,232,226,218,198,172,156,142,132,115,94,83,83,58],[30,6,8,20,26,16,14,10,17,21,11,0,25],[0,4,6,13,19,0,0,7,3,0,5,5,0])}
for a,(needs,dealt,lost) in expected.items():
 ds=[x for x in D if x.get('sl_attempt')==a]
 starts=[B[next(x for x in ds if x['turn']==t and x.get('chosen'))['ts']] for t in sorted(set(x['turn'] for x in ds if x['turn']))]
 assert [ehp(x) for x in starts]==needs
 assert [ehp(starts[i])-ehp(starts[i+1]) for i in range(len(starts)-1)]==dealt
 assert [hp(starts[i])-hp(starts[i+1]) for i in range(len(starts)-1)]==lost
 assert hp(starts[0])==70
 print('核对尝试',a,'进血',hp(starts[0]),'末轮',ds[-1]['turn'],'需',needs,'已结算扣',dealt,'实损',lost)
final=B[D[-1]['ts']];last=B[next(x['ts'] for x in reversed(D) if x['label']=='combat/end_turn')]
assert hp(final)==0 and ehp(final)==50 and hp(last)==8 and ehp(last)==58 and last['combat']['player']['block']==5
assert last['combat']['enemies'][0]['intents'][0]['total_damage']==25
assert ehp(last)-ehp(final)==8 and 25-5==20 and 20-8==12
assert len(D)==550 and len(S)==565
j=[x for x in D if x['decider']=='jev'];assert len(j)==236
assert sum(x['confidence']<.35 for x in j)==81
assert sum(x.get('rollout_best_chosen') is True for x in D)==189
assert sum(isinstance(x.get('rollout_best_chosen'),bool) for x in D)==195
assert sum(x.get('chosen',{}).get('action')=='use_potion' for x in D)==15
print('死亡数字与汇总核对通过')

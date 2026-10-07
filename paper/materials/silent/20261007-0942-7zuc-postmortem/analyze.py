import json,collections,datetime
from pathlib import Path
P=Path(__file__).parent
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
S=[json.loads(l) for l in (P/'states.jsonl').open()]
BYTS={x['ts']:x['state'] for x in S}
def hp(s):return s['run']['current_hp']
def ehp(s):return sum(e['current_hp'] for e in (s.get('combat') or {}).get('enemies',[]) if e.get('is_alive'))
def powers(w):return {x.get('power_id',x.get('id')):x.get('amount') for x in w.get('powers',[])}
def info(s):
 c=s.get('combat') or {};return {'hp':hp(s),'ehp':ehp(s),'block':c.get('player',{}).get('block'),'player':powers(c.get('player',{})),'enemies':[(e['enemy_id'],e['current_hp'],e['block'],powers(e),e.get('intent'),e.get('intents')) for e in c.get('enemies',[])]}
for a in range(1,7):
 ds=[x for x in D if x.get('sl_attempt')==a]
 print('尝试',a)
 for t in sorted(set(x['turn'] for x in ds if x['turn'])):
  dt=[x for x in ds if x['turn']==t and x.get('chosen')];first=BYTS[dt[0]['ts']];last=BYTS[dt[-1]['ts']]
  print('T',t,'始',info(first),'末',info(last),'动作',[(x['label'],x.get('expect',{}).get('card',{}).get('id',x.get('chosen',{}).get('action')),x.get('rationale','')) for x in dt if x['label']!='selection/choose'])
print('全局统计')
j=[x for x in D if x['decider']=='jev'];low=[x for x in j if x.get('confidence') is not None and x['confidence']<.35]
print('Jev',len(j),'低',len(low),'低分布',collections.Counter('combat' if x['label'].startswith('combat/') else 'selection' for x in low))
for a in [None,1,2,3,4,5,6]:
 ds=[x for x in D if x.get('sl_attempt')==a];q=[x for x in ds if x['label'] in ['combat/plan-choice','combat/plan-choice+potion']];bools=[x for x in q if isinstance(x.get('rollout_best_chosen'),bool)]
 print('组',a,'Jev',sum(x['decider']=='jev' for x in ds),'低',sum(x in low for x in ds),'题',len(q),'布尔',len(bools),'最优',sum(x['rollout_best_chosen'] for x in bools),'focus候选',sum('focus' in json.loads(v) for x in q for v in x.get('questions',{}).get('plan',{}).get('criteria',{}).values() if v.startswith('{')),'所选focus',sum(bool(x.get('focus')) for x in ds))
code=[x for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue']
print('代码非续步',len(code),'轮',len(set((x['floor'],x.get('sl_attempt'),x['turn']) for x in code)),'不含结束轮',len(set((x['floor'],x.get('sl_attempt'),x['turn']) for x in code if x.get('chosen',{}).get('action')!='end_turn')))
ct=[x for x in D if x['label'].startswith('combat/')];cturns=set((x['floor'],x.get('sl_attempt'),x['turn']) for x in ct);jturns=set((x['floor'],x.get('sl_attempt'),x['turn']) for x in ct if x['decider']=='jev')
print('实体轮',len(cturns),'无Jev战斗选线',len(cturns-jturns),'续步',collections.Counter('jev' if 'Jev-chosen' in x['rationale'] else 'code' for x in D if x['label']=='combat/plan-continue'))
print('护栏候选',[(x['ts'],x['rationale']) for x in D if any(k in x['rationale'].lower() for k in ['guard','override','safety'])])
print('fallback',sum(bool(x.get('fallback')) for x in D),'引擎',collections.Counter(x.get('deepseek',{}).get('brain',{}).get('engine') for x in D if x.get('deepseek')))
print('token',sum(x.get('usage',{}).get('input_tokens',0) for x in j),sum(x.get('usage',{}).get('output_tokens',0) for x in j))
print('brain usage', {k:sum(x.get('deepseek',{}).get(k,0) for x in D if x.get('deepseek')) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
print('用时',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds())

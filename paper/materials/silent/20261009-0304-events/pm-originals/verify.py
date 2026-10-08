import json,subprocess
from pathlib import Path
from collections import Counter
from datetime import datetime
p=Path('learner/runs/20261009-024302-postmortem');R=json.loads((p/'PBUBM0LRTEDD-resources.json').read_text());D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()]
byline={x['_line']:x for x in S}
def compact(s):
 c=s['combat'];return {'hp':s['run']['current_hp'],'block':c['player']['block'],'energy':c['player']['energy'],'powers':[(v['power_id'],v['amount']) for v in c['player']['powers']],'enemies':[(v['enemy_id'],v['current_hp'],v['block'],[(z['power_id'],z['amount']) for z in v['powers']],[(z['intent_type'],z.get('total_damage')) for z in v['intents']]) for v in c['enemies']]}
turns=[]
for c in R['combats']:
 if c['floor'] not in [17,27,33,43,48,49]:continue
 rows=[x for x in S if c['entry']['line']<=x['_line']<=(c.get('exit') or c['last'])['line']]
 starts=[]
 for x in rows:
  if not starts or x['state']['turn']!=starts[-1]['state']['turn'] and x['state']['in_combat']:starts.append(x)
 end=rows[-1]
 data=[]
 for i,a in enumerate(starts):
  b=starts[i+1] if i+1<len(starts) else end
  def hp(x):return sum(v['current_hp'] for v in x['state']['combat']['enemies'] if v['is_alive'])
  data.append({'turn':a['state']['turn'],'lines':[a['_line'],b['_line']],'hp_start':a['state']['run']['current_hp'],'hp_end':b['state']['run']['current_hp'],'need':hp(a),'net_clear':hp(a)-hp(b),'net_hp_loss':a['state']['run']['current_hp']-b['state']['run']['current_hp']})
 turns.append({'seq':c['sequence'],'floor':c['floor'],'turns':data})
 print('逐轮',c['sequence'],'F'+str(c['floor']),'需',[x['need'] for x in data],'净清',[x['net_clear'] for x in data],'净损',[x['net_hp_loss'] for x in data],'s',[x['lines'] for x in data])
(p/'turns-verified.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
for seq in [25,26,28]:
 c=R['combats'][seq-1]
 print('F49试',seq-22)
 for x in S:
  if c['entry']['line']<=x['_line']<=c['last']['line'] and (x['_line']==c['entry']['line'] or x['_line']==c['last']['line'] or x['state']['turn']!=byline.get(x['_line']-1,{}).get('state',{}).get('turn')):print(x['_line'],compact(x['state']))
for key in ['rollout_best_chosen','fallback','no_jev']:
 v=[x[key] for x in D if key in x];print(key,Counter(v))
jevs=[x for x in D if x['decider']=='jev' and x.get('rollout',{}).get('available')];print('可推演Jev',len(jevs),'选最优',sum(x.get('rollout_best_chosen') is True for x in jevs))
code=[x for x in D if x['decider']=='code' and x['label'] in ['combat/plan','combat/lethal','combat/least-loss']];print('自主决策',len(code),'轮',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in code}),'全部combat-code含end',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'}))
for x in D:
 if x['chosen'].get('action') in ['use_potion','discard_potion']:print('药动作',x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),x['chosen'],x['ts'])
for x in S:
 if x['state']['run']['floor'] in [17,27,33,35,43,48,49] and x['_line'] in [310904,310946,311228,311342]: print('时间证据',x['_line'],x['ts'])
print('用时',(datetime.fromisoformat(D[-1]['ts'])-datetime.fromisoformat(D[0]['ts'])).total_seconds())
for role in ['jev','codex']:
 print('usage',role,Counter({key:sum(x.get('usage',{}).get(key,0) or 0 for x in D if x['decider']==role) for key in ['input_tokens','output_tokens','cache_hit_tokens']}))

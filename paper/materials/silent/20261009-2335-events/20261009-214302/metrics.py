import json,re
from pathlib import Path
from collections import Counter
from datetime import datetime
p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];R=json.load((p/'0PH64C4AWAX9-resources.json').open())
metrics={'raw_deciders':dict(Counter(r['decider'] for r in D)), 'first_ts':D[0]['ts'],'last_ts':D[-1]['ts'], 'first_observed':D[0].get('observed_ts')}
metrics['seconds']=(datetime.fromisoformat(D[-1]['ts'])-datetime.fromisoformat(D[0]['ts'])).total_seconds()
J=[r for r in D if r['decider']=='jev'];metrics['jev_calls']=len(J);metrics['jev_low']=[{'line':r['_source_line'],'floor':r['floor'],'turn':r['turn'],'confidence':r['confidence']} for r in J if r.get('confidence') is not None and r['confidence']<.35]
plans=[]
for r in J:
 m=re.search(r'Jev chose (plan\d+|plan \d+)',r['rationale'])
 if not m:continue
 key=m.group(1).replace(' ',''); criteria=next((q.get('criteria',{}) for q in r.get('questions',{}).values() if key in q.get('criteria',{})),{})
 val=criteria.get(key);v=json.loads(val) if isinstance(val,str) else val
 plans.append({'line':r['_source_line'],'floor':r['floor'],'turn':r['turn'],'key':key,'best':v.get('rollout_best') if v else None,'rank':re.search(r'code rank ([\d-]+)',r['rationale']).group(1) if re.search(r'code rank ([\d-]+)',r['rationale']) else None,'focus':v.get('focus') if v else None,'rollout':v.get('rollout') if v else None,'sl_explore':'SL explore' in r['rationale']})
metrics['plan_choices']=plans;metrics['plan_best']=sum(x['best'] is True for x in plans);metrics['plan_criteria_found']=sum(x['best'] is not None for x in plans);metrics['plan_found']=sum(next((q.get('criteria',{}).get(x['key']) for r in J if r['_source_line']==x['line'] for q in r.get('questions',{}).values()),None) is not None for x in plans)
C=[r for r in D if r['decider']=='code' and r['label'].startswith('combat/') and 'continuing the Jev-chosen plan:' not in r['rationale']]
metrics['code_independent_combat_actions']=len(C);metrics['code_choice_actions']=sum(r['label']!='combat/plan-continue' for r in C)
turns=set()
for r in C:turns.add((r.get('sl_attempt') if isinstance(r.get('sl_attempt'),int) else str(r.get('sl_attempt')),r['floor'],r['turn']))
metrics['code_choice_turns_raw']=len(turns)
metrics['guarded']=[r['_source_line'] for r in D if 'guard' in r['label'] or 'HP guard' in r['rationale'] or 'HP护栏' in r['rationale']]
metrics['potion_actions']=[{'line':r['_source_line'],'floor':r['floor'],'turn':r['turn'],'chosen':r['chosen'],'reason':r['rationale']} for r in D if r.get('chosen',{}).get('action') in ['use_potion','discard_potion']]
metrics['jev_usage']={k:sum(r.get('usage',{}).get(k,0) or 0 for r in J) for k in ['input_tokens','output_tokens','cache_hit_tokens']}
metrics['brain']=[{'line':r['_source_line'],'floor':r['floor'],'label':r['label'],'usage':r.get('usage'),'deepseek':r.get('deepseek'),'boss_sim':r.get('boss_sim')} for r in D if r['decider']=='codex' and r.get('questions')]
byline={s['_source_line']:s for s in S}
metrics['combats']=[]
for c in R['combats']:
 hp_turns=[]
 for t in c['enemy_hp_audit']['turns']:
  lo,hi=t['start_line'],t['end_line'];first=byline[lo]['state'];last=byline[hi]['state'];row={k:v for k,v in t.items() if k!='transitions'}
  row['player_hp_start']=first['run']['current_hp'];row['player_hp_end']=last['run']['current_hp'];row['player_net_hp_change']=row['player_hp_end']-row['player_hp_start'];hp_turns.append(row)
 metrics['combats'].append({'floor':c['floor'],'sequence':c['sequence'],'turns':hp_turns})
(p/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in metrics.items() if k not in ['brain','combats','plan_choices','potion_actions']})
print('plan统计',len(plans),'best',metrics['plan_best'],'criteria found',metrics['plan_found'],'code rank1',sum(x['rank']=='1' for x in plans),'numeric rank',sum((x['rank'] or '').isdigit() for x in plans),'focus picks',sum(x['focus'] is not None for x in plans))
for c in metrics['combats']:
 print('F',c['floor'],'序',c['sequence'],'首敌HP',[x['live_enemy_hp_start'] for x in c['turns']],'实扣下界',[x['visible_enemy_hp_loss_lower_bound'] for x in c['turns']],'玩家净变化',[x['player_net_hp_change'] for x in c['turns']],'缺口',sorted({g for t in c['turns'] for g in t['gaps']}))
for r in metrics['brain']:
 print('脑',r['line'],'F',r['floor'],r['label'],'usage',r['usage'],'meta keys',list(r['deepseek'] or {}),'boss keys',list(r['boss_sim'] or {}))

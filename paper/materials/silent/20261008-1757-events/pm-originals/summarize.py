import json, re
from collections import Counter,defaultdict
from pathlib import Path
from datetime import datetime
p=Path(__file__).resolve().parent;rid='SY0WMJNNVRLM'
d=[json.loads(l) for l in (p/f'{rid}-decisions.jsonl').open()]
s=[json.loads(l) for l in (p/f'{rid}-states.jsonl').open()]
rc=json.load(open(p/f'{rid}-resources.json'))
summary={}
summary['counts']={'deciders':dict(Counter(x['decider'] for x in d)),'low_jev':sum(x['decider']=='jev' and isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 for x in d),'fallback':sum(bool(x.get('fallback')) for x in d)}
plans=[x for x in d if x['decider']=='jev' and (x.get('rollout') or {}).get('available')]
summary['rollout']={'count':len(plans),'best':sum(x.get('rollout_best_chosen') is True for x in plans),'not_logged':sum('rollout_best_chosen' not in x for x in plans),'by_floor':{f:{'count':len([x for x in plans if x['floor']==f]),'best':sum(x.get('rollout_best_chosen') is True for x in plans if x['floor']==f)} for f in sorted({x['floor'] for x in plans})}}
summary['hp_guard']=[{k:x.get(k) for k in ['_line','floor','turn','sl_attempt','label','rationale']} for x in d if re.search(r'HP guard|hp.guard|preserve.hp|guardrail',x.get('rationale',''),re.I)]
summary['code_turns']={}
for floor in sorted({x['floor'] for x in d if x.get('turn') is not None}):
 combat=[x for x in d if x['floor']==floor and x['label'].startswith('combat/')]
 summary['code_turns'][floor]={'total':len({(x.get('sl_attempt') or 1,x['turn']) for x in combat}),'any_code':len({(x.get('sl_attempt') or 1,x['turn']) for x in combat if x['decider']=='code'}),'primary_code':len({(x.get('sl_attempt') or 1,x['turn']) for x in combat if x['decider']=='code' and x['label']!='combat/plan-continue'}),'all_code':len([t for t in {(x.get('sl_attempt') or 1,x['turn']) for x in combat} if all(x['decider']=='code' for x in combat if (x.get('sl_attempt') or 1,x['turn'])==t)])}
summary['potions']=[{k:x.get(k) for k in ['_line','floor','turn','sl_attempt','chosen','expect','rationale']} for x in d if x['chosen'].get('action') in ['use_potion','discard_potion','buy_potion']]
summary['usage']={}
for who in ['jev','codex']:
 xs=[x for x in d if x['decider']==who and x.get('usage')]
 # Reused steps carry metadata without a physical call.
 if who=='codex':xs=[x for x in xs if x.get('deepseek')]
 summary['usage'][who]={'calls':len(xs),'input':sum(x['usage'].get('input_tokens',0) for x in xs),'output':sum(x['usage'].get('output_tokens',0) for x in xs),'cache':sum(x['usage'].get('cache_hit_tokens',0) for x in xs),'engines':dict(Counter((x.get('deepseek') or {}).get('brain',{}).get('engine') for x in xs))}
summary['duration']={'first_decision':d[0]['ts'],'last_decision':d[-1]['ts'],'decision_seconds':(datetime.fromisoformat(d[-1]['ts'])-datetime.fromisoformat(d[0]['ts'])).total_seconds(),'first_observed':d[0]['observed_ts'],'observed_seconds':(datetime.fromisoformat(d[-1]['ts'])-datetime.fromisoformat(d[0]['observed_ts'])).total_seconds()}
summary['turns']=[]
for c in rc['combats']:
 frames=[x for x in s if c['entry']['line']<=x['_line']<=c['last']['line']]
 byturn=defaultdict(list)
 for x in frames:byturn[x['state']['turn']].append(x)
 for t,rows in byturn.items():
  a=rows[0];z=rows[-1];af=a['state']['combat'];zf=z['state']['combat'];nextrows=[x for x in s if x['_line']>z['_line']]
  nextrow=nextrows[0] if nextrows else None
  summary['turns'].append({'sequence':c['sequence'],'floor':c['floor'],'turn':t,'lines':[a['_line'],z['_line'],nextrow['_line'] if nextrow else None],'hp_start':af['player']['current_hp'],'hp_pre_end':zf['player']['current_hp'],'block_pre_end':zf['player']['block'],'enemy_start':[(e['enemy_id'],e['current_hp'],e['is_alive']) for e in af['enemies']],'enemy_pre_end':[(e['enemy_id'],e['current_hp'],e['is_alive']) for e in zf['enemies']],'intent_pre_end':[(e['enemy_id'],e['move_id'],[(i.get('damage'),i.get('hits')) for i in e.get('intents',[])]) for e in zf['enemies'] if e['is_alive']],'next_hp':(nextrow['state'].get('run') or {}).get('current_hp') if nextrow else None,'next_enemy':[(e['enemy_id'],e['current_hp'],e['is_alive']) for e in (nextrow['state'].get('combat') or {}).get('enemies',[])] if nextrow else None,'end':c['end']})
(p/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
for k in ['counts','rollout','hp_guard','code_turns','potions','usage','duration']:print(k,json.dumps(summary[k],ensure_ascii=False))

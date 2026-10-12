import json,re,collections,datetime,subprocess
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-074301-postmortem')
d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
s=[json.loads(x) for x in (p/'states.jsonl').open()]
b=[json.loads(x) for x in (p/'brain.jsonl').open()]
rc=json.loads((p/'RZ6YAC7K89NM-resources.json').read_text())
result={'battles':[]}
for c in rc['combats']:
 rows=[x for x in s if c['entry']['line']<=x['_line']<=c['exit']['line']]
 byturn={}
 for x in rows:
  if x['_line']==c['exit']['line']:continue
  byturn.setdefault(x['state']['turn'],[]).append(x)
 arr=[]
 def total(x):return sum(e['current_hp'] for e in (x['state'].get('combat') or {}).get('enemies',[]) if e['is_alive'])
 for t,rs in byturn.items():
  a=rs[0];z=next((x for x in rows if x['state']['turn']==t+1),rows[-1]);last=rs[-1]
  en=(last['state'].get('combat') or {}).get('enemies',[])
  arr.append({'turn':t,'from_line':a['_line'],'to_line':z['_line'],'need_hp':total(a),'net_enemy_hp_loss':total(a)-total(z),'player_net_hp_loss':a['state']['run']['current_hp']-z['state']['run']['current_hp'],'end_block':((last['state'].get('combat') or {}).get('player') or {}).get('block'),'end_intent':sum((i.get('total_damage') or 0) for e in en if e['is_alive'] for i in e.get('intents',[]))})
 battle={'floor':c['floor'],'entry':c['entry'],'exit':c['exit'],'turns':arr}
 result['battles'].append(battle)
 print('battle F',c['floor'],'need',[x['need_hp'] for x in arr],'enemy net',[x['net_enemy_hp_loss'] for x in arr],'player net',[x['player_net_hp_loss'] for x in arr])
choices=[]
for x in d:
 if x['decider']!='jev' or x['label'] not in ['combat/plan-choice','combat/plan-choice+potion']:continue
 m=re.search(r'chose plan (\d+)/',x['rationale']); key='plan'+m[1] if m else 'p0'
 options={k:json.loads(v) for k,v in x['questions']['plan']['criteria'].items()}
 choices.append({'line':x['_line'],'floor':x['floor'],'turn':x['turn'],'key':key,'best':options[key].get('rollout_best') is True,'focus':options[key].get('focus'),'offered_focus':any(v.get('focus') for v in options.values())})
result['jev']={'all':sum(x['decider']=='jev' for x in d),'low':sum(x['decider']=='jev' and x.get('confidence',1)<.35 for x in d),'choices':choices,'best':sum(x['best'] for x in choices),'plan_choices':len(choices),'focus_offered':sum(x['offered_focus'] for x in choices),'focus_chosen':sum(bool(x['focus']) for x in choices)}
turns={(x['floor'],x['turn']) for x in d if x['screen']=='COMBAT'}
jevturns={(x['floor'],x['turn']) for x in d if x['label'] in ['combat/plan-choice','combat/plan-choice+potion'] and x['decider']=='jev'}
codeind=[x for x in d if x['screen']=='COMBAT' and x['decider']=='code' and x['label']!='combat/plan-continue']
result['code']={'turns':len(turns),'no_jev_turns':len(turns-jevturns),'independent_actions':len(codeind),'independent_turns':len({(x['floor'],x['turn']) for x in codeind}),'independent_nonend_turns':len({(x['floor'],x['turn']) for x in codeind if x['chosen']['action']!='end_turn'}),'jev_continue':sum(x['rationale'].startswith('continuing the Jev-chosen plan') for x in d),'code_continue':sum(x['rationale'].startswith('continuing the code-chosen plan') for x in d)}
result['usage']={'jev_input':sum((x.get('usage') or {}).get('input_tokens',0) for x in d),'jev_output':sum((x.get('usage') or {}).get('output_tokens',0) for x in d),'brain_input':sum(x['usage']['inputTokens'] for x in b),'brain_output':sum(x['usage']['outputTokens'] for x in b),'brain_cache':sum(x['usage']['cacheHitTokens'] for x in b),'brain_reasoning':sum(x['usage'].get('reasoningTokens',0) for x in b),'brain_latency_ms':sum(x['latency_ms'] for x in b)}
def ts(x):return datetime.datetime.fromisoformat(x.replace('Z','+00:00'))
result['duration']={'decision_seconds':(ts(d[-1]['ts'])-ts(d[0]['ts'])).total_seconds(),'observed_seconds':(ts(d[-1]['ts'])-ts(d[0]['observed_ts'])).total_seconds()}
print(json.dumps({k:v for k,v in result.items() if k!='battles'},ensure_ascii=False))
result['labels']=dict(collections.Counter(x['label'] for x in d));print('labels',result['labels'])
(p/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for x in s:
 if x['state']['run']['floor']==6:
  c=x['state'].get('combat') or {}; es=c.get('enemies',[])
  if any(e['enemy_id']=='GAS_BOMB' for e in es):print('F6 bomb',x['_line'],x['state']['turn'],[(e['enemy_id'],e['current_hp'],e['max_hp']) for e in es])

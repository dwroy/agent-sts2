import json,collections,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-091302-postmortem')
for r in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:
 ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{r}-states.jsonl').open()];rs=json.loads((p/f'{r}-resources.json').read_text());out=[]
 def emit(*args):out.append(' '.join(json.dumps(a,ensure_ascii=False) if not isinstance(a,str) else a for a in args))
 for c in rs['combats']:
  a,b=c['entry']['line'],(c.get('exit') or c['last'])['line']; rows=[s for s in ss if a<=s['_line']<=b];grp=[]
  for s in rows:
   t=s['state'].get('agent_view',{}).get('turn')
   if not grp or grp[-1][0]!=t:grp.append([t,[]])
   grp[-1][1].append(s)
  for i,(t,st) in enumerate(grp):
   first,last=st[0],st[-1];nxt=grp[i+1][1][0] if i+1<len(grp) else last
   co=last['state'].get('combat') or {};pl=co.get('player') or {}
   def en(s):return [(e['name'],e['enemy_id'],e['current_hp'],e['block'],[(z['power_id'],z['amount']) for z in e['powers']],[(z.get('total_damage'),z.get('damage'),z.get('hits')) for z in e['intents']],e['move_id']) for e in (s['state'].get('combat') or {}).get('enemies',[])]
   emit('TURN',c['sequence'],c['floor'],t,'hp',[first['state']['run']['current_hp'],last['state']['run']['current_hp'],nxt['state']['run']['current_hp']],'block',pl.get('block'),'powers',[(z['power_id'],z['amount']) for z in pl.get('powers',[])],'startE',en(first),'endE',en(last),'nextE',en(nxt),'lines',[first['_line'],last['_line'],nxt['_line']])
 for x in ds:
  if 'HP guard' in x.get('rationale',''):
   emit('GUARD',x['_line'],x['floor'],x['turn'],x['rationale'])
   for k,v in x['questions']['plan']['criteria'].items():
    y=json.loads(v);emit(k,{z:y.get(z) for z in ['plays','hp_lost','damage_dealt','rollout_best','scaling_gained','rollout','rollout_turns']})
 for x in [json.loads(z) for z in (p/f'{r}-sl-attempts.jsonl').open()]:
  emit('SL',x['_line'],{k:x.get(k) for k in ['floor','attempt','started_at','ended_at','result','reload','target','deviation','replay','death_turn','turn']});emit('SLkeys',list(x.keys()))
 for x in [json.loads(z) for z in (p/f'{r}-run-plans.jsonl').open()]:emit('RUNPLAN',x['_line'],x['floor'],x['plan'])
 for x in ds:
  if x['decider']=='codex':emit('BRAIN',x['_line'],x['floor'],x['label'],x.get('journal'))
  if x.get('chosen',{}).get('action') in ['use_potion','discard_potion','buy_potion']:emit('POTION',x['_line'],x['floor'],x['turn'],x['chosen'],x['rationale'])
 je=[x for x in ds if x['decider']=='jev' and x['label'].startswith('combat/')];valid=[x for x in je if isinstance(x.get('rollout_best_chosen'),bool)];auto=[x for x in ds if x['decider']=='code' and x['label'] in ['combat/plan','combat/lethal','combat/least-loss']];end=[x for x in ds if x['decider']=='code' and x['label']=='combat/end_turn']
 emit('STATS',{'jev_combat':len(je),'best_true':sum(x['rollout_best_chosen'] for x in valid),'best_valid':len(valid),'rank1':sum('code rank 1' in x['rationale'] for x in je),'auto_rows':len(auto),'auto_turns':len(set((x['floor'],(x.get('sl_attempt') or 1),x['turn']) for x in auto)),'with_end_rows':len(auto+end),'with_end_turns':len(set((x['floor'],(x.get('sl_attempt') or 1),x['turn']) for x in auto+end)),'fallback':sum(bool(x.get('fallback')) for x in ds),'no_jev':sum(bool(x.get('no_jev')) for x in ds),'usage_by':{by:{k:sum((x.get('usage') or {}).get(k,0) or 0 for x in ds if x['decider']==by) for k in ['input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens']} for by in set(x['decider'] for x in ds)}})
 (p/f'{r}-details.txt').write_text('\n'.join(out)+'\n')
 print(r,'details',len(out))

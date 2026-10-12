import json,collections,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-171301-postmortem')
ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];ss=[json.loads(l) for l in (p/'states.jsonl').open()];byline={x['line']:x for x in ss};byts={x['record']['ts']:x for x in ss}
r=json.loads((p/'XW8B5CHJ814J-resources.json').read_text())
print('回合表')
for c in r['combats']:
 if c['floor'] not in [17,33,35,42,45,48,49]:continue
 start=c['entry']['line'];end=(c['exit'] or c['last'])['line'];frames=[x for x in ss if start<=x['line']<=end];attempt=[x for x in ds if x['record']['ts']==c['entry']['ts']];at=attempt[0]['record'].get('sl_attempt') if attempt else None
 print('COMBAT',c['sequence'],'F',c['floor'],'attempt',at,'enemies',c['enemies'])
 groups=[]
 for x in frames:
  s=x['record']['state']
  if not s.get('in_combat'):continue
  if not groups or groups[-1][0]['record']['state']['turn']!=s['turn']:groups.append([])
  groups[-1].append(x)
 for i,g in enumerate(groups):
  a=g[0];z=g[-1];sa=a['record']['state'];sz=z['record']['state'];za=sz.get('combat') or {};pl=za.get('player') or {};before=sa['run']['current_hp'];after=(groups[i+1][0]['record']['state']['run']['current_hp'] if i+1<len(groups) else ((c.get('exit') or {}).get('hp')))
  hp_audit=next((t for t in c['enemy_hp_audit']['turns'] if t['turn']==sa['turn']),{})
  endturn=next((d for d in ds if d['record']['ts']==z['record']['ts']),None)
  print(json.dumps({'T':sa['turn'],'s':[a['line'],z['line']],'HP':[before,sz['run']['current_hp'],after],'block':pl.get('block'),'incoming':sum((it.get('total_damage') or 0) for e in za.get('enemies',[]) if e.get('is_alive') for it in e.get('intents',[]) if it.get('intent_type')=='Attack'),'start_enemy':[(e['name'],e['current_hp'],e['max_hp']) for e in (sa.get('combat') or {}).get('enemies',[])],'last_enemy':[(e['name'],e['current_hp'],e['max_hp']) for e in za.get('enemies',[])],'visible_enemy_loss':hp_audit.get('visible_enemy_hp_loss_lower_bound'),'added_enemy_hp':hp_audit.get('observed_hp_added'),'gaps':hp_audit.get('gaps'),'powers':[(a['power_id'],a['amount']) for a in pl.get('powers',[])],'last_action':endturn['record']['chosen'] if endturn else None},ensure_ascii=False))
print('护栏方案概要')
for x in ds:
 d=x['record']
 if 'HP guard:' not in d['rationale']:continue
 s=byts[d['ts']]['record']['state'];print('GUARD',x['line'],d['floor'],d['turn'],d.get('sl_attempt'),'HP',s['run']['current_hp'],d['rationale'])
 for q in d['questions'].values():
  for key,value in (q.get('criteria') or {}).items():
   try:v=json.loads(value)
   except:continue
   print(key,json.dumps({k:v.get(k) for k in ['plays','hp_lost','damage_dealt','block_gained','cards_drawn','rollout_best','focus','scaling_gained','rollout_turns']},ensure_ascii=False))
print('F49换线')
for x in ds:
 d=x['record']
 if d['floor']==49 and (d['turn']==1 or 'SL ' in d['rationale']):
  print(x['line'],d.get('sl_attempt'),d['decider'],d['label'],d['chosen'],d['rationale'])
print('药水动作')
for x in ds:
 d=x['record'];a=d['chosen'];s=(byts.get(d['ts']) or {}).get('record',{}).get('state',{});belt={a['index']:a for a in (s.get('run') or {}).get('potions',[])}
 if a.get('action') in ['use_potion','discard_potion']:
  b=belt.get(a.get('option_index'),{});print(x['line'],d['floor'],d['turn'],d.get('sl_attempt'),d['ts'],a,b.get('name'),b.get('potion_id'),d['result'])
print('药水奖励')
for x in ds:
 d=x['record'];j=d.get('journal') or {}
 if d['chosen'].get('action')=='claim_reward' and 'claiming Potion' in d['rationale']:print(x['line'],d['floor'],d['ts'],d['rationale'])
print('最优比例')
answers=[];ranks=[];extra=[];direct=[]
for x in ds:
 d=x['record']
 if d['decider']!='jev' or 'plan-choice' not in d['label']:continue
 m=re.search(r'Jev chose plan (\d+)/(\d+)',d['rationale'])
 if not m:direct.append(x);continue
 key='plan'+m.group(1);crit=next((q.get('criteria',{}) for q in d['questions'].values() if key in q.get('criteria',{})),{})
 try:v=json.loads(crit[key])
 except: v={}
 answers.append((x,v));ranks.append(bool(v.get('rollout_best')))
 if v.get('rollout_best'):extra.append(x['line'])
print('278 choices',len(answers),'plan best',sum(ranks),'direct potion',len(direct),'best fraction',sum(ranks)/len(answers));print('unknown plan criteria',[(x['line'],x['record']['rationale']) for x,v in answers if not v]);print('focus',{k:sum(k in json.dumps(x['record']['questions']) for x in ds) for k in ['focus','focus_enemy','target_focus']})
def decider(d):return 'jev-plan' if d['decider']=='code' and d['rationale'].startswith('continuing the Jev-chosen plan:') else d['decider']
print('deciders',collections.Counter(decider(x['record']) for x in ds))
aut=[x for x in ds if decider(x['record'])=='code' and x['record']['label'].startswith('combat/')];turns={(x['record']['floor'],x['record'].get('sl_attempt'),x['record']['turn']) for x in aut};print('code combat actions',len(aut),'own turns',len(turns));print('code autonomous labels',collections.Counter(x['record']['label'] for x in aut));print('code turn floor counts',collections.Counter(t[0] for t in turns))
print('资源补充数',sum(1 for c in r['resource_changes'] if not c['restart_boundary'] for a in c['to']['potions'] if a not in c['from']['potions']))

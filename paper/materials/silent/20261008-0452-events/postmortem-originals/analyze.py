import json,collections,datetime,re,bisect
from pathlib import Path
p=Path('learner/runs/20261008-041302-postmortem')
d=[json.loads(x) for x in (p/'decisions.jsonl').open()]; s=[json.loads(x) for x in (p/'states.jsonl').open()];rc=json.loads((p/'9Z9H2EXKLF3T-resources.json').read_text())
def compact(x):
 st=x['state']; run=st.get('run',{}); c=st.get('combat',{}) or {}; pl=c.get('player',{}) or {}
 return {'line':x['_line'],'ts':x['ts'],'F':run.get('floor'),'T':st.get('turn'),'hp':run.get('current_hp'),'max':run.get('max_hp'),'screen':st.get('screen'),'available':st.get('available_actions'),'player':{k:pl.get(k) for k in ['block','energy','powers','cards_played_this_turn']},'potions':[(z.get('index'),z.get('potion_id'),z.get('name')) for z in run.get('potions',[]) if z.get('occupied')],'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','block','is_alive','powers','intents','move_id']} for e in c.get('enemies',[])],'hand':[{k:z.get(k) for k in ['index','card_id','name','energy_cost','resolved_rules_text','is_playable']} for z in c.get('hand',[])]}
with (p/'boss-frames.jsonl').open('w') as f:
 for x in s:
  if x['state'].get('run',{}).get('floor')==48: f.write(json.dumps(compact(x),ensure_ascii=False)+'\n')
for b in rc['combats']:
 if b['floor'] not in [17,31,33,35,38,39,45,48]:continue
 groups={}
 for x in s:
  if b['entry']['line']<=x['_line']<=(b['exit'] or b['last'])['line'] and x['state'].get('in_combat'):
   groups.setdefault(x['state']['turn'],[]).append(x)
 print('F',b['floor'],'试',b['sequence'],'回合资源')
 for t,g in groups.items():
  ready=[x for x in g if 'end_turn' in x['state'].get('available_actions',[])]; first=ready[0] if ready else g[0];last=g[-1]
  z=compact(first);w=compact(last)
  audit=next((a for a in b['enemy_hp_audit']['turns'] if a['turn']==t),{})
  print('T',t,'L',first['_line'],last['_line'],'HP',z['hp'],'→',w['hp'],'敌',[(e['enemy_id'],e['current_hp']) for e in z['enemies']],'净扣',audit.get('net_live_enemy_hp_loss'),'可见扣',audit.get('visible_enemy_hp_loss_lower_bound'),'新增HP',audit.get('observed_hp_added'),'末挡',w['player']['block'],'意图',[(e['enemy_id'],e.get('intents')) for e in w['enemies']],'手',[(c['card_id'],c['resolved_rules_text']) for c in w['hand']])
print('非战血变')
for x in rc['resource_changes']:
 if x['combat_sequence'] is None:print(x)
print('药水动作')
for x in d:
 if x.get('chosen',{}).get('action') in ['use_potion','discard_potion'] or x['label']=='reward/claim' and '药' in str(x.get('journal')):print(x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),x.get('chosen'),x.get('rationale'))
print('保血/SL/不符')
for x in d:
 if re.search('guardrail|SL explore|mismatch|HP floor|HP guard',x.get('rationale','')):print(x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),x['rationale'])
print('策划')
for x in d:
 if x['decider']=='codex':print(x['_line'],x['floor'],x['label'],x.get('chosen'),x.get('rationale'),x.get('journal'))
print('计划')
for line in (p/'run-plans.jsonl').open():
 x=json.loads(line);print(x['_line'],json.dumps(x,ensure_ascii=False)[:2600])

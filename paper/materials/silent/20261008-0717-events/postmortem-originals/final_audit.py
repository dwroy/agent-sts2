exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem/audit.py').read().split("start,end=")[0])
from collections import Counter
for c in R['combats']:
 lo=c['entry']['line'];hi=(c['exit'] or c['last'])['line'];fs=[x for x in S if lo<=x['_line']<=hi];by={}
 for x in fs:
  co=x['state'].get('combat') or {};pl=co.get('player') or {}
  if x['state'].get('in_combat') and co.get('hand') and co.get('action_readiness',{}).get('can_use_combat_actions') and pl.get('cards_played_this_turn',0)==0:by.setdefault(x['state']['turn'],x)
 e=[]
 for t,x in sorted(by.items()):
  co=x['state']['combat'];e.append({'turn':t,'line':x['_line'],'ts':x['ts'],'hp':x['state']['run']['current_hp'],'need':sum(z.get('current_hp',0) for z in co['enemies'] if z.get('is_alive')),'block':co['player']['block'],'powers':co['player']['powers']})
 finish=fs[-1];st=finish['state'];co=st.get('combat') or {};end_need=sum(z.get('current_hp',0) for z in co.get('enemies',[]) if z.get('is_alive'))
 for i,v in enumerate(e):
  nxt=e[i+1] if i+1<len(e) else {'hp':st['run']['current_hp'],'need':end_need};v['net_enemy_loss']=v['need']-nxt['need'];v['net_hp_loss']=v['hp']-nxt['hp']
 c['manual_turns']=e;c['all_seen_enemies']=sorted({z['enemy_id'] for x in fs for z in (x['state'].get('combat') or {}).get('enemies',[])})
 c['verified_outcome']='won' if c['floor']!=45 and c['end']=='observed_exit' else 'actual_death' if c['sequence']==19 else 'predicted_death_sl'
 print('C',c['sequence'],c['floor'],'first',e[0]['hp'] if e else None,'need',[a['need'] for a in e],'netdamage',[a['net_enemy_loss'] for a in e],'hpnet',[a['net_hp_loss'] for a in e],'end',end_need,'all',c['all_seen_enemies'])
(P/'resources-final.json').write_text(json.dumps(R,ensure_ascii=False,indent=2)+'\n')
print('changes')
for ch in R['resource_changes']:
 a,b=ch['from'],ch['to'];print('R',a['line'],b['line'],b['floor'],b['turn'],b['ts'],a['hp'],b['hp'],'p',a['potions'],b['potions'],'combat',ch['combat_sequence'],'restart',ch['restart_boundary'])
print('potionactions')
for d in D:
 if d.get('chosen',{}).get('action') in ['use_potion','discard_potion','buy_potion']:print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['chosen'],d['rationale'])

exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261009-191302-postmortem/details.py').read().split("print('confidence")[0])
byts={x['ts']:x for x in S};checks=[]
for c in R['combats']:
 fs=[x for x in S if c['entry']['line']<=x['_line']<=c['last']['line']];ready=[x for x in fs if (x['state'].get('combat') or {}).get('action_readiness',{}).get('can_use_combat_actions') is True]
 first=ready[0] if ready else fs[0];print('ENTRY',c['sequence'],c['floor'],c['entry']['line'],first['_line'],first['state']['turn'],first['state']['run']['current_hp'],first['state']['run']['max_hp'],[e['enemy_id'] for e in first['state']['combat']['enemies']])
 for t in dict.fromkeys(x['state']['turn'] for x in fs):
  if c['floor'] not in [14,17,33,36,39,43,48]:continue
  tt=[x for x in fs if x['state']['turn']==t];a=tt[0]
  ds=[d for d in D if a['ts']<=d['ts']<=tt[-1]['ts'] and d.get('turn')==t];ends=[d for d in ds if d['chosen']['action']=='end_turn'];z=byts[ends[-1]['ts']] if ends else tt[-1]
  nxt=next((x for x in S if x['_line']>tt[-1]['_line']),None)
  restart=c['end']=='restart_observed' and t==fs[-1]['state']['turn']
  cb=z['state']['combat'];ps=cb['player'];hp0=a['state']['run']['current_hp'];hpn=None if restart else nxt['state']['run']['current_hp']
  e0=sum(e['current_hp'] for e in a['state']['combat']['enemies']);en=None if restart else sum(e['current_hp'] for e in (nxt['state'].get('combat') or {}).get('enemies',[]) if e.get('is_alive'))
  row={'seq':c['sequence'],'F':c['floor'],'T':t,'s_first':a['_line'],'s_end':z['_line'],'s_next':None if restart else nxt['_line'],'hp_start':hp0,'hp_before_end':z['state']['run']['current_hp'],'hp_after':hpn,'hp_loss':None if hpn is None else hp0-hpn,'block':ps['block'],'enemy_start':e0,'enemy_after':en,'enemy_net_loss':None if en is None else e0-en,'incoming':sum(i.get('total_damage') or 0 for e in cb['enemies'] if e['is_alive'] for i in e['intents']),'wither':[(v['name'],v.get('resolved_rules_text')) for v in cb['hand'] if v['card_id']=='WITHER']}
  checks.append(row)
emit('turns-audit.jsonl',checks)
for c in R['resource_changes']:
 if c['combat_sequence'] is None:print('NONCOMBAT',c['from']['line'],c['to']['line'],'F',c['to']['floor'],c['from']['hp'],c['from']['max_hp'],c['from']['potions'],'→',c['to']['hp'],c['to']['max_hp'],c['to']['potions'],'restart',c['restart_boundary'])
print('GUARD DETAILS')
for d in D:
 if 'HP guard:' not in d['rationale']:continue
 print(d['_line'],d['rationale'])
 for k,v in d['questions']['plan']['criteria'].items():
  if k in {'318824':['plan6','plan4'],'319092':['plan9','plan6'],'319100':['plan5','plan1']}[str(d['_line'])]:
   o=json.loads(v);print(k,{k:o.get(k) for k in ['hp_lost','damage_dealt','scaling_gained','enemies_after','rollout','boss_sim']})

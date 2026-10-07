import json,pathlib,collections,re,datetime
p=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-014304-postmortem');rid='RC61MFQM63Y6'
d=[json.loads(l) for l in (p/f'{rid}-decisions.jsonl').open()]
s=[json.loads(l) for l in (p/f'{rid}-states.jsonl').open()]
r=json.load((p/f'{rid}-resources.json').open())
audit=[]
for c in r['combats']:
 rows=[x for x in s if c['entry']['line']<=x['line']<=(c['exit'] or c['last'])['line']]
 ds=[x for x in d if c['entry']['ts']<=x['data']['ts']<=(c['exit'] or c['last'])['ts']]
 turns={}
 for x in rows:
  a=x['data']['state'];t=a.get('turn')
  if t is not None:turns.setdefault(t,[]).append(x)
 out={'sequence':c['sequence'],'floor':c['floor'],'enemies':c['enemies'],'entry':c['entry'],'exit':c['exit'],'end':c['end'],'turns':[]}
 for t,xs in turns.items():
  start=xs[0];end=xs[-1];nxt=turns.get(t+1)
  after=nxt[0] if nxt else end
  def slim(x):
   a=x['data']['state'];co=a.get('combat') or {};pl=co.get('player') or {}
   return {'line':x['line'],'ts':x['data']['ts'],'hp':a['run']['current_hp'],'block':pl.get('block'),'energy':pl.get('energy'),'powers':pl.get('powers'),'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','block','is_alive','move_id','intents','powers']} for e in co.get('enemies',[])]}
  livehp=lambda x:sum(e.get('current_hp',0) for e in ((x['data']['state'].get('combat') or {}).get('enemies') or []) if e.get('is_alive') is not False)
  actions=[{'line':x['line'],'ts':x['data']['ts'],'label':x['data']['label'],'decider':x['data']['decider'],'chosen':x['data']['chosen'],'rationale':x['data']['rationale'],'journal':x['data']['journal']} for x in ds if x['data']['turn']==t]
  out['turns'].append({'turn':t,'need_body_hp':livehp(start),'body_hp_net_removed':livehp(start)-livehp(after),'hp_net_lost':start['data']['state']['run']['current_hp']-after['data']['state']['run']['current_hp'],'start':slim(start),'pre_end':slim(end),'after':slim(after),'actions':actions,'incomplete_enemy_resolution':not nxt and c['exit'] is None})
 audit.append(out)
(p/'resources-audited.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
for c in audit:
 print('C',c['sequence'],'F',c['floor'],'entry',c['entry']['hp'],'exit',(c['exit'] or {}).get('hp'),'line',c['entry']['line'],(c['exit'] or c['turns'][-1]['pre_end'])['line'],'turns',[(t['turn'],t['need_body_hp'],t['body_hp_net_removed'],t['hp_net_lost']) for t in c['turns']])
low=[x for x in d if x['data']['decider']=='jev' and isinstance(x['data'].get('confidence'),(int,float)) and x['data']['confidence']<.35]
plans=[x for x in d if x['data']['decider']=='jev' and x['data']['label'].startswith('combat/plan-choice')]
print('COUNTS',collections.Counter(x['data']['decider'] for x in d),'low',len(low),'plans',len(plans),'rank1',sum(bool(re.search(r'code rank 1(?:\D|$)',x['data']['rationale'])) for x in plans),'code combat boards',len({(x['data']['sl_attempt'],x['data']['floor'],x['data']['turn']) for x in d if x['data']['decider']=='code' and x['data']['label'].startswith('combat/')}),'only-code turn boards',len({(x['data']['sl_attempt'],x['data']['floor'],x['data']['turn']) for x in d if x['data']['decider']=='code' and x['data']['label'].startswith('combat/')}-{(x['data']['sl_attempt'],x['data']['floor'],x['data']['turn']) for x in d if x['data']['decider']=='jev' and x['data']['label'].startswith('combat/')}))
for x in d:
 a=x['data']
 if 'HP guard' in a['rationale'] or 'SL explore' in a['rationale']:print('OVERRIDE',x['line'],a['floor'],a['turn'],a['sl_attempt'],a['rationale'])
 if a['chosen'].get('action') in ['use_potion','drink_potion','discard_potion']: print('POTION ACTION',x['line'],a['floor'],a['turn'],a['sl_attempt'],a['chosen'],a['rationale'])
print('JEv usage',sum((x['data'].get('usage') or {}).get('input_tokens',0) for x in d if x['data']['decider']=='jev'),sum((x['data'].get('usage') or {}).get('output_tokens',0) for x in d if x['data']['decider']=='jev'))

import json,collections,datetime,re
from pathlib import Path
p=Path(__file__).parent; run='T0DGVABPV60U';ds=[json.loads(l) for l in (p/f'{run}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{run}-states.jsonl').open()];r=json.load((p/f'{run}-resources.json').open()); byts={x['ts']:i for i,x in enumerate(ss)}
auto=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']; ak={(d['floor'],d.get('sl_attempt') or 1,d['turn']) for d in auto}; jk={(d['floor'],d.get('sl_attempt') or 1,d['turn']) for d in ds if d['decider']=='jev' and d['label'].startswith('combat/')}
plans=[d for d in ds if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')]; best=[d for d in plans if isinstance(d.get('rollout_best_chosen'),bool)]; rank=[]; focus=[];guards=[]
for d in plans:
 q=(d.get('questions') or {}).get('plan') or {}; vals={}
 for k,v in q.get('criteria',{}).items():
  try:vals[k]=json.loads(v)
  except: pass
 choice=(d.get('answers') or {}).get('plan',{}).get('choice');raw=vals.get(choice,{})
 m=re.search(r'code rank (\d+)',d.get('rationale',''))
 if m:rank.append(int(m.group(1)))
 fs=[k for k,v in vals.items() if isinstance(v,dict) and v.get('focus')]
 if fs:focus.append({'line':d['_line'],'floor':d['floor'],'turn':d['turn'],'choice':choice,'choices':fs,'chosen_focus':raw.get('focus')})
 if '; HP guard:' in d.get('rationale',''):
  m=re.search(r'playing plan (\d+) \(',d['rationale']); newkey='plan'+m.group(1);n=vals[newkey]
  guards.append({'line':d['_line'],'floor':d['floor'],'turn':d['turn'],'attempt':d.get('sl_attempt'),'old':choice,'new':newkey,'old_fields':{k:raw.get(k) for k in ['hp_lost','damage_dealt','block_gained','cards_drawn','plays','energy_unused']},'new_fields':{k:n.get(k) for k in ['hp_lost','damage_dealt','block_gained','cards_drawn','plays','energy_unused']},'sl_override':'SL explore' in d['rationale']})
print('自主决策',len(auto),'触及轮',len(ak),'全自主',len(ak-jk),'混合',len(ak&jk)); print('选线',len(plans),'有best',len(best),'best真',sum(d['rollout_best_chosen'] for d in best),'数值rank',len(rank),'rank1',rank.count(1),'focus题',len(focus),'选focus',sum(bool(d['chosen_focus']) for d in focus)); print('护栏',len(guards))
for g in guards:print(json.dumps(g,ensure_ascii=False))
print('药栏战斗变化')
for e in r['resource_changes']:
 a,b=e['from'],e['to']
 if e['combat_sequence'] and a['potions']!=b['potions']:print('窗口',e['combat_sequence'],'F/T',b['floor'],b['turn'],'s',a['line'],b['line'],a['potions'],'→',b['potions'])
print('炼制动作')
for d in ds:
 if d.get('chosen',{}).get('action')!='play_card':continue
 i=byts.get(d.get('observed_ts'))
 if i is None:continue
 hand=(ss[i]['state'].get('combat') or {}).get('hand',[]); ci=d['chosen'].get('card_index'); card=next((c for c in hand if c['index']==ci),{})
 if card.get('card_id')=='ALCHEMIZE':print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),'before',ss[i]['_line'],'after',ss[i+1]['_line'],d['rationale'])
for c in r['combats']:
 if c['floor'] not in [5,17,28,33,45,46,48]:continue
 rows=[x for x in ss if c['entry']['line']<=x['_line']<=(c.get('exit') or c['last'])['line']]; starts=[]
 for x in rows:
  s=x['state']
  if s.get('in_combat') and (s.get('combat') or {}).get('enemies') and (not starts or starts[-1]['state']['turn']!=s['turn']):starts.append(x)
 hp=[x['state']['run']['current_hp'] for x in starts];need=[sum(e['current_hp'] for e in x['state']['combat']['enemies'] if e['is_alive']) for x in starts];last=c.get('exit') or c['last'];end=rowend=next(x for x in rows if x['_line']==last['line']);nets=[hp[i]-(hp[i+1] if i+1<len(hp) else last['hp']) for i in range(len(hp))]
 if len(c['enemies'])==1 and c['floor']!=48:
  dmg=[need[i]-(need[i+1] if i+1<len(need) else sum(e['current_hp'] for e in (end['state'].get('combat') or {}).get('enemies',[]) if e['is_alive'])) for i in range(len(need))]
 else:dmg=[]
 print('逐轮',c['sequence'],c['floor'],'轮',[x['state']['turn'] for x in starts],'帧',[x['_line'] for x in starts],'HP',hp,'需',need,'净损',nets,'净扣',dmg)
metrics={'autonomous_decisions':len(auto),'autonomous_turns':len(ak),'only_autonomous':len(ak-jk),'mixed':len(ak&jk),'plan_questions':len(plans),'best_recorded':len(best),'best_true':sum(d['rollout_best_chosen'] for d in best),'rank_recorded':len(rank),'rank1':rank.count(1),'focus':focus,'guards':guards}
(p/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')

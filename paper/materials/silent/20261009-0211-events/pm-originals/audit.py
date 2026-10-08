import json,re,collections,datetime
from pathlib import Path
P=Path(__file__).parent
R='P2M3DFJ4DEZ3'
def rows(name):
 for l in (P/(name+'-match.txt')).open():
  n,_,s=l.partition(':');r=json.loads(s);r['_line']=int(n);yield r
D=list(rows('decisions'));S=list(rows('states'));B=list(rows('brain'));C=json.loads((P/(R+'-resources.json')).read_text());byline={r['_line']:r for r in S}
J=[r for r in D if r['decider']=='jev'];JP=[r for r in J if 'plan' in r.get('questions',{})]
def opts(r):
 o={}
 for k,v in r.get('questions',{}).get('plan',{}).get('criteria',{}).items():
  try:o[k]=json.loads(v)
  except (ValueError,TypeError):continue
 return o
def choice(r):
 m=re.search(r'Jev chose (?:plan (\d+)|to drink)',r.get('rationale',''))
 if m and m.group(1):return 'plan'+m.group(1)
 chosen=r.get('chosen') or {}
 if chosen.get('action')=='use_potion':return 'p'+str(chosen['option_index'])
 return None
stats=collections.Counter();floorstats=collections.defaultdict(collections.Counter)
for r in JP:
 o=opts(r);key=choice(r);selected=o.get(key,{})
 if any(q.get('rollout_best') is True for q in o.values()):
  stats['unique_best_questions']+=1;stats['selected_best']+=selected.get('rollout_best') is True
  floorstats[r['floor']]['unique']+=1;floorstats[r['floor']]['best']+=selected.get('rollout_best') is True
 elif any(q.get('rollout_tied') for q in o.values()):stats['tied']+=1;floorstats[r['floor']]['tied']+=1
 else:stats['no_marker']+=1
stats['plans']=len(JP);stats['jev']=len(J);stats['low']=sum(isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35 for r in J)
result={'stats':stats,'floors':dict(floorstats),'brain_calls':len(B),'brain_engines':collections.Counter(r.get('engine') for r in B),'brain_usage':{k:sum((r.get('usage') or {}).get(k,0) or 0 for r in B) for k in ['inputTokens','outputTokens','cacheHitTokens']},'jev_usage':{k:sum((r.get('usage') or {}).get(k,0) for r in J) for k in ['input_tokens','output_tokens']},'duration_decisions':(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds(),'duration_observation':(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['observed_ts'].replace('Z','+00:00'))).total_seconds(),'turns':[],'guards':[],'potions':[]}
for c in C['combats']:
 rs=[r for r in S if c['entry']['line']<=r['_line']<=(c.get('exit') or c['last'])['line']];gs=[]
 for r in rs:
  if not gs or gs[-1][0]['state'].get('turn')!=r['state'].get('turn'):gs.append([])
  gs[-1].append(r)
 group={'seq':c['sequence'],'floor':c['floor'],'need':[],'clear':[],'hp_net_loss':[],'lines':[]}
 for i,g in enumerate(gs):
  a=g[0];z=gs[i+1][0] if i+1<len(gs) else g[-1];live=lambda r:sum(e['current_hp'] for e in (r['state'].get('combat') or {}).get('enemies',[]) if e.get('is_alive'))
  group['need'].append(live(a));group['clear'].append(live(a)-live(z));group['hp_net_loss'].append(a['state']['run']['current_hp']-z['state']['run']['current_hp']);group['lines'].append([a['_line'],z['_line']])
 result['turns'].append(group)
for r in JP:
 if 'HP guard:' in r.get('rationale',''):
  o=opts(r);a=o.get(choice(r),{});m=re.search(r'playing plan (\d+)',r['rationale']);z=o.get('plan'+m.group(1),{});result['guards'].append({'decision':r['_line'],'floor':r['floor'],'turn':r['turn'],'attempt':r.get('sl_attempt'),'old_loss':a.get('hp_lost'),'new_loss':z.get('hp_lost'),'old_damage':a.get('damage_dealt'),'new_damage':z.get('damage_dealt')})
for r in D:
 if (r.get('chosen') or {}).get('action') in ['use_potion','discard_potion']:
  result['potions'].append({'d':r['_line'],'floor':r['floor'],'turn':r.get('turn'),'attempt':r.get('sl_attempt'),'chosen':r['chosen'],'expect':r.get('expect')})
result['guard_model_saved']=sum(x['old_loss']-x['new_loss'] for x in result['guards']);result['guard_model_damage_cost']=sum(x['old_damage']-x['new_damage'] for x in result['guards'])
(P/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
for k,v in result.items():
 if k not in ['turns','guards','potions']:print(k,v)
for g in result['turns']:
 if g['floor'] in [17,25,27,33,42,43,48,49]:print(g)

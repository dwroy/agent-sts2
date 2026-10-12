from analyze import *
import re,datetime

def powers(x):return ','.join(f"{p['power_id']}={p['amount']}" for p in x.get('powers',[]))
def compact(s):
 st=s['state']; c=st.get('combat') or {};p=c.get('player') or {}
 return {'s':s['_line'],'ts':s['ts'],'t':st['turn'],'screen':st['screen'],'hp':st['run']['current_hp'],'max':st['run']['max_hp'],'block':p.get('block'),'energy':p.get('energy'),'plays':p.get('cards_played_this_turn'),'powers':powers(p),'hand':','.join(f"{a['name']}({'+' if a['upgraded'] else ''}{a['card_id']})" for a in c.get('hand',[])),'enemies':[(e['index'],e['name'],e['enemy_id'],e['current_hp'],e['block'],powers(e),[(x.get('total_damage')) for x in e.get('intents',[])]) for e in c.get('enemies',[])]}
with (P/'key-states.txt').open('w') as f:
 for c in R['combats']:
  if c['floor'] not in (33,45,48,49):continue
  f.write(f"窗口{c['sequence']} F{c['floor']}\n")
  ss=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']]
  tt=collections.defaultdict(list)
  for s in ss:tt[s['state']['turn']].append(s)
  for t,rs in tt.items():
   for s in ([rs[0],rs[-1]] if len(rs)>1 else rs):f.write(json.dumps(compact(s),ensure_ascii=False)+'\n')
with (P/'brain-short.txt').open('w') as f:
 for d in D:
  if d.get('deepseek'):
   b=d['deepseek'];f.write(json.dumps({'d':d['_line'],'ts':d['ts'],'f':d['floor'],'label':d['label'],'chosen':d.get('chosen'),'rationale':d['rationale'],'brain':{k:v for k,v in b.items() if k not in ('usage','request','response','options','memory','prompt','question','reasoning')},'boss_sim':d.get('boss_sim'),'merge':d.get('run_plan_merge')},ensure_ascii=False)+'\n')
with (P/'plans-short.txt').open('w') as f:
 for p in rows('run-plans'):f.write(json.dumps(p,ensure_ascii=False)+'\n')
print('deepseek keys',D[0].get('deepseek',{}).keys())
print('brain last')
for d in D:
 if d.get('deepseek') and d['floor']>=40: print(d['_line'],d['floor'],d['label'],d['rationale'],{k:v for k,v in d['deepseek'].items() if k in ('choice','reason','engine','model','latency_ms')})
for c in R['combats'][-7:]:
 print('窗口',c['sequence'])
 ss=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']];tt=collections.defaultdict(list)
 for s in ss:tt[s['state']['turn']].append(s)
 for t,rs in tt.items():print('T',t,compact(rs[0]),'末',compact(rs[-1]))

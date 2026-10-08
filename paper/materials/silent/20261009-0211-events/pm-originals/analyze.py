import json,collections,datetime,re
from pathlib import Path
P=Path(__file__).parent
R='P2M3DFJ4DEZ3'
def rows(name):
 with (P/(name+'-match.txt')).open() as h:
  for line in h:
   n,_,s=line.partition(':');r=json.loads(s);r['_line']=int(n);yield r
D=list(rows('decisions'));S=list(rows('states'));L=list(rows('sl'));plans=list(rows('plans'))
C=json.loads((P/(R+'-resources.json')).read_text())
def powers(o):return ','.join(str(x['power_id'])+':'+str(x['amount']) for x in o.get('powers',[]))
def short(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return {'hp':s['run']['current_hp'],'max':s['run']['max_hp'],'turn':s.get('turn'),'block':p.get('block'),'energy':p.get('energy'),'powers':powers(p),'enemies':[{'id':e['enemy_id'],'name':e['name'],'hp':e['current_hp'],'alive':e['is_alive'],'block':e['block'],'move':e.get('move_id'),'powers':powers(e),'intents':e.get('intents')} for e in c.get('enemies',[])],'potions':[(x['index'],x['potion_id']) for x in s['run']['potions'] if x.get('occupied')]}
with (P/'combat-summary.txt').open('w') as f:
 for c in C['combats']:
  a=c['entry'];z=c['exit'];t=c['last'];f.write(f"#{c['sequence']} F{c['floor']} {','.join(c['enemies'])} entry {a['hp']}/{a['max_hp']} {a['potions']} s{a['line']} {a['ts']} exit {None if z is None else (z['hp'],z['max_hp'],z['potions'],z['line'],z['ts'])} last {t['hp']} T{t['turn']} s{t['line']} netloss {c['observed_net_hp_loss']} {c['end']}\n")
with (P/'critical-states.txt').open('w') as f:
 for r in S:
  s=r['state']
  if s['run']['floor']>=48:
   f.write(f"s{r['_line']} {r['ts']} {s['screen']} "+json.dumps(short(s),ensure_ascii=False)+'\n')
with (P/'brain-summary.txt').open('w') as f:
 for r in D:
  if r['decider']=='codex':
   f.write(f"d{r['_line']} {r['ts']} F{r['floor']} {r['label']} {r.get('chosen')} {r.get('rationale')}\n")
with (P/'critical-decisions.txt').open('w') as f:
 for r in D:
  if r['floor']>=48:
   f.write(f"d{r['_line']} {r['ts']} F{r['floor']} T{r.get('turn')} {r.get('sl_attempt')} {r['decider']} {r['label']} {r.get('chosen')} {r.get('rationale')} conf{r.get('confidence')} journal{r.get('journal')}\n")
with (P/'resource-changes.txt').open('w') as f:
 for x in C['resource_changes']:
  a=x['from'];b=x['to'];f.write(f"s{a['line']} F{a['floor']} T{a['turn']} {a['hp']}/{a['max_hp']} {a['potions']} -> s{b['line']} F{b['floor']} T{b['turn']} {b['hp']}/{b['max_hp']} {b['potions']} {b['ts']} seq{x['combat_sequence']} restart{x['restart_boundary']}\n")
with (P/'turn-audit.txt').open('w') as f:
 for c in C['combats']:
  if c['floor'] not in [17,25,27,33,42,43,48,49]:continue
  rs=[r for r in S if c['entry']['line']<=r['_line']<=(c.get('exit') or c['last'])['line']]
  groups=[]
  for r in rs:
   if not groups or groups[-1][0]['state'].get('turn')!=r['state'].get('turn'):groups.append([])
   groups[-1].append(r)
  f.write(f"#{c['sequence']} F{c['floor']}\n")
  for i,g in enumerate(groups):
   a=g[0];b=groups[i+1][0] if i+1<len(groups) else g[-1]
   sa=short(a['state']);sb=short(b['state']);live=lambda x:sum(e['hp'] for e in x['enemies'] if e['alive'])
   f.write(f" T{sa['turn']} s{a['_line']}->{b['_line']} hp {sa['hp']}->{sb['hp']} need{live(sa)} netclear{live(sa)-live(sb)} last="+json.dumps(short(g[-2]['state'] if len(g)>1 and g[-1]['state'].get('in_combat') is False else g[-1]['state']),ensure_ascii=False)+'\n')
with (P/'sl-summary.txt').open('w') as f:
 for r in L:
  f.write(f"sl{r['_line']} F{r['floor']} #{r['attempt']} {r['result']} T{r['turns']} hp{r['end_hp']} block{r['end_block']} incoming{r['incoming']} reload{r['reload']} judge{r['judge']}\n")
usage=collections.defaultdict(lambda:collections.Counter())
for r in D:
 for k,v in (r.get('usage') or {}).items():
  if isinstance(v,(int,float)):usage[r['decider']][k]+=v
print('USAGE',dict(usage))
J=[r for r in D if r['decider']=='jev'];jp=[r for r in J if 'plan' in r.get('questions',{})];print('J',len(J),'plan',len(jp),'low',sum(isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35 for r in J))
print('journal fields',collections.Counter(k for r in jp for k in r.get('journal',{})))
print('rank',collections.Counter(re.search(r'code rank (\d+)',r.get('rationale','')).group(1) if re.search(r'code rank (\d+)',r.get('rationale','')) else 'none' for r in jp))
print('tail_journal',[(r['_line'],r.get('journal')) for r in jp[-4:]])
print('elapsed seconds',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds())

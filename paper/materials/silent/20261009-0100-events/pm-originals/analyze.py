import json,re
from pathlib import Path
from collections import Counter,defaultdict
P=Path(__file__).parent
RUN='LY83ZMTFVKJH'
def read(n):
 out=[]
 for l in (P/(n+'-lines.jsonl')).open():
  a,b=l.split(':',1); x=json.loads(b); x['_line']=int(a); out.append(x)
 return out
D,S,SL=read('decisions'),read('states'),read('sl')
R=json.load((P/(RUN+'-resources.json')).open())
def hp(s): return s['state']['run']['current_hp']
def es(s): return [(e['enemy_id'],e.get('name'),e['current_hp'],e['max_hp'],e.get('powers'),e.get('intents')) for e in (s['state'].get('combat') or {}).get('enemies',[])]
def live(s): return sum(e['current_hp'] for e in (s['state'].get('combat') or {}).get('enemies',[]) if e.get('is_alive'))
if __name__=='__main__':
 print('STRATEGY')
 for d in D:
  if d['decider']=='codex': print(d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'],d.get('journal'))
 print('COMBATS')
 for c in R['combats']:
  print(c['sequence'],c['floor'],c['enemies'],'entry',c['entry'],'exit',c.get('exit'),'last',c['last'])
 print('RESOURCE CHANGES')
 for c in R['resource_changes']: print(c)
 print('JEV/STATS',Counter(d['decider'] for d in D))
 j=[d for d in D if d['decider']=='jev']; rank=[(d,re.search(r'code rank (\d+)',d['rationale'])) for d in j]; rank=[(d,int(m[1])) for d,m in rank if m]
 print('low',sum(d.get('confidence') is not None and d['confidence']<.35 for d in j),'plan rank',len(rank),'rank1',sum(r==1 for d,r in rank),'ranks',Counter(r for d,r in rank))
 print('code distinct turns',len({(d.get('floor'),d.get('sl_attempt'),d['turn']) for d in D if d['decider']=='code' and d['label'].startswith('combat/')}))
 for d in D:
  if any(x in d['rationale'].lower() for x in ['guard','override','focus','potion','explor']): print('SPECIAL',d['_line'],d['floor'],d['turn'],d['label'],d['decider'],d['rationale'])
 print('KEY TURNS')
 for c in R['combats']:
  if c['floor'] not in [12,14,15,17,19,20,21]:continue
  start=c['entry']['line']; end=(c.get('exit') or c['last'])['line']; ss=[s for s in S if start<=s['_line']<=end]
  turns=[]
  for s in ss:
   if s['state'].get('in_combat') and s['state'].get('turn') not in [t['state'].get('turn') for t in turns]: turns.append(s)
  print('FIGHT',c['floor'],c['sequence'])
  for i,s in enumerate(turns):
   e=turns[i+1] if i+1<len(turns) else ss[-1]
   print('turn',s['state'].get('turn'),'s',s['_line'],e['_line'],'hp',hp(s),hp(e),'live',live(s),live(e),'net',live(s)-live(e),'enemies',[(x[0],x[2]) for x in es(s)])
 print('DEATH')
 for s in S[-9:]: print(s['_line'],s['ts'],s['state'].get('turn'),hp(s),s['state'].get('combat'))

from analyze import *
for f in sorted({floor(s) for s in ss if stable(s)}):
 rows=[s for s in ss if floor(s)==f];starts={}
 for s in rows:
  if stable(s):starts.setdefault(s['state']['turn'],s)
 damage=collections.Counter();adds=collections.Counter()
 for a,b in zip(rows,rows[1:]):
  ca=a['state'].get('combat') or {};cb=b['state'].get('combat') or {};t=a['state'].get('turn')
  if not ca.get('enemies') or t is None:continue
  ea={e['enemy_id']:e['current_hp'] for e in ca.get('enemies',[])};eb={e['enemy_id']:e['current_hp'] for e in cb.get('enemies',[])}
  for k,h in ea.items():
   if k in eb:damage[t]+=max(0,h-eb[k]);adds[t]+=max(0,eb[k]-h)
   elif cb.get('enemies') or b['screen'] in ['REWARD','GAME_OVER']:damage[t]+=h
  for k,h in eb.items():
   if k not in ea:adds[t]+=h
 # F39 final state contains a newly summoned Stabbot after old poisoned Stabbot died; no intermediate state.
 if f==39:damage[6]+=12;adds[6]+=12
 end=next((s for s in rows if s['screen'] in ['REWARD','GAME_OVER']),rows[-1]);endhp=(end['state'].get('combat') or {}).get('player',{}).get('current_hp')
 keys=sorted(starts);hp=[starts[t]['state']['combat']['player']['current_hp'] for t in keys]+[endhp]
 print('F',f,'NAMES',[(e['enemy_id'],e['name'],e['current_hp']) for e in starts[keys[0]]['state']['combat']['enemies']],'HP',hp[0],endhp,'NEED',[sum(e['current_hp'] for e in starts[t]['state']['combat']['enemies']) for t in keys],'DAMAGE',[damage[t] for t in keys],'LOSS',[hp[i]-hp[i+1] for i in range(len(keys))],'ADDS',[adds[t] for t in keys])

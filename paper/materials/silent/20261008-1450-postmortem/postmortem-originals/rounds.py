import json
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-141302-postmortem');run='H1T1F8ML9FUE'
s=[json.loads(x) for x in (p/f'{run}-states.jsonl').open()];chain=json.load((p/f'{run}-resources.json').open());byline={r['_line']:r for r in s}
with (p/'rounds.txt').open('w') as o:
 for c in chain['combats']:
  if c['floor'] not in [17,24,33,35,40,43,45,46,48]:continue
  end=(c['exit'] or c['last'])['line'];ss=[r for r in s if c['entry']['line']<=r['_line']<=end];starts=[]
  for r in ss:
   v=r['state'];co=v.get('combat') or {};t=v.get('turn')
   if v.get('in_combat') and co.get('action_readiness',{}).get('can_use_combat_actions') is True and (not starts or starts[-1]['state']['turn']!=t):starts.append(r)
  def enemyhp(r):
   es=(r['state'].get('combat') or {}).get('enemies',[])
   if c['floor']==24:es=[e for e in es if e['enemy_id']=='OVICOPTER']
   return sum(e['current_hp'] for e in es if e['is_alive'])
  o.write(f"#{c['sequence']} F{c['floor']} {c['enemies']}\n")
  for i,r in enumerate(starts):
   z=starts[i+1] if i+1<len(starts) else byline[end];v=r['state'];co=v['combat'];pl=co['player'];need=enemyhp(r);actual=need-enemyhp(z)
   o.write(f"T{v['turn']} s{r['_line']}->{z['_line']} hp={v['run']['current_hp']}->{z['state']['run']['current_hp']} need={need} net_dmg={actual} B={pl['block']} E={pl['energy']} powers={[(x['power_id'],x['amount']) for x in pl['powers']]} enemy={[(e['enemy_id'],e['current_hp'],e.get('intent'),[(x['power_id'],x['amount']) for x in e['powers']]) for e in co['enemies']]}\n")
print((p/'rounds.txt').stat().st_size)

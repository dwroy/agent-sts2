import json,sys
def show(path):
  d=json.load(open(path))
  st=d['state']; c=st['combat']
  print('==== turn',st['turn'], 'screen',st['screen'])
  p=c.get('player',{})
  print('player keys', list(c.keys()))
  pl=c['player']
  print(' hp',pl.get('current_hp'),'/',pl.get('max_hp'),'block',pl.get('block'),'energy',pl.get('energy'), 'powers',[(x.get('power_id'),x.get('amount')) for x in pl.get('powers',[])])
  for e in c.get('enemies',[]):
    print(' enemy',e.get('enemy_id'),e.get('current_hp'),'/',e.get('max_hp'),'blk',e.get('block'),'powers',[(x.get('power_id'),x.get('amount')) for x in e.get('powers',[])],'intent',e.get('move_id'), [ (i.get('intent_type'),i.get('damage'),i.get('hits')) for i in e.get('intents',[])] )
  for k in ['hand','draw_pile','discard_pile','exhaust_pile']:
    v=c.get(k) or pl.get(k)
    if v is None: continue
    print(' ',k,len(v),[ (x.get('card_id'),x.get('energy_cost')) for x in v])
for p in sys.argv[1:]: show(p)

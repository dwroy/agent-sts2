import json,sys
def show(path):
  d=json.load(open(path))
  st=d['state']; c=st['combat']; v=(st.get('agent_view') or {}).get('combat') or {}
  pl=c['player']
  print('==== turn',st['turn'],'hp',pl.get('current_hp'),'blk',pl.get('block'),'en',pl.get('energy'),'played',pl.get('cards_played_this_turn'),'powers',[(x.get('power_id'),x.get('amount')) for x in pl.get('powers',[])])
  for e in c.get('enemies',[]):
    print(' enemy',e.get('enemy_id'),e.get('current_hp'),'/',e.get('max_hp'),'blk',e.get('block'),[(x.get('power_id'),x.get('amount')) for x in e.get('powers',[])],e.get('move_id'),[(i.get('intent_type'),i.get('damage'),i.get('hits')) for i in e.get('intents',[])])
  print(' hand',[(x.get('card_id'),x.get('energy_cost'),x.get('playable', None)) for x in c.get('hand',[])])
  for k in ['draw','discard','exhaust']:
    print(' ',k,[x.get('line') for x in v.get(k,[])])
for p in sys.argv[1:]: show(p)

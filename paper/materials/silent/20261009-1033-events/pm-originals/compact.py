exec(open(__file__.replace('compact.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
for x in S:
 s=x['state'];r=s['run'];c=s.get('combat') or {};pl=c.get('player') or {}
 if r['floor'] not in set(map(int,sys.argv[1:])):continue
 print(x['_source']['line'],x['ts'][11:], 'T'+str(s['turn']),s['screen'],f"HP{r['current_hp']}/{r['max_hp']}",f"E{pl.get('energy')} B{pl.get('block')}",'P',[(z['index'],z.get('potion_id')) for z in r.get('potions',[]) if z.get('occupied')],'power',[(z.get('power_id'),z.get('amount')) for z in pl.get('powers',[])], 'enemy',[(z.get('name'),z.get('current_hp'),z.get('block'),[(a.get('power_id'),a.get('amount')) for a in z.get('powers',[])],[(a['intent_type'],a.get('total_damage')) for a in z.get('intents',[])]) for z in c.get('enemies',[])],'hand',[(z['index'],z['card_id']+('+' if z['upgraded'] else '')) for z in c.get('hand',[])])

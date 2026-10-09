exec(open(__file__.replace('selected.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
for d in D:
 if d['_source']['line'] in set(map(int,sys.argv[1:])):
  print('d',d['_source']['line'],'answers',d.get('answers'),'best',d.get('rollout_best_chosen'),'guard',d.get('guard'),'rollout',d.get('rollout'))
  print('plans',{k:{z:v.get(z) for z in ['plays','hp_lost','damage_dealt','block_gained','rollout_best','potions_used','enemies_after']} for k,v in ((k,json.loads(v)) for k,v in ((d.get('questions') or {}).get('plan') or {}).get('criteria',{}).items())})
  print('bosssim',d.get('boss_sim'))

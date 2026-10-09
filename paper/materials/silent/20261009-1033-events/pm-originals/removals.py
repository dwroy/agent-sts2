exec(open(__file__.replace('removals.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
R=json.load((p/'E6DYYXRX7GVE-resources.json').open())
for c in R['combats']:
 if c['floor'] not in [5,12,14,17,24,35,42]:continue
 print('F',c['floor'])
 prev=None
 for x in S:
  if not c['entry']['line']<=x['_source']['line']<=(c.get('exit') or c['last'])['line']:continue
  s=x['state'];es=(s.get('combat') or {}).get('enemies',[])
  cur={(e['enemy_id'],e['max_hp']):e for e in es if e['is_alive']}
  if prev:
   old,pr=prev
   for k in old.keys()-cur.keys():print('removed',k,'lastHP',old[k]['current_hp'],'turn',pr['state']['turn'],'lines',pr['_source']['line'],x['_source']['line'])
  prev=cur,x
print('totals combats',len(R['combats']), 'battle floors',len(set(c['floor'] for c in R['combats'])))

exec(open(__file__.replace('checkdetails.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
mode=sys.argv[1]
if mode=='heal':
 prev=None
 for x in S:
  s=x['state'];c=s.get('combat') or {};r=s['run']; es=c.get('enemies') or []
  if r['floor']==33 and len(es)==1 and prev:
   y=prev['state'];ee=(y.get('combat') or {}).get('enemies') or []
   if y['turn']==s['turn'] and len(ee)==1 and es[0]['current_hp']>ee[0]['current_hp']: print('added',prev['_source']['line'],x['_source']['line'],s['turn'],ee[0]['current_hp'],es[0]['current_hp'])
  if r['floor']==33 and prev and s['turn']!=prev['state']['turn'] and s['turn']>1:
   ee=(prev['state'].get('combat') or {}).get('enemies') or []
   print('boundary',prev['_source']['line'],x['_source']['line'],prev['state']['turn'],[(z['current_hp'],[(a.get('power_id'),a.get('amount')) for a in z.get('powers',[])]) for z in ee],[(z['current_hp'],[(a.get('power_id'),a.get('amount')) for a in z.get('powers',[])]) for z in es])
  prev=x
elif mode=='extra':
 for x in S:
  if x['_source']['line'] in [318494,318495,318998,318999,319000,319001,318530,318724,318767,318969,319006]:print(x['_source']['line'],x['state']['run']['floor'],x['state']['run']['current_hp'],len(x['state']['run']['deck']),[(z['enemy_id'],z['current_hp']) for z in (x['state'].get('combat') or {}).get('enemies',[])])
 print('fatal dec',[(d['_source']['line'],d.get('rationale'),d.get('sl_attempt'),d.get('rollout')) for d in D if d['floor']==45 and d['turn']==6])
 print('raw clock mentions',sum('act_boss_clock' in str(d.get('questions')) for d in D))
 print('last powerplays',[(d['_source']['line'],d['floor'],d['turn'],d.get('rationale')) for d in D if d.get('chosen',{}).get('action')=='play_card' and '群蛇形态' in d.get('rationale','')])
elif mode=='priors':
 runs={'C48LLXBGKXQ9','Z6CFLDR3N4SB','10GPK5XGHCK3'}; keep=False
 for line in Path('notes/lessons.md').open():
  if line.startswith('## '): keep=any(line.startswith('## '+run+'（') for run in runs) and '静默猎手' in line
  if keep and line.startswith('- ['): print(line[:1450])

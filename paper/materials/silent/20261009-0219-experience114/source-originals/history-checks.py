import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))['entries'];R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
result=[]
for c in C:
 e=c['after'];kind,ident=e['scope'].split(':',1)
 if kind not in ['card','potion']:continue
 actions=[a for a in A['cards' if kind=='card' else 'potions'] if a['run'] in e['evidence'] and (a.get('card') if kind=='card' else (a.get('potion') or {}).get('id'))==ident]
 row=dict(id=e['id'],n_actions=len(actions),by_asc=dict(collections.Counter(R[a['run']]['ascension'] for a in actions)),exception_windows=[])
 for a in actions:
  p=a['before']['powers'];q=a['after']['powers']
  if ident in ['FOOTWORK','NOXIOUS_FUMES','ACCELERANT']:
   key='DEXTERITY_POWER' if ident=='FOOTWORK' else ident+'_POWER';gain=q.get(key,0)-p.get(key,0)
   if gain not in ([2,3] if ident in ['FOOTWORK','NOXIOUS_FUMES'] else [1,2]):row['exception_windows'].append(dict(run=a['run'],floor=a['floor'],turn=a['turn'],ts=a['ts'],delta=gain,before=a['before'],after=a['after']))
  if ident in ['DEXTERITY_POTION','REGEN_POTION']:
   key='DEXTERITY_POWER' if ident=='DEXTERITY_POTION' else 'REGEN_POWER'
   assert q.get(key,0)-p.get(key,0)==(2 if ident=='DEXTERITY_POTION' else 5),(ident,a['run'],a['ts'])
 result.append(row)
rows=[a for a in A['cards'] if a['card']=='CALCULATED_GAMBLE' and '保留' in (a['text'] or '')]
gambles=[]
for run in dict.fromkeys(a['run'] for a in rows):
 S=[json.loads(l) for l in (O/run/'states.jsonl').open()];T=[s['ts'] for s in S]
 for a in [a for a in rows if a['run']==run]:
  i=bisect.bisect_left(T,a['ts']);b,z=S[i]['state'],S[i+1]['state'];hand=b['combat']['hand'];new=z['combat']['hand']
  card=next(c for c in hand if c['card_id']=='CALCULATED_GAMBLE')
  assert card['upgraded'] and len(new)==len(hand)-1,(run,a['ts'],len(hand),len(new))
  assert any('CALCULATED_GAMBLE' in c['card_ids'] for c in z['agent_view']['combat']['exhaust'])
  gambles.append(dict(run=run,asc=R[run]['ascension'],floor=a['floor'],turn=a['turn'],ts=a['ts'],old=[c['card_id'] for c in hand],new=[c['card_id'] for c in new],n=len(new)))
(O/'historical-trigger-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'gamble-history.json').write_text(json.dumps(gambles,ensure_ascii=False,indent=2)+'\n')
print('历史建层/实饮核验',[(r['id'],r['n_actions'],len(r['exception_windows'])) for r in result])
print('升级全弃',len(gambles),'次',len(set(a['run'] for a in gambles)),'局',dict(collections.Counter(a['asc'] for a in gambles)))

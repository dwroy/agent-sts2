import json, pathlib, collections, datetime
p=pathlib.Path(__file__).parent
runs=['TU3XB4CAEDAW','V0383V5S9BCQ']
handles={r:(p/(r+'.states.jsonl')).open('w') for r in runs}
counts=collections.Counter()
with open('logs/states.jsonl','rb') as f:
 f.seek(8068600000);f.readline(); start=f.tell()
 while True:
  off=f.tell(); line=f.readline()
  if not line: break
  x=json.loads(line)
  if x['ts']>'2026-10-06T20:01:23.000Z': break
  r=x.get('state',{}).get('run_id')
  if r in handles:
   handles[r].write(line.decode());counts[r]+=1
 end=f.tell()
for h in handles.values():h.close()
print('states offsets',start,end,'counts',dict(counts))
with open('logs/deepseek-reasoning.jsonl','rb') as f:
 f.seek(-2000000,2);f.readline();last=None
 for l in f:
  try:last=json.loads(l)
  except:pass
 print('deepseek last fields',list(last),'ts',last.get('ts'))
for r in runs:
 d=[json.loads(l) for l in (p/(r+'.decisions.jsonl')).open()]
 s=[json.loads(l) for l in (p/(r+'.states.jsonl')).open()]
 # Match the state seen by each decision, with exact observed timestamp first.
 byts={x['ts']:x for x in s}; byobs={x.get('observed_ts'):x for x in s}
 matched=[]
 for x in d:
  z=byts.get(x.get('observed_ts')) or byobs.get(x.get('observed_ts'))
  if not z:
   candidates=[a for a in s if a['ts']<=x['ts'] and a.get('fingerprint')==x.get('fingerprint')]
   z=candidates[-1] if candidates else None
  if z: matched.append((x,z['state']))
 print(r,'matched',len(matched),'of',len(d))
 summary=[]
 groups=collections.OrderedDict()
 for x,z in matched:
  if x['label'].startswith('combat/'):
   key=(x['floor'],x.get('sl_reloads',0),x['turn'])
   groups.setdefault(key,[]).append((x,z))
 for (floor,reload,turn),a in groups.items():
  x,z=a[0];lx,lz=a[-1]; cp=z['combat'];lp=lz['combat']['player']
  summary.append({'floor':floor,'reload':reload,'turn':turn,'ts':x['ts'],'hp':cp['player']['current_hp'],'maxhp':cp['player']['max_hp'],'enemy':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','powers','intents']} for e in cp['enemies']], 'powers':cp['player']['powers'],'last_hp':lp['current_hp'],'last_block':lp['block'],'last_energy':lp['energy'],'last_enemy':lz['combat']['enemies'],'plays':[{'ts':xx['ts'],'decider':xx['decider'],'label':xx['label'],'chosen':xx.get('chosen'),'rationale':xx['rationale'],'journal':xx.get('journal'),'hand':zz['combat']['hand'],'powers':zz['combat']['player']['powers']} for xx,zz in a]})
 (p/(r+'.turns.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2))
 jev=[x for x in d if x['decider']=='jev']; combat=[x for x in jev if x['label'].startswith('combat/')]; good=[x for x in combat if isinstance(x.get('rollout_best_chosen'),bool)]
 print('stats',r,'seconds',(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds(),'jev',len(jev),'low',sum((x.get('confidence') or 0)<.35 for x in jev),'combat_low',sum((x.get('confidence') or 0)<.35 for x in combat),'best',sum(x['rollout_best_chosen'] for x in good),'denom',len(good),'missing',len(combat)-len(good))
 print('turns',len(groups),'no jev combat',sum(not any(x['decider']=='jev' for x,z in a) for a in groups.values()),'code noncontinue turns',sum(any(x['decider']=='code' and x['label']!='combat/plan-continue' for x,z in a) for a in groups.values()),'code nonend turns',sum(any(x['decider']=='code' and x['label']!='combat/plan-continue' and x.get('chosen',{}).get('action')!='end_turn' for x,z in a) for a in groups.values()))
 print('guard rows')
 for x in d:
  if any(k for k in x if 'guard' in k) or 'guard' in x['rationale'].lower() or 'dominan' in x['rationale'].lower(): print(x['floor'],x['turn'],x['rationale'],{k:v for k,v in x.items() if 'guard' in k or 'dominan' in k})
 print('brain',collections.Counter(json.loads(l)['engine'] for l in (p/'brain.jsonl').open() if json.loads(l)['run_id']==r))
 print('sl',[(x['floor'],x['attempt'],x['result'],x.get('turns'),x.get('end_hp')) for l in (p/'sl.jsonl').open() if (x:=json.loads(l))['run_id']==r])

import bisect,collections,json,hashlib
from pathlib import Path
O=Path(__file__).parent;N='ZTRGYYMLR8SC';R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};bronze=[];wail=[];frail=[];fan=[];strength=[]
def pw(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def enemy(e):return dict(id=e['enemy_id'],index=e['index'],hp=e['current_hp'],block=e['block'],powers=pw(e),intents=e['intents'])
for run in json.load(open(O/'runs.json')):
 S=[json.loads(s) for s in (O/run/'states.jsonl').open()];M={s['ts']:s['state'] for s in S};times=[s['ts'] for s in S]
 for line in (O/run/'decisions.jsonl').open():
  d=json.loads(line);c=d.get('chosen') or {}
  if not str(d.get('result','')).startswith('completed'):continue
  s=M.get(d['ts']);i=bisect.bisect_right(times,d['ts']);z=S[min(i,len(S)-1)]['state']
  if not s:continue
  base=dict(run=run,asc=R[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'])
  C=s.get('combat') or {};Z=z.get('combat') or {};p=C.get('player') or {};q=Z.get('player') or {}
  if c.get('action')=='play_card':
   card=(d.get('expect') or {}).get('card',{}).get('id')
   if card in ['PIERCING_WAIL','FAN_OF_KNIVES']:
    row=dict(base,card=card,text=next((h.get('resolved_rules_text') for h in C.get('hand',[]) if h['card_id']==card),None),before=dict(hp=s['run']['current_hp'],powers=pw(p),hand=[h['card_id'] for h in C.get('hand',[])],enemies=[enemy(e) for e in C.get('enemies',[])]),after=dict(hp=z['run']['current_hp'],powers=pw(q),hand=[h['card_id'] for h in Z.get('hand',[])],enemies=[enemy(e) for e in Z.get('enemies',[])]))
    (wail if card=='PIERCING_WAIL' else fan).append(row)
   if any(x['power_id']=='FRAIL_POWER' and x['amount']>0 for x in p.get('powers',[])):
    played=next((h for h in C.get('hand',[]) if h['card_id']==card),{})
    if any(v['name']=='Block' for v in played.get('dynamic_values',[])):
     frail.append(dict(base,card=card,values=played['dynamic_values'],powers=pw(p),block_before=p.get('block'),block_after=q.get('block')))
  sel=s.get('selection') or {}
  if c.get('action')=='select_deck_card' and sel.get('kind')=='combat_hand_select' and '丢弃' in sel.get('prompt','') and sel.get('max_select')==1 and not sel.get('requires_confirmation') and any(r['relic_id']=='TINGSHA' for r in s['run'].get('relics',[])) and C and Z and s['turn']==z['turn']:
   a={e['index']:e for e in C['enemies']};b={e['index']:e for e in Z['enemies']}
   if set(a)!=set(b):continue
   delta=sum(a[k]['current_hp']+a[k]['block']-b[k]['current_hp']-b[k]['block'] for k in a)
   bronze.append(dict(base,selected=d.get('expect',{}).get('option'),delta=delta,before=[enemy(e) for e in a.values()],after=[enemy(e) for e in b.values()],powers_before=pw(p),powers_after=pw(q)))
for name,rows in [('wail',wail),('fan',fan),('frail',frail),('tingsha',bronze)]:
 (O/('historical-'+name+'.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print(name,'独立局',len({r['run'] for r in rows}),'动作',len(rows),'分阶',dict(collections.Counter(r['asc'] for r in rows)))
 if name=='tingsha':print('增量',dict(collections.Counter(r['delta'] for r in rows)),'逐局',[(n,collections.Counter(r['delta'] for r in rows if r['run']==n)) for n in dict.fromkeys(r['run'] for r in rows)])
F=json.load(open(O/N/'facts.json'))
last=next(r for r in F if (r['floor'],r['attempt'],r['turn'],r['action'])==(17,6,14,'end_turn'))
assert (last['before']['hp'],last['before']['block'],last['after']['hp'])==(4,6,0)
assert last['before']['enemies'][0]['hp']==58
last.update(full_attack=13,full_loss=7,strict_extra_hp=4)
(O/'terminal-facts.json').write_text(json.dumps(last,ensure_ascii=False,indent=2)+'\n')
for potion,power in [('HEART_OF_IRON','PLATING_POWER'),('STRENGTH_POTION','STRENGTH_POWER')]:
 rows=[]
 for run in R:
  S=[json.loads(s) for s in (O/run/'states.jsonl').open()];M={s['ts']:s['state'] for s in S};times=[s['ts'] for s in S]
  for line in (O/run/'decisions.jsonl').open():
   d=json.loads(line)
   if (d.get('chosen') or {}).get('action')!='use_potion' or not str(d.get('result','')).startswith('completed') or (d.get('expect') or {}).get('potion',{}).get('id')!=potion:continue
   a=M[d['ts']];z=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state'];p=(a.get('combat') or {}).get('player') or {};q=(z.get('combat') or {}).get('player') or {}
   rows.append(dict(run=run,asc=R[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],before=pw(p),after=pw(q),delta=pw(q).get(power,0)-pw(p).get(power,0),block_before=p.get('block'),block_after=q.get('block')))
 (O/('historical-'+potion.lower()+'.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print(potion,len({r['run'] for r in rows}),len(rows),dict(collections.Counter(r['delta'] for r in rows)))
other=[]
for path in sorted(Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent').glob('*.json')):
 if path.name=='experience.json':continue
 x=json.load(open(path));other.append(dict(file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),keys=list(x)[:18],metadata={k:x[k] for k in ['character','ascension','generated','limitation','generated_at'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('末帧完整结算核验通过，其他知识',len(other))

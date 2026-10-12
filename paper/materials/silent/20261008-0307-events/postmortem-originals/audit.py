import json,collections
from pathlib import Path
p=Path(__file__).resolve().parent; rid='BTSRF7JL1W1Y'
d=json.loads((p/f'{rid}-decisions.json').read_text()); r=json.loads((p/f'{rid}-resources.json').read_text())
s=[]
with (p/f'{rid}-states-indexed.jsonl').open() as f:
 for line in f:
  n,offset,raw=line.split(':',2); row=json.loads(raw); row['_line']=int(n); row['_offset']=int(offset); s.append(row)
(p/f'{rid}-states.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
lines=[]
for row in s:
 st=row['state']; run=st.get('run',{}); co=st.get('combat') or {}; floor=run.get('floor')
 if floor not in [9,17,30,31]: continue
 enemies=[{k:e.get(k) for k in ['index','name','enemy_id','current_hp','block','is_alive','powers','intents']} for e in co.get('enemies',[])]
 player=co.get('player') or {}; info={'line':row['_line'],'ts':row.get('ts'),'floor':floor,'turn':st.get('turn'),'screen':st.get('screen'),'hp':run.get('current_hp'),'block':player.get('block'),'player':player,'enemies':enemies,'hand':[{k:c.get(k) for k in ['index','name','card_id','cost','is_playable','description']} for c in co.get('hand',[])]}
 lines.append(info)
(p/'key-states.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in lines))
print('帧',len(s),s[0]['_line'],s[-1]['_line'],'state keys',list(s[-2]['state']),'combat keys',list(s[-2]['state'].get('combat',{})))
print('决策',len(d),d[0]['_line'],d[-1]['_line'],collections.Counter(x['decider'] for x in d))
for x in d:
 if x['floor'] in [30,31]:
  print(x['_line'],x['floor'],x['turn'],x['decider'],x['label'],x['chosen'],x['rationale'])
print('SL')
for x in json.loads((p/f'{rid}-sl-attempts.json').read_text()):
 print({k:x.get(k) for k in ['_line','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','judge']})
 ex=x.get('explore') or {}; print('换线',ex.get('deviation'),'锚点',(ex.get('target') or {}).get('anchor'))

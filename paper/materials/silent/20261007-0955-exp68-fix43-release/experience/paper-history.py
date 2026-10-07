import collections,json
from pathlib import Path
O=Path(__file__).parent;R=json.load(open(O/'runs.json'));out={};inventory={}
for run in R:
 prev=None;frames=[];floors=set()
 for l in (O/run/'states.jsonl').open():
  x=json.loads(l);s=x['state'];c=s.get('combat') or {};en=c.get('enemies') or []
  has=[e for e in en if any(p['power_id']=='PAPER_CUTS_POWER' and p['amount']==2 for p in e.get('powers',[]))]
  if has:floors.add(s['run']['floor'])
  if has and prev:
   b=prev['state']
   if b.get('combat') and b['run']['floor']==s['run']['floor'] and b['turn']==s['turn'] and b['run']['max_hp']!=s['run']['max_hp']:
    frames.append(dict(ts=x['ts'],floor=s['run']['floor'],turn=s['turn'],before_hp=b['run']['current_hp'],after_hp=s['run']['current_hp'],before_max=b['run']['max_hp'],after_max=s['run']['max_hp'],before_block=b['combat']['player']['block'],after_block=c['player']['block'],intents=[e['intents'] for e in b['combat']['enemies']]))
  prev=x
 if floors:inventory[run]=dict(floors=sorted(floors),asc=s['run']['ascension'],changes=len(frames))
 if frames:out[run]=frames
(O/'paper-history.json').write_text(json.dumps(dict(inventory=inventory,changes=out),ensure_ascii=False,indent=2)+'\n')
print('静默纸伤2遭遇',inventory)
for run in ['9YBKCNBFP0X5','YLYLZWHA0GKU']:print(run,out.get(run))

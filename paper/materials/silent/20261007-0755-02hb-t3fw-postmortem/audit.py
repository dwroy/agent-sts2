import json,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem')
expected={
 '02HB4L0C3C67':{3:([49,49,34,22,15],[0,15,12,7,15],[0,0,0,6,0]),4:([42,33,29,23,14,8],[9,4,6,9,6,8],[0,0,0,0,2,0]),6:([67,37,29,18,12],[30,8,11,6,12],[0,9,6,0,0]),12:([150,132,123,114,105,96,72,51],[18,9,9,9,9,24,21,15],[6,2,8,0,14,0,0,6])},
 'T3FW7R2R2306':{2:([58,46,31,25,10,4],[12,15,6,15,6,4],[0,0,0,4,0,0]),3:([46,38,32,20,20,11],[8,6,12,0,9,11],[0,0,0,0,0,0]),4:([42,24,14,14,8],[18,10,0,6,8],[0,1,0,0,0]),5:([64,56,47,45,33,6],[8,9,2,12,27,6],[4,1,0,0,6,0]),8:([90,81,79,61,48,25],[9,2,18,13,23,12],[6,0,16,5,18,16])}}
allout={}
for run,ex in expected.items():
 st=[json.loads(l) for l in (p/(run+'-states.jsonl')).open()];first={}
 for i,ob in enumerate(st):
  s=ob['state'];f=s['run']['floor'];t=s.get('turn')
  if s.get('in_combat') and any(x in s.get('available_actions',[]) for x in ['play_card','end_turn']):first.setdefault((f,t),(i,ob))
 out={}
 for f,arr in ex.items():
  starts=[v for k,v in first.items() if k[0]==f]
  end=next(ob for ob in st[starts[-1][0]+1:] if ob['state']['run']['floor']==f and ob['state']['screen'] in ['REWARD','GAME_OVER'])
  frames=[ob for _,ob in starts]+[end]
  eh=[sum(x['current_hp'] for x in (ob['state'].get('combat') or {}).get('enemies',[])) for ob in frames]
  ph=[ob['state']['run']['current_hp'] for ob in frames]
  actual=(eh[:-1],[x-y for x,y in zip(eh,eh[1:])],[x-y for x,y in zip(ph,ph[1:])])
  assert actual==arr,(run,f,actual,arr)
  out[str(f)]={'进场':ph[0],'战后':ph[-1],'需':actual[0],'扣':actual[1],'损':actual[2]}
 a=[json.loads(l) for l in (p/'decisions.jsonl').open() if run in l]
 guards=[d for d in a if 'HP guard:' in d['rationale']]
 low=[d for d in a if d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35]
 jc=[d for d in a if d['decider']=='jev' and d['label'].startswith('combat/')]
 elapsed=(datetime.datetime.fromisoformat(a[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(a[0]['ts'].replace('Z','+00:00'))).total_seconds()
 out['统计']={'护栏次数':len(guards),'低信心':len(low),'战斗低信心':sum(d['label'].startswith('combat/') for d in low),'原答最优':dict(collections.Counter(str(d.get('rollout_best_chosen')) for d in jc)),'决策数':len(a),'用时秒':elapsed}
 allout[run]=out
 print(run,json.dumps(out,ensure_ascii=False))
(p/'verified-numbers.json').write_text(json.dumps(allout,ensure_ascii=False,indent=2))
print('逐轮数组核对通过')

import json,pathlib,collections
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem')
def rows(name):
 for raw in (P/name).open():
  n,t=raw.split(':',1); d=json.loads(t);d['_line']=int(n);yield d
D=list(rows('decisions-numbered.jsonl'));S=list(rows('states-numbered.jsonl'))
for d in D:
 if d['floor']==31 and d['label'] in ['combat/plan-choice+potion','combat/play','combat/least-loss']:
  print('题',d['_line'],'T',d['turn'],'HP',json.loads(d['fingerprint']).get('hp'),d['chosen'])
  print('题键',list(d)); print('输入',json.dumps(d.get('question') or d.get('jev') or {},ensure_ascii=False)[:200]); print('题面',json.dumps(d.get('options') or d.get('prompt') or d.get('choices') or d.get('input'),ensure_ascii=False)[:200])
  if d['_line'] in [281953,281960,281972,281976,281984,281998,282021,282022]:
   print('题内容',json.dumps(d,ensure_ascii=False)[:16000])
print('逐帧千足')
for d in S:
 s=d['state']; r=s['run']; c=s.get('combat')
 if r['floor']!=31 or not c:continue
 p=c.get('player') or {};en=c.get('enemies') or []
 print(d['_line'],s.get('turn'),'HP',r.get('current_hp'),'挡',p.get('block'),'E',p.get('energy'),'P',[(x['power_id'],x['amount']) for x in p.get('powers',[])],'敌',[(e['index'],e['enemy_id'].split('_')[-1],e['current_hp'],e['is_alive'],[(x['power_id'],x['amount'])for x in e.get('powers',[])],[(x['intent_type'],x.get('damage'),x.get('hits'))for x in e.get('intents',[])])for e in en],'手',[(x['index'],x['card_id'],x.get('energy_cost'))for x in c.get('hand',[])])

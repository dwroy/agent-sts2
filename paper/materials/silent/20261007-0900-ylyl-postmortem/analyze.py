import json,collections,datetime
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-084302-postmortem')
D=[json.loads(l) for l in (P/'decisions.jsonl').open()];S=[json.loads(l) for l in (P/'states.jsonl').open()];byts={x['ts']:x for x in S}
def enemyhp(c):return sum(e['current_hp'] for e in c['enemies'] if e['is_alive'])
def frame(x):
 if x['ts'] in byts:return byts[x['ts']]
 return max((s for s in S if s['ts']<=x['ts']),key=lambda s:s['ts'])
F=[]
for f in sorted(set(x['floor'] for x in D if x['label'].startswith('combat/'))):
 dd=[x for x in D if x['floor']==f and x['label'].startswith('combat/')];sf=[x for x in S if x['state']['run']['floor']==f];initial=frame(dd[0])['state'];rn=[]
 for t in sorted(set(x['turn'] for x in dd)):
  dt=[x for x in dd if x['turn']==t];a=frame(dt[0])['state'];c=a['combat'];following=[x for x in sf if x['ts']>dt[-1]['ts'] and (x['state']['turn']!=t or not x['state']['in_combat'])]
  b=(following[0] if following else sf[-1])['state'];bc=b.get('combat');afterhp=enemyhp(bc) if bc else 0
  end=frame(dt[-1])['state']['combat'];incoming=sum(i.get('total_damage') or 0 for e in end['enemies'] if e['is_alive'] for i in e['intents'])
  rn.append({'turn':t,'hp':c['player']['current_hp'],'max':c['player']['max_hp'],'need':enemyhp(c),'damage':enemyhp(c)-afterhp,'loss':c['player']['current_hp']-b['run']['current_hp'],'end_hp':end['player']['current_hp'],'block':end['player']['block'],'incoming':incoming,'powers':[(v['power_id'],v['amount']) for v in c['player']['powers']],'enemy_powers':[(e['enemy_id'],e['max_hp'],[(v['power_id'],v['amount']) for v in e['powers']]) for e in c['enemies']]})
 F.append({'floor':f,'enemy':[(e['name'],e['enemy_id'],e['max_hp']) for e in initial['combat']['enemies']],'start':initial['run']['current_hp'],'end':sf[-1]['state']['run']['current_hp'],'rounds':rn})
print('战斗表')
for f in F:
 print(f['floor'],f['enemy'],f['start'],'→',f['end'],'需',[r['need'] for r in f['rounds']],'扣',[r['damage'] for r in f['rounds']],'损',[r['loss'] for r in f['rounds']])
jev=[x for x in D if x['decider']=='jev'];low=[x for x in jev if x.get('confidence') is not None and x['confidence']<.35];ro=[x for x in jev if 'rollout_best_chosen' in x];cd=[x for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'];jt={(x['floor'],x['turn']) for x in jev if x['label'].startswith('combat/')};rt={(x['floor'],x['turn']) for x in D if x['label'].startswith('combat/')}
print('计数',len(jev),'低',len(low),collections.Counter('战斗' if x['label'].startswith('combat/') else '选择' for x in low),'推演',collections.Counter(x['rollout_best_chosen'] for x in ro),'回合',len(rt),'没Jev',len(rt-jt),'代码自主条',len(cd),'覆盖',len({(x['floor'],x['turn']) for x in cd}),'非结束覆盖',len({(x['floor'],x['turn']) for x in cd if x['chosen']['action']!='end_turn'}))
print('续步',collections.Counter('Jev' if 'Jev-chosen' in x['rationale'] else '代码' for x in D if x['label']=='combat/plan-continue'))
print('大脑实际',collections.Counter((x.get('deepseek') or {}).get('brain',{}).get('engine','无新请求') for x in D if x['decider']=='codex'))
print('HP字段',[(x['floor'],x['turn'],k,v) for x in D for k,v in x.items() if 'guard' in k or 'override' in k])
print('药水动作')
for x in D:
 if x['chosen']['action'] in ['use_potion','discard_potion'] or (x['label']=='reward/claim' and 'potion' in str(x['chosen'])):print(x['floor'],x['turn'],x['chosen'],x['rationale'])
prev=[]
for x in S:
 r=x['state']['run'];pot=[(v.get('potion_id'),v.get('name')) for v in r.get('potions',[]) if v.get('potion_id')]
 if pot!=prev:print('药栏',x['ts'],r['floor'],x['state']['turn'],pot);prev=pot
print('时长',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds())
(P/'analysis.json').write_text(json.dumps({'fights':F,'low_confidence':[(x['floor'],x['turn'],x['label'],x['confidence']) for x in low]},ensure_ascii=False,indent=2))

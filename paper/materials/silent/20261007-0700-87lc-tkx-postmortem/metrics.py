import json,pathlib,collections
p=pathlib.Path('learner/runs/20261007-064303-postmortem')
for run in ['87LCSDR5P3DL','TKXQ6L4N9A6U']:
 ds=[json.loads(l) for l in (p/(run+'.decisions.jsonl')).open()];ss=[json.loads(l) for l in (p/(run+'.states.jsonl')).open()]
 print('\n局',run)
 roundkey=0;prev=None;rounds={};mapped={}
 for d in ds:
  if not d['label'].startswith('combat/'):continue
  pair=(d['floor'],d['turn'])
  if pair!=prev:roundkey+=1;prev=pair
  rounds.setdefault(roundkey,[]).append(d);mapped[d['decision_id']]=roundkey
 print('实体战斗轮',len(rounds),'无Jev战斗题',sum(not any(x['decider']=='jev' and x['label'].startswith('combat/plan-choice') for x in rows) for rows in rounds.values()))
 own=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
 print('代码自主非续步',len(own),'覆盖轮',len({mapped[d['decision_id']] for d in own}),'非结束行动覆盖',len({mapped[d['decision_id']] for d in own if d.get('chosen',{}).get('action')!='end_turn'}))
 print('续步',collections.Counter('Jev续步' if 'Jev-chosen' in d['rationale'] else '代码续步' for d in ds if d['label']=='combat/plan-continue'))
 focusds=[d for d in ds if d.get('focus')]; chosen=[(d['floor'],d['turn'],d['focus'].get(d.get('answers',{}).get('plan',{}).get('choice'))) for d in focusds];print('focus提供/原答选中',len(focusds),sum(x[2] is not None for x in chosen),chosen)
 print('HP护栏',[(d['floor'],d['turn'],d['rationale']) for d in ds if 'HP guard' in d['rationale']])
 old=collections.Counter()
 for row in ss:
  s=row['state'];r=s.get('run',{});pots=collections.Counter(x.get('potion_id') for x in r.get('potions',[]) if x.get('potion_id'));added=pots-old;lost=old-pots
  if added or lost:print('药栏变化',r.get('floor'),s.get('turn'),row['ts'],'加',dict(added),'减',dict(lost))
  old=pots
 for d in ds:
  if d['label']=='rest/plan':print('营火',d['floor'],json.loads(d['fingerprint'])['hp'],d.get('journal',{}).get('choice'))
 print('SL总',max(d.get('sl_reloads',0) or 0 for d in ds),'Jev缓存字段',[k for d in ds if d['decider']=='jev' for k in d.get('usage',{}) if 'cache' in k])

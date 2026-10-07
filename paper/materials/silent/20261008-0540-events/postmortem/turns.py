import json,pathlib,collections,re,datetime
p=pathlib.Path('learner/runs/20261008-051302-postmortem'); load=lambda n:[json.loads(s) for s in (p/(n+'.jsonl')).open()]; d=load('decisions');s=load('states');res=json.loads((p/'MTQ0EUBJ3R6T-resources.json').read_text())
def hp(r):return r['state']['run']['current_hp']
def eh(r):return sum(e['current_hp'] for e in (r['state'].get('combat') or {}).get('enemies',[]) if e['is_alive'])
for c in res['combats']:
 rows=[r for r in s if c['entry']['line']<=r['_line']<=((c.get('exit') or c['last'])['line'])];first={}
 for r in rows:
  st=r['state'];co=st.get('combat') or {}
  if co.get('hand') and st.get('turn') not in first:first[st['turn']]=r
 vals=list(first.values());end=rows[-1]
 print('轮账',c['sequence'],c['floor'],'需',[eh(r) for r in vals],'扣',[eh(r)-eh(a) for r,a in zip(vals,vals[1:]+[end])],'损',[hp(r)-hp(a) for r,a in zip(vals,vals[1:]+[end])],'首帧',[(r['_line'],hp(r)) for r in vals])
for r in s:
 st=r['state'];floor=st['run']['floor'];co=st.get('combat') or {}
 if floor in [20,23] and co.get('hand'):
  print('帧',r['_line'],floor,st['turn'],'HP',hp(r),'玩家',co.get('player'),'powers',co.get('powers'),'敌',[(e.get('index'),e['name'],e['current_hp'],e.get('block'),e.get('powers'),e.get('intent')) for e in co.get('enemies',[])],'手',[(h.get('index'),h.get('card_id'),h.get('cost')) for h in co['hand']])
for r in d:
 if r['floor'] in [11,20,23] and r['label'].startswith('combat/') and r['label']!='combat/plan-continue':
  j=r.get('journal') or {}; print('决策',r['_line'],r['floor'],r['turn'],r.get('sl_attempt'),r['label'],r['rationale'],'JOURNAL',json.dumps(j,ensure_ascii=False)[:1500])
combat=[r for r in d if r['decider']=='jev' and r['label'].startswith('combat/')]
print('RANK1',sum(bool(re.search(r'code rank 1(?:\D|$)',r['rationale'])) for r in combat),len(combat));print('JOURNALKEYS',combat[0]['journal'].keys());print('ROLLOUT',collections.Counter(str(r.get('journal',{}).get('rollout_best_chosen')) for r in combat))
print('FOCUS',[(r['_line'],r['floor'],r['turn'],r['chosen']) for r in combat if 'focus' in json.dumps(r.get('chosen',{}))]);print('TIME',(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds())

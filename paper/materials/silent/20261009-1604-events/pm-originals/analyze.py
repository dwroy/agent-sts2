import json,collections,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-154302-postmortem')
ds=[json.loads(l) for l in (p/'decisions.jsonl').open()]; ss=[json.loads(l) for l in (p/'states.jsonl').open()]; r=json.load((p/'64R0P0MTZWAX-resources.json').open())
def powers(x): return {v['power_id']:v.get('amount') for v in x.get('powers',[])}
def slim(s):
 st=s['state']; c=st.get('combat') or {}; pl=c.get('player') or {}
 return {'s':s['_line'],'ts':s['ts'],'f':st['run']['floor'],'t':st.get('turn'),'hp':st['run']['current_hp'],'max':st['run']['max_hp'],'screen':st['screen'],'block':pl.get('block'),'energy':pl.get('energy'),'played':pl.get('cards_played_this_turn'),'pp':powers(pl),'enemies':[{'i':e.get('index'),'id':e.get('enemy_id'),'hp':e.get('current_hp'),'max':e.get('max_hp'),'block':e.get('block'),'ep':powers(e),'move':e.get('move_id'),'intents':e.get('intents')} for e in c.get('enemies',[])],'hand':[(h.get('index'),h.get('card_id'),h.get('energy_cost')) for h in c.get('hand',[])]}
with (p/'frames.txt').open('w') as out:
 for c in r['combats']:
  frames=[s for s in ss if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']]
  if c['floor'] not in [17,25,28,30,33]:continue
  out.write('COMBAT '+str(c['sequence'])+'\n')
  turns=collections.defaultdict(list)
  for s in frames: turns[s['state'].get('turn')].append(s)
  for t,xs in turns.items():
   for s in [xs[0],xs[-2] if len(xs)>1 else xs[0],xs[-1]]:
    out.write(json.dumps(slim(s),ensure_ascii=False)+'\n')
  out.write('\n')
with (p/'decisions-compact.txt').open('w') as out:
 for d in ds:
  out.write(json.dumps({k:d.get(k) for k in ['_line','ts','floor','turn','sl_attempt','decider','label','chosen','rationale','confidence','rollout_best_chosen','answers','rollout']},ensure_ascii=False)+'\n')
jev=[d for d in ds if d['decider']=='jev']; rb=[d for d in jev if isinstance(d.get('rollout_best_chosen'),bool)]
byturn=collections.defaultdict(list)
for d in ds:
 if d['label'].startswith('combat/') or d['label'].startswith('selection/'):
  byturn[(d['floor'],d.get('sl_attempt') or 1,d.get('turn'))].append(d)
initlabels={'combat/plan','combat/end_turn','combat/lethal','combat/mod-lethal','combat/least-loss'}
auto=[d for d in ds if d['decider']=='code' and d['label'] in initlabels]
m={'decisions':len(ds),'raw_deciders':dict(collections.Counter(d['decider'] for d in ds)),'jev':len(jev),'low':len([d for d in jev if d.get('confidence') is not None and d['confidence']<.35]),'low_by_floor':dict(collections.Counter(d['floor'] for d in jev if d.get('confidence') is not None and d['confidence']<.35)),'best_n':len(rb),'best_yes':sum(d['rollout_best_chosen'] for d in rb),'auto_actions':len(auto),'auto_turns':len({(d['floor'],d.get('sl_attempt') or 1,d.get('turn')) for d in auto}),'combat_turns':len(byturn),'no_jev_turns':sum(not any(d['decider']=='jev' for d in v) for v in byturn.values()),'auto_labels':dict(collections.Counter(d['label'] for d in auto)),'tokens':{},'first_ts':ds[0]['ts'],'last_ts':ds[-1]['ts'],'fallback':sum(bool(d.get('fallback')) for d in ds)}
for dec in ['jev','codex']:
 v=[d for d in ds if d['decider']==dec];m['tokens'][dec]={k:sum((d.get('usage') or {}).get(k,0) or 0 for d in v) for k in ['input_tokens','output_tokens','cache_hit_tokens']}
(p/'metrics.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(json.dumps(m,ensure_ascii=False))
print('POTION ACTIONS')
for d in ds:
 a=d.get('chosen') or {}
 if 'potion' in a.get('action',''): print(d['_line'],d['floor'],d.get('turn'),d.get('sl_attempt'),a,d.get('rationale'))
print('RESOURCE NONCOMBAT')
for e in r['resource_changes']:
 if not e.get('combat_sequence'): print(e)

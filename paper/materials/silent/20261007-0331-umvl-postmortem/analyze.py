import json,collections,bisect
from pathlib import Path
p=Path('learner/runs/20261007-031302-postmortem')
d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
s=[json.loads(x) for x in (p/'states.jsonl').open() if json.loads(x)['state'].get('run_id')=='UMVLWER4CD98']
st=[x['observed_ts'] for x in s]
def before(x):
 i=bisect.bisect_right(st,x['observed_ts'])-1
 return s[max(i,0)]['state']
def hp(a):return (a.get('combat') or {}).get('player',{}).get('current_hp',(a.get('run') or {}).get('current_hp'))
def enemies(a):return (a.get('combat') or {}).get('enemies',[])
def need(a):return sum(x['current_hp'] for x in enemies(a) if x['is_alive'])
def pw(a):return [(x['power_id'],x['amount']) for x in (a.get('combat') or {}).get('player',{}).get('powers',[])]
groups=collections.defaultdict(list)
for x in d:
 if x['label'].startswith('combat/') or (x['screen']=='COMBAT' and x['label'].startswith('selection/')):
  groups[(x['floor'],x.get('sl_reloads',0) or 0)].append(x)
with (p/'rounds.txt').open('w') as out:
 for (floor,sl),ds in groups.items():
  turns=collections.defaultdict(list)
  for x in ds:turns[x['turn']].append(x)
  ts=list(turns); a=before(ds[0]); out.write(f'F{floor} reload{sl} entry{hp(a)}/{a["run"]["max_hp"]} enemies'+str([(x['name'],x['enemy_id'],x['current_hp']) for x in enemies(a)])+'\n')
  for j,t in enumerate(ts):
   a=before(turns[t][0]); b=before(turns[ts[j+1]][0]) if j+1<len(ts) else None
   if b is None:
    idx=bisect.bisect_right(st,ds[-1]['observed_ts'])
    while idx<len(s):
     candidate=s[idx]['state'];idx+=1
     if (candidate.get('run') or {}).get('floor')!=floor:break
     b=candidate
     if candidate['screen'] in ('REWARD','GAME_OVER'):break
     if candidate['in_combat'] and candidate['turn'] and candidate['turn']<t:break
   executed=not any('save_and_quit' in json.dumps(x['chosen']) for x in turns[t])
   out.write(f'T{t} hp{hp(a)} need{need(a)} -> hp{hp(b) if b else None} need{need(b) if b else None} netloss{hp(a)-hp(b) if b else None} dmg{need(a)-need(b) if b else None} lastscreen{b["screen"] if b else None} powers{pw(a)}\n')
   if floor==48:
    out.write('  enemy '+str([(e['current_hp'],e['block'],[(z['power_id'],z['amount']) for z in e['powers']],e['intents']) for e in enemies(a)])+'\n')
    out.write('  '+str([(x['label'],x['decider'],x['chosen'],x['rationale']) for x in turns[t]])+'\n')
with (p/'strategy.txt').open('w') as out:
 for x in d:
  if x['decider']=='codex':out.write(str((x['ts'],x['floor'],x['label'],x['chosen'],x['journal']))+'\n')
with (p/'guards.txt').open('w') as out:
 for x in d:
  if 'HP guard' in x.get('rationale',''):
   out.write(str((x['ts'],x['floor'],x['turn'],x.get('sl_reloads'),x['rationale']))+'\n')
   out.write(json.dumps(x.get('questions'),ensure_ascii=False)+'\n')
with (p/'frame48.txt').open('w') as out:
 for x in s:
  a=x['state']
  if a['run']['floor']==48 and a.get('combat'):
   out.write(json.dumps({'ts':x['ts'],'screen':a['screen'],'turn':a['turn'],'hp':hp(a),'block':a['combat']['player']['block'],'energy':a['combat']['player']['energy'],'played':a['combat']['player']['cards_played_this_turn'],'powers':pw(a),'enemies':[(e['current_hp'],e['block'],[(z['power_id'],z['amount']) for z in e['powers']],e['intents']) for e in enemies(a)],'hand':[(c['name'],c['card_id'],c.get('energy_cost'),c.get('resolved_rules_text')) for c in a['combat']['hand']]},ensure_ascii=False)+'\n')
print('groups',list(groups));print('output files ready')
print('jev best',collections.Counter(x.get('rollout_best_chosen') for x in d if x['decider']=='jev' and x['label'].startswith('combat')))
print('jev low',collections.Counter('combat' if x['label'].startswith('combat') else 'selection' for x in d if x['decider']=='jev' and x.get('confidence',1)<.35))
print('guards',sum('HP guard' in x['rationale'] for x in d))

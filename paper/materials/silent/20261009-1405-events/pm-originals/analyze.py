import json,pathlib,collections,re,datetime
p=pathlib.Path(__file__).parent
ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];ss=[json.loads(l) for l in (p/'states.jsonl').open()]
def powers(items): return ','.join(str(x.get('power_id'))+':'+str(x.get('amount')) for x in items or [])
def mini(row):
 s=row['state']; c=s.get('combat') or {}; pl=c.get('player') or {};r=s.get('run') or {}
 return {'s':row['_line'],'ts':row['ts'],'f':r.get('floor'),'t':s.get('turn'),'screen':s['screen'],'hp':r.get('current_hp'),'max':r.get('max_hp'),'block':pl.get('block'),'energy':pl.get('energy'),'powers':powers(pl.get('powers')),'hand':[(v['card_id'],v.get('resolved_rules_text')) for v in c.get('hand',[])],'enemies':[(e.get('enemy_id'),e.get('current_hp'),e.get('block'),powers(e.get('powers')),e.get('move_id'),e.get('intents')) for e in c.get('enemies',[])],'potions':[(v.get('index'),v.get('potion_id')) for v in r.get('potions',[]) if v.get('occupied')]}
with (p/'states-mini.jsonl').open('w') as out:
 for row in ss: out.write(json.dumps(mini(row),ensure_ascii=False)+'\n')
print('STATS',collections.Counter(d['decider'] for d in ds),collections.Counter(d['label'] for d in ds))
print('GUARDS')
for d in ds:
 if re.search('HP guard|guard bound',d['rationale']): print(d['_line'],d['floor'],d['turn'],d['rationale'],d.get('boss_sim'),d.get('journal'))
print('BRAIN')
for d in ds:
 if d['decider']=='codex':print(d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'],d.get('journal'))
print('PLAN KEYS')
for l in (p/'run-plans.jsonl').open():
 r=json.loads(l);print(r['_line'],list(r),str(r)[:600])
print('PHYSICAL ACTIONS')
for d in ds:
 if d['chosen'].get('action') in ('use_potion','discard_potion','claim_reward','buy_potion') or 'potion' in d['label']:print(d['_line'],d['floor'],d['turn'],d['label'],d['chosen'],d['rationale'])

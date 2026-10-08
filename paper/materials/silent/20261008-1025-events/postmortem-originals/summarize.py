import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent
runs=['K2JAGKVJAWZJ','79UCJ0K6R9C1']
def load(run,name):return [json.loads(x) for x in (p/f'{run}-{name}.jsonl').open()]
def pow(obj):return [(q['power_id'],q['amount']) for q in obj.get('powers',[])]
def compact(row):
 s=row['state'];c=s.get('combat') or {};u=c.get('player') or {};run=s.get('run') or {}
 return {'s':row['_line'],'ts':row['ts'],'f':run.get('floor'),'t':s.get('turn'),'screen':s.get('screen'),'hp':run.get('current_hp'),'max':run.get('max_hp'),'belt':[(q['index'],q.get('potion_id')) for q in run.get('potions',[]) if q.get('occupied')], 'b':u.get('block'),'e':u.get('energy'),'pw':pow(u),'hand':[(q['index'],q['card_id'],q['name'],q.get('energy_cost'),q.get('playable')) for q in c.get('hand',[])], 'enemy':[(q['index'],q['name'],q['enemy_id'],q['current_hp'],q['max_hp'],q.get('block'),q['is_alive'],pow(q),q.get('move_id'),[(i.get('intent_type'),i.get('damage'),i.get('hits')) for i in q.get('intents',[])]) for q in c.get('enemies',[])], 'ready':c.get('action_readiness'),'lethal':c.get('end_turn_will_kill_player'),'risk':c.get('lethal_risks'),'selection':s.get('card_selection')}
for r in runs:
 d=load(r,'decisions');s=load(r,'states');rc=json.loads((p/f'{r}-resources.json').read_text());lines=[]
 lines.append(r)
 lines.append('窗口 '+str([(x['_line'],x['ts']) for x in [d[0],d[-1]]]))
 lines.append('时长 '+str((datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds()))
 lines.append('标签 '+str(collections.Counter((x['label'],x['decider']) for x in d)))
 low=[x for x in d if x['decider']=='jev' and x.get('confidence',1)<.35]
 lines.append('低信心 '+str(collections.Counter(x['floor'] for x in low))+' 合计 '+str(len(low)))
 for x in d:
  if x['decider']=='jev' and x['label'].startswith('combat/plan-choice') and (x.get('rollout') or x.get('rollout_best_chosen') is not None):
   lines.append('rollout结构 '+json.dumps({k:v for k,v in x.items() if 'rollout' in k or 'rank' in k},ensure_ascii=False));break
 for w in rc['combats']:
  e=w['entry'];ex=w.get('exit');la=w['last'];audit=w.get('enemy_hp_audit',{})
  lines.append(f"战{w['sequence']} F{w['floor']} {w['enemies']} entry={e} last={la} exit={ex} end={w['end']} net={w['observed_net_hp_loss']}")
  changes=w['changes'];byturn=collections.defaultdict(int)
  for z in changes:
   byturn[z['from']['turn']]+=z['from']['hp']-z['to']['hp']
  lines.append('回合净损 '+str(dict(byturn))+' 敌审计 '+str([{k:a.get(k) for k in ['turn','live_enemy_hp_start','live_enemy_hp_end','net_live_enemy_hp_loss','visible_enemy_hp_loss_lower_bound','observed_hp_added','gaps']} for a in audit.get('turns',[])]))
 lines.append('非战斗与药槽变化')
 for z in rc['resource_changes']:
  a,b=z['from'],z['to']
  if z['combat_sequence'] is None or a['potions']!=b['potions']:
   lines.append(str(z))
 lines.append('大脑决定')
 for x in d:
  if x['decider']=='codex':lines.append(f"d{x['_line']} F{x['floor']} {x['label']} {x['rationale']}")
 lines.append('护栏或推演不一致')
 for x in d:
  if any(t in json.dumps(x,ensure_ascii=False).lower() for t in ['hp guard','hp-guard','hp_guard','hp护栏','护栏','calc mismatch']):
   lines.append(f"d{x['_line']} F{x['floor']}T{x.get('turn')} {x['rationale']} chosen={x.get('chosen')}")
 lines.append('计划')
 for x in load(r,'run-plans'):lines.append(json.dumps(x,ensure_ascii=False))
 (p/f'{r}-summary.txt').write_text('\n'.join(lines)+'\n')
 with (p/f'{r}-states-compact.jsonl').open('w') as h:
  for x in s:h.write(json.dumps(compact(x),ensure_ascii=False)+'\n')
 print(r,'摘要',len(lines),'行')

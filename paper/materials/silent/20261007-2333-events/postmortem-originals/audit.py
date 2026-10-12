import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent

def powers(x):return ','.join(f"{a.get('name')}({a.get('power_id')})={a.get('amount')}" for a in x.get('powers',[]))
def enemies(s):return ';'.join(f"{e['index']}:{e['name']}({e['enemy_id']})={e['current_hp']}/{e['max_hp']} 挡{e['block']} {powers(e)} 意图{e['intent']} 攻{sum(i.get('total_damage') or 0 for i in e.get('intents',[]))}" for e in (s.get('combat') or {}).get('enemies',[]))
for r in ['1913SE84AXQF','Q6M2Y34MWKRE']:
 ds=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()]
 resources=json.loads((p/f'{r}-resources.json').read_text())
 with (p/f'{r}-audit.txt').open('w') as f:
  def pr(*v):print(*v,file=f)
  pr('局',r,'决策',len(ds),'状态',len(ss),'时间',ds[0]['ts'],ds[-1]['ts'])
  pr('低信心',[(d['_line'],d['floor'],d['turn'],d['label'],d.get('confidence')) for d in ds if d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35])
  ch=[d for d in ds if d['label']=='combat/plan-choice'];best=[d for d in ch if isinstance(d.get('rollout_best_chosen'),bool)]
  pr('最优',sum(d['rollout_best_chosen'] for d in best),len(best),'总选线',len(ch))
  own=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
  pr('自主',collections.Counter(d['label'] for d in own),'回合',len({(d['floor'],d['turn']) for d in own}));pr('续步',collections.Counter(d['decider'] for d in ds if d['label']=='combat/plan-continue'))
  pr('usage', {who:{k:sum((d.get('usage') or {}).get(k,0) or 0 for d in ds if d['decider']==who) for k in ['input_tokens','output_tokens','cache_hit_tokens']} for who in ['jev','codex']})
  pr('focus',[(d['_line'],d['floor'],d['turn'],d.get('focus'),d.get('answers')) for d in ch if d.get('focus')])
  pr('药水决策',[(d['_line'],d['ts'],d['floor'],d['turn'],d['chosen'],d.get('rationale')) for d in ds if (d.get('chosen') or {}).get('action') in ['use_potion','discard_potion']])
  for c in resources['combats']:
   pr('资源',json.dumps({k:c[k] for k in ['sequence','floor','entry','exit','last','end','observed_net_hp_loss','enemies']},ensure_ascii=False))
   rows=[s for s in ss if c['entry']['line']<=s['_line']<=(c.get('exit') or c['last'])['line']]
   turns={}
   for s in rows:
    state=s['state'];turn=state.get('turn')
    if state.get('in_combat') and state.get('combat',{}).get('action_readiness',{}).get('can_use_combat_actions') and turn not in turns:turns[turn]=s
   start=list(turns.values());end=rows[-1]
   for i,s in enumerate(start):
    nxt=start[i+1] if i+1<len(start) else end
    a=s['state'];b=nxt['state'];hp=a['run']['current_hp'];hp2=b['run']['current_hp']
    ea=sum(e['current_hp'] for e in a['combat']['enemies']);eb=sum(e['current_hp'] for e in (b.get('combat') or {}).get('enemies',[]))
    pr('回合',c['floor'],a['turn'],s['_line'],'→',nxt['_line'],'HP',hp,'→',hp2,'需',ea,'实扣',ea-eb,'净损',hp-hp2,'玩家增益',powers(a['combat']['player']))
    pr('首盘',enemies(a))
  pr('资源变更')
  for e in resources['resource_changes']:pr(json.dumps(e,ensure_ascii=False))
  pr('大脑决策')
  for d in ds:
   if d['decider']=='codex':pr(d['_line'],d['ts'],d['floor'],d['label'],json.dumps(d.get('journal'),ensure_ascii=False),d.get('rationale'))
  pr('选线与推演')
  for d in ch:
   key=(d.get('answers') or {}).get('plan');crit=d.get('questions',{}).get('plan',{}).get('criteria',{})
   pr(d['_line'],d['floor'],d['turn'],'答案',d.get('answers'),'journal',d.get('journal'),'最优',d.get('rollout_best_chosen'),'理据',d.get('rationale'))
   if isinstance(key,dict):key=key.get('choice')
   if key in crit:pr('选线',crit[key])
   if 'guard' in str(d).lower() or '替换' in str(d):pr('护栏原始',json.dumps(d,ensure_ascii=False))
  pr('自主明细')
  for d in own:pr(d['_line'],d['floor'],d['turn'],d['label'],d['chosen'],d['rationale'])
  pr('死亡场逐帧')
  final_floor=ds[-1]['floor']
  for s in ss:
   state=s['state'];c=state.get('combat')
   if not c or state['run']['floor']!=final_floor:continue
   pr(s['_line'],s['ts'],'T',state.get('turn'),'HP',state['run']['current_hp'],'挡',c['player']['block'],'能量',c['player']['energy'],'能力',powers(c['player']),'手牌',[(a.get('card_id'),a.get('name'),a.get('energy_cost')) for a in c['hand']],enemies(state))
 print(r,'审计已保存')

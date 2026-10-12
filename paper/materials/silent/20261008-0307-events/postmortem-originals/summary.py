import json,re,collections,datetime
from pathlib import Path
p=Path(__file__).resolve().parent;rid='BTSRF7JL1W1Y';d=json.loads((p/f'{rid}-decisions.json').read_text());s=json.loads((p/f'{rid}-states.json').read_text());r=json.loads((p/f'{rid}-resources.json').read_text());b=json.loads((p/f'{rid}-brain.json').read_text())
idx={x['_line']:x for x in s}; audit=[]
for c in r['combats']:
 end=c.get('exit') or c['last'];frames=[x for x in s if c['entry']['line']<=x['_line']<=end['line']];out=[]
 turns=sorted(set(x['state'].get('turn') for x in frames if isinstance(x['state'].get('turn'),int)))
 for t in turns:
  fs=[x for x in frames if x['state'].get('turn')==t]; playable=[x for x in fs if (x['state'].get('combat') or {}).get('hand')];a=playable[0] if playable else fs[0]; nextfs=[x for x in frames if isinstance(x['state'].get('turn'),int) and x['state']['turn']>t];z=nextfs[0] if nextfs else frames[-1]
  def enemyhp(x):return sum(e['current_hp'] for e in (x['state'].get('combat') or {}).get('enemies',[]) if e['is_alive'])
  out.append({'turn':t,'start':a['_line'],'end':z['_line'],'need':enemyhp(a),'net_enemy_hp_loss':enemyhp(a)-enemyhp(z),'net_player_hp_loss':a['state']['run']['current_hp']-z['state']['run']['current_hp']})
 audit.append({'sequence':c['sequence'],'floor':c['floor'],'turns':out,'entry':c['entry'],'exit':c.get('exit'),'last':c['last'],'entry_is_turn_one':c['entry_is_turn_one'],'end':c['end']})
 print('回合',c['sequence'],'F',c['floor'],'需',[x['need'] for x in out],'扣',[x['net_enemy_hp_loss'] for x in out],'损',[x['net_player_hp_loss'] for x in out])
(p/'turns-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print('资源变化')
for x in r['resource_changes']:
 a=x['from'];z=x['to'];
 if a['potions']!=z['potions'] or x.get('combat_sequence') is None:
  print('F',z['floor'],'T',z['turn'],'seq',x.get('combat_sequence'),'行',a['line'],z['line'],'HP',a['hp'],z['hp'],'药',a['potions'],z['potions'],'时间',z['ts'])
print('药动作')
for x in d:
 if x['chosen'].get('action') in ['use_potion','discard_potion','buy_potion']:print(x['_line'],x['floor'],x['turn'],x['chosen'],x['observed_ts'],x['rationale'])
print('遗物',[(a.get('name'),a.get('relic_id')) for a in s[-2]['state']['run'].get('relics',[])])
low=sum(x['decider']=='jev' and isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 for x in d);rank1=0;total=0;besttotal=0;bestchosen=0;focuschoices=0;originaldeciders=collections.Counter();code_turns=set();allturns=set();jevturns=set()
for x in d:
 turn=x.get('turn');attempt=x.get('sl_attempt') or (1 if x['floor']==17 else 0);key=(x['floor'],attempt,turn)
 if x.get('screen')=='COMBAT' and isinstance(turn,int):allturns.add(key)
 orig='jev-plan' if x['rationale'].startswith('continuing the Jev-chosen plan:') else x['decider'];originaldeciders[orig]+=1
 if orig=='code' and x['label'] in ['combat/plan','combat/lethal','combat/least-loss']:code_turns.add(key)
 if x['decider']=='jev' and x['label'].startswith('combat/'):
  jevturns.add(key);q=(x.get('questions') or {}).get('plan');a=(x.get('answers') or {}).get('plan')
  if not q or not a:continue
  options={}
  for k,v in q['criteria'].items():
   try:options[k]=json.loads(v)
   except ValueError:continue
  ch=a.get('choice');total+=1
  if 'code rank 1' in x['rationale']:rank1+=1
  best={k for k,v in options.items() if v.get('rollout_best') or v.get('rollout_tied')}
  if best:besttotal+=1;bestchosen+=ch in best
  focuschoices+=bool(options.get(ch,{}).get('focus'))
 if 'HP guard:' in x.get('rationale','') or 'SL explore' in x.get('rationale',''):code_turns.add(key)
print('统计',{'jev_low':low,'plan_choices':total,'code_rank1':rank1,'best_available':besttotal,'best_chosen':bestchosen,'focus_choice':focuschoices,'deciders_original':dict(originaldeciders),'code_turns':len(code_turns),'code_nojev':len(allturns-jevturns),'all_turns':len(allturns)})
print('时间',(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds());print('Jev usage',{k:sum((x.get('usage') or {}).get(k,0) for x in d if x['decider']=='jev') for k in ['input_tokens','output_tokens','cache_read_input_tokens']});print('脑 usage',{k:sum((x.get('usage') or {}).get(k,0) for x in b) for k in set().union(*(x.get('usage') or {} for x in b))})

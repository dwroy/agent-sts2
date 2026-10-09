import json,sys,collections,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-171301-postmortem')
def load(n):
 with (p/(n+'.jsonl')).open() as h:return [json.loads(x) for x in h]
ds=load('decisions');ss=load('states');sl=load('sl-attempts');plans=load('run-plans')
cmd=sys.argv[1]
if cmd=='resources':
 r=json.loads((p/'XW8B5CHJ814J-resources.json').read_text())
 for c in r['combats']:
  def show(x):return None if x is None else {k:x[k] for k in ['line','ts','turn','hp','max_hp','potions']}
  print(json.dumps({'seq':c['sequence'],'floor':c['floor'],'enemies':c['enemies'],'entry':show(c['entry']),'last':show(c['last']),'exit':show(c['exit']),'end':c['end'],'net_loss':c['observed_net_hp_loss']},ensure_ascii=False))
 print('非战斗或重置变化')
 for x in r['resource_changes']:
  if x['combat_sequence'] is None:print(json.dumps(x,ensure_ascii=False))
if cmd=='sl':
 for x in sl:
  r=x['record'];j=r.get('judge') or {};print(json.dumps({'line':x['line'],**{k:r.get(k) for k in ['floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','give_up_reason']},'judge':j,'reload':r.get('reload')},ensure_ascii=False))
if cmd=='brain':
 for x in ds:
  r=x['record']
  if r['decider']=='codex':print(json.dumps({'line':x['line'],**{k:r.get(k) for k in ['floor','turn','label','chosen','rationale','journal','run_plan_merge','boss_sim']}},ensure_ascii=False))
 for x in plans:print('PLAN',x['line'],json.dumps({k:x['record'][k] for k in ['floor','trigger','plan']},ensure_ascii=False))
if cmd=='stats':
 print('labels',collections.Counter((x['record']['decider'],x['record']['label']) for x in ds))
 jev=[x for x in ds if x['record']['decider']=='jev'];low=[x for x in jev if isinstance(x['record'].get('confidence'),(float,int)) and x['record']['confidence']<.35]
 print('jev',len(jev),'low',len(low),'low_floor',collections.Counter(x['record']['floor'] for x in low))
 choices=[x for x in jev if 'plan-choice' in x['record']['label']];print('choices',len(choices))
 print('ranks',collections.Counter(re.search(r'code rank ([^;,)]+)',x['record']['rationale']).group(1) if re.search(r'code rank ([^;,)]+)',x['record']['rationale']) else 'none' for x in choices))
 print('code combat turns',len({(x['record']['floor'],x['record'].get('sl_attempt'),x['record']['turn']) for x in ds if x['record']['decider']=='code' and x['record']['label'].startswith('combat/')}))
 print('times',ds[0]['record']['ts'],ds[-1]['record']['ts']);print('latency sums', {k:sum((x['record'].get('latency_ms') or {}).get(k,0) or 0 for x in ds) for k in ['plan','jev','action','deepseek','planner','pre']})
 for x in ds:
  r=x['record']
  if re.search(r'guard|护栏|hp preservation|HP preservation',r['rationale'],re.I):print('GUARD',x['line'],r['floor'],r['turn'],r['rationale'])
 print('potions')
 for x in ds:
  r=x['record'];c=r['chosen']
  if c.get('action') in ['use_potion','discard_potion'] or (c.get('action')=='claim_reward' and 'potion' in json.dumps(r,ensure_ascii=False).lower()) or (r['label']=='shop/buy' and 'potion' in str(c)):
   print(x['line'],r['floor'],r['turn'],r.get('sl_attempt'),json.dumps(c,ensure_ascii=False),r['rationale'])
if cmd=='turns':
 floor=int(sys.argv[2]);selected=[x for x in ss if x['record']['state']['run']['floor']==floor];attempt=1;prevturn=None
 def compact(x):
  r=x['record'];s=r['state'];run=s['run'];c=s.get('combat') or {};pl=c.get('player') or {};return {'line':x['line'],'ts':r['ts'],'turn':s.get('turn'),'hp':run['current_hp'],'block':pl.get('block'),'energy':pl.get('energy'),'powers':pl.get('powers'),'enemies':c.get('enemies'),'hand':[(v.get('index'),v.get('name'),v.get('card_id'),v.get('energy_cost')) for v in c.get('hand',[])]}
 print('combat keys',list((selected[0]['record']['state'].get('combat') or {}).keys()))
 for i,x in enumerate(selected):
  s=x['record']['state'];turn=s.get('turn')
  if s.get('in_combat') and turn!=prevturn:
   if prevturn is not None and turn==1:attempt+=1
   print('START',attempt,json.dumps(compact(x),ensure_ascii=False))
  prevturn=turn
  match=[d for d in ds if d['record']['ts']==x['record']['ts']]
  for d in match:
   r=d['record']
   if r['chosen'].get('action')=='end_turn':print('ENDTURN',attempt,json.dumps(compact(x),ensure_ascii=False),r['rationale'])
  if not s.get('in_combat'):print('EXIT',json.dumps(compact(x),ensure_ascii=False))
if cmd=='decisions':
 floor=int(sys.argv[2]);turn=int(sys.argv[3]) if len(sys.argv)>3 else None
 for x in ds:
  r=x['record']
  if r['floor']==floor and (turn is None or r.get('turn')==turn):print(json.dumps({'line':x['line'],**{k:r.get(k) for k in ['ts','turn','sl_attempt','label','decider','chosen','rationale','confidence','journal','result']}},ensure_ascii=False))

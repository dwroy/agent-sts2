import json,pathlib,collections,re,datetime
P=pathlib.Path(__file__).parent
D=[json.loads(l) for l in open(P/'decisions.jsonl')]
S=[]
for l in open(P/'states-indexed.jsonl'):
 n,raw=l.split(':',1);r=json.loads(raw);r['_line']=int(n);S.append(r)
R=json.load(open(P/'BJLTVSYXCSGS-resources.json'))
def powers(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def compact(r):
 s=r['state'];c=s.get('combat') or {};p=c.get('player') or {};run=s.get('run') or {}
 return {'s':r['_line'],'ts':r['ts'],'f':run.get('floor'),'t':s.get('turn'),'hp':run.get('current_hp'),'max':run.get('max_hp'),'b':p.get('block'),'en':p.get('energy'),'pw':powers(p),'ready':(c.get('action_readiness') or {}).get('can_use_combat_actions'),'e':[(e['index'],e['enemy_id'],e['current_hp'],e.get('block'),powers(e),e.get('intent'),e.get('intents')) for e in c.get('enemies',[])],'hand':[(c['name'],c.get('energy_cost'),c.get('resolved_rules_text')) for c in c.get('hand',[])]}
def turn_summary(c):
 rows=[r for r in S if c['entry']['line']<=r['_line']<=(c.get('exit') or c['last'])['line']]
 groups=collections.OrderedDict()
 for r in rows:
  s=r['state'];co=s.get('combat') or {}
  if s.get('in_combat') and (co.get('action_readiness') or {}).get('can_use_combat_actions'):
   groups.setdefault(s['turn'],r)
 out=[];starts=list(groups.items())
 for i,(t,r) in enumerate(starts):
  end=starts[i+1][1] if i+1<len(starts) else rows[-1]
  a=r['state'];b=end['state'];need=sum(e['current_hp'] for e in (a.get('combat') or {}).get('enemies',[]) if e['is_alive']);left=sum(e['current_hp'] for e in (b.get('combat') or {}).get('enemies',[]) if e['is_alive'])
  out.append([t,r['_line'],end['_line'],a['run']['current_hp'],need,need-left,a['run']['current_hp']-b['run']['current_hp']])
 return out
if __name__=='__main__':
 import sys
 mode=sys.argv[1]
 if mode=='turns':
  for c in R['combats']: print('F',c['floor'],'seq',c['sequence'],'逐轮[回合,起证据,终证据,玩家HP,需敌血,净进度,玩家净损]',turn_summary(c))
 elif mode=='frames':
  floors=set(map(int,sys.argv[2:]));
  for r in S:
   if (r['state'].get('run') or {}).get('floor') in floors and r['state'].get('in_combat'):print(json.dumps(compact(r),ensure_ascii=False))
 elif mode=='stats':
  q=[x for x in D if x['decider']=='jev' and x['label'].startswith('combat/plan-choice')]
  ranked=collections.Counter((re.search(r'code rank ([\d-]+)',x['rationale']).group(1) if re.search(r'code rank ([\d-]+)',x['rationale']) else '药水') for x in q)
  print('决策',len(D),'来源',collections.Counter(x['decider'] for x in D));print('jev',sum(x['decider']=='jev' for x in D),'低信',[(x['_line'],x['floor'],x['turn'],x['confidence']) for x in D if x['decider']=='jev' and x.get('confidence',1)<.35]);print('方案题',len(q),'rank',ranked,'推演bool',collections.Counter(x.get('rollout_best_chosen') for x in q));
  print('自主代码',collections.Counter(x['label'] for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'));print('自主轮',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'}))
  print('usage', {k:sum((x.get('usage') or {}).get(k,0) for x in D) for k in ['input_tokens','output_tokens']});print('brain', {k:sum((x.get('deepseek') or {}).get(k,0) for x in D) for k in ['input_tokens','output_tokens','cache_hit_tokens','tokens']},collections.Counter((x.get('deepseek') or {}).get('brain',{}).get('engine') for x in D if x.get('deepseek')))
  print('秒',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds())
  for x in D:
   if 'HP guard:' in x['rationale'] or (x.get('chosen') or {}).get('action') in ('use_potion','discard_potion') or (x.get('expect') or {}).get('potion'):print('干预/药',x['_line'],x['floor'],x['turn'],x['chosen'],x.get('expect'),x['rationale'])
 elif mode=='brain':
  for x in D:
   if x['decider']=='codex': print('d',x['_line'],'F',x['floor'],x['label'],x['chosen'],x.get('journal'), 'boss_sim',x.get('boss_sim'))

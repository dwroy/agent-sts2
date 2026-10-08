import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent

def read(fn):
 rows=[]
 for l in (p/fn).open():
  n,s=l.split(':',1);r=json.loads(s);r['_line']=int(n);rows.append(r)
 return rows

d=read('decisions.lines');st=read('states.lines');b=read('brain.lines');sl=read('sl.lines');res=json.loads((p/'L2TSFU62Z57Z-resources.json').read_text())

def powers(x): return {a['power_id']:a['amount'] for a in x or []}
def compact(r):
 s=r['state'];co=s.get('combat') or {};pl=co.get('player') or {}
 return {'行':r['_line'],'层':s.get('run',{}).get('floor'),'轮':s.get('turn'),'血':s.get('run',{}).get('current_hp'),'挡':pl.get('block'),'能':pl.get('energy'),'已打':pl.get('cards_played_this_turn'),'玩家增益':powers(pl.get('powers')),'敌':[(e.get('enemy_id'),e.get('name'),e.get('current_hp'),e.get('block'),e.get('intent'),e.get('intents'),powers(e.get('powers'))) for e in co.get('enemies',[])],'手牌':[(h.get('card_id'),h.get('is_upgraded'),h.get('playable'),h.get('blocked_by_hook')) for h in co.get('hand',[])]}
print('末试每帧')
for r in st:
 if r['_line']>=291754: print(compact(r))
print('逐轮需/净扣/玩家损')
for c in res['combats']:
 rr=[r for r in st if c['entry']['line']<=r['_line']<=((c.get('exit') or c['last'])['line'])]
 first={}
 for r in rr:
  if r['state'].get('in_combat') and r['state'].get('turn') not in first: first[r['state']['turn']]=r
 # 首个入房帧尚未抽牌时，取同轮第一个非空手牌。
 for t in list(first):
  same=[r for r in rr if r['state'].get('in_combat') and r['state'].get('turn')==t and (r['state'].get('combat') or {}).get('hand')]
  if same: first[t]=same[0]
 starts=list(first.values());out=[]
 for i,r in enumerate(starts):
  n=starts[i+1] if i+1<len(starts) else rr[-1]
  hp=lambda a:sum(e['current_hp'] for e in (a['state'].get('combat') or {}).get('enemies',[]) if e.get('is_alive',True))
  out.append({'轮':r['state']['turn'],'行':r['_line'],'需':hp(r),'净扣':hp(r)-hp(n),'损':r['state']['run']['current_hp']-n['state']['run']['current_hp'],'最后截断':i==len(starts)-1 and not c.get('exit')})
 print(c['sequence'],c['floor'],out)
print('指标')
jev=[r for r in d if r['decider']=='jev']; combat=[r for r in d if r['label'].startswith('combat/')]
groups=collections.defaultdict(list)
for r in combat: groups[(r['floor'],r.get('sl_reloads',0),r['turn'])].append(r)
print('jev',len(jev),'低于0.5',sum((r.get('confidence') or 0)<0.5 for r in jev),'低于0.35',sum((r.get('confidence') or 0)<0.35 for r in jev),'fallback',sum(r.get('fallback',False) for r in jev))
print('推演标记',collections.Counter(r.get('rollout_best_chosen') for r in jev));print('jev键',list(jev[0]))
print('战斗回合',len(groups),'全代码',sum(not any(r['decider']=='jev' for r in v) for v in groups.values()))
selfrows=[r for r in combat if r['decider']=='code' and r['label']!='combat/plan-continue']
print('自启动',len(selfrows),'覆盖回合',len({(r['floor'],r.get('sl_reloads',0),r['turn']) for r in selfrows}))
print('续步',collections.Counter('jev' if 'Jev-chosen' in r['rationale'] else 'code' for r in d if r['label']=='combat/plan-continue'))
print('jev usage', {k:sum(r.get('usage',{}).get(k,0) for r in jev) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
print('brain usage', {k:sum(r.get('usage',{}).get(k,0) for r in b) for k in ['inputTokens','outputTokens','cacheHitTokens']})
print('时长秒',(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('护栏候选')
for r in d:
 if 'HP guard:' in r['rationale']:
  print('决策',r['_line'],r.get('sl_reloads'),r['turn'],r['chosen'],r['rationale'])
  print('额外',{k:v for k,v in r.items() if k in ['rollout','rollout_best_chosen','hp_guard','turn_solver']})
  for key,q in r.get('questions',{}).items():
   if key=='pick':
    for k,v in q.get('criteria',{}).items(): print(k,str(v)[:900])
print('临终决策')
for r in d:
 if r['_line']>=285146: print(r['_line'],r.get('turn'),r.get('chosen'),r['rationale'])
print('选项focus')
for r in jev:
 if any('focus' in str(q) for q in r.get('questions',{}).values()): print(r['_line'],r['floor'],r['turn'],r.get('chosen'),r['rationale'])

import json,pathlib,collections,re,datetime
b=pathlib.Path(__file__).parent
states=[json.loads(x) for x in (b/'states-selected.jsonl').open()]
resource=json.loads((b/'KFRDELW2TH2P-resources.json').read_text())
decisions=json.loads((b/'decisions-selected.json').read_text())
def combat(r):return r['state'].get('combat') or {}
def hp(r):return (combat(r).get('player') or {}).get('current_hp')
def ehp(r):return sum(e['current_hp'] for e in combat(r).get('enemies',[]) if e['is_alive'])
audit=[]
for c in resource['combats']:
 lo=c['entry']['line'];end=c.get('exit') or c['last'];hi=end['line'];rs=[s for s in states if lo<=s['_line']<=hi]
 groups={}
 for r in rs:
  cc=combat(r);p=cc.get('player') or {}
  if cc.get('hand') and p.get('cards_played_this_turn')==0 and r['state'].get('screen')=='COMBAT':groups.setdefault(r['state']['turn'],r)
 turns=[]
 starts=list(groups.values())
 for i,start in enumerate(starts):
  finish=starts[i+1] if i+1<len(starts) else rs[-1]
  span=[s for s in rs if start['_line']<=s['_line']<=finish['_line']]
  losses=0;gains=0
  for old,new in zip(span,span[1:]):
   oe={e['index']:e for e in combat(old).get('enemies',[])};ne={e['index']:e for e in combat(new).get('enemies',[])}
   for index,e in oe.items():
    n=ne.get(index)
    if n and n['enemy_id']==e['enemy_id']:
     delta=e['current_hp']-n['current_hp'];losses+=max(0,delta);gains+=max(0,-delta)
  turns.append({'turn':start['state']['turn'],'start_line':start['_line'],'end_line':finish['_line'],'hp_start':hp(start),'hp_end':hp(finish),'need':ehp(start),'net_enemy_hp_loss':ehp(start)-ehp(finish),'visible_loss':losses,'visible_heal':gains,'player_net_loss':hp(start)-hp(finish),'end_is_observed_exit':bool(c.get('exit')) if i+1==len(starts) else True})
 audit.append({'sequence':c['sequence'],'floor':c['floor'],'entry':c['entry'],'exit_or_last':end,'turns':turns})
(b/'numbers-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
for a in audit:
 if a['floor'] in [12,17,21,28,30,31,33]:print('C',a['sequence'],'F',a['floor'],[(t['turn'],t['need'],t['net_enemy_hp_loss'],t['visible_loss'],t['visible_heal'],t['player_net_loss'],t['start_line'],t['end_line']) for t in a['turns']])
jev=[x for x in decisions if x['row']['decider']=='jev'];plan=[x for x in jev if x['row']['label']=='combat/plan-choice+potion']
rank1=sum(bool(re.search(r'; code rank 1(?:\s|;|$)',x['row']['rationale'])) for x in plan)
print('Jev',len(jev),'low',sum(isinstance(x['row'].get('confidence'),(int,float)) and x['row']['confidence']<.35 for x in jev),'plan',len(plan),'rank1',rank1,'rollout',collections.Counter(x['row'].get('rollout_best_chosen') for x in plan))
for x in decisions:
 r=x['row']
 if r.get('chosen',{}).get('action') in ['use_potion','drink_potion','discard_potion'] or 'HP guard' in r.get('rationale',''):print('药/护栏',x['line'],r['floor'],r['turn'],r.get('sl_reloads'),r.get('chosen'),r['rationale'][:300])
turndec=collections.defaultdict(list)
for x in decisions:
 r=x['row']
 if r['label'].startswith('combat/'):turndec[(r['floor'],r.get('sl_reloads',0),r['turn'])].append(x)
print('战斗回合',len(turndec),'全无Jev',sum(not any(x['row']['decider']=='jev' for x in xs) for xs in turndec.values()))
selflabels={'combat/plan','combat/lethal','combat/least-loss','combat/play'}
selfturn=[k for k,xs in turndec.items() if any(x['row']['decider']=='code' and x['row']['label'] in selflabels for x in xs)]
print('代码自主非续步回合',len(selfturn),selfturn)
print('code继续',collections.Counter('jev' if 'Jev' in x['row'].get('rationale','') else 'code' for x in decisions if x['row']['label']=='combat/plan-continue'))
for w in ['focus']:
 offered=0;chosen=0
 for x in plan:
  r=x['row'];criteria=r['questions']['plan'].get('criteria',{});facts={k:json.loads(v) for k,v in criteria.items() if isinstance(v,str) and v.startswith('{')}
  offered+=any(w in f for f in facts.values());choice=(r.get('answers',{}).get('plan') or {}).get('choice');chosen+=w in facts.get(choice,{})
 print(w,offered,chosen)
print('Jev token',sum(x['row'].get('usage',{}).get('input_tokens',0) for x in jev),sum(x['row'].get('usage',{}).get('output_tokens',0) for x in jev))

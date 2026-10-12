import json,collections,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-151301-postmortem')
ds=[json.loads(l) for l in (p/'decisions.jsonl').open()]; ss=[json.loads(l) for l in (p/'states.jsonl').open()]
r=json.loads((p/'AD3QSC3P41JU-resources.json').read_text())
section=[]
section.append(('统计',{'deciders':dict(collections.Counter(d['decider'] for d in ds)),'low':sum(d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35 for d in ds),'plan':[(d['_line'],d['rationale']) for d in ds if d['decider']=='jev' and 'plan' in d['label']],'code_main':[(d['_line'],d['floor'],d.get('sl_attempt'),d['turn'],d['label']) for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'],'guards':[(d['_line'],d['floor'],d['turn'],d['rationale']) for d in ds if 'HP guard:' in d.get('rationale','')]}))
section.append(('非战斗决定',[{'d':d['_line'],'f':d['floor'],'label':d['label'],'chosen':d.get('chosen'),'why':d.get('rationale'),'journal':d.get('journal')} for d in ds if d['decider']=='codex']))
section.append(('资源过渡',r['resource_changes']))
turns=[]
for c in r['combats']:
 frames=[x for x in ss if c['entry']['line']<=x['_line']<=(c.get('exit') or c['last'])['line']]
 groups={}
 for x in frames:
  t=x['state']['turn']
  if t is not None:groups.setdefault(t,[]).append(x)
 for t,group in groups.items():
  first=group[0];last=group[-1]
  pl=(last['state'].get('combat') or {}).get('player') or {}
  en=(last['state'].get('combat') or {}).get('enemies') or []
  nxt=frames[frames.index(last)+1] if frames.index(last)+1<len(frames) else None
  audit=next((a for a in c.get('enemy_hp_audit',{}).get('turns',[]) if a['turn']==t),{})
  turns.append({'seq':c['sequence'],'f':c['floor'],'t':t,'s1':first['_line'],'s2':last['_line'],'hp_start':first['state']['run']['current_hp'],'hp_end':last['state']['run']['current_hp'],'next_hp':nxt['state']['run']['current_hp'] if nxt else None,'block_end':pl.get('block'),'enemies':[(e['enemy_id'],e['current_hp'],e.get('block'),[(a['power_id'],a['amount']) for a in e.get('powers',[])],e.get('intents')) for e in en],'player_powers':pl.get('powers'),'enemy_hp_start':audit.get('live_enemy_hp_start'),'enemy_hp_end':audit.get('live_enemy_hp_end'),'visible_loss':audit.get('visible_enemy_hp_loss_lower_bound'),'gaps':audit.get('gaps')})
section.append(('逐回合',turns))
clocks=[]
for d in ds:
 fact=d.get('facts') or {}
 # Brain facts are nested in question.state and questions data; collect paths to matching objects.
 def scan(o,path=''):
  if isinstance(o,dict):
   for k,v in o.items():
    if any(w in k for w in ['boss_clock','route_projection','projected_hp','projectedHp','boss_sim']):clocks.append({'d':d['_line'],'f':d['floor'],'path':path+'.'+k,'value':v})
    elif isinstance(v,(dict,list)):scan(v,path+'.'+k)
  elif isinstance(o,list):
   for i,v in enumerate(o):
    if isinstance(v,(dict,list)):scan(v,path+f'[{i}]')
 scan(d)
section.append(('投影与时钟',clocks))
for name,data in section:
 (p/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('写出分析文件',[(a,len(b) if isinstance(b,list) else list(b)) for a,b in section])

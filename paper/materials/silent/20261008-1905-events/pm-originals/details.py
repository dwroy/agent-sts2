import json,pathlib,collections,re
p=pathlib.Path('learner/runs/20261008-184301-postmortem')
def rows(name):
 for l in open(p/(name+'-lines.jsonl')):
  n,s=l.split(':',1);o=json.loads(s);o['_line']=int(n);yield o
D=list(rows('decisions'));S=list(rows('states'));B=list(rows('brain'));C=json.load(open(p/'QHK1XQ928TTM-resources.json'))
print('大脑汇总', {k:sum((b.get('usage') or {}).get(k,0) or 0 for b in B) for k in ['input_tokens','output_tokens','cache_hit_tokens']},'引擎',collections.Counter(b['engine'] for b in B))
for b in B:
 if b['label']=='rest/plan':
  pick=b['answer']['choice'];o=json.loads(b['options'][pick]);facts=b.get('question',{}).get('facts',{}) if isinstance(b.get('question'),dict) else {}
  print('休息',b['_line'],'选',pick,'模拟',o.get('boss_sim'),'hp',o.get('boss_sim_hp_reference'),'clock',facts.get('act_boss_clock'))
  txt=json.dumps(b.get('payload'),ensure_ascii=False)
  j=txt.find('act_boss_clock');print('payload-clock',txt[j:j+700])
for i,c in enumerate(C['combats']):
 if c['floor'] not in [17,20,24,27,31,33]:continue
 frames=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']]
 turns={}
 for s in frames:
  if s['state']['in_combat']:turns.setdefault(s['state']['turn'],s)
 end=c['exit'] or c['last']; loss=[]
 tt=list(turns.items())
 for j,(t,s) in enumerate(tt):
  nxt=tt[j+1][1] if j+1<len(tt) else next(s for s in frames if s['_line']==end['line'])
  loss.append(s['state']['run']['current_hp']-nxt['state']['run']['current_hp'])
 print('玩家逐轮',c['sequence'],c['floor'],loss)
print('末轮紧凑帧')
for s in S:
 if s['_line'] in range(303197,303224) or s['_line'] in range(302885,302944):
  st=s['state'];c=st.get('combat') or {};pl=c.get('player') or {};r=st['run']
  print(s['_line'],'F',r['floor'],'T',st['turn'],'hp',r['current_hp'],'挡',pl.get('block'),'能',pl.get('energy'),'玩家增益',[(x['power_id'],x['amount']) for x in pl.get('powers',[])],'敌',[(e['enemy_id'],e['current_hp'],[(x['power_id'],x['amount']) for x in e['powers'] if x['power_id'] in ['POISON_POWER','STRENGTH_POWER']],sum(x.get('total_damage') or 0 for x in e['intents'])) for e in c.get('enemies',[])])
print('遗物')
prev=[]
for s in S:
 r=s['state']['run']; rel=r.get('relics') or [];ids=[x['relic_id'] for x in rel]
 if ids!=prev:print(s['_line'],r['floor'],rel);prev=ids

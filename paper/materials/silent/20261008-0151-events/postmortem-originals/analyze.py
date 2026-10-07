import json,collections,datetime,re
from pathlib import Path
p=Path(__file__).parent
D=json.loads((p/'decisions.json').read_text()); S=[]
for line in (p/'states.raw').open():
 n,s=line.split(':',1);r=json.loads(s);r['_line']=int(n);S.append(r)
(p/'states.json').write_text(json.dumps(S,ensure_ascii=False)+'\n')
R=json.loads((p/'P74C04AEPL1F-resources.json').read_text())
def hp(s):return s['state']['run'].get('current_hp')
def ens(s):return [(e.get('enemy_id'),e.get('name'),e.get('current_hp'),e.get('block'),e.get('powers'),e.get('intents')) for e in s['state'].get('combat',{}).get('enemies',[])]
print('STATES',len(S),S[0]['_line'],S[-1]['_line'])
for c in R['combats']:
 rows=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit') or c['last'])['line']]
 ts=[]
 for t in sorted(set(s['state'].get('turn') for s in rows if s['state'].get('in_combat') and isinstance(s['state'].get('turn'),int))):
  tr=[s for s in rows if s['state'].get('turn')==t and s['state'].get('in_combat')]
  first=tr[0];nxt=next((s for s in rows if s['_line']>tr[-1]['_line']),tr[-1])
  e0=sum(e.get('current_hp',0) for e in first['state'].get('combat',{}).get('enemies',[]) if e.get('is_alive',True))
  e1=sum(e.get('current_hp',0) for e in nxt['state'].get('combat',{}).get('enemies',[]) if e.get('is_alive',True))
  ts.append({'t':t,'line':first['_line'],'need':e0,'net':e0-e1,'hp_loss':hp(first)-hp(nxt),'end_hp':hp(nxt)})
 print('TURNS',c['sequence'],c['floor'],ts)
print('CHANGES')
for e in R['resource_changes']:print(json.dumps(e,ensure_ascii=False))
J=[d for d in D if d.get('decider')=='jev'];Q=[d for d in J if 'plan-choice' in d.get('label','')]
print('JEV',len(J),'low',[(d['_line'],d.get('floor'),d.get('turn'),d.get('label'),d.get('confidence')) for d in J if (d.get('confidence') or 0)<.35])
print('deepseekkeys',collections.Counter(k for d in D for k in (d.get('deepseek') or {})))
print('usage',D[0].get('usage'),'boss_sim',next((d.get('boss_sim') for d in D if d.get('boss_sim')),None))
print('fallbacks',sum(bool(d.get('fallback')) for d in D))
for d in D:
 if d.get('chosen',{}).get('action') in ['use_potion','discard_potion']:print('POTION',d['_line'],d.get('floor'),d.get('turn'),d.get('chosen'),d.get('rationale'))
for d in D:
 if d.get('label')=='rest/plan' or 'route' in d.get('label','') and d.get('decider')=='codex':
  q=d.get('questions') or {}
  print('BRAINFACT',d['_line'],json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='instructions'} for k,v in q.items()},ensure_ascii=False))
with open('logs/deepseek-reasoning.jsonl','rb') as src,(p/'reasoning.raw').open('wb') as out:
 src.seek(0)
 for line in src:
  try:r=json.loads(line)
  except ValueError:continue
  if D[0]['ts']<=str(r.get('ts',''))<=D[-1]['ts']:out.write(line)
print('REASONING', (p/'reasoning.raw').stat().st_size)

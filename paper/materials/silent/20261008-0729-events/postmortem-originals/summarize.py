import json,collections,datetime
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-071302-postmortem';rid='PD9AYQVMLQW6'
ds=[json.loads(x) for x in (p/f'{rid}-decisions.jsonl').open()];ss=[json.loads(x) for x in (p/f'{rid}-states.jsonl').open()];r=json.load((p/f'{rid}-resources.json').open())
print('非战变化')
for v in r['resource_changes']:
 if v['combat_sequence'] is None:
  a,b=v['from'],v['to'];print(a['line'],'F',a['floor'],a['hp'],a['potions'],'→',b['line'],'F',b['floor'],b['hp'],b['potions'],'SL',v['restart_boundary'])
print('战内药水')
for c in r['combats']:
 for v in c['changes']:
  a,b=v['from'],v['to']
  if a['potions']!=b['potions']:print('F/T',b['floor'],b['turn'],'lines',a['line'],b['line'],a['potions'],'→',b['potions'])
print('boss逐轮：轮初敌剩/至下一轮初净敌HP变化/玩家净损，包含轮初被动、结算和回血，不是毛伤')
for c in r['combats']:
 if c['floor'] not in [17,33,35,48,49]:continue
 rows=[s for s in ss if c['entry']['line']<=s['_source_line']<=(c.get('exit') or c['last'])['line']];groups=collections.defaultdict(list)
 for s in rows:
  if s['state']['in_combat']:groups[s['state']['turn']].append(s)
 starts=[a[0] for a in groups.values()];end=c.get('exit')
 print('seq',c['sequence'],'F',c['floor'])
 for i,a in enumerate(starts):
  b=starts[i+1] if i+1<len(starts) else next((s for s in rows if end and s['_source_line']==end['line']),None)
  e=sum(e['current_hp'] for e in a['state']['combat']['enemies'] if e['is_alive']);eh=sum(e['current_hp'] for e in b['state']['combat']['enemies'] if e['is_alive']) if b else None
  print(a['state']['turn'],'need',e,'netdmg',e-eh if b else None,'hp',a['state']['run']['current_hp'],'→',b['state']['run']['current_hp'] if b else None,'lines',a['_source_line'],b['_source_line'] if b else None)
print('选项投影/整场模拟')
for d in ds:
 if d['label'] not in ['rest/plan','event/act-plan','map/route-plan']:continue
 b=d.get('boss_sim',{});print(d['_source_line'],d['floor'],'boss_sim',json.dumps(b,ensure_ascii=False)[:1050])
 q=d.get('questions',{}).get('pick',{});ch=d.get('deepseek',{}).get('choice')
 raw=q.get('criteria',{}).get(ch,'');
 try:opt=json.loads(raw)
 except (ValueError,TypeError):opt={}
 print('chosen',ch,opt.get('option'),opt.get('boss_sim'),opt.get('boss_sim_hp_reference'))
print('用量')
jev=[d for d in ds if d['decider']=='jev'];brain=[d for d in ds if d.get('deepseek',{}).get('input_tokens')]
for name,rows in [('jev',jev),('brain decisions',brain)]:print(name,'n',len(rows),'usage', {k:sum(x.get('usage',{}).get(k,0) or 0 for x in rows) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
plans=[json.loads(x) for x in (p/f'{rid}-run-plans.jsonl').open()];print('independent plans',[(x['_source_line'],x.get('input_tokens'),x.get('output_tokens'),x.get('cache_hit_tokens')) for x in plans if 'input_tokens' in x]);print('elapsed',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('reasoning timewindow',ds[0]['ts'],ds[-1]['ts'])
count=0;last=None
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src,(p/f'{rid}-deepseek-reasoning.jsonl').open('w') as dst:
 src.seek(0)
 for n,line in enumerate(src,1):
  try:x=json.loads(line)
  except ValueError:continue
  ts=x.get('ts','');last=ts
  if ds[0]['ts']<=ts<=ds[-1]['ts']:
   x['_source_line']=n;dst.write(json.dumps(x,ensure_ascii=False)+'\n');count+=1
print('reasoning matches',count,'last',last)

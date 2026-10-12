import json,collections
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-224302-postmortem')
def rows(name):return [json.loads(x) for x in (P/(name+'.jsonl')).open()]
D,S,PL,SL=[rows(x) for x in ('decisions','states','plans','sl')]
print('SL简表')
for x in SL: print(json.dumps({k:v for k,v in x.items() if k not in ('decisions','questions','lines','choices','seen','history','boards') and len(str(v))<2000},ensure_ascii=False))
print('脑调用与决定')
for d in D:
 if d.get('decider')=='codex':
  print(f"d{d['_seq']} 原{d['_line']} F{d.get('floor')}T{d.get('turn')} {d['label']} {d['chosen']} {d.get('rationale')} boss_sim={d.get('boss_sim')}")
print('计划')
for p in PL:print(json.dumps({k:v for k,v in p.items() if len(str(v))<4500},ensure_ascii=False))
print('护栏与误差与饮药')
for d in D:
 if any(z in d.get('rationale','').lower() for z in ('guard','mismatch','focus')) or d.get('chosen',{}).get('action') in ('use_potion','discard_potion'):
  print('d',d['_seq'],'原',d['_line'],'F',d.get('floor'),'T',d.get('turn'),d['decider'],d['label'],d['chosen'],d.get('rationale'),d.get('confidence'),'额外字段',list(d.keys()))
print('脑tokens',sum(d.get('deepseek',{}).get('input_tokens',0) for d in D),sum(d.get('deepseek',{}).get('output_tokens',0) for d in D),sum(d.get('deepseek',{}).get('cache_hit_tokens',0) for d in D))
print('usage tokens',sum(d.get('usage',{}).get('input_tokens',0) for d in D),sum(d.get('usage',{}).get('output_tokens',0) for d in D))
print('jev',[(d['_seq'],d.get('confidence'),d.get('no_jev'),d.get('reused_answer')) for d in D if d.get('decider')=='jev' and d.get('confidence',1)<.35])

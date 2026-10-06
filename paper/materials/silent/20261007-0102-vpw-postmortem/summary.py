from analyze import *
from datetime import datetime

def dump(v):print(json.dumps(v,ensure_ascii=False))
for d in ds:
 if d['decider']=='codex':dump(['BRAIN',d['ts'],d['floor'],d['label'],d.get('journal')])
 if d.get('boss_sim') and d['decider']=='codex':
  b=d['boss_sim'];dump(['SIM',d['floor'],d['label'],{k:b.get(k) for k in ['boss','entry_hp','samples','base','error']},d.get('chosen'),{k:v for k,v in b.get('options',{}).items() if k=='o0'}])
for group,dd in [('ALL',ds),('F39',[d for d in ds if d['floor']==39])]:
 j=[d for d in dd if d['decider']=='jev'];cc=[d for d in j if d['label'].startswith('combat/')]
 dump(['COUNTS',group,'jev',len(j),'low',sum((d.get('confidence') or 0)<.35 for d in j),'combat',len(cc),'combatlow',sum((d.get('confidence') or 0)<.35 for d in cc),'rollout',dict(collections.Counter(str(d.get('rollout_best_chosen')) for d in cc))])
 turns={(d['floor'],d['turn']) for d in dd if d['label'].startswith('combat/')};jt={(d['floor'],d['turn']) for d in cc};aut=[d for d in dd if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
 dump(['AUTONOMY',group,'turns',len(turns),'noJev',len(turns-jt),'autodecisions',len(aut),'autoturns',len({(d['floor'],d['turn']) for d in aut}),'nonend',len([d for d in aut if d.get('chosen',{}).get('action')!='end_turn']),'nonendturns',len({(d['floor'],d['turn']) for d in aut if d.get('chosen',{}).get('action')!='end_turn'})])
 focus=chosen=0;cf=collections.Counter()
 for d in cc:
  q=next(iter(d.get('questions',{}).values()),{});crit=q.get('criteria',{});options={k:v for k,v in crit.items() if isinstance(v,str)}
  ff=[k for k,v in options.items() if 'focus' in v.lower()];focus+=bool(ff);a=next(iter(d.get('answers',{}).values()),{}).get('choice');chosen+=a in ff
  if a in ff:cf[options[a].split('focus')[-1][:100]]+=1
 dump(['FOCUS',group,focus,chosen,dict(cf)])
for d in ds:
 if d.get('chosen',{}).get('action') in ['use_potion','discard_potion']:dump(['POTION_ACTION',d['floor'],d['turn'],d.get('chosen'),d.get('expect'),d.get('rationale')])
 if d.get('expect',{}).get('reward'):dump(['REWARD',d['floor'],d['expect']])
 if d['label']=='reward/claim' and 'potion' in json.dumps(d).lower():dump(['POTION_CLAIM',d['floor'],d.get('chosen'),d.get('expect'),d.get('rationale')])
dump(['TOKENS',{who:{k:sum(d.get('usage',{}).get(k,0) for d in ds if d['decider']==who) for k in ['input_tokens','output_tokens','cache_hit_tokens']} for who in ['jev','codex']}])

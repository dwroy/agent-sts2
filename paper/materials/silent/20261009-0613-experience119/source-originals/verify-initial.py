import json,bisect,hashlib,collections
from pathlib import Path
O=Path(__file__).parent;P=O/'0DJ6GFZZ0TG9'
S=[json.loads(l) for l in (P/'states.jsonl').open()];D=[json.loads(l) for l in (P/'decisions.jsonl').open()];T=[s['ts'] for s in S];SM={s['ts']:s['state'] for s in S}
checks=[]
def ok(name,value):
 assert value,name
 checks.append(name)
potion=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion' and str(d.get('result','')).startswith('completed')]
ok('八次实际飲药',len(potion)==8)
for f,t,pid in [(5,3,'ENERGY_POTION'),(9,1,'DUPLICATOR'),(9,3,'GLOWWATER_POTION'),(17,1,'POWER_POTION'),(22,1,'COLORLESS_POTION'),(22,1,'VULNERABLE_POTION'),(33,2,'TOUCH_OF_INSANITY'),(33,4,'FLEX_POTION')]:
 ok(str((f,t,pid)),any(d['floor']==f and d['turn']==t and (d.get('expect') or {}).get('potion',{}).get('id')==pid for d in potion))
rests=[]
for d in D:
 if d['screen']=='REST' and str(d.get('result','')).startswith('completed'):
  a=SM[d['ts']];b=S[min(bisect.bisect_right(T,d['ts']),len(S)-1)]['state'];ch=d.get('chosen') or {};action=ch.get('action');option=(d.get('expect') or {}).get('option',{}).get('id');rests.append(dict(floor=d['floor'],action=action,option=option,before=a['run']['current_hp'],after=b['run']['current_hp']))
ok('九火动作',[r['floor'] for r in rests]==[8,11,13,16,24,25,28,29,32])
heals=[r for r in rests if r['option']=='HEAL' or r['action']=='rest_heal'];ok('三回血各22',len(heals)==3 and all(r['after']-r['before']==22 for r in heals))
ok('非回血动作HP不增',all(r['after']==r['before'] for r in rests if r not in heals))
a=next(r['state'] for r in S if r['state']['run']['floor']==17 and r['state']['screen']=='REWARD');b=next(r['state'] for r in S if r['state']['run']['floor']==18)
ok('跨幕21到65上限76',a['run']['current_hp']==21 and b['run']['current_hp']==65 and a['run']['max_hp']==b['run']['max_hp']==76)
ok('纯Codex脑34次',collections.Counter(json.loads(l)['engine'] for l in (P/'brain.jsonl').open())=={'codex':34})
ok('无DeepSeek同窗',(P/'deepseek-reasoning.jsonl').stat().st_size==0)
# These checks use the actual pre-action frame rather than a predicted line.
d=next(d for d in D if d['floor']==33 and d['turn']==4 and (d.get('expect') or {}).get('card',{}).get('id')=='EXTERMINATE')
card=next(c for c in SM[d['ts']]['combat']['hand'] if c['card_id']=='EXTERMINATE')
(O/'exterminate-card.json').write_text(json.dumps(card,ensure_ascii=False,indent=2)+'\n')
(O/'verified.json').write_text(json.dumps(dict(checks=checks,rests=rests),ensure_ascii=False,indent=2)+'\n')
print('原行动/资源链核验',len(checks),'项全部通过；杀灭牌面',card['dynamic_values'])

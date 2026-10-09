import json,hashlib,re
from pathlib import Path
O=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-161301-postmortem')
S={json.loads(l)['line']:json.loads(l)['data'] for l in (O/'states.selected.jsonl').open()}
D={}
for l in (O/'decisions.numbered.jsonl').open():
 n,t=l.split(':',1);D[int(n)]=json.loads(t)
checks=[]
def ck(name,got,want):
 assert got==want,(name,got,want);checks.append({'name':name,'actual':got,'expected':want})
ck('决策数',len(D),412);ck('状态数',len(S),427)
ck('Jev低信心',sum(d['decider']=='jev' and isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35 for d in D.values()),15)
ck('推演最优原答',sum(d.get('rollout_best_chosen') is True for d in D.values()),84)
ck('推演布尔题',sum(isinstance(d.get('rollout_best_chosen'),bool) for d in D.values()),89)
ck('HP护栏替换',sum(bool(re.search('HP guard|hp.guard|guard override',d['rationale'])) for d in D.values()),0)
ck('显式饮用',sum(d['chosen']['action']=='use_potion' for d in D.values()),11)
ck('丢弃',sum(d['chosen']['action']=='discard_potion' for d in D.values()),0)
for by,want in [('jev',[606999,9987,0]),('codex',[3215742,5793,1609088])]:
 ck('token-'+by,[sum((d.get('usage') or {}).get(k,0) for d in D.values() if d['decider']==by) for k in ['input_tokens','output_tokens','cache_hit_tokens']],want)
R=json.loads((O/'C6Z8ATNBNHZ7-resources.json').read_text())
ck('窗口数',len(R['combats']),13)
for c,want in zip(R['combats'],[(56,49,70),(49,46,70),(46,38,70),(59,39,70),(39,33,77),(33,21,77),(44,22,77),(66,44,77),(44,28,77),(28,3,77),(28,7,77),(28,2,77),(28,0,77)]):
 ck('资源窗口'+str(c['sequence']),(c['entry']['hp'],(c['exit'] or c['last'])['hp'],c['entry']['max_hp']),want)
 ck('T1窗口'+str(c['sequence']),c['entry_is_turn_one'],True)
ck('末战HP',[S[n]['state']['run']['current_hp'] for n in [325180,325190,325193,325199,325204,325207,325215]],[28,20,16,6,2,2,0])
for before,after,hands in [(325100,325101,(5,8)),(325136,325137,(6,9)),(325172,325173,(7,10)),(325208,325209,(5,8))]:
 a,b=S[before]['state']['combat'],S[after]['state']['combat'];ck('狡诈手牌'+str(before),(len(a['hand']),len(b['hand'])),hands)
 added=b['hand'][-3:];ck('狡诈三刀'+str(before),[(x['card_id'],x['upgraded']) for x in added],[('SHIV',True)]*3)
 def power(x,k):return sum(p['amount'] for p in x['powers'] if p['power_id']==k)
 ck('狡诈力量'+str(before),power(b['player'],'STRENGTH_POWER'),0)
for n in [325209,325173,325137,325101]:
 ck('小刀牌面6-'+str(n),[v['current_value'] for v in S[n]['state']['combat']['hand'][-1]['dynamic_values'] if v['name']=='Damage'],[6])
ck('首试毒药仅破制品',[(p['power_id'],p['amount']) for p in S[325108]['state']['combat']['enemies'][0]['powers']],[])
ck('末次毒6',[(p['power_id'],p['amount']) for p in S[325214]['state']['combat']['enemies'][0]['powers']],[('POISON_POWER',6)])
ck('末次剩22',S[325215]['state']['combat']['enemies'][0]['current_hp'],22)
ck('末次攻击18',sum(i.get('total_damage') or 0 for e in S[325214]['state']['combat']['enemies'] for i in e['intents']),18)
ck('末次格挡0',S[325214]['state']['combat']['player']['block'],0)
ck('永久敏捷两防御14',S[325203]['state']['combat']['player']['block'],14)
ck('首轮临时敏捷4',[(p['power_id'],p['amount']) for p in S[325189]['state']['combat']['player']['powers']],[('DEXTERITY_POWER',4),('ANTICIPATE_POWER',4)])
ck('跨幕22到66',[S[n]['state']['run']['current_hp'] for n in [325010,325011]],[22,66])
ck('营火38到59',[S[n]['state']['run']['current_hp'] for n in [324873,324874]],[38,59])
ck('营火21到44',[S[n]['state']['run']['current_hp'] for n in [324964,324965]],[21,44])
# Verify every state used by resource_chain equals the separately streamed selected source.
for c in R['combats']:
 for z in [c['entry'],c['last']]+([c['exit']] if c['exit'] else []):
  raw=S[z['line']];ck('资源原帧-'+str(z['line']),[raw['ts'],raw['state']['run']['current_hp'],raw['state']['run']['max_hp']],[z['ts'],z['hp'],z['max_hp']])
for by in ['jev','codex']:
 ck('计数-'+by,sum(d['decider']==by for d in D.values()),133 if by=='jev' else 32)
# Source files are read only; record exact current live references.
base=Path('/home/dw/Projects/agent-sts2/.worktrees/live')
for path in ['agent/src/reflex/card-model.ts','agent/src/reflex/combat-plan.ts','agent/src/reflex/combat.ts']:
 data=(base/path).read_bytes();checks.append({'source':path,'sha256':hashlib.sha256(data).hexdigest()})
(O/'verification.json').write_text(json.dumps({'checks':len(checks),'passed':True,'details':checks},ensure_ascii=False,indent=2))
print('核验通过',len(checks))

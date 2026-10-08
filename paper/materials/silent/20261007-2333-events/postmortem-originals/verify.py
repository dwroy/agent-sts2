import json,re,hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
root=p.parents[2]
runs=['1913SE84AXQF','Q6M2Y34MWKRE']
section={};active=None
for line in (root/'notes/lessons.md').open():
 if line.startswith('## '):
  active=next((r for r in runs if line.startswith('## '+r+'（')),None)
  if active is not None:
   assert active not in section,'重复标题';section[active]=line
 elif active is not None:section[active]+=line
checks={}
with (root/'logs/states.jsonl').open('rb') as raw:
 for run in runs:
  rows=[]
  for line in (p/f'{run}-states.jsonl').open():
   obj=json.loads(line);offset=obj['_offset'];raw.seek(offset);orig=json.loads(raw.readline())
   assert all(obj[k]==v for k,v in orig.items()),(run,obj['_line'])
   rows.append(obj)
  resource=json.loads((p/f'{run}-resources.json').read_text());txt=section[run];verified=[]
  for combat in resource['combats']:
   entry,end=combat['entry'],combat['exit'];assert entry['hp']-end['hp']==combat['observed_net_hp_loss']
   assert entry['max_hp']==70 and end['max_hp']==70
   assert f"{entry['hp']}→{end['hp']}" in txt
   assert str(entry['line']) in txt and str(end['line']) in txt
   assert entry['ts'][11:-1] in txt and end['ts'][11:-1] in txt
   window=[s for s in rows if entry['line']<=s['_line']<=end['line']]
   turns={}
   for row in window:
    state=row['state']
    if state.get('in_combat') and state.get('combat',{}).get('action_readiness',{}).get('can_use_combat_actions'):
     turns.setdefault(state['turn'],row)
   seq=list(turns.values());need=[];damage=[];loss=[]
   for i,row in enumerate(seq):
    s=row['state'];n=(seq[i+1] if i+1<len(seq) else window[-1])['state']
    need.append(sum(e['current_hp'] for e in s['combat']['enemies']))
    damage.append(need[-1]-sum(e['current_hp'] for e in (n.get('combat') or {}).get('enemies',[])))
    loss.append(s['run']['current_hp']-n['run']['current_hp'])
   arr=lambda values:'['+','.join(map(str,values))+']'
   for a in [need,damage,loss]:assert arr(a) in txt,(run,combat['floor'],a)
   verified.append({'floor':combat['floor'],'entry':entry,'exit':end,'need':need,'net_enemy_hp_reduction':damage,'net_player_hp_loss':loss})
  checks[run]={'raw_seek_verified_states':len(rows),'combat_windows':verified,'section_sha256':hashlib.sha256(txt.encode()).hexdigest()}
  print(run,len(rows),'原始帧按偏移复核，',len(verified),'战资源与每轮数组一致')
# 死亡轮的攻击/防御/血量及末敌HP重新核对，不将超出余血的需损当已实扣。
a={s['_line']:s['state'] for s in [json.loads(x) for x in (p/'1913SE84AXQF-states.jsonl').open()]}
s=a[282782];assert s['run']['current_hp']==20 and s['combat']['player']['block']==6
assert [e['current_hp'] for e in s['combat']['enemies']]==[7,25,19]
attacks=[sum(i.get('total_damage') or 0 for i in e['intents']) for e in s['combat']['enemies']]
assert attacks==[12,12,8] and sum(attacks)-6==26
assert [e['current_hp'] for e in a[282783]['combat']['enemies']]==[0,17,15]
b={s['_line']:s['state'] for s in [json.loads(x) for x in (p/'Q6M2Y34MWKRE-states.jsonl').open()]}
s=b[282920];assert s['run']['current_hp']==2 and s['combat']['player']['block']==10
assert sum(i.get('total_damage') or 0 for i in s['combat']['enemies'][0]['intents'])==12
assert b[282921]['combat']['enemies'][0]['current_hp']==33
assert [b[line]['combat']['enemies'][0]['current_hp'] for line in [282887,282888,282889,282891,282892]]==[103,95,85,83,80]
for run in runs:
 ds=[json.loads(x) for x in (p/f'{run}-decisions.jsonl').open()]
 jev=[o for o in ds if o['decider']=='jev'];choice=[o for o in jev if o['label']=='combat/plan-choice']
 booleans=[o for o in choice if isinstance(o.get('rollout_best_chosen'),bool)]
 stats={'jev':len(jev),'low_confidence_lt_035':sum(o.get('confidence',1)<.35 for o in jev),'choices':len(choice),'best_true':sum(o['rollout_best_chosen'] for o in booleans),'best_boolean_n':len(booleans)}
 checks[run]['choice_statistics']=stats;print(run,stats)
regs=json.loads((p/'proposal-registration.json').read_text())
for reg in regs:
 obj=json.loads((p/f"proposal-{reg['proposal']}.json").read_text())
 assert Path(obj['proposal']).is_file() and reg['exit']==0
checks['proposal_registration']=regs
checks['ledger_check_exit']=0
checks['limitations']=['原文误写保留；最终以每局追加勘误为准。','live在审计期间被其他流程更新，引用的三处现行文件行号仍1043/745/2252；本任务没有源码写入。','五条ledger update首轮缺JSON id退出2未写，重试成功；失败历史已保存。']
(p/'verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('关键死亡数字、紧勒伤害、账本及四提案关联核验通过')

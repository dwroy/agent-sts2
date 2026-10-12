import json,re,hashlib
from pathlib import Path
P=Path(__file__).parent
def read(name):
 out={}
 for l in (P/(name+'-match.txt')).open():
  n,_,s=l.partition(':');out[int(n)]=json.loads(s)
 return out
D=read('decisions');S=read('states');B=read('brain');C=json.loads((P/'P2M3DFJ4DEZ3-resources.json').read_text());A=json.loads((P/'audit.json').read_text())
hp=lambda n:S[n]['state']['run']['current_hp']
combat=lambda n:S[n]['state']['combat']
power=lambda n,id:next((p['amount'] for p in combat(n)['player']['powers'] if p['power_id']==id),0)
enemy=lambda n,id:next(e for e in combat(n)['enemies'] if e['enemy_id']==id)
poison=lambda n,id:next((p['amount'] for p in enemy(n,id)['powers'] if p['power_id']=='POISON_POWER'),0)
assert hp(310195)==19 and hp(310197)==19 and hp(310198)==21
assert hp(310391)==6 and combat(310391)['player']['block']==21 and combat(310391)['lethal_risks'][0]['incoming_damage']==27
assert S[310392]['state']['turn']==5 and hp(310392)==0
assert [enemy(310392,x)['current_hp'] for x in ['QUEEN','TORCH_HEAD_AMALGAM']]==[403,79]
assert poison(310380,'TORCH_HEAD_AMALGAM')==2 and poison(310381,'TORCH_HEAD_AMALGAM')==12
assert enemy(310381,'TORCH_HEAD_AMALGAM')['current_hp']==132
assert hp(310382)==18 and hp(310385)==6 and combat(310382)['player']['block']==24
assert any(c['card_id']=='NEUTRALIZE' for c in combat(310382)['hand']) and not any(c['card_id']=='NEUTRALIZE' for c in combat(310383)['hand'])
assert D[302598]['confidence']==.23
q=json.loads(D[302145]['questions']['plan']['criteria']['plan3'])
assert q['hp_lost']==39 and q['block_gained']==14
assert power(309858,'UNMOVABLE_POWER')==0 and power(309859,'UNMOVABLE_POWER')==1
assert combat(309860)['player']['block']==28 and hp(309858)-hp(309861)==25
assert enemy(310342,'TORCH_HEAD_AMALGAM')['current_hp']==2 and not any(e['enemy_id']=='TORCH_HEAD_AMALGAM' for e in combat(310348)['enemies'])
assert len(C['combats'])==30 and all(c['entry_is_turn_one'] for c in C['combats'])
assert len(D)==1247 and len(B)==51
assert sum(r.get('rollout_best_chosen') is True for r in D.values())==215
assert sum(r.get('rollout_best_chosen') is False for r in D.values())==6
assert len(A['guards'])==17 and A['guard_model_saved']==219 and A['guard_model_damage_cost']==179
assert len(A['potions'])==24 and all(r['chosen']['action']=='use_potion' for r in A['potions'])
assert len(S[310391]['state']['run']['deck'])==35
assert not any(any(x['power_id']=='SERPENT_FORM_POWER' for x in (r['state'].get('combat') or {}).get('player',{}).get('powers',[])) for r in S.values())
for n,s in [(301364,'三营火保血，前期补强，再挑战后期精英。'),(301646,'零费打击补输出，营火前置避险，补毒与过牌。'),(301876,'额外抽牌加速启动；少打精英，留金补强双王。')]:assert s in D[n]['rationale']
text=(P/'lesson-draft.md').read_text();assert len([l for l in text.splitlines() if l.startswith('- [')])==4
assert '第5试T7结束后聚合体退场' in text and 'F49末试T3轮初' in text
result={'run':'P2M3DFJ4DEZ3','verified':True,'draft_sha256':hashlib.sha256(text.encode()).hexdigest(),'checks':['进场19／21分账','死亡T5／6HP／21挡／27攻击及余403／79','升级蛇咬10毒','单弃中和与12实损','坚定不移14预测／28实挡及39预测／25实损','聚合体实际T7死亡','30战斗T1首帧及完整资源链','药水24饮用／0丢弃','护栏17中间比较模型账','最优215／221及全局51脑调用','构筑35牌且无群蛇实建','三条中文原话']}
(P/'verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))

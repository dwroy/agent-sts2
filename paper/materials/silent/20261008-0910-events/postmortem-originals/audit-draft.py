import json,pathlib,collections,re,datetime
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem');S=json.loads((P/'states.json').read_text());D=json.loads((P/'decisions.json').read_text());R=json.loads((P/'ZTRGYYMLR8SC-resources.json').read_text());L=json.loads((P/'sl.json').read_text())
def frame(n):return next(s['state'] for s in S if s['_line']==n)
assert len(D)==594 and len(S)==607 and len(L)==6 and len(R['combats'])==12
assert all(c['entry_is_turn_one'] for c in R['combats'])
assert [c['observed_net_hp_loss'] for c in R['combats'][:6]]==[13,7,0,5,20,6]
assert all(c['exit'] is None for c in R['combats'][6:11])
assert [l['turns'] for l in L]==[15,10,14,14,14,14]
assert [l['result'] for l in L]==['predicted_death']*5+['died']
assert all(c['entry']['hp']==68 and c['entry']['potions']==[[0,'HEART_OF_IRON'],[1,'BOTTLED_POTENTIAL']] for c in R['combats'][6:])
assert frame(292401)['combat']['player']['current_hp']==4
assert frame(292401)['combat']['player']['block']==6
assert frame(292401)['combat']['enemies'][0]['current_hp']==58
assert frame(292401)['combat']['enemies'][0]['intents'][0]['total_damage']==13
assert frame(292402)['run']['current_hp']==0
assert 13-6==7 and 7-4+1==4
assert [frame(n)['run']['current_hp'] for n in [291914,291915,291959,291960,291998,291999]]==[31,52,32,53,47,68]
assert sum(c['observed_net_hp_loss'] for c in R['combats'][:6])==51
assert len([d for d in D if d['chosen']['action']=='use_potion'])==17
assert not any(d['chosen']['action']=='discard_potion' for d in D)
new=[e for e in R['resource_changes'] if e['combat_sequence'] is None and not e['restart_boundary'] and len(e['to']['potions'])>len(e['from']['potions'])]
assert len(new)==7
assert len([d for d in D if 'HP guard:' in d['rationale']])==3
assert len([d for d in D if 'SL explore:' in d['rationale']])==13
assert len([d for d in D if d['decider']=='jev' and d['confidence']<.35])==16
rb=[d for d in D if isinstance(d.get('rollout_best_chosen'),bool) and d['decider']=='jev'];assert len(rb)==129 and sum(d['rollout_best_chosen'] for d in rb)==122
kills=[]
for c in R['combats'][6:]:
 prev=None;k=[]
 for r in S:
  if c['entry']['line']<=r['_line']<=c['last']['line']:
   en=r['state']['combat']['enemies'];num=sum(e['enemy_id']=='KIN_FOLLOWER' and e['current_hp']>0 for e in en)
   if prev is not None and num<prev:k.extend([r['state']['turn']]*(prev-num))
   prev=num
 kills.append(k)
assert kills==[[5,8],[8,10],[5,10],[7,10],[5,8],[7,9]],kills
print('所有核对断言通过；击杀时点',kills)
print('回报限定：未找到纯bug，三条已有经验均补support，没有repeat；机制亦只补已有条目。')
(P/'audit-result.json').write_text(json.dumps({'passed':True,'run':'ZTRGYYMLR8SC','kills':kills,'guards':3,'sl_overrides':13,'new_potions':7,'drink_actions':17,'jev_best':[122,129],'bugs':[]},ensure_ascii=False,indent=2))

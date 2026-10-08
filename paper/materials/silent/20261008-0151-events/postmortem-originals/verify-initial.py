import json,re,collections,hashlib
from pathlib import Path
p=Path(__file__).parent;D=json.loads((p/'decisions.json').read_text());S=json.loads((p/'states.json').read_text());R=json.loads((p/'P74C04AEPL1F-resources.json').read_text());by={s['_line']:s['state'] for s in S}
checks=[]
def check(label,actual,expected):
 assert actual==expected,(label,actual,expected);checks.append({'项目':label,'实际':actual})
check('资源链场次数',len(R['combats']),15)
check('十一场奖励退出',[c['exit']['screen'] for c in R['combats'][:11]],['REWARD']*11)
check('进场HP',[c['entry']['hp'] for c in R['combats']],[56,51,51,51,63,63,54,69,61,61,53,9,9,9,9])
check('退出或截断末HP',[(c['exit'] or c['last'])['hp'] for c in R['combats']],[51,51,51,42,63,54,48,28,61,53,9,4,1,5,0])
check('maxHP及T1首帧',[(c['entry']['max_hp'],c['entry_is_turn_one']) for c in R['combats']],[(70,True)]*15)
check('末战T3血量格挡',(by[284820]['run']['current_hp'],by[284820]['combat']['player']['block']),(1,16))
check('末战T3来袭',sum(i.get('total_damage') or 0 for e in by[284820]['combat']['enemies'] for i in e.get('intents',[])),24)
check('末战死亡与剩血',(by[284821]['run']['current_hp'],[e['current_hp'] for e in by[284821]['combat']['enemies']]),(0,[47,22,2]))
check('末战T3未打精确切击',[d['chosen']['card_index'] for d in D if d['_line']==278543],[2])
check('精确切击弃前弃后',('PRECISE_CUT' in [x['card_id'] for x in by[284817]['combat']['hand']], 'PRECISE_CUT' in [x['card_id'] for x in by[284818]['combat']['hand']]),(True,False))
check('F22两笔关键实掉血',(by[284739]['run']['current_hp']-by[284744]['run']['current_hp'],by[284749]['run']['current_hp']-by[284754]['run']['current_hp']),(20,24))
check('F22寄生击杀复活',(by[284748]['combat']['enemies'][0]['current_hp'],by[284749]['combat']['enemies'][0]['current_hp']),(0,21))
check('药水饮用',len([d for d in D if d.get('chosen',{}).get('action')=='use_potion']),8)
check('药水丢弃',len([d for d in D if d.get('chosen',{}).get('action')=='discard_potion']),0)
q=[d for d in D if d.get('decider')=='jev' and 'plan-choice' in d.get('label','')]
check('原答推演最优',(sum(d.get('rollout_best_chosen') is True for d in q),len(q)),(57,58))
check('低信心',sum(d.get('decider')=='jev' and d.get('confidence',1)<.35 for d in D),6)
check('SL最大尝试',[s['max_attempts'] for s in json.loads((p/'sl.json').read_text()) if s['floor']==23],[4]*4)
check('赠礼仪式和下一轮力量',([x['amount'] for x in by[284465]['combat']['player']['powers'] if x['power_id']=='RITUAL_POWER'],[x['amount'] for x in by[284466]['combat']['player']['powers'] if x['power_id']=='STRENGTH_POWER']),([1],[1]))
check('火焰实扣与滑溜变化',(by[284630]['combat']['enemies'][0]['current_hp']-by[284631]['combat']['enemies'][0]['current_hp'],by[284630]['combat']['enemies'][0]['powers'][0]['amount'],by[284631]['combat']['enemies'][0]['powers'][0]['amount']),(1,8,7))
check('药水槽与饮用帧',[(n,[x['potion_id'] for x in by[n]['run']['potions'] if x['occupied']]) for n in [284465,284553,284563,284577,284605,284631,284704,284732]],[(284465,[]),(284553,['BLOCK_POTION']),(284563,[]),(284577,[]),(284605,[]),(284631,[]),(284704,[]),(284732,[])])
(p/'verification.json').write_text(json.dumps({'核对':checks,'通过':True},ensure_ascii=False,indent=2)+'\n')
print('关键数据核对通过：',len(checks),'项')

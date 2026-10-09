import json,collections,datetime,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];A=[json.loads(x) for x in (p/'sl-attempts.jsonl').open()]
B=[json.loads(x) for x in (p/'brain.jsonl').open()];R=json.loads((p/'SDY5T9XCSQN2-resources.json').read_text());T=json.loads((p/'turns.json').read_text())
checks=[]
def check(name, actual, expected):
 assert actual==expected,(name,actual,expected)
 checks.append({'项':name,'值':actual})
check('决策数',len(D),644);check('状态帧数',len(S),652);check('脑请求数',len(B),17)
check('战斗入口',[c['entry']['hp'] for c in R['combats']],[56,51,51,70,56,49,43,65,65,65,65,65,65]);check('窗口最大HP',[c['entry']['max_hp'] for c in R['combats']],[70]*13)
check('退出HP',[c['exit']['hp'] if c['exit'] else None for c in R['combats']],[51,51,49,4,49,43,40,None,None,None,None,None,0]);check('所有首帧T1',all(c['entry_is_turn_one'] for c in R['combats']),True)
check('SL结束回合',[a['turns'] for a in A],[16,16,15,16,16,15]);check('SL结束HP',[a['end_hp'] for a in A],[8,11,11,11,6,0]);check('SL威胁',[a['incoming'] for a in A],[44,44,33,44,44,33])
check('最终攻击前HP',[t for t in T if t['sequence']==13 and t['turn']==15][0]['end']['hp'],11);check('最终挡',[t for t in T if t['sequence']==13 and t['turn']==15][0]['end']['block'],9);check('终局敌HP',S[-1]['state']['combat']['enemies'][0]['current_hp'],7)
check('最终存活血量缺口',33-9-11+1,14)
check('骇鳗HP实损',[t['start']['hp']-(t['next']['hp'] if t['next'] else 4) for t in T if t['sequence']==4],[13,0,13,4,0,0,31,5,0]);check('末试HP实损',[t['start']['hp']-(t['next']['hp'] if t['next'] else 0) for t in T if t['sequence']==13],[0,12,0,0,12,0,2,0,0,16,0,12,0,0,11])
check('护栏次数',sum('HP guard:' in d['rationale'] for d in D),1)
check('Jev输入',sum(d.get('usage',{}).get('input_tokens',0) for d in D if d['decider']=='jev'),780721);check('Jev输出',sum(d.get('usage',{}).get('output_tokens',0) for d in D if d['decider']=='jev'),6600)
for name,val in [('inputTokens',2265795),('outputTokens',3767),('cacheHitTokens',1483776),('reasoningTokens',2531)]:check('脑'+name,sum(b['usage'].get(name,0) for b in B),val)
check('Jev低信心',sum(d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35 for d in D),3);check('原答最优数',sum(d.get('rollout_best_chosen') is True for d in D),107)
check('原答最优有效分母',sum(type(d.get('rollout_best_chosen')) is bool for d in D),109)
check('实际引擎',sorted(set(b['engine'] for b in B)),['codex'])
check('末次本体直扣',sum(t['start']['enemies'][0]['hp']-t['end']['enemies'][0]['hp'] for t in T if t['sequence']==13),213)
# 原日志按抽取时的字节偏移重新读取，核对原件而非仅对中间结果。
for name,rows in [('decisions',D),('states',S),('sl-attempts',A),('brain',B)]:
 with (root/'logs'/f'{name}.jsonl').open('rb') as f:
  for row in rows:
   f.seek(row['_offset']);raw=json.loads(f.readline());saved={k:v for k,v in row.items() if k not in ['_line','_offset']};assert raw==saved,(name,row['_line'])
 check(name+'原件逐条seek核验',len(rows),len(rows))
(p/'verification.json').write_text(json.dumps({'核验':checks,'退出码':0},ensure_ascii=False,indent=2)+'\n')
print('原件核验通过；检查项',len(checks))

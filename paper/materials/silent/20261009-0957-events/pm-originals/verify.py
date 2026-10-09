from pathlib import Path
import json,collections,datetime,hashlib,re
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-094302-postmortem';rid='NTMAU4XZ2NN2'
ss=json.loads((p/f'{rid}-states.json').read_text());ds=json.loads((p/f'{rid}-decisions.json').read_text());rc=json.loads((p/f'{rid}-resources.json').read_text());checks=[]
def check(name,test):
    if not test:raise AssertionError(name)
    checks.append(name)
for stem,rows in [('states',ss),('decisions',ds),('run-plans',json.loads((p/f'{rid}-run-plans.json').read_text()))]:
    with (root/'logs'/f'{stem}.jsonl').open('rb') as f:
        for row in rows:
            f.seek(row['_offset']);raw=json.loads(f.readline())
            check(f'{stem}:{row["_line"]}原字节',raw=={k:v for k,v in row.items() if k not in ['_offset','_line']})
check('决策214状态220',len(ds)==214 and len(ss)==220)
check('六场全T1有退出',len(rc['combats'])==6 and all(c['entry_is_turn_one'] and c['exit'] for c in rc['combats']))
check('进出HP及药槽',[(c['floor'],c['entry']['hp'],c['exit']['hp'],c['entry']['potions'],c['exit']['potions']) for c in rc['combats']]==[(2,56,51,[],[]),(4,51,43,[[0,'STRENGTH_POTION']],[]),(8,43,41,[[0,'WEAK_POTION']],[]),(11,62,45,[],[]),(13,66,43,[],[]),(14,43,0,[],[])])
needs={2:[42,24,20,14,10,10,2],4:[58,52,31,15,7],8:[56,38,23,9],11:[64,58,36,30,21,3],13:[93,78,67,56,51,39,21],14:[66,51,41,35,20,9,79,59,44,37]}
losses={2:[0,0,2,0,0,3,0],4:[0,0,8,0,0],8:[0,2,0,0],11:[0,0,11,6,0,0],13:[0,0,9,0,0,14,0],14:[0,2,0,3,3,0,7,13,7,8]}
deduct={2:[18,4,6,4,0,8,2],4:[6,21,16,8,7],8:[18,15,14,9],11:[6,22,6,9,18,3],13:[15,11,11,5,12,18,21],14:[15,10,6,15,11,9,20,15,7,11]}
for c in rc['combats']:
    f=c['floor'];turns={}
    for r in ss:
        s=r['state'];combat=s.get('combat') or {}
        if s['run']['floor']==f and s.get('in_combat') and combat.get('action_readiness',{}).get('can_use_combat_actions'):
            turns.setdefault(s['turn'],r)
    rows=list(turns.values());hp=[v['state']['run']['current_hp'] for v in rows]
    seen=[sum(e['current_hp'] for e in v['state']['combat']['enemies'] if e['is_alive']) for v in rows]
    check(f'F{f}轮初需求',seen==needs[f])
    check(f'F{f}玩家净损',[hp[i]-hp[i+1] for i in range(len(hp)-1)]+[hp[-1]-c['exit']['hp']]==losses[f])
    end=sum(e['current_hp'] for e in next(v for v in ss if v['_line']==c['exit']['line'])['state']['combat']['enemies'] if e['is_alive'])
    got=[seen[i]-seen[i+1] for i in range(len(seen)-1)]+[seen[-1]-end]
    if f==14:got[5]+=79
    check(f'F{f}截断敌HP减少',got==deduct[f])
S={v['_line']:v for v in ss};D={v['_line']:v for v in ds}
check('末轮8血5挡三感染',S[318295]['state']['run']['current_hp']==8 and S[318295]['state']['combat']['player']['block']==5 and sum(x['card_id']=='INFECTION' for x in S[318295]['state']['combat']['hand'])==3)
check('末态敌22及4',[(e['current_hp'],e['max_hp']) for e in S[318296]['state']['combat']['enemies']]==[(22,22),(4,19)])
check('完整损15余负7',9+11-5==15 and 8-15==-7 and '(-7)' in D[310049]['rationale'])
check('护栏唯一',sum('HP guard' in v['rationale'] for v in ds)==1 and 'hp -12' in D[310016]['rationale'] and 'hp -2' in D[310016]['rationale'])
check('时钟投影',D[309976]['boss_sim']['options']['o0']['boss_left']==177.639 and D[309976]['boss_sim']['options']['o0']['hp']==61)
check('药水完成时间',S[318122]['ts']=='2026-10-09T01:09:36.065Z' and S[318172]['ts']=='2026-10-09T01:12:09.122Z')
check('低信心',sum(v['decider']=='jev' and v.get('confidence',1)<.35 for v in ds)==5 and sum(v['decider']=='jev' and v.get('confidence',1)<.4 for v in ds)==7)
check('最优29含一缺',collections.Counter(v.get('rollout_best_chosen') for v in ds if v['label']=='combat/plan-choice')=={True:29,None:1})
check('Jev输入输出',sum(v['usage'].get('input_tokens',0) for v in ds if v['decider']=='jev')==156618 and sum(v['usage'].get('output_tokens',0) for v in ds if v['decider']=='jev')==2162)
brains=[v['deepseek'] for v in ds if v.get('deepseek') and not v['deepseek'].get('reused')]
check('13次实际Codex',len(brains)==13 and all(v['brain']['engine']=='codex' for v in brains))
check('大脑输入输出缓存',[sum(v.get(k,0) for v in brains) for k in ['input_tokens','output_tokens','cache_hit_tokens']]==[1750705,4151,744960])
check('无SL',json.loads((p/f'{rid}-sl-attempts.json').read_text())==[])
check('3条经验',len(re.findall(r'^- \[(?!记录)',(p/'lesson-draft.md').read_text(),re.M))==3)
print(json.dumps({'checks':len(checks),'passed':checks},ensure_ascii=False,indent=2))

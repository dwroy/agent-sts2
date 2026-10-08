import bisect, json
from pathlib import Path
O=Path(__file__).parent;A=json.load((O/'audit.json').open());checks=[]
def pw(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def check(name,ok,data=None):
    assert ok,(name,data)
    checks.append(dict(name=name,data=data,passed=True))
for ident,power,delta in [('GHOST_IN_A_JAR','INTANGIBLE_POWER',1),('REGEN_POTION','REGEN_POWER',5)]:
    rows=[x for x in A['potions'] if (x.get('potion') or {}).get('id')==ident]
    check(ident+'全部饮用实际建立层数',all(x['after']['powers'].get(power,0)-x['before']['powers'].get(power,0)==delta for x in rows),dict(runs=len({x['run'] for x in rows}),drinks=len(rows)))
    if ident=='GHOST_IN_A_JAR':
        for run in sorted({x['run'] for x in rows}):
            S=[json.loads(l) for l in (O/run/'states.jsonl').open()]
            for r in [x for x in rows if x['run']==run]:
                s=next(x['state'] for x in S if x['ts']>r['ts'] and x['state']['run']['floor']==r['floor'] and x['state'].get('turn')==r['turn']+1 and x['state'].get('combat'))
                check('幽灵下一轮撤 '+run+' '+r['ts'],pw(s['combat']['player']).get(power,0)==0)
check('历史silent没有与我一战实际施放',not any(x['run']!='SY0WMJNNVRLM' and x['card']=='FIGHT_ME' for x in A['cards']))
S=[json.loads(l) for l in (O/'SY0WMJNNVRLM/states.jsonl').open()];D=[json.loads(l) for l in (O/'SY0WMJNNVRLM/decisions.jsonl').open()]
starts=[];ends=[]
for a in [2,3]:
    d=next(d for d in D if d['floor']==21 and d['turn']==4 and d['sl_attempt']==a)
    starts.append(next(s['state'] for s in S if s['ts']==d['ts']))
    d=next(d for d in D if d['floor']==21 and d['turn']==4 and d['sl_attempt']==a and (d.get('chosen') or {}).get('action')=='end_turn')
    i=next(i for i,s in enumerate(S) if s['ts']==d['ts']);ends.append((S[i]['state'],S[i+1]['state']))
check('异螨第二第三试T4相同完整combat和HP',starts[0]['combat']==starts[1]['combat'] and starts[0]['run']['current_hp']==starts[1]['run']['current_hp']==9)
check('胜试实际弱化攻击者并付6血',ends[1][0]['combat']['player']['block']==0 and ends[1][1]['run']['current_hp']==3 and ends[1][0]['combat']['enemies'][1]['intents'][0]['total_damage']==6)
check('第二试零损但次轮仍22血/第三试毒退第一敌且另敌受荆棘余12',ends[0][1]['run']['current_hp']==9 and ends[0][1]['combat']['enemies'][0]['current_hp']==22 and len(ends[1][1]['combat']['enemies'])==1 and ends[1][1]['combat']['enemies'][0]['current_hp']==12 and ends[1][0]['combat']['enemies'][0]['current_hp']==6 and pw(ends[1][0]['combat']['enemies'][0]).get('POISON_POWER')==8)
sl=[json.loads(l) for l in (O/'SY0WMJNNVRLM/sl-attempts.jsonl').open()]
ss=[x for x in sl if x['floor']==21]
check('异螨三试共有22张已记录前缀且第二第三试26张相同',len(ss[0]['draws']['order'])==22 and all(x['draws']['order'][:22]==ss[0]['draws']['order'] for x in ss) and ss[1]['draws']['order']==ss[2]['draws']['order'])
(O/'extra-numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('历史药水及同盘补充核验通过',len(checks),'项')

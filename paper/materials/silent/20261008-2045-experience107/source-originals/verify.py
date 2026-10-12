import bisect
import collections
import json
from pathlib import Path

O = Path(__file__).parent
RUN = 'CNKR125PFHJ5'
S = [json.loads(x) for x in (O/RUN/'states.jsonl').open()]
D = [json.loads(x) for x in (O/RUN/'decisions.jsonl').open()]
stamps = [x['ts'] for x in S]
checks = []

def power(entity, name):
    return next((p['amount'] for p in entity.get('powers', []) if p['power_id'] == name), 0)

def pair(card, floor, turn):
    d = next(d for d in D if d['floor']==floor and d['turn']==turn and (d.get('expect') or {}).get('card',{}).get('id')==card and d['chosen']['action']=='play_card')
    i = stamps.index(d['ts'])
    return S[i]['state'], S[i+1]['state']

def check(name, actual, expected):
    assert actual == expected, (name, actual, expected)
    checks.append(dict(theme=name, actual=actual, expected=expected, run=RUN))

def enemy(s):
    return s['combat']['enemies'][0]

a,z = pair('FOOTWORK',33,2)
check('步法升级建立3敏捷',power(z['combat']['player'],'DEXTERITY_POWER')-power(a['combat']['player'],'DEXTERITY_POWER'),3)
a,z = pair('DEFEND_SILENT',33,3)
check('四敏防御得9挡',z['combat']['player']['block']-a['combat']['player']['block'],9)
a,z = pair('SURVIVOR',33,3)
check('四敏生存者得12挡',z['combat']['player']['block']-a['combat']['player']['block'],12)
a,z = pair('ACCELERANT',33,6)
check('升级触媒只建立2层',power(z['combat']['player'],'ACCELERANT_POWER'),2)
check('触媒当步未伤敌',[enemy(a)['current_hp'],enemy(z)['current_hp']],[224,224])
check('触媒当步未施毒',[power(enemy(a),'POISON_POWER'),power(enemy(z),'POISON_POWER')],[30,30])
f33=[r['state'] for r in S if r['state']['run']['floor']==33]
terminal=f33[-1]; pre=f33[-2]
check('末轮33毒三结96',[enemy(pre)['current_hp']-enemy(terminal)['current_hp'],power(enemy(pre),'POISON_POWER')-power(enemy(terminal),'POISON_POWER')],[96,3])
check('沙坑独立截止',[pre['run']['current_hp'],pre['combat']['player']['block'],power(enemy(pre),'SANDPIT_POWER'),terminal['run']['current_hp'],enemy(terminal)['current_hp']],[27,9,1,0,121])
check('攻击账剩12',27-(24-9),12)
a,z=pair('FRANTIC_ESCAPE',33,5)
check('逃离加一', [power(enemy(a),'SANDPIT_POWER'),power(enemy(z),'SANDPIT_POWER')],[1,2])
starts={t:next(s for s in f33 if s['screen']=='COMBAT' and s['turn']==t and s['combat']['player']['energy']>0) for t in range(1,7)}
check('口红第三轮力敏',[power(starts[2]['combat']['player'],'STRENGTH_POWER'),power(starts[3]['combat']['player'],'STRENGTH_POWER'),power(starts[2]['combat']['player'],'DEXTERITY_POWER'),power(starts[3]['combat']['player'],'DEXTERITY_POWER')],[0,1,0,4])
check('毒雾后轮毒',[power(enemy(starts[t]),'POISON_POWER') for t in range(3,7)],[5,7,16,30])
check('敌力量三两击24',[power(enemy(starts[5]),'STRENGTH_POWER'),enemy(starts[5])['intents'][0]['total_damage']],[3,24])
check('全局饮药动作',sum(d.get('chosen',{}).get('action')=='use_potion' for d in D),7)
check('全局没有弃药',sum(d.get('chosen',{}).get('action')=='discard_potion' for d in D),0)
check('死亡仍持幽灵',[p['potion_id'] for p in terminal['run']['potions'] if p.get('potion_id')],['GHOST_IN_A_JAR'])
B=[json.loads(x) for x in (O/RUN/'brain.jsonl').open()]
check('实际脑请求',[len(B),dict(collections.Counter(x['engine'] for x in B))],[30,{'codex':30}])
SL=[json.loads(x) for x in (O/RUN/'sl-attempts.jsonl').open()]
check('只有首试没有重打',[(x['floor'],x['attempt'],x['result']) for x in SL],[(17,1,'won'),(30,1,'won'),(33,1,'died')])
for floor, hp0,hp1 in [(30,138,135),(33,341,338),(29,171,171)]:
    rows=[r['state'] for r in S if r['state']['run']['floor']==floor and r['state']['screen']=='COMBAT']
    check('水银首行动前F'+str(floor),[enemy(rows[0])['current_hp'],enemy(rows[1])['current_hp']],[hp0,hp1])
    check('水银阶段玩家HP不变F'+str(floor),rows[0]['run']['current_hp'],rows[1]['run']['current_hp'])
    intervening=[d for d in D if rows[0]==next((r['state'] for r in S if r['ts']==d['ts']),None)]
    check('水银起始帧无牌药F'+str(floor),[d['chosen']['action'] for d in intervening if d.get('chosen')],[])
relic26=next(d for d in D if d['floor']==26 and d['label']=='chest/relic')
check('F26实际领取音叉',relic26['expect']['option']['id'],'TUNING_FORK')
before29=next(r['state'] for r in S if r['state']['run']['floor']==29 and r['state']['screen']=='COMBAT')
check('F29战内未持有水银沙漏',any(r['relic_id']=='MERCURY_HOURGLASS' for r in before29['run']['relics']),False)
claim29=next(d for d in D if d['floor']==29 and d['label']=='reward/claim' and '水银沙漏' in d['expect']['option']['text'])
check('水银实际领取时间',claim29['ts'],'2026-10-08T11:35:53.563Z')
a,z=pair('DEFEND_SILENT',30,3)
played=next(c for c in a['combat']['hand'] if c['card_id']=='DEFEND_SILENT')
check('虱虫脆弱三敏防御牌面',played['resolved_rules_text'],'获得6点格挡。')
check('虱虫防御整步非纯牌挡',[a['combat']['player']['block'],z['combat']['player']['block']],[0,13])
for card,expected in [('AFTERIMAGE',0),('NOXIOUS_FUMES',1),('DEADLY_POISON',1)]:
    a,z=pair(card,23,1)
    check('余像首次及后续逐牌挡'+card,z['combat']['player']['block']-a['combat']['player']['block'],expected)
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('独立状态数字核验通过',len(checks))

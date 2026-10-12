import bisect, collections, hashlib, json
from pathlib import Path
O=Path(__file__).parent; A=json.load(open(O/'audit.json')); N='LYBHQ1X230ZB'
C=[r for r in A['cards'] if r['run']==N]
S=[json.loads(s) for s in (O/N/'states.jsonl').open()]
D=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
stamps=[s['ts'] for s in S]; SM={s['ts']:s['state'] for s in S}
def card(f,t,c):
    row=next((r for r in C if (r['floor'],r['turn'],r['card'])==(f,t,c)),None)
    if row:return row
    d=next(d for d in D if (d['floor'],d['turn'],(d.get('expect') or {}).get('card',{}).get('id'))==(f,t,c) and (d.get('chosen') or {}).get('action')=='play_card')
    before=SM[d['ts']]['combat']['player']; after=S[bisect.bisect_right(stamps,d['ts'])]['state']['combat']['player']
    return dict(before=before,after=after,result=d['result'],ts=d['ts'])
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
fw=card(29,3,'FOOTWORK'); check('步法3敏捷',fw['after']['powers']['DEXTERITY_POWER']==3)
sh=card(29,3,'SHADOWMELD');check('暗影建立1层',sh['after']['powers']['SHADOWMELD_POWER']==1)
df=[r for r in C if (r['floor'],r['turn'],r['card'])==(29,3,'DEFEND_SILENT')]
check('暗影两防御各16',len(df)==2 and [r['after']['block']-r['before']['block'] for r in df]==[16,16])
vam=card(30,2,'DEFEND_SILENT');check('末战首次防御16',vam['after']['block']-vam['before']['block']==16)
sr=card(29,1,'SURVIVOR');check('臂甲已T1消费',sr['after']['block']-sr['before']['block']==16)
end=[r for r in A['ends'] if r['run']==N and r['floor']==30]
last=end[-1];check('末战4血16挡',last['before']['hp']==4 and last['before']['block']==16)
check('毒结算仍两敌活',sorted(e['hp'] for e in last['after']['enemies'] if e['alive'])==[15,87])
check('末战死亡',last['after']['hp']==0)
attempts=[r for r in A['attempts'] if r['run']==N and r['floor']==30 and r['result']!='reload']
check('四试无赢次',len(attempts)==4 and not any(r['result']=='won' for r in attempts))
fights=[r for r in A['fights'] if r['run']==N]
check('14战斗房一实死',len(fights)==14 and sum(r['death'] for r in fights)==1)
check('赢战净损187',sum(r['loss'] for r in fights if not r['death'])==187)
states=[json.loads(s) for s in (O/N/'states.jsonl').open()]
check('478帧全静默',len(states)==478 and all(s['state']['run']['character_id'].lower()=='silent' for s in states))
decs=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
check('455原决策',len(decs)==455)
brain=[json.loads(s) for s in (O/N/'brain.jsonl').open()]
check('28实际Codex脑请求',len(brain)==28 and all(s['engine']=='codex' for s in brain))
check('DeepSeek窗0',(O/N/'deepseek-reasoning.jsonl').stat().st_size==0)
groups={'步法':['FOOTWORK'],'暗影':['SHADOWMELD'],'爆发':['BURST'],'迷雾':['HAZE']}
history={name:dict(actions=len(rr),runs=len({r['run'] for r in rr}),cases=rr) for name,ids in groups.items() if (rr:=[r for r in A['cards'] if r['card'] in ids])}
(O/'mechanism-actions.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
new=[r for r in A['cards']+A['ends'] if r['run']==N]
(O/'new-checkpoints.json').write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    data=json.load(open(p));other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(data)[:14],metadata={k:data[k] for k in ['_about','generated','generated_at','version'] if k in data}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'verify.json').write_text(json.dumps(dict(checks=checks,history={k:{q:v for q,v in r.items() if q!='cases'} for k,r in history.items()}),ensure_ascii=False,indent=2)+'\n')
print('独立实帧核验',len(checks),'项通过；历史机制动作',[(k,v['runs'],v['actions']) for k,v in history.items()])

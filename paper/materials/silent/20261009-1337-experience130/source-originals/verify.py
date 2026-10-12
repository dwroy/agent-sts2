import hashlib,json,bisect,collections
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');PM=ROOT/'learner/runs/20261009-124302-postmortem';N='RMNXHZKV716Y'
checks=[]
for name,index in [('states','states'),('decisions','decisions'),('run-plans','plans'),('sl-attempts','sl')]:
    clean=[]
    with (ROOT/'logs'/f'{name}.jsonl').open('rb') as f:
        for line in (PM/f'{index}-indexed.txt').open('rb'):
            num,off,content=line.split(b':',2);f.seek(int(off));raw=f.readline()
            assert raw.rstrip(b'\n')==content.rstrip(b'\n'),(name,num)
            clean.append(json.loads(raw));checks.append(dict(file=name,line=int(num),offset=int(off),sha256=hashlib.sha256(raw).hexdigest()))
    assert clean==[json.loads(s) for s in (O/N/f'{name}.jsonl').open()],name
    checks.append(dict(file=name,count=len(clean),identical=True))
S=[json.loads(s) for s in (O/N/'states.jsonl').open()];D=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
assert all(x['state']['run']['character_id'].lower()=='silent' for x in S)
times=[s['ts'] for s in S];byts={s['ts']:s['state'] for s in S}
def powers(p):return {x['power_id']:x['amount'] for x in p.get('powers',[])}
def player(s):return (s.get('combat') or {}).get('player') or {}
def state(line):return S[line-320633]['state']
def hp(s):return s['run']['current_hp']
facts=[]
def check(label,condition,data):
    assert condition,label
    facts.append(dict(topic=label,verified=True,data=data))
a,z=state(321682),state(321683)
check('专长科学力敏',powers(player(a)).get('STRENGTH_POWER',0)==0 and powers(player(z))['STRENGTH_POWER']==2 and powers(player(a))['DEXTERITY_POWER']==1 and powers(player(z))['DEXTERITY_POWER']==3 and player(a)['block']==player(z)['block']==0,dict(before=a['combat']['player'],after=z['combat']['player']))
check('女王末轮血损',hp(state(321691))==0 and hp(state(321690))==1,dict(before=state(321690),after=state(321691)))
check('连续boss交接',hp(state(321563))==hp(state(321564))==hp(state(321565))==13,dict(hp=13,potions=[state(i)['run'].get('potions') for i in [321563,321564,321565]]))
for b,e in [(320915,320916),(321175,321176)]:
    a,z=state(b),state(e);mx=a['run']['max_hp'];check('跨幕'+str(b),hp(z)-hp(a)==(mx-hp(a))*8//10,dict(before=a['run'],after=z['run']))
for line in [321563,321565,321682,321683,321688,321689,321690]:
    facts.append(dict(line=line,frame=state(line)))
sl=[json.loads(s) for s in (O/N/'sl-attempts.jsonl').open()]
comparisons=[]
for floor in [48,49]:
    attempts=[s for s in sl if s['floor']==floor];draws=[(s.get('draws') or {}).get('order',[]) for s in attempts]
    prefix=0
    for items in zip(*draws):
        if all(x==items[0] for x in items):prefix+=1
        else:break
    comparisons.append(dict(floor=floor,attempts=attempts,common_draw_prefix=prefix,decisions=[d for d in D if d['floor']==floor and ('sl_explore' in d or d.get('sl_attempt'))]))
(O/'raw-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
(O/'frame-verification.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
(O/'sl-comparisons.json').write_text(json.dumps(comparisons,ensure_ascii=False,indent=2)+'\n')
print('原字节核验',len(checks),'参数核验',len(facts),'SL',[(r['floor'],len(r['attempts']),r['common_draw_prefix']) for r in comparisons])

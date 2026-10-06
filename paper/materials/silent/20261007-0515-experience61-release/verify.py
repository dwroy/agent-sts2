import bisect, collections, hashlib, json, re, statistics
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp';RUN='8R5CXD5C8PW8'
A=json.load(open(O/'audit.json'));N=json.load(open(EXP/'knowledge/characters/silent/experience.json'));B=json.load(open(O/'experience-before.json'));C=json.load(open(O/'changes.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};E={e['id']:e for e in N['entries']};BE={e['id']:e for e in B['entries']}
S=[json.loads(l) for l in (O/RUN/'states.jsonl').open()];D=[json.loads(l) for l in (O/RUN/'decisions.jsonl').open()];stamps=[s['observed_ts'] for s in S]
assert len(S)==671 and len(D)==653
for d in D:
    s=S[max(0,bisect.bisect_right(stamps,d['observed_ts'])-1)]
    assert s['fingerprint']==d['fingerprint']
assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
assert len(E)==len(N['entries'])
for e in N['entries']:
    assert e['n_support']==len(set(e['evidence']))==len(e['evidence'])
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in R for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    if e['id'] in BE:
        if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==BE[e['id']]
        for sentence in re.split(r'(?<=。)',BE[e['id']]['lesson']):
            if re.search('药水|药瓶|喝药|留药|药栏|用药',sentence):assert sentence in e['lesson'],(e['id'],sentence)
assert sum(len(e['lesson']) for e in N['entries'] if e['status']=='active')==C['chars']<=60000
cards=[x for x in A['cards'] if x['run']==RUN];ends=[x for x in A['ends'] if x['run']==RUN]
def card(f,t,c,att=1):return next(x for x in cards if (x['floor'],x['turn'],x['card'],x['attempt'])==(f,t,c,att))
def end(f,t,att=1):return next(x for x in ends if (x['floor'],x['turn'],x['attempt'])==(f,t,att))
for turn,damage in [(2,15),(3,24)]:
    x=card(35,turn,'APPARITION');assert x['before']['energy']-x['after']['energy']==1
    assert x['after']['powers']['INTANGIBLE_POWER']==1
    assert x['before']['enemies'][0]['intents'][0]['total_damage']==damage
    assert x['after']['enemies'][0]['intents'][0]['total_damage']==1
assert end(35,2)['before']['block']==5 and end(35,2)['after']['hp']==62
assert end(35,3)['before']['block']==0 and end(35,3)['after']['hp']==61
x=card(35,4,'MALAISE');assert x['before']['energy']==3 and x['after']['energy']==0
assert x['before']['enemies'][0]['powers']['STRENGTH_POWER']==18 and x['after']['enemies'][0]['powers']['STRENGTH_POWER']==14
assert x['before']['enemies'][0]['intents'][0]['total_damage']==33 and x['after']['enemies'][0]['intents'][0]['total_damage']==21
assert [end(35,t)['before']['enemies'][0]['powers']['STRENGTH_POWER'] for t in [4,5,6,7]]==[14,23,32,41]
assert not any(x['card'] in ['SERPENT_FORM','FOOTWORK'] and x['floor']==35 for x in cards)
for att in [1,2]:
    x=card(33,2,'FOOTWORK',att);assert x['after']['powers']['DEXTERITY_POWER']==2
    assert x['before']['block']==x['after']['block']==9
x=card(33,3,'DEFEND_SILENT',2);assert x['after']['block']-x['before']['block']==7
x=card(33,6,'GRAND_FINALE',2);assert x['before']['enemies'][0]['hp']==304 and x['after']['enemies'][0]['hp']==229
played=next(d for d in D if (d['floor'],d['turn'],d.get('sl_attempt'),d.get('expect',{}).get('card',{}).get('id'))==(33,6,2,'GRAND_FINALE'))
raw=S[max(0,bisect.bisect_right(stamps,played['observed_ts'])-1)]['state']['combat']
state=S[max(0,bisect.bisect_right(stamps,played['observed_ts'])-1)]['state']
assert not state['agent_view']['combat']['draw']
z=end(35,7);assert (z['before']['hp'],z['before']['block'],z['after']['hp'],z['after']['enemies'][0]['hp'])==(6,13,0,29)
assert z['before']['powers']['FRAIL_POWER']==z['before']['powers']['WEAK_POWER']==1
assert [card(35,7,c)['after']['block']-card(35,7,c)['before']['block'] for c in ['DEFEND_SILENT','DASH','DEFLECT']]==[3,7,3]
assert [end(35,t)['before']['enemies'][0]['hp']-end(35,t)['after']['enemies'][0]['hp']-end(35,t)['before']['enemies'][0]['powers'].get('POISON_POWER',0) for t in range(2,8)]==[3]*6
assert z['before']['enemies'][0]['powers']['POISON_POWER']==12 and 42-13==29 and 6-29==-23
history=[];matrix=[]
for id in C['added']+C['updated']:
    e=E[id]
    if e['scope'] in ['general:route','general:rest']:continue
    counts=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()))
    matrix.append(dict(id=id,scope=e['scope'],support=e['n_support'],contradict=e['n_contradict'],asc=counts,evidence=e['evidence'],contradicting=e.get('contradicting',[]),lesson=e['lesson']))
    if e['scope'].startswith('card:') and e['scope'].split(':')[1] in ['FOOTWORK','MALAISE','APPARITION']:
        observed={x['run'] for x in A['cards'] if x['card']==e['scope'].split(':')[1]}
        assert set(e['evidence'])<=observed
(O/'mechanism-facts.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2)+'\n')
sl=[]
for floor in [17,33]:
    rows=[x for x in A['attempts'] if x['run']==RUN and x['floor']==floor]
    sl.append(dict(floor=floor,attempts=len(rows),wins=sum(x['result']=='won' for x in rows),same_order=rows[0]['draws']['order']==rows[-1]['draws']['order'],same_turns=rows[0]['draws']['turns']==rows[-1]['draws']['turns'],cases=rows))
(O/'sl-comparison.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted((EXP/'knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),meta={k:x[k] for k in ['generated','generated_from','meta','ascensions','note'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
new_facts=dict(cards=[x for x in cards if x['card'] in ['APPARITION','MALAISE','FOOTWORK','GRAND_FINALE','DEFEND_SILENT','DASH','DEFLECT','BACKFLIP']],ends=[x for x in ends if x['floor'] in [17,33,35]],fight_net=[x for x in A['fights'] if x['run']==RUN],rest=[x for x in A['rests'] if x['run']==RUN])
(O/'new-mechanism-facts.json').write_text(json.dumps(new_facts,ensure_ascii=False,indent=2)+'\n')
print('角色、653指纹、671帧、证据/范围/预算/旧药水分句和灵体/仪式/敏捷/75伤/脆弱/反伤/死亡截断逐帧校验通过')
print('SL',[(x['floor'],x['attempts'],x['wins'],x['same_order'],x['same_turns']) for x in sl])

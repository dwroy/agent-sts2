import collections
import json
from pathlib import Path

O=Path(__file__).parent
A=json.load((O/'audit.json').open())
R1,R2='2H311EAD34GD','WZL2AMEY85S7'
checks=[]
expected={R1:{2:(56,53),4:(47,34),5:(34,34),8:(55,4),11:(25,14),13:(35,35),14:(35,31),17:(52,0)},R2:{2:(56,56),3:(56,55),4:(55,55),5:(55,45),6:(45,2),13:(56,33),14:(33,19),17:(40,0)}}
for run,exp in expected.items():
    F={f['floor']:f for f in A['fights'] if f['run']==run}
    assert len(F)==8
    for floor,pair in exp.items():
        f=F[floor];assert (f['hp'],f['last_hp'])==pair
        checks.append(dict(run=run,floor=floor,hp=pair,loss=f['loss']))
    assert sum(f['death'] for f in F.values())==1
    rest=[r for r in A['rests'] if r['run']==run]
    assert len(rest)==4 and all(r['after']-r['before']==21 for r in rest)
    assert 56+84-sum(f['loss'] for f in F.values() if not f['death'])-(6 if run==R1 else 9)==F[17]['hp']
    att=[x for x in A['attempts'] if x['run']==run]
    assert len(att)==6 and [x['result'] for x in att]==['predicted_death']*5+['died']

def cards(run,floor,attempt,turn,ident):
    return [c for c in A['cards'] if (c['run'],c['floor'],c['attempt'],c['turn'],c['card'])==(run,floor,attempt,turn,ident)]
def ending(run,floor,attempt,turn):
    return next(c for c in A['ends'] if (c['run'],c['floor'],c['attempt'],c['turn'])==(run,floor,attempt,turn))
def incoming(c):return sum(i.get('total_damage') or 0 for e in c['before']['enemies'] for i in e['intents'])
foot=cards(R1,17,6,2,'FOOTWORK')[0]
assert foot['before']['powers'].get('DEXTERITY_POWER')==1 and foot['after']['powers']['DEXTERITY_POWER']==3
assert foot['before']['block']==foot['after']['block']
defenses=cards(R1,17,6,12,'DEFEND_SILENT')
assert len(defenses)==2 and [d['after']['block']-d['before']['block'] for d in defenses]==[4,4]
lag=ending(R1,17,6,12)
assert (lag['before']['hp'],lag['before']['block'],incoming(lag),lag['after']['hp'],lag['after']['enemies'][0]['hp'])==(11,8,25,0,79)
assert lag['before']['powers']['STRENGTH_POWER']==-4 and lag['before']['powers']['DEXTERITY_POWER']==-1
checks.append(dict(topic='族母末轮',run=R1,floor=17,turn=12,full_loss=17,minimum_extra_hp=7,remaining_enemy_hp=79))
for run,attempts,want in [(R1,[4,5],[(1,25),(9,31)]),(R2,[1,3],[(13,28),(18,34)])]:
    boards=[]
    for att,exp in zip(attempts,want):
        a=ending(run,17,att,4);z=next(c for c in A['cards'] if (c['run'],c['floor'],c['attempt'],c['turn'])==(run,17,att,5))
        start=next(c for c in A['cards'] if (c['run'],c['floor'],c['attempt'],c['turn'])==(run,17,att,4))
        boards.append(start['before'])
        assert (start['before']['hp']-z['before']['hp'],start['before']['enemies'][0]['hp']-z['before']['enemies'][0]['hp'])==exp
        checks.append(dict(topic='SL同盘T4实结',run=run,attempt=att,loss=exp[0],damage=exp[1]))
    assert boards[0]==boards[1]
    D=[json.loads(l) for l in (O/run/'decisions.jsonl').open()]
    S={s['ts']:s['state'] for s in map(json.loads,(O/run/'states.jsonl').open())}
    hand=[]
    for att in attempts:
        d=next(d for d in D if d['floor']==17 and d['turn']==4 and (d.get('sl_attempt') or 1)==att and d.get('label')=='combat/plan-choice')
        hand.append(S[d['ts']]['combat']['hand'])
    assert hand[0]==hand[1]

beast=ending(R2,17,6,8)
assert (beast['before']['hp'],beast['before']['block'],incoming(beast),beast['after']['hp'])==(8,8,17,0)
assert (beast['before']['enemies'][0]['hp'],beast['after']['enemies'][0]['hp'])==(133,109)
checks.append(dict(topic='昏眩末轮',run=R2,floor=17,turn=8,full_loss=9,minimum_extra_hp=2,poison=21,thorns=3))
pierce=cards(R2,17,6,5,'PIERCING_WAIL')[0]
assert (pierce['before']['enemies'][0]['powers']['STRENGTH_POWER'],pierce['after']['enemies'][0]['powers'].get('STRENGTH_POWER',0))==(6,0)
assert incoming(dict(before=pierce['before']))==26 and incoming(dict(before=pierce['after']))==20
cross=ending(R2,17,6,6)
assert (cross['before']['enemies'][0]['hp'],cross['after']['enemies'][0]['hp'])==(166,155)
assert cross['before']['enemies'][0]['powers']['POISON_POWER']==11
assert cross['before']['enemies'][0]['powers']['PLOW_POWER']==160
assert not cross['after']['enemies'][0]['powers'].get('PLOW_POWER') and not cross['after']['enemies'][0]['powers'].get('STRENGTH_POWER')
assert cross['before']['hp']==cross['after']['hp']==8
poison=[ending(R2,17,6,t)['before']['enemies'][0]['powers']['POISON_POWER'] for t in range(3,9)]
assert poison==[2,5,8,11,16,21] and sum(poison)==63
for t in [2,3,4,5,8]:
    e=ending(R2,17,6,t)
    p=e['before']['enemies'][0]['powers'].get('POISON_POWER',0)
    assert e['before']['enemies'][0]['hp']-e['after']['enemies'][0]['hp']==p+3
assert 262-109==75+63+15
checks.append(dict(topic='毒雾/尖啸/毒阈值/荆棘',run=R2,poison_damage=63,thorns_damage=15,action_damage=75))
heart=[p for p in A['potions'] if (p.get('potion') or {}).get('id')=='HEART_OF_IRON']
for p in heart:
    assert p['after']['powers'].get('PLATING_POWER',0)-p['before']['powers'].get('PLATING_POWER',0)==7
    assert p['before']['block']==p['after']['block']
assert len(heart)==42 and len({p['run'] for p in heart})==21
(O/'heart-history.json').write_text(json.dumps(heart,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('原帧核验通过',len(checks),'项；铁心',len(heart),'饮',len({p['run'] for p in heart}),'局')

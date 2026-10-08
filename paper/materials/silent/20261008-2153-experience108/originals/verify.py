import collections
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load((O / 'audit.json').open())
RUN = 'PF90JTU0UZ5M'
new = {f['floor']: f for f in A['fights'] if f['run'] == RUN}
assert len(new) == 11
expected = {2:(56,54),3:(54,41),4:(41,40),5:(40,32),9:(53,1),13:(22,15),17:(59,46),19:(65,47),20:(47,21),21:(21,3),22:(3,0)}
checks = []
for floor, (start, end) in expected.items():
    assert (new[floor]['hp'],new[floor]['last_hp']) == (start,end)
    checks.append(dict(topic='战内净损',floor=floor,start=start,end=end,loss=start-end))
assert sum(new[f]['loss'] for f in [19,20,21]) == 62
assert sum(f['death'] for f in new.values()) == 1
cards = [c for c in A['cards'] if c['run'] == RUN]
footwork = [c for c in cards if c['card'] == 'FOOTWORK']
for c in footwork:
    assert c['after']['powers'].get('DEXTERITY_POWER',0)-c['before']['powers'].get('DEXTERITY_POWER',0) == 2
    assert c['after']['block'] == c['before']['block']
end = next(c for c in A['ends'] if c['run']==RUN and c['floor']==22 and c['attempt']==4 and c['turn']==3)
assert (end['before']['hp'],end['before']['block'],end['after']['hp']) == (1,27,0)
incoming=sum(i['total_damage'] or 0 for e in end['before']['enemies'] for i in e['intents'])
assert incoming == 19
S = [json.loads(l) for l in (O/RUN/'states.jsonl').open()]
endstate=next(s['state'] for s in S if s['ts']==end['ts'])
toxic=[c for c in endstate['combat']['hand'] if c['card_id']=='TOXIC']
assert len(toxic)==2
assert all('5' in c['resolved_rules_text'] for c in toxic)
assert incoming+10-end['before']['block']==2
assert [e['hp'] for e in end['after']['enemies']] == [58,16]
checks.append(dict(topic='末次持牌伤与攻击',floor=22,attempt=4,turn=3,hp=1,block=27,incoming=incoming,held=10,full_loss=2,actual_hp=0,enemies=[58,16],note='完整需损2，需3血才能留1；毒/敌攻/自伤共帧，内部顺序未知'))
def cards_at(f,a,t,ident):
    return [c for c in cards if (c['floor'],c['attempt'],c['turn'],c['card'])==(f,a,t,ident)]
defense = cards_at(22,4,3,'DEFEND_SILENT')
assert len(defense)==3
assert [c['after']['block']-c['before']['block'] for c in defense]==[9,9,9]
old_defense = cards_at(22,3,3,'DEFEND_SILENT')
assert len(old_defense)==3
assert [c['after']['block']-c['before']['block'] for c in old_defense]==[7,7,7]
assert len(cards_at(17,1,10,'DEFEND_SILENT'))==3
giantend=next(c for c in A['ends'] if c['run']==RUN and c['floor']==17 and c['turn']==10)
assert (giantend['before']['hp'],giantend['before']['block'],giantend['after']['hp'])==(49,27,46)
checks.append(dict(topic='敏捷与自爆',floor=17,turn=10,dex=4,block=27,zero_dex_block=15,extra_block=12,explosion=30,loss=3,note='T9蒸汽41；虚弱下自爆显示30，不把30当无虚弱基础'))
flask=cards_at(17,1,1,'BOUNCING_FLASK')[0]
assert flask['before']['enemies'][0]['hp']==flask['after']['enemies'][0]['hp']==250
assert flask['after']['enemies'][0]['powers']['POISON_POWER']==9
acc=cards_at(17,1,1,'ACCELERANT')[0]
assert acc['after']['powers']['ACCELERANT_POWER']==1
poisonend=next(c for c in A['ends'] if c['run']==RUN and c['floor']==17 and c['turn']==1)
assert poisonend['before']['enemies'][0]['hp']-poisonend['after']['enemies'][0]['hp']==17
assert poisonend['after']['enemies'][0]['powers']['POISON_POWER']==7
checks.append(dict(topic='药瓶与普通触媒',floor=17,turn=1,poison=9,damage=17,after_poison=7,formula='9+8=17；中和3另计'))
fortifiers=[p for p in A['potions'] if (p.get('potion') or {}).get('id')=='FORTIFIER']
fort_checks=[]
for p in fortifiers:
    b,z=p['before']['block'],p['after']['block']
    assert z==3*b,(p['run'],p['floor'],p['turn'],b,z)
    fort_checks.append(dict(run=p['run'],floor=p['floor'],turn=p['turn'],ts=p['ts'],before=b,after=z))
assert len([p for p in fort_checks if p['run']==RUN])==2
assert all((p['before'],p['after'])==(5,15) for p in fort_checks if p['run']==RUN)
poisons=[p for p in A['potions'] if (p.get('potion') or {}).get('id')=='POISON_POTION']
poisonchecks=[]
for p in poisons:
    bi=p['chosen']['target_index']
    b=next(e for e in p['before']['enemies'] if e['index']==bi)
    z=next(e for e in p['after']['enemies'] if e['index']==bi)
    delta=z['powers'].get('POISON_POWER',0)-b['powers'].get('POISON_POWER',0)
    artifact=b['powers'].get('ARTIFACT_POWER',0)-z['powers'].get('ARTIFACT_POWER',0)
    assert b['hp']==z['hp']
    assert delta in [0,6,7],(p['run'],delta)
    poisonchecks.append(dict(run=p['run'],floor=p['floor'],turn=p['turn'],attempt=p['attempt'],delta=delta,artifact_removed=artifact,hp=b['hp']))
assert len([p for p in poisonchecks if p['run']==RUN])==5
assert all(p['delta']==6 for p in poisonchecks if p['run']==RUN)
(O/'fortifier-history.json').write_text(json.dumps(fort_checks,ensure_ascii=False,indent=2)+'\n')
(O/'poison-potion-history.json').write_text(json.dumps(poisonchecks,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('原帧数字核验',len(checks),'项；步法',len(footwork),'次；固化',len(fort_checks),'饮/',len({p['run'] for p in fort_checks if p['before']>0}),'正挡局；毒药',len(poisonchecks),'饮/',len({p['run'] for p in poisonchecks}),'局',dict(collections.Counter(p['delta'] for p in poisonchecks)))

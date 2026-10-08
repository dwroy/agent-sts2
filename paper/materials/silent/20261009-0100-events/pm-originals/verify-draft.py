import json,sys,re
from pathlib import Path
from datetime import datetime
sys.path.insert(0,str(Path(__file__).parent));from analyze import P,D,S,R,SL,hp
byline={s['_line']:s for s in S};ds={d['_line']:d for d in D};draft=(P/'lesson-intro.md').read_text()
assert not any(l.startswith('## LY83ZMTFVKJH') for l in Path('notes/lessons.md').open())
assert len([l for l in draft.splitlines() if l.startswith('- [') and not l.startswith('- [记录]')])==3
v=ds[300426]['thief_card_value'];assert v['hp'] is None and v['status']=='flat'
assert v['measures']['bossLeft']['with']==336.507 and v['measures']['bossLeft']['card']=={'value':21.464,'se':.9731}
assert v['measures']['bossLeft']['perHp']=={'value':-.2843,'se':.0417} and v['samples']==1000
assert v['measures']['bossLeft']['with']+v['measures']['bossLeft']['card']['value']==357.971
for n in [300482,300493]:assert 'dmg 8' in ds[n]['rationale'] if n==300482 else json.loads(ds[n]['questions']['plan']['criteria']['plan3'])['damage_dealt']==20
assert [hp(byline[n]) for n in [307815,307821,307878,307884,307830,307893]]==[50,45,50,45,26,36]
assert [len(byline[n]['state']['combat']['hand']) for n in [307790,307791,307850,307851,307916,307917]]==[2,5,5,8,3,6]
assert len(byline[308053]['state']['run']['deck'])==23
assert [s['state']['run']['max_hp'] for s in [byline[307560],byline[307561]]]==[70,77]
assert [hp(byline[n]) for n in [307560,307561,307683,307684,307740,307741,307933,307934]]==[52,59,30,53,56,77,11,63]
assert all(d['chosen']['action']!='discard_potion' for d in D)
assert len([d for d in D if d['chosen']['action']=='use_potion'])==8
J=[d for d in D if d['decider']=='jev'];plans=[d for d in J if d['label'].startswith('combat/plan-choice')]
assert len(J)==169 and sum(d['confidence']<.35 for d in J)==26
assert len(plans)==147 and sum(d['rollout_best_chosen'] for d in plans)==128
assert sum(d['confidence']<.35 for d in J if d['floor']==17)==21
assert sum(d['confidence']<.35 for d in J if d['floor']==21)==1
assert sum(bool(d.get('focus')) for d in D)==37
assert len([d for d in D if d['decider']=='code' and 'continuing the Jev-chosen plan' in d['rationale']])==127
assert [s['result'] for s in SL]==['predicted_death','predicted_death','won']
assert [s['turns'] for s in SL]==[10,13,14]
assert [s['end_hp'] for s in SL]==[6,11,11]
assert [s.get('reload',{}).get('ms') for s in SL[:2]]==[7297,6885]
assert (datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds()==2104.863
assert 'EOF' not in draft.splitlines()
(P/'draft-verified.json').write_text(json.dumps({'run':'LY83ZMTFVKJH','result':'通过','覆盖':['资格与重复标题','三条经验','终局价值原始浮点数','紧勒20与24','同族两试T5与T7','HP补给与跨幕','药水饮用与手位','Jev/代码计数','SL判死与恢复','时长'],'未定位':['虱虫T6先损7后实际9','虱虫末轮预测23对现场需24']},ensure_ascii=False,indent=2)+'\n')
print('正文核心数字已逐项核验，通过。')

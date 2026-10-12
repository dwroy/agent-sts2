import json,pathlib,collections,hashlib,re,subprocess
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem');R='7X0W3U8TVA2A'
def readrows(name):
 for raw in(P/name).open():
  n,t=raw.split(':',1);d=json.loads(t);d['_line']=int(n);yield d
S={d['_line']:d for d in readrows('states-numbered.jsonl')};D=list(readrows('decisions-numbered.jsonl'))
section=[];capture=False;headings=0
for line in pathlib.Path('/home/dw/Projects/agent-sts2/notes/lessons.md').open():
 if line.startswith('## '):
  capture=line.startswith('## '+R+'（');headings+=int(capture)
 if capture:section.append(line)
text=''.join(section);draft=(P/'lesson-draft.md').read_text()
assert headings==1 and text.strip()==draft.strip()
assert sum(line.startswith('- [')for line in section)==4
first=S[288401]['state'];before=S[288471]['state'];end=S[288472]['state']
assert first['run']['current_hp']==67 and first['run']['max_hp']==70
assert first['run']['potions'][0]['potion_id']=='POISON_POTION'
assert before['run']['current_hp']==1 and before['combat']['player']['block']==14
incoming=sum((i.get('damage')or 0)*(i.get('hits')or 0)for e in before['combat']['enemies']if e['is_alive']for i in e['intents'])
assert incoming==21 and incoming-14==7
assert end['turn']==13 and end['run']['current_hp']==0 and end['game_over']['is_victory']is False
assert [e['current_hp']for e in end['combat']['enemies']]==[4,25,18]
resources=json.loads((P/'resources-verified.json').read_text());assert len(resources['combats'])==11
assert all(w['entry_is_turn_one']and w['exit']for w in resources['combats'])
w=resources['combats'][-1];assert sum(t['observed_hp_added']for t in w['turn_summary'])==175
assert sum(t['visible_hp_loss_lower_bound']for t in w['turn_summary'])==278
assert [t['hp_loss']for t in w['turn_summary']]==[6,0,30,5,0,8,2,1,6,6,2,0,1]
assert [t['net_enemy_decrease']for t in w['turn_summary']]==[37,19,38,21,-36,33,3,-15,10,-4,-18,25,-10]
J=[d for d in D if d['decider']=='jev'];Q=[d for d in J if d['label'].startswith('combat/plan-choice')]
assert len(J)==130 and len(Q)==119
assert sum(isinstance(d.get('confidence'),(int,float))and d['confidence']<.35 for d in J)==15
assert sum(d.get('rollout_best_chosen')is True for d in Q)==111 and sum(d.get('rollout_best_chosen')is False for d in Q)==7
assert not any('guard'in d['rationale'].lower()for d in D)
code_turns={(d['floor'],d['turn'])for d in D if d['decider']=='code'and d['label']in['combat/plan','combat/lethal','combat/least-loss']}
assert len(code_turns)==22
assert sum(d.get('usage',{}).get('input_tokens',0)for d in J)==646488
assert sum(d.get('usage',{}).get('output_tokens',0)for d in J)==7944
sl=list(readrows('sl-numbered.jsonl'));assert len(sl)==1 and sl[0]['_line']==1036 and sl[0]['floor']==17 and sl[0]['result']=='won'
proposal_ids=['silent-proposal-0f0904256806281a','silent-proposal-5c259b0e17f8ff10','silent-proposal-292f6731bdb9b669','silent-proposal-e09a3905a3922b95'];proposals={}
for raw in pathlib.Path('/home/dw/Projects/agent-sts2/paper/materials/learning/code-proposals.jsonl').open():
 row=json.loads(raw)
 if row.get('id')in proposal_ids and row.get('op')=='add':proposals[row['id']]=row
for ident in proposal_ids:
 v=proposals[ident];assert v['proposal_sha256']==hashlib.sha256(pathlib.Path(v['proposal']).read_bytes()).hexdigest()
 assert v['character']=='silent'and v['source_task']=='postmortem'and v['target_task']=='strategy-proposal'and R in v['runs']
result={'复盘标题数':headings,'经验条数':3,'记录条数':1,'资源窗口数':11,'死亡回合':13,'进场HP':67,'末行动HP':1,'末行动格挡':14,'来袭':21,'需损':7,'末敌HP':[4,25,18],'接续新增HP':175,'可见本体扣血':278,'代码独立规划回合':22,'SL读档':0,'提案数':4,'提案路径指纹校验':'通过','关键数字复核':'通过','勘误':'无需，初稿误写已在追加前改正'}
(P/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))

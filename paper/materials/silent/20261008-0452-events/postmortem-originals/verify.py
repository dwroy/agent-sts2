import json,re,collections,datetime
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-041302-postmortem';run='9Z9H2EXKLF3T'
r=json.loads((p/f'{run}-resources.json').read_text())
wanted={z['line'] for b in r['combats'] for z in [b['entry'],b['exit'] or b['last']]}
wanted.update([287619,287620,287621,287048,287153,287181,287267,287353,287357,287514,287575,287716,287779,287840,287841,287923,287924,287990,287991,288000,288001,288002,288004,288007,288008])
frames={};rounds={}
with (root/'logs/states.jsonl').open('rb') as raw:
 for l in (p/'states.jsonl').open():
  x=json.loads(l)
  if x['_line'] not in wanted:continue
  raw.seek(x['_offset']);original=json.loads(raw.readline())
  assert original['state']['run_id']==run
  assert original=={k:v for k,v in x.items() if not k.startswith('_')},x['_line']
  frames[x['_line']]=original
assert len(frames)==len(wanted)
for b in r['combats']:
 for snap in [b['entry'],b['exit'] or b['last']]:
  st=frames[snap['line']]['state'];a=st['run']
  assert (a['current_hp'],a['max_hp'])==(snap['hp'],snap['max_hp'])
  occupied=[[z['index'],z['potion_id']] for z in a.get('potions',[]) if z.get('occupied')]
  assert occupied==snap['potions'],snap['line']
 print('资源复核',b['floor'],b['sequence'],b['entry']['hp'],(b['exit'] or b['last'])['hp'],'max',b['entry']['max_hp'],(b['exit'] or b['last'])['max_hp'])
st=frames[287619]['state'];deck=st['run']['deck'];assert deck[33]['card_id']=='REGRET'
sel=frames[287620]['state']['selection'];cards=sel['cards'];assert len(cards)==25;assert cards[0]['card_id']=='REGRET';assert cards[1]['card_id']=='STRIKE_SILENT'
assert any(x['card_id']=='REGRET' for x in frames[287621]['state']['run']['deck'])
print('新bug原日志复核','REGRET deck[33] selection[0]','STRIKE selection[1]','现场25项')
s=frames[288007]['state'];e=s['combat']['enemies'][0];powers={z['power_id']:z['amount'] for z in e['powers']}
assert s['turn']==11 and s['run']['current_hp']==3 and s['combat']['player']['block']==0
assert (e['current_hp'],e['block'])==(112,33)
assert powers['POISON_POWER']==39 and powers['STRENGTH_POWER']==12
end=frames[288008]['state'];assert end['run']['current_hp']==0 and end['combat']['enemies'][0]['current_hp']==32
print('死亡原日志复核','T11玩家3→0；敌112→32；39+38毒77+3荆棘；意图24×2见状态及SL记录')
records=[json.loads(l) for l in (p/'decisions.jsonl').open()]
assert len(records)==932
jev=[x for x in records if x['decider']=='jev'];assert len(jev)==281
assert sum(x['confidence']<.35 for x in jev)==37
assert sum(x.get('usage',{}).get('input_tokens',0)+x.get('usage',{}).get('output_tokens',0) for x in jev)==1584329
plans=[x for x in jev if x['label'].startswith('combat/plan-choice')];assert len(plans)==219
assert sum('code rank 1' in x['rationale'] for x in plans)==104
assert sum(x.get('rollout_best_chosen') is True for x in plans)==209
assert sum(x.get('rollout_best_chosen') is not None for x in plans)==215
sl=next(x for x in records if x['_line']==281550)
criteria=sl['questions']['plan']['criteria'];a=json.loads(criteria['plan5']);b=json.loads(criteria['plan1'])
assert (a['hp_lost'],b['hp_lost'],a['damage_dealt'],b['damage_dealt'])==(8,15,42,58)
assert sum(x['chosen'].get('action')=='use_potion' for x in records)==22
assert not any(x['chosen'].get('action')=='discard_potion' for x in records)
seconds=(datetime.datetime.fromisoformat(records[-1]['ts'])-datetime.datetime.fromisoformat(records[0]['ts'])).total_seconds();assert seconds==2974.624
print('决策数字复核','932条；Jev281、低信心37、219选线/104rank1、209/215最佳；饮用22、丢弃0；2974.624秒')
section=[];active=False;headers=0
with (root/'notes/lessons.md').open() as f:
 for l in f:
  if l.startswith('## '+run):headers+=1;active=True
  elif active and l.startswith('## '):active=False
  if active:section.append(l)
assert headers==1
actual=''.join(section);draft=(p/'lessons-draft.md').read_text().lstrip('\n')
assert actual==draft
assert len([l for l in section if l.startswith('- [') and not l.startswith('- [记录]')])==3
print('追加复核','唯一标题，3条经验、1段记录，内容与草稿相同；无须勘误')
entries=json.loads((p/'ledger-find-run.json').read_text());ids={x['id'] for x in entries}
receipt=json.loads((p/'ledger-receipt.json').read_text());assert set(receipt['added']+receipt['updated'])<=ids
print('账本复核',len(ids),'项含本局；新增与14项补证均存在')

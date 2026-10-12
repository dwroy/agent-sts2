import collections
import hashlib
import json
from pathlib import Path

O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
metadata={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
mechanisms=[]
for c in C['entries']:
 e=c['after']
 assert e['n_support']==len(set(e['evidence']))
 assert e['n_contradict']==len(set(e.get('contradicting',[])))
 assert all(metadata[n]['character'].lower()=='silent' for n in e['evidence']+e.get('contradicting',[]))
 mechanisms.append(dict(id=e['id'],scope=e['scope'],support=e['n_support'],contradict=e['n_contradict'],
                        evidence=e['evidence'],contradicting=e.get('contradicting',[]),
                        asc=dict(collections.Counter(str(metadata[n]['ascension']) for n in e['evidence']))))
(O/'mechanism-evidence.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
history={}
for card,power in [('FOOTWORK','DEXTERITY_POWER'),('NOXIOUS_FUMES','NOXIOUS_FUMES_POWER'),
                   ('ABRASIVE','THORNS_POWER'),('ANTICIPATE','ANTICIPATE_POWER')]:
 rows=[r for r in A['cards'] if r['card']==card]
 deltas=collections.Counter(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0) for r in rows)
 history[card]=dict(runs=len({r['run'] for r in rows}),casts=len(rows),deltas=dict(deltas),
                    cases=rows)
(O/'historical-power-deltas.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
N='MTQ0EUBJ3R6T'
facts=json.load(open(O/N/'facts.json'))
trials=[]
for attempt in range(1,5):
 rows=[r for r in facts if r['floor']==23 and r['turn']==3 and r['attempt']==attempt]
 start=rows[0]['before'];end=next(r for r in rows if r['action']=='end_turn')
 assert start['hp']==10
 assert [e['hp'] for e in start['enemies']]==[61,41]
 assert end['before']['block']==(29 if attempt<4 else 19)
 assert end['after']['hp']==(10 if attempt<4 else 2)
 net=sum(e['hp'] for e in start['enemies'])-sum(e['hp'] for e in end['after']['enemies'])
 assert net==(13 if attempt<4 else 19)
 trials.append(dict(attempt=attempt,start=start,end=end,net=net))
(O/'sl-t3-comparison.json').write_text(json.dumps(trials,ensure_ascii=False,indent=2)+'\n')
decisions=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
last=decisions[-2]
assert '(-11)' in next(d['rationale'] for d in decisions if d['label']=='combat/least-loss' and d['floor']==23 and d['turn']==5 and d.get('sl_attempt')==4)
final=next(r for r in facts if r['floor']==23 and r['attempt']==4 and r['turn']==5 and r['action']=='end_turn')
assert final['before']['hp']==2 and final['before']['block']==0 and final['after']['hp']==0
damage=sum(i.get('total_damage') or 0 for e in final['before']['enemies'] if e['alive'] for i in e['intents'] if i['intent_type']=='Attack')
assert damage==13
assert 2-damage==-11
N='7X0W3U8TVA2A'
states=[json.loads(s)['state'] for s in (O/N/'states.jsonl').open()]
combat=[s for s in states if s['run']['floor']==31 and s.get('combat')]
restore=[]
for before,after in zip(combat,combat[1:]):
 be={e['index']:e for e in before['combat']['enemies']}
 for e in after['combat']['enemies']:
  old=be[e['index']]
  if old['current_hp']==0 and e['current_hp']>0:
   restore.append(dict(turn=after['turn'],index=e['index'],gain=e['current_hp']))
assert len(restore)==7 and sum(r['gain'] for r in restore)==175
assert sum(e['current_hp'] for e in combat[0]['combat']['enemies'])==150
assert sum(e['current_hp'] for e in combat[-1]['combat']['enemies'])==47
facts7=json.load(open(O/N/'facts.json'))
survivor=next(r for r in facts7 if r['floor']==31 and r['turn']==1 and r['card']=='SURVIVOR')
assert sorted(c['id'] for c in survivor['before']['hand'])==['DEFEND_SILENT','SURVIVOR']
assert survivor['after']['block']==16 and not survivor['after']['hand']
footwork=next(r for r in facts7 if r['floor']==31 and r['card']=='FOOTWORK')
assert footwork['after']['powers']['DEXTERITY_POWER']==3
assert footwork['before']['block']==footwork['after']['block']==7
transitions=[]
for run in next(e for e in mechanisms if e['id']=='silent-act-transition-missing-hp-heal')['evidence']:
 ss=[json.loads(s)['state'] for s in (O/run/'states.jsonl').open()]
 for i,s in enumerate(ss):
  if i==0 or s['run']['floor'] not in [18,34] or ss[i-1]['run']['floor']!=s['run']['floor']-1:continue
  b=ss[i-1]['run'];z=s['run']
  assert b['max_hp']==z['max_hp']
  expected=(b['max_hp']-b['current_hp'])*80//100
  assert z['current_hp']-b['current_hp']==expected
  transitions.append(dict(run=run,floor=z['floor'],before=b['current_hp'],after=z['current_hp'],gain=expected))
(O/'transition-heal-evidence.json').write_text(json.dumps(transitions,ensure_ascii=False,indent=2)+'\n')
other=[]
for path in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
 if path.name=='experience.json':continue
 j=json.load(open(path))
 other.append(dict(file=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                   metadata={k:v for k,v in j.items() if k in ['version','generated','generated_at','_about','_meta','cutoff']},keys=list(j)))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
out=dict(restore=restore,total_damage=150+175-47,transitions=len(transitions),sl_trials=4,
         budget=C['chars_after'],cases='关键原帧、勘误、全史能力窗口及跨幕转换通过')
(O/'verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(out)

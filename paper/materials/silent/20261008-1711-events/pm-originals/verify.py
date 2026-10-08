import json,hashlib,subprocess
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-164302-postmortem'
main=root/'notes/lessons.md';before=json.loads((p/'append-before.json').read_text());draft=(p/'lesson-draft.md').read_bytes();h=hashlib.sha256()
with main.open('rb') as f:
 remaining=before['before_size']
 while remaining:
  b=f.read(min(1048576,remaining));assert b;h.update(b);remaining-=len(b)
 actual=f.read(len(draft))
assert h.hexdigest()==before['before_sha256'],'旧内容前缀改变'
assert actual==draft,'实际追加不等于原稿'
(p/'lesson-written.md').write_bytes(actual)
with main.open() as f:assert sum(l.startswith('## Y5H4CFAQ2WTG') for l in f)==1
s={a['_line']:a for a in map(json.loads,(p/'states.jsonl').open())};d={a['_line']:a for a in map(json.loads,(p/'decisions.jsonl').open())};res=json.loads((p/'Y5H4CFAQ2WTG-resources.json').read_text())
assert len(s)==517 and len(d)==496 and len(res['combats'])==15
assert all(a['entry_is_turn_one'] and a['exit'] is not None for a in res['combats'])
assert sum(a['observed_net_hp_loss'] for a in res['combats'][:-1])==162
assert res['combats'][-1]['entry']['hp']==59 and res['combats'][-1]['observed_net_hp_loss']==59
for n,hp in [(301023,44),(301050,38),(301059,59),(301061,59),(301111,1),(301114,1),(301115,0)]:assert s[n]['state']['run']['current_hp']==hp
st=s[301114]['state'];co=st['combat'];en=co['enemies'][0]
assert co['player']['block']==28 and co['player']['energy']==0 and en['current_hp']==94
assert sum(i.get('total_damage') or 0 for i in en['intents'])==30
assert any(x['card_id']=='CALCULATED_GAMBLE' and x['energy_cost']==0 and x['playable'] for x in co['hand'])
assert dict((x['power_id'],x['amount']) for x in en['powers'])['SANDPIT_POWER']==2
exit=s[301115]['state']['combat']['enemies'][0];assert exit['current_hp']==71
assert dict((x['power_id'],x['amount']) for x in exit['powers'])['SANDPIT_POWER']==1
assert len([a for a in d.values() if a['chosen'].get('action')=='use_potion'])==8
assert len([a for a in d.values() if 'HP guard:' in a['rationale']])==2
assert all(not a.get('sl_reloads') for a in d.values())
brain=[json.loads(l) for l in (p/'brain-Y5H4CFAQ2WTG.jsonl').open()];assert len(brain)==32
assert sum(x['usage']['inputTokens'] for x in brain)==4199518
assert sum(x['usage']['cacheHitTokens'] for x in brain)==2281984
check=subprocess.run(['python3',str(root/'learner/ledger.py'),'check'],capture_output=True,text=True)
(p/'ledger-check.out').write_text(check.stdout);(p/'ledger-check.err').write_text(check.stderr)
assert check.returncode==0,check.stderr
found=subprocess.run(['python3',str(root/'learner/ledger.py'),'find','--run','Y5H4CFAQ2WTG'],capture_output=True,text=True)
(p/'ledger-find.out').write_text(found.stdout);(p/'ledger-find.err').write_text(found.stderr);assert found.returncode==0
result={'prefix_unchanged':True,'exact_append':True,'heading_count':1,'key_numbers_checked':True,'ledger_check':check.returncode,'lesson_sha256':hashlib.sha256(actual).hexdigest(),'code_changed':False}
(p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False));print(check.stdout.strip())

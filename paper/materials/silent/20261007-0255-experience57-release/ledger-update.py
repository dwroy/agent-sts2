import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip();C=json.load(open(O/'changes.json'));E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
links={
'silent-footwork-block':['silent-0005'],
'silent-strength-weak-observation':['silent-0006','silent-0012'],
'silent-frail-card-block':['silent-0013'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
'silent-deck-burst-observation':['silent-0021'],
'silent-accelerant-triggers':['silent-0027'],
'silent-afterimage-per-card-block':['silent-0023'],
'silent-anticipate-temporary-dexterity':['silent-0080'],
'silent-snecko-skull-poison-application':['silent-0087'],
'silent-bubble-bubble-condition':['silent-0010'],
'silent-aeonglass-artifact-growth-sl':['silent-0125'],
'silent-wither-end-turn-loss':['silent-0024'],
'silent-infested-prism-tainted-skill-cost':['silent-0167'],
'silent-rolling-boulder-start-growth':['silent-0093','silent-0094'],
'silent-piercing-wail-temporary-strength':['silent-0046'],
'silent-malaise-x-debuff':['silent-0053'],
'silent-vajra-opening-strength':['silent-0049'],
'silent-queen-poison-main-target':['silent-0068'],
'silent-replay-effect-counter-observation':['silent-0200']}
assert set(links)==set(C['added']+C['updated'])
current=json.loads(subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True));L={x['id']:x for x in current};updates=[]
for experience,ids in links.items():
 for id in ids:
  ledger=L[id];seen={x['run'] for x in ledger['evidence'] if x.get('role','support')=='support'}
  runs=C['changes'].get(experience,{}).get('added_evidence',[])
  if experience in C['added']:runs=E[experience]['evidence']
  more=[dict(run=r,role='support',note='本批只用静默复盘与日志复核；公式、进阶、典型案例和观察限制见第57节对应经验。') for r in runs if r not in seen]
  row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[experience],commits=[commit],changelog=[title]),note='静默经验2026-10-07.3：仅proposed；首证、先验、旧claim/版本/repeat保持，实际合入后由运维登记shipped。'+(('只同步旧句内n，不新增证据。' if experience=='silent-footwork-block' else '本次仅压缩旧文字，不新增证据。') if not runs else '新证据仅非药水部分，无用药规则/替代整战因果。'))
  if more:row['evidence']=more
  updates.append(row)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates));proposed=[]
for row in updates:
 p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(row,ensure_ascii=False),capture_output=True,text=True)
 with (O/'ledger-update.log').open('a') as h:h.write(p.stdout+p.stderr)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 proposed.append(row['id'])
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True);(O/'ledger-check.log').write_text(p.stdout+p.stderr);assert p.returncode==0
result=dict(added=[],proposed=proposed,retired=[],check=p.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)

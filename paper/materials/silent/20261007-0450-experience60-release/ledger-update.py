import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第六十次增量：2 局 A10（version 2026-10-07.6，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
C=json.load(open(O/'changes.json'))
E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
fold=subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True)
(O/'ledger-fold-before.json').write_text(fold)
L={r['id']:r for r in json.loads(fold)}
links={
 'silent-survivor-neutralize-discard':['silent-0205'],
 'silent-footwork-block':['silent-0005'],
 'silent-strength-weak-observation':['silent-0006'],
 'silent-route-hp-observation':['silent-0019'],
 'silent-rest-buffer-observation':['silent-0020'],
 'silent-deck-burst-observation':['silent-0021','silent-0057'],
 'silent-noxious-fumes-growth':['silent-0011'],
 'silent-accelerant-triggers':['silent-0027'],
 'silent-piercing-wail-temporary-strength':['silent-0046'],
 'silent-lagavulin-siphon-poison-sl':['silent-0030'],
 'silent-devoted-sculptor-ritual-growth':['silent-0083'],
 'silent-serpent-form-per-card-damage':['silent-0132'],
}
assert set(links)==set(C['added']+C['updated'])
updates=[]
for entry, ids in links.items():
    for id in ids:
        seen={r['run'] for r in L[id]['evidence'] if r.get('role','support')=='support'}
        if entry==C['added'][0]:runs=['53FLQ68CETW0','V0383V5S9BCQ']
        else:runs=[r for r in E[entry]['evidence'] if r in ['TU3XB4CAEDAW','V0383V5S9BCQ']]
        if id=='silent-0057':runs=['TU3XB4CAEDAW']
        row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[entry],commits=[commit],changelog=[title]),note='静默经验2026-10-07.6：第60节原始日志及复盘勘误验证；仅非药水支持，保留首证/先验/原claim/旧version/repeat，待运维确认实际合入后登记shipped，不添未确认策略老错repeat。')
        more=[dict(run=r,role='support',note='第60节非药水证据；机制数值与SL同抽/行动混杂及替线未实打限制见经验和本节。') for r in runs if r not in seen]
        if more:row['evidence']=more
        updates.append(row)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in updates))
for row in updates:
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(row,ensure_ascii=False),capture_output=True,text=True)
    with (O/'ledger-update.log').open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check.log').write_text(p.stdout+p.stderr)
assert p.returncode==0
result=dict(added=[],proposed=[r['id'] for r in updates],retired=[],check=0)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))

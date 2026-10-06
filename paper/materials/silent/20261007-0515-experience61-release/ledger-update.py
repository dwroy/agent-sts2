import json, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第六十一次增量：1 局 A10（version 2026-10-07.7，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
C=json.load(open(O/'changes.json'));E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
fold=subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True)
L={r['id']:r for r in json.loads(fold)}
links={
'silent-apparition-player-intangible':['silent-0206'],
'silent-footwork-block':['silent-0005'],
'silent-strength-weak-observation':['silent-0006'],
'silent-frail-card-block':['silent-0013'],
'silent-doubt-end-turn-weak':['silent-0097'],
'silent-malaise-x-debuff':['silent-0053'],
'silent-devoted-sculptor-ritual-growth':['silent-0083'],
'silent-grand-finale-empty-draw':['silent-0110','silent-0111'],
'silent-bronze-scales-per-hit-thorns':['silent-0129'],
'silent-pumpkin-candle-charge-energy':['silent-0185'],
'silent-giant-explosion-window':['silent-0017'],
'silent-knowledge-demon-healing-sl-observation':['silent-0102'],
'silent-deck-burst-observation':['silent-0021','silent-0057','silent-0125'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
}
assert set(links)==set(C['added']+C['updated'])
updates=[]
for entry,ids in links.items():
    for id in ids:
        seen={r['run'] for r in L[id]['evidence'] if r.get('role','support')=='support'}
        row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[entry],commits=[commit],changelog=[title]),note='静默第61节经验2026-10-07.7：8R5CXD5C8PW8 A10及本角色历史，灵体保护/仪式增长/能力实际支付、空堆75伤与SL多动作、脆弱/虚弱及反伤分别核；仅非药水支持。保留首证/先验/claim/旧version/repeat，待运维核实际合入后登记shipped，无确认老错repeat。')
        if '8R5CXD5C8PW8' not in seen:row['evidence']=[dict(run='8R5CXD5C8PW8',role='support',note='第61节原始静默日志及复盘勘误验证，具体公式/数字及未受控范围见本条经验和变更记录。')]
        updates.append(row)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
for row in updates:
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(row,ensure_ascii=False),capture_output=True,text=True)
    with (O/'ledger-update.log').open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check.log').write_text(p.stdout+p.stderr);assert p.returncode==0
result=dict(added=[],proposed=[r['id'] for r in updates],retired=[],check=0)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))

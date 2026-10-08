import collections
import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
commit, title = sys.argv[1:3]
M = json.load(open(O/'ledger-map.json'))
C = json.load(open(O/'changes.json'))
F = json.load(open(O/'historical-facts.json'))
q = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True)
current = {r['id']:r for r in json.loads(q.stdout)}
eids = collections.defaultdict(list)
for eid,ids in M.items():
    for lid in ids:
        eids[lid].append(eid)
rows = []
for lid,ids in eids.items():
    row = dict(id=lid,by='learner:experience-update',status='proposed',
        where=dict(experience=ids,commits=[commit],changelog=[title]),
        note='第80次静默经验增量；只关联本角色已核实证据及源提交，保留首证/先验/claim/旧support与repeat/历史版本。不同子公式分母分开，不将整战失败当机制反例；未登记implemented或shipped。')
    existing = {e['run'] for e in current[lid]['evidence']}
    ev = []
    for eid in ids:
        e = next(x['after'] for x in C['entries'] if x['id']==eid)
        fresh = e['evidence'] if eid in C['added'] else ['YQL8RZ8BWN1E']
        for run in fresh:
            if run in existing:
                continue
            evidence = dict(run=run,role='support',note='日志逐帧及同角色复盘支持 '+eid+'；公式/观察与整战胜因分账，来源第80次增量。')
            case = next((x for x in F[eid].get('actions',[]) if x['run']==run),None)
            if case:
                evidence.update(floor=case['floor'],turn=case['turn'])
            elif lid=='silent-0006':
                evidence.update(floor=17,turn=6,note='巨兽T6尖啸敌力0→−6、14→8；末试6挡损2、次轮负力消失。玩家未建力/敏。')
            elif lid=='silent-0020':
                evidence.update(floor=16,note='三火两回血各25共50；牡蛎11/果汁5/SL恢复239另计；F16休32→57，巨兽六败。')
            ev.append(evidence)
            existing.add(run)
    if ev:
        row['evidence']=ev
    rows.append(row)
(O/'ledger-final-input.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
q = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input='\n'.join(json.dumps(r,ensure_ascii=False) for r in rows),capture_output=True,text=True)
(O/'ledger-final-cli.log').write_text(q.stdout+q.stderr)
assert q.returncode==0,q.stderr
q = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check.log').write_text(q.stdout+q.stderr)
assert q.returncode==0,q.stderr
result = dict(added=[],proposed=list(eids),retired=[],check=q.returncode)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))

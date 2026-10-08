import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');CLI=ROOT/'learner/ledger.py';C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip();title=f'2026-10-07 静默猎手 第六十九次增量：1 局 A10（version {C["version"]}，分支 exp-silent，{commit[:8]}）'
# Fold the ledger through its CLI immediately before preparing append-only updates.
p=subprocess.run(['python3',str(CLI),'fold'],text=True,capture_output=True,check=True);items={x['id']:x for x in json.loads(p.stdout)}
map_={
'silent-0006':['silent-strength-weak-observation'],
'silent-0007':['silent-poisoned-stab-components'],
'silent-0019':['silent-route-hp-observation'],
'silent-0020':['silent-rest-buffer-observation'],
'silent-0021':['silent-deck-burst-observation'],
'silent-0030':['silent-poisoned-stab-components'],
'silent-0079':['silent-ceremonial-beast-threshold-growth-sl'],
'silent-0133':['silent-ceremonial-beast-threshold-growth-sl'],
'silent-0222':['silent-ceremonial-beast-ringing-one-card']}
updates=[]
for id,where in map_.items():
 item=items[id];assert item['character']=='silent'
 payload=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=where,commits=[commit],changelog=[title]))
 if id=='silent-0030' and not any(e['run']=='7ZUC4VPMDS41' for e in item['evidence']):payload['evidence']=[dict(run='7ZUC4VPMDS41',floor=17,turn=9,role='support',note='A10末试带毒刺击直6、施3，T9—11实结算3+2+1；T13再施3，死亡余毒不预支。无单卡整战因果，未新增用药规则。')]
 payload['note']='本批仅关联已核实经验/提交/第69节；保留原claim、first_run、asc、prior、既有support/repeat和版本历史；实际合入由运维核实后登记shipped。'
 updates.append(payload)
assert set(C['added']+C['updated'])=={e for v in map_.values() for e in v}
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
result=subprocess.run(['python3',str(CLI),'update'],input=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates),text=True,capture_output=True)
(O/'ledger-update.log').write_text(result.stdout+result.stderr);assert result.returncode==0,result.stderr
check=subprocess.run(['python3',str(CLI),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(check.stdout+check.stderr);assert check.returncode==0,check.stderr
L=dict(added=[],proposed=list(map_),retired=[],check=check.returncode);(O/'ledger-result.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n');(O/'changelog-title.txt').write_text(title+'\n');print(json.dumps(L,ensure_ascii=False))

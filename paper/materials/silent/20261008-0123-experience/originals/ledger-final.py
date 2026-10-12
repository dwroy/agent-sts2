import collections,json,subprocess,sys
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
commit,title=sys.argv[1:3];mapping=json.load(open(O/'ledger-map.json'));groups=collections.defaultdict(list)
for eid,lids in mapping.items():
 for lid in lids:groups[lid].append(eid)
rows=[dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第84次静默经验；本批新增/更新数据已提交，来源局NHA2KW0RB7VP及核实油灯历史三局。首证、先验、claim、旧support/repeat与上线历史保持；独立strategy-proposal实现任务已关联，学习者不标accepted/shipped。') for lid,eids in sorted(groups.items())]
(O/'ledger-final-input.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=(O/'ledger-final-input.jsonl').read_text(),text=True,capture_output=True)
(O/'ledger-final-cli.log').write_text(q.stdout+q.stderr);q.check_returncode()
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check.log').write_text(q.stdout+q.stderr);q.check_returncode()
r=dict(added=[],proposed=sorted(groups),retired=[],check=q.returncode)
(O/'ledger-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(r)

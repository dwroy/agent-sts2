import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');commit=sys.argv[1];title=(O/'changelog-title.txt').read_text().strip();mapping=json.load(open(O/'ledger-map.json'));rows=[]
for lid in json.load(open(O/'ledger-ids.json')):
 rows.append(dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e,ls in mapping.items() if lid in ls],commits=[commit],changelog=[title]),note='第93批静默经验源提交已完成；保留原首证/prior/claim/support/repeat及旧上线历史，不标accepted/shipped；两份代码提案交独立strategy-proposal，不冒认implemented。'))
data=json.dumps(rows,ensure_ascii=False);(O/'ledger-final-input.json').write_text(data+'\n');p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=data,text=True,capture_output=True);(O/'ledger-final.log').write_text(p.stdout+p.stderr);p.check_returncode()
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check-final.log').write_text(p.stdout+p.stderr);(O/'ledger-check-final.rc').write_text(str(p.returncode)+'\n');p.check_returncode();print(p.stdout.strip())

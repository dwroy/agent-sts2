import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
mapping = json.load(open(O/'ledger-map.json'))
source = (O/'source-commit.txt').read_text().strip()
title = (O/'changelog-title.txt').read_text().strip()
records = []
for ident in dict.fromkeys(i for ids in mapping.values() for i in ids):
    ids = [experience for experience, ledger in mapping.items() if ident in ledger]
    data = {'id':ident,'by':'learner:experience-update','status':'proposed','where':{'experience':ids,'commits':[source],'changelog':[title]},'note':'第126次经验已完成源提交，登记本批经验proposed；保留首证/prior/claim/历史证据与旧版本。实际live数据shipped由运维据完成事件登记，两份源码提案仍pending。'}
    p = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    records.append({'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode})
    (O/'ledger-final-cli.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
p = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check.log').write_text(p.stdout+p.stderr)
assert p.returncode==0,p.stderr
result={'added':[],'proposed':[r['数据']['id'] for r in records],'retired':[],'check':p.returncode}
(O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(result)

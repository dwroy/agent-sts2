import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');M=json.load(open(O/'ledger-map.json'));source=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip();records=[]
for ident in dict.fromkeys(i for ids in M.values() for i in ids):
 data={'id':ident,'by':'learner:experience-update','status':'proposed','where':{'experience':[e for e,ls in M.items() if ident in ls],'commits':[source],'changelog':[title]},'note':'第130次经验源提交完成，登记proposed；保持旧claim/prior/首证/全部证据/旧版本历史。源码提案独立strategy-proposal pending，实际live数据shipped由运维据完成事件登记。'}
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),capture_output=True,text=True);records.append({'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode});(O/'ledger-final-cli.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0,p.stderr
p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True);(O/'ledger-check.log').write_text(p.stdout+p.stderr);assert p.returncode==0,p.stderr
result={'added':[],'proposed':[x['数据']['id'] for x in records],'retired':[],'check':p.returncode};(O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)

import json,subprocess
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-001302-postmortem')
ROOT=Path('/home/dw/Projects/agent-sts2')
stamp=subprocess.run(['date','--iso-8601=seconds'],text=True,capture_output=True,check=True).stdout
(P/'ledger-reference-correction-date.txt').write_text(stamp)
correction={'id':'silent-0260','by':'learner:postmortem','note':'本任务刚追加T7证据中的连续三帧引用范围更正为states:308030—308032（77→69→67）；308031—308032只覆盖69→67。数值、repeat角色、旧claim/首证/prior/status及版本均不变；lessons正文没有该错误范围，不需正文勘误。'}
payload=json.dumps(correction,ensure_ascii=False,indent=2)+'\n'
(P/'ledger-reference-correction.json').write_text(payload)
r=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(P/'ledger-reference-correction.stdout').write_text(r.stdout)
(P/'ledger-reference-correction.stderr').write_text(r.stderr)
if r.returncode:print(r.stderr);raise SystemExit(r.returncode)
result=[]
for name in ['proposal-strangle','proposal-unknown-card-value','proposal-retirement-resources']:
 stamp=subprocess.run(['date','--iso-8601=seconds'],text=True,capture_output=True,check=True).stdout
 (P/(name+'-date.txt')).write_text(stamp)
 r=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=(P/(name+'.json')).read_text(),text=True,capture_output=True)
 (P/(name+'.stdout')).write_text(r.stdout)
 (P/(name+'.stderr')).write_text(r.stderr)
 if r.returncode:print(name,r.returncode,r.stderr);raise SystemExit(r.returncode)
 ident=r.stdout.strip();result.append({'file':name,'id':ident,'domains':json.loads((P/(name+'.json')).read_text())['domains']})
 (P/'proposal-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(name,ident)

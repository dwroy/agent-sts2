import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
state=json.load((O/'live-merge.json').open())
assert state['merged'] and (state.get('tests')==0 or state.get('tests_retry')==0)
source=(O/'source-commit.txt').read_text().strip()
def run(args):
    p=subprocess.run(args,cwd=LIVE,text=True,capture_output=True)
    with (O/'publication.log').open('a') as f:f.write(' '.join(args)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
assert not run(['git','diff','--cached','--name-only']),'live已有他人暂存，停止'
run(['git','merge-base','--is-ancestor',source,'HEAD'])
assert run(['git','rev-parse','HEAD:knowledge/characters/silent/experience.json'])==run(['git','rev-parse',source+':knowledge/characters/silent/experience.json'])
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
log=(O/('test-live-retry.log' if state.get('tests_retry')==0 else 'test-live.log')).read_text()
import re
tests=dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))),rerun=state.get('tests_retry') is not None)
assert tests['files'] and tests['cases']
(O/'test-live-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
C=json.load((O/'changes.json').open())['entries'];U=json.load((O/'update-summary.json').open());M=json.load((O/'ledger-map.json').open())
ledger=list(dict.fromkeys(l for v in M.values() for l in v));proposals=json.load((O/'proposal-ids.json').open())
name='S1.exp109'
line='- '+stamp+' 学习者codex静默经验第109次上线：knowledge/characters/silent/experience.json 2026-10-08.25→2026-10-08.26，来源2H311EAD34GD/WZL2AMEY85S7 A10及本角色历史144局；增0改15退0/185 active/'+str(U['chars'])+'正文字符。来源条目'+','.join(c['id'] for c in C)+'；账本'+','.join(ledger)+'；源'+source+'→实际live '+state['merged']+'。源沙箱tsc/vitest0、251文件2627例，合后tsc/vitest0、'+str(tests['files'])+'文件'+str(tests['cases'])+'例；gitleaks0。旧142局统计基线和原帧数字通过；铁心补SY0WMJNNVRLM漏计1饮，共21局42饮，SL两场各六败/局部血价与整场因果分开。唯一'+name+'；三提案'+','.join(proposals)+'另交strategy-proposal，未改打法源码、不登记代码implemented或数据shipped，实际数据shipped由运维核完成事件。回退恢复父版.25经验blob并单独记录版本，保留刷新/并行记录；报告'+str(O/'report.md')+'。\n'
row=dict(name=name,family='Silent',commit=state['merged'],source='decision-log '+stamp+': 静默第109次经验.25→.26，增0改15退0/185 active，证据2H311EAD34GD/WZL2AMEY85S7及本角色历史，源'+source+'；源251文件2627例、合后'+str(tests['files'])+'文件'+str(tests['cases'])+'例，tsc/vitest0。只改知识前缀，三策略提案独立实现，不冒标代码implemented/shipped。')
prepared=[]
for tree,label in [(LIVE,'live'),(ROOT,'root')]:
    path=tree/'eval/versions.json';before=path.read_bytes();data=json.loads(before)
    existing=[r for r in data['versions'] if r['name']==name]
    assert not existing,'版本名已存在，停止避免重复发布'
    data['versions'].append(row);after=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
    (O/('publication-before-'+label+'-versions.json')).write_bytes(before)
    (O/('publication-new-'+label+'-versions.json')).write_bytes(after)
    prepared.append((path,before,after))
for path,before,after in prepared:
    assert path.read_bytes()==before,'并行版本变动，停止避免覆盖'
    path.write_bytes(after)
for tree in [LIVE,ROOT]:
    with (tree/'paper/materials/decision-log.md').open('a') as f:f.write(line)
notification=['\n## '+now+' 静默经验第109次上线通知 Roy（'+name+'）','',
'实际live '+state['merged']+'，经验源'+source+'，.25→.26，源/合后沙箱通过。变更只在静默经验知识前缀；独立strategy-proposal另实现，不登记代码已实现或账本shipped。','',
'| 条目 | 旧规则/观察 | 新规则/观察 | 证据/账本 |','| --- | --- | --- | --- |']
for c in C:
    notification.append('| '+c['id']+' | '+c['before']['lesson'].replace('|','/')+' | '+c['after']['lesson'].replace('|','/')+' | '+','.join(c['new_runs'])+'及条目本角色历史；'+','.join(M[c['id']])+' |')
notification+=['','预期影响：让实际力敏/剩覆甲/毒与荆棘/单牌上限、路线血药链和随机升级事实进入构筑/路线/休息决策；SL同盘付血差额只是观察，不拟强喝/必死/探索阈值，不声称胜率提升。提案'+','.join(proposals)+'，来源experience-update→实现strategy-proposal；账本、证据限制和原始数见'+str(O/'report.md')+'。',
'回退：持live-merge锁仅恢复knowledge/characters/silent/experience.json为源提交父版2026-10-08.25的blob，单独提交/记录新版本，保留所有刷新知识、并行代码、提案及账本历史；独立源码实现分别回退。','']
notification='\n'.join(notification)
for relative in ['notes/for-roy.md','ops/inbox-dev.md']:
    with (ROOT/relative).open('a') as f:f.write(notification)
run(['git','add','eval/versions.json','paper/materials/decision-log.md'])
patch=run(['git','diff','--cached'])
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,text=True,capture_output=True,cwd=LIVE)
(O/'gitleaks-publication.log').write_text(scan.stdout+scan.stderr)
assert scan.returncode==0,'上线记录gitleaks失败'
run(['git','diff','--cached','--check'])
run(['git','commit','-m','Record Silent experience 2026-10-08.26 release','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'])
publication=run(['git','rev-parse','HEAD'])
state.update(publication=publication,eval_version=name,notifications=['notes/for-roy.md','ops/inbox-dev.md'],result='实际合入、合后沙箱通过、上线登记及Roy双通知完成；数据shipped交运维核实')
(O/'live-merge.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
(O/'publication.json').write_text(json.dumps(dict(version=name,source=source,merged=state['merged'],publication=publication,time=now,tests=tests,ledger=ledger,code_proposals=proposals,decision_sha256=hashlib.sha256(line.encode()).hexdigest(),notification_sha256=hashlib.sha256(notification.encode()).hexdigest()),ensure_ascii=False,indent=2)+'\n')
print('实际发布',publication,name)

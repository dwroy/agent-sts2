import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
state=json.load((O/'live-merge.json').open())
assert state['merged'] and (state['tests']==0 or state.get('tests_retry')==0),'合后测试尚未通过'
source=(O/'source-commit.txt').read_text().strip()
def run(args):
    p=subprocess.run(args,cwd=LIVE,text=True,capture_output=True)
    with (O/'publication.log').open('a') as h:h.write(' '.join(args)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
assert not run(['git','diff','--cached','--name-only']),'live已有他人暂存，停止'
run(['git','merge-base','--is-ancestor',state['merged'],'HEAD'])
assert run(['git','rev-parse','HEAD:knowledge/characters/silent/experience.json'])==run(['git','rev-parse',source+':knowledge/characters/silent/experience.json'])
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
testname='test-live-retry.log' if state.get('tests_retry')==0 else 'test-live.log'
log=(O/testname).read_text()
live_tests=dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))),rerun=state.get('tests_retry') is not None)
assert live_tests['files'] and live_tests['cases']
(O/'test-live-results.json').write_text(json.dumps(live_tests,ensure_ascii=False,indent=2)+'\n')
C=json.load((O/'changes.json').open())['entries']
M=json.load((O/'ledger-map.json').open())
ledger=list(dict.fromkeys(l for v in M.values() for l in v))
props=json.load((O/'proposal-ids.json').open())
name='S1.exp108'
line='- '+stamp+' 学习者codex静默经验第108次上线：knowledge/characters/silent/experience.json 2026-10-08.24→2026-10-08.25，来源PF90JTU0UZ5M A10及本角色历史142局；增1改15退0/185 active/50213正文字符。来源条目'+','.join(c['id'] for c in C)+'；账本'+','.join(ledger)+'；源'+source+'→实际live '+state['merged']+'。源沙箱tsc/vitest0、251文件2627例；合后沙箱tsc/vitest0、'+str(live_tests['files'])+'文件'+str(live_tests['cases'])+'例'+('（重跑一次）' if live_tests['rerun'] else '（未重跑）')+'；gitleaks0。旧141局基线与关键实帧核验通过，唯一'+name+'；三代码提案'+','.join(props)+'另交strategy-proposal，本任务未改打法源码或标代码implemented/shipped，实际数据shipped由运维据完成事件登记。回退恢复父版.24经验blob，保留刷新/并行记录；完整报告'+str(O/'report.md')+'。\n'
row=dict(name=name,family='Silent',commit=state['merged'],source='decision-log '+stamp+': 静默第108次经验.24→.25，增1改15退0/185 active，证据PF90JTU0UZ5M及本角色历史；源'+source+'。源251文件2627例、合后'+str(live_tests['files'])+'文件'+str(live_tests['cases'])+'例，tsc/vitest0；只更新经验前缀，三代码提案独立实现，不标implemented/shipped。')
for tree,label in [(LIVE,'live'),(ROOT,'root')]:
    path=tree/'eval/versions.json'
    before=path.read_bytes();data=json.loads(before)
    existing=[r for r in data['versions'] if r['name']==name]
    if existing:
        assert len(existing)==1 and existing[0]['commit']==state['merged'],'版本名冲突，停止'
    else:
        data['versions'].append(row)
        (O/('publication-before-'+label+'-versions.json')).write_bytes(before)
        temp=O/('publication-new-'+label+'-versions.json')
        temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
        assert path.read_bytes()==before,'并行版本更新，停止避免覆盖'
        path.write_bytes(temp.read_bytes())
    path=tree/'paper/materials/decision-log.md'
    with path.open('a') as f:f.write(line)
notification=['\n## '+now+' 静默经验第108次上线通知 Roy（'+name+'）','',
'已实际合入live '+state['merged']+'，经验源'+source+'，.24→.25，源/合后沙箱通过。变更只在静默经验知识前缀；独立打法源码提案另经strategy-proposal实现，本任务不登记代码已实现或账本shipped。','',
'| 条目 | 旧规则/观察 | 新规则/观察 | 证据/账本 |','| --- | --- | --- | --- |']
for c in C:
    notification.append('| '+c['id']+' | '+(c['before']['lesson'] if c['before'] else '无固化专条；原复盘0225已记录11→33。')+' | '+c['after']['lesson']+' | PF90JTU0UZ5M及条目本角色历史；'+','.join(M[c['id']])+' |')
notification+=['','预期影响：提供真实血药链、已建敏捷/已结毒和完整持牌伤事实，支持构筑/路线/休息决策；观察不声称因果或胜率提升，不拟强喝/强制SL门槛。证据细节、限制、提案任务及账本见'+str(O/'report.md')+'；提案'+','.join(props)+'。','回退：在live-merge锁内把knowledge/characters/silent/experience.json恢复为源提交父版2026-10-08.24的blob并单独提交/登记新版本，保留所有刷新数据、账本与提案历史；源码独立实现各自回退。','']
notification='\n'.join(notification)
for relative in ['notes/for-dai.md','ops/inbox-dev.md']:
    with (ROOT/relative).open('a') as f:f.write(notification)
paths=['eval/versions.json','paper/materials/decision-log.md']
run(['git','add',*paths])
patch=run(['git','diff','--cached'])
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,text=True,capture_output=True,cwd=LIVE)
(O/'gitleaks-publication.log').write_text(scan.stdout+scan.stderr)
assert scan.returncode==0,'发布记录gitleaks未通过'
run(['git','diff','--cached','--check'])
run(['git','commit','-m','Record Silent experience 2026-10-08.25 release','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'])
publication=run(['git','rev-parse','HEAD'])
state.update(publication=publication,eval_version=name,notifications=['notes/for-dai.md','ops/inbox-dev.md'],result='实际合入、合后沙箱通过、上线登记及Roy双通知完成；数据shipped交运维核实完成事件')
(O/'live-merge.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
(O/'publication.json').write_text(json.dumps(dict(version=name,source=source,merged=state['merged'],publication=publication,time=now,ledger=ledger,code_proposals=props,tests=live_tests,decision_sha256=hashlib.sha256(line.encode()).hexdigest(),notification_sha256=hashlib.sha256(notification.encode()).hexdigest()),ensure_ascii=False,indent=2)+'\n')
print('实际发布',publication,name)

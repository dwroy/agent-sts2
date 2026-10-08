import fcntl,json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';source,merged=sys.argv[1:];name='S1.exp93'
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
path=LIVE/'eval/versions.json';v=json.load(open(path));assert not any(r['name']==name for r in v['versions'])
v['versions'].append(dict(name=name,family='S1',commit=merged,source='decision-log '+stamp+' 静默经验第93次，2026-10-08.9→.10；ZTRGYYMLR8SC，新增1/更新9/退役0，169 active；打法源码提案独立实现'))
path.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');git('add','--','eval/versions.json')
scan=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=git('diff','--cached','--binary'),text=True,capture_output=True);(O/'gitleaks-publication.log').write_text(scan.stdout+scan.stderr);scan.check_returncode()
git('commit','-m','Publish silent experience 2026-10-08.10','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>');publication=git('rev-parse','HEAD')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
def append(path,text):
 with path.open('a') as f:fcntl.flock(f,fcntl.LOCK_EX);f.write(text);f.flush()
lids=json.load(open(O/'ledger-ids.json'));pids=json.load(open(O/'proposal-ids.json'))
append(ROOT/'paper/materials/decision-log.md',f'- {stamp} Codex静默学习者第93次经验实际上线：源{source}→合入{merged}→发布{publication}，唯一{name}；2026-10-08.9→.10/增1改9退0/169 active、51016正文字符；来源ZTRGYYMLR8SC A10/F17及铜钹7局原帧，账本{",".join(lids)}。源/实际合后原沙箱tsc+vitest0、gitleaks0；知识刷新/并行记录保留。机制/药水/护栏/SL提案{",".join(pids)}由独立strategy-proposal实现，数据上线不称源码implemented或台账shipped，后者交运维核实。证据/回退见{O}/report.md。\n')
notice=f'\n### {stamp} Roy：静默猎手第93次经验上线（{name}）\n\n源{source}，实际合入{merged}，发布{publication}；证据ZTRGYYMLR8SC A10/F17及铜钹7局，账本{",".join(lids)}，任务experience-update/20261008-085641-experience-update；提案{",".join(pids)}关联独立strategy-proposal。源/合后沙箱均通过。\n\n'
for c in json.load(open(O/'changes.json'))['entries']:
 b,e=c['before'],c['after'];notice+='- '+c['id']+'：旧规则='+('无独立条目' if b is None else b['lesson'])+'；新规则='+e['lesson']+'\n'
notice+='\n预期影响：知识前缀按已完成能力/药水层数、弃牌附伤及真实资源核算，不保证单项改变能使整战取胜。出牌、药水、SL、终局源码保持当前版本，拟议覆盖/追踪由独立策略任务按本角色原帧核实；数据发布不等提案实现。回退：逆向撤经验源提交'+source+'的experience.json净补丁，保留知识刷新与并行记录；另登记回退版本，提案与账本历史不删。账本shipped由运维据本实际发布登记。\n'
append(ROOT/'notes/for-dai.md',notice);append(ROOT/'ops/inbox-dev.md',notice)
updates=[dict(id=i,by='learner:experience-update',where=dict(commits=[merged,publication]),version=name,note='第93批经验数据实际合入/合后测试0/唯一版本已登记，原提案独立实现；status仍proposed，交运维据实际完成事件标shipped。') for i in lids]
data=json.dumps(updates,ensure_ascii=False);(O/'ledger-publication-input.json').write_text(data+'\n');p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=data,text=True,capture_output=True);(O/'ledger-publication.log').write_text(p.stdout+p.stderr);p.check_returncode()
(O/'publication.json').write_text(json.dumps(dict(name=name,merged=merged,commit=publication,source=source),ensure_ascii=False,indent=2)+'\n')

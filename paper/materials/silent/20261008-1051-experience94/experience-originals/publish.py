import fcntl,json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
source,merged=sys.argv[1:];name='S1.exp94'
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def stamp():return subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
def append(path,text):
 with path.open('a') as h:fcntl.flock(h,fcntl.LOCK_EX);h.write(text);h.flush()
s=stamp();path=LIVE/'eval/versions.json';v=json.load(open(path));assert not any(x['name']==name for x in v['versions'])
v['versions'].append(dict(name=name,family='Silent',commit=merged,source='decision-log '+s+' 静默经验第94次，2026-10-08.10→.11；K2JAGKVJAWZJ A10/F46与钨合金棍三局，新增1/更新15/退役0、170 active；独立strategy-proposal保留真实机制与缺反事实边界'))
path.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');git('add','--','eval/versions.json')
q=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=git('diff','--cached','--binary'),text=True,capture_output=True);(O/'gitleaks-publication.log').write_text(q.stdout+q.stderr);q.check_returncode()
git('commit','-m','Publish Silent experience 2026-10-08.11','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>');publication=git('rev-parse','HEAD');s=stamp()
lids=json.load(open(O/'ledger-ids.json'));pids=json.load(open(O/'proposal-ids.json'))
append(ROOT/'paper/materials/decision-log.md',f'- {s} Codex静默学习者第94次经验实际上线：源{source}→合入{merged}→发布{publication}，唯一{name}；2026-10-08.10→.11/增1改15退0/170 active、50180正文字符；K2JAGKVJAWZJ A10/F33两试同首29抽与F46蜃景/三骑士，钨合金棍10GPK5XGHCK3/UJ0K3G10609Y补证，账本{",".join(lids)}。源原沙箱247文件2604例tsc/vitest0，诊断300秒重跑124与最终定向10例0保留；实际合后原沙箱0。知识刷新/并行记录保留；五提案{",".join(pids)}含两勘误，独立strategy-proposal，不记源码implemented，shipped交运维核实；证据/回退见{O}/report.md。\n')
notice=f'\n### {s} Roy：静默猎手第94次经验上线（{name}）\n\n源{source}，实际合入{merged}，发布{publication}；来源K2JAGKVJAWZJ A10/F33、F46及钨合金棍三局；账本{",".join(lids)}；任务experience-update/20261008-101302-experience-update，代码提案{",".join(pids)}交独立strategy-proposal。源及实际合后原沙箱通过；原300秒诊断124和两初稿数字/来源勘误保留，实际经验已更正。\n\n'
for c in json.load(open(O/'changes.json'))['entries']:
 old=c['before'];new=c['after'];notice+='- '+c['id']+'：旧规则='+('无独立经验；台账0178已有实盘机制' if old is None else old['lesson'])+'；新规则='+new['lesson']+'；证据='+','.join(new['evidence'])+'\n'
notice+='\n预期影响：构筑与路线/休息文字区分实际建立与持有、首抽改线与单动作因果、局部减损与后段生存；不保证单项改变使整战获胜。出牌/药水/SL/终局源码未由本任务改动，提案待独立核覆盖，不冒认implemented。回退：逆向撤经验源'+source+'的experience.json净补丁，保留刷新/并行代码与记录；另登记回退版本，台账及提案原文/勘误不删。仅实际数据上线，shipped交运维按本完成事件核实。\n'
append(ROOT/'notes/for-roy.md',notice);append(ROOT/'ops/inbox-dev.md',notice)
updates=[dict(id=i,by='learner:experience-update',where=dict(commits=[merged,publication]),version=name,note='第94批经验数据实际合入、合后原沙箱0、唯一版本/上线记录及Roy双通知已登记；status保持proposed，运维根据完成事件标shipped；独立提案不记源码implemented。') for i in lids]
data=json.dumps(updates,ensure_ascii=False);(O/'ledger-publication-input.json').write_text(data+'\n');q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=data,text=True,capture_output=True);(O/'ledger-publication.log').write_text(q.stdout+q.stderr);q.check_returncode()
(O/'publication.json').write_text(json.dumps(dict(name=name,source=source,merged=merged,commit=publication),ensure_ascii=False,indent=2)+'\n')

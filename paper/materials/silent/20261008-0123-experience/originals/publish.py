import json, subprocess, sys
from pathlib import Path

O=Path(__file__).parent; ROOT=Path('/home/dw/Projects/agent-sts2'); LIVE=ROOT/'.worktrees/live'
source,merged=sys.argv[1:3]
stamp=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True,capture_output=True,check=True).stdout.strip()
print(stamp)
C=json.load(open(O/'changes.json')); L=json.load(open(O/'ledger-result.json')); ids=L['proposed']
p=LIVE/'eval/versions.json';d=json.loads(p.read_text());name='S1.exp84'
assert not any(v['name']==name for v in d['versions'])
d['versions'].append(dict(name=name,family='Silent',commit=merged,source=f'decision-log {stamp}（学习者源{source}；静默经验2026-10-08.1，第84批NHA2KW0RB7VP A10，增1改13退0/159 active。新增油灯首次负面数值放大；蟹朝向取整现场、SL即时血价、能力实际兑现与连续资源分别核。旧109局七数组逐行相同；源及合后原沙箱0。仅知识前缀，独立strategy-proposal未实现。）'))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['git','-C',str(LIVE),'add','--','eval/versions.json'],check=True)
diff=subprocess.run(['git','-C',str(LIVE),'diff','--cached','--binary'],text=True,capture_output=True,check=True).stdout
q=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=diff,text=True,capture_output=True)
(O/'gitleaks-publication.log').write_text(q.stdout+q.stderr);q.check_returncode()
subprocess.run(['git','-C',str(LIVE),'commit','-m','Register Silent experience 2026-10-08.1 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],check=True)
publication=subprocess.run(['git','-C',str(LIVE),'rev-parse','HEAD'],text=True,capture_output=True,check=True).stdout.strip()
line=f'- {stamp[:16]} Codex学习者第84次静默经验实际上线：来源experience.json的'+','.join(C['added']+C['updated'])+'；证据NHA2KW0RB7VP及油灯历史K3676LU8B0UH/SADL3CGYTGSR；账本'+','.join(ids)+f'；源{source}、合入{merged}、发布{publication}/唯一{name}。源及合后原沙箱通过，仅知识前缀变化；两代码提案独立strategy-proposal，其他角色等价；运维据完成事件CLI登记shipped及完整外部补验，学习者不标shipped。\n'
with (ROOT/'paper/materials/decision-log.md').open('a') as h:h.write(line)
notice=f'\n### {stamp} 静默经验 {name} 已上线，通知 Roy／运维\n\n源{source}；实际合入{merged}；发布{publication}；经验2026-10-07.29→2026-10-08.1，仅知识前缀。\n\n'
for c in C['entries']:
    old=c['before'];e=c['after']
    fresh=e['evidence'] if not old else [n for n in e['evidence'] if n not in old['evidence']]
    notice+=f'- {e["id"]}：旧规则／表述：'+(old['lesson'].split('。机制：')[0].split('。典型案例：')[0] if old else '无本条经验')+'；新规则／表述：'+e['lesson'].split('。机制：')[0].split('。典型案例：')[0]+'；新核证据 '+','.join(fresh)+'。\n'
notice+='\n账本：'+','.join(ids)+'；代码提案：'+','.join(json.load(open(O/'proposal-ids.json')))+'；任务experience-update/20261008-004303→strategy-proposal。提案pending，未修改出牌/药水/SL/终局源码，未冒标implemented/shipped。预期更准确表达实际增益/朝向取整/能力兑现和SL即时血价与连续资源链，不宣称本批提高胜率。回退只恢复合前experience.json原blob并提交、登记回退版本，保留刷新/并行代码/全部历史；不reset覆盖新游戏数据。完整报告在本任务scratch/report.md。\n'
for path in ['notes/for-roy.md','ops/inbox-dev.md']:
    with (ROOT/path).open('a') as h:h.write(notice)
(O/'publication.json').write_text(json.dumps(dict(source=source,merged=merged,publication=publication,version=name,ledger=ids),ensure_ascii=False,indent=2)+'\n')

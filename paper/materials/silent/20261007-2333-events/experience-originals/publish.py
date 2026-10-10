import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';source,merged=sys.argv[1:3]
stamp=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True,capture_output=True,check=True).stdout.strip();print(stamp)
C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));ids=L['proposed'];p=LIVE/'eval/versions.json';d=json.loads(p.read_text());name='S1.exp82';assert not any(v['name']==name for v in d['versions'])
entry=dict(name=name,family='Silent',commit=merged,source=f'decision-log {stamp}（学习者源{source}；静默经验2026-10-07.28，第82批TXZ6RVMQA09D/WQZVENQ7DTRP A10，增1改19退0/156 active；旧105局逐行重算一致、原沙箱tsc/vitest0及合后原入口0；狡诈容量、王室猛毒开场/组合、能力分源、SL血价/连战资源。仅经验数据，代码提案独立strategy-proposal，未把提案标实现。）');d['versions'].append(entry);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
for args in [['add','--','eval/versions.json']]:subprocess.run(['git','-C',str(LIVE),*args],check=True)
diff=subprocess.run(['git','-C',str(LIVE),'diff','--cached','--binary'],text=True,capture_output=True,check=True).stdout;q=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=diff,text=True,capture_output=True);(O/'gitleaks-publication.log').write_text(q.stdout+q.stderr);q.check_returncode()
subprocess.run(['git','-C',str(LIVE),'commit','-m','Register Silent experience 2026-10-07.28 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],check=True)
publication=subprocess.run(['git','-C',str(LIVE),'rev-parse','HEAD'],text=True,capture_output=True,check=True).stdout.strip()
line=f'- {stamp[:16]} Codex学习者第82次静默经验实际上线：来源experience.json的'+','.join(C['added']+C['updated'])+f'；证据TXZ6RVMQA09D/WQZVENQ7DTRP及狡诈9局；账本'+','.join(ids)+f'；源{source}、live合入{merged}、发布{publication}/唯一{name}。源及合后原沙箱通过；仅知识前缀变化，源码提案独立，其他角色等价；运维据完成事件CLI登记shipped及外部完整补验，本学习者不标shipped。\n'
with (ROOT/'paper/materials/decision-log.md').open('a') as h:h.write(line)
notice=f'\n### {stamp} 静默经验 {name} 已上线，通知 Roy／运维\n\n源{source}，合入{merged}，发布{publication}；经验2026-10-07.27→.28。只上线经验前缀，三份源码提案pending交独立strategy-proposal，尚未改出牌/药水/SL/终局源码。\n\n'
for c in C['entries']:
 old=c['before'];e=c['after'];notice+=f'- {e["id"]}：旧规则／表述：'+(old['lesson'].split('。机制：')[0].split('。典型案例：')[0] if old else '无本条经验')+'；新规则／表述：'+e['lesson'].split('。机制：')[0].split('。典型案例：')[0]+'；证据 '+','.join(e['evidence'] if not old else [n for n in e['evidence'] if n not in old['evidence']])+'。\n'
notice+='\n账本：'+','.join(ids)+'；提案：'+','.join(json.load(open(O/'proposal-ids.json')))+'；任务experience-update/20261007-223544→strategy-proposal。预期更准确区分真实容量、开场血价、已建能力/计划及SL双向代价；不宣称本批提高胜率。回退只恢复合入前experience.json原blob并提交，保留刷新/并行代码/本批原日志及CLI历史，另登记回退版本；不直接reset覆盖新游戏数据。\n'
for path in ['notes/for-roy.md','ops/inbox-dev.md']:
 with (ROOT/path).open('a') as h:h.write(notice)
(O/'publication.json').write_text(json.dumps(dict(source=source,merged=merged,publication=publication,version=name,ledger=ids),ensure_ascii=False,indent=2)+'\n')

import json,re,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';source,merged=sys.argv[1:3]
C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));mapping=json.load(open(O/'ledger-map.json'));ids=json.load(open(O/'proposal-ids.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();p=LIVE/'eval/versions.json';v=json.load(open(p));n=max(int(m[1]) for r in v['versions'] if (m:=re.fullmatch(r'S1\.exp(\d+)',r['name'])))+1;name='S1.exp'+str(n)
v['versions'].append(dict(name=name,family='Silent',commit=merged,source=f'decision-log {stamp}（源{source}；静默经验2026-10-08.9、第92批PD9AYQVMLQW6,L2TSFU62Z57Z A10，增1改20退0，168 active/51442字；旧120局基线一致，铜液17局21饮、逐牌/逐击力挡分源、持牌傷与首boss胜后实际血药接续。源及合后原沙箱0，仅知识前缀；三独立strategy-proposal pending，不当源码实现。）'))
p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['git','-C',str(LIVE),'add','--','eval/versions.json'],check=True)
diff=subprocess.check_output(['git','-C',str(LIVE),'diff','--cached','--binary'],text=True);scan=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=diff,text=True,capture_output=True);(O/'gitleaks-publication.log').write_text(scan.stdout+scan.stderr);scan.check_returncode()
subprocess.run(['git','-C',str(LIVE),'commit','-m','Register Silent experience 2026-10-08.9 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],check=True);pub=subprocess.check_output(['git','-C',str(LIVE),'rev-parse','HEAD'],text=True).strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
line=f'- {stamp[:16]} Codex学习者静默第92次经验实际上线：来源条目'+','.join(C['added']+C['updated'])+'；证据PD9AYQVMLQW6,L2TSFU62Z57Z/A10及本角色条目既有历史局，铜液首证K3676LU8B0UH、共17局；账本'+','.join(L['proposed'])+f'；源{source}、合入{merged}、发布{pub}/唯一{name}；经验2026-10-08.9→.9/增1改20退0/168 active/51442字，旧120局基线复算一致，源与合后原沙箱0；仅知识前缀、其他角色保持，三源码提案pending；运维据完成事件核实际shipped与完整外部补测，学习者不标shipped。\n'
with (ROOT/'paper/materials/decision-log.md').open('a') as h:h.write(line)
notice=f'\n### {stamp} 静默经验 {name} 已上线，通知 Roy／运维\n\n来源experience-update/20261008-075539；源{source}、合入{merged}、发布{pub}；2026-10-08.9→.9；证据PD9AYQVMLQW6,L2TSFU62Z57Z及条目既有本角色历史，铜液17局首证K3676LU8B0UH。以下旧新内容仅知识前缀，源码仍交独立strategy-proposal。\n\n'
for c in C['entries']:
    b,e=c['before'],c['after'];old=b['lesson'] if b else '原库无该独立条目'
    notice+=f'- {c["id"]}：旧规则/表述：{old}；新规则/表述：{e["lesson"]}；支持{e["n_support"]}/反例{e["n_contradict"]}、asc{e["asc"]}；新增证据'+','.join(c['new_runs'])+'；账本'+','.join(mapping[c['id']])+'。\n'
notice+='\n预期影响：路线/休息分开赢战血价、实际回复与未来投影；按已建能力/逐击力量及逐牌敏捷和被动挡分源；候选护栏与SL撤回后的实际血价分账，不新增固定药水/SL阈值、不承诺胜率。代码提案'+','.join(ids)+'独立实施。回退：仅三方逆向恢复本次experience差量并登记新回退版本，保留知识刷新及并行代码/记录；不硬重置后续进展。完整旧新/证据/测试/账本在本批report.md/changes.json。\n'
for path in ['notes/for-roy.md','ops/inbox-dev.md']:
    with (ROOT/path).open('a') as h:h.write(notice)
(O/'publication.json').write_text(json.dumps(dict(source=source,merged=merged,publication=pub,version=name,ledger=L['proposed']),ensure_ascii=False,indent=2)+'\n');print(name,pub)

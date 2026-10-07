import json
import re
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
source,merged=sys.argv[1:3]
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'))
mapping=json.load(open(O/'ledger-map.json'));ids=json.load(open(O/'proposal-ids.json'))
p=LIVE/'eval/versions.json';v=json.load(open(p))
n=max(int(m[1]) for r in v['versions'] if (m:=re.fullmatch(r'S1\.exp(\d+)',r['name'])))+1
name='S1.exp'+str(n)
v['versions'].append(dict(name=name,family='Silent',commit=merged,source=f'decision-log {stamp}（源{source}；静默经验2026-10-08.6，第89批7X0W3U8TVA2A/MTQ0EUBJ3R6T A10，增1改20退0，161 active/52376字；旧116局七数组逐行一致，毒/倍率挡/持牌伤/反伤/上限与当前血分账，跨幕回复12局18对；无新喝药/SL门槛。源及合后原沙箱0，仅知识前缀，三份strategy-proposal pending。）'))
p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['git','-C',str(LIVE),'add','--','eval/versions.json'],check=True)
diff=subprocess.check_output(['git','-C',str(LIVE),'diff','--cached','--binary'],text=True)
scan=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=diff,text=True,capture_output=True)
(O/'gitleaks-publication.log').write_text(scan.stdout+scan.stderr);scan.check_returncode()
subprocess.run(['git','-C',str(LIVE),'commit','-m','Register Silent experience 2026-10-08.6 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],check=True)
pub=subprocess.check_output(['git','-C',str(LIVE),'rev-parse','HEAD'],text=True).strip()
line=f'- {stamp[:16]} Codex学习者第89次静默经验实际上线：来源条目'+','.join(C['added']+C['updated'])+'；证据7X0W3U8TVA2A/MTQ0EUBJ3R6T及条目原本角色历史证据，跨幕十二局十八对；账本'+','.join(L['proposed'])+f'；源{source}、合入{merged}、发布{pub}/唯一{name}；2026-10-08.5→.6/增1改20退0/161 active/52376字，旧116局七数组/分档/回血/SL重算一致，源及合后原沙箱0。仅知识前缀，三独立strategy-proposal pending；无关角色等价。運维据完成事件确认shipped及完整外部补验，学习者不标shipped。\n'
with (ROOT/'paper/materials/decision-log.md').open('a') as h:h.write(line)
notice=f'\n### {stamp} 静默经验 {name} 已上线，通知 Roy／运维\n\n源{source}；实际合入{merged}；发布{pub}；经验2026-10-08.5→2026-10-08.6。以下是知识前缀逐项旧新表述，经验上线不等于独立源码提案实现。\n\n'
for c in C['entries']:
    b,z=c['before'],c['after']
    previous=b['lesson'] if b else '原经验库无独立异螨同抽重打条目；已有silent-0079类比观察账本'
    fresh=[r for r in z['evidence'] if not b or r not in b['evidence']]
    notice+=f'- {c["id"]}：旧规则／表述：{previous}；新规则／表述（n={z["n_support"]}，asc={z["asc"]}）：{z["lesson"]}；证据'+','.join(fresh)+'；账本'+','.join(mapping[c['id']])+'。\n'
notice+='\n任务experience-update/20261008-053105→strategy-proposal；提案'+','.join(ids)+'，pending。预期影响：更准确表达已建毒/敏捷/倍率挡、持牌伤/荆棘/生命上限与当前血、赢战后实到资源及跨幕回复，不宣称胜率提升，不设新饮药/留药/SL阈值。回退：三方逆向只恢复本次experience差量至合前blob并登记新回退版本，保留刷新、并行源码/记录和提案历史；不硬重置覆盖后续进展。证据、旧新全文、测试与回执见本批report.md/changes.json。\n'
for namepath in ['notes/for-dai.md','ops/inbox-dev.md']:
    with (ROOT/namepath).open('a') as h:h.write(notice)
(O/'publication.json').write_text(json.dumps(dict(source=source,merged=merged,publication=pub,version=name,ledger=L['proposed']),ensure_ascii=False,indent=2)+'\n')
print(name,pub)

import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=O.parents[2]
LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'))
C=json.load(open(O/'changes.json'))
L=json.load(open(O/'ledger-result.json'))
S=json.load(open(O/'slice-summary.json'))
source=(O/'commit.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(file):
    text=(O/file).read_text()
    return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
st=tests('test-source-final.log')
lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log')
assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json']
assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp58'
assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.3→.4，源{source}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5207的HUVEPWQAHWFU SILENT A10及两处勘误、静默第五十八次增量和本角色历史；羽化机制首证C48LLXBGKXQ9 A0。来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持，0203真实机制与0202纯bug分账。'
    +'旧70局七数组/血档/源节点/回血/SL重算一致，新71局1119房61实死，A10三十一局405房31实死；MCCK2602T1SR仅进数字。六牌全部支持局实打核对；雕刻师T3—6力9/18/27/36，尖啸24→18只当轮，弱化33→24/42→31，末51对13挡需38、18血差20；步法常驻2与预判临时2逐牌加挡，水盆固定4独立。沙虫两次均T1建毒雾2/余像1，首试T10判死未派发、不补55敌血上的29毒；末试T9实建43挡、T10的39毒杀38血，净损44/余8胜。31项原始初序相同但首9后插入逃离，已知24张辅助、到手回合/动作同变，不定单能力胜因；历史真正SL65场293次20赢、A10 32场152次8赢。'
    +'羽化2能量消耗、向抽牌堆加3攻击而不即时抽：C48 F24手牌9→8/抽18→21，HUV F35手牌5→4/抽17→20，后免费翻越撑击7/猎杀者15实际兑现，生成/抽牌/输出分账。HUV六火各回21共126、F29后F32入31与boss入52兑现，F34三火避精英线未到第一火就死；骇鳗护栏省10当轮血同时少10题面伤/后续9毒，原线整战未实打，观察进入general:deck而不据未遇沙漏补boss证据。'
    +f'新增1更新13（全部补证、只数字0）退役0，active128→129、51683→{C["chars"]}字，高62中39低28；A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字/A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字。240配对切片中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字，非完整V4前缀。'
    +f'初稿源tsc0/{st["files"]}文件{st["cases"]}例/vitest0，补明雕刻师低阶基础12/A10占位后定稿重跑tsc0/{st["files"]}文件{st["cases"]}例/vitest0，非失败/超时重跑；合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0，'+('首轮失败后重跑通过' if M.get('test_first_rc') else '首轮通过')+'。'
    +f'刷新提交{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0、其他知识保持。首次预检仅decision-log追加历史冲突停止原件保留；随后核对双方原文有序并集完整再合入，未覆盖知识。抽数初稿含药旧句拦截、跨房尝试计数/基础能量与实际能量字段断言及更正原日志保持，非生产测试失败。无源码/生成器/手写知识/其他角色或用药规则改动，不重建。交运维据experience-done及learner/runs/20261007-031302-experience-update/handoff-ops.md核实际发布后CLI登记shipped，完整沙箱外套件交调度器，不另审核。主目录本节/账本仅追加不提交，不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.4；源{source}；HUVEPWQAHWFU A10及勘误、本角色历史，羽化首证C48LLXBGKXQ9 A0。增1改13退0，active129/{C["chars"]}字；仪式成长、力敏与被动挡、毒雾/余像实际启动、羽化生成/即时抽牌分账、沙虫两试末胜与路线回血/护栏观察。旧70局重算一致，无新用药规则/源码变更；源定稿与合后沙箱tsc/vitest0，15项proposed交运维核实际合入后shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:
    subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.4 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)

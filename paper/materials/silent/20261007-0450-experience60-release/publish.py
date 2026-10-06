import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'))
C=json.load(open(O/'changes.json'))
L=json.load(open(O/'ledger-result.json'))
S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(file):
    text=(O/file).read_text()
    return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
st=tests('test-source.log')
lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log')
assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json']
assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp60'
assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.5→.6，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5229/5240的TU3XB4CAEDAW、V0383V5S9BCQ SILENT A10及04:23:18勘误、静默第六十次增量与本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持，交运维核实际发布后登记shipped。'
 +'旧72局七数组/血档/源节点/回血/SL逐行重算一致，新74局1163房64实死，A10三十四局449房34死；MCCK2602T1SR仅进数字。新25房2实死，TU三重打场8试2赢、V0无SL；啃咬机两试同初序30项与到手轮、单/双触媒及后续攻击/目标同变，一判死一胜；猎人两试初序31项同但到手轮改变，一判死一胜。青蛙四试8/89均败，首末初序32/34项及到手轮不同，不是单变量同盘实验。'
 +'TU族母石头1加步法+3为4敏，吸取后2/0、力−2/−4，毒仍结算；雕刻师仪式9、力9/18/27/36/45，T6尖啸36→30令弱后38→33，双防御18实损15，T7两触媒下32＋30毒清62，战内75→14、芝士15。末青蛙群蛇4两触发只扣敌挡16→12→8、实体161不变，已施22毒在一触媒下22＋21=43才161→118，零挡对28、8血差20死亡，毒雾4未等到下一轮初。药水仅既有事实，无新用药规则。'
 +'V0蛮兽T5生存者后弃中和留切割，初题预计零损/扣9，改线18挡对24实损6/扣6；更早53FLQ68CETW0 A6 F2 T4同弃牌预计0→1、55→54，保留中和的A0/A6两局零损作prior=partly依据，0205首证/先验保持。雕像苏醒轮尖啸0→−6不抵T3的10力/25攻，突然一拳弱化25→18、10挡损8，弱消失后18挡对25损7，末22血无挡对25差3、敌余47/132；首扣44不能预支持续输出。'
 +'TU F38后8血换问号、下火F40→F42，F39笨拙换节日拉炮未回血，F40四败；原线未实打，预测耗尽不定实战必死。TU四回血94、V0回21合115，A10回血140动作共3480、后战133/18死/活损中位25；V0精英投影入39实入37死亡，boss54依赖未抵达火，不把未抵达计实到0或54。'
 +f'增1改11（全部补证、只数字0）退0，active130→131、50696→{C["chars"]}字，高62中40低29；A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字/A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字。240配对切片增量中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。'
 +f'源tsc0/{st["files"]}文件{st["cases"]}例/vitest0，合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0；源'+('重跑通过；' if (O/'test-source-first.log').exists() else '首轮通过；')+('合后重跑通过。' if M.get('test_first_rc') else '合后首轮通过。')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0、其他知识保持。仅临时取数/模板/切片初稿更正，非生产故障，原历史留本批转录和draft-corrections.md。无源码/生成器/手写知识/其他角色改动，不重建。主目录本节/账本只追加不提交，交运维据experience-done及learner/runs/20261007-042707-experience-update/handoff-ops.md核实际合入后CLI登记shipped，完整沙箱外套件交调度器，不另审核、不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.6；源{M["source_commit"]}；TU3XB4CAEDAW,V0383V5S9BCQ A10及勘误、本角色历史。增1改11退0，active131/{C["chars"]}字；弃中和减伤、仪式/临时减力、敏捷/族母削益、群蛇扣挡与毒结算、同抽SL及路线血池观察；旧72局重算一致，无新用药规则/源码变更，源及合后沙箱tsc/vitest0，13项proposed交运维据实际合入登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:
    subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.6 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)

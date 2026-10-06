import json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));source=(O/'commit.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and M['untouched_knowledge_blobs_preserved'] and L['check']==0

def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(name):
 text=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
st=tests('test-source-final.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log');assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
assert git('hash-object','knowledge/characters/silent/experience.json')==subprocess.check_output(['git','-C',str(ROOT/'.worktrees/exp'),'hash-object','knowledge/characters/silent/experience.json'],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
M['release_parent']=git('rev-parse','HEAD');v=json.load(open(LIVE/paths[1]));name='S1.exp56';assert not any(x['name']==name for x in v['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.1→.2，源{source}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5186的VPW8YH7A4QFM SILENT A10/F39、01:01:00利齿之眼EYE_WITH_TEETH勘误、静默第五十六次增量及本角色历史；来源条目'+','.join(C['updated']+C['added'])+'；账本'+','.join(L['proposed'])
 +'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持；0198本局/unknown、0197 Y6GM2CHWJBEY A0/no仍observed，后者评分纯bug本批不改。交运维据experience-done及learner/runs/20261007-010232-experience-update/handoff-ops.md核实际合入后CLI登记shipped，不另设审核。旧67局七数组及血档/节点/回血/SL逐行一致，新68局1076房58实死、A10二十八局362房28死，MCCK2602T1SR仅进数字。'
 +'本局17房1死、无读档；历史真正重打63场285次19赢不变，两原始SL行均首试boss赢不增重打分母。原首COMBAT口径含开场遗物：F28首70→43净27/操作72→43损29，F35首68→38净30/操作70→38损32，F38首80→47净33/操作78→47损31，F39首47→0净47/操作45→0损45。新王室猛毒与小血瓶组合仅1局两窗口80→78/47→45净−2、67旧局未持有，缺各自中间帧不拆公式/顺序或归唯一敗因。'
 +'余像T4建立0挡、后五牌5加斗篷4合9，双尖啸各−6令三敌42→6、9挡零损；次轮负力撤回/电击2→4力、17→19。T5余像5+脆弱生存者6合11对25损14；T6预判2敏使脆弱防御3→5、另余像1，整轮余像5+防御5合10，5血对组装师21需11、差6实死。触媒T3建2、4毒截清8血电击取消19攻击，15挡盖戳刺12零损，本体只受流星锤3；T4又新召22电击。爆发重放后空翻5+5至15、后重抽重问，未走原线不补算。'
 +'组装师本体六轮扣36/0/3/11/0/0合50仍105/155；毒雾/神化/毒性爆发/2力2敏疯狂科学未施放，无步法，不预支持有组件或为步法补证。收场抽33不可打0伤与历史空堆56斩36分账；代码评分漏条件只留0197。终40张五打击四防御/贪婪/进阶之灾、3升级，不能单归牌数；F32皇家枕头回37至80后蟹损57、茶回42后下火未到，路线/构筑/休息/目标替代未实打不定因果。A10 173火110回血2635、去重后战103/16死。'
 +f'新增1更新14（11補证/0只数字/3仅压缩）退役0，active126→127、56138→56154字，高59中40低28；开工四条压1160至54978，原文/局号/数字/证据/原药水分句归档保持，A8 120条52878字/A9 121条53177字/A10 122条53757字。240配对中位增量{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。'
 +f'源定稿tsc0/{st["files"]}文件{st["cases"]}例/vitest0；初轮提前启动读压缩稿通过，定稿完整重跑通过、非失败超时；合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0，'+('首轮失败后按任务重跑通过、原日志保持' if M.get('test_first_rc') else '首轮通过')+'，完整沙箱外套件交调度器。'
 +f'刷新提交{M.get("refresh_commit")}、合前{M["base"]}，知识不同blob冲突0、其他知识blob保持；无生成器改动不重建。抽数列表/字典、同戳前帧断言与机制未完成/含药分句拦截初稿保留、修正后通过，不当生产代码失败。无源码/手写知识/其他角色改动，无新用药规则，主目录变更节/账本仅追加不提交，不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as f:f.write('\n- '+stamp+' '+message+'\n')
v['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.2；源{source}；VPW8YH7A4QFM A10及01:01勘误、本角色历史。增1改14退0，active127/56154字；余像/触媒/尖啸/预判/爆发/毒雾实际启动、王室猛毒与小血瓶组合净−2观察、收场条件和本体输出、路线/回血观察；旧67局全部一致、首帧与操作口径分账，无新用药规则/源码变更；源/合后沙箱tsc/vitest0，15项proposed交运维核实际合入登记shipped，完整沙箱外套件交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.2 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)

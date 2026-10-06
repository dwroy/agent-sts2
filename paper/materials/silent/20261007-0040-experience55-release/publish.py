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
M['release_parent']=git('rev-parse','HEAD');v=json.load(open(LIVE/paths[1]));name='S1.exp55';assert not any(x['name']==name for x in v['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-06.29→2026-10-07.1，源{source}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5177的ZVYUL2YP3518 SILENT A10/F49、00:00:18怪物ID勘误、静默第五十五次增量与本角色历史；来源条目'+','.join(C['updated'])+'；账本'+','.join(L['proposed'])
 +'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持，交运维据experience-done及learner/runs/20261007-000343-experience-update/handoff-ops.md核实际合入后登记shipped，不另设审核。旧66局七数组/全部血档/源节点/回血/SL逐行复算一致，新67局1059房57实死、A10二十七局345房27实死，MCCK2602T1SR仅进数字。新19房1实死；F21/F22实际Unknown、F43迷失/遗忘80→67进统计，F24复活过渡0不计实死。'
 +'实验体六试50/83均仅清首111，五次T6/T7/T8/T8/T8判死恢复T1、末T8实死；clean40初序同、仅前7张同到手轮，生成/重抽/行动未控，无单项胜线或运气归因。末步法1→4敏、能力不加激怒力；净化仍技能3→6、T5四技能6→18，36挡未盖45，19毒潜力37截扣首段29并取消攻击。换阶段清旧毒/敌力/激怒，留4敏/1触媒/3毒雾/4精准/刀扇；新3/4/5毒扣5/7/9、T6—8总伤23/23/42合88余124/212，未进第三段。尖啸T7四击44→20挡22零损，T8恢复五击55对27需损28、13血差15。'
 +'敏捷T5三挡8/9/12比零敏多12，T8两斗篷各10多8；T6预判临时4→8、挡34盖33而次轮回4。精准三刀基础12→24，遗忘之魂每刀1另3合27，毒9另计；刀扇实伤仅单敌。音叉计数9→10在偏折8外补7、挡7→22；钗每轮7/锚仅首轮10分账。羽毛7支持局55到火0反例，新八次124与四回血108分账，F47四十张42→66再回82；石头8支持局80持有后房首帧1敏。蜡烛实际0→5/正1→6各添5、不回血，3支持局，未定动作优先级。'
 +'女王82→50十轮630、芝士后回1净32后直接进第二boss；二幕避精英仍问号战52净损及走廊复活，替路线/构筑/休息未实打，不定安全血线或单因。终40张四打击五防御/贪婪/进阶之灾、8升级、无商店移除；已建能力不等全战输出。全历史真正重打63场285次19赢，新六试0赢；A10 166火105回血2448、去重后战98/16死。'
 +f'新增0更新21（21补证、0纯数字）退役0，active126→126、55756→56138字，高58中41低27；开工压5条1196字至54560，原文/数字/局号/证据/原药水分句保持，A8 119条52862字/A9 120条53161字/A10 121条53741字。240配对中位增量{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。'
 +f'源初轮及定稿均tsc0/{st["files"]}文件{st["cases"]}例/vitest0，定稿重跑仅为女王五首试赢文字校正、非失败/超时；合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0，'+('合后重跑通过，原失败日志保留' if M.get('test_first_rc') else '合后首轮通过')+'，完整沙箱外套件交调度器。'
 +f'刷新提交{M.get("refresh_commit")}、合前{M["base"]}，知识重叠/冲突0，其他知识blob保持；没有生成器改动不重建。净化/生存者pending的抽数初稿StopIteration及按稳定帧修正保留，非生产代码失败。无源码/手写知识/其他角色变更、无新用药规则；主目录变更节/账本仅追加不提交，不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as f:f.write('\n- '+stamp+' '+message+'\n')
v['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.1；源{source}；ZVYUL2YP3518 A10及勘误、本角色历史。增0改21退0，active126/56138字；技能激怒/能力、阶段清毒与触媒、敏捷/精准/消耗伤、被动挡/临时敏捷、羽毛回复/蜡烛续火、SL与路线/血池观察。旧66局全部一致，无新用药规则、无源码变更；源/合后沙箱tsc/vitest0，22项proposed交运维确认实际合入登记shipped，完整沙箱外套件交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.1 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)

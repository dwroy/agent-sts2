import collections
import hashlib
import json
import re
import statistics
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip()
C=json.load(open(O/'changes.json')); A=json.load(open(O/'audit.json'))
M=json.load(open(O/'run-metadata.json')); specs=json.load(open(O/'spec.json'))
mechanisms={r['id']:r for r in json.load(open(O/'mechanism-evidence.json'))}
S=json.load(open(O/'slice-summary.json')); ids=json.load(open(O/'ledger-ids.json'))
P=json.load(open(O/'proposal-ids.json'))
merge=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,reason='尚待锁内合入')
log=(O/'test-source.log').read_text()
files=sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed',log))
cases=sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed',log))
rc=int((O/'test-source.rc').read_text()) if (O/'test-source.rc').exists() else None
ledger_rc=int((O/'ledger-check.rc').read_text()) if (O/'ledger-check.rc').exists() else None
title=f'## {stamp[:10]} 静默猎手 第八十九次增量：2 局 A10（version 2026-10-08.6，分支 {branch}，{source[:8]}）'
def table(header,rows):
 return '\n'.join(['| '+' | '.join(header)+' |','| '+' | '.join(['---']*len(header))+' |']+['| '+' | '.join(str(x).replace('|','／').replace('\n',' ') for x in row)+' |' for row in rows])+'\n'
text=title+'\n\n### 来源\n\n'
text+=f'- 记录时间{stamp}。只读根notes/lessons.md:5633的7X0W3U8TVA2A、:5640的MTQ0EUBJ3R6T及后续05:28勘误；runs.jsonl:598/599逐局核SILENT/A10/F31败与F23败，无角色跳过。dirty原树未知，不以当前源码冒认对局源码。\n'
text+='- 开工工作区干净，git merge --no-edit main成功快进5f84502c；已读README、最新STATE、决策尾、学习协议、代码提案闭环、首次方法/末两节及本角色末两节、账本README。自己完成，无下级agent；单进程nice19抽取、固定测试单worker，未跑boss模拟池/play、联网或安装依赖。临时文件仅本批scratch。\n'
text+=f'- 按run id重新抽取445+424=869决策、31+23=54实际Codex脑回答、1+5=6 SL记录；states按UTC时间窗seek再核run_id/state.run.character_id，共461+440=901帧。两个时间窗DeepSeek推理0，兼容ds_*不是实际DS；每局字节偏移/原行保留。\n'
asc=collections.Counter(r['ascension'] for r in M)
text+=f'- 全引擎学习观察截至{A["cutoff"]}，118静默完局，A0—A10局数'+ '/'.join(str(asc[a]) for a in range(11))+f'；1723房/{sum(r["death"] for r in A["fights"])}实死。进行中/切点后/无character旧局/其他角色排除；无只进数字未读复盘的局，不替代纯Codex战绩口径。\n'
text+='- 沿用第88批：第一COMBAT HP减同房最终尝试退出HP，开场回血导致的负净损保留、实死单列；Monster只走廊、Unknown问号战另算，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除，多源可同战，回血后战去重。判死截断不补未执行攻击/毒，多试不当多局；营火数按独立层、动作/回复次数另列。\n'
text+='- 旧116局全部重新执行逐局分析，七数组、全部血档、节点转移、实际回血和SL与上一节逐行一致，无口径偏差。本批22房20活/2实死；MTQ0前三试末1血为判死截断，不当死亡/离场，整房净损8与末试可操作10→0分列。\n'
text+=f'- 增1改20退0，20条均补证据、只数字0。active160→161，正文54254→52376，置信{C["confidence"]}。开工未超过55000，预算60000未改；同主题直接并入，20条更新改用结论/机制/搭配/案例结构精简重复叙述，证据/反例不删、旧全文保留changes.json及before。\n\n### 对照数据检查的主题\n\n'
rows=[]
for c in C['entries']:
 e=c['after'];m=mechanisms[e['id']]
 data=f'支持{m["support"]}/反例{m["contradict"]}，分阶{m["asc"]}；新增'+','.join(c['new_runs'])
 conclusion=e['lesson'].split('。')[0]
 rows.append([e.get('name') or e['id'],data,conclusion])
text+=table(['主题','数据','结论'],rows)
text+=table(['主题','数据','结论'],[
 ['赢战连续血价','7X0 F19/21/22/30净损7/0/3/3；MTQ0 F11净损31、boss48、F19/20净损13/38','高血与无精英不保证下一场少损；开场回血与可操作血价另核'],
 ['药水与恢复分账','7X0独立得5/饮5/弃0/SL0；MTQ0独立得7/饮13/弃0/SL恢复6槽次；HP恢复27','重复读档不当新获得，未建立留药或早喝受控胜线'],
 ['SL同盘T3','MTQ0四试10血/敌61与41；前三29挡损0净扣13，末19挡损8净扣19','少挡换伤未杀，Jev原选与代码探索分开；四试0赢，前三判死中断不是实死'],
 ['末轮勘误','MTQ0末2血0挡、实际13攻；2−13=−11、HP截0','原least-loss -11为预计剩血，未记伤害预测20，不造漏伤bug'],
 ['千足虫血池','7X0初150+7次各25=325，实扣278后残47；末1血14挡对21攻','截至死亡血池不是完整通关总需伤，未来接续未知'],
 ['路线投影','7X0 F18投影F31为59实67，F32/33未到；MTQ0 F18投影F24火29实未到，F23入8补10','不同构筑/节点条件下只作观察，不认同条件因果'],
 ['boss时钟','两局脑事实均尚无silent时钟校准；实际族母9轮损33胜、仪式兽11轮入房损48胜','数据库HP/整场模拟不是时钟输出，不用单场胜负校准概率']])
text+='\n旧基线七数组复算：\n\n'+table(['数组','旧','新','旧行一致'],[[k,r['before'],r['after'],'是'] for k,r in json.load(open(O/'baseline-check.json')).items()])
text+='\n各阶/幕/房型非空血档（房/独立局，实死率，活损中位；完整病例audit.json）：\n\n'
text+=table(['进阶','幕','房型','血档','房/局','实死/率','活损中位'],[[f'A{r["asc"]}',r['act'],r['type'],r['band'],f'{r["n"]}/{r["runs"]}',f'{r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}%',r['median_win']] for r in A['bands'] if r['n']])
text+='\n源节点入血到下一更高层首战（REST/SHOP/EVENT含多源同战，另列去重战数）：\n\n'
text+=table(['进阶','幕','源节点','血档','源数/去重战','实死/率','活损中位'],[[f'A{r["asc"]}',r['act'],r['screen'],r['band'],f'{r["n"]}/{r["unique_fights"]}',f'{r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}%',r['median_win']] for r in A['transfers'] if r['n']])
text+='\n各进阶营火和回血后下一战：\n\n'+table(['进阶/局','火/回血动作/锻造动作','实回HP','去重后战/死','活损中位'],[[f'A{r["asc"]}/{r["runs"]}',f'{r["rests"]}/{r["heal"]}/{r["smith"]}',sum(r['gains']),f'{r["nexts"]}/{r["deaths"]}',r['median']] for r in json.load(open(O/'rest-summary.json'))])
text+='\n各进阶真正多次重打：\n\n'+table(['进阶','房','记录尝试','赢尝试'],[[f'A{r["asc"]}',r['fights'],r['attempts'],r['wins']] for r in json.load(open(O/'sl-summary.json'))])
text+='\n### 经验库自己带偏或写了没被执行的地方\n\n'
text+='- 两窗DeepSeek0，54实际brain均Codex，无DS引用经验原话。7X0 F18“永久首轮爆发利于铺毒萎靡；走三火单精英。”；实终组没有触媒/毒雾、萎靡未升级，未来组件不当已建。\n'
text+='- MTQ0 F18“持续能量支撑毒防；三营火避精英，保血升级。”，首火F24未到，F19/20先赢却耗至8；F12实际锻造代替旧计划回血，不能把未执行计划算保血成功。\n'
text+='- 7X0 F31T5原题同时报五轮8/8赢、后续损0，但前中两暂死段下一轮各回25，实至T13死；是推演输入纯bug记录，不当经验保证。MTQ0原“未更常死亡”在两线24/24全败时不等安全，少10挡实耗8血；只记局部观察，不称Jev主动冒险。\n\n### 机制推理\n\n'
rows=[]
for eid,s in specs.items():
 m=mechanisms[eid]
 rows.append([eid,s['mechanism']+'；搭配：'+s['pairing'],f'{m["support"]}/{m["contradict"]}，分阶{m["asc"]}',s['case'],eid])
text+=table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],rows)
text+='\n- 历史392个相关本角色复盘段已提取；所有旧卡牌/结束/成长帧重新核，完整evidence/contradicting和分阶留mechanism-evidence.json。全史动作分母不当条目支持局数，也不把末局失败当公式反例。\n'
for name,r in json.load(open(O/'historical-power-deltas.json')).items():
 text+=f'- 全史{name}：{r["runs"]}局/{r["casts"]}次，增量分布{r["deltas"]}。原帧逐项保存；步法五次净+1有柔嫩逐牌减1、毒雾一次+6有首牌重放，不改基础公式。动作包括未新增进条目的历史观察局，不能冒报全部为新增支持。\n'
text+='- 跨幕12支持局/18对同上限边界全重核：缺失HP80%向下取整吻合；只实见A9/A10，未外推低阶/其他先古。异螨力量只报现场3/6，不推成长规则；力量药本局实建2、敏捷药实建2但未隔离整战胜因，不设药水价值参数。\n'
text+='- 三提案'+','.join(P)+'均source_task=experience-update、关联实际经验/账本、target_task=strategy-proposal；领域combat/potion/sl/terminal/structure。仅登记pending，经验发布不当源码implemented。\n\n### 新增\n\n'
text+='- silent-myte-toxic-block-sl-observation（hallway:MYTE，asc[10,20]，支持1/反例0、low）：同盘四试T3合需27挡，前三29挡零损、末19挡损8，四试0赢。承接silent-0079同盘少挡换伤账本，不重复造首次/prior；完整逐回合数据留报告和原帧。\n\n### 更新\n\n'
text+=table(['条目','支持前→后','字符前→后','新证据'],[[c['id'],f'{c["before"]["n_support"]}→{c["after"]["n_support"]}',f'{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}',','.join(c['new_runs'])] for c in C['entries'] if c['before']])
text+='\n- 20条均补本角色证据，0条只改数字；20条按上述表重写压短重复案例，旧全文与所有证据/反例保持，原进阶范围不扩大。无同scope另建重复机制条目、无合并退役。\n\n### 退役\n\n- 无；没有反例多于支持或已修bug型条目。本批纯代码缺陷不入经验。\n\n### 和手写知识及代码冲突\n\n'
text+='- 八个其他静默知识JSON核用途/时间切点/哈希：room-costs为MAP首末旧93局切点，monster-records战内/战后净损分列，outcome-stats为观察统计，boss-damage/trust与fight-value/gates为生成/独立校准数据。不同切点/口径不是手写事实冲突，不用本批战内数覆盖异步数据。double-boss既有四局参数，本批未到F49，无新参数证据。无手写攻略/手册需改删，八文件哈希保持。\n'
text+='- 代码手写知识不改；接续暂死输入、生存者强制弃牌与实际数据冲突见下节及复盘原代码提案，不能用已实现条目的文字假设模型入口完整。其他角色数据、手册与源码未改。\n\n### 代码问题（不给 DS）\n\n'
text+='- silent-0273新定位千足虫暂死接续段在重新读盘入口被过滤；silent-0268旧普通生存者强制弃牌未消费重复。7X0 T1后继防御未执行少5挡、实损6；T5当轮扣14/损0正确不保证未来8/8赢。两项留复盘/原提案独立strategy-proposal，未声称修复，账本仍observed。\n'
text+='- MTQ0 least-loss −11与实前2−13一致；伤害预测20未记录，SL摘要block4的未落盘采样未知，不造模型根因。原护栏线/替路线完整反事实未记，不能以候选16对整轮20指认纯bug。\n'
text+='- 抽取/核对脚本的阶段失败保留：首次更新在rest-summary尚未产出时启动，未写经验；首次核对误选前三试T5而非末试，第二次误把手牌无序集合当固定顺序。改为sl_attempt4及排序核对后verify-final退出0；这些不是游戏bug或沙箱测试失败。\n\n### 测试\n\n'
text+=f'- 源原入口bash tools/test-sandbox.sh（TMPDIR本批，PATH含~/.local/node/bin，SANDBOX_WORKERS=1，nice19）；tsc {rc}、vitest {rc}，{files}文件/{cases}通过例；源测试无重跑。完整外部由调度器实际合入后补，不冒报完整套件通过。\n'
text+='- JSON、字段/角色/局号/反例/预算、旧116局逐行基线、关键四试/七次接续/18跨幕转换、240固定切片、check-experience missing=[]/0、gitleaks0、diff --check通过。\n'
text+=f'- 学习账本只经CLI：新增无，改proposed '+','.join(ids)+f'；退役无，ledger.py check {ledger_rc}。原claim/首证/prior/repeat和旧上线历史保持，学习者不标accepted/shipped。\n'
text+=f'- live合入：{merge.get("merged")}；刷新：{merge.get("refresh")}；合前：{merge.get("before")}；合后测试：{merge.get("after_test")}；结果：{merge.get("reason")}。\n'
for conflict in merge.get('precheck_conflicts',[]):text+='- '+conflict+'\n'
text+='\n### 切片大小\n\n'
text+='- 种子20260929，从截止点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对；每格20独立时刻、池/时间留manifest。CHARACTER=silent调用官方knowledge-slice.ts，改前/后固定同一common/silent/outcome快照。新池抽样，旧批中位不直接当before；此测是切片，V4整份前缀另报本阶总字数。\n\n'
before=json.load(open(O/'slice-before.json'));after=json.load(open(O/'slice-after.json'))
text+=table(['进阶/界面','改前中位/最大','改后中位/最大','配对增量中位'],[[b['sample'].replace('sample-',''),f'{b["median"]}/{b["max"]}',f'{a["median"]}/{a["max"]}',statistics.median(n-o for o,n in zip(b['sizes'],a['sizes']))] for b,a in zip(before,after)])
text+=f'\n- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_increase"]:+}字），配对增量中位{S["paired_median"]:+}，单片最多增{S["max_increase"]}，最大{S["before_max"]}→{S["after_max"]}。active161/正文52376，置信{C["confidence"]}；A8适用{C["applicable"]["8"]}，A9适用{C["applicable"]["9"]}，A10适用{C["applicable"]["10"]}。需要Roy定：无。\n'
text+='\n原帧/脚本/初稿/失败/机制表/提案/账本/测试/切片/合入回执：'+str(O)+'；报告时间'+stamp+'。\n'
(O/'changelog-section.md').write_text(text)
(O/'section-title.txt').write_text(title+'\n')
labels={'silent-strength-weak-observation':'力量与敏捷',
        'silent-deck-burst-observation':'能力建立与生存窗口（观察）',
        'silent-decimillipede-reattach-poison':'千足虫接续',
        'silent-ceremonial-beast-threshold-growth-sl':'仪式兽阈值',
        'silent-ceremonial-beast-ringing-one-card':'仪式兽昏眩',
        'silent-act-transition-missing-hp-heal':'跨幕缺失生命回复'}
names={c['id']:c['after'].get('name',labels.get(c['id'],c['id'])) for c in C['entries']}
result=dict(task='experience-update',version='2026-10-08.6',commit=source,merged=merge.get('merged'),added=1,updated=20,retired=0,active=161,
            mechanisms=[names[eid] for eid in specs],tests=dict(tsc=rc,vitest=rc,cases=cases),
            ledger=dict(added=[],proposed=ids,retired=[],check=ledger_rc),code_proposals=P,
            implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text(text+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
print('报告',str(O/'report.md'),'测试',files,cases,'合入',merge.get('merged'))

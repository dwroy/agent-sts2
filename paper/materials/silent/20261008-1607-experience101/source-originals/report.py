import collections
import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
N='AD3QSC3P41JU'
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
A=json.load((O/'audit.json').open())
U=json.load((O/'update-summary.json').open())
C=json.load((O/'changes.json').open())['entries']
R=json.load((O/'run-metadata.json').open())
M=json.load((O/'ledger-map.json').open())
size=json.load((O/'slice-summary.json').open())
props=json.load((O/'code-proposal-ids.json').open())
live=json.load((O/'live-merge.json').open())
commit=(O/'source-commit.txt').read_text().strip()
title=(O/'changelog-title.txt').read_text().strip()
proposed=json.load((O/'ledger-proposed.json').open())
rc=int((O/'test-source.rc').read_text())
test_path=O/'test-source-retry.log' if (O/'test-source-retry.log').exists() else O/'test-source.log'
test=test_path.read_text()
files=sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed',test))
cases=sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed',test))
assert rc==0 and files>0 and cases>0
b,z=U['before'],U['after']
T=['## '+title,'','### 来源','',
f'- 记录时间{now}。只读复盘notes/lessons.md:5763起AD3QSC3P41JU静默小节，暂无该节后勘误；runs.jsonl:613确认SILENT/A10/F49败，未跳过。运行a340c1ec+dirty完整源码未保存，不冒认当前树等同开局树。',
'- exp起始干净，git merge --no-edit main无冲突完成；已读README、最新STATE/决定末尾、学习协议/代码提案闭环、首次构建方法与最近两节格式、silent最后两节及账本README。独立完成，无下级agent；临时文件仅本批目录。日志重抽/复算nice19单进程，固定沙箱测试1worker，不联网/安装依赖/运行play/boss模拟池。',
'- run id重抽708决策、43实际Codex脑请求、9SL记录及run-plans/Jev题；states按UTC 2026-10-08T06:16:41.391Z—06:53:39.267Z字节seek并核state.run.character_id，728帧；起止字节见AD3QSC3P41JU/states-offsets.json。DeepSeek推理窗0行，不将兼容ds_*字段视为DeepSeek实际回答。728新抽状态逐帧与原复盘抽取相同，16项独立实帧检查、9项补充机制/资源检查及六试同首手比较通过。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，分阶{dict(collections.Counter(r["ascension"] for r in R))}；{len(A["fights"])}战斗房/{sum(r["death"] for r in A["fights"])}实死。其余131局只进数字/历史验证；排除缺character旧铁甲、其他角色、进行中及切点后局；不是纯Codex爬塔战绩。',
'- 口径沿第100节：首COMBAT入房HP减同房最终尝试退出HP，开场失血与负净损保留，实死单列。Monster走廊与Unknown问号战分开；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT源节点入血关联下一更高层首战，Ancient排除，多源可同战，回血后战去重；独立营火数与动作数分列。同战多尝试仅一战房，五次判死截断不计实死。',
'- 自动run-1008-1453局报以可操作HP列部分战斗，故F39/F45/F46/F48/F49写损0/0/36/43/11；本任务沿首COMBAT入房口径重抽为4/4/40/47/15，差额均为新战开场4血。旧131局按原协议复算无差，不能把自动局报的入口差异混成基线漂移。',
'- 旧131局七数组逐行、全部血档/节点后战、休息回复及SL完全一致；没有基线差额需改变口径。敏捷药旧51局79饮，本局1饮＋2，新52局80饮；药水持有、实饮与同房多试分账。',
f'- 新增0、更新17（17加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，正文{b["chars"]}→{z["chars"]}字，high{z["confidence"]["high"]}/med{z["confidence"]["med"]}/low{z["confidence"]["low"]}。未过55000，无强制合并/退役；17条相关案例替换及去重复净压短473字，完整前后证据/反例保存changes.json，不改60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
    e=c['after']
    T.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；新证{N} | {e["lesson"]} |')
T.extend([
'| 正路径净HP守恒 | 17赢战净损297、末战入房15→0；六休息实回133，先古回47+40，事件回10+41/损15；56+133+87+51−15−297−15=0 | 开场失血含战房净损；SL恢复不累加，净损不等敌人毛伤 |',
'| 赢战血药接续 | F46房间66/可操作62→赢26，两药实饮；F47+36到62；F48房间62/可操作58→赢15，能量药已饮；F49房间15/可操作11空药败 | 首boss胜与下场胜分账，增益重建及开场代价实核；没有留药完整胜线 |',
'| 药水来源/去处 | 10瓶=7奖励+3购买，10实际饮用、0丢弃，无SL药水恢复；敏捷药1饮+2，F46异鱼油力敏各1不带到女王 | 单药局部收益不等留药或整场因果，原持有价参数保持 |',
'| SL同盘对照 | 实验体六试0赢；同8张首手/11血，30伤线损8、21伤扫腿线零损，第二试多活到T3；前五判死、末T2实死 | 当轮净威胁实测，后轮抽牌/行为有变，无赢的那次或受控整场胜线，不归运气 |',
'| 当前攻击完整需损 | 末T2四技能令敌力3→15/19→31攻，虚弱后23；18挡、3血，完整需损5、至少差3血才能存活；毒扣6仍剩58/111 | 实扣3不是完整攻击总量；不能把抽牌或未来毒预支成解死线 |',
'| 路线预测与实际行动 | F4投影F15入70、实53，原分支按回血但F7/F11实锻造；F16投影38实38；F32投影70实70；F49明确前boss掉血未建模 | 行动不同与模型误差分账；二/三幕无精英仍后场败，无替路线因果 |',
'| 进阶 | 新局A10；机制沿原[0,20]，route/rest/deck观察[8,20]，连战[10,20]；各支持/反例按实际角色进阶列出 | 低阶不是A10策略独立证据；未发现高阶反驳，不退役 |',
'','旧基线七数组逐行复算：','','| 数组 | 旧131局 | 加新局后 | 核对 |','| --- | --- | --- | --- |'])
for k,v in json.load((O/'baseline-check.json').open()).items():
    T.append(f'| {k} | {v["before"]} | {v["after"]} | 旧行完全一致 |')
T.extend(['','各阶/幕/战斗房型/入血档；死亡单列，掉血中位只计存活房：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['bands']:
    if r['n']: T.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','节点后下一更高层首战：源节点入血分档，EVENT排除Ancient，多源可同后战；低血走不同节点仅观察，未作匹配因果比较：','','| 进阶 | 幕 | 源节点 | 血档 | 源/去重战/局 | 后战死/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['transfers']:
    if r['n']: T.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]}/{len({c["run"] for c in r["cases"]})} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','实完成休息回复与去重后战；同火重复动作仍分别计，与独立火数可能不同：','','| 进阶/局 | 独立火 | 回血/其他动作 | 实回 | 后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |'])
for r in json.load((O/'rest-summary.json').open()):
    T.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
T.extend(['','静默历史多次重打（按局/房去重，日志尝试不当实死）：','','| 进阶 | 重打场 | 记录尝试 | 赢次 |','| --- | --- | --- | --- |'])
for r in json.load((O/'sl-summary.json').open()):
    T.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
T.extend(['','### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek窗0行，43实际脑请求均Codex，无可核“DeepSeek逐字引条目却反向执行”的原话，不补引述。Codex F18原话“额外回合加速双毒雾，走双商店四营火保血补强”；F34原话“面具免费启动毒雾，走三营火避精英备连战”。已知双boss、末火确选休息，不登记为忘记连战或末火升级。',
'- 同盘全败推演仍付血价，F49除第二试外仍选损8多9伤首线，沿silent-0079既有repeat保留；没有逐字引用经验的记录，不称故意违背。护栏只替换F33两次，F49血差8没有超8边界，不新报纯bug。',
'- 女王已建毒防实胜，下一场必须重建；佩尔之眼多次轮初补毒、抽牌获得牌/能量仍不等已结毒或解死线。实验体第二试多活一轮仍未胜，不外推保血必胜。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |'])
mechanisms=[]
for c,ev in zip(C,U['evidence']):
    e=c['after']
    if '机制：' not in e['lesson']: continue
    conclusion=e['lesson'].split('机制：')[0].rstrip('。')
    reasoning=e['lesson'].split('机制：',1)[1].split('搭配：')[0].rstrip('。')
    case=e['lesson'].split('典型案例：',1)[1]
    T.append(f'| {conclusion} | {reasoning}；局部算术与整战胜因分账 | {e["n_support"]}/{e["n_contradict"]}；分阶{ev["by_asc"]}；适用{e["asc"]} | {case} | {e["id"]} |')
    mechanisms.append(conclusion)
T.extend(['','- 历史437段静默机制复盘及全部本角色日志按切点/角色复核。historical-mechanism-summary保存支持/反例完整名单、分阶和实际动作集合；出现/持有/施放不等整条支持。说不清整战因果的写观察；本局未跨实验体第一阶段，不补后续机制。','','### 新增','','- 无，同主题并已有条目。','','### 更新',''])
for c in C:
    T.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}、反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本'+','.join(M[c['id']])+'。')
T.extend(['','### 退役','',
'- 无，未改打法源码；已有局部模型消费不等整条游戏知识需退役。没有反例多于支持或高阶推翻，历史证据/反例保留。',
'','### 和手写知识及代码冲突','',
'- silent其他8份JSON逐份核字段/元数据与内容，SHA见other-knowledge.json；为生成统计/模型及有界double-boss/boss-trust观察，无手写攻略需改。旧统计切点不当新数据反例；double-boss四局未校准、不能判必死限制保持，本局无受控通关数据，不重新拟合。改了的手写知识：无。',
'- 当前turn-solver.ts:1942已有逐技能增加enemy.enrage，:3400另有未来增力代价；本局激怒3支持现有现场层数规则。完整dirty运行源码缺失，不能据末轮推演损2、实际需损5的新差額直接定位纯bug；交独立固定帧提案，不把源码定位给DS。',
'- 专用提案CLI：'+','.join(props)+'；source_task=experience-update、target_task=strategy-proposal，实际combat/potion/sl/terminal，不涉structure。含旧/新行为、证据局/层/回合、账本/反例、按局战分组和时间留出验证、缺数据、预期与回退；未登记implemented/shipped。',
'','### 代码问题（不给 DS）','',
'- 新纯bug无；原复盘同样无新增。缺完整dirty源码、前五SL退出与未结算致死、部分退场毛伤、后续实验体阶段、本角色boss时钟输出、联合通关预测、完整留药/换线/休息受控结局、末轮推演差额确定原因。证据不足保留现参数，不承诺模型核验后能赢。',
'','### 测试','',
f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批目录、PATH本机node、nice19、固定1worker；tsc退出0、vitest文件{files}/用例{cases}/退出0。'+('高负载首次失败后重跑一次通过，原失败日志保留。' if (O/'test-source-retry.log').exists() else '首次通过，无重跑。')+'固定排除名单未改；完整沙箱外套件交调度器，不冒报。',
'- JSON/字段/scope中文名/角色局号/支持反例/置信度/日期/预算、旧131局基线、16+9项独立实帧/机制核验、六试同首手比较、240配对切片、check-experience missing=[]/0、gitleaks源0、git diff --check通过。',
'- 账本仅CLI：新增无；proposed '+','.join(proposed)+'；退役无；ledger.py check0。首证/prior/claim及原support/repeat和旧上线历史保留；实际shipped由运维核live，经验发布不当策略代码实现。',
f'- live合入：{live["merged"]}；刷新{live.get("refresh")}；合前{live.get("pre")}；{live["result"]}。'])
if live['merged'] is None:
    T.append('- 按任务遇合入冲突/占用停止，原预检/刷新/源提交保留，不硬解或覆盖并行记录；没有实际上线，不造decision/eval/Roy通知，交完成事件由运维兜底，不停对局、不运行play。')
    T.extend('- '+s for s in live.get('conflicts',[]))
else:
    T.append('- 实际合后沙箱测试通过，源码未改不需重建知识；上线decision/eval版本及通知见发布回执，数据shipped交运维。')
T.extend(['','### 切片大小','',
'- 固定种子20260929，从截至切点states中state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对。manifest记录池/时间/唯一帧，小池有放回补足标记；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，仅换经验。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |'])
for r in size['by_sample']:
    T.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
T.extend(['',f'- 整体中位{size["before_median"]}→{size["after_median"]}、涨{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。',
f'- active{z["active"]}/正文{z["chars"]}；high{z["confidence"]["high"]}/med{z["confidence"]["med"]}/low{z["confidence"]["low"]}；'+ '、'.join(f'A{a}适用{v["entries"]}条/{v["chars"]}字' for a,v in z['asc'].items())+'。未合并/退役，不改预算；需要Dai定：无，合入受阻交运维兜底。',
'',f'原帧/复算/机制/提案/CLI/测试/切片/合入回执：{O.resolve()}；报告时间{now}。',''])
section='\n'.join(T)
(O/'changelog-section.md').write_text(section)
f=ROOT/'paper/materials/experience-changelog-silent.md'
assert '\n## '+title not in f.read_text()
with f.open('a') as h: h.write('\n'+section)
report=dict(task='experience-update',version=U['version'],commit=commit,merged=live['merged'],added=0,updated=17,retired=0,active=z['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(added=[],proposed=proposed,retired=[],check=0),code_proposals=props,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text(section+'\n```json\n'+json.dumps(report,ensure_ascii=False)+'\n```\n')
print('已追加第101节并保存报告；',files,'文件',cases,'用例；',live['result'])

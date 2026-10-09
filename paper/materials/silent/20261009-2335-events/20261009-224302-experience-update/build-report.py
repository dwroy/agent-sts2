import collections
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
source=(O/'source-commit.txt').read_text().strip()
title=f'2026-10-09 静默猎手 第一百四十一次增量：1 局 A10（version 2026-10-09.30，分支 exp-silent，{source[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
U=json.load(open(O/'update-summary.json'))
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
M=json.load(open(O/'ledger-map.json'))
V=json.load(open(O/'verification.json'))
B=json.load(open(O/'baseline-check.json'))
S=json.load(open(O/'slice-summary.json'))
T=json.load(open(O/'test-results.json'))
P=json.load(open(O/'code-proposals-results.json'))
ME={r['id']:r for r in json.load(open(O/'mechanism-evidence.json'))}
params=json.load(open(O/'historical-parameters.json'))
merge=json.load(open(O/'live-merge.json'))
R=json.load(open(O/'run-metadata.json'))
new=O/'0PH64C4AWAX9'
counts={name:sum(1 for _ in (new/(name+'.jsonl')).open()) for name in ['decisions','states','brain','run-plans','sl-attempts','jev-prompts','deepseek-reasoning']}
L=['## '+title,'','### 来源','',
   f'- 记录时间{stamp}。根notes/lessons.md:8991起0PH64C4AWAX9完整静默小节按行号只读，未见后续勘误。runs.jsonl:661为SILENT/A10/F24败；last_seen取run-1009-2128-0PH64C4AWAX9.md，无角色跳过。',
   '- 开工exp-silent干净，git merge --no-edit main无冲突，合后基线6200430cf；已读README、最新STATE-2026-10-09、最近决定、学习协议、代码提案闭环、首次构建方法及最后两节增量口径。独立完成，未派下级agent，其他角色数字/结论未迁入。',
   f'- 全引擎silent学习观察截至{A["cutoff"]}：{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(x["death"] for x in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧179局只进汇总和历史机制验证，不是纯Codex爬塔成绩；无character旧局、其他角色、未完局和切点后局排除。',
   f'- 新局按run id rg抽记录，states按决策UTC时间窗二分seek流读并核state.run.character_id=silent；记录数{counts}。23独立脑请求均codex/gpt-6.1-sol，deepseek_calls沿旧字段、真实DeepSeek为0；运行a8bb1ebe5+dirty完整源码未记录。',
   '- 口径同上一节：首COMBAT入口HP减最后真实退出HP为战内净损，含开场遗物、回血、自损及复活，不当敌毛伤；死亡另计，SL同房一场，predicted_death不是实死。走廊只Monster，Unknown问号战另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口档关联下一更高层首战，Ancient排除；节点、独立房、局、HEAL动作分母分别列。',
   f'- 上一节179局七数组、全部血档、节点后战、HEAL及SL逐项全等：{B}。没有未解释的基线不一致。旧179局缓存原始抽取逐局重跑分析，新局原始日志直接抽取；另按时间seek核180局各自首帧，缓存与原日志全等，偏移/SHA留historical-source-verification.json；全部180局相关静默复盘按标题流式筛读保留historical-mechanism-notes.txt，历史动作完整分母保留historical-parameters.json。',
   f'- {V["new_original_records"]}条新局记录按原始字节偏移/SHA逐条回读全等；证据角色与公式{V["checks"]}项通过。completed动作表不含pending CARD_SELECTION，弃牌观察另核原始相邻帧；主题支持局不能当每句公式独立实验，普通败局不是机制反例。',
   f'- 新增1、更新14（14加证据、0只改数字）、退役0；active200→201，正文49723→{U["after"]["chars"]}字。未达55000压缩线，无预算合并/退役；生存者旧六段案例压成两例并保留七局证据，逐回合数字留报告。不改60000预算。',
   '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];m=ME[e['id']]
    L.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{m["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
L+=['','机制动作表仅统计实际completed，原样保留相关局/动作分母；净变化可能含重放、敌反应或被动，不把混源变化自动列成公式反例。','', '| 主题 | completed动作/不同局 | 核对范围 |','| --- | --- | --- |']
for ident,v in params.items():
    L.append(f'| {ident} | {v["actions"]}/{v["runs"]} | 本条支持证据内的实动作；完整before/after、牌面、目标、层/回合见historical-parameters.json |')
L+=['','血量分档：n为独立战斗房，局为不同run；死率=实死/n，掉血中位仅赢战。所有非零格列下，零格和逐局数保留audit.json。','', '| 进阶/幕/房间/入口档 | 数据（房/局/死、比例、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['bands']:
    if b['n']:L.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察，非安全血线 |')
L+=['','非战节点后的下一战：分母是节点记录，同一战可对应多个此前节点；另列去重房数，不与独立战斗死亡率混算。未选节点收益未知。','', '| 进阶/幕/节点/入口档 | 节点/独立后战/死节点、比例、活损中位 | 结论 |','| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:L.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察、Ancient排除 |')
L+=['','HEAL独立兑现与后战分母：','', '| 进阶 | 局/独立火/HEAL/实际回HP | 去重后战/死、比例、活损中位 |','| --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):
    L.append(f'| A{b["asc"]} | {b["runs"]}/{b["rests"]}/{b["heal"]}/{sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}；{100*b["deaths"]/b["nexts"]:.2f}%；{b["median"]} |')
L+=['','低血改路线观察：仅实际completed MAP选点、入口<40%，关联下一更高层首战，Ancient排除；选择次数与独立后战分开，含强制路径动作，不表示有可替代节点。同战可被多次路径选择关联，牌组、层数、可选节点和先前损耗不受控，不能宣称某类节点导致改善；完整案例留low-hp-route-comparison.json。','', '| 进阶/幕/实际节点 | 选择/局/独立后战/死选择、比例、活损中位 | 典型案例 |','| --- | --- | --- |']
for b in json.load(open(O/'low-hp-route-comparison.json')):
    case=b['cases'][0]
    L.append(f'| A{b["asc"]}/{b["act"]}/{b["node"]} | {b["choices"]}/{b["runs"]}/{b["next_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["choices"]:.2f}%；{b["median_win"]} | {case["run"]} F{case["floor"]} {case["hp"]}/{case["max_hp"]}→F{case["next_floor"]}净损{case["loss"]}、死{case["death"]} |')
L+=['','本局F12改精英为普通战、F16休息回血确已执行，不能说没有保血；F18所谓双火在强制精英之后，F21/22/23三胜净耗52，F24进7、遗物回到9仍三试败。不同路线/早喝/保留冲刺或串刺的整场胜果未记录，只保存资源观察，不拟饮药或血线门槛。',
    '', 'SL天然对照：按同run同floor去重，多次尝试逐阶分列；共同抽牌前缀不等完整洗牌同抽。','', '| 进阶 | 多次尝试战斗/尝试/赢尝试 |','| --- | --- |']
for b in json.load(open(O/'sl-summary.json')):L.append(f'| A{b["asc"]} | {b["fights"]}/{b["attempts"]}/{b["wins"]} |')
L+=['','全历史原始SL比较173场/56赢尝试；TD1跨进程重建按旧基线保留，缺原SL落盘和sl_attempt标记，不能冒称成功reload/完整同抽。各场第一次动作差和获胜尝试保留sl-draw-comparison.json。',
    '- 千足虫真正重打共3场11尝试0赢：1NZ8FE5F34R9 A4四试共同记录前缀20，UZ1T7AH49WMB A10四试前缀18，本局A10三试前缀12。新局前两T2 8HP+18挡对30判死，未执行结束，不补作12实际失血；末试T3实死。',
    '- 第二/三试T1均喝狡、三刀18直伤、药瓶前中各6毒，敌出口同24/40/50；末挡0/5使复活出口8/14，局部可比。后续T2目标及T3动作不同，两次均无胜线，不能说换挡或改目标赢了。首试晚喝与第二试早喝亦均败，不能归纳早喝必胜。',
    '', '新局资源来路（最大HP70）：F1取珍珠后56；F3损5；F13净损4/敌攻击6，小血瓶回2；F14净回2；F15付8；F16唯一HEAL回21；F17入口62、小血瓶64、敌伤58、出口6；跨幕回51至57；F19净回2；F21/22腐化串刺各自损2、三个胜战小血瓶共回6/敌攻击共54，故59→7净耗52。F24初进7到9，精灵复活与读档恢复分账；后二商店/二火未访资源未知。',
    '', '### 经验库自己带偏或写了没被执行的地方','',
    '- 23真实脑请求均Codex，DeepSeek推理窗0。没有明确引用经验ID的原话，不编造经验诱导因果。F18原话“零费打击配合化学X；少战双火保血。”实际双火在强制精英后未到，改线胜负未知。F23计划原文“use potions decisively”不能当已饮药；狡留至F24。',
    '- F24首/二试原选中和+→药瓶+→后段冒泡，首候选预测后段20毒/本轮扣25，实药瓶后后段仍50且无毒，冒泡能量1→0零效果、整轮只扣16。这是代表落点与真实条件差，不归因经验诱导，也未声称确定斩杀。',
    '- F17T5生存者后以0.31信心弃掉冲刺，原零损/18挡并未兑现；实际损6、输出反多6。F23T3弃串刺则少24输出但省2自损、当轮少损2，两个方向相反，不能写无条件保留原计划。',
    '- F24末试T3毒雾建2后无下一玩家轮，不能把未来群毒写成已伤；当前精灵出口8/14预测与实盘一致，名义21缺独立实帧，净HP差不当复活数值bug。',
    '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    before,case=e['lesson'].split('典型案例：',1)
    m=ME[e['id']]
    label=e.get('name',e['id'])
    L.append(f'| {label} | {before} | {e["n_support"]}/{e["n_contradict"]}；分阶{m["by_asc"]} | {case} | {e["id"]} |')
    mechanisms.append(dict(id=e['id'],name=label,support=e['n_support'],contradict=e['n_contradict'],case=case))
L+=['','机制范围[0,20]，A10案例数值不是固定跨阶常量；统计/构筑观察[8,20]。瓶中精灵新局部配对仅A10/n=1，低置信；独立21血复活帧及逐击顺序未知，不推通用公式。无高阶机制反例或新增受控整战胜因。',
    '', '### 新增','', '- silent-fairy-revival-exit-observation：瓶中精灵，1支持/0反例、low、[0,20]；关联复盘已有silent-0350，账本不重复add。',
    '', '### 更新','']
for c in C:
    e=c['after'];b=c['before']
    if b:L.append(f'- {e["id"]}：支持{b["n_support"]}→{e["n_support"]}，追加0PH64C4AWAX9；正文{len(b["lesson"])}→{len(e["lesson"])}字，置信度{b["confidence"]}→{e["confidence"]}；反例和asc保持。')
L+=['','### 退役','', '- 无。本任务未实现源码修复，未新增过量反例；没有预算合并或修改测试预算。',
    '', '### 和手写知识及代码冲突','',
    '- 改了的手写知识：无。silent其他8份JSON按角色/来源/生成时点核对，metadata/SHA保留other-knowledge.json；均为生成统计、模型或已有结构证据，旧切点和不同房间口径不是新实盘反例，不覆盖后台刷新。double-boss已有A10 F48/F49实证，本局未到，不增加结构事实；其8192样本终局曲线是模拟，不当实盘胜率。',
    '- common monster-db A10族母233、地道虫92与入口相符；千足虫旧A10仅4样本，前段范围46–50/后段52，本局首段52/后段50是新的现场数值，沿实际实体读数，不当固定跨阶上限；common本任务只读。',
    '- 当前turn-solver.ts:2284—2289随机毒调用:2536最高HP+挡代表目标，施毒不降本体便可把份额集中到后段，错误兑现冒泡条件；:1743仅绷带时消费discardAfterDraw，和实际被弃后继不一致。现存silent-0295/0268独立实现；狡诈effect not simulated为已有silent-0256。本任务不改打法源码，不向大脑塞函数或bug。',
    '- 三份CLI提案'+','.join(P)+'覆盖15变更active条目，source_task=experience-update、experience显式关联、target_task=strategy-proposal，实际领域combat/potion/sl/terminal/structure。全部pending，未冒标implemented/shipped。',
    '', '### 代码问题（不给 DS）','',
    '- 无本任务新增纯游戏源码bug。随机毒旧缺口、普通单弃模型和狡诈模型缺口只关联独立代码提案；保留真实数据，不将本次死亡独立归因某一个缺口。',
    '- 验证脚本v1将药槽误取state.potions，KeyError后保留v1及日志；v2改为真实state.run.potions后通过。首次按部分长行apply_patch替换账本关联未匹配，未改库；随后精确替换成功。只读尝试不存在的历史extra.py/药水源码文件保留工具错误，非游戏bug或测试失败。',
    '- 完整dirty源码、复活内部逐击/独立21血帧、首两SL真实退出、完整洗牌同抽、同ID实体身份/若干终击、替路线/牌序/药时/休息整战反事实、未访资源、旧boss时钟与真实费用仍未知，未用预训练知识补。',
    '', '### 测试','',
    f'- 原bash agent/tools/test-sandbox.sh在scratch隔离测试副本运行，1185个跟踪源码/任务文件逐SHA全等、知识同文件，TMPDIR指定scratch、PATH本机node、SANDBOX_WORKERS=2，固定数据/原排除名单：tsc {T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}，重跑{T["retried"]}；完整外部套件由调度器据完成事件补跑。隔离副本验证的限制及原失败如下一行所列。',
    '- 原工作树首轮及同套件复跑均tsc0、vitest1（每轮251文件2619例通过、唯一check-imports失败），原因是旧learner/runs/20261007-203654-experience-update/R0HEV5E3QT6G/states.jsonl链接链超过40层，递归stat非代码数据触发ELOOP。两轮日志与退出原件保留；隔离副本只移除忽略的历史任务输出扫描范围，全部跟踪源码及原测试/预算/排除名单保持，导入扫描0，不改或删除旧历史。',
    '- JSON、diff --check、gitleaks staged、check-experience missing=[]均0；ledger.py check 0。账本新增无，proposed '+','.join(dict.fromkeys(i for ids in M.values() for i in ids))+'，退役无；旧claim/first_run/prior保持，shipped由运维核实际合入登记。',
    f'- 锁内live：{merge["result"]}；刷新{merge.get("refresh")}；合前{merge.get("pre")}；实际合入{merge.get("merged")}；合后测试{merge.get("tests")}。']
for conflict in merge.get('conflicts',[]):L.append('- '+conflict)
for conflict in merge.get('overlap_conflicts',[]):L.append('- 知识重叠冲突：'+conflict)
if not merge.get('merged'):L.append('- 按任务遇冲突停止，不硬解/覆盖刷新、不造上线记录或eval版本。源提交、提案、账本与预检原件交调用方/运维兜底，未合入。')
L+=['','### 切片大小','',
    '- 固定种子20260929，截止内state.run.character_id=silent最高两阶A9/A10、六界面各20状态，共240配对，单遍水库采样且各池足20。CHARACTER=silent调用官方knowledge-slice.ts，前后仅替经验；其他12份common/silent JSON逐字节一致。样本池/时间戳、逐片正文和差值保留。',
    '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for b in S['rows']:L.append(f'| {b["sample"]} | {b["before_median"]}/{b["before_max"]} | {b["after_median"]}/{b["after_max"]} | {b["paired_median"]} |')
L+=['',f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_growth"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差范围{S["delta_range"]}。',
    f'- active201、总字符{U["after"]["chars"]}，置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。需要Dai定：无。',
    '', '全部原件、失败日志、前后经验/切片、数据脚本、历史SL对照、CLI/提案、测试和合入预检保存在'+str(O)+'。','']
section='\n'.join(L)
(O/'changelog-section.md').write_text(section)
(O/'report.md').write_text(section)
(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print('报告生成',len(L),'行',len(section.encode()),'字节')

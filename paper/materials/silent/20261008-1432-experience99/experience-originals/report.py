import collections,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent; ROOT=Path('/home/dw/Projects/agent-sts2'); N='LYBHQ1X230ZB'
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries']
size=json.load(open(O/'slice-summary.json'));mapping=json.load(open(O/'ledger-map.json'));props=json.load(open(O/'code-proposal-ids.json'))
live=json.load(open(O/'live-merge.json'));commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
R=json.load(open(O/'run-metadata.json')); new=[r for r in R if r['run_id']==N][0]
asc=dict(collections.Counter(r['ascension'] for r in R));rest=json.load(open(O/'rest-summary.json'));sl=json.load(open(O/'sl-summary.json'))
z=U['after'];b=U['before'];conf=z['confidence']
T=['## '+title,'','### 来源','',
f'- 记录时间{now}。复盘只读notes/lessons.md:5745起LYBHQ1X230ZB静默小节及14:01:27勘误，run-1008-1324-LYBHQ1X230ZB.md日期2026-10-08；runs.jsonl确认SILENT/A10/F30败，未跳过。完整5925a43d+dirty运行源码未保存，当前live定位不等源码逐字重放。',
'- exp开工干净，git merge --no-edit main快进f11d1578无冲突；已读README、最新STATE/决定末尾、学习协议/提案闭环、首次构建方法、silent最近两节与账本README。独立完成，无下级agent；临时文件仅本任务scratch，抽取/复算nice19单进程，测试固定最多4workers，不联网/安装依赖/运行play/boss模拟池。',
'- run id重抽455决策、28实际Codex脑请求、5SL记录及run-plans/Jev题；states按UTC 2026-10-08T05:01:44.043Z—05:24:24.543Z seek并核state.run.character_id，478帧；DeepSeek窗0，不把兼容ds_*字段当DeepSeek回答。字节偏移见LYBHQ1X230ZB/states-offsets.json。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，分阶{asc}；{len(A["fights"])}战斗房/{sum(r["death"] for r in A["fights"])}实死。其余129局只进数字/历史验证，排除缺character旧铁甲、其他角色、进行中及切点后局；不是纯Codex爬塔战绩。',
'- 口径沿第98节：首COMBAT入房HP减同房最终尝试退出HP，负净损和开场回复保留、死亡单列；Monster走廊与Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT源节点入血关联下一更高层首战，Ancient排除、多源可同战，回血后战去重。独立营火与回血/其他动作分别计，同火可多动作。',
'- 旧129局七数组逐行、所有血档/节点后战、实回复及SL完全一致，baseline-check.json/summarize日志可复算。机制初核沿完成动作过滤遗漏F29T1 pending(unstable)生存者，已按后继真实帧补核16挡，不修改旧统计数组；原verify-initial失败保留。提案首次已登记一项但把纯文本CLI id误当JSON解析，修正返回值解析后CLI去重重试，原日志保留；最初check-experience缺羽毛链接，完整登记后missing=[]/0。',
f'- 新增0、更新16（16加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，正文{b["chars"]}→{z["chars"]}字，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}。未过55000，无强制合并或退役；压短本次更新旧案例，前后全文/证据/反例保存在before/changes，不改60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
    e=c['after'];T.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；新证{N} | {e["lesson"]} |')
T.extend([
'| 赢战资源链 | F22胜65→36/F23胜36→6；F24回21到27；F28羽毛回15到42、锻造无回血；F29带技能药胜42→4/空药，F30实死 | 本场获胜与后场缓冲分账；另线/留药/休息的受控结局未知 |',
'| 格挡分源 | F29T1生存者8→16消费臂甲；T3步法3敏、暗影1层，两防御8→16合32，对29零损；F30T2臂甲首次(5＋3)×2＝16 | 暗影多16挡及末战敏捷多6挡为局部算术，不把整战胜因归单组件 |',
'| 召唤与已伤 | F30T1背刺12＋打击7＋匕首雨10＋漏斗毒4＝33，母体129→96后新幻象21；T2末试结15毒后二敌15/87 | 新召血不抵旧已伤，前三截断不能计15毒已扣，不固定目标序 |',
'| SL同盘对照 | 同场4试0赢，前三T2判死截断，末实死；已执行牌序相同、实际换线0 | 没有赢的那次，不能由四次复现拟胜率或归运气；未实打逃脱计划的反事实未知 |',
'| 药水 | 独立取得12＝初始2/奖励5/商店2/事件3；9饮、3主动弃污浊，SL无额外饮；F29T3离栏时间按勘误05:22:14.174Z | 弃药不计饮，SL不计新药；无留药对照，不改持有价值 |',
'| 实回血守恒 | 四休息84＋五轮书20＋先古16＋羽毛15＝135，前13胜净损187，56＋135−187−末损4＝0 | 净损不是敌人毛伤，先古16与五轮书20不能合写36跨幕回复 |',
'| 终局价值观察 | F29T6所选预计损18/伤31/留4、下轮8/8胜，Jev0.96，实损18且T7胜；另一损12/伤22/留10、7/8胜未实打 | 当战预测全赢不等后场安全，差6血不能冒称转胜；配独立terminal提案，缺证保留权重 |',
'| 进阶 | 新局A10；机制沿原[0,20]、路线/休息/综合策略[8,20]，旧各阶数据另列 | A0—A9数据不当A10策略独立验证，未见反例多过支持或高阶反驳，不退役 |',
'','旧基线七数组逐行复算：','','| 数组 | 旧129局 | 加新局后 | 核对 |','| --- | --- | --- | --- |'])
for k,v in json.load(open(O/'baseline-check.json')).items():T.append(f'| {k} | {v["before"]} | {v["after"]} | 旧行完全一致 |')
T.extend(['','各阶/幕/战斗房型/入血档；死亡另列，掉血中位只算存活房：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['bands']:
    if r['n']:T.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','节点后下一更高层首战：源节点入血分档，普通EVENT排除Ancient，样本多源可同后战，去重战/局另列：','','| 进阶 | 幕 | 源节点 | 源血档 | 源/去重战/局 | 后战死/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['transfers']:
    if r['n']:T.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]}/{len({c["run"] for c in r["cases"]})} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','已完成休息回复与去重后战：','','| 进阶/局 | 独立营火 | 回血/其他动作 | 实回 | 后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |'])
for r in rest:T.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
T.extend(['','全部多次SL场次按一场而非多局，实赢次数与判死/死亡分开：','','| 进阶 | 重打场 | 尝试 | 实赢次数 |','| --- | --- | --- | --- |'])
for r in sl:T.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
T.extend(['','- 新局一场四试0赢，前三读档恢复同一T1、末试实死；没有获胜尝试可比较，无boss/精英新胜线。历史低血不同节点数据如表，牌组、药水与选择混杂，仅作观察，缺同局另一路线完整实打结果。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek窗0行，28实际脑请求均Codex；未找到脑逐字引用某条经验又反向执行的证据，不补引述。复盘F28脑理由中文译意为“42血带药，较安全路线和羽毛支持现在升级、稍后再回血”，明确是译意，原英文在brain/decisions；后续营火未到，不能称忘记危险。F29赢后脑已将F30投影更新4，不误称死亡前仍预计32。',
'- F30四试T1原代码原话均“only line: end turn”，当时零费逃脱计划仍playable=true；此处没有该牌实际抽牌或条件挡的本局后继帧。纯缺口留0296与独立PM提案，不把未执行牌效写成已生收益。F30T2判官原话“nothing left to play or drink; 20 incoming vs 4 HP + 16 block + 0 end-of-turn block”，算术与末试实死一致，不能由首轮遗漏反指末轮判死算错。',
'- F29T6实际Jev选较高当前伤害、较高血价线，确实下一轮获胜；没有明确引用经验原话，不能称读到资源经验后故意违背。此前成功模型规则不代表本局低血进场一定能活。','',
'### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |'])
mechanisms=[];short=[]
for c,ev in zip(C,U['evidence']):
    e=c['after'];s=e['lesson']
    if '机制：' not in s:continue
    reasoning=s.split('机制：',1)[1].split('。搭配：',1)[0];case=s.split('典型案例：',1)[-1];name=e.get('name',e['scope'])
    T.append(f'| {name} | {reasoning}；局部算术已核，单项整战因果未控 | {e["n_support"]}/{e["n_contradict"]}；分阶{ev["by_asc"]}；适用{e["asc"]} | {case} | {e["id"]} |')
    mechanisms.append(e['id']);short.append(name+' — '+s.split('。',1)[0]+f' — {e["n_support"]}支持/{e["n_contradict"]}反例 — '+N)
T.extend(['','- 历史全部静默复盘按角色与切点筛检，再核本角色日志；旧支持/反例逐局保留，新支持只本局。历史实际步法80局877次、暗影19局128次、爆发18局89次、迷雾17局175次是动作集合，不等每条整结论支持局数；持有、未执行、局部加层与完整触发分账，不把所有出现局机械补成支持。mechanism-actions保留动作、new-checkpoints留新帧，源evidence/contradicting完整名单在changes/update-summary，未知交互不补因果。','',
'### 新增','','- 无，同主题并原条目，未执行逃脱计划机制不新增。','',
'### 更新',''])
for c in C:T.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}、反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本'+','.join(mapping[c['id']])+'。')
T.extend(['','### 退役','','- 无，未改打法源码；已实现局部消费不等整条游戏机制需退役。未发现反例多于支持或高阶反驳，证据/反例历史完整保留。','',
'### 和手写知识及代码冲突','',
'- silent其他8份JSON逐份核元数据/内容，SHA记录other-knowledge.json；均为生成统计/模型或有界double-boss/boss-trust观察，无手写攻略需改。旧切点模型不是新数据反例，double-boss四局未校准/不能判必死限制保持；本局未到F49，不补终局交接数据或重拟模型。改了的手写知识：无。',
'- 当前exp card-model.ts:852直接取Block、:929仅由Cards取draw、:1104输出draw，无ESCAPE_PLAN固定抽1/抽入技能条件挡分支；同角色LRN/T082原PM证据已有0296提案，本局四试未施放不能承诺补模后获胜。SHADOWMELD已存在特判但消费完整性须由独立提案核验，不凭存在特判视其他交互已修。本任务不改打法源码，完整运行dirty源码缺失。',
'- 新提案专用CLI：'+','.join(props)+'；source_task=experience-update、target_task=strategy-proposal；实际combat/potion/sl/terminal，未涉structure。terminal仅核当前战赢后出口资源价值，不提供F49未观察结论；反事实缺失保留原权重。提案含旧/新行为、局/层/回合、账本、分组/时间验证、缺数据、预期和回退，未登记implemented/shipped。','',
'### 代码问题（不给 DS）','',
'- 原0296逃脱计划固定抽牌/条件挡纯bug留复盘和独立提案，不新增重复账本、不塞源码定位给DS。旧0100是阶段窗口取舍，不能代替该根因。历史LRN漏打与T082实抽技能/非技能帧及partly先验保持；本局没有实抽、未知补模整场结果。缺完整dirty树、前三SL出口/未结毒、重复敌持久身份、卵退场逐击毛伤、受控替代线/路线/休息/留药胜负、未到后火资源及完整boss时钟；证据不足不定新规则或承诺修后能赢。','',
'### 测试',''])
log=(O/'test-source.log').read_text();retry=(O/'test-source-retry.log')
if retry.exists():log=retry.read_text()
files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
rc=int((O/('test-source-retry.rc' if retry.exists() else 'test-source.rc')).read_text());assert rc==0
T.append(f'- 规定入口agent/bash tools/test-sandbox.sh，PATH本机node、TMPDIR本批scratch、nice19、固定最多4workers；tsc0，vitest{files}文件/{cases}例/0。'+('首次未过、重跑一次通过，原日志保留。' if retry.exists() else '首次通过，无重跑。')+'排除名单未改，完整沙箱外套件待调度器核实，不冒报。')
T.append('- JSON/字段/角色局号/证据反例/置信度/scope中文名/日期/预算、旧129局逐行基线、15项新局实帧及历史机制动作、240配对切片、check-experience missing=[]/0、gitleaks源0及git diff --check通过；初核遗漏pending动作和CLI解析失败均保留。')
added=json.load(open(O/'ledger-added.json'));proposed=json.load(open(O/'ledger-proposed.json'));check=int((O/'ledger-check-final.rc').read_text());assert check==0
T.append('- 账本仅CLI：新增无；proposed '+','.join(proposed)+'；退役无；ledger.py check0。首证/prior/claim/support/repeat和旧上线历史保持；0296纯bug未转经验proposed，shipped由运维核实际live；经验发布不当代码实现。')
T.append(f'- live合入：{live.get("merged")}；刷新{live.get("refresh")}；合前{live.get("pre")}；{live["result"]}。')
if live.get('merged') is None:T.append('- 合并预检冲突按任务停止，不覆盖刷新/硬解，不造上线decision/eval/Roy通知；源提交和完成事件交运维兜底，对局不停、不运行play。')
for line in live.get('conflicts',[]):T.append('- '+line)
T.extend(['','### 切片大小','',
'- 固定种子20260929，从截至切点states中state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对。manifest记池、时点与唯一帧，小池有放回补足20单列；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结相同common/silent/outcome，仅换经验，不联网。','',
'| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |'])
for r in size['by_sample']:T.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
T.append(f'\n- 整体中位{size["before_median"]}→{size["after_median"]}、涨{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。')
T.append(f'- active{z["active"]}、正文{z["chars"]}，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}；'+'、'.join(f'A{a}适用{z["asc"][str(a)]["entries"]}条/{z["asc"][str(a)]["chars"]}字' for a in [8,9,10])+'。本批16条更新去旧重复案例、合计压短930字，逐条见上；未合并/退役，不改预算。需要Roy定：无。')
T.append('\n原帧/复算/机制/提案/CLI/测试/切片/合入回执：'+str(O.resolve())+'；报告时间'+now+'。')
out='\n'.join(T)+'\n';(O/'changelog-addition.md').write_text(out);(O/'report.md').write_text(out)
completion=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=0,updated=16,retired=0,active=z['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=rc,cases=cases),ledger=dict(added=added,proposed=proposed,retired=[],check=check),code_proposals=props,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n');(O/'mechanism-short.json').write_text(json.dumps(short,ensure_ascii=False,indent=2)+'\n')
print('报告',len(out),'字；测试',completion['tests'],'合入',completion['merged'])

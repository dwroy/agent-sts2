import collections, json, re, subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries']
R=json.load(open(O/'run-metadata.json'));N='9R916WW0V65N'
commit=(O/'source-commit.txt').read_text().strip();title=f'## 2026-10-08 静默猎手 第九十六次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
size=json.load(open(O/'slice-summary.json'));props=json.load(open(O/'code-proposal-ids.json'))
live=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,result='待合入')
text=[title,'','### 来源','',f'- 记录时间{now}；唯一新增复盘notes/lessons.md:5719起9R916WW0V65N，按12:02:02勘误分开前五试两防御与末试后空翻/生存者，并用更正后的药水首次离栏帧。runs.jsonl:608为SILENT/A10/F49失败，未跳过；局报run-1008-1117-9R916WW0V65N.md日期2026-10-08。',
'- exp开工干净，git merge --no-edit main无冲突，开工合后c2eb0e3d。已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次构建方法和最近两节、账本README；独立完成，无下级agent。临时文件仅本批scratch，nice19单进程/测试单worker，不联网、安装依赖、运行play或boss模拟池。',
'- 新局按run id重新抽1165决策、50条实际Codex脑日志、12条SL、run-plans和Jev原题；states按2026-10-08T02:14:25.250Z—03:17:44.522Z窗seek，逐帧核state.run.character_id=SILENT，共1405帧，DeepSeek推理0条。ds_*及deepseek_calls为兼容字段，不把Codex理由归给DeepSeek。具体字节偏移与原文在本批9R目录。',
f'- 全引擎学习观察截至{A["cutoff"]}共127个静默完局；A0—A10局数'+ '/'.join(str(sum(r['ascension']==i for r in R)) for i in range(11))+f'。1848战斗房，实死{sum(f["death"] for f in A["fights"])}；只并入指定新局，其他126局只作数字/历史机制验证，不代替纯Codex爬塔战绩。排除缺character的旧铁甲、其他角色、进行中和切点后局。',
'- 口径沿第95节：第一COMBAT入房HP减同房最终尝试退出HP，负净损/开场回复保留、死亡单列；Monster走廊、Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除，多源可同战，回血后的战斗去重。营火数、回血/锻造动作数分别计。新F45巨斧为Unknown，不能混进Monster。',
'- 旧126局七数组逐行、各血档/节点后战、实回复及SL全部一致。额外重算旧实验体条目支持12局52试4赢、真正重打11场51试3赢，与原文一致；新为13支持局55试5赢、12场54试4赢。临时初稿把全部实验体其他局尝试也加入支持局数字，已纠正并登记专用代码提案更正，初稿/失败/原提案留存。',
f'- 新增2、更新17（17加证据、0只改数字）、退役0；active173→175，正文50115→{U["after"]["chars"]}；high105/med44/low26。未过55000、不需腾位/退役/压缩；旧案例原文与证据保留，没有修改60000预算。','', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
 e=c['after']; old=c['before'];case=e['lesson'].split('本批案例：')[-1] if '本批案例：' in e['lesson'] else e['lesson']
 text.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}，分阶{ev["by_asc"]}；新证'+','.join(c['new_runs'])+' | '+case+' |')
text+=['| 赢战资源链 | F42 68→37；F43 37→1；F44回22到23；F45问号巨斧23→3；F46花197补三药；F47回22到25 | 不把前场获胜当后场资源充足；替代线未知 |',
'| 实验体→女王 | 三试仅末赢，25血四药→12血空槽；再生15/失血28/净损13分列；八局F48→F49 HP连续且后场均败 | 观察，不拟合终局权重/留药门槛，末差4生存量仍缺568输出 |',
'| 专注手牌净变化 | 三局39次NO_DRAW1；36次净添3、LRN两次同窗凋萎净添4、JMH一次满10手只补1 | 净增加不全是抽牌；后继抽牌封锁，升级/重放未知 |',
'| 药水/SL | 新获17、原始23饮、最终路径15饮、交换2、主动弃0；七次读档恢复原8瓶位 | SL恢复非新获/回血；污浊12自损非敌伤；尾巴出口充能/独立复活未知 |',
'| 投影与实走 | F38投影F42入68/74，实68；未走后置线51/74未知；F24条件投影boss入50、实63；F46/47仅56/40模拟样本 | 不把缺选项数字补0或推断替代线能赢 |','', '旧基线七数组复算：','', '| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():text.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
text+=['','各进阶/幕/房型非空入血档，房数/独立局数分列；活损为最终退出净损、实死单列：','', '| 进阶 | 幕 | 房型 | 血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['n']:text.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
text+=['','休息/商店/普通事件源节点的下一战；同一战可关联多个源节点，unique列给去重战斗数，死亡率按源节点数：','', '| 进阶 | 幕 | 源节点 | 血档 | 源/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['n']:text.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
text+=['','回血动作及其后战去重：','', '| 进阶/局 | 独立营火 | 回血/其他动作 | 实回 | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):text.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
text+=['','SL多次重打按一场而非多局：','', '| 进阶 | 重打场 | 尝试 | 实赢尝试 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):text.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
text+=['','- 新局实验体一场3试1赢：首两试T11/T10判死且缺出口，末T15实赢；后段出牌/抽弃同变，不能隔离“赢那次改了什么”的因果，不能把前三阶段隐去的伤害补齐。女王一场6试0赢，前五判死末结算未执行，末T2实死，无赢次或可归运气的受控胜例。',
'- 改线仅同局条件投影及实际节点观察，没有另一线路的实打结局。不同局/不同牌组/不同进阶不合并成同样本因果对照；各阶数字如表。','', '### 经验库自己带偏或写了没被执行的地方','',
'- 新局DeepSeek推理窗0条，实际50条脑日志全Codex；没有可核的“DeepSeek引用某条经验”的原话，不补引述。脑原话F1“双商店补强，三营火保血，后期单精英取遗物。”；F34“替换弱牌建立撕咬成长；走三火单精英路线。”。连续Boss备战已在脑理由里，失败不是忘第二Boss的repeat。',
'- Jev第2试女王T2原线包含“BATTLE_TRANCE→FOOTWORK→SHIV→BLADE_DANCE→PREPARED”，题面cards_drawn=9/伤23/零损；原长线未完整执行，重问后实伤4/损7，禁抽与魂缚/重规划分账。末试T1原24挡线被SL改为后空翻/生存者实26，不称同线偏差；T2原14挡未执行，转least-loss三刀与撕咬后0挡死亡。',
'- 25道女王题记推演杀序“火炬头聚合体 > 女王”，实际六试均无击杀，多次打击指女王/中和指火炬，不把chosen_order当实际集火一致。牌组有余像/滚石/刀扇/磨蚀，不等末战已建立。','', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c,ev in zip(C,U['evidence']):
 e=c['after'];s=e['lesson']
 if '机制：' not in s:continue
 reasoning=s.split('机制：',1)[1].split('。搭配：',1)[0]
 if e['id']=='silent-rolling-boulder-start-growth':reasoning+='；本局实验体三阶段需清636，15轮平均至少42.4有效清血/轮，成长兑现仍受可活轮与阶段截断限制，末击未录，不能把理论层数累加当实伤'
 if e['id'] in ['silent-kunai-attack-count-dexterity','silent-footwork-block']:reasoning+='；末轮6敏但没有合法挡牌时不能兑现格挡，16攻击超过12HP的4只是伤害超额，严格存活须伤害低于现HP，不承诺补4即可活或转胜'
 case=s.split('本批案例：')[-1] if '本批案例：' in s else s.split('典型案例：')[-1]
 text.append(f'| {e.get("name",e["scope"])} | {reasoning}；本轮/可活轮收益与整战胜因分开 | {e["n_support"]}/{e["n_contradict"]}，实证进阶{ev["by_asc"]} | {case} | {e["id"]} |')
 mechanisms.append(e['id'])
text+=['','- 本批严格分开能力持有/实际建立、力量与敏捷来源、卡牌与遗物格挡、逐击/逐牌和回复/失血；无单因整战胜负对照的写观察。正文保留公式和一两句典型案例，完整逐帧/逐回合在new-checkpoints、mechanism-actions、trance-hands及审计里。','', '### 新增','']
for c in C:
 if c['before'] is None:text.append('- '+c['id']+'：'+c['after']['lesson'])
text+=['','### 更新','']
mapping=json.load(open(O/'ledger-map.json'))
for c in C:
 if c['before']:text.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字，账本'+','.join(mapping[c['id']])+'。')
text+=['','### 退役','','- 无。机制已由部分代码消费不等完整已修，未把真实游戏机制作为纯bug退役；新增/更新没有重复搬迁其他角色知识。','', '### 和手写知识及代码冲突','',
'- 核对silent目录其余8份JSON并留SHA/元数据；为生成统计/模型及有限double-boss/boss-trust观察，没有手写攻略/手册要改。较旧切点的统计不是新数据反例；double-boss的4局未校准/不作必死限制保留，新8局交接另记经验，不冒称重新拟合该模型。改了的手写知识：无。',
'- 复盘只读live定位：card-model.ts:929/:1072与turn-solver.ts:1954/:2365没有普通专注方案内新建禁抽；combat-plan.ts:2883及turn-solver.ts:2433没有苦无新敏捷入口。这些是纯bug0290/0291，留修复记录及独立提案，不把源码文字给DS。原运行8ef00878+dirty完整快照缺失，当前代码不能复原原场。',
'- 专用CLI：'+','.join(props)+'。来源experience-update、实现strategy-proposal；combat/potion/sl/terminal按实际主题登记，无structure源码改动。原机制提案全局/支持局分母混写，以91cc7fd647077569限定稿及最终经验为准；原稿/注册/失败均保留。未登记implemented/shipped，原postmortem提案不覆盖。','', '### 代码问题（不给 DS）','',
'- 仅沿用复盘新定位silent-0290普通专注禁抽传播、silent-0291苦无同轮增敏传播，不重复建bug账本。旧0246子弹时间不能视作专注已覆盖，0085已有机制不等苦无前瞻已修。缺升级/重放/其他取牌交互、dirty完整源码、七个SL截断出口/末结算、复活充能及独立事件、独立末击和替代整场胜线，保持原参数/必死边界。','', '### 测试','']
logs=[(O/'test-source.log').read_text()]
if (O/'test-source-retry.log').exists():logs.append((O/'test-source-retry.log').read_text())
final=logs[-1]; matches=re.findall(r'Test Files\s+(\d+) passed',final);cases=re.findall(r'Tests\s+(\d+) passed',final)
rc=int((O/('test-source-retry.rc' if len(logs)>1 else 'test-source.rc')).read_text())
text.append(f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19；tsc退出0、vitest文件{sum(map(int,matches))}/用例{sum(map(int,cases))}/退出{rc}。'+('首轮单worker进入vitest后六分钟无新增输出，工具中断退出130、原日志保留；最终冻结经验后按默认4workers重跑完整入口一次，verbose仅增加记录，不改排除名单。' if len(logs)>1 else '首次通过。')+'沙箱外完整套件待调度器核实，不冒报。')
text.append('- JSON、字段/角色局号/支持反例/置信度/scope中文名/预算、旧126局基线、逐饮/禁抽净增分源、240配对切片、check-experience missing=[]/退出0、gitleaks源退出0及diff --check通过。初始39次净添都等3的过强核验失败已按凋萎/满手分源修正，初始提案run列表超出关联账本证据的CLI拒绝已改为实际补证run列表，初稿/失败均保留。')
proposed=json.load(open(O/'ledger-proposed.json'));text.append('- 学习账本仅CLI：新增无；proposed '+','.join(proposed)+'；退役无；ledger.py check退出0。纯bug0290/0291未转proposed；首证/prior/claim/support/repeat及旧上线版本历史保留，shipped交运维核实际合入。')
text.append(f'- live合入：{live.get("merged")}；刷新提交{live.get("refresh")}，合前{live.get("pre")}；{live["result"]}。')
if live.get('merged') is None:text.append('- 未实际合入，不写上线decision/eval版本或Roy规则通知，不改对局/运维prompt。源提交与完成事件交运维兜底，刷新和所有并行记录保留。')
for line in live.get('conflicts',[]):text.append('- '+line)
text+=['','### 切片大小','', '- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；sample-manifest记录池、时点及唯一帧数。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome数据，只换经验；最终支持局数字更正后重跑after。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in size['by_sample']:text.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
text.append(f'\n- 整体中位{size["before_median"]}→{size["after_median"]}、增{size["median_growth"]}字；配对差中位+{size["paired_median"]}；最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。')
text.append('- active175/正文52103，high105/med44/low26；A8适用163条47766字、A9适用164条48050字、A10适用172条51011字。没有合并/退役/压缩，预算保持。需要Roy定：无；合入阻塞据实交运维兜底。')
text.append('\n本批原帧、复算、机制、提案/更正、CLI、测试、切片及合入回执：'+str(O)+'；报告时间'+now+'。')
out='\n'.join(text)+'\n';(O/'changelog-addition.md').write_text(out);(O/'report.md').write_text(out)
completion=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=2,updated=17,retired=0,active=175,mechanisms=mechanisms,tests=dict(tsc=0,vitest=rc,cases=sum(map(int,cases))),ledger=dict(added=[],proposed=proposed,retired=[],check=0),code_proposals=props,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n')
print('报告',len(out),'字；测试',completion['tests'],'合入',completion['merged'])

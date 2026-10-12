import collections,hashlib,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');DEST=ROOT/'paper/materials/experience-changelog-silent.md'
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));L=json.load(open(O/'ledger-result.json'));H=json.load(open(O/'historical-facts.json'));M=json.load(open(O/'live-merge.json'));Z=json.load(open(O/'slice-summary.json'));T=json.load(open(O/'tests.json'))
E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
title=(O/'changelog-title.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=['\n## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5371的2Y27VAYZDA02及勘误、:5381的TDLBRNA0R05B及三项ID/中文名勘误；runs.character均SILENT、A10，无跳过，last_seen按notes/run-1007-0940-2Y27VAYZDA02.md与run-1007-1044-TDLBRNA0R05B.md文件名取2026-10-07。2Y的SL覆盖按更正为重放6/探索4；TDL天选ID用ANOINTED、EYE_WITH_TEETH名用利齿之眼、MAZALETHS_GIFT名用马萨雷斯的赠礼。',
'- 开工exp-silent干净，git merge --no-edit main无冲突快进至9d753e50；README、最新STATE、决定末尾、学习协议、首次构建与最后两次增量方法已读。独立完成，不派agent、不运行play/boss模拟池、不联网、不推送；抽取和工具单进程nice19，测试固定沙箱入口。日志按12位局号rg，states/deepseek按时间二分seek流读。',
'- 截至TDL结束2026-10-07T02:44:08.070Z，88静默完局；A0—A10局数7/3/2/1/4/1/11/7/1/3/48。旧1292房76实死，新2Y 11房1死、TDL 21房1死，共1324房78死；A10 48局610房48死。MCCK2602T1SR仍只进数字、不作新机制来源；无character旧局、其他角色、进行中及以后完局排除。',
'- 口径沿第69节：首COMBAT到同房最终尝试末結算HP净损，死亡单列、负回复保留；Monster走廊与Unknown问号分开，入血/现场max HP分<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重，TD1同房重启仍一房，SL不当独立局或回血。死亡余血截断不当完整需损，未結算毒不预支；cards/ends仍限completed，pending实际派发与原帧另核。',
'- 新抽2Y 654 decisions/21 brain/4 run-plans/8 sl-attempts、663静默状态；TDL 947/49/9/14、972静默状态，1601决策逐帧匹配；两窗DeepSeek推理均0、brain全部Codex。TDL 49条含2个run-plan，大脑47非run-plan与复盘口径相符，不误当2次回退；兼容ds_*字段不代实际引擎。',
'- 首COMBAT可早于小血瓶回复：F45首53→55→53，统计0/操作2；F46首53→55→43，统计10/操作12；F48首64→66→2，统计62/操作64；F49首2→4→0，统计净损2/操作截断4/完整需损12。保留旧口径，不把差2报bug。F19和F33首帧与操作入血分别均为57、53，净损各16、5，未出现差2；逐房对照留原帧。',
'- 旧86局原脚本全部重新执行，七数组/每档房及局号损值/源节点/回血/SL逐行一致。机制再核全部静默历史复盘与日志；旧石头条目写8支持但正文n=7、首帧76，逐房日志实际8支持80首帧，新增7帧后9支持87，已按日志纠正。源entry历史/本轮初稿83断言失败及更正保留，非生产或测试失败。脚本、原片段、偏移、完整数字均留learner/runs/20261007-113604-experience-update。',
f'- 开工{C["old_active"]} active/{C["old_chars"]}字<55000，不触发强制压缩；新增0、更新16（全补非药水证据、纯数字0）、退役0，active{C["active"]}/{C["chars"]}字。更新的旧逐局叙述压成机制/一两个案例，完整旧文留experience-before.json；没有合并条目。potion:*和general:potion逐对象保持，其他旧含药句逐字保持；触媒旧药句保留TU3XB4CAEDAW A10标记，无新喝药规则。机制[0,20]，路线/休息/构筑观察沿[8,20]；女王原低阶失败观察[4,7]保留，新A10胜线进综合女王条目，无新策略反例。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 旧86局七数组/血档/节点/回血/SL一致；新88局1324房78实死 | 局、房、尝试分别计 |',
'| 步法/敏捷/余像 | TDL末实验体后空翻基础5+3敏+余像1=9，萎靡另1共10；2Y末三牌基础16+1敏×3=19 | 逐牌敏捷与逐次被动挡分核，建立不追补旧挡 |',
'| 护喉甲覆甲 | TDL实验体开场4、末T2仅3；女王末T3现场9→次轮8 | 用现场层数，当前牌挡不足不能补开场固定4/9 |',
'| 力量/虚弱/激怒 | TDL五技能使0→15力，后空翻→18；萎靡加减各3仍18、弱34→25；2Y甲虫滚18/20/22弱后13/15/16 | 敌成长与本次减力同时核，不因净力不变说萎靡无效 |',
'| 阶段/换战 | TDL第五试T2清首段，T3新212/旧力毒激怒清；女王旧5雾不跨新战保留 | 第一段常量不套整战，未到第三阶段不补数据 |',
'| 毒雾兑现 | TDL末女王T3雾3→5，T9聚合体37血由38毒杀，T10本体65由68毒杀 | 持续能力建立/轮初施毒/当轮结算分账 |',
'| 触媒结算 | 2Y F21建1，T4毒7+6扣13、敌18→5，T5毒5杀5血取消26攻击 | 增加结算次数，不倍增层数，末战未建不沿用 |',
'| 呼唤先行自损 | 2Y前三试T12玩家3/5/3血，持两/两/一张需12/12/6，敌毒虽足仍先判死；末T13清呼唤后11毒杀7血 | 未结算毒不计实伤，不能抵销更早持牌损血 |',
'| 带毒刺击 | 2Y末异鱼T13升级直8、另4毒，敌15→7由11毒结束；历史53局1000次实用，22纳证局均核实际施放 | 直伤/施毒/结算分别验收 |',
'| 甲虫睡醒成长 | 2Y末睡3→1→消失、覆甲18消失，力0/2/4，末16攻对1血5挡完整需11、差10 | 虚弱未关闭每轮成长，四试0赢不定另一击杀序必胜 |',
'| SL同盘血价 | TDL第二/末次T3初COMBAT完整相同、66血；挡17→2，全轮伤25→30、损10→25 | 多付15血/多5伤为局部对照，后轮也变，不定整局唯一因果 |',
'| SL首抽序/赢次 | 2Y异鱼四试1赢、初25及到手轮同；三虫四试0赢、初30同；TDL女王四试1赢初35同但到手轮仅前16同、实验体六试0赢初16同但到手轮仅前11同 | 异鱼末试先处理呼唤，女王末试实建5雾兑现毒杀；后抽/生成/动作同变，不归单项或运气胜因 |',
'| 路线/连续boss | 2Y F18投影F22入36、实12、F24首火未到；TDL首boss投影38/第二null、实66/4且无中间火 | 未知不是零成本，未来营火不是当前缓冲，未选替线无因果 |',
'| 实际回血 | 2Y四回血+84；TDL五回血+102；A10 269火183回血/86非回血动作，实回4428、后战173/24死 | 原A8一局9火8回血却7非回血含同层其他动作，沿旧动作口径，不强行令和=房数 |',
'| 构筑兑现 | 2Y已取群蛇却六个二幕尝试未施，首轮7能量后仍死余89；TDL女王能力实兑，后战未建毒雾、末两轮扣73/102余29 | 持有/计划不当场上能力，能力收益不跨新战 |',
'| 整场模拟/时钟 | 女王T3两线5轮均0/24死、整场低信度100%胜；赢损中位16/28、末胜实损64 | 模型胜率不抹局部血价；非同条件误差，逐轮时钟与受控替线未记录 |',
'','七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines+=['','A0—A9各格与第69节完全一致，完整逐阶房/局分母、局号和损值在audit.json；活场净损中位排除实死、保留负回复。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','A10源节点到下一实战（源入血分档，多源可同战，Ancient排除）：','','| 幕 | 源房 | 血档 | 源节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','各进阶分母（SL不当独立局）：','','| 进阶 | 局 | 战房/死 | 火/回血/非回血 | 实回血 | 后战/死/活损中位 | 真重打场/尝试/赢尝试 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,s in zip(json.load(open(O/'rest-summary.json')),json.load(open(O/'sl-summary.json'))):
 f=[x for x in A['fights'] if x['asc']==r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {len(f)}/{sum(x["death"] for x in f)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','- 真重打旧76场334试26赢→80场352试28赢，A10旧43场193试14赢→47场211试16赢；本批四场18试2赢。两局全部explore/sl_explore/decisions.sl_attempt、draws/初序及到手轮比较和逐轮需/扣/损在verified-battles.json及原片段，不把predicted_death读档当实际死亡。',
'- 低血不同节点旧例复核：MGA0CZDDKC0P A10休息22→43后Monster损17活，4D4J8USKCPAV休息1→22后Monster损1活；D4LJ9QMGFB8Q事件13、BVF22RSFVBS9事件21后走廊死。新2Y低血走廊12死；TDL F32休息32→53后boss统计损5活，最后休息43→64后女王统计损62活却连续实验体死。敌人、构筑、间隔/入血不同，仍是观察，无改线/锻造受控因果。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 同窗DeepSeek推理0，实际大脑全Codex；未找到明确引用某经验ID而结果相反的原话，不由最终死亡自动记策略repeat。以下保留原话，原始推理/问答与journal留盘。',
'- 2Y F17原话：“Serpent Form supplies missing sustained damage; cheap cards and Scrawl support repeated triggers while defensive plays advance kills.”F18原话：“可可保障首轮启动；飞靴避精英，四火补强。”群蛇确取得却六个二幕尝试未施、首火未到，不预支计划能力或未来回血；无提前施放的受控胜线，0057只补support。',
'- TDL F24原话：“The early-rest route avoids two costly hallways. Upgrade Footwork for lasting defense, then heal at the next campfire.”后续F27/F29仍升级、到F32才回血；F34原话：“金币补齐毒伤与防御，走商店三火无精英线。”F47原话：“Heal to 64 HP before consecutive bosses. Core powers are upgraded; the guaranteed health buffer outweighs any remaining single upgrade.”回血/能力升级现场兑现，但后bossnull和实际4血要单列，不倒推末火回血错误。',
'- 已学SL局部血价仍被覆盖：TDL 02:35:43.633Z original“计算下注, 防御, 生存者, 打击 -> 火炬头聚合体”改为“毒雾, 飞镖 -> 火炬头聚合体”；当前17→2挡多付15血。0079原repeat完整保留，第二次后轮T9判死而末次T10赢，不称该局部血价就是整局死亡唯一原因。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-footwork-block':'步法/敏捷','silent-strength-weak-observation':'逐击力量/虚弱','silent-noxious-fumes-growth':'持续毒雾','silent-afterimage-per-card-block':'余像逐牌被动挡','silent-malaise-x-debuff':'萎靡与敌激怒同次加减力','silent-gorget-plating':'覆甲现场层数','silent-smooth-stone-opening-dexterity':'石头开场敏捷','silent-slumbering-beetle-wake-growth':'熟睡甲虫醒来/成长','silent-accelerant-triggers':'触媒多次毒结算','silent-beckon-held-end-turn-loss':'呼唤先行自损','silent-test-subject-phase-reset':'实验体阶段重置','silent-queen-poison-main-target':'女王毒窗口/SL血价观察','silent-poisoned-stab-components':'毒刺直伤/施毒','silent-deck-burst-observation':'能力组合兑现观察'}
for eid,name in names.items():
 e=E[eid];x=H[eid];lesson=e['lesson'];reason=lesson.split('典型案例：')[0];example=lesson.split('典型案例：',1)[1]
 if eid in ['silent-strength-weak-observation','silent-noxious-fumes-growth','silent-accelerant-triggers']:
  # Original potion-containing clauses remain in the knowledge file; no new rule is inferred here.
  example=example.split('  ')[0]
 asc=','.join(f'A{k}:{v}' for k,v in x['asc_support'].items())
 lines.append(f'| {name} | {reason} | {len(x["evidence"])}/{len(x["contradicting"])}；{asc} | {example} | {eid} |')
lines+=['','- 每条12位支持/反例局号和进阶见experience.json/historical-facts.json；卡牌纳证局全部核到completed实际施放。历史实用步法55局586次、毒雾47/501、余像23/197、萎靡16/128、触媒36/298、毒刺53/1000；纳证51/42/18/15/30/22不同于全史实用分母。力量84局/构筑83局是综合观察，不把每个子公式当84/83份独立实验。石头87首帧逐房验1敏；败局机制成立不作反例、SL多试不多计支持，未隔离单项整战因果。药水只保留事实，不推使用规则。',
'','### 新增','','- 无；两局的新复盘主题与机制均并入已有条目。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 新证据 |','| --- | --- | --- | --- |']
for x in C['diff']:lines.append(f'| {x["id"]} | {x["n_before"]}→{x["n_after"]} | {x["chars_before"]}→{x["chars_after"]} | {",".join(x["runs"])} |')
lines+=['','- 16条全部补非药水证据、只改数字0；重复旧逐局叙述压短，未合并/退役条目。旧药句逐字保留、药水对象不动；石头计数按实际日志纠正，实验体/女王SL、路线/回血统计随新局重算，原文完整保留。',
'','### 退役','','- 无；没有反例多过支持，本批没有代码修复，真实机制不因执行层已经建模而退役。',
'','### 和手写知识及代码冲突','',
'- 静默另外七份boss-damage/room-costs/monster-records/outcome-stats/fight-value/fight-value-gates/boss-trust均为生成数据，无手写知识要改删。逐文件哈希/元数据留other-knowledge.json；room-costs88局、outcome A10 48局与本次一致。monster-records1325房窗比去重1324多TD1同房重启1，战内净损/战后回复和首帧血量口径分开，不判数据失效。boss-trust是固定模型/实际结果校准，保留其源版本/分割/低置信标记，不当新打法。common仅定向核相关敌人招式与现场增益，未搬其他角色经验。',
'- 当前POISON_POWER已经进combat-plan覆盖声明，萎靡/激怒/余像/敏捷与实验体换阶段模型已存在，未发现需在本任务修改的手写知识冲突；本任务不修改源码、生成器或铁甲行为。',
'','### 代码问题（不给 DS）','',
'- 0216旧代码repeat保留：2Y末F22 T4预测15伤、实16，带毒石虫切割实4旧八折为3，少1；runs.code=1a5e1217+dirty、S1.fix42在局中上线，不把旧进程当修后回归。当前名单已修，本任务不新增bug、不改0216 shipped状态。',
'- TDL末实验体T2预计hp=-8，25−10−3=12而只有4血，判死/实际缺口相符；毒21未斩50血敌。后boss投影null是0163修后保持未知，未报零成本bug回归，不改0163状态。',
'- 离线石头初稿把旧76文本直接加新7得到83，历史逐房断言实际87后更正旧80+新7，原history.log与history-final.log、脚本/原文留盘；不是生产或测试失败。初稿甲虫重打汇总未经核的两场说法在写入前自查后改为本批四试0赢，完整旧文/历史SL留盘。',
'- 未记录：判死读档末轮完整结算、未选路线/休息/构筑和提前建立能力的受控整场结果、抽牌/SL覆盖后完整原最优线执行率、逐轮boss时钟/实估伤害比、Jev缓存。原答最优210/213或220/239不当完整执行率，未到第三阶段不补造。',
'','### 测试','',
f'- 源固定沙箱tsc{T["tsc"]}、vitest{T["vitest"]}、{T["files"]}文件{T["cases"]}例；'+('按高负载失败重跑一次通过，首轮原日志保留。' if T.get('rerun') else '初稿与需损/缺口文字澄清后的定稿两轮均通过，无失败/超时重跑。')+'JSON、角色/12位/n/置信度/进阶/字数预算、旧基线逐行、1601状态匹配、末试逐轮/SL同盘血价、历史实际卡牌与石头首帧、旧药对象/分句、git diff --check及提交前gitleaks通过。源码/预算/依赖/生成器不改。',
'- 只经learner/ledger.py/by=learner:experience-update，proposed '+','.join(L['proposed'])+'；新增/退役无、check0。16更新经验均有来源，新增历史证据只append support，原claim/first_run/asc/prior/证据/repeat/版本历史保持；纯bug和未纳复盘项不动，不写accepted/shipped。主目录本节/账本只追加未提交，由调用方提交。',
f'- live结果：{M.get("reason","实际合入并通过合后固定沙箱")}；刷新提交{M.get("refresh_commit")}、合前{M.get("base",M.get("initial_head"))}、实际合入{M.get("merged")}、合后测试{M.get("test_rc")}。'+('源码/记录冲突：'+','.join(M.get('conflict_paths',[]))+'；知识数据重叠0，按第8节停止，不覆盖、不硬解。' if not M.get('merged') else '其他知识blob逐项保持。')+('上线'+M['eval_version']+'、发布提交'+M['release_commit']+'。' if M.get('eval_version') else '未新增本批eval上线版本。')+'锁流程和原预检留live-flow.log/live-merge.json；handoff-ops.md/完成JSON交调用器experience-done通知运维核实际发布与账本shipped或兜底，完整沙箱外套件交调度器，不停对局、不运行play、不推送。',
'','### 切片大小','',
'- 固定种子20260929，从截至新局静默states、按state.run.character_id=SILENT筛最高A9/A10，各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对。官方knowledge-slice.ts、CHARACTER=silent、setExperienceForTests只切换经验JSON；common与其他静默结果表冻结，manifest/原切片留盘，不读其他角色或冒称V4整份前缀。石头/甲虫文字校正后重跑改后切片，属文字定稿核对，无测试失败。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in Z['rows']:lines.append(f'| {x["sample"].replace("sample-","")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta_median"]} |')
lines+=['',f'- 配对增量中位{Z["median_delta"]}字，最大增量{Z["max_delta"]}；总体中位{Z["before_median"]}→{Z["after_median"]}、最大{Z["before_max"]}→{Z["after_max"]}字。active139→139，49583→49073字，高68中45低26；A8 132条45966字、A9 133条46265字。需要Roy定的知识事项：无。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section)
old=DEST.read_bytes();assert ('## '+title).encode() not in old
(O/'changelog-prefix.json').write_text(json.dumps(dict(bytes=len(old),sha256=hashlib.sha256(old).hexdigest()))+'\n')
with DEST.open('a') as h:h.write(section)
assert DEST.read_bytes()[:len(old)]==old
print('已只追加第70节',len(section),'字符')

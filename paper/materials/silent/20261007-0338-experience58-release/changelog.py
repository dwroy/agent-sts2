import collections
import hashlib
import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=O.parents[2]
C=json.load(open(O/'changes.json'))
A=json.load(open(O/'audit.json'))
S=json.load(open(O/'slice-summary.json'))
M=json.load(open(O/'live-merge.json'))
L=json.load(open(O/'ledger-result.json'))
F=json.load(open(O/'mechanism-facts.json'))
B=json.load(open(O/'baseline-check.json'))
REST=json.load(open(O/'rest-summary.json'))
SL=json.load(open(O/'sl-summary.json'))
commit=(O/'commit.txt').read_text().strip()
title=(O/'changelog-title.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=[title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5207的HUVEPWQAHWFU及勘误；F29理由时间采用17:50:39.376Z，禁忌仪式在T1敌方动作后建立、T2首帧已有9仪式。runs.character=SILENT/A10/F35败，未跳过；唯一run-1007-0200局报，last_seen=2026-10-07。羽化另从C48LLXBGKXQ9 A0早期原始窗口验证，没有借其他角色知识。',
'- 开工exp-silent干净，git merge --no-edit main从532af948快进df56a6d8，无冲突。已读README/最新STATE/decision-log末尾/学习协议、铁甲首次和末两节方法、静默第56/57节；独立执行、无下级agent、抽数nice19单进程、不跑boss模拟池。',
'- 截止HUV结束2026-10-06T18:00:35.645Z，71静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/31局；旧1101房60实死＋新18房1实死＝1119房61实死，A10三十一局405房31实死。MCCK2602T1SR仅进数字；进行中/后续/无character旧局不计。',
'- 新局12位run id rg分流714 decisions/34实际Codex请求/6 run-plans/4 SL行；states时间seek流式抽739帧、字节7996023908—8019925212，同窗DeepSeek0，旧ds_*仅兼容字段。旧70局只读原始片段逐局重新分析，完整静默历史复盘229段复核；不复原或冒称已知开局9e20ade9+dirty完整树。',
'- 口径沿第57节：战内净损=首COMBAT帧HP−同房最终尝试末结算HP，死亡单列、回复负值保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重、TD1重启仍一房；SL读档回复不算回血，未派发结束不补未来毒或伤。',
'- 先复算旧基线再加局：'+','.join(f'{k}{v["before"]}→{v["after"]}' for k,v in B.items())+'；七数组逐行、血档/源节点/回血/真正SL全部一致，无口径差异。',
f'- 开工128 active/51683字低于55000，无强制开工压缩；13更新主题替换重复逐轮案例、完整旧文保存在experience-before.json，没有同事重复可并、不以退役腾位。增1改13（全部补证、只数字0）退0，active129/{C["chars"]}字，高62中39低28，60000测试预算未改。',
'- potion:*与general:potion逐对象不变；其他旧含“药”分句逐字保留，包括旧毒药事实，新增支持只非药水部分，无新增/加强用药规则。机制[0,20]、策略统计维持[8,20]，没有新高阶反例推翻低阶公式。原始脚本/统计/失败与更正/固定240切片保存在learner/runs/20261007-031302-experience-update。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色与基线 | 71静默局；旧70局七数组/血档/节点/回血/SL一致，新18房1死 | 仅静默，房与尝试分账 |',
'| 生成器窗口/同房统计 | monster-records1120窗口/A10为406；本节1119房/A10为405，TD1 F17原始开窗02:06:46.839Z与重启恢复02:16:18.466Z | 重启非战斗帧令生成器同房开两窗，本节按run/floor合一房；不是新增一场或数据失效 |',
'| 力量/弱化/仪式 | HUV雕刻师T2已有9仪式、T3—6力9/18/27/36；尖啸24→18，弱化33→24/42→31，末无弱51 | 临时减力/弱化不停止增长；A0/A3/A4基础12、A10基础按占位为15 |',
'| 步法/预判/被动挡 | T2建2敏；T3两防御10＋7，比基础8＋5多4；T6临时再2、防御9、水盆4 | 卡牌与固定被动分核，末51−13=38、18血缺20 |',
'| 毒雾实际启动 | 沙虫两次T1建2，重打T10的39毒收38血；雕刻师T6才建2、仅旧3毒结算 | 后续轮初补毒须实际到达，胜负不由持牌预支 |',
'| 余像/手甲 | 两次沙虫T1均建余像1，重打T2四牌4挡；手甲后4能量、步法/毒雾2费，T2羽化2＋步法2付满4 | 实际出牌/能量与启动窗口共同核，不定单能力胜因 |',
'| 羽化生成 | C48 A0 F24手9→8/抽18→21；HUV A10 F35手5→4/抽17→20/能量4→2，后免费翻越7/猎杀15 | 加堆不即时抽，按后续兑现事实记机制，不把虚构抽牌写给DS |',
'| 护栏取舍 | 骇鳗T3护栏损14/扣6实兑现；原题损24/扣16/后续9毒，整战69→24损45 | 省10当轮血同时少输出，原线整战代价未知，只观察 |',
'| SL天然对照 | 沙虫两次52/70入，首T10判死55敌血/29毒未结算，末T9建43挡/T10毒39杀38，余8胜 | 原始初序31项同、首9后插入逃离；已知24张辅助/到手回合/动作同变，非单变量同盘胜因 |',
'| 路线/营火 | 六火各实回21共126；F8投影F12为45/p75为29、实到24；F12投影boss54/p75为36、实入34；F29投影F32=31/F33=52均兑现 | 投影存在高估也有准确，未来火不当已回复，未选路线/休息未实打 |',
'| 三幕/构筑 | F34三火避精英线57/70死于首走廊；终32张5升级/三个毒药，雕刻师T2扣0、六轮扣120余52 | 取得/建立/足额输出分开，不称此失败可由单改构筑挽救 |',
'| 模拟/时钟 | F16异鱼赢样本估损26/T12，实损29/T10；F32沙虫原始0.0049/校准0.0702，赢样本估50/T11，首试判死/SL末损44/T10 | 无silent逐轮时钟校准，SL胜利不能冒充首战胜率校准 |',
'| 最优线与药水事实 | 原选108/116有效战题=93.10%，死亡战7/9；独立取得12瓶/显式使用13次（含SL重复） | 替换后完整执行率未知，仅药水事实，不补药水条目证据 |',
'| 字数/置信 | 129 active、高62中39低28，spiked四局规则无反例升high、羽化两局med | 无重复新增、预算不变 |',
'',
'死亡率分母为战斗房，局数另列；活场净损中位排除实际死亡、保留负回复。A0—A9各格与第57节一致，全部局号/损值见audit.json；A10全部非空格如下：','',
'| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['asc']==10 and r['n']:
        lines.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','REST/SHOP/EVENT按源入血关联下一更高层第一战，多源可指同战，不将关联死亡率当节点因果效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['asc']==10 and r['n']:
        lines.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 真正重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,s in zip(REST,SL):
    fights=[x for x in A['fights'] if x['asc']==r['asc']]
    lines.append(f'| A{r["asc"]} | {r["runs"]} | {len(fights)}/{sum(x["death"] for x in fights)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines += ['','- 历史真正重打65场293次20赢，A10为32场152次8赢；新沙虫增加1场2试1赢，异鱼/盛碗虫首试赢不是多次重打。低血不同节点复核旧案例：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV A10 REST1→22后损1活；D4LJ9QMGFB8Q EVENT13/BVF22RSFVBS9 EVENT21后走廊死。新HUV二幕SHOP17/70之后F21损0活，六回血后仍三幕第一战死；敌/构筑/回复与药水事实混杂，只观察、不定节点安全线或优节点因果。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 实际34次大脑请求全部Codex、DeepSeek0，没有直接引用经验id却反向执行的原话，不把本版倒算已结束局生效。F29原话“Projected boss entry reaches 52 HP; every upgrade leaves inadequate survival buffer.”（中文：投影boss入52、升级缓冲不足）；实回30→51，F32入31/F33入52兑现，但首试仍判死、SL后才过。F34原话“额外能量补攻防，三火避精英保血。”；实际4能量与能力加费兑现，第一走廊就死，未抵达第一火。',
'- F35 T2 Jev信心0.89选择“羽化→致命毒药”，题面cards_drawn=3、损11/扣5，实际羽化手少1/堆加3，重问后建立步法，整轮损5/扣0，原施毒未执行。真实生成进入羽化条目，抽牌误报留0202代码问题；不把五轮2/8模拟胜率或最终败局全部归因于它。F9 T3 Jev0.92的双毒药原线被护栏替换，题面节血与少输出并存，原线完整实打未记录。既有复盘观察仅support、未确认老错repeat。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
table={
'silent-footwork-block':('步法逐牌敏捷','常驻敏捷逐挡牌重复加、不补旧挡，最后仍须覆盖总来袭','HUVEPWQAHWFU A10雕刻师T3两防御多4挡，T6常驻2＋临时2的9牌挡仍不足'),
'silent-strength-weak-observation':('力量/虚弱/敏捷','力量逐段、虚弱逐击取整、敏捷逐牌，被动独立；临时减力不关成长','HUVEPWQAHWFU A10雕刻师力9/18/27/36与51末击；LS8035TB32P3四击0/3力20/32'),
'silent-noxious-fumes-growth':('毒雾轮初成长','建立不即时施毒，轮初补a/实际毒结算减1；存活到未来轮才有收益','HUVEPWQAHWFU A10沙虫T10的39毒杀38，雕刻师末才建只结算旧3毒'),
'silent-afterimage-per-card-block':('余像按实打','能力之后每次实际出牌补1，重放另触发，牌挡/被动挡分别预算','HUVEPWQAHWFU A10沙虫末试T2四牌4挡，LRN0HPZ0FZS1重放余像一步多2'),
'silent-piercing-wail-temporary-strength':('尖啸临时减力','普通/升级减6/8逐击改威胁，临时部分撤回、仪式继续加力','HUVEPWQAHWFU A10雕刻师T3的24→18只损1，后36力51仍死'),
'silent-ripple-basin-no-attack-block':('水盆固定条件挡','未打攻击时末补4，敏捷与脆弱不更改固定被动，独立于牌挡','HUVEPWQAHWFU A10雕刻师T2/6牌挡6/9另加4至10/13，末需38差20血'),
'silent-spiked-gauntlets-power-cost':('手甲能量/加费','轮初4能量与能力费+1一起核，建立成本和未来收益同时受窗口限制','HUVEPWQAHWFU A10雕刻师T2羽化2＋步法2付满4、零输出'),
'silent-anticipate-temporary-dexterity':('预判临时敏捷','普通/升级本轮2/4，不补旧挡且随后撤临时部分，实际后续牌才兑现','HUVEPWQAHWFU A10雕刻师T6两常驻加两临时，防御5→9仍挡不住51'),
'silent-devoted-sculptor-ritual-growth':('仪式与成长窗口','仪式每轮加9力，基础按进阶取数后加力/核弱，暂时减力不缩后续成长','HUVEPWQAHWFU A10 F35六轮扣120仍52/172，末38完整损超过18血'),
'silent-insatiable-dual-clock':('沙坑/攻击双结束线观察','延金沙坑与实际挡攻击独立，毒需到结算；SL胜线组件同变无单因','HUVEPWQAHWFU A10首T10未结束29毒不补，末T9的43挡与T10毒39共同过关'),
'silent-deck-burst-observation':('构筑/保血兑现观察','取得/建立/触发/足额输出分开；护栏可节当轮血同时减少输出，整战代价未知','HUVEPWQAHWFU A10骇鳗护栏省10血少10题面伤/后续9毒，整场损45'),
'silent-metamorphosis-generated-free-attacks':('羽化生成攻击','2能量消耗、向堆加3免费攻击，无即时抽牌；后续抽出/实打才兑现','C48LLXBGKXQ9 A0 F24手9→8/堆18→21；HUVEPWQAHWFU A10 F35后免费攻击实扣7/15'),
}
for id,(name,reason,case) in table.items():
    f=F[id];asc='、'.join(f'A{k}:{v}局' for k,v in sorted(f['asc'].items(),key=lambda x:int(x[0])))
    lines.append(f'| {name} | {reason} | {len(f["support"])}/{len(f["contradict"])}；{asc} | {case} | {id} |')
lines += ['','- 完整12位支持/反例名单在experience.json及mechanism-facts.json；六牌所有支持局都有实际施放窗口，雕刻师成长/临时减力/多挡牌/毒雾/余像/手甲与羽化手堆/消耗逐帧断言通过。综合支持局数不代表每个子公式均在每局独立验证；机制成立的败局不是机制反例，未隔离单项胜因写观察，不写喝药规则。',
'','### 新增','',
'- silent-metamorphosis-generated-free-attacks：card:METAMORPHOSIS/羽化/[0,20]/med，C48LLXBGKXQ9 A0与HUVEPWQAHWFU A10两支持零反例；只限普通牌已观察生成/消耗/未来免费攻击，升级数量/费用及跨战费用未验证。并入复盘已有silent-0203、首证C48/A0/prior=no保持，不重复add，0202纯bug不进DS。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for id,r in C['changes'].items():lines.append(f'| {id} | {r["old_n"]}→{r["new_n"]} | {r["before_chars"]}→{r["after_chars"]} | 补HUV非药水支持、替换重复案例 |')
lines += ['','- 全部13条加证据、只改数字0；词内n同步，spiked四支持无反例原规则转high；没有合并/单独压缩条数，缩短后的完整旧案例仍归档。HUV骇鳗护栏观察进入general:deck，不按复盘账本旧where给未遭遇的boss:AEONGLASS条目加证据。',
'','### 退役','','- 无。没有支持少于反例或需退役的代码缺口知识；真实机制不因代码模型已实现而退役。',
'','### 和手写知识及代码冲突','',
'- 静默另外六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写攻略需改/删，不新建；逐文件hash/来源/字段在other-knowledge.json。room-costs是MAP→下一MAP，净损口径和生成截止点另列；fight-value/gates旧两局样本仍只题面事实，不能由本局单例判无效；outcome-stats明确观察。其他角色知识不读不改。common雕刻师A10 HP172/基础15/仪式9和现场一致，仅共有事实不扩静默支持局数。',
'- 六份生成数据复核另见other-knowledge-validation.json：outcome-stats A10的31局与runs一致；monster-records1120窗口/A10406比本节各多1，重新从TD1原帧复算8窗口/7房（F17重启恢复二次开窗），原因记录在generated-room-count-difference.json，不把窗口数冒充独立房间或覆盖自动刷新数据。',
'- 合前本分支的羽化Cards即时抽牌读法与真实生成冲突；合后live已含独立S1.fix40/0b6e5c94，card-model.ts:893按已观察的普通羽化排除即时抽牌，同时修重放累计计数。silent-0202/0199由运维独立登记shipped，本批只读核对、不重置；0203真实生成机制独立，既有重放原始字段窗口也不因内部累计计数修正抹去，不新增纯bug知识。原始run.max_energy=3是基础字段，实际雕刻师各操作轮首combat.player.energy=4，按现场能量验证手甲，不用基础字段否定遗物；没有据此新增代码bug。',
'','### 代码问题（不给 DS）','',
'- 复盘时独立silent-0202：羽化Cards=3被card-model的cardsDrawn及rollout即时消费；首证C48 A0/prior=no，HUV仅新识别，真实生成另0203。live的独立S1.fix40/0b6e5c94已修、运维已登记0202及0199 shipped；本任务不改源码/队列或重置其状态，不声称修正即可转胜。T5题面扣22/实际扣27差5的分项未核定，不另报确定bug。末least-loss的−20是hpAfter=18−38，不是损20，死亡归零仅扣18不改完整需38。',
'- 临时更新初稿的旧含药分句断言阻止写库，恢复旧分句后通过；机制检查把跨房sl_reloads误当本房attempt、把基础max_energy误作实际轮初能量的初稿断言失败，改按sl_attempt与combat.player.energy后通过。原日志保留，非生产代码/测试失败；首轮自测后明确低阶基础12与A10占位的标签，冻结定稿并重跑，没有改测试/预算。',
'- 首次live锁内预检仅decision-log双方追加历史冲突，停止原日志/元数据留initial-*；七份知识刷新已提交60ecfda8、不同知识blob重叠0。随后用追加并集保留双方所有有序原文，逐行子序列断言和gitleaks通过再合入；无知识或源码冲突，没有覆盖刷新数据。这次预检中止不是生产测试失败。',
'- 未记录：护栏原线/替构筑/路线/休息的受控完整血价与胜负、T5少报5分项、重问后完整原线执行率、三幕boss实到/时钟逐轮需估/可活轮/实际估值比、Jev缓存命中；不补造。',
'','### 测试','',
f'- 源首轮与定稿重跑均tsc0/vitest0、{M["source_tests"]["files"]}文件/{M["source_tests"]["cases"]}用例，首轮后仅补明雕刻师按进阶基础数值标签，原日志保留，非失败/超时重跑；合后tsc0/vitest0、{M["live_tests"]["files"]}文件/{M["live_tests"]["cases"]}用例、'+('首轮失败后重跑通过' if M.get('test_first_rc') else '首轮通过')+'。固定数据/nice19/固定沙箱排除名单保持，完整沙箱外套件交调度器。',
f'- JSON合法、角色/12位局号/n/范围/预算/旧药分句/旧基线/逐帧机制断言及git diff --check/gitleaks0。源{commit}仅静默experience.json，英文提交写版本与增1改13退0、Co-Authored-By。',
'- 仅learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖14经验条目；账本新增/退役无、check0。首证/prior/claim/旧version/repeat保持，0203机制与0202纯bug分账；不写accepted/shipped，运维据实际合入登记。主目录本节/账本只追加不提交。',
'','### 切片大小','',
'- 种子20260929，截至HUV最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对，过滤state.run.character_id=SILENT；官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只变experience，其余知识/结果表固定。sample-manifest/逐片原输出留存，不冒充V4完整前缀。首轮after因后补数值标签已保留initial副本，报告用最终定稿切片。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"][7:]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["median_delta"]} |')
lines += ['',f'- 240配对增量中位{S["median_delta"]}，单片最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active128→129、51683→{C["chars"]}字，高62中39低28；'+ '、'.join(f'A{a} {v["entries"]}条{v["chars"]}字' for a,v in C['applicable'].items())+'。需要Roy定：无。',
'',f'本节收尾：源{commit}，实际live合入{M["merged"]}，上线登记{M["release_commit"]}/eval {M["eval_version"]}；刷新提交{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0、其他已提交知识逐blob保持。无源码/生成器/手写知识或新用药规则、不重建；主目录本节/账本不提交。运维交接learner/runs/20261007-031302-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后将15项proposed登记shipped，完整外部交调度器；不停对局、不运行play、不推送。']
section='\n'.join(lines)+'\n'
(O/'changelog-section.md').write_text(section)
path=ROOT/'paper/materials/experience-changelog-silent.md'
before=path.read_bytes();assert title.encode() not in before
(O/'changelog-before-hash.txt').write_text(hashlib.sha256(before).hexdigest()+'\n')
with path.open('a') as h:h.write('\n'+section)
assert path.read_bytes()==before+b'\n'+section.encode()
print('仅追加第58节',len(section),'字符，前文原字节保持')

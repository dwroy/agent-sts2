# 静默猎手策略复核：十项保留 waiting

本批：20261021-111302-s2-strategy-proposal；记录时间见 record-date.txt 的 date 原回执。

六局均已核为已结束的 SILENT A10。本次复核了局部机制和三组换线代价，没有足够新增证据支持修改出牌、药水、SL或终局规则。十项原 id 全部 waiting。部分审计字段已有实际 live 祖先实现，不用子项存在关闭完整请求。本次无生产源码/知识修改、无提交/合入/版本；没有运行测试或撤源码红灯/恢复绿灯。

## 身份与基线

首次 git status 干净；原 HEAD 与 ordinary_baseline 为 af8cf2adaba3e1320752a977b88d93f7e29bd21f。按普通任务要求 git merge --no-edit main 成功快进到 fc18ef37d6f1b4887e5007a81a0ca0d278e795fd，仅带已有论文数据与学习记录；该完整提交是 report.base。

只读根 learn.json 的本批行并保存 dispatch.json：task=strategy-proposal、character=silent、reason=proposal、worktree核同，十个proposal_ids精确匹配。无research_request、implementation_request、proposal_repair。普通专题检查读根 notes/strategy-research-silent.json，绑定的是20261010-150327-strategy-proposal，与本批不同；不读取另一个专题替代身份，不扩队列。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环、保留规则。STATE早期停局记录由其后续追加及decision-log恢复/发布记录限定，不借旧记录停止当前对局。用户指定high；未改模型/账号/config，未取得本会话原生turn_context回执，故不额外宣称运行档位已独立认证。

十份原提案Markdown全部与原登记SHA256一致：四份原路径仍在，六份按Git历史保全的精确路径git show HEAD读取原字节到scratch；路径/blob/SHA在preserved-proposal-index.json。随后按指定materialize CLI尝试六条精确路径，均rc=1、state=retained、reason=persistent runtime retained；回执保留，不称materialize成功、不恢复其他owner工作树。已读Git原件与原登记SHA一致，不把原路径回收当证据不存在。

三十个关联原账本首行/最近行保存linked-ledger.json。没有新增知识/提案，不重建重复id、不直接写账本/提案队列、不改变旧状态；本批proposal_results交原调度器追加登记，不代运维标shipped。

## 原始证据与冻结

runs-verified.json保存六个runs原行、offset/bytes/SHA及源字节切点；character原文SILENT经大小写标准化为silent，ended均非空。初始区分大小写比较曾断言失败，随后改为标准化核验并全部通过；这是校验脚本大小写问题，不是日志身份冲突。

按指定evidence_summary入口生成摘要，SHA256=573ded3c2f2492d326921d0d9e16edc048ad7f7a79019fac39e955df36fe9df0。摘要只作事实索引。另运行指定V6/Jev/decisions/run-config提证，及states/sl-attempts/run-plans/runs提证，均nice19。三次冻结切点分别保留，不混称同一截点、不覆盖零行初稿。日志只读。

|流|冻结字节|本批行数|无效JSON/切点不完整|冻结前缀SHA256|
|---|---:|---:|---|---|
|v6-evidence/v6-build|64678849|0|0/0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|v6-evidence/jev-prompts|2357755737|811|1/0|24e9ee47a27f1ace3df5fdbedad1fabd97e3ab500c5bb9c37963e9761b2f36e5|
|v6-evidence/decisions|3256112701|3941|2/0|d0c9a4f13f2d2f1de741e7504182285d10f63a0ac013e71ed59c97c59427be5d|
|v6-evidence/run-config|2385267|6|0/0|1b59a374abb8fcb4516b254a8d4fcac299e4e297fe3484c591c4142159b36a8e|
|evidence/states|15133572983|4062|2/0|87281aa374f81100e93d2783221870158f461f0d3a55e75c730edf07d6f84a80|
|evidence/sl-attempts|51950574|38|0/0|913fd222a908f4f39a1b44ecdeaf9a7c8cff17c2c402bbeaf3a6dff4d552cd08|
|evidence/run-plans|10324678|33|0/0|56ab4014e5996e80a39e9cf66f0c01dfa9bd67a136717bef24c65eea01c43fb4|
|evidence/runs|401488|6|0/0|fb523a80dc5a9900433948585ed76cf5ed324ecec408c98126ef5043d8d71ad4|

六局V6-build均为no_match：流存在、冻结前缀无匹配，不是源文件缺失，不是entries=0。六条历史run-config没有V6字段，记“历史字段缺失，配置不能证明on/off”，不倒填off。无本批V6-build行，entries/jev_answer/fallback/unknown均无匹配可审，不与Jev的request/answers/error混算。

Jev按派发局顺序84/92/58/139/269/169，共811行，逐题机械索引。本次完整读10题request.state/questions、answers/显式error及对应decisions，并回连后继状态；不是最后五条覆盖。第11题D272214已读完整questions与后继状态，未完整读request.state，保留部分覆盖；剩余800题只作身份/结果字段索引，未完整读题面，原因是未纳入原提案的重点逐题核验，不据此下候选全量/收益结论。question-inventory.json逐题存覆盖/原因，question-selection.json列完整10题清单。

归属只用显式run_id、state.run_id/fingerprint.run一致性或decisions原行精确decision_id；不用正文、时间邻近、question_id相似串猜身份。后继状态只在已明确同局内取序列，起点要求observed_ts与fingerprint精确相同。

全前缀保留decisions两行、Jev一行、states两行无效JSON及其gap refs；切点不完整行均0。decisions的全前缀未解身份1934 unknown_identity、1467 unmatched_decision_id，没有强塞本批。Jev本批811行未见显式error值；不据此宣称811次动作成功。未知不是零，缺失不补经验或跨角色证据。

audit_evidence.py机械读取23个窄窗口，并向原文件seek校验23个decisions、130个去重states、11个Jev原行SHA/JSON一致。question-state-windows.json保留窗口，verified-source-refs.json保留逐行offset/bytes/SHA、冻结切点及identity关联出处。模型实读下文引用窗口，其他仅机械保存，不声称通读六局4062状态、全部SL/路线。完整原行保存在evidence.jsonl，没有把整份states灌入上下文。

## 逐题答案、动作、后果

D/J/S为原日志行号。十题request.questions与decisions.questions、answers均核同；Jev均ask、有answers、无显式error，decisions fallback=false。十题gate_reject/selection_dispatch字段均缺失，不能填成“闸门已通过/全计划完成”。除D268893为pending(unstable)，其余首动作result均completed。

|D/J|局/层/回合|答案→实际首动作与状态后果|限制|
|---|---|---|---|
|267377/26719|CA5KE8GFJ9X2 F13T4|plan3→play_card0翻越撑击；S273259—263敌36→28→22、力4→8、下一喷水19|原计划伤8，后续另打打击、全轮伤14，不能全记原计划|
|268390/26869|5PM6JAQG6FNQ F38T4|plan2→play_card0→3电击；S274313—318切割/步法/防御/群伤，31→27|爪牙退场后敌index重排，不能继承旧实体|
|268427/26875|5PM6JAQG6FNQ F39T4|plan1→步法；S274351—358敏−4→−2→0、失落死亡后力−4归零|生成/抽牌改变续步，没有遗忘死亡返敏同等验证|
|268889/26929|DUZUBAJ3A8GP F27T4|plan4→迷雾+；S274830—834污染0→3→3→6，49→46|勒紧能力不加污染；题面伤2/实毒扣8，保留差异|
|268893/26930|DUZUBAJ3A8GP F27T5|plan2→生存者，result pending；后继选择/防御/迷雾，S274834—839实损9、毒扣13|题面伤7/余毒6，实际13毒结后余12；按状态核，不把pending当失败或成功|
|270282/27194|8JRE1C4H4Z2W F33T2第3试|Jev plan1→SL改plan2、首动作仍逃离；S276274—278损15/扣17|原0/24死、替5/24死，不叫同死率；低可信B2零胜不是实盘必死|
|271348/27484|YF0LXT1QSTGG F48T1第3试|Jev plan5→SL改plan4、首动作仍步法+；S277366—373损9/扣38|两线24/24死封顶27；原答不等最终选择，首动作同不证明续步同|
|271499/27509|YF0LXT1QSTGG F48T4第6试|plan1触媒+→实建2层；S277517—519敌197不变、零毒、下轮44攻|候选毒药6伤未执行，不能预支未来毒|
|271502/27510|YF0LXT1QSTGG F48T5第6试|pick card1防御→select_deck_card1；S277520—528后续23挡、后得敏捷不追补、18→0|弃牌子问题不等整轮政策，不补“另一弃牌会赢”|
|272040/27624|XP2SL33HT0D9 F33T3第2试|Jev plan2→SL改plan9，实际先打击；S278076—079损14/扣27|药瓶实毒分布异于题面，不把随机落点模型当事实|

下表补逐题原始引用；完整decision_id/request_id、fingerprint和identity均见question-D.json。Jev cut=2357755737、decisions cut=3256112701。

|D|Jev offset/bytes/SHA256|decision offset/bytes/SHA256|
|---|---|---|
|267377|385432356/8856/5de14255fbb805067c6d702e8c1d31f61bbcc5043a1a59988135e1f2197f4f84|672915234/5614/83919781b4c7a5147d74df95bc7a34ae0d3a598e2a560dc7a264e55ee9e2cd7d|
|268390|387403992/15822/ec96a723a18f9cedbcf8fd5a3976fee2e8fc309cac2abef93e20becf2cf36297|676307151/11082/5851e8e426c9353d4bdb9e5c99d5c274931d34ace703fa936200bb97e08157fb|
|268427|387513383/11608/ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb|676439445/5951/86a11b7115fcb55b33028452581869c7f1ec496a9f6467015197c7f54beddf51|
|268889|388236373/12019/49754a07d5ed0dfa3f4194aa961a4ba670e820a3381a23df25b90f471ba949a1|677793888/8044/00e4f56824672d9957e33cd72746d525d13bfa43cbada64c8a631bd2567b2b7f|
|268893|388248392/9934/3fec66ad2462edc468b0883c7021b3b165e2fd93bc2115c3d4d8e8609d27cbd6|677806084/5866/9f7af98e72cccdf4a0d97240df91dc22ef3cf2c22a09596b2b6923e59fd48532|
|270282|391510246/18141/94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09|682749244/12686/721f1ef7b80a307741e97b8cf9ab47d6ef03330053a3d1e9051127cc2108f5df|
|271348|394988203/25893/1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52|686624749/20711/d8a8d897eee8763b37e68e586461b5ed0abbbc946943a812c7b5ed92fdfd9b7e|
|271499|395424227/18199/daea5abb3675e4a24ba7e2467bcf1fe8e84e9fe56203da9df6de645c441258c9|687078651/7062/829804e36fc169c51b63b0da51e2812fe1b1960f9fa1792ad958de022384b304|
|271502|395442426/7714/3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95|687088578/2342/78d0745e47e7b57899fc3d580fa4c24f95aaf53ae47d5855d82bc309656bdc04|
|272040|396759387/29521/48d155c7dac4742223afb0a55203278f78ed555cc726725b82391ff511f94055|688946628/24634/32332518c91cd9c3333dbf733fa65bda521eb7187edbad1a6ae95ae99908521b|

## 支持、反例、限制

沙虫首/三试T2，D270216/270282、S276208—212/276274—278：同47血敌326、指纹相同；实际损3/15、扣10/17，换线多12血/多7伤。原尖啸9×2→3×2，替线没有尖啸。原/替五轮死亡0/24与5/24，不能因预计未来血损都封顶而抹平。二试T5护栏后的实打损4/扣25不等原候选预报省血必然兑现；本批不拟血价系数。

实验体二/三试T1，D271309/271348、S277327—337/277366—373：同27血敌111、指纹相同，实际损0/9、扣45/38，换线多9血/少7伤。题面原答伤54而实际45，不能以候选代实际。替线后未派发斗篷/第二防御等续步。第六试S277513—519可核敌212阶段清旧毒、两尖啸使33→0、触媒2层零毒；S277520—528五敏先给13+10=23挡，第三小刀才加六敏，挡仍23；四刀各9加刀舞消耗1，敌197→160，18血对44−23差3。不能规定能力先手或修改终局权重。

双蟹首/二试T3，D271992/272040、S278028—031/278076—079：同45血敌194/193、指纹相同，实际损9/14、扣24/27，多5血/多3伤。第二题B2仅199/1200样本、时间截断，零胜并列不证明安全。药瓶实际毒9/12分布与题面不同。首/末T1损2/10、扣25/34及手里剑1力说明付血和成长同时存在。末T2已有14挡加斗篷6=20、零损；末T4激光57→38→28，四敏脆弱下偏折6挡、实损22，不推“一律少挡错”或“一律保血能赢”。

蚌T4在2血时选择后又打打击，下一T5力8喷水19；完整技能顺序和覆甲条件不由这一窗口唯一识别。组装师T3→4同一电击窗口力2→4、攻17→19，T4才退场；召唤新实体代际不能由仅index/名称继承。失落死亡返力已现场核实，遗忘死亡返敏没有本批同等完整链，不扩杀序规则。

原提案YF F33第二次SL实胜、沙虫末试保血延至T11仍败、实验体毒雾/余像已建仍败等反例保留。本批没有重新完整分析全部整战/历史首证，不增加独立验证分母。六局是六个来源，同局SL仍相关，不把尝试数当独立局。原101局及机制支持数仅原提案范围，不冒称本批全历史复验。

原题面夹带的其他角色历史药水统计只保存为原日志内容，不用于本角色结论；未读取其他角色知识库。没有跨角色借证或扩大进阶/参数适用范围。

## 现有实际live子实现

以下六提交均核为读取时实际live 5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532 祖先，本树叶子与live blob相同。完整证据在existing-source-provenance.json。这仅证明已有子能力来源，不是十项完整implemented/duplicate，更不是本批发布/自然采用/收益。

|源码|实际live祖先源码提交|边界|
|---|---|---|
|agent/src/reflex/silent-sl-resource-comparison.ts|0e4fe4df89a06682468e0e4716c12126e76369d5|候选资源差/污染/余毒/沙坑，execution=unverified|
|agent/src/reflex/silent-selection-audit.ts|9d8278702dbc581b5015ba7ec9a70dc0fb94cccb|原答/护栏/SL候选分段，actual_turn=null|
|agent/src/reflex/silent-selection-dispatch.ts|fdaf787a372880b0438e73bcac7e6d2168b038ed|单动作回执，state_effect_verified=false，whole_plan_executed=null|
|agent/src/reflex/silent-phase-current.ts|aad2700abed6dff1d66e87fb36aaa6fedb39adf3|当前阶段/持有/已建快照，已结算毒仍null|
|agent/src/reflex/silent-crusher-facing.ts|68711002f15b298b8863d2258ee5da236da151d2|受条件限制的朝向/虚弱基数，不代本批全题/历史分母认证|
|agent/src/reflex/silent-phase-reference.ts|1d57f9d0dbbb63603e9ce9768e74cb2021478464|阶段结束当轮低损参考，不代后续阶段胜率|

## 逐项处置

|原id|证据、层/回合、原账本|状态/具体缺证|
|---|---|---|
|silent-proposal-c20b5139dd0dff71|DUZUBAJ3A8GP F27T4—5；silent-0168|waiting：污染与挡收益已核；原题T5预报7伤而实际毒扣13，缺历史dirty知识输入与当前消费者联合重放，不能据此改技能排序。|
|silent-proposal-ae9e692d680e3819|5PM6JAQG6FNQ F39T4—6；silent-0183,silent-0005|waiting：失落死亡后返4力已核；缺遗忘死亡返敏、逐实体累计来源及另一目标顺序完整后继，不能制定固定杀序。|
|silent-proposal-52f1e1bd2e7db0ed|CA5KE8GFJ9X2 F13T4—5；silent-0231|waiting：已核加压4→8力及喷水19；缺历史dirty A10移动表、覆甲条件隔离和当前模型逐步联合重放。|
|silent-proposal-6dd8bbff876be528|5PM6JAQG6FNQ F38T3—4；silent-0233,silent-0209|waiting：已核同一窗口电击力2→4、攻击17→19；缺跨召唤代际身份、初始化和当前消费者受控重放。|
|silent-proposal-578e415a259e6835|8JRE1C4H4Z2W F33T2/T5；silent-0005,silent-0006,silent-0018,silent-0079,silent-0019,silent-0020,silent-0021,silent-0125,silent-0023,silent-0027,silent-0046,silent-0016|waiting：沙虫换线实付多12血、多7伤已核；已有候选/单动作审计，缺抽弃牌后至终止的完整执行归属与独立验证。|
|silent-proposal-c0767768bf6a7ab1|YF0LXT1QSTGG F48T1；silent-0079|waiting：实验体换线多损9血、少扣敌7血已核；缺未派发续步的消费者验证与受控后继，不能拟探索血价系数。|
|silent-proposal-a46bdb7fe711d79a|YF0LXT1QSTGG F48T4—5；silent-0021,silent-0027,silent-0028,silent-0085|waiting：零毒触媒无即时伤害及后得敏捷不追补已核；已有当前阶段事实，缺候选全链联合校准和独立验证。|
|silent-proposal-1044224808015e5c|XP2SL33HT0D9 F33T1/T3；silent-0079|waiting：双蟹换线多5血、多3伤已核；药瓶实际落点异于题面，缺随机后继控制、整战验证与独立留出。|
|silent-proposal-7cbc6005db712ba9|XP2SL33HT0D9 F33T2/T4—5；silent-0021,silent-0005,silent-0007,silent-0063,silent-0065,silent-0241,silent-0242|waiting：已核57→38→28、轮初14挡与临时减力恢复；历史首证/独立分母未本批复验，逐来源消费者认证仍缺。|
|silent-proposal-c59f592f1427a67e|YF0LXT1QSTGG,XP2SL33HT0D9 F48T1/T4—5；F33T1—5；silent-0005,silent-0006,silent-0019,silent-0020,silent-0021,silent-0028,silent-0027,silent-0079,silent-0046,silent-0085,silent-0060,silent-0063,silent-0065,silent-0062,silent-0039,silent-0013,silent-0011,silent-0023,silent-0018,silent-0087,silent-0241,silent-0242|waiting：已核两局局部机制及SL血价；本批六锚点不覆盖原101局资源分母、路线休息药水全链及受控后继。|

## 后续验证与回退

对待补的事实审计，应冻结精确当前源码、输入与本角色知识版本，逐步回放候选/抽弃牌/闸门/单动作回执，按实体、阶段区分完整执行与前缀执行。污染/蚌/电击还需原实际dirty表，或明确仅验证当前模型；当前数据库不能倒装成历史输入。测试只用固定数据，不启动模型/游戏。

若要改探索/权重，先列窄规则、完整反事实和按run分组的后移独立验证，保留付血换成长与成功SL反例。没有这些数据保持原规则。没有拟合新阈值或改变铁甲行为。

以后有源码时再执行撤源码红/恢复绿、沙箱tsc/vitest、gitleaks与原live锁流程、知识冲突检查/合后测试、ops核号/双通知。本批无新源码，所有测试未运行/null，不借祖先实现或旧测试冒称成功。无源码提交可回退；后续实现的回退按原提案撤具体提交，保留证据与历史。

本次fixes=[]、merged=null、tests三项null，HEAD保持report.base、工作树干净。未运行play、未停局、未推送、未联网、未改main/live/知识/原队列/运维prompt。没有实际上线，不制造eval版本或规则双通知，不标shipped。不关闭原学习父要求。proposal.md交运维作十项处置入口，所有scratch、原始提证与失败回执保留。

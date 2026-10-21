# 静默猎手策略提案复核报告

本批十项全部waiting；六局局部事实可核，但没有足够新增证据支持调整策略，也没有完整原请求可以登记implemented/duplicate。
无生产源码或正式知识修改，无提交、live合入、eval版本或shipped；tsc/vitest/cases均null，撤源码失败/恢复通过未执行。
记录时间：2026-10-21T11:55:13+08:00（先执行date取得）。

## 身份、基线与原件

本批20261021-114302-strategy-proposal，只读根learn.json对应行：task=strategy-proposal、character=silent、reason=proposal、十个proposal_ids与本树精确相符。
没有research_request、implementation_request或proposal_repair；普通专题检查读取根notes/strategy-research-silent.json，其绑定20261010-150327-strategy-proposal，与本批不匹配，故不承接专题、不读另一个专题替代。
初始status干净、HEAD=49d95791812fc35ea1206c510869e9842b740ae2；普通流程git merge --no-edit main快进到e015024a93abccffcb464700ec37ebbf265ff223，只带已有记录，未冲突。
report.base为该合并后完整40位提交，最终HEAD和生产树保持该基线。
已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案与保留规则。后续追加已恢复对局，不以STATE早期停点擅自改STOP/live。
没有派子agent、联网、play、推送、修改配置/模型档位或接触凭据。本会话未取得原生turn_context/请求回执，不能额外认证用户要求的high档位已生效。

十份原提案都已实读，SHA与原CLI登记一致。四份原路径仍在；六份原路径缺失，经前批保留索引定位本树Git精确文件，git ls-tree核blob、git show HEAD读取原字节保存scratch。
按指定materialize CLI尝试六条精确路径，全部rc1/retained/persistent runtime retained，原回执在materialize-receipts.json；不冒称已展开或丢失原证据。
原登记、旧状态、原路径、保存路径和SHA见dispatch-proposals.json。三十条关联账本首行/最新行已只读保存linked-ledger.json，角色均silent。
本次没有新增游戏经验或重复提案，未调用add制造新id、未直接改账本/队列。proposal_results交原调度器接续，父要求保持开放。

## 原始证据、冻结切点与身份

runs-verified.json逐条回源seek核SHA：六局character原文SILENT、ended非空、均A10。
摘要由指定根evidence_summary入口生成，仅为事实索引，SHA256=c73a648d3edc73a4e2a48819b97ca23a461ac279ef7077ac35fe1b82923a8fc8；没有把末五条当完整覆盖。
指定V6/Jev/decisions/run-config提证和states/sl-attempts/run-plans/runs补证均nice19执行，退出0。
两组manifest分别实读并保留各自切点；全部逐行offset/bytes/SHA及identity在各evidence.jsonl。摘要和两次提证不混称一个时刻。

|流|冻结字节|本批行数|无效JSON/切点截断行|冻结前缀SHA256|
|---|---:|---:|---|---|
|v6-evidence/v6-build|64678849|0|0/0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|v6-evidence/jev-prompts|2362421673|811|1/0|7d02792fa58a9bb25905727be297938e5ad5b9f0becf0e70d2533e2197cb7a50|
|v6-evidence/decisions|3265215304|3941|2/0|7c2b1835f1dc117aef57d3a85b16e9c33a6bbfe9eba8b8ca8d99fa36df849da7|
|v6-evidence/run-config|2391296|6|0/0|0b9778f136c6566c280e72c19ba249595d8a52a769b0c45cd377d250ca89f03f|
|evidence/states|15147647450|4062|2/0|286f99477391223b849c990732ec56957e76cd20da6ae1bd67daf41a7eee245c|
|evidence/sl-attempts|52012080|38|0/0|dd32250cd6233b8d807ce01882d5a3291fd3e15afddf40d8e22e9ccb7723c490|
|evidence/run-plans|10331512|33|0/0|bd1e1cff82d16a6a24d9085d85fd24748322c361f6e3088607cd9f9da47e07ba|
|evidence/runs|401979|6|0/0|cc333f9c8b0f1ce77b3eb39c5e311d719ed70f584753bda0047e6d67cb3c2ad3|

六局V6-build均no_match：源存在、此冻结前缀无匹配，不是缺文件、不是entries=0，也不证明V6 off。
六条历史run-config经回源核SHA：没有V6字段，记录历史字段缺失/开关未知，不倒填off；code均dirty且知识/移动表曾变动，当前数据库不等历史实际输入。
没有本批v6-build行可读，entries/jev_answer/fallback/unknown均保留“无匹配可验”；它们与Jev request/answers/error分别统计，不能互代。
归属只接受显式run_id/state.run_id/fingerprint.run一致身份，或decisions原行精确decision_id核对；run-plans按run字段。
正文提及、question_id相似串和时间邻近均不建局归属；窗口后继只在同局内、起点须observed_ts和完整fingerprint精确相同。
全前缀保留decisions两行、Jev一行、states两行无效JSON及其gap refs；切点截断均0。
decisions全前缀1934 unknown_identity/1470 unmatched_decision_id、states3407 unknown_identity不强塞本批；Jev无身份gap不表示动作全成功。
缺失不当零，不用这些缺口增加经验、跨角色借证或宣称自然收益。

## 题面覆盖和动作后果

Jev每局匹配84/92/58/139/269/169，共811行。question-inventory.json逐题机械保留身份、request/answers/error字段和覆盖原因。
模型完整实读9题request.state、全部questions/criteria、answers及相应decisions；其余802题未完整读题面，理由是未纳入原提案关键窗口，不作全题候选质量或收益结论。
包括268889、272214在内的其他题仅有字段索引/局部窗口，不冒称完整题面覆盖。完整题清单在question-selection.json，非末五条采样。
9题request.questions/answers与decisions对应字段核同；均call=ask、有answers、无显式error、fallback=false。
九题gate_reject和selection_dispatch都缺失，不能填“闸门通过/完整执行”。D268893首动作result=pending(unstable)，其余八题首动作completed；pending后仍需状态才能判结果。

verify_batch.py重新使用本批提证重建引用，回原文件seek核23个决策、130个去重状态及9个Jev行；另补7个状态，共137个状态，均SHA/JSON核同。
早批verified-source-refs仅作为精确定位入口，不沿用摘要替原文；本批新引用与cut见verified-source-refs.json/state-windows.json/extra-raw-states.jsonl。
模型只读以下有限窗口的相关状态字段，没有通读4062个state；机器全量提取/索引不代模型完整阅读。

|D/J原行|局/层/回合|Jev offset/bytes/SHA|decision offset/bytes/SHA|
|---|---|---|---|
|267377/26719|CA5KE8GFJ9X2 F13T4|385432356/8856/5de14255fbb805067c6d702e8c1d31f61bbcc5043a1a59988135e1f2197f4f84|672915234/5614/83919781b4c7a5147d74df95bc7a34ae0d3a598e2a560dc7a264e55ee9e2cd7d|
|268390/26869|5PM6JAQG6FNQ F38T4|387403992/15822/ec96a723a18f9cedbcf8fd5a3976fee2e8fc309cac2abef93e20becf2cf36297|676307151/11082/5851e8e426c9353d4bdb9e5c99d5c274931d34ace703fa936200bb97e08157fb|
|268427/26875|5PM6JAQG6FNQ F39T4|387513383/11608/ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb|676439445/5951/86a11b7115fcb55b33028452581869c7f1ec496a9f6467015197c7f54beddf51|
|268893/26930|DUZUBAJ3A8GP F27T5|388248392/9934/3fec66ad2462edc468b0883c7021b3b165e2fd93bc2115c3d4d8e8609d27cbd6|677806084/5866/9f7af98e72cccdf4a0d97240df91dc22ef3cf2c22a09596b2b6923e59fd48532|
|270282/27194|8JRE1C4H4Z2W F33T2|391510246/18141/94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09|682749244/12686/721f1ef7b80a307741e97b8cf9ab47d6ef03330053a3d1e9051127cc2108f5df|
|271348/27484|YF0LXT1QSTGG F48T1|394988203/25893/1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52|686624749/20711/d8a8d897eee8763b37e68e586461b5ed0abbbc946943a812c7b5ed92fdfd9b7e|
|271499/27509|YF0LXT1QSTGG F48T4|395424227/18199/daea5abb3675e4a24ba7e2467bcf1fe8e84e9fe56203da9df6de645c441258c9|687078651/7062/829804e36fc169c51b63b0da51e2812fe1b1960f9fa1792ad958de022384b304|
|271502/27510|YF0LXT1QSTGG F48T5|395442426/7714/3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95|687088578/2342/78d0745e47e7b57899fc3d580fa4c24f95aaf53ae47d5855d82bc309656bdc04|
|272040/27624|XP2SL33HT0D9 F33T3|396759387/29521/48d155c7dac4742223afb0a55203278f78ed555cc726725b82391ff511f94055|688946628/24634/32332518c91cd9c3333dbf733fa65bda521eb7187edbad1a6ae95ae99908521b|

逐题观察如下；D/J/S分别为decisions/Jev/states原日志行号。

|D|答案与实际执行|已核后果和限制|
|---|---|---|
|267377|plan3→翻越撑击，后续突然一拳、另起题打击|S273259—263蚌36→28→22、力4→8、次喷水19；题面原线伤8，不把全轮14都归原候选。|
|268390|plan2→切割电击、步法、防御、匕首雨|S274313—318本体31→27，电击/守护退场；敌index重排，跨召唤代际不能仅凭index/名字继承。|
|268427|plan1→步法/刀舞/步法/防御/切割/下注|S274351—358敏−4→−2→0、失落死后力−4归零；没有遗忘死后返敏的同等实证。|
|268893|plan2→生存者首回执pending，随后丢PINPOINT/防御/迷雾|S274834—839污染6/12/18、17挡对26损9；敌93→80实扣13，题面7不同，不倒称纯接口失败。|
|270282|Jev plan1，SL改plan2，首动作同为逃离|S276274—278损15扣17；原线S276208—212损3扣10。原/替死亡0/24与5/24不同，B2低可信零胜不代必死。|
|271348|Jev plan5，SL改plan4，实际步法/刺杀/两打击/防御+/赠礼/结束|S277366—373损9扣38；原线S277327—337损0扣45。两候选24/24死封顶27，不能抹掉当轮差异；未派发的挡续步不能计已执行。|
|271499|plan1触媒+实际建立2层|S277517—519零毒、敌197不变，下轮11×4=44；未选毒药不能计入已兑现毒伤。|
|271502|pick card1防御→select_deck_card1|S277520—528在5敏先13+10=23挡，第三小刀才得6敏、挡仍23；敌197→160、18血死亡，不补“另一弃牌能赢”。|
|272040|Jev plan2，SL改plan9，实打击/药瓶/结束|S278076—079损14扣27；原S278028—031损9扣24。药瓶实毒9/12分布不同于题面集中火箭，199/1200样本被时间截断，零胜并列不证明安全。|

补核机制窗口：DUZUBAJ3A8GP S274830—839技能污染0→3、勒紧能力不加、再技能至6，下一玩家轮清零、火花6；迷雾也实际施毒，不能一律少技能。
5PM6JAQG6FNQ S274308—318同一连续电击23上限窗口力量2→4、攻17→19；有爪牙退场index变化，未证跨代际完整来源。
YF0LXT1QSTGG S277512旧111阶段4血4毒15力→S277513新212满血且旧毒/力消失，玩家能力保留；两尖啸33→15→0，零毒触媒后仍197。
XP2SL33HT0D9 S278231—242末试T1付血10扣34且获1力，对照首试付血2扣25说明付血与成长并存；末T2轮初14挡，镣铐使爪0→−9/4→0，转向火箭30→20、斗篷后20挡，次轮减力恢复，实际零损。
S278249—261激光57→转向38→弱28；4敏脆弱下偏折6挡、实损22，T5防御6挡、11血恰被17−6耗尽；两敌毒3+7实际扣10后仍153/125，不能以能力已建当作整战足够。

样本单位仍为六个来源局，SL多试相关。同局配对只控制所列起点/当轮，后期抽序、生成、弃牌与替代整战未控制，不拟胜率/血价参数。
原提案成功SL、已有能力仍败、保血线延后仍败等反例继续保留；本批未完整重验所有整战或原101局，不增加其历史支持/反例/首证分母。
题面中夹带的其他角色历史药水统计只当原日志内容保存，不用于本角色学习结论；没有读取其他角色知识库。

## 既有live子能力和逐项处置

existing-source-provenance.json逐项核六个源码提交均为读取时实际live 5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532祖先，本树对应blob也完全相同：

|源码子项|真实live祖先源码commit|仍未完成的范围|
|---|---|---|
|silent-sl-resource-comparison.ts|0e4fe4df89a06682468e0e4716c12126e76369d5|模型当前轮差值，execution=unverified，不能代实付。|
|silent-selection-audit.ts|9d8278702dbc581b5015ba7ec9a70dc0fb94cccb|原答/护栏/SL快照，actual_turn=null。|
|silent-selection-dispatch.ts|fdaf787a372880b0438e73bcac7e6d2168b038ed|单动作回执，state_effect_verified=false，whole_plan_executed=null。|
|silent-phase-current.ts|aad2700abed6dff1d66e87fb36aaa6fedb39adf3|当前阶段快照，已兑现毒伤仍未知。|
|silent-crusher-facing.ts|68711002f15b298b8863d2258ee5da236da151d2|窄条件基数修正，不代本提案全来源/朝向认证。|
|silent-phase-reference.ts|1d57f9d0dbbb63603e9ce9768e74cb2021478464|当轮阶段结束参考，不代后续阶段胜率。|

以上只认证子实现来源。其存在不满足原提案全部目标，故没有把十项整项登记duplicate或implemented，不把当前代码当历史dirty源码。

|原id|本次证据/原账本|状态和缺证|
|---|---|---|
|silent-proposal-c20b5139dd0dff71|DUZUBAJ3A8GP F27T4—5；silent-0168|waiting：污染、挡及毒收益已核；T5题面伤7而实扣13，缺历史dirty移动/知识输入与当前消费者联合重放，不能据9损调整技能排序。|
|silent-proposal-ae9e692d680e3819|5PM6JAQG6FNQ F39T4—5；silent-0183,silent-0005|waiting：失落死亡后返4力已核；缺遗忘死亡返敏、逐实体抢夺累计来源及另一目标顺序完整后继，不设固定杀序。|
|silent-proposal-52f1e1bd2e7db0ed|CA5KE8GFJ9X2 F13T4—5；silent-0231|waiting：加压力4→8及喷水19已核；缺原实际A10移动表、覆甲条件隔离与当前模型逐步联合验证。|
|silent-proposal-6dd8bbff876be528|5PM6JAQG6FNQ F38T3—4；silent-0233,silent-0209|waiting：同一连续电击窗口力2→4、攻17→19已核；缺跨召唤代际身份、初始化及当前消费者受控重放。|
|silent-proposal-578e415a259e6835|8JRE1C4H4Z2W F33T2/T5；silent-0005,silent-0006,silent-0018,silent-0079,silent-0019,silent-0020,silent-0021,silent-0125,silent-0023,silent-0027,silent-0046,silent-0016|waiting：沙虫同指纹换线多12血、多7伤已核；既有候选/单动作审计未闭合抽弃牌重规划后的整轮执行归属与独立验证。|
|silent-proposal-c0767768bf6a7ab1|YF0LXT1QSTGG F48T1；silent-0079|waiting：实验体同指纹换线多9血、少7伤已核；缺未派发续步消费者验证、完整受控后继及独立留出，不能拟探索血价系数。|
|silent-proposal-a46bdb7fe711d79a|YF0LXT1QSTGG F48T3—5；silent-0021,silent-0027,silent-0028,silent-0085|waiting：零毒触媒与后得敏捷不追补已核；当前阶段快照已有实现，缺候选至整轮实际执行联合校准与独立验证。|
|silent-proposal-1044224808015e5c|XP2SL33HT0D9 F33T1/T3；silent-0079|waiting：双蟹同指纹换线多5血、多3伤已核；药瓶实际毒落点不同于题面，缺随机后继控制、整战验证与独立留出。|
|silent-proposal-7cbc6005db712ba9|XP2SL33HT0D9 F33T2—5；silent-0021,silent-0005,silent-0007,silent-0063,silent-0065,silent-0241,silent-0242|waiting：轮初14挡、临时减力恢复及57→38→28已核；原历史首证/独立分母未本批复验，逐来源消费者认证仍缺。|
|silent-proposal-c59f592f1427a67e|YF0LXT1QSTGG F48；XP2SL33HT0D9 F33；silent-0005,silent-0006,silent-0019,silent-0020,silent-0021,silent-0028,silent-0027,silent-0079,silent-0046,silent-0085,silent-0060,silent-0063,silent-0065,silent-0062,silent-0039,silent-0013,silent-0011,silent-0023,silent-0018,silent-0087,silent-0241,silent-0242|waiting：仅复验两局局部机制与SL血价；本批六锚点不覆盖原101局资源分母、路线/休息/药水完整链及受控后继。|

逐项预期行为、反例、固定验证、发现/留出边界与回退见proposal.md及原提案。后续先完成事实消费者重放和执行归属，再凭独立新局决定是否改排序/探索；不从未选方案补一个获胜反事实。

## 检查、失败保留和交付

摘要、两组提证和回源SHA校验完成；这些是证据完整性核验，不能冒称策略测试通过。
初次为追加窗口请求到S278263，选中数断言失败：278262/278263不属于本批。修正为实际GAME_OVER S278261后，七条回源SHA通过；extra-window-correction.json保留原请求和失败原因，没有跨局补帧。
六条materialize保留rc1如上；早期大段工具输出有截断，关键题268390及状态274315—317另行完整重读，不把截断输出当完整覆盖。
本次无生产改动，tsc/vitest/cases、撤源码红灯/恢复绿灯均未执行/null，无源码提交可回退；不借祖先测试冒报成功。
最终工作树、HEAD、生产差异与交付gitleaks回执见final-checks.json；详细扫描日志/JSON留本目录。
不合入live、不分配版本、不追加实际上线双通知、不标shipped、不关闭量化/学习父项。没有新源码提交受阻需要兜底。
运维入口：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-114302/learner/runs/20261021-114310-b391aaa7-ba83-4adb-9bfe-77a29e1217a1-strategy-proposal/proposal.md；机器回报：result.json。全部原提案副本、证据、失败/存储回执保留在本批scratch，不删除自身树。

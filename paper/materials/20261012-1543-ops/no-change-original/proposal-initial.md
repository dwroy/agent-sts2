# 本批十项原提案的证据复核与处置

生成时间：2026-10-12T15:25:32+08:00。batch=20261012-150941-strategy-proposal；角色silent；base=3f159fc6b04971a6b907a2401c6be3f7f3d56a6d。

本批reason=proposal，有10个proposal_ids，无research_request、implementation_request或proposal_repair。普通专题文件不匹配本批，因此按原队列逐项处理；没有读取另一专题代替身份。工作树开工干净，git merge --no-edit main返回Already up to date。

来源及实现任务保持原专用队列的source_task→strategy-proposal。本文件是原ID接续报告，不另建重复代码提案、不改原文、不重写历史复盘。所有游戏结论仅限本次核过的6个静默A10局与选定窗口；原文更宽进阶/全历史分母不由本批背书。

## 证据、现状和验证边界

runs-verified.json核6条唯一角色记录；raw-evidence-manifest.json记录1062状态行、1043决策行的原始绝对字节偏移、行号、长度和SHA256，已重新逐行对照。十份原文逐SHA吻合，保存在各<id>.source.md。facts.json只抽本批所用局面；paired-observations.json是四组同指纹的端点算术，不是完整候选归因或因果胜率。

本次不拟合新参数：所列局面作发现/确定性核验；SL尝试按run_id合并，不当独立训练或验证局。未来后移样本尚未在本批验收。不调用LLM、网络、play或可刷新知识JSON进行验证。

## 1. silent-proposal-c20b5139dd0dff71

原题：冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0168。

证据：DUZUBAJ3A8GP A10 F27 T4–T6；states 274830–274839，decisions 268889–268898。T4迷雾后污染3，勒紧能力后仍3，防御后6；49血/9挡对显示12，下一轮46血。T5火花6；生存者先出8挡、弃牌完成才出现污染6，防御后12、迷雾后18；17挡、46→37血，T6污染项消失。迷雾同时使毒7→13，不能只算污染。

反例/限制：T5生存者的选择屏并未马上出现污染；把首次派发或中间选择帧当技能全部结算会错位。技能同时有挡/毒收益，9点净损不是少打技能一定更好的证据。

旧规则/当前实现：combat-plan读取现场VITAL_SPARK；turn-solver按活敌火花累计技能污染并计每段攻击，rollout有招式带来的火花增长。代码存在不等于复原该局dirty树和实际数据库。

预期行为：固定实际出牌、选择完成边界、火花3→6、污染清除与迷雾毒/弱收益，逐步核对本体血、玩家血和挡；保留全部选项。

验证及缺数据：需实际运行读取的A10招式输入或可核等价重放，加上完整技能前缀逐帧回归。若拟改变少打技能排序，再补同起点后继对照；不拟血价权重。

处置：waiting。污染及火花增长的现行路径已存在；本次只有该局观察窗口，未取得历史实际招式输入与毒/弱/弃牌联合源码重放，也没有完整替线后继，不能据T5损9启用少打技能规则。

## 2. silent-proposal-ae9e692d680e3819

原题：提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0183、silent-0005。

证据：5PM6JAQG6FNQ A10 F39首试T4–T6；states 274351–274362，decisions 268427–268438。T4力量−4、敏捷−4；两次步法使敏捷−4→−2→列表无此项。失落2血/3毒，结束后退场，T5玩家力量项消失；T6遗忘敏捷4→6，玩家再出现−2敏捷。末试T4 states 274391–274397，仅一步法到−2敏捷，毒杀失落后仍被遗忘结束。

反例/限制：首试返力与末试死亡清空能力列表必须区分；死亡后的空列表不能当所有抢夺已返还。原帧没有遗忘退场返敏的隔离过程。

旧规则/当前实现：当前负属性读取与通用状态端点可以表达数值；没有以本次证据证明完整按来源记录及归还的实现。

预期行为：按实际实体和抢夺来源记录已发生的减少、归还、再抢；不用当前敌总属性或玩家负值代替可归还量，不定固定击杀序。

验证及缺数据：补遗忘死亡返敏、同属性多个来源、临时属性与抢夺混合的连续隔离帧；固定逐实体重放，覆盖索引重排。

处置：waiting。已确认失落退场前后力量−4到无该项及遗忘再抢敏捷，但缺返敏死亡帧、多来源同属性和临时增减混合归还证据，不能把现帧总属性充当来源账本或设固定击杀序。

## 3. silent-proposal-52f1e1bd2e7db0ed

原题：第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0231。

证据：CA5KE8GFJ9X2 A10 F13 T1–T5，decisions 267361–267386。初始58血、覆甲9；T1/T3/T5力量无项/4/8、喷水11/15/19；T3/T5虚弱后11/14；轮初覆甲9/9/8/7/6。末轮玩家2血、10挡，显示14，结算0血；敌19→16且覆甲6→5。

反例/限制：本局同时发生攻击、掉血、反伤及轮次推进，不能仅凭9/9/8/7/6判定全部覆甲减层触发条件。零血截断也不能将实损2当完整所需损血4。

旧规则/当前实现：monster-db.ts moveDamageAt/monsterHpAt对当前进阶非空记录优先使用，未设五样本门槛；room-costs.ts的MEASURED_ROOM_MIN_N仍为5。rollout已有力量招式效果及覆甲路径。

预期行为：当前进阶HP/攻击从首条观测读取；固定加压与虚弱，保持房间代价五样本门槛，不创造固定房间损血。

验证及缺数据：冻结历史实际A10移动表并重放两次加压、虚弱和覆甲；补可以区分减层触发/时序的独立片段，不能用今天刷新DB冒充原输入。

处置：waiting。首样本读取与五样本房间代价边界已经存在；本局只支持加压及显示攻击变化，覆甲独立触发/时序和历史调用移动表未隔离，不能扩写完整蚌模型或固定成本。

## 4. silent-proposal-6dd8bbff876be528

原题：复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0233、silent-0209。

证据：5PM6JAQG6FNQ A10 F38 T3–T4；decisions 268389–268390及前后状态。最大血23的ZAPBOT，高电压2、力量2→4、攻击17→19；同轮其他敌退场使其索引4变3。T3玩家61→31，本体44血留场，电击到T4才退场。

反例/限制：索引变化不代表新实体；enemy_id只是类型。日志里两只GUARDBOT也说明只按类型不能充当任意实体身份。未执行的先杀爪牙线35伤/损3不是整战实测。

旧规则/当前实现：HIGH_VOLTAGE_POWER已在跨轮力量增长路径，召唤创建有独立状态；没有以本局证明所有同种重复召唤和存活状态转接。

预期行为：逐实体增长，使用当前进阶攻击事实；新召唤体从自己的观察状态起步，保留原目标选项。

验证及缺数据：需要可辨别同种重复召唤/退场再召唤的连续数据及实际移动输入，重放增长和索引重排。若改击杀序再补完整后继。

处置：waiting。本局17→19增长已核，现有HIGH_VOLTAGE路径存在；原帧没有稳定实例标识和同种重复召唤对照，不能验收新旧实体隔离全范围，另一击杀序完整后继也未实打。

## 5. silent-proposal-578e415a259e6835

原题：核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。

证据：8JRE1C4H4Z2W A10 F33首/第三试T2，decisions 270216/270282同指纹，下一轮实损3/15、敌净扣10/17。末试T11 decisions 270441–270442、states 276433–276434：5血/22挡/显示37，终态敌154→130。

反例/限制：末试延长到T11仍失败；不能推出所有防御替换错误或一律保血正确。F17抽牌重问、各SL末轮未执行和末次实际死亡不能混作完整候选结果。

旧规则/当前实现：选择、首次派发、相邻状态及最终死亡端点审计均有live祖先。当前消费者对F17/F33生成66段，其中21段被下一题替代，完整候选结果全部null；末轮正确分列净损5与显示差额15。

预期行为：保持原选择，只将原答/护栏/SL/派发/重规划和资源变化分列；继续区分净HP、显示攻击差、未结算毒与候选兑现。

验证及缺数据：补带可追溯动作身份的完整候选执行链、选择和抽牌后的续步及资源因果归属。新规则需按局分组、后移独立验证。

处置：waiting。选择/派发/端点和最终死亡子项已在live；本次66段中21段被重问替代，完整候选兑现、跨重规划资源归因和整场后继仍未验证。末轮净损5/显示差15已由现有消费者覆盖，不能再把该子项算缺失或关闭综合提案。

## 6. silent-proposal-c0767768bf6a7ab1

原题：全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb。

来源任务：postmortem；实现任务：strategy-proposal。账本：silent-0079。

证据：YF0LXT1QSTGG A10 F48第二/第三试T1，decisions 271309/271348同指纹，实际损0/9、扣敌45/38。当前冻结窗口还含F33：states 277088–277091为重打胜利后的奖励/地图，余20血。

反例/限制：F33成功SL反对一律禁止探索；F48第六次恢复挡续步仍失败。弃牌后重问使某次替换候选未完整执行，不能把候选差额当实付差额。

旧规则/当前实现：现有审计保留预测、原/替线、单步派发及端点；F33/F48窗口52段，22段被重问替代，所有完整候选收益仍null。

预期行为：同轮HP价、输出、挡、未执行续步与全败采样分别显示；保留探索规则，不把有限采样的死亡比例并列称安全。

验证及缺数据：补覆盖重放与续步身份链；若拟改探索，需同起点且后继抽序可核的独立完整胜线，保留成功SL反例。

处置：waiting。已核同指纹T1实损0/9与扣敌45/38，且同局F33重打确实赢；现有端点审计不证明覆盖重放、弃牌后的整候选完成，缺受控完整胜线，不能新增探索禁令或惩罚系数。

## 7. silent-proposal-a46bdb7fe711d79a

原题：实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6。

来源任务：postmortem；实现任务：strategy-proposal。账本：silent-0021、silent-0027、silent-0028、silent-0085。

证据：YF0LXT1QSTGG A10 F48末试T3–T5，states 277512–277528。111血阶段剩4血4毒后变212血新阶段、旧毒/力量项消失；T5触媒2而敌无毒。两牌先形成13+10=23挡，第三小刀后敏捷5→6但仍23挡；敵197→196→187→178→169→160，玩家18→0，结束前显示44。

反例/限制：拥有或已经建立触媒不代表当前有毒可结算；建立能力后仍死亡也不证明能力无价值。阶段复活的HP增量不能直接当负伤害累计。

旧规则/当前实现：silent-phase-current区分本帧持有/已建/零毒，并令已结算毒伤为null；离线端点已输出敏捷时序和最终净损18/显示差21。

预期行为：按阶段分列当前血、已建毒能力、实毒、已结算伤害与敏捷获得时点；不给零毒触媒或后得敏捷预支收益。

验证及缺数据：补分阶段、完整动作链下的毒施放/结算归因及候选兑现，不跨复活累计净HP。若调整排序另补受控完整后继。

处置：waiting。本帧组件/已建/零毒及末轮端点子项已有live实现；仍缺分阶段累计已结算伤害、即时施毒到完整候选执行的归因和独立后继，不能由持有或单步端点调整排序或关闭整项。

## 8. silent-proposal-1044224808015e5c

原题：核验A10双蟹B2零胜并列的SL换线血价，分列当轮损失、输出与成长；缺独立胜线时保留原行为，不以零差宣称安全。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5。

来源任务：postmortem；实现任务：strategy-proposal。账本：silent-0079。

证据：XP2SL33HT0D9 A10 F33首/第二试T3 decisions 271992/272040同指纹：损9/14、敌净扣24/27。首/末试T1 decisions 271982/272195同指纹：损2/10、扣25/34；末试下一轮已有1力量。

反例/限制：付血开局同时取得力量且后轮抽序/出牌变化，无法单归因于某一换牌；末试T2临时减力、朝向与挡令零损，不可只数少了几张防御。

旧规则/当前实现：候选及单步执行审计已经存在；本局F33有58段，22段被重问替代，零胜并列没有独立的安全证明。

预期行为：保持现有选线，分列采样信度、同轮血价、实际本体进度与成长；低损血优先候选仅作为待验证假设。

验证及缺数据：本局只能作发现/固定回归，需按局号分组的时间后移双蟹完整样本，尤其付血最终获胜的反例；不拟全局HP常数。

处置：waiting。两组同指纹血价9/14、2/10及输出24/27、25/34已核，但力量成长和后继同时变化，六次相关SL均非独立胜线，不足启用零胜并列时固定低损血优先。

## 9. silent-proposal-7cbc6005db712ba9

原题：用本角色日志核验双蟹朝向、临时减力、船夹板T2格挡与能力实际兑现；补缺失条件参考，保留原出牌权重和未验证条件。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291。

来源任务：postmortem；实现任务：strategy-proposal。账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。

证据：XP2SL33HT0D9 A10 F33末试T2 states 278236–278242：轮初14挡，普通镣铐使爪力量无项→−9、4攻→0；斗篷后20挡，T3力量/镣铐项消失。T4 states 278249–278254：火箭57→38→28，两步法4敏捷。T5 states 278258–278261：11血/6挡，末前显示Attack17，同时Defend/Sleep数值为null；毒后双敌153/125。

反例/限制：已建4敏捷仍只有6挡并死亡，不支持固定能力优先。只有Attack的17是明确数值，不能将Defend/Sleep的null擅自改成所有未知意图均0。原文A1/A6范围本批未重新全量验收。

旧规则/当前实现：现行端点能关联T2/T3能力变化，最终实损11已保留；由于混合意图含null，末轮总攻击参考仍null，这是可见范围限制，不冒称已算出完整17−6。

预期行为：分别列轮初已有挡/新增挡、减力有效期、朝向/弱、净伤与未结毒；保留原优先级，缺失量保持未知。

验证及缺数据：补混合意图的完整规则与额外触发隔离证据，以及抽弃重问到全轮兑现的联合回放。普通版和本批A10以外不得直接外推。

处置：waiting。14挡、临时−9及恢复、57→38→28已核；完整候选/重规划联合验收和额外触发仍未完成。末轮现有消费者实损11已保留，但含null的Defend/Sleep使总攻击参考未知，不能擅自补零或改排序。

## 10. silent-proposal-c59f592f1427a67e

原题：核实静默临时减力/轮初挡与已建能力兑现，分列同盘SL原答/替换/实际血价；缺完整胜线时保留规则并后移验证

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2。

来源任务：experience-update；实现任务：strategy-proposal。账本：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。

证据：YF0LXT1QSTGG F48 T1/T4/T5与XP2SL33HT0D9 F33 T1–T5；三组同指纹配对血价/扣敌差分别+9/−7、+5/+3、+8/+9，原始行见paired-observations.json。零毒触媒、23挡后再得敏捷、14轮初挡、临时镣铐、朝向均见上述逐帧事实。

反例/限制：同存档尝试不是独立样本；YF F33成功重打与F48恢复挡仍败并存。历史普通/升级机制统计及路线回血全链本批未重新全量分析，不能凭两个末战把综合范围全部验收。

旧规则/当前实现：两局本次窗口110段、44段被重问替代；当前消费者完整候选结果均null。选择/派发/端点/部分终局已上线，但不会输出未核的完整能力收益或SL恢复因果。

预期行为：去重沿原提案接续，保存原答、SL/重放、实际动作分段及恢复/消耗；不改变经验权重、药水时机、护栏或终局参数。

验证及缺数据：补完整执行与跨阶段/跨重规划资源链，再按独立局后移验证；升级、其他叠层及早期进阶要重新核自己的证据，不扩大本批声明。

处置：waiting。两局配对及能力时序已核，已有现场/离线审计子项不能代替完整能力收益、恢复链与候选资源归因；本次110段中44段被重问替代，缺受控独立整战对照，综合范围继续waiting。

## 已有实现的来源和局限

source-proof.json固定核对live=1e5ce46f5a09b249bd049631cdba94d1a2c2bc81。以下是既有子项源码的真实live祖先，不是本批提交：选择审计a8b1f8be153fe4f3a34146117546c2178f2e446b；单步派发bade647f9fe4c9103b40e2f26b26296692ad24b7；当前阶段事实及相邻观测8698c581dac6c7e957f50a381586960a6d0c9b57；离线执行/终局端点04921bd785ac6838066522f91ea0bb6ab95cb6a1；怪物库读取4ed3c72df30f27b881da637aebf528b97440e0bb。所列7文件的HEAD/live/来源blob一致，磁盘源码一致。

rollout.ts和turn-solver.ts与live各有两处Roy/Dai注释差异，见source-main-live.patch；不声称这两文件逐字相同，也未修改差异。运行日志六局均带历史dirty标记，现行源码不能冒充原运行完整树。

既有离线CLI在冻结8JRE/YF/XP输入各运行一次、退出0。66/52/58段中21/22/22段重问，完整候选结果均null。沙虫最终净损5、显示37−22=15；实验体净损18、显示44−23=21；双蟹净损11，混合意图总攻击参考仍null。原消费者输出及stderr、退出码全部保存。这是消费者执行核验，不是tsc/vitest测试，不等于在线模型已采用或胜率提升。

## 预期影响、回退与记录

本批只澄清原提案待验范围并补报告链接，所有角色运行行为保持原状；没有生产源码、经验库或知识更新，没有新提交、live合并、游戏版本、shipped或规则变更通知。没有撤源码红/恢复绿，也没有运行tsc/vitest，均记null。若未来代码实现，必须按原固定数据红绿、沙箱和live流程另验，回退对应实际源码commit。

记录仅经根目录learner/ledger.py update追加status=proposed、by=learner:strategy-proposal及本报告路径到已处于proposed的主账本条目；不降级shipped条目，不直接修改账本/队列，不创建重复提案ID。ledger-update-input.jsonl及receipt保存精确内容。运维使用report.json的十个waiting结果续原队列，不把本报告记成实现或shipped。

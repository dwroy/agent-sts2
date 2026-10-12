# 静默猎手A10：本批十项既有提案复核

记录时间：2026-10-13T02:05:54+08:00（写前已运行date）。批次：20261013-014201-strategy-proposal。完整基线：9eabfcce9522c7aae3739a71275cc54f2d0d3ca8。

本批未改策略/源码/经验，十项完整提案均waiting；已有子项不作为整个父提案的duplicate。未新增提案id、提交、合入、eval版本或shipped。

初始工作树干净。根learn.json对应行task=strategy-proposal、character=silent、reason=proposal、worktree匹配，有且仅处理派发的十个proposal_ids；没有research_request、implementation_request或proposal_repair。默认deck-size请求绑定另一旧批，不承接专题。git merge --no-edit main结果Already up to date；HEAD保持base。未读取另一个请求来替代身份，未领其他队列项。

六条runs原行均SILENT/A10；只用本批原局、对应静默复盘、knowledge/characters/silent和所派提案/账本。原提案十份SHA全匹配，六份复盘按标题与原字节范围冻结。4062条状态、3941条决策、38条SL原行按偏移seek/SHA复验零差异；fight-plans未找到本六局行，不把缺行当未调用模型。历史+dirty提交不能凭当前源码复原。没有预训练游戏结论或其他角色知识。

## 核实结论与限制

四组完整指纹一致的配对。数值为当前观测到下一玩家轮的净失血/敌本体净下降；未控完整后继，不等于全部伤害来源或整战因果。

| 局/层/回合 | 尝试 | 实失血原/换 | 敌净下降原/换 |
| --- | --- | --- | --- |
| 8JRE1C4H4Z2W F33 T2 | 首/三 | 3/15 | 10/17 |
| YF0LXT1QSTGG F48 T1 | 二/三 | 0/9 | 45/38 |
| XP2SL33HT0D9 F33 T3 | 首/二 | 9/14 | 24/27 |
| XP2SL33HT0D9 F33 T1 | 首/末 | 2/10 | 25/34 |

支持旧silent-0079“预测饱和仍有实际血价”的限定观察。沙虫原/替预测死亡0/24与5/24不是并列同率；双蟹B2均0胜/SE0只是有限样本。没有完整受控胜线，不拟低损血固定优先、禁SL、技能惩罚、目标序或全局系数。同局YF F33第二次SL胜余20是保留探索价值的边界。

七组机制复核在proof.json：棱柱火花/污染；抢夺/已建敏捷/失落返力；蚌加压/弱/末轮缺口；电击连续增长与退场；双蟹朝向/临减/轮初挡/已结毒；实验体阶段/零毒触媒/敏捷时点；沙虫末轮能力及死亡截断。未见遗忘死亡返敏和混合来源；电击index重排没有持久实体身份；覆甲完整触发未隔离。死前意图/挡/血与GAME_OVER下一招/清空能力分开，不倒写机制。

## 现有源码与消费者核验

source-manifest.json核文件来源与live祖先。现有selection-audit、hp-guard-audit、sl-comparison、sl-resource-comparison文件进入main的源码commit为66283dd9982bdd7f480da7a4d9bfefea0572a9ac；selection-dispatch的fdaf787a372880b0438e73bcac7e6d2168b038ed、phase-current的aad2700abed6dff1d66e87fb36aaa6fedb39adf3均为冻结live祖先。冻结live=3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee，均是已有子项、本批没有新源码提交。

已有源码保存原答、护栏后、SL后候选及请求动作。单次派发仍state_effect_verified=false、whole_plan_executed=null、actual_turn=null；阶段事实把持有组件/已建能力/当前毒分开，poison_damage_already_dealt=null。DB当前进阶nearestAscension/countsAtAscension与移动攻击路径没有五样本门槛；房间代价MEASURED_ROOM_MIN_N=5。局部接线包括vitalSpark/tainted逐击、逐敌growth、HORN_CLEAT_TURN=2/BLOCK=14。不能用猜测补null来认证完整提案。

生产源码只读，原副本用.source.txt，没有.ts临时副本。七个大文件与live仅Roy/Dai注释差异，双方原字节和baseline-vs-live.patch保留，未声称整文件字节相同。局部helper文件与live字节一致。

固定离线helper读回通过：六个实验体现实快照；三个合成条件控制（不同角色/进阶、缺毒数据）；仅旧日志捕获的9/14失血、24/27伤害投影的资源helper；历史盘面上的合成completed派发回执。缺步骤/挡/成长不重建为完整候选，派发只核“completed仍不能证明整线”语义。结果consumer-receipt.json、consumer-readback.log。直接node --import tsx运行，无LLM/网络/游戏/刷新知识JSON；不是生产全链、自然live消费或新策略验证。

## 逐项处置

## silent-proposal-c20b5139dd0dff71：棱柱技能污染合算

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c。原字节保存为silent-proposal-c20b5139dd0dff71.original.md，未改原文或注册重复id。
账本：silent-0168。

证据局号/层/回合：DUZUBAJ3A8GP F27 T4—6。T4污染0→3→3→6，中间能力不增；火花3→6；T5三技能污染0→6→12→18，17挡对26攻实损9，T6污染消失。

反例与边界：迷雾同时施毒，格挡牌同时加挡；少技能没有受控整战胜线。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补实际移动表/模型输入来源和联合固定重放，保留所有技能选项。 只提供事实，保留全部选项及现有选择规则。

未实现原因：现有vitalSpark/tainted逐击及火花增长路径已覆盖局部；历史dirty源码与当时实际移动表缓存未冻结，尚未完成技能收益、火花增长和污染清除的联合模型校准；没有支持新增技能惩罚的受控替线。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-ae9e692d680e3819：失落／遗忘抢夺来源

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5。原字节保存为silent-proposal-ae9e692d680e3819.original.md，未改原文或注册重复id。
账本：silent-0183、silent-0005。

证据局号/层/回合：5PM6JAQG6FNQ F39 T2、T4—6。两次抢夺后力敏−4/−4；首试两步法恢复0敏，失落毒死返4力；末试一步法只到−2敏，最后8血0挡对遗忘19死。POSSESS_STRENGTH_POWER=1不是累计被夺4力量。

反例与边界：失落退场未救末试；遗忘没有退场返敏相邻观测。总属性不能冒作单来源被夺量。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补每次实际夺取、来源实体和返还时点，固定区分总值与来源量，不拟固定杀序。 只提供事实，保留全部选项及现有选择规则。

未实现原因：缺遗忘死亡返敏、同属性多来源抢夺和临时属性混合返还的相邻事件；现帧负属性和单来源返4力不足以实现一般来源模型或固定击杀序。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-52f1e1bd2e7db0ed：下水道蚌加压与覆甲

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376。原字节保存为silent-proposal-52f1e1bd2e7db0ed.original.md，未改原文或注册重复id。
账本：silent-0231。

证据局号/层/回合：CA5KE8GFJ9X2 F13 T1—5。力量0/4/8、喷水11/15/19，弱后11/14；末2血10挡对14，完整需损4、差2血，荆棘后敌16血。覆甲现场9/9/8/7/6。

反例与边界：虚弱未关闭成长；覆甲变化与攻击/敌轮同时出现，完整减层触发未隔离。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补原输入身份与独立覆甲触发；固定核加压、弱和末轮截断，房间代价保留五样本。 只提供事实，保留全部选项及现有选择规则。

未实现原因：当前进阶HP/伤害首样本读取与房间代价五样本门槛已有；缺历史实际模型输入和覆甲独立触发/叠加来源，不能认证完整成长与覆甲提案或新增房间成本常数。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-6dd8bbff876be528：电击逐实体连续成长

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5。原字节保存为silent-proposal-6dd8bbff876be528.original.md，未改原文或注册重复id。
账本：silent-0233、silent-0209。

证据局号/层/回合：5PM6JAQG6FNQ F38 T3—4。唯一23上限电击T3力2/17攻、T4力4/19攻，高电压均2；T3仍攻击、T4才退场。数组index由4变3。

反例与边界：先杀爪牙的未执行候选不是保血实证；数组index重排不是持久实例身份。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补实际同种实体生灭和持久身份，再固定复验各自成长，不按相同上限血建立实例等价。 只提供事实，保留全部选项及现有选择规则。

未实现原因：HIGH_VOLTAGE逐敌增长路径已有；缺同种电击新旧并存/替换的稳定实例身份和连续事件，历史实际移动表缓存也未冻结，不能认证计数不继承的全部分支。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-578e415a259e6835：沙虫原答／护栏／探索与兑现审计

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a。原字节保存为silent-proposal-578e415a259e6835.original.md，未改原文或注册重复id。
账本：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。

证据局号/层/回合：8JRE1C4H4Z2W F33 首／三试T2、二试T5、末试T11。首／三试T2完整指纹一致，实损3/15、净扣敌10/17；预测死亡0/24与5/24。末试5血22挡对37，完整需损15、实扣血截5；24毒只结一次后敌130。

反例与边界：防御换线延长战斗仍败；后继未控，候选省血不等实际保血。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补完整动作/抽弃/生成/重规划身份，候选、派发、实际端点和能力收益分账后固定全链验收，暂不改阈值。 只提供事实，保留全部选项及现有选择规则。

未实现原因：原答/护栏/SL候选和单次派发回执已有；缺中间事件完整性、跨重规划资源归因和能力累计收益的完整链，单次completed不证明整线执行。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-c0767768bf6a7ab1：实验体SL覆盖重放实际血价

角色/已观察范围：silent、A10。来源任务：postmortem；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb。原字节保存为silent-proposal-c0767768bf6a7ab1.original.md，未改原文或注册重复id。
账本：silent-0079。

证据局号/层/回合：YF0LXT1QSTGG F48 二／三试T1、第四试T5；F33第二试。二／三试T1完整指纹一致，候选0/10损、54/36伤；实际0/9损、净扣45/38；第三试后续覆盖成end_turn。F33第二次SL实际胜、余20血。

反例与边界：第四次T5弃牌后未完整执行替换；第六次恢复T1挡续步仍败，F33胜反对禁止全部SL。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。冻结同题候选和后续完整事件，先验执行/切断；后移独立局验策略，保留成功SL边界。 只提供事实，保留全部选项及现有选择规则。

未实现原因：同题资源预测与替换比较已有；缺覆盖重放/弃牌后的完整执行证明和受控整战获胜替线，无法拟合探索禁止条件或血价系数。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-a46bdb7fe711d79a：实验体分阶段毒与敏捷兑现

角色/已观察范围：silent、A10。来源任务：postmortem；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6。原字节保存为silent-proposal-a46bdb7fe711d79a.original.md，未改原文或注册重复id。
账本：silent-0021、silent-0027、silent-0028、silent-0085。

证据局号/层/回合：YF0LXT1QSTGG F48 末试T3—5。第一体末4HP/4毒到第二体212HP/零毒；触媒2建立、T5仍零毒；5敏时13+10=23挡，第三刀敏捷5→6后挡仍23；18HP对结算前44攻需损21。

反例与边界：前五次建毒雾/余像仍败；组件、已建能力、现场毒和已结毒伤分开；GAME_OVER后续55不替代死前44。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。补来源事件和阶段边界后才增加累计字段；零毒触媒和敏捷不倒补保持已核观察，不预支未来毒。 只提供事实，保留全部选项及现有选择规则。

未实现原因：当前阶段、持有/已建/当前毒事实已有，已兑现毒伤诚实保留null；缺跨阶段伤害来源完整事件与候选完整执行链，不能认证累计收益或改排序。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-1044224808015e5c：双蟹B2零胜并列探索取舍

角色/已观察范围：silent、A10。来源任务：postmortem；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5。原字节保存为silent-proposal-1044224808015e5c.original.md，未改原文或注册重复id。
账本：silent-0079。

证据局号/层/回合：XP2SL33HT0D9 F33 首／二试T3、首／末试T1、第三试T4。T3同指纹B2均0胜、五轮24/24死，实损9/14、净扣24/27；T1同指纹实损2/10、净扣25/34，末试建1力；第三T4只有候选死亡21/24→23/24。

反例与边界：末次T2零损、T3损4涉及临减/朝向/抽弃；成长及后继未控，原线无整战胜证明。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。按局号分组保留成长、血价和完整胜负，受控全战与后移同角色A10双蟹局支持后再评估窄排序。 只提供事实，保留全部选项及现有选择规则。

未实现原因：缺相同资源与随机输入下的完整受控替线和独立后移验证；有限样本B2零胜/SE0不支持启用固定低当轮损血优先或称换线安全。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-7cbc6005db712ba9：双蟹朝向、临减与船夹板

角色/已观察范围：silent、A10。来源任务：postmortem；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291。原字节保存为silent-proposal-7cbc6005db712ba9.original.md，未改原文或注册重复id。
账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。

证据局号/层/回合：XP2SL33HT0D9 F33 六试T2、末试T2—5。六试T2轮初均14挡；末镣铐爪0→−9/4→0、T3恢复，斗篷另6到20挡；火箭57→38→28依次转向/弱；4敏脆弱下偏折6挡，末毒实结3+7。

反例与边界：其他轮无船夹板14，额外来源未隔离；GAME_OVER零挡不替代结算前6挡；没有固定目标序或能力先手整战胜线。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。固定核朝向/弱分账、14+6、临减恢复和末轮端点；未知条件保留null，补完整候选与来源链。 只提供事实，保留全部选项及现有选择规则。

未实现原因：临减、船夹板T2、朝向和现帧/候选局部事实已有；缺联合候选收益、额外触发隔离与混合意图缺值语义，不能用局部功能关闭整项或改权重。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## silent-proposal-c59f592f1427a67e：两局宽机制包和跨重规划资源账

角色/已观察范围：silent、A10。来源任务：experience-update；实现任务：strategy-proposal；本批：20261013-014201-strategy-proposal。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2。原字节保存为silent-proposal-c59f592f1427a67e.original.md，未改原文或注册重复id。
账本：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。

证据局号/层/回合：YF0LXT1QSTGG F48 T1、T3—5；XP2SL33HT0D9 F33 T1—5。复核三组成对血价/进度差+9/−7、+5/+3、+8/+9及阶段、临减、轮初挡、敏捷时点和毒结算。

反例与边界：旧101局/22次镣铐/50轮初帧是原提案口径，本批只分析六局；赢战资源与恢复不归因单卡。

当前行为与预期行为：已有局部机制/审计保留，完整请求仍waiting。沿原id按原子范围补事件和实际消费者，恢复/回血/用药分账，不把框架或本批报告当量化学习完成。 只提供事实，保留全部选项及现有选择规则。

未实现原因：缺宽机制包完整累计收益、跨重规划因果归属与恢复/资源全链；已有局部消费者和六局固定帧不足以认证完整包或关闭父要求。

验证/拟合/时间切分：proof.json及evidence-manifest.json保存本角色原帧与四组同指纹；source-manifest.json保存源码与实际live祖先。固定原帧属于发现样本内复核，不把同存档尝试当独立局。缺完整来源/后继明确记未知；后续新同角色已观察进阶完局按时间后移验证，不拟新权重。已有helper读回不认证完整候选/自然live采用。

预期影响/回退：当前只有报告与CLI链接，无行为/源码改动需回退；未来实际实现用其独立源码commit回退，保留本批与历史失败。Roy-2026-10-07-learning提供权限，不提供事实。未宣称implemented、duplicate、shipped或整战转胜。

## 验证、提交及后续

本批只有git忽略的scratch材料与根账本CLI链接追加；生产源码、knowledge、任务模板、eval版本、运维prompt未改。HEAD=9eabfcce9522c7aae3739a71275cc54f2d0d3ca8，fixes=[]，merged=null；无新提交/上线/release_id，不运行play或推送。

未撤源码，撤回失败/恢复通过不适用；tsc/vitest未运行，tests={"tsc":null,"vitest":null,"cases":null}。原帧复验和helper读回不是这两套测试成功回执。

初始队列/角色提取两次断言失败保留initial-extraction-failure.txt，已改fold update和SILENT大小写规范；无生产/账本写入。不存在的源码/测试定位已按实际路径更正，未记代码测试失败。一次报告生成工具在执行前JS语法失败、未落盘，后改数据与生成脚本分开；失败说明保留。

只经ledger.py update追加本报告/提案链接和waiting说明，不改已有claim/evidence/status/version或shipped历史，不造新证据/提案id。CLI回执ledger-update.receipt.json，扫描与最终工作树检查final-integrity.json。未关闭宽提案、量化父要求或经验消费者验收。

运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-014201/learner/runs/20261013-014233-strategy-proposal/proposal.md。
报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-014201/learner/runs/20261013-014233-strategy-proposal/report.md。

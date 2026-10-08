# 静默机制与实际兑现代码提案

来源任务 experience-update，第84批；实现任务 strategy-proposal；授权 Roy-2026-10-07-learning。
仅静默已观察的A1/A7/A10现场与各关联经验原有进阶；别的角色和未观察组合保持等价。来源账本：silent-0005,silent-0006,silent-0021,silent-0011,silent-0065,silent-0264,silent-0079,silent-0133,silent-0169,silent-0189,silent-0013,silent-0053,silent-0162,silent-0265。关联经验：silent-footwork-block,silent-strength-weak-observation,silent-deck-burst-observation,silent-noxious-fumes-growth,silent-kaiser-crab-facing-sl,silent-ceremonial-beast-threshold-growth-sl,silent-precise-cut-hand-count-observation,silent-paels-flesh-third-turn-energy,silent-frail-card-block,silent-malaise-x-debuff,silent-mr-struggles-turn-start-damage,silent-unsettling-lamp-first-debuff。

旧行为与新行为：经验已列正常萎靡X/X+1、牌挡敏捷/脆弱、毒雾轮初、第三轮能量和朝向，但油灯特定首次负面放大与显示意图再次取整缺少联合验证。独立实现任务先核当前源码及实际live祖先；已正确的子公式给duplicate与真实源码commit，有缺口才基于冻结实帧实现。禁止把拥有能力、模拟零胜率或预期下一轮伤害计成已兑现。

证据：NHA2KW0RB7VP A10 F33 T1首次普通X1萎靡实−2力/2弱，六试一致；F17首毒5→10。K3676LU8B0UH A1 F30 T2带毒刺击4→8，SADL3CGYTGSR A7 F45毒药5→10；五持有局中三局17直接窗口，0反例；目标退场重排排除、不当反例，其他状态/零X/叠层不外推。NHA2KW0RB7VP F33 T2同ENLARGING_STRIKE_MOVE、−2力/1弱，爪正面1→后方2，火箭30→20；首试15挡损7，原预测6；第二试16挡损6，原预测5，只一局六窗口，不推通用取整顺序。F17 T1精确切击七/六/五手1/3/5，实5，原四攻估27实31差4；不把额外施毒10全归本牌。

兑现边界：NHA2KW0RB7VP F19 T1步法+2敏、防御5→7；F30 T6建敏前后已有8挡不变。蟹六试无步法施放、毒雾均T4才建而无T5；末轮两毒药实结12，329→317。F33末T4残影+基础8/脆弱0.75实6挡，4能量已支付五张牌仍死；不得预支常驻能力/格挡。佩尔之肉本局六房11尝试窗口T1/2/3为3/3/4、加旧七局33共44，SL不是多局。抱抱先生首试T1小刀后敌404、T2两侧各扣2到400；开场20缺分项帧，不拆成伪精确值。仪式兽T4攻击165→159跨160阈值停攻、九轮赢损40；后段仍须实际挡与存活。

拟合：不引入经验阈值或自由拟合参数。逐帧验证算术/时点，窗口分母与独立局分母分开；先用旧历史局冻结机制，再留新NHA2KW0RB7VP作样本外数值回放。输入来自本批states/decisions及lamp-history.json，不跑boss模拟池。

缺数据：原运行树b8ca9311+dirty不可还原；油灯其他负面/零X/升级萎靡/叠层、朝向其他力量/招式/取整顺序无足够对照。缺完整早建能力、提前留药/喝药的整战胜线。保留现有生产规则，未证实项目waiting；无独立胜因，不因局部多4/少1伤宣称救局。

验证与预期影响：按run/floor/turn保存固定夹具，联合核目标当前力量、虚弱、后方状态、费用、实际HP/挡/毒。核失败方已取整显示1不能再floor(1×1.5)冒充实际2。新增可复现夹具而不改测试预算，原沙箱tsc/vitest通过；各子项给实际处置，非静默和未观察进阶回归等价。

回退：独立源码commit可按文件恢复到实现前live基线，保留当前经验/账本/原失败历史。实现和合入由strategy-proposal完成；本任务仅改经验，提案pending，不冒报implemented或shipped。

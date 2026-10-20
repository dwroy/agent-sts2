# 本批策略提案及逐项处置

记录时间：2026-10-20T17:16:42+08:00。角色 Silent，已观察 A10。批次 20261020-164301-strategy-proposal；基线 335764ba5c77a985d1874782424de25ff697c791。

本批只处理领取的十个原 ID，不新建同义提案。十份原 Markdown 已完整读回并核登记 SHA；七份原路径缺失的材料从保留归档按精确成员与原 SHA 取回，详情 proposal-restored-copies.json。

## 窄实现：猎杀者的神化升级和次轮抽牌

关联 silent-proposal-89354805ee4d7e77 / silent-proposal-283a164780d11e69；原账本 silent-0237、silent-0238；来源及实现任务均为本批 strategy-proposal。Roy-2026-10-07-learning 仅提供授权。

- VLZ6CCT8AQ0A A10 F43 T1，states 275679→275680：agent_view.combat.draw 的猎杀者条目从2费/15伤变为2费/20伤，run.deck仍普通15伤。原手牌神化花2能、后续真实抽入升级牌另见原行。分组投影不是完整卡实例身份，也没有确定抽序。
- 同局 F36 T1，states 275598→275599、decisions269629：升级猎杀者花2能，活体盾46→25（21实伤，力量1）；DRAW_CARDS_NEXT_TURN_POWER 0→2。F37 T1 275624→275625：23伤，仍建立2。F45 T4 275745→275746：普通虚无猎杀者17伤，花2能、建立2；不由此推断虚无牌的神化升级交互。
- Jev 27070 完整 request/answers 已读。其精确 decision_id=4a89a2ef-4e48-46de-8b36-b9109cbe687e 对应 decisions269626，原答plan2；269629才执行猎杀者。原chosen/result均completed，gate_reject/selection_dispatch字段缺失；不能把首动作当整线已执行。逐步后果及原始来源见 question-audits.json、decision-chains.jsonl。

旧行为：猎杀者不在本角色神化转换表；模拟可保留普通15伤且标升级未知。既有卡牌和原生待生效抽牌能力均未进入后续轮抽牌数。新行为：仅Silent A10、已观察的2费/15→20基础伤模板，普通未改数值或未知附魔升级保持未知；已观察直接施放在后继轮兑现2张，不立即抽牌、不永久加抽牌。原生待生效2层也沿角色/进阶门读入。

不新增必打、拿牌优先级、药水价格、SL阈值或胜率常量。没有对局回放调用LLM或网络。铁甲及未观察进阶保持原路径；重放、未知附魔、其他待生效层数与组合交互不作为新验证结论。单局各帧相关，不能增加独立分母；固定合成牌堆只检算法传递，不是自然收益。

验证：六个固定测试覆盖当前20伤/零即时抽牌、下一轮+2且再下一轮恢复、后续牌堆升级、原生2层读回与角色/进阶隔离、实际21伤/2费/待生效2的原帧及不支持输入。显式撤四份生产源码后exit1，恢复exit0；red-green-final.json保留最终原字节SHA。

所有发现帧都属于开发/回归样本，不冒称独立盲测。下一独立Silent A10完局需核实际Jev题面/派发/后继抽牌，再分开核live消费与自然收益。回退为回退本批窄源码提交；父提案、原证据和失败日志保留。

## 原ID逐项处置

### silent-proposal-89354805ee4d7e77

来源局：VLZ6CCT8AQ0A；账本：silent-0237,silent-0238。

本批补齐猎杀者的窄升级/次轮抽牌路径，尚须独立 live 集成；本战实际施放的持续身份、跨 SL 读回及其他未知升级/附魔交互仍未完成，不能关闭神化宽提案。

### silent-proposal-f2bfceddb1898dca

来源局：VLZ6CCT8AQ0A；账本：silent-0106,silent-0019,silent-0201。

仍缺同一完整冻结随机池、同起点/同总预算 MC 配对及成熟度曲线；707ms/1样本只证明该题退化，不能拟合新预算、药价或目标顺序。

### silent-proposal-283a164780d11e69

来源局：VLZ6CCT8AQ0A；账本：silent-0237,silent-0238。

与89354805为同源经验链；窄源码实现不代完整神化传播/实际施放身份和跨SL消费者校准，尚无本批实际live祖先提交，不登记duplicate。

### silent-proposal-ebbfe3b97548756d

来源局：VLZ6CCT8AQ0A；账本：silent-0005,silent-0016,silent-0049,silent-0071,silent-0143,silent-0046,silent-0053,silent-0027,silent-0011,silent-0021,silent-0106,silent-0204,silent-0020,silent-0019。

仍缺十五子项属性、升级与状态期限组合，以及战斗/路线/休息消费者的联合固定校准；现有子机制及本批猎杀者窄改动不能替整个复合提案验收。

### silent-proposal-e5b87be50f28f311

来源局：8JRE1C4H4Z2W；账本：silent-0079,silent-0021,silent-0125,silent-0018。

本批原文证实首/三试T2多12血换7伤；历史无统一跨抽牌、重问、选牌、药水、SL的候选持续ID；现有single_action_receipt不认证整候选收益，原规则保持。

### silent-proposal-49632bc4878fb597

来源局：CA5KE8GFJ9X2；账本：silent-0005,silent-0231。

CA5 F13可核蚌力量8/19攻受弱降14且成长未取消，但本局没有正敏捷实测；力量、正负敏捷、弱与独立成长四路径尚缺联合生产校准。

### silent-proposal-66532328a585941f

来源局：5PM6JAQG6FNQ；账本：silent-0021,silent-0009。

5PM F39末试冒泡对无毒目标实扣1能而未施毒；缺同起始HP、牌组、药水及完整抽序的启动顺序整战配对和收益函数，不拟合启动阈值。

### silent-proposal-43a76a31ba7bdcfa

来源局：61E2QS63Y9WU；账本：silent-0030,silent-0027。

61E F17 T6双防御各3及17+16毒可核；本房首试胜，没有同起始HP/构筑/抽序的另一完整可核SL线路，不改SL范围、阈值或换线偏好。

### silent-proposal-5264153a4a4b0e5c

来源局：61E2QS63Y9WU；账本：silent-0039,silent-0209。

61E F23 T4本体线47伤/15损可核；幻象2血仍活至T5，缺另一目标序后继及召唤/航行/复现/退场全链生产配对，不设固定首杀。

### silent-proposal-bddfa690a84e03d0

来源局：DUZUBAJ3A8GP；账本：silent-0128,silent-0079。

DUZ F30 T4派发先pending后状态确认生存者8挡；T6力量4/22攻可核；四次相关失败缺同抽换序的完整后继与失血唤醒/眩晕接续全链校准，不能拟合血价。


## 最终发布状态

最终四份生产源码与 red-green-final.json 的 SHA 一致；六测试撤回5失败/1通过，恢复6通过。额外抽牌兑现后，预测的 DRAW_CARDS_NEXT_TURN_POWER 也同时清除；其他角色的原生未覆盖能力保持原样。

原 test-sandbox.sh 的 tsc=0；Vitest 5078通过、1失败（572文件中571通过/1失败），整体exit1，因此 paths.test.ts 尚未执行。唯一失败为未改动的 content-store.test.ts:59；撤回本批四份生产源码后同一断言仍失败，清理前截获的固定fixture回执明确EXDEV。未修改固定排除名单、未绕过失败、未提交源码。

另有原ops明确W3-805 hold和186个本批以外main/live源码/知识差异，不能整支合live。review-final.patch为可审查的六文件补丁；source_commit/merged/release_id均无。原提案继续waiting；工作树保留暂存源码，待原ops处理宿主全检及精确运输，不申请完成回收。

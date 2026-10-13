# 本批十项策略提案复核

记录时间：2026-10-13T09:32:53+08:00。
基线：0c020b7cedfb9290cabe91bedb1038afdcacbd53。工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302。本批是普通代码提案消费任务，不是专题研究或implementation_request；只处理派发十个原id，不新增或改写原提案id。

本批未发现可用冻结实盘输入证明的新增数值实现缺口。已有有限实现与未验证完整范围分别记录，十项均waiting；不把缺获胜反事实当作确定性机制修复的一律障碍，也不拿确定性子项当完整策略/宽机制完成。
固定证据、账本及源码身份见report.md、verified-facts.json、evidence-manifest.json、source-provenance.json；只分析六个派发silent A10局。不使用其他角色知识、游戏二进制或预训练游戏结论。
Roy-2026-10-07-learning提供规则修改授权，未提供游戏事实；本批证据不足以支持新预算、血价、护栏、留药、SL或启动常量。

## silent-proposal-89354805ee4d7e77：神化传播与施放分账

角色/范围：silent、A10。来源任务：postmortem；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0237, silent-0238。证据：VLZ6CCT8AQ0A F35/F43/F45 T1，decisions269598/269706/269707/269748，states275564/275565/275679/275680。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；本批原字节副本：silent-proposal-89354805ee4d7e77.original.md，已核SHA等于队列登记值。

本次处置：waiting。A10已观察升级的有限传播与候选事实已存在；actual_cast_this_fight仍为null。缺跨抽牌/药水/选择重规划及SL重置的实际施放追踪消费者夹具，未取得原局dirty知识/移动表完整冻结；不能把有限升级源码当整项完成。

既有规则/预期行为：保留本角色现行选择结果；用F35及F43已观察对牌验证同线、具体后抽、已升级不累加、未知保持；另保存F45未施放/弃神化轨迹。未来追踪须在同局同尝试边界关联派发与后帧，缺帧保持未知。

反例/限制：F43施放仍损57，F45未施放且败不是因果反例；确定性机制补齐无需等待胜局，但整战收益不能由这些帧推出。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-f2bfceddb1898dca：药水MC预算与三骑士时钟

角色/范围：silent、A10。来源任务：postmortem；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0106, silent-0019, silent-0201。证据：VLZ6CCT8AQ0A F45 T1/T4/T5，decisions269748/269754/269770/269779，states275722/275754。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；本批原字节副本：silent-proposal-f2bfceddb1898dca.original.md，已核SHA等于队列登记值。

本次处置：waiting。原题药水MC707ms、1/12与rollout一轮一样本已核，成熟度字段已有live子项。缺同起点同种子同总预算的分阶段MC对照、样本稳定性曲线和原运行模型冻结，不能设新预算常量、留药价或杀序。

既有规则/预期行为：保留本角色现行选择结果；固定盘面与模型/知识输入、随机序列后比较现有MC先行和分阶段MC；分别记录总时限、有效样本、未建模项及候选稳定性，相同推演值并列。

反例/限制：第二问269754已换牌且12/12，不是同盤预算实验；F45 T4未选高伤线，死亡不能证明少损线错误。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-283a164780d11e69：神化经验来源链

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0237, silent-0238。证据：VLZ6CCT8AQ0A F35/F43/F45 T1，与89354805ee4d7e77共享已核帧。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；本批原字节副本：silent-proposal-283a164780d11e69.original.md，已核SHA等于队列登记值。

本次处置：waiting。与89354805ee4d7e77共享神化问题，但保留独立experience来源链。有限升级已有，实际施放/中断追踪尚未完整覆盖，没有整项实际live源码commit，不能仅凭语义重复登记duplicate。

既有规则/预期行为：保留本角色现行选择结果；沿原两个id共用固定帧与后续验证，不另建id或另实现一次；独立核经验来源和运行事实消费者。

反例/限制：牌组持有、候选模拟升级与本战实际施放是不同事实；经验文字上线不替代源码实现。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-ebbfe3b97548756d：十五条机制及资源分账

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。证据：VLZ6CCT8AQ0A F43 T1—5、F44回血、F45 T1—5；decisions269726/269732/269773/269779，states275699/275705/275754。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；本批原字节副本：silent-proposal-ebbfe3b97548756d.original.md，已核SHA等于队列登记值。

本次处置：waiting。本批核到四段减力83→59、2力/3敏/勒紧4且覆甲耗尽、触媒2与12/16毒等现场子项。原提案覆盖15条机制/资源，缺逐路历史模型、期限/持有与未建立组件、回血/锻造反事实及完整消费者验证，不能以单个事实栏关闭整组。

既有规则/预期行为：保留本角色现行选择结果；按原15条账本分别冻结状态和实际调用输入，逐卡/逐击/期限比对；现有准确实现保留。资源只计实回与已到节点；不能由不同路线样本设安全线。

反例/限制：F43获胜损57、F44回血后仍败；暂时減力与开场覆甲不能预支整场，现场组件存在也不是整战收益。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-e5b87be50f28f311：SL与护栏的执行审计

角色/范围：silent、A10。来源任务：postmortem；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0079, silent-0021, silent-0125, silent-0018。证据：8JRE1C4H4Z2W F33首/三试T2、第二试T5、末试T11；decisions270216/270220/270264/270282/270286。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；本批原字节副本：silent-proposal-e5b87be50f28f311.original.md，已核SHA等于队列登记值。

本次处置：waiting。消费者可读原答plan1→SL plan2及原答plan4→护栏plan6，264个相邻观测区间保留。完整候选实际结果仍为null；缺中断后整线逐步核实和持续能力建立时点的完整运行消费者夹具，六试没有胜利对照，不改血价/护栏/SL阈值。

既有规则/预期行为：保留本角色现行选择结果；首/三试同指纹对比保留0/24与5/24的第三试同题预测、3/15实际净损和10/17净扣；继续区分请求/回执/端点/重问/完整执行，旧rationale不补写成旧结构字段。

反例/限制：首试原题原线为1/8死，第三试同题才是0/24对5/24；末试防御延长至T11仍败，不能一律否定防御替换。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-49632bc4878fb597：属性、虚弱及成长分项

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0005, silent-0231。证据：CA5KE8GFJ9X2 F13 T1/T3/T5；decisions267372/267381等，末轮2血10挡对14。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；本批原字节副本：silent-proposal-49632bc4878fb597.original.md，已核SHA等于队列登记值。

本次处置：waiting。本局证实力0/4/8及意图11/15/19、弱后14、末轮差2血；计划步法未取得，不能补正敏捷。缺正/负敏捷、逐击弱修正及独立成长四路统一固定调用与历史模型对照，单个步法实现不足关闭复合项。

既有规则/预期行为：保留本角色现行选择结果；按当前进阶、现场力量/敏捷/虚弱逐项冻结，机制样本分母分开；不加入统一保血或输出权重，其他角色保持等价。

反例/限制：弱后仍成长；本局没有正敏捷实测，不能挪用别的角色或预训练牌值。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-66532328a585941f：持有、计划与启动兑现

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0021, silent-0009。证据：5PM6JAQG6FNQ F39末试T2；另F33为组件已建立且胜的同局观察。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；本批原字节副本：silent-proposal-66532328a585941f.original.md，已核SHA等于队列登记值。

本次处置：waiting。末试零毒冒泡实际1能零效果已核，玩家29血而失落35血须区分；缺同起始资源、同抽序下另一完整启动或构筑线路的胜负/收益对照。实验体事实栏不覆盖失落/遗忘，不能拟合启动阈值。

既有规则/预期行为：保留本角色现行选择结果；先分列实际牌组、候选施放和已建立能力；未来冻结不同启动顺序的完整执行及资源结果，以局号分组而非SL次数扩分母。

反例/限制：同局F33已建立毒雾/触媒并赢与F39起始资源、敌人均不同，不作启动顺序因果。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷、毒与SL

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0030, silent-0027。证据：61E2QS63Y9WU F17 T5/T6/T7，decisions267610/267612/267616，states273502/273504/273508。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；本批原字节副本：silent-proposal-43a76a31ba7bdcfa.original.md，已核SHA等于队列登记值。

本次处置：waiting。吸取后力2→0、敏0→−2、敌力0→2与17+16毒已核。缺同起始HP/牌组/完整抽序下可救活的另一SL线路及历史移动/效应模型冻结；该战首试胜不证明应改SL范围、阈值或换线偏好。

既有规则/预期行为：保留本角色现行选择结果；按卡牌基础挡、现场负敏捷、覆甲、直接伤和逐次毒减层分账；SL偏好另需同盘完整对照，不将吸取与毒合成未经校准权重。

反例/限制：首试60血七轮胜只证明该路径已发生，不能据此推测另一死局同抽换线可救活。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-5264153a4a4b0e5c：召唤及各实体航行成长

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0039, silent-0209。证据：61E2QS63Y9WU F23 T1/T2/T4/T5，decisions267682/267686/267696/267699。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；本批原字节副本：silent-proposal-5264153a4a4b0e5c.original.md，已核SHA等于队列登记值。

本次处置：waiting。21血幻象实召、两个实体力0/3/6及T4本体线47伤/15损已核，幻象14→2仍攻击。旧living-summon子项已有，但缺A10历史召唤/航行模型、种子与另一focus后续完整对照，不能把旧提交当成长/排序收益整项实现。

既有规则/预期行为：保留本角色现行选择结果；分开验证召唤新增HP/行动、每个实体力量、死亡与index重排；保留全部目标，相同推演并列。未实打focus只保留预测。

反例/限制：另一focus幻象39伤零损未实打，不声称其能赢整场或强制首杀。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



## silent-proposal-bddfa690a84e03d0：甲虫睡眠、醒来及成长

角色/范围：silent、A10。来源任务：experience-update；独立实现任务：strategy-proposal；本批20261013-091302-strategy-proposal。

账本：silent-0128, silent-0079。证据：DUZUBAJ3A8GP F30末试T1—6，decisions269048—269077，states274993—275022。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；本批原字节副本：silent-proposal-bddfa690a84e03d0.original.md，已核SHA等于队列登记值。

本次处置：waiting。末试睡3/2/1、T4醒来、力0/2/4与攻击18/20/22已核，四试均败。缺醒来/眩晕接续的历史移动模型及同抽不同排序的完整稳定收益线路；毒杀石虫后的攻击下界是另一限定子项，不关闭成长/换线宽项。

既有规则/预期行为：保留本角色现行选择结果；按A10分别冻结睡层、受伤、醒来/眩晕、临时减力恢复、成长和当前伤害；用完整已知抽序比较目标序，不设固定杀序。

反例/限制：末试T4相对首试多扣3敵血且多损2玩家血；仅剩血量不能代表全死排序。

验证与拟合：本批仅观察/确定性端点复核，不拟合常量。上述已用于发现的帧不称盲测；未来以独立silent A10完局作时间后置验证，SL尝试不算独立局。

回退：本批未改生产源码，无源码可回退；后续新增实现须有各自固定夹具、撤源码失败/恢复通过及实际live源码提交，保留本批原证据和失败历史。



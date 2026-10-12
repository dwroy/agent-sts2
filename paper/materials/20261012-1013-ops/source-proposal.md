# 静默猎手本批提案与限定实现

本批20261012-092818-strategy-proposal只消费dispatch.json内十个原ID；无专题/冻结实现绑定。普通同步main后base=0478a90239003f23688bf95c1988dbf922804b1c。原提案逐字保存，未覆盖原文、未新建重复ID。

## 本次实现：a46bdb7fe711d79a的相邻观测审计子项

来源任务postmortem/20261007-174301-postmortem，实现任务为本批strategy-proposal；关联silent-0021/0027/0028/0085。角色silent，仅A10固定证据；授权Roy-2026-10-07-learning。此授权不提供游戏事实。

旧行为：离线auditSelectionExecution只在问题段中保留动作之前的HP/挡/能量和敌人能力，没有玩家能力、持有手牌及相邻观测区间。末轮没有新问题时，无法直接从该输出审计持有与建立的区别。

新行为：复用原离线消费者，为全部输入决策输出observed_intervals。两端均须时间/指纹唯一匹配且层/轮/屏幕一致，原决策行相邻、同层/SL尝试/重载、时间递增；跨轮仅结束请求→下一轮。输出原帧手牌、玩家能力、敌人HP/最大HP与能力；重问/选牌/跨轮分列，缺行/跨SL/不唯一拒连。actual_action_effect、完整候选结果始终未知，不认证未落盘动作或跨帧敌人身份，不合计跨阶段伤害。

证据为YF0LXT1QSTGG F48末试T3—T5，d271489—271509与对应21原帧；核心d271494/s277512→277513换相4→212并清毒，d271498→271499重问，d271499/s277517→277518触媒建2且敌无毒，d271507/s277525→277526敏捷5→6而既有23挡不变。原日志1062状态/1043决策已独立逐行比对，原字节offset/length/SHA保存在states-raw-offsets.json及decisions-raw-offsets.json。测试夹具只投影已核原字段，原整行保存在scratch。

反例：仅持有毒雾不代表建立；触媒建2但零毒不能记毒收益；前五次建毒雾/余像仍败；T5生存者pending虽有下一选牌帧也不视作完成；阶段换HP不能作负伤害；后取得敏捷不倒补已有挡。当前污染已含在敌意图，放弃“既有污染漏加”的假设，不修改模型。

预期影响仅是让学习者查到连续观测事实和未知边界。不上线游戏规则，不调整排序、护栏、SL/药水/终局参数，铁甲及其他进阶无在线变化。完整因果与策略收益仍无证据；十个宽提案均waiting，不把子项交付标为整项implemented。

验证：固定21帧及负例检验；撤掉生产审计源码测试应失败，恢复通过；CLI对本批完整YF限定层输入验证真实JSON消费者；源码提交前原沙箱入口；合live前刷新/冲突预检、合后原入口。无LLM/网络/刷新知识依赖。仅一局发现/固定回归，不拟合权重，不把六次SL当六局；其他五派发局仅验证各自原提案证据，未作为独立策略盲测。

回退：若合入则revert本次四文件审计源码提交；保留原日志及历史产物，无游戏规则/经验数据需回退。不得改原提案与账本历史；shipped由ops核实际live登记。

## 十个原ID逐项处置

### silent-proposal-c20b5139dd0dff71

- 账本：silent-0168。
- 已核证据：DUZUBAJ3A8GP / F27 / T4—T6。污染0→3→6及0→6→12→18、下一轮清空；T5实损9。
- 反例/限制与处置：当前意图已经含既有污染，不能初始化再次加价。缺固定A10移动输入下毒/挡/污染联合消费者校准及完整替线后继。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c，本批核对相同。

### silent-proposal-ae9e692d680e3819

- 账本：silent-0183, silent-0005。
- 已核证据：5PM6JAQG6FNQ / F39 / T4—T6。力敏各−4；毒杀失落后返4力。
- 反例/限制与处置：缺遗忘死亡返敏、多来源抢夺和临时属性混合返还隔离帧；不能推固定击杀顺序。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5，本批核对相同。

### silent-proposal-52f1e1bd2e7db0ed

- 账本：silent-0231。
- 已核证据：CA5KE8GFJ9X2 / F13 / T1—T5。力量0→4→8，喷11/15/19，弱后11/14。
- 反例/限制与处置：缺覆甲减层条件隔离及固定A10移动表联合重放；首样本读取只覆盖子项。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376，本批核对相同。

### silent-proposal-6dd8bbff876be528

- 账本：silent-0233, silent-0209。
- 已核证据：5PM6JAQG6FNQ / F38 / T2—T4。召唤电击力量0→2→4，攻击17→19。
- 反例/限制与处置：缺同种重复召唤身份隔离、完整敌方行动时序与生成到消费者验收；未选杀序无完整后继。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5，本批核对相同。

### silent-proposal-578e415a259e6835

- 账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。
- 已核证据：8JRE1C4H4Z2W / F33 / 首试与第三试T2。相同指纹，实损3/15、本体净扣10/17；两线均无完整胜局。
- 反例/限制与处置：旧预测审计及单步派发已上线；跨重规划完整动作、能力与实际轮末资源归因仍未齐，缺受控整战胜线。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a，本批核对相同。

### silent-proposal-c0767768bf6a7ab1

- 账本：silent-0079。
- 已核证据：YF0LXT1QSTGG / F48 / 第二与第三试T1。同指纹实损0/9、扣45/38；第六试恢复挡仍败，F33有SL成功反例。
- 反例/限制与处置：旧资源比较和单步派发已上线；覆盖重放/弃牌续步完整执行验收及受控整战后继仍缺。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb，本批核对相同。

### silent-proposal-a46bdb7fe711d79a

- 账本：silent-0021, silent-0027, silent-0028, silent-0085。
- 已核证据：YF0LXT1QSTGG / F48 / 末试T3—T5。换相4→212清毒；触媒建2时零毒；五敏23挡后第三小刀加至六敏，挡仍23。
- 反例/限制与处置：本批补相邻观测区间、持有/能力快照与缺帧拒连子项；完整执行归因和同资源整战后继仍缺，不能改候选排序。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6，本批核对相同。

### silent-proposal-1044224808015e5c

- 账本：silent-0079。
- 已核证据：XP2SL33HT0D9 / F33 / 首/二试T3及首/末试T1。两对实损9/14与2/10，本体净扣24/27与25/34；手里剑成长也变化。
- 反例/限制与处置：旧候选及单步派发已上线；缺同抽序/成长后继和独立整战胜线，不启用固定低损血优先。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5，本批核对相同。

### silent-proposal-7cbc6005db712ba9

- 账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。
- 已核证据：XP2SL33HT0D9 / F33 / 末试T2—T5。轮初14挡、临时减力0→−9→0，激光57→38→28；仍失败。
- 反例/限制与处置：缺额外触发隔离及抽弃重规划到完整能力兑现的联合验收；已有公式子项不代表整项完成。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291，本批核对相同。

### silent-proposal-c59f592f1427a67e

- 账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。
- 已核证据：YF0LXT1QSTGG F48 T1/T4/T5；XP2SL33HT0D9 F33 T1—T5。同指纹血价、分阶段及临时属性事实分别核验；SL不算独立局。
- 反例/限制与处置：预测和单步派发已有实现；本批相邻观测也不证明完整资源、恢复链、能力因果及受控胜线，综合提案保留。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2，本批核对相同。

## 本次实现结果

有限离线审计源码：07192e6faf1da89c2719e22b3e0c280617795f22。撤源码7红/恢复7绿；原沙箱tsc0、327文件3238例、gitleaks0。live保存刷新01ef3b632542bd43aae03af1fab1e097ba72e45d后，预检三处记录冲突而停止，未执行源码merge。完整十项仍waiting；详见report.md及merge-receipt.json。

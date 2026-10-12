# 静默猎手派发提案逐项核验与实验体现场事实子项

记录时间：2026-10-12 10:27:17 CST。

批次：20261012-101301-s2-strategy-proposal；角色 silent；基础提交 21c4dd79d97c9d614390a6e5abba048dacf8dc4e。普通10提案批次，没有 research_request/implementation_request；main 合并为 Already up to date。

本批六局均已核 runs.jsonl 为 SILENT/A10；10份原提案 SHA 全部相等。只处理已派10个id，原件逐字保存为 *.original.md。未改原提案、根请求或learn.json。

## 实现范围

原提案 a46bdb7fe711d79a 的现场事实子项，兼关联 c59f592f1427a67e。旧题面有阶段结束参考、分散的牌/能力信息；新增 test_subject_current，分列牌组/手牌持有数、已建触媒/毒雾、当前阶段HP与毒、现挡/现敏捷。只有当前毒0且触媒>0才提示当前无现存毒可追加结算；历史已兑毒伤为null，绝不由当前毒层数倒推。阶段变化后按当前帧读取，后得敏捷不倒补既有挡。

范围仅本角色已观察A10/F48、单个存活实验体、ADAPTABLE=1、最大HP为已见111或212；这是展示适用范围，不是敌HP替换表。其他角色、进阶和未见阶段保持等价；当前HP/伤害数据库与房间代价五样本门槛不变。所有候选、数值排名、SL和必死行为保持；不调用LLM/网络。

原帧夹具7帧：277512、277513、277518、277519、277521、277524、277526。T4/277513实际planCombatTurn两种题面到达Jev问答状态且所有criteria相等；T5/277519当前隔离配置返回代码only-line，明确不声称该帧自然进入Jev题面，自动决策保持相等。自然阅读/采用/收益未验证。

拟合与时间切分：不拟系数、不改排序。本局6次是同存档相关尝试，仍计1局；本批发现帧仅作确定性回归。未来新A10局按时间后置验证完整执行链和实际采用，不把本批当盲测。

验证：冻结原始数据，屏蔽刷新知识读取，空固定monster DB，禁用rollout/B2，只检验事实传输而不校准战斗模型。撤题面接线后2项消费者测试失败、恢复后2文件25项通过。完整沙箱检查结果及最终commit/live见report.md。

回退：若实际上线，revert本次源码提交即可去掉新增事实字段；保留原始记录/失败日志/账本，父提案不关闭。不根据新增展示声称量化或整战策略已完成。

## 逐项处置

### silent-proposal-c20b5139dd0dff71

证据：DUZUBAJ3A8GP F27 T4–T5；silent-0168。

本次核验：原帧274830–274839：T4污染0→3→3→6，T5为0→6→12→18→0；力量与本体毒/挡收益必须分列。

反例/限制：技能还提供毒与挡，单次9损不能证明少出技能更优。

处置：waiting。已有逐技能tainted及逐击计算路径；缺冻结A10移动输入下毒/挡/污染联合消费者校准和完整替线后继，保留选择规则。

原账本：silent-0168。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-ae9e692d680e3819

证据：5PM6JAQG6FNQ F39 T4–T6；silent-0183、silent-0005。

本次核验：原帧274351→274358玩家力量−4→0，与失落毒死返还对应；原提案记录两步法与敏捷恢复不同。

反例/限制：毒杀失落后仍可能死于遗忘攻击；不推出固定击杀序。

处置：waiting。缺遗忘死亡返敏、多来源同种抢夺与临时属性混合返还的隔离帧，不能将现帧负属性处理当完整逐实体归还模型。

原账本：silent-0183, silent-0005。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-52f1e1bd2e7db0ed

证据：CA5KE8GFJ9X2 F13 T1–T5；silent-0231。

本次核验：原帧273238/273252/273263力量0/4/8；原提案喷水11/15/19、虚弱后11/14。

反例/限制：覆甲现场9/9/8/7/6不等于减层条件已完整隔离。

处置：waiting。首样本当前进阶HP/攻击读取子项不代表加压/覆甲全项完成；缺固定A10移动表联合重放与覆甲减层条件隔离，不修改房间代价五样本门槛。

原账本：silent-0231。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-6dd8bbff876be528

证据：5PM6JAQG6FNQ F38 T2–T4；silent-0233、silent-0209。

本次核验：原帧274307/274308/274313电击力量0/2/4；T3仍贡献17攻击，T4才结束。

反例/限制：先杀爪牙候选35伤/损3未完整实打，不能声称能救后场。

处置：waiting。已有HIGH_VOLTAGE_POWER增长入口；缺重复召唤实体身份隔离、完整行动时序消费者验收和另一杀序后继。

原账本：silent-0233, silent-0209。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-578e415a259e6835

证据：8JRE1C4H4Z2W F33首/三试T2；silent-0079、silent-0021、silent-0125等原12项。

本次核验：decisions270216/270282同指纹；states276208→276212与276274→276278实损3/15、实扣10/17。

反例/限制：换防御可少损却仍败；六次尝试不当六局，候选续步不当实际整轮。

处置：waiting。预测与单步派发回执已有子项；跨抽弃重规划完整动作序列、能力建立/轮末资源链未验全，不能改探索规则。

原账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-c0767768bf6a7ab1

证据：YF0LXT1QSTGG F48二/三试T1；silent-0079。

本次核验：decisions271309/271348同指纹；states277327→277337与277366→277373实损0/9、实扣45/38。

反例/限制：末试恢复挡后仍败；F33曾SL成功，不能一概禁止探索。

处置：waiting。单步回执不能闭合覆盖重放、弃牌续步至整轮的资源比较；完整后继与受控胜线仍缺。

原账本：silent-0079。来源任务：postmortem → strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-a46bdb7fe711d79a

证据：YF0LXT1QSTGG F48末试T3–T5；silent-0021、silent-0027、silent-0028、silent-0085。

本次核验：states277512→277513由4/111血、4毒变212/212血、0毒；277519触媒2/毒0；277524→277526敏捷5→6而挡23不变。

反例/限制：前五次已建立毒雾或余像仍败；持有毒性爆发不等施放，更不证明强制能力先手。

处置：waiting。本批实现有限现场事实题面子项；完整持有→建立→分阶段结算→实际派发审计及同资源后继仍缺，父提案保持waiting。

原账本：silent-0021, silent-0027, silent-0028, silent-0085。来源任务：postmortem → strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-1044224808015e5c

证据：XP2SL33HT0D9 F33首/二试T3及首/末试T1；silent-0079。

本次核验：决策271992/272040同指纹实损9/14、实扣24/27；271982/272195同指纹实损2/10、实扣25/34。

反例/限制：末试T1同时建立1力量；后期抽序不同，不能只按当轮血价判定整战优劣。

处置：waiting。缺相同抽序、成长后继和独立整战胜线，不能启用固定低损血优先；单步回执已有实现不等整条探索规则完成。

原账本：silent-0079。来源任务：postmortem → strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-7cbc6005db712ba9

证据：XP2SL33HT0D9 F33末试T2–T5；silent-0021、0005、0007、0063、0065、0241、0242。

本次核验：states278236/278237/278242爪力量0/−9/0，T2轮初14挡；278249/278252/278254火箭57→38→28。

反例/限制：临时减力不保持到次轮，步法已建立仍可失败；未验证额外触发不能填成模型条件。

处置：waiting。需额外触发隔离以及抽弃重规划到实际兑现的联合验收；本批未改变朝向/减力/轮初挡模型或优先级。

原账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。来源任务：postmortem → strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

### silent-proposal-c59f592f1427a67e

证据：YF0LXT1QSTGG F48与XP2SL33HT0D9 F33；原22项账本见assigned-proposals.json。

本次核验：两局上述同指纹血价、阶段清毒、临时减力、轮初挡与后得敏捷均按原始帧复验。

反例/限制：多次SL仍属每局内相关尝试；全败不是固定策略系数证据。

处置：waiting。本批实验体现场事实为共同有限子项；完整实际资源、能力兑现、恢复链与受控胜线仍缺，父提案保持waiting。

原账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。来源任务：experience-update → strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md。

预期与验证：按原文固定现场、当前进阶输入和后继逐步核验；仅有单帧或候选差值的部分不得外推完整因果。保留全部选项、并列按相同推演值标明。

## 证据与过程材料

raw-verification.json保存来自根logs的逐行偏移/字节长/SHA；1062状态、1043决策均与旧定位材料逐条相等。evidence-verification.json保存4组同指纹当轮血价及6类机制断言。本批没有读取或声称覆盖静默全历史。

首次临时打印将available_actions字符串当对象，发生AttributeError；证据断言已通过，修正只读打印后继续。消费者初稿误以T5必问Jev，三次保留失败日志；补牌型未改变结果，最终定位为真实code/only-line，改用T4原帧验证真实问答，并单列T5自动分支等价。未改生产分支去迎合测试。

账本补充（2026-10-12 10:28:57 CST）：仅经根 ledger.py add 登记有限代码子项 silent-0424，status=proposed；原四账本及原a46/c59提案保持关联，原父提案不据子项关闭。

工程缺口与证据缺口分开：候选冻结、联合重放、跨重规划审计是尚未交付的工程验收，不能统称“等新局”。具体未观察数据另列为多来源返还隔离、同种重复召唤身份后继、覆甲减层隔离与同入口完整替线/受控整战结果。本批仅交付实验体现场事实子项，没有把这些宽项工程验收假记成功。

源码提交（2026-10-12 10:36:49 CST）：aad2700abed6dff1d66e87fb36aaa6fedb39adf3；仅4个源码/固定夹具路径。提交前原沙箱入口tsc0、328文件3262项＋fork1文件11项，总3273项通过；gitleaks0。撤码2项失败、恢复25项通过。live结果以report.md为准。

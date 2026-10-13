# 本批十项已领取提案核验

批次：20261014-024303-strategy-proposal；角色：静默猎手；证据范围：本批六局，均SILENT/A10。
来源与实现任务沿各原提案保留，本次为strategy-proposal续办，不领取其他id。
基线：`970489e268d9f99c27d73cf8bdd5eb9782789801`。原Markdown逐一核SHA并保存原字节`.original.txt`，未修改或重建重复id。

本次逐项waiting；没有新增策略参数、源码实现、知识入库、live合入或版本。所有SL配对只算同局内观测，未执行后继不能当获胜反事实。

## silent-proposal-c20b5139dd0dff71：感染棱柱污染与技能收益

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256 `bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c`。
- 既有账本：silent-0168；原领域：combat。
- 已复核证据：DUZUBAJ3A8GP F27 T4—6：火花3→6；T4污染0→3→3→6，T5在弃牌选择完成后6→12→18，次轮消失；49→46→37血。
- 反例与边界：能力勒紧不加污染；迷雾有施毒收益，未执行替线不能当胜局。
- 处置：waiting。缺该局实际使用的冻结A10移动表，以及火花增长、污染、迷雾施毒和格挡的联合生产回放；替线后继未实打。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定T4/T5原手牌、火花、移动表与实际前缀，穿过弃牌选择再比毒/挡/血；不能用现时刷新表冒充历史输入。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-ae9e692d680e3819：抢夺来源与死亡返还

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256 `b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5`。
- 既有账本：silent-0183, silent-0005；原领域：combat。
- 已复核证据：5PM6JAQG6FNQ F39 T2/T4/T5/T6：玩家力敏−2/−2后−4/−4；首试失落退场后力量回0，遗忘T6再夺敏捷。
- 反例与边界：末试失落毒死仍8血0挡对遗忘19而死；没有遗忘死亡返敏的连续帧。
- 处置：waiting。缺遗忘死亡返敏与混合来源返还后同轮续牌的连续证据；失落返力端点不能证明双属性同轮归源。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：逐实体冻结抢夺、归还和重抢，独立比对负力敏、死亡先后及续牌；不设固定击杀序。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-52f1e1bd2e7db0ed：下水道蚌加压与当前进阶事实

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256 `651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376`。
- 既有账本：silent-0231；原领域：combat。
- 已复核证据：CA5KE8GFJ9X2 F13 T1/T3/T5：力量0/4/8、喷水11/15/19；现场覆甲9/9/8/7/6，末轮2血10挡不足。
- 反例与边界：虚弱只降低当轮伤害；覆甲现场递减不证明全部减层条件。
- 处置：waiting。首样本HP/攻击读取已有；缺历史A10移动表及加压、虚弱、覆甲来源隔离的联合生产回放，未观察减层条件不补规则。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定当前进阶HP/招式/力量与弱，保留ROOM_COST_MIN_N=5，覆甲条件以独立观测验收。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-6dd8bbff876be528：高电压实体成长与召唤

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256 `48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5`。
- 既有账本：silent-0233, silent-0209；原领域：combat。
- 已复核证据：5PM6JAQG6FNQ F38 T3/T4：23上限电击机器人力量2→4、攻击17→19；敌列表index4→3，T3实损30，T4才清掉。
- 反例与边界：index重排不代表新实体；未实打先杀候选不能声称必保27血。
- 处置：waiting。缺同类型新旧召唤者的连续身份隔离与历史召唤模板/移动表输入；已有growth路径不能验证替换实体不继承旧成长。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：区分移动index与身份，冻结新旧实体及召唤首轮模板，跨两轮检查成长；不得造新召唤证据。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-578e415a259e6835：沙虫能力、候选与资源宽审计

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256 `e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a`。
- 既有账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016；原领域：combat, sl, structure。
- 已复核证据：8JRE1C4H4Z2W F33 首/第三试T2同指纹：损3/15、扣10/17；末试T11已有步法/余像仍5血22挡对37，24毒结后敌130。
- 反例与边界：末试防御替换延至T11仍死；F17 T6抽牌后重规划，候选省血不是实际收益。
- 处置：waiting。缺跨抽弃牌重规划的完整候选执行归属、逐来源累计兑现及SL恢复资源联合分账；且原提案金刚杵→silent-0016关联与该账本当前覆甲claim不一致。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定首/第三试T2、第二试T5、F17 T6、末试T11，分列前缀/续牌/终局截断/恢复，核对经验与账本真实归源。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-c0767768bf6a7ab1：实验体全败SL实际血价

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256 `28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb`。
- 既有账本：silent-0079；原领域：sl, combat。
- 已复核证据：YF0LXT1QSTGG F48 第二/第三试T1同指纹：损0/9、扣45/38；两候选24/24死，原答后续格挡被截断。
- 反例与边界：第六次恢复格挡后T1零损仍T5死；第四试T5候选在弃牌后未完整执行；F33有SL成功。
- 处置：waiting。缺完整候选执行归属，以及同起点、抽序和资源预算的独立完整尝试对照；已有候选/单动作回执不能证明整线完成或新探索规则有效。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定原答/换线/覆盖重放与已派发动作，跨弃牌重新规划闭合整线；后置独立A10局验证策略。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-a46bdb7fe711d79a：实验体阶段与能力兑现

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256 `eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6`。
- 既有账本：silent-0021, silent-0027, silent-0028, silent-0085；原领域：combat。
- 已复核证据：YF0LXT1QSTGG F48 末试T3→T4换212血新阶段且旧毒消失；T5触媒2、敌零毒；5敏捷先建23挡，第三刀后敏捷才5→6，挡仍23。
- 反例与边界：前五试已建毒雾/余像也失败；零毒触媒本帧0收益不证明其他施毒续步无价值。
- 处置：waiting。当前阶段与零毒触媒已有事实消费者；缺逐来源累计毒伤/格挡兑现及跨重规划候选归属，不能用本帧零毒关闭整阶段请求。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定阶段切换、实际施毒、已结算量、敏捷获得顺序及抽弃牌截断；不预支未来毒或倒补旧挡。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-1044224808015e5c：双蟹零胜并列探索血价

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256 `4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5`。
- 既有账本：silent-0079；原领域：combat, sl。
- 已复核证据：XP2SL33HT0D9 F33 首/第二试T3同指纹：损9/14、扣24/27；首/末试T1同指纹：损2/10、扣25/34，手里剑成长另列。
- 反例与边界：末试T2靠镣铐与朝向实零损；各尝试后继抽牌/出牌不同且均败，不能用回合数归因。
- 处置：waiting。当轮两组血价已核；缺整线执行、成长净贡献和独立后置A10双蟹整战对照，不能从零胜/零差拟定排序或血价权重。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：固定两组同轮净损/进度/永久成长，按run_id划发现与后置验证，不填全局HP惩罚常数。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-7cbc6005db712ba9：双蟹朝向、临时减力与轮初挡

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256 `f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291`。
- 既有账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242；原领域：combat。
- 已复核证据：XP2SL33HT0D9 F33末试T2轮初14挡、镣铐爪0→−9力、斗篷后20挡；T3恢复0力；T4火箭57→转向38→虚弱28，4敏脆弱偏折6挡。
- 反例与边界：两侧均存活，不能外推单侧死亡规则；额外格挡来源和未知混合条件未全部隔离。
- 处置：waiting。局部机制已有模型；缺额外格挡来源隔离与混合意图/未知条件下的联合候选消费者验收，单项公式不能代表完整提案实现。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：冻结57/38/28、14+6、0/−9/0、脆弱格挡、未结算毒与死亡先后，未知/额外来源条件保持未知。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

## silent-proposal-c59f592f1427a67e：综合机制、路线资源与SL分账

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256 `81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2`。
- 既有账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242；原领域：combat, sl。
- 已复核证据：YF0LXT1QSTGG F48 T1/T4/T5及XP2SL33HT0D9 F33 T1—5：本批复核同指纹血价、阶段清毒、能力顺序、临时减力与轮初挡。
- 反例与边界：XP F31幻象复活中间帧不完整，活敌净血差不等于总伤害；SL恢复不算新取得药水或回血。
- 处置：waiting。缺全部组件的联合消费者验收、跨续问整线归属、逐来源累计收益及SL恢复资源分账；局部阶段/派发字段不关闭综合父项。
- 预期行为：补齐本项原有事实/消费者闭环；证据不足期间维持当前规则，保留全部选项和并列，不拟新排序、药水、必死/SL或终局参数。
- 后续验证：逐子机制建固定联合夹具，关联候选→选择→抽弃牌→实际前缀→终局与恢复；有界未知保留，不混独立样本。 如以后有实际生产改动，必须撤源码失败/恢复通过及原沙箱入口，再按live流程记录实际祖先、版本与双通知；本批没有进行这些代码测试。
- 回退：本批无生产改动可回退；CLI追溯追加保留原claim/status/version，未来实现按真实源码提交回退。

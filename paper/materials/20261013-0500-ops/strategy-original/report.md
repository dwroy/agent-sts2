# 静默猎手策略提案逐项复核

时间：2026-10-13T04:53:06+08:00。本批：20261013-044302-s2-strategy-proposal；task=strategy-proposal；character=silent。
工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-044302-s2。完整base：3061b18d2222fb1c754d07465cf2b7d9303b9008。

## 身份与范围

开工git status为空；普通队列本批reason=proposal，仅处理dispatch.json的10个proposal_ids，proposal_repair/research_request/implementation_request均不存在。根notes/strategy-research-silent.json仍绑旧20261010-150327批，不能转本批专题；没有本批research/implementation宿主回执。普通流程git merge --no-edit main返回Already up to date，HEAD未变。首次定位learn.json误输出了batches容器，随后改为精确字典索引，只保存和处理本批行，未领取其他项。

六个runs在根runs.jsonl逐行核为SILENT/A10，各一条；未读取其他角色知识。10份原Markdown逐字复制且SHA均等于队列注册值，30条关联账本已保存限定折叠快照；没有覆盖原提案或历史复盘，不新建重复id。

## 原始证据核验

复用前批有界定位索引，随后逐条从根logs原偏移重读字节、核SHA256、run/角色/层/回合，并重算资源差，不能只信旧报告。共8268条：states4062、decisions3941、SL38、brain188、run-plans33、run-config6；六局决策数分别265/638/602/659/1065/712，与runs记录精确吻合。另保存六条runs定位和六段本角色复盘。

本次细读目标状态986帧、目标决策972条。raw-evidence-index.json保存每条原偏移/长度/SHA；target-raw.jsonl保留目标原记录；state-facts.json、decision-facts.json、sl-facts.json是本次提取；verify-evidence.py及evidence-verification.json可复核。原旧日志972条目标决策没有selection_audit/selection_dispatch，这是当时日志边界，不当作当前代码回归或伪造新字段。

## 四组同指纹实付资源

| 局号 / 层 / 回合 | 原/替决策行 | 原/替玩家损血 | 原/替敌净扣血 | 替减原 |
|---|---|---|---|---|
| 8JRE1C4H4Z2W / F33 / T2 | 270216 / 270282 | 3 / 15 | 10 / 17 | +12血价、+7净扣 |
| YF0LXT1QSTGG / F48 / T1 | 271309 / 271348 | 0 / 9 | 45 / 38 | +9血价、−7净扣 |
| XP2SL33HT0D9 / F33 / T3 | 271992 / 272040 | 9 / 14 | 24 / 27 | +5血价、+3净扣 |
| XP2SL33HT0D9 / F33 / T1 | 271982 / 272195 | 2 / 10 | 25 / 34 | +8血价、+9净扣 |

四组均逐字同指纹，原起点observed_ts对应唯一原state，终点取下一玩家轮；包含已结算毒/反伤的敌净HP变化，不等纯攻击伤害。参见same-board-pairs.json。没有把相关SL尝试当独立局，亦不推全局血价系数。YF F33第二次实赢20血，保留探索成功反例；原/替线后轮抽序、重问与行动不同，缺整战单变量对照。

## 现有live源码范围

本次只读live快照：2ccc01768229b0735ebb255abbbbbc7f4f337fd3。核15条相关源码路径：base各最后源码提交均为该live祖先；live工作文件逐字等于快照对应blob。8条源码与base不同，保存双方原字节.txt，不以main代码等同live或复原旧dirty运行树。source-ancestry.json逐路径记录完整commit和SHA。

- 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb：候选answer/before_sl/after_sl与requested_action审计；scope=predicted_candidates，actual_turn仍null。
- fdaf787a372880b0438e73bcac7e6d2168b038ed：单动作回执及loop接线；whole_plan_executed/actual_turn仍null，state_effect_verified=false。
- 66283dd9982bdd7f480da7a4d9bfefea0572a9ac：HP护栏与SL预测/本轮血价比较；分列样本、HP、伤害、力量、沙坑、随机药水未知，不是实际整轮收益。
- aad2700abed6dff1d66e87fb36aaa6fedb39adf3：实验体现帧阶段/持牌/已建能力/毒事实；poison_damage_already_dealt=null，没有逐事件累计收益。
- 4ed3c72df30f27b881da637aebf528b97440e0bb：monster-db按当前进阶读取已观察伤害/HP；roomHpCost五样本门槛保持。

这些是已有子项的实际live祖先证据，不是本批提交，也不能把整包登记duplicate/implemented。污染、火花、growth、普通镣铐、船夹板与朝向已有生产路径；本次没有重复实现旧路径或添加游戏参数。源码撤除红/恢复绿、tsc/vitest/cases均未运行，结果为null，不借用前批通过记录。

## 逐项处置
### silent-proposal-c20b5139dd0dff71：污染与技能收益

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：DUZUBAJ3A8GP F27 T4—6。账本：silent-0168。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA：bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c。

已核事实与现状：states:274830—274839：火花3→6；技能污染0→3→6与0→6→12→18，勒紧不加污染；次轮污染消失，T4/T5玩家损3/9，毒分别结8/13。当前turn-solver技能加污染、rollout火花增长与HAZE施毒已有路径。

反例/未知：技能同时带来施毒和格挡收益；所列实盘不支持一律少打技能。迷雾漏6毒伤的旧修复不能重复报新bug。

处置：waiting。缺冻结历史实际移动输入下技能收益、火花增长、污染清除的联合预测校准，以及相同后继的完整替线；不能由两轮血价拟定技能惩罚。

预期行为及验证：冻结手牌、火花、污染、实际A10移动输入，重放T4/T5完整出牌与敌方结算，逐项验血损3/9与毒伤8/13；另取独立后移局校准策略，不合并同局尝试为独立样本。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-ae9e692d680e3819：抢夺与返还归源

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：5PM6JAQG6FNQ F39 T4—6。账本：silent-0183, silent-0005。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA：b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5。

已核事实与现状：states:274351—274362：T4玩家−4力/−4敏；两步法后敏捷归0；失落毒死后的T5力量归0；T6遗忘再抢2敏。当前模型读取现场负力/负敏，POSSESS标记仅列已有事实，未发现通用归源返还模型。

反例/未知：敏捷归0发生在两步法后，不是遗忘死亡返敏；末次遗忘仍活着且玩家死亡，不能由失落死亡推广双方或规定固定击杀序。

处置：waiting。缺遗忘死亡返敏连续帧、同属性多来源抢夺与临时增益混合返还、稳定实例身份；失落返力单端点不足实现一般返还模型。

预期行为及验证：逐实体保存抢夺来源与归还事件，分离步法、临时属性、死亡返还和再次抢夺；补本角色遗忘死亡及多来源混合局，不用当前负属性公式代替事件验证。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-52f1e1bd2e7db0ed：下水道蚌加压与覆甲

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：CA5KE8GFJ9X2 F13 T1—5。账本：silent-0231。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA：651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376。

已核事实与现状：states:273237—273269：HP上限58、JET 11/15/19，对应力量0/4/8；虚弱下15→11、19→14；轮初覆甲9/9/8/7/6。monster-db当前进阶伤害/HP读取没有五样本门槛，房间代价ROOM_COST_MIN_N仍为5。

反例/未知：覆甲序列只是本局端点，攻击、受击、荆棘与轮界混在一起；不能据此证明所有减层/叠加触发，亦不把临死低血局拟为固定房间成本。

处置：waiting。首样本事实读取已在live；仍缺旧局真实调用移动表及覆甲减层来源隔离，不能认证加压、虚弱和覆甲的联合完整重放。

预期行为及验证：冻结当时A10移动输入并验证两次加压与虚弱；另有可区分攻击/受击/轮界及额外覆甲来源的连续局后才改覆甲模型；房间代价五样本门槛保持。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-6dd8bbff876be528：电击机器人逐实体成长

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：5PM6JAQG6FNQ F38 T3—4。账本：silent-0233, silent-0209。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA：48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5。

已核事实与现状：states:274308—274318：maxHP23的电击机器人力量2→4、攻击17→19；刺击机器人退场后其index由4变3，T3电击仍贡献17攻击。rollout HIGH_VOLTAGE计入逐实体growth，新召唤对象由spawnedEnemy重新初始化。

反例/未知：index变化不是新召唤；本局未给同种电击新旧并存/替换的完整连续事件。未实打另一击杀顺序，不能宣称保27血或救后场。

处置：waiting。缺同种新旧电击并存/替换的稳定实例身份与连续召唤帧，及其实际移动输入；已有growth和初始化代码不足认证全部不继承分支。

预期行为及验证：固定同实体跨轮17→19，同时单独固定退场重排与新电击到场，断言新旧计数不串用；另一目标顺序的策略效果另需后移完整对照。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-578e415a259e6835：沙虫选择审计及能力兑现

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：8JRE1C4H4Z2W F33 T2/T5/T11，F17 T6。账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA：e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a。

已核事实与现状：decisions:270216/270282同指纹；重算原线损3/扣敌10，SL替线损15/扣敌17，即多12血/多7净扣。原题替线的五轮死亡0/24→5/24不能写成同死率。现有候选三阶段、HP护栏、SL比较和单动作回执已接入。

反例/未知：原线与替线都缺受控完整获胜后继；F17 T6抽弃牌重规划后的实际资源不等候选保血值；末T11的22挡对37攻击而仅5血，是终局不足的观察，不给能力预支未来收益。

处置：waiting。缺跨抽弃牌重规划的完整执行归属和中间事件、能力累计收益分账；现有actual_turn/actual_outcome为空，单动作回执不认证整轮审计。

预期行为及验证：冻结T2同盘、T5护栏、F17 T6重规划与末T11，分别验证预测、首派发、完整续步与实付血价；SL恢复不计回血。累计收益需逐事件来源链，规则参数后移验证。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-c0767768bf6a7ab1：实验体全败SL血价

来源任务：postmortem → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：YF0LXT1QSTGG F48 T1/T5，F33第二次。账本：silent-0079。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA：28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb。

已核事实与现状：decisions:271309/271348同指纹；states:277327→277337、277366→277373重算实损0→9、敌净扣45→38。原题两线24/24死亡、未来失血封顶27，掩盖当轮多9血少7伤。现有SL血价比较明确标current_turn_prediction。

反例/未知：F48第六次恢复挡后T1零损仍T5败；F33第二次SL实赢余20血，不能全面否定探索。第四次T5弃牌后的候选未完整执行。

处置：waiting。候选预测与首动作回执已在live；缺弃牌/用药重问后的整轮归属、保持后继一致的完整胜线，不能把全败并列改为统一拒绝或血价常数。

预期行为及验证：固定0/9与45/38、未执行续步标记及F33成功SL反例；整轮执行与独立后移受控后继补齐前保留原探索门槛。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-a46bdb7fe711d79a：分阶段毒启动与能力收益

来源任务：postmortem → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：YF0LXT1QSTGG F48末试T3—5。账本：silent-0021, silent-0027, silent-0028, silent-0085。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA：eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6。

已核事实与现状：states:277512→277513第一阶段4HP/4毒转为第二阶段212HP且旧毒/力消失；277519当前触媒2、零毒。277520→277523取得13+10=23挡，第三小刀后的277526敏捷5→6不倒补；本轮197→160净扣37，18血不足44−23。

反例/未知：持有毒性爆发不等实际打出；此前已建立毒雾/余像也败，不能把未启动毒作为唯一死因。当前分阶段组件/能力/毒事实模块明确不预测累计毒伤。

处置：waiting。当前阶段、持有组件、已建能力与零毒触媒的事实已有；缺跨阶段逐伤害来源事件和抽弃牌后的完整候选执行链，不能认证累计能力收益或改持续价值排序。

预期行为及验证：固定阶段清毒、触媒零毒收益、23挡不倒补和37净扣分账；需逐事件伤害/恢复归源与完整执行证据，不能用敌HP端点单独拟组件胜率。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-1044224808015e5c：双蟹零胜率探索血价

来源任务：postmortem → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：XP2SL33HT0D9 F33 T1/T3/T4。账本：silent-0079。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA：4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5。

已核事实与现状：decisions:271992/272040同指纹，实损9→14、净扣24→27；271982/272195同指纹，实损2→10、净扣25→34且手里剑建立1力量。272076五轮21/24→23/24死亡只是候选，B2零胜并列仍允许探索。

反例/未知：两组均无受控完整胜局；后轮抽序/选线不同，不能按T9/T6或T5死亡归因单牌。T2镣铐、朝向与14+6挡实际零损，反对一概按少挡牌数判断。

处置：waiting。血价、死亡样本与成长候选比较已有；缺同盘完整后继、未执行原线、独立后移A10双蟹验证，不能校准先保血的窄策略或终局权重。

预期行为及验证：固定9/14、24/27、2/10、25/34并保留力量收益；按局号分组，六次SL只作一局。新独立完整对照支持后才启用先保血条件。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-7cbc6005db712ba9：双蟹机制联合兑现

来源任务：postmortem → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：XP2SL33HT0D9 F33末试T2—5。账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA：f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291。

已核事实与现状：states:278236—278242：轮初14挡，普通镣铐爪0→−9力、4→0，斗篷另6成20，次轮恢复。278249→278252→278253火箭57→38→28，分开朝向19与虚弱10；4敏脆弱下偏折/防御各6，末轮11血对17−6实死。

反例/未知：船夹板不是每轮14，也不因敏捷额外增；本批仅重新核XP末试，原文早期两局仍只是原提案引用，不当本批新核历史。已有能力/手里剑增长仍未减员，不能认证固定能力优先。

处置：waiting。挡、减力、朝向子项已存在；缺额外来源隔离、混合意图缺值语义与联合候选收益验证，不认证整个机制包或修改持续价值权重。

预期行为及验证：逐项固定57→38→28、14+6→20、0→−9→0、4敏脆弱6挡、直伤16/20与末毒3+7；混合意图及额外触发来源必须独立可识别，再验证完整联合候选。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

### silent-proposal-c59f592f1427a67e：两局机制与资源综合补链

来源任务：experience-update → strategy-proposal；角色silent，策略仅本批已观察A10。
证据：YF0LXT1QSTGG F48 T1/T3—5；XP2SL33HT0D9 F33 T1—5。账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA：81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2。

已核事实与现状：原提案链接的两局同盘血价三组均重新核实，阶段清毒/触媒零毒/后获敏捷不倒补与双蟹14挡/临时减力/朝向端点核实。旧历史机制数和支持局只保存原文，不拿未经本批重新核实的101局/22施放/50帧充当新覆盖。

反例/未知：F33成功SL余20血保留；原能力已建立但仍死、恢复药槽不等取得新药、SL恢复HP不等回血，均不能被纯净端点统计掩盖。

处置：waiting。已有局部事实与候选/首派发审计；缺逐来源累计收益、跨续问完整执行、恢复资源全链及20条经验逐项消费者验证，不能关闭整包、量化父项或声称自然采用。

预期行为及验证：逐个经验消费者输出与来源事件相连，药水取得/恢复/饮用、回血与SL重置分账；同局重打不扩分母，未知相位留空，策略参数只用后移独立受控数据。 保留候选、原排序与现有动作规则。没有本批源码commit、merge或版本；后续实现须固定数据撤源码失败/恢复通过及沙箱入口通过，实际live祖先才记implemented。预期仅补全可核验事实，策略收益未知。后续有改动时逐项revert自己的源码commit，不覆盖知识刷新；实际上线按原双通知记录。Roy-2026-10-07-learning提供权限，不能补游戏事实。

## 交付与验证边界

本批10项均waiting，逐项具体缺口见proposal_results.json；不忽略派发id、不扩队列，不关闭量化父请求。无新源码/知识数据，fixes=[]、merged=null，无源码提交、上线记录、eval版本或shipped。铁甲和未观察进阶行为保持原状。没有调用LLM/网络/游戏，没有运行play，不推送。

proposal.md与report.md保存本批处置；原Markdown、原SHA、六局证据与源码身份均保留。仅经根learner/ledger.py update为原账本追加本批proposal/report链接及说明，不添加重复支持样本，不改原claim/status/version，不代运维登记shipped。原代码提案id沿用既有CLI，不另执行add制造重复条目。

测试固定为{"tsc":null,"vitest":null,"cases":null}，仅执行原字节/身份/资源差核验；这些核验不冒作源码测试。密钥扫描结果及最终HEAD/干净状态另见final-verification.json。运维依据本批真实无改动报告维持waiting，待有对应缺口数据的新局再派。

首轮最终核验用相对scratch路径匹配账本的绝对路径，导致计数断言失败；失败保存在final-verification.first-failure.txt。verify-final.py改用实际绝对路径后沿原30条CLI记录重读，未重复追加账本；此处是报告核验脚本的路径错误，不是策略或源码测试失败。

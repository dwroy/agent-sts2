# 静默猎手本批十项既有提案核验

记录时间：2026-10-13T10:56:28+08:00（写前已执行date）。

本批普通消费队列，非手动专题。授权Roy-2026-10-07-learning仅授予修改权限，不提供游戏事实。十项均保留waiting，不新增重复id、不改原提案正文、不登记implemented/shipped。原Markdown副本、SHA、原角色账本与本批证据索引均保存在本目录。

## silent-proposal-c20b5139dd0dff71：感染棱柱技能污染

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0168。原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c。

证据：DUZUBAJ3A8GP F27 T4—6；states 274830—274843。

本次核实：T4火花3：污染0→3→3→6（勒紧能力不增）；T5火花6：0→6→12→18，26攻−17挡实损9，T6污染消失。

反例/限制：技能仍有挡、施毒和临时弱收益，净损9不能推出少打技能必更好。

旧行为/已有局部实现：turn-solver.ts:2034/2819已有逐技能污染与逐击血价；rollout.ts:2378已有移动表火花成长。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。缺历史实际A10移动表与dirty运行树冻结、火花增长/撤污染/弱毒挡的联合生产回放；本帧实损9不能校准统一技能惩罚。

验证方法：冻结当前A10怪物移动表、手牌/能力/前缀；逐步核污染、毒、弱、挡、血与下一轮清除，撤新增源码失败/恢复通过后才判断整项。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-ae9e692d680e3819：失落/遗忘属性抢夺返还

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0183、silent-0005。原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5。

证据：5PM6JAQG6FNQ F39 T2/T4—6；states 274341/274351—274362及末试274379—274391。

本次核实：两次抢夺后力量/敏捷−4/−4；首试两步法敏捷回0，失落毒死后力量−4→0，遗忘后续再夺敏捷。

反例/限制：末试单步法只回−2敏捷，失落退场仍死亡；遗忘死亡返敏没有本批样本。

旧行为/已有局部实现：move-model.ts读取实际负属性/临时减力；现帧公式不证明按来源的死亡返还。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。缺遗忘死亡返敏、同属性混合来源返还与稳定实例标识；本批只支持失落退场力量恢复，不能推广通用返还或固定击杀序。

验证方法：补冻结的抢夺来源、退场/返还、再次抢夺连续帧；分别测试正负属性和混合来源，未验证来源保持未知。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-52f1e1bd2e7db0ed：下水道蚌加压成长

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0231。原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376。

证据：CA5KE8GFJ9X2 F13 T1—5；states 273237/273252/273263及对应全段。

本次核实：喷水11→15→19，力量0→4→8；两次虚弱后攻击11/14，终轮2血10挡不够14。

反例/限制：轮初覆甲9/9/8/7/6与挡变化只证明现场值，没有隔离完整减层条件。

旧行为/已有局部实现：monster-db.ts/move-model.ts已有当前进阶观测读取；monster-db.ts:1406/1442保留房间代价5样本门槛。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。首观测HP/攻击和5样本门槛已有子项；缺历史实际移动表、加压/虚弱联合回放及覆甲减层来源隔离，不能认证整机制或拟房间成本。

验证方法：首样本读取固定A10 HP/攻击，独立验证房间n<5时不估代价；以加压/弱/覆甲联合夹具校准，补未隔离条件的新局。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-6dd8bbff876be528：电击机器人高电压成长

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0233、silent-0209。原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5。

证据：5PM6JAQG6FNQ F38 T3—4；states 274308—274317。

本次核实：ZAPBOT数组index4→3，力量2→4，攻击17→19；T3仍贡献17攻击，T4才退场。

反例/限制：先清爪牙候选35伤/损3未完整实打；不能据主怪中毒宣称爪牙成长关闭或后场必胜。

旧行为/已有局部实现：rollout.ts:525/2360/2745按实体已有高电压growth；召唤有单独模板，数组index不等于持久实例ID。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。缺新旧同种ZAPBOT召唤的连续稳定身份/计数与历史实际A10移动表回放；现有2→4局部增长不能验收新实体计数隔离。

验证方法：冻结旧实体连续增长、旧退场/新同种召唤夹具及模板；确认旧计数不串新实例，补另杀序后置样本。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-578e415a259e6835：沙虫SL/护栏与能力资源审计

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a。

证据：8JRE1C4H4Z2W F33 首/三试T2、第二试T5、末试T11；decisions 270216/270282/270264。

本次核实：同完整指纹T2原/替实损3/15、净扣10/17，多12血只多7伤；第二试T5护栏实际损4/扣25。末试22挡/5血对37攻击，24毒结算后敌仍130。

反例/限制：防御换线有省血但仍死亡的反例；候选省血不等于抽牌重规划后的实省。原稿金刚杵→silent-0016与账本覆甲claim冲突。

旧行为/已有局部实现：silent-selection-audit、silent-hp-guard-audit有原答/护栏/SL预测；silent-selection-dispatch只记录单动作。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。已有阶段快照和单动作回执；缺跨抽弃/生成/护栏/SL续问的整候选归属、逐来源收益和恢复分账；金刚杵→0016引用冲突尚未厘清。

验证方法：固定首/三T2、第二T5、F17抽牌重规划与末T11；逐事件关联完整候选/切断原因，SL恢复独立记账，并先厘清0016引用。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-c0767768bf6a7ab1：全败SL实际血价

来源：postmortem；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0079。原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb。

证据：YF0LXT1QSTGG F48 第二/第三试T1；decisions 271309/271348/271354；states 277327—277337/277366—277373。

本次核实：同完整指纹原/替T1实损0/9、净扣45/38；SL截去挡续步。第六试恢复续步T1零损仍T5失败。

反例/限制：F33存在第二次SL实胜；第四试T5弃牌后替换未完整执行，不能禁止所有探索。

旧行为/已有局部实现：silent-sl-resource-comparison/sl-comparison已有候选资源差与未验证执行标记，selection-dispatch实际只一个动作。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。缺跨续问/弃牌完整候选执行归属与消费者回读、受控完整获胜线和独立后置验证；0/9及45/38只验当轮，不足拟系数或禁探索。

验证方法：按完整指纹重放两条实际前缀，保存完整候选/未派发续步/重规划；补新A10局的原规则与候选规则完整对照。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-a46bdb7fe711d79a：实验体分阶段毒和能力兑现

来源：postmortem；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0021、silent-0027、silent-0028、silent-0085。原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6。

证据：YF0LXT1QSTGG F48 末试T3—5；states 277512—277528。

本次核实：4/111血4毒到新阶段212/212零毒；T5触媒2但零毒，已有23挡在敏捷5→6后仍23；18HP对44攻完整缺3，敌197→160分账。

反例/限制：前五试第二阶段有毒雾/余像仍失败；本局没有第三阶段，持有OUTBREAK不等于第二阶段已施放。

旧行为/已有局部实现：silent-phase-current.ts保存本帧组件/能力/毒/block，poison_damage_already_dealt=null；phase-reference分列阶段终结选择。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。阶段清毒和A10当前帧组件/能力快照已有子项；缺分阶段持有→候选→施放→结算全链和逐来源累计收益，本批无第三阶段及独立整战对照。

验证方法：固定阶段切换、零毒触媒、后得敏捷不倒补与37伤分账；累计归源须关联实际施放/结算，后移新局验证动作排序。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-1044224808015e5c：双蟹零胜并列SL血价

来源：postmortem；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0079。原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5。

证据：XP2SL33HT0D9 F33 首/第二试T3、首/末试T1；decisions 271992/272040/271982/272195。

本次核实：两组完整指纹相同：T3实损9→14、净扣24→27；T1实损2→10、净扣25→34，并实际建立1力量。

反例/限制：末试T2镣铐/朝向零损，T3保留挡仍损4；六次相关尝试全败，后续动作不同。首次题面预算4/8样本与后试24不可假称MC稳定性复测。

旧行为/已有局部实现：explore.ts仍按B2不更差/未试排名换线；候选差字段只预测，不保证当轮安全。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。两组5/8血价与3/9输出增量已核且保留力量收益；缺完整执行收益、成长净贡献及独立后续A10双蟹胜线对照，不启用新探索规则或全局HP常数。

验证方法：先完成同盘整轮审计并保留成长/朝向，按run_id分训练验证；独立后移双蟹整战比较规则，缺证时保留选线。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-7cbc6005db712ba9：双蟹朝向/临时减力/轮初挡

来源：postmortem；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291。

证据：XP2SL33HT0D9 F33 末试T2—5；states 278236—278261。

本次核实：爪力量0→−9→0，T2轮初14挡、斗篷后20；T4火箭57→38→28分别来自朝向/弱，两步法4敏捷脆弱下偏折6挡；末轮11血6挡对17实死，毒结算3+7。

反例/限制：船夹板六次T2同14不等于其他额外挡来源都已隔离；Mixed意图中的null不自动当攻击0。

旧行为/已有局部实现：passive-pieces已有船夹板T2 14、move-model临时减力恢复、turn-solver已处理朝向；限定Crusher舍入修正为既有子项。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。朝向/临时减力/船夹板T2路径已有子项；缺额外格挡来源隔离、混合意图缺值语义和联合候选消费者验证，不能认证整包或改持续价值权重。

验证方法：固定57→38→28、14+6=20、0→−9→0和脆弱6挡联合场景；缺值保持未知，按来源核收益并验消费者全部候选。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

## silent-proposal-c59f592f1427a67e：多经验机制与SL全链

来源：experience-update；实现任务：strategy-proposal；本批：20261013-104302-s2-strategy-proposal。角色silent，仅本批已观察A10。

账本：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2。

证据：YF0LXT1QSTGG F48 T1/T3—5；XP2SL33HT0D9 F33 T1—5；原稿列20经验/22账本。

本次核实：重核两局血价、阶段清毒、触媒/敏捷时点、双蟹临时减力/朝向/末毒；本批共六个独立run，SL尝试不扩分母。

反例/限制：没有本批以外历史机制全量重核，没有未选构筑/路线/药水的整战反事实；相关尝试不作独立盲测。

旧行为/已有局部实现：预测比较、派发回执、当前阶段快照及部分机制路径已有，字段明确actual_turn/actual_turn_result=null。

预期行为：沿原提案提供可核验的事实与条件，保留全部候选；不由本批补未观察机制或策略常数。

处置：waiting。已有局部预测/回执/快照不代全链；缺逐来源累计收益、跨续问完整执行、SL恢复分账与20经验逐项消费者验收，量化/经验父要求继续开放。

验证方法：沿原20经验逐项验来源/候选/派发/结算/消费者，与机制/SL局部实现分别验收；未来独立新局用于策略效果验证。 本批只有原日志算术，不是生产源码测试。

拟合/切分：本批固定局面只作发现与回归材料；同局SL按run_id归组，不拟新参数。后续新静默A10局作时间后移验证。

预期影响/回退：后续可审计性改善须与玩法收益分开验收；本批未改源码，无生产回退提交。以后实现以自己的实际live源码提交回退，保留日志和旧链。

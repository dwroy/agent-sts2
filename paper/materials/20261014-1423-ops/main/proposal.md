# 静默猎手本批提案与验证边界

记录时间：2026-10-14T13:56:41+08:00。

本批：20261014-134208-strategy-proposal；基线：`5f520228aa83ac54b4c5a8ade586851d61204f47`。

本批只消费已领取的10个原id；没有research_request或implementation_request。普通专题文件绑定另一批，未转专题，也未领取其他队列项。开工工作树干净，git merge --no-edit main返回Already up to date。

结论：10项均waiting；没有生产源码、知识或任务模板修改，没有新提案id、提交、合入、发布号或shipped登记。已实现子路径只作为覆盖范围说明，不能替代整份提案验收。没有源码变化，tsc/vitest/cases均null，撤源码失败/恢复通过不适用；没有借用历史测试成功。

本次重新核原日志：6局均SILENT/A10且已结束，4062个状态、3941条决策；保存指定层1060帧和1043条决策。这是限定楼层的核验，不是全历史研究。evidence-manifest.json/decision-manifest.json保存原范围和SHA，state-facts.json/decision-facts.json保存单行offset/bytes/SHA及字段；verified-states.jsonl保留相应原字节。前三来源局范围及SHA与原冻结材料逐项一致。

check_claims.py通过23条原帧断言和4组同指纹窗口核验。这只是证据核验，不是生产源码测试、完整候选执行认证或整战反事实。paired-windows.json明确窗口范围：敌净扣血与玩家净损，不把它们混称毛伤、全部计划兑现或成长的净收益。

## 每项处置

### silent-proposal-c20b5139dd0dff71：污染与技能血价

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：DUZUBAJ3A8GP F27 T4—6。账本：silent-0168。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256：bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c；本批原字节副本：silent-proposal-c20b5139dd0dff71.source.md。
- 已核事实与反例：污染0→3→3→6及0→6→12→18，跨轮清空；T5净损9。技能同时有毒与挡收益，不能一概认定亏损。
- 原提案预期行为：冻结技能实际效果、逐击污染血价及当前进阶攻击；保留所有候选。
- 处置：waiting。原在线移动表和dirty执行树未冻结；缺火花成长、污染清空、迷雾收益的联合生产回放及少技能替线完整后继。
- 下一次验证方法：固定同一手牌/已建能力/敌移动表，比对技能后毒、挡、入伤与清空；策略另需完整替线时间后置验证。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-ae9e692d680e3819：抢夺与返还

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：5PM6JAQG6FNQ F39 T4—6。账本：silent-0183、silent-0005。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256：b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5；本批原字节副本：silent-proposal-ae9e692d680e3819.source.md。
- 已核事实与反例：首试两步法−4敏→0，失落退场后−4力量消失；遗忘仍持4敏、T6再夺2。末试单步法只到−2敏且仍死亡。
- 原提案预期行为：按实体保存抢夺来源和已观察返还，保持当前方案与全部目标选项。
- 处置：waiting。缺遗忘死亡返敏帧、属性来源隔离和死亡返还后同轮续牌链；不能由负属性公式证明整套返还或固定击杀序。
- 下一次验证方法：固定各实体抢夺前后/死亡/返还/续牌四段，核负属性和生成挡；未观察返敏仍未知。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-52f1e1bd2e7db0ed：蚌加压与弱

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：CA5KE8GFJ9X2 F13 T1—5。账本：silent-0231。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256：651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376；本批原字节副本：silent-proposal-52f1e1bd2e7db0ed.source.md。
- 已核事实与反例：力量0/4/8、喷水11/15/19，弱后11/14；末轮2血10挡对14、实死后荆棘另扣3。覆甲轮初9/9/8/7/6。
- 原提案预期行为：首个当前进阶样本起读取HP/攻击事实，按现场加压与弱计算；房间代价仍五样本。
- 处置：waiting。首样本读取路径已有；缺原在线移动表冻结副本、加压/弱/覆甲/荆棘联合回放和完整覆甲减层条件。
- 下一次验证方法：固定原移动表及五轮状态，验15→11、19→14和死亡后荆棘；不从单个死局拟房间成本。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-6dd8bbff876be528：高电压成长

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：5PM6JAQG6FNQ F38 T3—4。账本：silent-0233、silent-0209。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256：48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5；本批原字节副本：silent-proposal-6dd8bbff876be528.source.md。
- 已核事实与反例：同观察轨迹电击力量2→4、攻击17→19，T3玩家61→31，电击T4才退场。先杀另一线未实打。
- 原提案预期行为：复验HIGH_VOLTAGE_POWER逐实体成长与当前进阶攻击，新召唤实体计数独立。
- 处置：waiting。缺同类实体更替的连续持久身份、召出/死亡边界及冻结召唤输入；17→19不能认证新实体不继承旧成长。
- 下一次验证方法：冻结原实体身份与召唤边界，分别验存活者成长和新召者初值；不规定统一击杀顺序。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-578e415a259e6835：沙虫审计与资源分账

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：8JRE1C4H4Z2W F33 T2/T5/T11；F17 T6。账本：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256：e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a；本批原字节副本：silent-proposal-578e415a259e6835.source.md。
- 已核事实与反例：首/三试T2同指纹，窗口净损3/15、敌净扣10/17，原候选死亡0/24而替线5/24。候选与实际收益不能互换。
- 原提案预期行为：追溯原答、护栏、SL、派发和重规划；累计能力收益、SL恢复、回血、喝药分别归源。
- 处置：waiting。已有候选审计子功能，但actual_turn/actual_outcome仍未知；缺跨重规划完整候选归属、累计能力收益及SL恢复/回血/喝药联合分账。
- 下一次验证方法：固定同指纹两线、T5护栏和重规划，核完整执行/前缀；末轮零血截断与完整需损分开。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-c0767768bf6a7ab1：实验体SL血价

- 来源任务：postmortem；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：YF0LXT1QSTGG F48 第2/3次T1、第4次T5；F33。账本：silent-0079。
- 原保存文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256：28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb；本批原字节副本：silent-proposal-c0767768bf6a7ab1.source.md。
- 已核事实与反例：第2/3次T1同指纹，窗口净损0/9、敵净扣45/38；预测0/10、54/36各为候选量。第三次续问实际end_turn。F33存在成功SL，不能否定全部探索。
- 原提案预期行为：记录原/替线当前资源差、未执行续步及覆盖重放原因；策略门槛保持。
- 处置：waiting。缺完整候选执行认证及同起点/抽序/预算的独立完整尝试；有限样本全败不能证明安全或拟探索惩罚。
- 下一次验证方法：逐候选对照题面、请求、结果与重问边界，固定0/9、45/38并保留F33成功SL反例。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-a46bdb7fe711d79a：分阶段毒与能力兑现

- 来源任务：postmortem；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：YF0LXT1QSTGG F48 末试T3—5。账本：silent-0021、silent-0027、silent-0028、silent-0085。
- 原保存文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256：eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6；本批原字节副本：silent-proposal-a46bdb7fe711d79a.source.md。
- 已核事实与反例：4HP/4毒/15力→新阶段212HP/0毒/0力；T5已建触媒2而毒0。5敏已有23挡，取得第6敏后仍23；197→160净扣37仍死。
- 原提案预期行为：分列阶段、已建/持有能力、已结算/未来毒、挡牌前后敏捷；保留候选与排序。
- 处置：waiting。阶段与零毒端点已核；缺累计收益归源、完整阶段后继及跨重规划候选执行归属，不能据此强制能力先手。
- 下一次验证方法：冻结阶段转换、触媒零毒和挡前/后敏捷，逐步核归源；后移完整实盘验证独立于发现样本。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-1044224808015e5c：双蟹零胜并列血价

- 来源任务：postmortem；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：XP2SL33HT0D9 F33 首/二试T3、首/末试T1。账本：silent-0079。
- 原保存文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256：4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5；本批原字节副本：silent-proposal-1044224808015e5c.source.md。
- 已核事实与反例：T3同指纹窗口净损9/14、敌净扣24/27；T1同指纹净损2/10、敌净扣25/34。T1还取得永久力量，不能抹掉成长收益。
- 原提案预期行为：分列并列原因、当轮血价、输出、力量/敏捷与能力条件；窄策略等待后置对照。
- 处置：waiting。缺永久成长净贡献、完整候选执行归属和独立后置A10双蟹整战对照；不能由B2差0宣称安全。
- 下一次验证方法：固定两组同指纹及随机落点，验实际血价和成长；按独立局切训练/验证，不能把六次SL当六局。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-7cbc6005db712ba9：双蟹朝向与轮初挡

- 来源任务：postmortem；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：XP2SL33HT0D9 F33 末试T2—5。账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。
- 原保存文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256：f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291；本批原字节副本：silent-proposal-7cbc6005db712ba9.source.md。
- 已核事实与反例：T2轮初14挡，普通镣铐−9力、T3恢复0；T4火箭攻击57→38→28。不能延用临时减力或把T2挡算入以后回合。
- 原提案预期行为：补缺失条件事实参考，分列既有/新增挡、朝向/弱、当前/未来能力收益。
- 处置：waiting。机制子路径已有；缺额外挡来源隔离及混合意图/未知条件联合消费者验收，未认证整份条件参考。
- 下一次验证方法：固定14+6→20、0→−9→0、57→38→28及脆弱挡；验未知额外来源保持未知。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

### silent-proposal-c59f592f1427a67e：两局机制与SL综合闭环

- 来源任务：experience-update；实现任务：strategy-proposal；角色/范围：silent/A10。
- 证据：YF0LXT1QSTGG F48 T1/T3—5；XP2SL33HT0D9 F33 T1—5。账本：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。
- 原保存文件：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256：81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2；本批原字节副本：silent-proposal-c59f592f1427a67e.source.md。
- 已核事实与反例：上述两局阶段清空、毒/挡时序与三组SL窗口差可核；相关尝试只有两个独立局，不是十二局。
- 原提案预期行为：联合记录机制、能力建立/兑现、原答/SL/派发与资源分账；不拟新权重。
- 处置：waiting。多个子功能有实际live祖先；缺全组件联合验收、完整候选归属、累计收益及SL恢复资源分账，不能以子项代整提案duplicate。
- 下一次验证方法：统一固定原帧夹具与消费者链，逐组件验缺项；已知窗口仅作发现/回归，后移局另验策略。
- 样本与回退：不拟新阈值；同局SL不能扩独立分母。保留原行为；本批无源码可回退，后续实现须独立红绿与沙箱验证、live祖先核实及上线记录。

## 当前消费者覆盖及实际live来源

只读核验时live HEAD：`4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac`。各叶的源码提交是实际live祖先；源码与工作文件SHA一致。

| 消费者 | 实际live源码提交 | 本批限定判断 |
|---|---|---|
| agent/src/reflex/silent-hp-guard-audit.ts | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | 保存Jev/护栏前后预测，scope=candidate_predictions_before_sl，actual_outcome=null；不认证实际累计收益。 |
| agent/src/reflex/silent-selection-audit.ts | `05cd292c6f01bb31e406473d3a9843e659d62b93` | 保存before_sl/after_sl、预测差与请求，execution_status=pending_dispatch、actual_turn=null；未补全跨重规划归属。 |
| agent/src/reflex/silent-held-loss.ts | `05cd292c6f01bb31e406473d3a9843e659d62b93` | 只覆盖A10 F17 SOUL_FYSH/BECKON条件下持牌失血预测；不冒称本批其他楼层已兑现审计。 |
| agent/src/reflex/passive-pieces.ts | `dba8d7caf9f2b44dd2fd11fd8861ecc14be4c09b` | 有船夹板T2/14固定机制；不证额外来源全部隔离。 |
| agent/src/reflex/rollout.ts | `f2c7cc1a7288893bceae0f0b20304a2b1fae5f57` | 有HIGH_VOLTAGE成长及阶段处理；不证召唤实体身份和全阶段候选回放。 |
| agent/src/reflex/rollout-live.ts | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | 读取当前进阶移动事实并接成长/轮初挡；未复原旧dirty在线数据库。 |
| agent/src/reflex/combat-plan.ts | `ba2d865123473dab7ca5e50f9be3d20a2296fbdf` | 生产接selection_audit、hp_guard与原选项；日志存在不等于完整执行/收益归源验收。 |
| agent/src/knowledge/monster-db.ts | `4ed3c72df30f27b881da637aebf528b97440e0bb` | 移动伤害读取没有五样本准入；room-costs.ts的MEASURED_ROOM_MIN_N=5仍保留。 |
| agent/src/sl/explore.ts | `0d092f6b928a6221eabf3516abad25c48ceaac9c` | 保留原探索、全败并列与重放路径；本批没有修改规则或宣称探索安全。 |

source-audit.json记录base/live/实际文件三方SHA；五叶base/live字节不同，但source-differences.json逐叶验证仅Roy/Dai文字替换。本批保留live原字节，未把main的记录或注释覆盖到live，也未把main最近提交号当作live源码祖先。

## 已知账本链接不一致与限制

578原提案把金刚杵经验链接到silent-0016，但当前0016的claim是护喉甲开场覆甲。本批明确不支持这条错链，不把护喉甲账本当金刚杵证据；保留原文和已有纠错历史。decision-log末尾已记旧578/0016纠错通知与分角色回执，本批没有新反证，不重发旧通知或代填确认。

当前数据库刷新、历史提案wide asc=[0,20]与历史支持数均不冒称本批观察范围。所有实际策略只核已派六局A10；未来抽序、原线完整获胜、未选目标后继、累计成长净贡献和原在线移动表仍有缺口。不使用预训练游戏知识补足；不读其他角色知识、游戏二进制或.env，不运行play、LLM、网络或推送。

## 账本与运维交付

只经根learner/ledger.py update追加本批报告/提案链接和waiting说明；已有claim/evidence/first_run/status/version保持。不把历史shipped条目倒退成proposed，不登记新shipped，原队列状态由调度器消费proposal_results处理。没有新游戏结论需要另造代码提案id，最终code_proposals列出原10个CLI id；implementation_domains=[]表示本批没有源码实现，原请求领域仍在assigned-proposals.json。

交运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-134208/learner/runs/20261014-134232-strategy-proposal/proposal.md。报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-134208/learner/runs/20261014-134232-strategy-proposal/report.md。逐项waiting及具体缺数据已在report.json；实际入库与消费者采用仍沿原父要求，不能由本批报告结束关闭。

补充完整性、gitleaks与CLI读回记录见final-verification.json、ledger-update.stdout和gitleaks.log。

收尾补充：gitleaks重试exit0、扫描约63.80MB无泄漏；首次sandbox ENOENT保留在gitleaks-first-launch-failure.txt。账本CLI exit0，30项实际读回及claim/status/evidence/first_run/asc/prior/version保持均核实。收尾脚本首次按stdout行数误计，修正为按id分隔后通过，没有重复追加；原失败见final-verification-first-failure.txt。最终HEAD=base且工作树干净，无源码/知识差异。

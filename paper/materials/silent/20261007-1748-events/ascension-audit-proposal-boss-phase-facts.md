# D3：区分首 Boss 胜出、本幕结束与当前战斗身份（仍 pending）

来源任务 `ascension-audit`，实现任务 `strategy-proposal`；角色 silent，实际观察 A10；领域 structure、terminal、combat。账本 silent-0228，既有 CLI id `silent-proposal-4cc200cc9747f4a8`，授权 `Roy-2026-10-07-learning`。旧失败任务原报告与提案只读保留，本轮重新读原始日志及当前固定 live，不继承其验证结论。

现象一：JMH5C51RLN4E states L243532/L243533，F48 T13 首 Boss 胜后为 REWARD/MAP，act_id=2（原始从0计数），HP8，地图下一项为 row15 的 Boss；L243534 F49 T1 实际进入沙漏。9TG1RP5LFAAK L244372/L244373 F48 T16 同样剩17HP、下一 Boss 节点；L244374 F49 T1 进入女王/聚合体。因此首 Boss 结束不等于第三幕结束。

固定 live `606855106dfb90ca8ffe27b985ed3c3b3f2424a2` 的 agent/src/sim/build-sim-facts.ts:437/446 用静态[17,33,48]及非战斗判定 actBossDefeated；代入真实 F48 战后帧返回 true，:475 说明为“本幕 boss 已经打完；下一幕的 boss 要到下一幕开始才知道”。该说明与同幕第二节点不符。保留跳过未知 Boss 模拟的保护是合理的，理由应表达“首 Boss 已败，仍有本幕下一 Boss，其身份未观察”。不能恢复对刚被打败的首 Boss 模拟。

现象二：F49 两个实际战斗帧的原始 run.boss_id 均仍为 TEST_SUBJECT_BOSS，但 enemies 分别是 AEONGLASS、TORCH_HEAD_AMALGAM/QUEEN。brain/build-facts.ts:44/48 对[17,33,48]扫描 nextBoss 得 null，:52 将 stale boss_id 直接写 act_boss；memory/run-plan.ts:138 也复制它。这是通用字段语义差异。combat-plan.ts:498/499 的药水语境在 kind=boss 时明写“this fight”，本轮没有将它误判为必然 null 错误；其 :503 已显示首战 continuation 目标。

拟改行为：先从本角色已见 LEVEL_10、真实地图第二 Boss 节点和当前 enemies 构造阶段事实；明确当前是首战/后战、首战是否已胜、是否还有可见节点。未进后战时身份未知；进入后战后只在已观察映射支持时写当前 encounter，并同时保留原 boss_id 字段作为来源，不能把两个字段混作同一事实。通用事实/计划/模拟说明共用已观察阶段，其他角色和未观察进阶保持原行为。优先修说明与身份，不能藉此新增未知 Boss 推演或修改 SL 必死门槛。

影响限制：本批两次 F48 reward.rewards/card_options 都为空，没有非空战后选牌题，更没有同题决策的受控对照；静态复现证明字段含义有缺口，不证明实盘受该说明误导、死亡由此造成或修后能赢。F49 最终胜利未观察，不能从它是第二 Boss 猜之后必定结束或猜 F50。

反例：同角色 A9 G403VCZ3BH1B F48 GAME_OVER 真胜，三幕无第二节点；A10 其余八局未到 F49，地图可见不等于已发生机制。上一等级对照以及十局资源链保留在 report.json/附录。

拟合/切分：这是结构事实修正，无参数拟合。前五/后五按结束时间整局切分，SL 留在原局，两个连战证据只在前五；后五触达不足。未来完局才可校验后组行为/更多首后 Boss 组合。样本都早于当前 live，不用于声称上线效果。

验证建议：真实固定 F48 reward/map→F49 combat 两组帧，核首战已败与幕末分开、后战敌人正确、空奖励继续正确、未观察后战身份为未知；A9和其他角色原行为保持；后续任务按原沙箱 tsc+vitest、gitleaks、live 发布流程测试。本次仅偏移复核和静态谓词代入，没有改源码、运行对局或实现测试。

回退：未来修复若影响已学流程，撤回该修复源到上述固定 live，保留双 Boss 核心估值及未知传播；不回退独立历史功能。旧/new规则、账本及本来源任务沿既有授权在实际上线后通知 Roy。本次 pending，无实现 commit、eval版本或 shipped。

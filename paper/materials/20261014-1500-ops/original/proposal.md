# 静默猎手本批提案处置与验证要求

记录时间：2026-10-14T14:54:43+08:00。

批次：20261014-144305-strategy-proposal。基线：`37b12843ea02401f8e4471a4f3a4f1cd87c28b5d`。

本批逐项处置10个已领取原id，均为waiting。没有新增生产源码、知识、任务模板、提交、合入或游戏版本；没有新提案id，也不登记shipped。已有局部实现不足以证明整份宽提案完成；缺少的完整归属、升级交互和受控后继明确保留。

开工git status为空，普通批次git merge --no-edit main返回Already up to date。根learn.json本行task/character/worktree/runs与任务一致，reason=proposal；存在proposal_ids，不含research_request、implementation_request或proposal_repair。普通专题文件绑定另一批，不满足专题身份，未读该专题正文、未转专题或扩展到其他队列。

本批六局均由runs.jsonl核为SILENT/A10且已结束。重读根logs原字节6779行：3432状态、3306决策、29条SL记录、6条runs和6条run-config；各行offset/bytes/SHA、角色、局号逐一匹配，状态和决策原范围连续。旧索引只作定位，不用其派生结论代替根日志。原字节快照和source-index.jsonl/input-verification.json均保留。

17项原帧事实核验通过；核验脚本复用前批既有断言，仅替换为本批从根日志重新核验的输入，来源SHA与变更说明见verifier-provenance.json。这是观测核验，不是生产源码红绿、完整模型校准或独立盲测。

当前离线消费者处理3301条有身份的决策，生成476个候选片段、3301个观测区间（859个具后端点）和534个回合分组。476个actual_full_candidate_result全部保持null；分组不等于534个完整回合。CA5、61E、DUZ完整输入因共5条map/route-change缺decision_id而拒绝，失败原件保留；随后按原缺口分段消费，不重编号或跨缺口连接。其余三局完整输入接受。consumer-summary.json及各gzip输出保留精确范围和JSON SHA。

8JRE F33首/三试T2消费者重新核得玩家47→44/32、敌326→316/309；第二试T5为25→21、敌249→224；F17 T6实际45→38、敌77→35且中途重问。末试T11整轮敌166→130、玩家5→0，与结束动作前154→130的末段不同；显示37−22=15仅算术参考，不能当零血截断的已观测完整入伤。critical-windows.json分开保存。

消费者首次运行因scratch脚本导入多退一级而报ERR_MODULE_NOT_FOUND，原consumer.log保留；只修scratch导入路径后重跑，consumer-v2.rc=0。此错误及恢复不算撤生产源码失败/恢复通过。

## 逐项处置

### silent-proposal-89354805ee4d7e77：神化升级传播

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：VLZ6CCT8AQ0A F35 T1、F43 T1—2、F45 T1。账本：silent-0237、silent-0238。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256：`ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`，本批保存同字节source.md。
- 原预期行为：已施放升级是状态变换，持有、候选、模拟应用和实际施放分别记录；未覆盖升级维持未知，不加入必打规则。
- 反例与限制：F35/43施放后获胜但F43仍大幅损血，F45持有而未施放后败；异盘比较不能证明施放导致胜负。
- 处置：waiting。普通神化升级传播已有局部实现；缺猛扑减费、猎杀者延迟抽牌、本能反应交互的完整生产校准，以及跨抽牌、选择、药水、SL、换战和接续的实际施放持续身份。
- 后续验证：固定F35前后手牌和F43同序/后抽输入，逐项校准完整调用；对三种缺口和跨战生命周期分别补证，再验51净扣/13净损。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-f2bfceddb1898dca：药水与长程预算

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：VLZ6CCT8AQ0A F43 T1—6、F45 T1/T4—5。账本：silent-0106、silent-0019、silent-0201。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256：`fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`，本批保存同字节source.md。
- 原预期行为：只提供时间、样本、当前净损净扣、每敌血量与覆盖成熟度；现有预算、药水持有价、护栏和目标规则保留。
- 反例与限制：F45后续问已有更多药水样本仍失败；单题退化不证明另一分配更好，未实打攻击候选不算真实输出。
- 处置：waiting。已核MC707ms与horizon1退化；缺同起点、完整模型、同总预算和随机池下现有与分阶段MC配对，以及样本成熟度和候选稳定性曲线。
- 后续验证：以固定输入、相同总预算和随机样本池做配对，保存样本随时间和排名稳定性；先排除神化模型缺口，不凭707ms设新常数。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-283a164780d11e69：神化经验消费者链接

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：VLZ6CCT8AQ0A F35 T1、F43 T1—2、F45 T1。账本：silent-0237、silent-0238。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256：`78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`，本批保存同字节source.md。
- 原预期行为：沿原神化缺口实现，保留经验silent-apotheosis-combat-upgrades的来源任务链接，不重建相同提案id。
- 反例与限制：经验文字已发布和提案正文重复，均不等于整项源码已在live实现。
- 处置：waiting。与原神化提案共享证据但保留独立经验链接；已有子实现未完成实际施放持续身份和未覆盖升级交互，不能登记整项duplicate。
- 后续验证：沿89354805ee4d7e77的完整冻结校准及生命周期验收读回；完整实现后两条来源链分别核实际live祖先。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-ebbfe3b97548756d：攻防、毒与资源联合验证

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：VLZ6CCT8AQ0A F43 T1—6、F45 T3—5及九次休息动作。账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256：`08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`，本批保存同字节source.md。
- 原预期行为：逐源计算当前属性、专属挡、毒已结算和未来毒、覆甲现场层数及临时减力期限；持有、已建、当前回复和路线投影分列。
- 反例与限制：F43毒可兑现但仍损57，F44回复后仍败；单轮减力、已持能力与八次回复不证明整战生存或固定安全线。
- 处置：waiting。毒结算、显示入伤和休息资源端点已核；缺原15条机制全部属性组合、升级联动、状态期限与资源及路线消费者的完整冻结生产联合校准。
- 后续验证：先用本批固定端点逐机制核模型，再组合升级、减益、被动和资源；路线/休息效果需同盘后继，不能由局部实现关闭15经验整项。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-e5b87be50f28f311：SL、护栏与实际执行审计

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：8JRE1C4H4Z2W F33首/三试T2、第二试T5、末试T11；F17 T6。账本：silent-0079、silent-0021、silent-0125、silent-0018。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256：`5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`，本批保存同字节source.md。
- 原预期行为：保留原答、护栏、SL和单动作回执；整轮净HP与单题预测分别保存，缺完整归属的收益继续未知，选择规则不变。
- 反例与限制：第三试T2多损12只多净扣7，但两试均败；末试延长至T11也败，不足以否定全部防御替换或SL。F17候选差在重问后变为实损7/净扣42。
- 处置：waiting。已核同指纹SL替换、护栏后重问和末轮截断；113个候选片段仍未认证完整收益，缺重规划后的持续归属、未选原线及完整后继，整轮端点不能代替候选因果结果。
- 后续验证：固定原指纹及决策行270216—270219、270282—270285、270263—270266和270437—270442，认证每个边界与续问；另需原线完整后继。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-49632bc4878fb597：当前属性、虚弱与独立成长

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：CA5KE8GFJ9X2 F13 T1/T3/T5。账本：silent-0005、silent-0231。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256：`aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`，本批保存同字节source.md。
- 原预期行为：把现场属性、逐击修正、虚弱和独立成长分项计算，不增加统一保血或输出权重。
- 反例与限制：虚弱后显示11/14没有关闭后续加压；计划中的步法未取得，不能把计划当正敏捷证据。
- 处置：waiting。已核下水道蚌力量成长与现场虚弱；该来源无正敏捷实测，缺逐击力量、正负敏捷、虚弱与独立成长四路径的完整冻结生产分源校准。
- 后续验证：固定当前A10移动事实、手牌及每击前后状态；分别补正负敏捷和多击校准，不能用单个步法或弱公式证明整条复合经验。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-66532328a585941f：持有、启动与实际能力兑现

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：5PM6JAQG6FNQ F39第二试T2；原提案反例F33。账本：silent-0021、silent-0009。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256：`56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`，本批保存同字节source.md。
- 原预期行为：将持有、计划、已建立及真实输出分账；没有完整受控对照就保留启动、构筑与SL规则。
- 反例与限制：F33建立组件后赢与F39未建立而败的敌人及生存条件不同，不能据此确定启动阈值。
- 处置：waiting。已核无毒目标冒泡实付1能且端点无收益；缺同HP、构筑、药水和完整抽序下不同启动顺序的整场受控对照及可复现收益函数。
- 后续验证：固定F39冒泡前后5→4能、29HP和敌35/72HP；不同启动序按同资源和完整抽序配对，按局号分组而非SL次数拟合。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷与毒的SL范围

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：61E2QS63Y9WU F17 T5—7。账本：silent-0030、silent-0027。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256：`f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`，本批保存同字节source.md。
- 原预期行为：分列玩家力敏、敌力和毒的实际结算；没有完整同盘结果就保持SL范围及换线偏好。
- 反例与限制：本场首试能赢，不能将其他局同抽失败归给固定顺序；毒有效不等于其他属性削减可忽略。
- 处置：waiting。已核吸取、负敏捷、双防御与毒结算；缺当前A10完整冻结生产整战配对及另一完整SL线，首试胜利不足以修改SL范围或阈值。
- 后续验证：固定力2→0、敏0→−2、敌力2、双防御各3以及67→34端点，另冻结完整抽序和另一SL线后再评规则。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-5264153a4a4b0e5c：召唤、航行与实体退场

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：61E2QS63Y9WU F23 T2—5。账本：silent-0039、silent-0209。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256：`b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`，本批保存同字节source.md。
- 原预期行为：保留所有目标选项，逐实体列成长、血量和攻击；推演相同者并列，不强制首杀。
- 反例与限制：T4本体线净扣47/损15已兑现，幻象仍活；39伤零损的另一focus仅预测，不能当整战胜线。
- 处置：waiting。已核两实体航行增力及幻象余2仍在场；缺召唤、航行、复现和退场的完整生产校准与另一focus完整后继，已有召唤子实现不能关闭整项。
- 后续验证：冻结A10召唤脚本与实体连续身份，分别验0→3→6、幻象14→2、死亡后复现；另取另一目标完整后继。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

### silent-proposal-bddfa690a84e03d0：熟睡甲虫醒来与成长

- 角色/范围：silent/A10；来源任务见原提案，实现任务strategy-proposal。
- 已核证据：DUZUBAJ3A8GP F30首试T1—6及四次尝试。账本：silent-0128、silent-0079。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256：`b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`，本批保存同字节source.md。
- 原预期行为：按当前进阶、睡眠、眩晕和力量成长分别验证；临时减力不当成关闭后续成长。
- 反例与限制：四试均败，不是四个独立样本；末试较首试多扣3但多损2，不能只以敌血拟全死排序。
- 处置：waiting。已核睡3/2/1及醒后力量和攻击成长；四尝试属于同一败局，缺伤害唤醒、眩晕接续的完整生产校准和同抽换序获胜后继，不能拟合血价或固定杀序。
- 后续验证：固定睡3/2/1、醒后0/2/4力及18/20/22显示攻击；补伤害唤醒/眩晕边界与同抽换序完整结果。
- 本批不拟合新阈值；发现帧不充当盲测，同局SL不扩大独立样本。无源码可回退；后续有实现时按独立红绿、沙箱测试、live祖先和双通知流程验收。

## 当前源码与实际live

核验时live HEAD：`4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac`。source-audit.json记录18叶base/live/blob/工作文件SHA及实际live祖先。五叶只有Roy/Dai注释文字差异，其余相同；本批没有覆盖live文件，也未把main最新提交冒充实际live源码。

| 文件 | 最近修改该叶的实际live祖先 | 有界判断 |
|---|---|---|
| agent/src/reflex/silent-apotheosis.ts | `a11dd870b09f3f1b67fcb5d6c08af6573fd809e0` | 16种已观察卡的有限普通升级转换；未覆盖全部升级交互。 |
| agent/src/reflex/silent-apotheosis-reference.ts | `3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17` | actual_cast_this_fight=null；当前牌面不能证明持续施放身份。 |
| agent/src/reflex/silent-selection-audit.ts | `05cd292c6f01bb31e406473d3a9843e659d62b93` | 预测阶段与请求；actual_turn=null。 |
| agent/src/reflex/silent-hp-guard-audit.ts | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | 护栏前后预测；actual_outcome=null。 |
| agent/src/reflex/silent-selection-dispatch.ts | `bade647f9fe4c9103b40e2f26b26296692ad24b7` | 单动作回执；whole_plan_executed=null。 |
| agent/src/knowledge/monster-db.ts | `4ed3c72df30f27b881da637aebf528b97440e0bb` | 当前进阶事实读取；不对HP/移动伤害套五样本门槛。 |
| agent/src/knowledge/room-costs.ts | `295a90aef9eb6f5b267490294f7733806419c45a` | 房间代价仍MEASURED_ROOM_MIN_N=5。 |
| learner/lib/selection-execution.ts | `9b87d54f097d84521152e6cca8d6072af8140394` | 离线追溯；完整候选实果始终未知。 |
| learner/lib/selection-turn.ts | `9b87d54f097d84521152e6cca8d6072af8140394` | 观测窗口与HP路径；不认证候选因果。 |

以上仅定位现有覆盖，不把这些提交登记为本批implemented/duplicate，也不声称模型完整、自然局采用或胜率改善。

## 验证、账本与交付

无源码修改，撤源码失败/恢复通过不适用；tsc、vitest、cases均null，没有运行或借用历史套件成功，没有新commit、live合入或发布号。scratch证据脚本与消费回放不是生产改动。全部游戏事实仅来自本批六局及对应原提案，没有读取其他角色知识或补入预训练结论。

仅经根learner/ledger.py update追加本批报告/提案链接与waiting说明，已有claim、status、evidence、first_run、asc、prior和version保持。不把历史shipped改回proposed，不重复新增经验或提案；原队列由调度器消费proposal_results更新，父学习入库/量化要求保持待证。本批没有发现新的与旧知识冲突结论，不重发已有通知或代填他人确认。

本批启动日志原thread_id=01a13927-0faf-7081-b229-9d5031efa146。启动命令为gpt-6.1-sol/xhigh/service_tier=default，与任务文字high不同；平台没有可用的本会话模型参数修改或原生请求核验接口。未改账号、参数或权限，不声称已切换high；launch配置不冒充原生请求模型实证，交ops核原会话。

交运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-144305/learner/runs/20261014-144333-strategy-proposal/proposal.md。报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-144305/learner/runs/20261014-144333-strategy-proposal/report.md。完整逐项结果见report.json。最终完整性、CLI读回和gitleaks结果另见final-verification.json。

# 静默普通策略批次：持牌签名与连续战资源分开复核

批次：20261024-164315-strategy-proposal。派发为普通 tick，无 proposal_ids、proposal_repair、research_request 或 implementation_request。只处理本批十个已结束的 Silent A10 局；派发键 A11 不代表本批观察进阶。

## 唯一新增候选

`brain-strategy-candidates.json#/entries/0` 为真正的 `brain-strategies-v1` / StrategyEntry，ID `silent-brain-poison-footwork-realization-review`。触发：第一、二幕，构筑/购物/营火/幕初/备战题，当前牌组同时有原始 ID SNAKEBITE、ACCELERANT、FOOTWORK；不推断替代件等价。

做法是复核实际持牌、实建、最近赢战的净HP/药槽消耗和下一战缺口，不把签名当作已能持续生存。不给新数值、拿牌优先级、必喝药、SL或终局规则。与原 `silent-core-poison-defense-observation`（silent-0352）、路线（silent-0019）和休息（silent-0020）经验合并追溯，原ID与历史分母不动。

- BKK8KAR3E83C：F6已持三牌；F17首试胜77→9，F19赢63→30，F24赢29→13；F33四试均未过知识恶魔，末试T14死亡。首次持牌为 states 原行531183，offset=16955606955，bytes=22798，SHA256=67d3fa79d463f53c53416a582885c0b21669752a65a5b9f8b66d80f6af89a07c。
- TB5YKELW0355：F14奖励后才持三牌，原行534478，offset=17063075172，bytes=24384，SHA256=ce69a156e9268bd238fd2e9eed854212c0e01665f9768645db8b7f03d23ec58e。F17首试胜61→26；F28赢51→17、F30赢38→18；F32休至36后F33双蟹四试失败，末T7归零。
- 反证/限制：两局都过第一幕，不能写成“组件齐备必败”。终败也不证明组件或回血是致败原因。各只有一个独立局，SL不增加独立分母；替代拿牌、路线、休息与用药时点没有同起点整战反事实。未验证其他进阶，确切运行源码及游戏版本未知。

窗口、入口/退出及全部原始指纹见 `candidate-source-refs.json` 与 `whole-run-audit.json`。这是自有局部候选；本批没有绑定并实读外部统计和同流派外部代表完整局，不称三输入完整剧本或真人偏离已经验收。候选置信度0.35，observational；旧64/281等分母不继承。

另一个重要限制：两局F32的原计划已经明确写出启动和持续防御缺口（`existing-plans-counterevidence.json`）。因此不能把本候选描述成“纠正了当局误认成型”；新增的是可查询表达，能否新增有效信息和改善选择仍未知。TB原答案引用旧双蟹策略只属于答案自述，不能代替工具查询的原始回执。

## 已有经验及rk去向

`experience-strategy-rk-map.json` 覆盖11个原经验ID与对应账本：1个新增局部候选、6组复用、4组等待、1组不适用；没有正式更新。组数不是独立策略数或局数。原244条不回刷，不删除旧经验。

QVDR弃生存者：完整题已标后继，chosen确为弃牌且completed，后继手牌已失去生存者；重算发生，未看到旧计划被继续执行，因此不是新纯bug。保留分支未实打，不发布“必须保留”规则。它是选择题，不能直接当#28的combat_line遭遇rk。

37U最后毒药：T3先挡到12，再饮最后一瓶，敏捷变2，既有12挡没有追补；结毒后两敌仍17/27血，17HP对30攻死亡。原机制已在silent-0119/0278；不据此确定提前喝药整战能赢。缺原Plan capture、配对结果矩阵、留出回放和改善区间，不造新rk或启开关。

## 验证、发布与回退

无源码或正式知识修改。仅将候选交生产解析器、检索器和请求注入函数做离线固定数据读回，结果见 `candidate-validation.json`；不调用模型或游戏。它不等于正式库固定读回，更不等于自然查询、采用或收益。候选未发布，后续应按现有知识发布与消费者门处理；需要改变动作/数值的主张另有足够证据后再提实现，不能把本候选当已实现代码。

因此 tsc/vitest/撤源码失败及恢复测试均不适用，记null；没有提交、合入、版本或shipped。回退仅需撤下未发布候选，无live回退动作。账本只经根目录ledger CLI以proposed登记，实际ID见 `ledger-add.receipt.txt` 与最终报告；无combat/potion/sl/terminal/structure新规则提案，无新code_proposals ID。

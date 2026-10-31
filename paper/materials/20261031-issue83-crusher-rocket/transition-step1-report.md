# 第一步终结论：定位并窄修99格挡跨回合丢失

按83/6543316589、6543440546。定位：自有原first-tune9TG1RP5LFAAK F33 T7最后ready原帧，Rocket26HP/54毒，Crusher125HP/力量3/格挡0/ENLARGING_STRIKE_MOVE。结束回合后Rocket毒死，原T8 Crusher103HP/力量9/格挡99。现有turn-solver已给出+6/99，applyPlan转移到SimEnemy后，又在处理当前敌方招式时执行 `e.block=(burrowed?e.block:0)+move.block`，把毒结算新获99清成0。这是整场状态迁移bug，不能以常数“已建模”否认。

在固定2a43源码/569冻结知识/catalog上，从12场原tune逐回合最后ready状态，调用同simulateFight两回合；第一回合固定空出牌隔离敌方结算，solveTap只读取下一回合solver输入，不替换策略、不执行游戏/调用Jev。3个固定seed1/2/3共238行：219行成功捕获、12缺相邻settled、7原board无解保。before/after只有上述首试T7的3个seed行改变：下一回合Crusher格挡0→99，HP/毒/力量路径和其他235行原样；无解仍无解。

窄修候选只在整场、已核Silent A10、双实体HP219/209和Rage powers、Crusher本回合Enlarge/0block成立时，利用只读traceSteps确认Rocket出牌后仍活且毒≥剩余HP、结算后死，存活Crusher确得6力量/99block，才保留新99到下一回合。提前由卡牌杀死的对照不保留，其他方向/回合/进阶不扩大。排除未解析手牌/选牌、Howl/回合末被动随机杀等不清晰时点。短程solver一字未改；A8已知Weak+Rage多算1HP不混修。

候选源码只在自有.artifacts隔离视图，patch及两叶SHA已固定：crab-poison-rage-candidate.patch / crab-poison-rage-candidate-manifest.json。生产源码/live均未安装；原Aeon WIP/测试完整保。候选生产tsc0；6个guard（实测/禁用/A9/Ironclad/坏HP/卡牌先杀）及真实双蟹short-five数值等价验证；原immutable isolation runner对solver/5回合输出234874字节SHA1bce9c63…完全一致。该固定字节核验不冒acceptance.py要求的已提交候选及完整源码发布检查；正式B4/B5提交身份/唯一组合检查仍待后继工程批。

第一步结论已达到“定位并验证窄修”，不声称模型准入。C沿主管新授权紧接：先预注册唯一原始概率候选，再对已看val一次固定复验；无论结果如何保留原输出，不能换系数/候选再刷。C通过也先主管报Roy，不开关。nice19、最多两计算进程；不加full抢#77。

补记：真实双蟹short-five初次严格整对象比较只差budgetNeedMs（58.7773/57.9218），是固定巨额budget下的耗时估计元数据；原r2输出保留，全部决策字段核同，详见crab-carry-guard-receipt.json。immutable runner的234874字节比较本来就逐字相同，两种证明分账。原189a2c9d3之后仅修正这一诊断说明及patch零上下文序列化，模型源码/输入/准入标准不变，C尚未开始。

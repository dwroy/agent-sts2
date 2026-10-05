# 静默猎手策略提案：当前阶段结束窗口单独供 Jev 比较

记录时间：2026-10-05 14:08 CST（写入前已执行 date）。基线 main，干净合入后的基线 aa82d85fc6125113a12ff88d1611c86a99c1ce66。自行完成，无下级 agent。

## 选择与证据

从 fix-queue-v4.md 08:33 已批准的全死排序策略项，选择新增证据所支持的阶段窗口事实子项。上一批 silent-0098 的当前进阶 boss 事实已经上线 S1.strategy1，本批不重复实现、也不声称完成完整时钟校准。

十个指定来源局经 logs/runs.jsonl 核对全部为 SILENT：XYYQYBRM2A01/K3676LU8B0UH A1，CSBR5CRDWQNB/ZZMYZ5UBCG72 A2，10GPK5XGHCK3 A3，1NZ8FE5F34R9/F9PP859XZ3RJ/9YBKCNBFP0X5/1LMBFGSMCWKU A4，UACFSW4VDDLD A6。只用本角色证据和复盘，不从其他角色推打法。

既有账本 silent-0100：UACFSW4VDDLD A6 F48 第6次 T4。原始 Jev 提问 aa629d05-b9b8-4591-955b-45b243bf299c，05:36:12.684Z：敌当前阶段4/100血，玩家51/66；plan1 肾上腺素→打击，伤4、预测损0、kills；plan4 防御→逃脱计划，伤0、预测损9、rollout_best。复盘及决策记录核对 Jev 信心0.77选择 plan4，第二题 597f2389-e9ab-4f05-91f2-f628ea4a392e 又选择结束回合，14挡对22实损8、51→43；敌仍4血。T5才结束第一阶段，T6进入第二阶段，T9死亡。所有整战模拟原始胜率为0，plan1 长程24/24死，不能因此抹掉本回合已列出的阶段结束窗口。

证据保存在本目录 jev-evidence.json / state-evidence.json。状态固定夹具来自 observed_ts 2026-10-05T05:36:09.039Z；独立复盘 notes/lessons.md:4728 和根目录 learner/runs/20261005-134302-postmortem。既有观察登记为 silent-0100，本次只经根目录 learner/ledger.py update 将提案和提交去向追加为 proposed，不冒用先前已 shipped 条目。

## 反例与边界

没有同局面执行另一条 T4 线的胜负对照，不能证明提前结束第一阶段必胜。UACFSW4VDDLD 的前几次更早结束第一阶段仍然失败；这不是统一抢输出或压过长程推演的规则。silent-0079：1NZ8FE5F34R9 F29 T1、9YBKCNBFP0X5 F48 第4/6次 T7，在无击杀的场面用格挡换攻击多损8且均失败，说明不能将本提案扩成全局进攻权重。静默女王两种获胜顺序（silent-0090）也没有统一顺序对照，本提案不触及女王。

## 预期行为和实现

仅对静默、单个仍存活 TEST_SUBJECT、现场 ADAPTABLE_POWER>0 的阶段：依据已列出方案的 enemyHpAfter 明确是否结束当前阶段。存在不死亡且不消耗复活的阶段结束线时，所有已列出的确定方案附加 current_phase_ends 和中文 phase_end_reference；在阶段结束线中按本回合预测损血给参考，最低损血相同的全部标并列。明确后续阶段仍需战斗、整场胜负未验证。随机药水的 Monte Carlo 中位线不是确定结果，不作为阶段结束参考；药水选项仍照常保留。

接入现有 Jev 题目的 factsOf，不改 rollout_best、长程排名、自动执行、护栏、SL 或选项集合；Jev自行决定。铁甲没有新增字段，执行及排名等价。没有药水代价、过滤、否决、留药或提前喝药规则。怪物数据库当前进阶第一样本启用沿用 S1.strategy1，房间代价5样本门槛保持。没有架构调整、知识生成脚本改动或数据重建。

## 固定验证

新增五个用例：实盘4血阶段结束与不结束分开；相同即时损血标并列且不修改输入；死亡/整场胜利/缺失结果/单纯高伤不误报；其他角色、最后阶段、多敌不新增事实；实际 Jev 问题里保留原数值并附加字段。用固定状态和 makeKnowledge 的本局手牌类型、空怪物数据库、禁用长程模拟及 mock 经验/信任读取，不调LLM、网络或刷新知识JSON。撤源码失败、恢复通过及完整自测结果随后追加。

## 未实现

整体全死排序权重、巨兽拖延、路线/休息阈值、固定击杀顺序、SL范围及完整构筑时钟校准：指定证据仍不足以规定新的全局规则，保留待办。留药、提前喝药和药水过滤不符合任务边界，不实现。

### 固定验证结果（2026-10-05 14:09 CST，写入前已 date）

撤源码：移除 combat-plan 接入并将新函数恢复为空事实基线，cases-red.log/.exit，3失败/2通过、退出1。恢复：cases-restored.log/.exit，5通过、退出0，包含实际 Jev 题目接入验证；不会因函数导入不存在而伪造失败。完整沙箱检查正在运行，完成后追加。

### 提交前检查（2026-10-05 14:13 CST，写入前已 date）

源码提交 1d57f9d0dbbb63603e9ce9768e74cb2021478464；source-suite.log/.exit：入口退出0、tsc0、vitest171文件1971例加paths单fork1文件11例，共172文件1982例通过。没有超时或高负载重跑。gitleaks-staged.log无泄露；git diff --check通过。英文提交注明UACFSW4VDDLD A6 F48第6次T4和silent-0100。

### 实际合入与交接（2026-10-05 14:19 CST，写入前已 date）

源码 1d57f9d0dbbb63603e9ce9768e74cb2021478464 → live合入 2b70928af6e2d02f6f683c9b522d601913ed5204 → 发布记录 0a066c2f9dd01c0dba7a34b03570e646557bf817，eval S1.strategy2。锁内等待知识构建器、检查无待提交刷新数据；知识路径重叠为空。合前提交 b05c898c38d9d940f5627e686162295ba0320dd9。仅decision-log追加记录冲突，保留双方全部行后完成合并，live-preservation-check.json核对双方行计数无丢失、四个源码/测试路径与源码提交逐字一致。没有知识冲突、覆盖或回退，无生成器改动、不重建。

合后live-suite.log/.exit：tsc0、171文件1971例加paths单fork1文件11例，共172文件1982例，退出0；源及合后均首次通过，无超时重跑。gitleaks-staged / gitleaks-merge / gitleaks-release均无泄露；live-merge.exit=0。

账本只经根目录learner/ledger.py追加silent-0100 proposed（by=learner:strategy-proposal），已登记证据、提案及真实源码提交；本次追加实际上线去向但不标shipped。运维依据本目录handoff-ops.md及strategy-done完成事件核实提交与S1.strategy2，再登记shipped并机械同步main。完整tsc+vitest由调度器在沙箱外补跑，当前仅报告固定沙箱结果。没有推送、play、停局、改配置或其他角色知识。


### 运维完成事件归档（2026-10-05 14:30 CST）

14:25 strategy-done：核实源码1d57f9d0dbbb63603e9ce9768e74cb2021478464→合入2b70928af6e2d02f6f683c9b522d601913ed5204→发布0a066c2f9dd01c0dba7a34b03570e646557bf817均为实际live祖先，S1.strategy2唯一。main同步固定完成提交，只有decision-log冲突，保留双方所有行；代码、eval版本和知识逐路径等同已测发布，知识相对合前b05c898c无改动，复用已通过检查，不重复测试或改live。

源source-suite.log/.exit与合后live-suite.log/.exit均入口0、tsc0、172文件1982例通过。末尾回报JSON的cases=5是新增针对性回归口径（撤3失败/2通过、恢复5通过）；完整固定沙箱数为1982，不修改学习者原回报。完整沙箱外tsc+vitest由调度器后续learner-checks确认，本轮不提前宣称通过。

既有silent-0100经learner/ledger.py/by=ops追加S1.strategy2 shipped；保留本批三条learner proposed历史，共归档4行，工作区全库102项0问题。其他尚未收到完成事件的经验批次行及历史排序保留工作区，不纳入本轮提交或登记上线。只上线学习者有证据的阶段结束事实子项，无另一条T4实战胜负对照，不新增知识结论；整体全死权重、完整构筑时钟及其他策略仍未实现。

回报ops/codex-ops/learner/20261005-140217-strategy-proposal.out，原交接learner/runs/20261005-140218-strategy-proposal/handoff-ops.md。无新的Dai待定事项，不改配置或停止对局。

### 完整外部检查完成（2026-10-05 14:35 CST）

14:34 learner-checks正式确认本批独立完整tsc/vitest exit0：固定发布0a066c2f9dd01c0dba7a34b03570e646557bf817、树ee4f8ebb563e4df5dba985f0893bd29c9b5974c2逐字核对，main/live祖先成立；223文件2790用例通过、2跳过（总2792），开始14:20:31，耗时471.35秒，原始日志`ops/codex-ops/learner/20261005-140217-strategy-proposal.fallback-ee4f8ebb563e4df5dba985f0893bd29c9b5974c2.checks.log`。此前完整检查待办至此完成，原等待记录及学习者测试口径历史保留；不重复派发、测试、合并或登记silent-0100 shipped，无新Dai事项，对局照常。

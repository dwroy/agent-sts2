# V6 核心构筑卡单次学习验收

批次 `v6-build-cores-20261019-1838` 于 2026-10-19 19:47:48 CST 正常退出，exit=0、无超时/取消，耗时 3304336ms。此前 dry-run、一次派发及冻结回执见 `../2026-10-19-v6-w11/`。未续派。

实际原生线程 `01a153ca-d781-77a3-99c8-73a9c655c8c8` 的 turn_context 核实 codex1 学习者 home、独立工作树、`gpt-6.1-sol / xhigh`；service_tier 无原生值，不补报。启动器及子进程此前实核 nice=10、240 分钟，未改共享配置。账号只核 auth 目标路径，未读密钥内容。详见 [native-context.json](native-context.json)。

独立验收重新计算 645 个冻结输入、138 个封口产物、20 个 result 引用的 SHA，核验 372 局/244 条正式经验对象、全部覆盖和双向组合链接；两个检出中的 13 个正式知识文件字节均未变。草稿 4 方向、14 组合；244 条覆盖为 linked=14、unrelated=131、unknown=98、disputed=1。接受的组合×局对 5208 个、另列缺证组合×局对 1116 个，8260 个唯一组合/进阶/版本/尝试口径指标层；n=0 指标保持 null、原因与未知。严格校验 CLI 退出 0。详见 [final-independent.json](final-independent.json) 和 [strict-validator-final.log](strict-validator-final.log)。

独立回读 262073 个原日志字节段、9124263036 字节，逐段 SHA、冻结边界、372 局范围及 metadata 与引用核对通过。没有重新计算完整日志前缀 SHA；这项验收证明来源和结构，不证明游戏因果结论。原始统计中 7213 个战斗可见段不是独立对局数，抽取的两项错误保留。详见 [raw-independent-second.json](raw-independent-second.json)。

最终草稿仅在 `.worktrees/v6-build-cores-20261019/knowledge/characters/silent/pending/v6-build-cores-v6-build-cores-20261019-1838/draft.json`，8253203 字节，SHA `a4755da27f3d35b7592a7b936ebc8c92ac45797aaab0dce3ea580e418a8e3137`。过程和逐证据产物保留于 `learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/`。本报告没有将草稿复制为正式知识或合入知识内容。学习者树 tracked diff=0，仅该 pending 目录未跟踪。

ledger CLI 独立读回 `silent-0525` 至 `silent-0528` 均为 proposed；不存在 shipped 验收。14 个组合中 13 个为重复观察的 common 候选、1 个仅 observed_case；simulation 指标均无样本，不称最优或已验证。12 项缺证类别保留，不能为凑齐组合类别填写牌表、理想升级或转向规则。R 候选带学习者记录的遗物前提，当前 build-core 的 cards 格式没有可执行遗物门槛；在消费者能执行前提之前，不称该候选可安全消费，也不自动正式发布。父“学习入库”要求保持未完成。

学习者的三项异议原文如下；开发未改写为新游戏知识：

> prior：将9.1的持有签名视为第6节完整成型。新证据：本轮逐牌实出/能力/后继收益见证比持有集合更窄，逐组合全部未生效和失败局留存。影响：旧签名统计不能直接复制为新组合的formed_runs/startup_turn。未知：漏帧/重放边界中的真实首次及独立组件因果。沿ops→watcher→Roy转达，本批不代填ACK。

> prior：必须填齐四种组合类型或理想升级/转向规则。新证据：冻结观察没有最小充分、全牌池穷举或可比最高DPR对照。影响：保留有实效候选并逐方向missing三种类型；不以格式目标生成牌表。未知：受控实战比较结果。

> prior：R的纯cards条目可直接表示完整核心。新证据：本角色冻结经验和实弃见证均带TINGSHA/TOUGH_BANDAGES前提，两遗物不同收益。影响：R候选必须连同fits条件读，现schema无可执行遗物门槛，不能宣称消费者已可用。未知：去遗物反事实和未来格式承载方式。

通知 `b5b53e0d8bebe1df7fb30468` 已经现有通知 CLI 转入 `notes/for-roy.md`、`ops/inbox-dev.md`；回执仅确认 ops_forwarded，watcher_received / roy_notified 仍 false，不代填确认。详见 [notice-receipt.json](notice-receipt.json)。

建议 Claude 先处理遗物条件的格式与运行时承载，再决定发布、补证或续批；现阶段保留 pending 与证据工作树，不自动派发或启用实战。W3 当前检查收尾后停止。STOP 保留、live 不重建、Regent 暂停。

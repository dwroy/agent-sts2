
## 2026-10-07 08:30 静默复盘：蛇咬施毒模型遗漏（交学习者）

- [ ] **非阻塞纯 bug，silent-0219，仅转录学习者定位**：`agent/src/reflex/card-model.ts:904`施毒名单遗漏SNAKEBITE，`:1054`仅输出非零poison，新增7毒未进入同方案推演。KQQELQSZ382Z SILENT A10 F17末次族母T7只出蛇咬，原预测旧9毒，实际9→16、回合末扣16，独立少报7；T4切割→防御→蛇咬原预测9伤/损16、实18/16，差9中蛇咬7与旧攻击八折2分账。首证KAY522KT5NXR/A0 F2 T1候选无毒且列未建模，F14 T1实际0费给7毒、末25→18余6，免费来源未核定；first_run=KAY、prior=no、observed，不称常规毒模型已修分支回归，与0008分账，不保证整场转胜。
- **旧silent-0216追加repeat证据，不重复开单**：KQQ首试F17 T4打击→切割→防御→匕首雨原19伤/损16、实25/16，直接6+6+4+4=20被逐击八折成4+4+3+3=14，旧5毒结算正确，独立少报6；`combat-plan.ts:78/:135`覆盖名单缺POISON_POWER和`turn-solver.ts:1460`定位由学习者给出。原首证K3676LU8B0UH/A1、prior=no、observed及原claim/版本/历史保留，仅台账repeat证据增加1。
- 原回报`ops/codex-ops/learner/20261007-081301.out`及原文/10行台账/数字核对/三项追加勘误见`paper/materials/silent/20261007-0827-kqq-postmortem.md`；行号为复盘时只读live定位，不冒称复原f8e01696+dirty开局源码。新0220是蛇咬机制，留学习者，不入纯bug队列；075131独立boss校准继续按原任务，对局照常。

### 大脑只用 codex，不用 DeepSeek 兜底（Roy 2026-10-07 08:44，高优先）
Roy：「不要让 ds 做，重新让 codex 来做」。live .env 已去掉 BRAIN_FALLBACK=deepseek（下一局起）。但没有兜底时，大脑答不了的题会退到 Jev/代码，仍不是 codex。要做成：
- **codex 不可用时对局暂停等待，不由别的引擎代答**：大脑判定 codex 不可用（额度用完、登录失效、预检失败、连续超时休息）时，对局在安全点暂停（例如在当前决策前等待并定时重试 codex，或通知 autoplay 停在局间），恢复后由 codex 接着答；暂停和恢复写日志、写收件箱。不要让 Jev/代码替大脑的路线、选牌、事件、商店、休息、整局计划作答。
- **统计口径**：大脑主要由 DeepSeek 回答的局（已知 MCCK2602T1SR、UJ0K3G10609Y、U8K28UUGYP3U、L9SGRBB5R698、D4LJ9QMGFB8Q；以及 10-07 额度用尽期间的局，按 brain.jsonl 的 engine 判）在爬塔统计、学习曲线和论文表里单独标注、默认不计入 A10 战绩；学习者复盘照常可用作证据。

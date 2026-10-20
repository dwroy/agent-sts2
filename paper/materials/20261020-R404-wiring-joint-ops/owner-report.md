# R404 战斗奖励选牌接线修复

2026-10-20；原任务 Claude 22:05，owner v6-w4w6 / codex1 / native thread `01a15382-68eb-7093-b677-040c9b45767f`。源码候选 `903fbfabb`；精确 base/tree、五叶 SHA/blob 与运输补丁见 [source-manifest.json](checks/source-manifest.json)。本轮未更改 live、当前对局或开关，未执行模型请求、play 或完整 vitest。

已定位并修复两处工程问题：无地图的奖励帧丢失实际 Boss，导致安全门拒绝已有构筑评估；交回大脑的日志把真实计算耗时和缓存工作写成零。安全门阈值、唯一当前 Boss 要求及 A/B 算法保持原样。

## 根因与只读 live 复现

`Y427BMQH8AU6` 的冻结构筑评估审计共有 **23 题**，耗时最小 4252.926 ms、中位 4255.121 ms、最大 4548.537 ms；各题均已实际模拟。原 20 题线上观察、随后 22 题截点继续保留，此处为之后冻结的 23 题，不改写早先口径。23 题中实际 Boss 对应的 92 个选项行均满足样本/指标条件；这只是已存在结果的核查，不代表修复后重新模拟或模型质量验收。

冻结奖励帧 `map=null`，但 `run.boss_id` 已知。原 `projection-input.ts` 要求当前帧有地图 Boss 节点才传 `visibleBosses`，于是把已知 Boss 丢掉；live 工厂继而展开历史 Boss 池。`cardResultKnown` 要求本幕唯一当前 Boss，故已有结果也被判为 0/4。旧 `recordConstructionHandover` 又默认记 elapsed=0/cache=0，掩盖了已经发生的计算。

只读入口重放使用 live HEAD `048a9713bd4be09ad5f6d3f6131e8b729f51aece`（行为 `eae56f790` / V6-R404）、真实角色历史包和冻结奖励帧：

| 冻结帧 | 原 live 输入 + 原 live 工厂的本幕目标 | 修复输入 + **原 live 工厂**的本幕目标 |
| --- | --- | --- |
| F2 | CEREMONIAL_BEAST / LAGAVULIN_MATRIARCH / SOUL_FYSH / THE_KIN / VANTOM / WATERFALL_GIANT | WATERFALL_GIANT，F17 |
| F19 | KAISER_CRAB / KNOWLEDGE_DEMON / THE_INSATIABLE | KAISER_CRAB，F33 |

重放未调用模拟引擎或模型；历史包前后 SHA256 同为 `bc0290ae8354871156068817f0b88c7712af105796fb208d73a2ec03fc08bcc4`。入口冷准备约 1.9–2.2 s，仅供复现，不能当作整题或线上性能验收。完整输出见 [live-input-replay.json](checks/live-input-replay.json)，冻结帧与原审计保留在 `frozen/`，逐件 SHA 见 [frozen-evidence.json](checks/frozen-evidence.json)。本候选基线有更新的 W3 工厂，但运输仅需两处消费端改动；上述原 live 工厂读回明确排除了依赖新工厂修复的可能。

## 最小修改与回归边界

- `projection-input.ts`：Boss 身份始终来自实际 `run.boss_id`。Boss 层数优先用当前地图，再用同局/同幕/已观察的地图记忆、已选路线；缺失时只读开局冻结的本角色/同进阶/先前完成局/首试 checkpoint 层数。第二连战目标排除，歧义或缺失继续 unknown；不用历史 Boss 替换实际身份。
- `construction-safety.ts`：拿牌交回大脑时记录 `v6CardResults.telemetry` 的真实耗时，加上已有调用耗时；缓存按拿牌日志既有口径记命中和立即结果行的未命中数。无结果与其它题型维持原口径。
- 两个固定测试文件与一个冻结 fixture：真实 F2/F19 战斗→奖励帧经 fixture HTTP 进入实际 `runLoop`，跑生产输入、工厂、A 提供方、门槛、题面与路由。仅战斗开场/数值 runner 和外部 Jev 回答固定；不是实际 Jev 请求，不对真实游戏执行动作。每幕均 4/4 已知、Jev 恰一次、大脑零次、无 `v6_unknown_to_brain`。同时锁住 off 零读取、战斗显式 idle 参数、规范 Boss key、错误/未来/跨局/跨幕地图记忆不采用，以及缺来源保持 unknown。

fixture 牌定义及升级定义只复制已发布目录的必要子集，带源文件 SHA；未新增机制或修改知识。奖励三选一严格入口、其它场景 V5 大脑节奏、出牌 off、方向搭车均不改。

## 检查与交付

同组新增测试在原运行时代码上复现 **5 败、20 过**（两条循环、两条输入、真实耗时日志），原红灯保留在 [original-runtime-red](checks/original-runtime-red/)。修复后两文件 25 项通过；扩展定向 **8 文件 / 96 项通过，13.14 s**，`tsc --noEmit` rc=0，源码 gitleaks rc=0。最终日志见 [checks/final](checks/final/)。早期夹具缺目录、全局角色未设置及过严调用次数断言等开发失败另存 `fixture-development`，不冒产品回归或删旧失败。

本轮所有检查 nice19/ionice3，vitest 单 worker，TMPDIR 在主盘。按原 ops 单点窗口安排，不另开完整检查。正式最小补丁/五叶映射交 ops，待实际最新 live 知识冻结后作最终真实联合 tsc/full；完整绿与 next-boundary 发布、版本登记及读回由 ops 沿原授权完成。本候选不表示已上线，不回退当前局。若需撤回本候选，恢复两运行时原前像即可；当前 `CARD=jev` 的原安全门仍会交回大脑，不影响其它开关。

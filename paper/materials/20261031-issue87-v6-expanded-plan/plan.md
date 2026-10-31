# #87：扩大 V6 闭包对齐方案，待批准

依据 [77/6544542749](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6544542749)。这是文档提案；扩大范围的源码、测试、声明尚未应用。已批准的 r2 与两叶修改冻结在原工作树，r1 固定分支仍为 `70040a92d43c60351190fb9afac1c00adde2b679`。不提交在途代码、不改 LIVE、配置、STOP、超时或方法票。

## 建议批准 A：恢复调用方，撤出三个生产文件

**建议从 main 的生产源码撤掉三文件，同时恢复真实调用方及相关类型/实现，再重建声明。** 原源码与直接测试逐字节归档到 paper/materials 下，保留原路径、main blob、SHA256、来源提交及适用合同；805 原论文/实验/历史回执不删除或改写。不是把文件从 LIVE 补齐。

冻结比较：main `159cfa750cd94dbafbf84d26b1e2f79afdd0a2cb`，LIVE `3a3eba6a6eb35abc82d06c325dec340b23cc0d70`；物理 LIVE 文件 SHA 与提交一致。当前 main v6-history 声明 306 节点，其中 code 295、runtime 11。295 个 code 节点声明哈希均匹配 main；其中 15 个和物理 LIVE 不同，具体见 [完整逐节点账](closure-audit.json)。这不是最终安装组合的验收回执。

805a0ffe9 在现闭包触及 15 个生产文件：7 个字节不同、3 个缺失、5 个已相同。缺失文件的真实静态边是：

- `v6-request-factory.ts → v6-formation-table.ts`；
- `v6-projection.ts → v6-table-copy.ts`；
- `v6-room.ts → target-values.ts`。

只删除声明三项，会留下真实未声明依赖。`formation-table` 在 805 之前已有旧版本（805 为 M），其余两个为 A；直接 revert 805 也不能得到 LIVE 的“三文件不存在”。

**申请批准以下完整源码目标：12 个恢复 + 3 个撤出。** 其中原两叶保持原批准的字节目标；闭包里 7 个 805 差量，加 4 个前置 303bbb1ac 差量恢复；另外 3 文件撤出。每项前像、目标 blob/SHA 与理由在 [actions.json](actions.json)，拟议源码 patch 在 [proposed-source-only.patch](proposed-source-only.patch)，均尚未应用。

| 路径（agent/src/ 下） | 目标 | 来源 |
| --- | --- | --- |
| `hand/screens/v6-room.ts` | `4c3675475c3c0e6d8418a367ae50359463014002` | 805-in-closure |
| `sim/continuous-boss-result.ts` | `74eadc554a45e36b77e9ef8db93d08023d4260da` | 303bbb1ac-predecessor-in-closure |
| `sim/v6-completion.ts` | `ae6cef56a8531525fbcbe06ac6f8e392204bdefe` | 303bbb1ac-predecessor-in-closure |
| `sim/v6-formation-table.ts` | 删除生产文件，原件留档 | 805-in-closure |
| `sim/v6-precompute.ts` | `eaecc43479ab5b2febe82494f7a95c98166223d9` | 805-in-closure |
| `sim/v6-projection-entries.ts` | `ca5c44dcdeac91d445123f8bbf764211edc25f16` | 303bbb1ac-predecessor-in-closure |
| `sim/v6-projection.ts` | `fdf32f734ae14f3d5fe8a2fcfc4b5c1f456d4193` | 805-in-closure |
| `sim/v6-request-factory.ts` | `1ec43919c66c49c679c8bad51d2f813605e72049` | 805-in-closure |
| `sim/v6-supply.ts` | `3fb338ccdaa3cccb1b8f2976b72c72c23e6cec98` | 303bbb1ac-predecessor-in-closure |
| `sim/v6-table-copy.ts` | 删除生产文件，原件留档 | 805-in-closure |
| `sim/v6-targets.ts` | `7e3b93936e71bd9870dd8e679cba838419c4f81d` | 805-in-closure |
| `v6/formats.ts` | `727708b3d10014934dc7b3fcd2a14dd52336ce05` | 805-in-closure |
| `v6/log.ts` | `edf8ce96d391a0ddc6be82318c22c67b6673432c` | 805-in-closure |
| `v6/target-values.ts` | 删除生产文件，原件留档 | 805-in-closure |
| `hand/screens/v6-room-projection.ts` | `6b0c9c9d6878fff69f07b086169b7e54d3b6f2a8` | approved-two-leaf |

额外四个 303bbb1ac 文件是 `continuous-boss-result.ts`、`v6-completion.ts`、`v6-projection-entries.ts`、`v6-supply.ts`。它们虽不由 805 直接修改，却仍在当前闭包中、哈希与 LIVE 不同；恢复调用方而保留这些差量，不能宣称闭包已与 LIVE 一致。申请把这四项一并纳入精确恢复，不能套五项窄例外放行。

剩余第 15 项差量 `knowledge/runtime/validation.ts` 属 #77 已批准的 25377c946（研究档案大小/条目校验），**保留 #77 改动**；以 #77 的实际 ROOT/LIVE 安装回执核对，若未部署仍失败，就保留阻塞，不回滚 #77、不增加例外。最终视图还必须包含排在前面的 #87 r1 / #83 适用安装差量；不能拿旧 LIVE 3a3 全量哈希直接当新组合期望。

已相同的 `direction-plan.ts`、`direction-runtime.ts`、`projection-input.ts`、`projection-runtime.ts`、`prompt-summary.ts` 不改。闭包外 805 的 `hand/loop.ts`、`card-pick.ts`、`construction-safety.ts` 不整文件回滚，保护 #87 r1 与其他已批准发布；`v6-room-projection.ts` 虽不在当前 v6-history 节点表，仍执行已批准两叶目标。

## B：保留三文件，只从声明/闭包撤出

这只有在同时恢复上述所有真实消费者、确认无静态/动态读取后才成立，不能直接编辑 JSON 删节点。原两项模块直接测试可保留，但还要适配恢复后的类型和合同；三个研究工具将留在 agent/src 且生产不可达，维护成本更高。尤其 silent-boss-calibration 目前真实 fingerprint 整个 agent/src，保留三文件意味着它仍会读/声明它们，不能为了对齐把全源码读取族缩小。若要求两方法的生产视图统一，B 还需要把研究工具迁出 agent/src 并隔离构建/测试依赖，范围更大。因此建议 A。

## 代码、测试和声明影响

1. 生产：恢复 LIVE 的投影计算、供应/成型接口、目标/格式/日志及房间合同，移除未部署的查表成型、部分目标缓存/边界格式和 best_by_target 注入。当前 brain 房间门仍不会进入 build；共享模拟代码有其他消费者，不能据此声称所有 main 路径都无变化。目标是已运行的 LIVE 行为，角色无新增经验或阈值；不引入新的战斗/牌值知识。
2. 测试：`v6-formation-table.test.ts` 和 `v6-target-values.test.ts` 是仅有的直接模块测试引用，随被撤模块保留历史原件并退出生产测试收集。保留的 `v6-projection`、`v6-precompute`、`v6-request-factory`、`v6-targets`、`v6-formats`、`v6-log`、`v6-supply`、`continuous-boss-result` 与 `v6-room` 相关断言，按 LIVE 合同逐项核对；只撤/替换针对已撤接口的断言，保留无关回归。不扩大全局测试排除、不仅为“绿”删除整套共享回归。保留 r2 Boss 事实/O 分账测试。
3. 声明：从实际 producer 入口和既有 dynamic_edges 重算可达集，去掉已不存在的三文件及其真实入边；重算内容 SHA、opaque-site 记录、read-family 和方法身份。silent 校准因真实全源码族减少三文件也要同步；不能只更新 v6-history，不能复用旧票，其他 producer 未涉及身份不得变。依赖遗漏/新增读取照常 reject；不改 verifier 来跳过三叶。
4. 旧数据：保留所有原回执、方法票、研究/日志和知识版本；新方法身份走原准入与发布，不追认历史票有效。

## 获批后的检查和交付

鲜核前像/目标与已批准安装组合。先逐文件验证 12 个恢复 blob 与冻结目标完全相同，三生产路径不存在，源码/工具无残留引用；再做生产及报告 CLI tsc，固定数据定向 Vitest（单 worker，nice 19，最多 2 进程）。检查 brain gate/prepare 同对象早退与 jev 正对照、房间资源/合法性/取消/unknown、投影/供应/连续 Boss 合同，以及 producer 静态边完整性、删除叶/哈希漂移/未声明读取拒绝。最终 full 仍按主管要求使用合并批组合检查，不另跑全量。

r2 机制事实沿已发布 `K1-0924d4ea…`，每 Boss 一行，O 首试与含重试分开；与本项合成一个固定 HEAD，附原三题完整 before/after、定向与原首轮 6118/6119 和夹具原 blob 复验记录。当前已冻结 r2 定向 8 文件 136 测试、生产及 CLI tsc、方法 4 项通过，只能作为扩大修改前基线，不能冒充扩大范围验收。

工程交集成员后，由集成员/ops 核实际 ROOT/LIVE 的完整方法检查与五项状态；只有完整通过并有回执，才报主管撤销五项窄例外。当前不撤例外，不触发部署或恢复被暂停任务。

预计收到本扩大方案批准后 60–90 分钟交固定工程 HEAD 和 inbox（合并批 full / 实际部署时间另计）；发现冻结目标变化或组合以外差量时保留事实并回报，不自行扩例外。**请批准 A（包括四项 303 前置差量）或指定 B；依用户“先报方案再动手”，扩大实现等待本次批准。**

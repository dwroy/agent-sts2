# #84 固定方法准入修复方案（待主管批准）

开发基线：`0b80fde869167b3ed9ecfc8999c57f7b87b8a898`，独立树 `issue-84-fixed-producer-admission`。
依据：#84/6497377682、主管派发评论；实际 #81 发布 V6-R459 / LIVE `2e179cba9a9958bf0cdf18db6b92fa45133487ac`。
旧宽指纹在该 LIVE 的结果为 `52659ea323a194ba57038b4b3046c58e18ff484c56c3e0bb8f98b8e930b9d263`（ops 回执；不是拟议新指纹）。

## 已核调用链

- `refresh_driver.py` 从 LIVE 执行，导入 ROOT `ops/learning_runtime_data.py`，把 LIVE 传为 `code_root`；当前 method 则从 LIVE 枚举所有 builders、所有 `agent/src/**/*.ts`，且静默跳过不存在的 ops 叶。这既扩大输入，也漏掉实际 ROOT 适配器。
- outcome 入口为 `build-outcome-stats.py`；直接依赖 `characters.py`、`refresh_publish.py`，缓存分支用 `legacy_incremental.py`、`incremental_evidence.py` 与 `evidence_identity.py`。没有读取 `agent/src`。
- 当前 outcome reducer 读取原始 runs/decisions/states；LogDB 提供原文件 offset/length，不能把少字段投影直接当完整 outcome 输入。
- 准入异常发生在 `step()` 之前，只有 stderr 类型，未写步骤终态；完整 cycle 虽有 failed_steps，但没有连续失败/陈旧发布提醒。
- 原工程入口是 `publication_gate.py write` 的自然边界与 K→L 写区，固定数据仍用独立 `data-publication.lock` 与 D1 journal。

## 拟实现

### 1. 每个 producer 的精确方法输入

建立有版本的 producer 入口/依赖声明，覆盖当前全部 `OUTPUTS`。从各入口解析仓库内 Python/TS 静态导入闭包；shell、动态 import、子进程脚本和运行时读取的代码/SQL用显式依赖边补全。仅统计真实生产方法、模型和验证依赖；日志、正式知识与产出保留为数据输入，继续单列 provenance。

按实际执行来源分组：producer 代码来自 LIVE，适配器/验证代码来自实际 ROOT。输入清单逐叶列来源、相对路径、SHA 和闭包版本；必要叶缺失、未知本地依赖或来源不符均拒绝，不跳过、不拿另一根缺省补齐。outcome 不包含无关 `agent/src`，但仍包含真正使用的发布验证与缓存实现。

新算法与旧宽指纹有意不同；旧发布 provenance 与旧 launch selection 原样保留，旧请求不能自动改绑新准入。

### 2. 工程发布和方法准入同事务

在原工程核收阶段生成固定的方法准入材料：实际 ROOT/LIVE 部署前后像、启用 producer 的方法清单/变更、原 control SHA、受测组合和检查回执引用。每次工程发布比较启用 producer 的旧/新方法；方法改变却没有匹配材料时拒绝该发布。

沿原 `publication_gate.py write` 执行部署及准入收尾：部署前校验固定材料，部署后在同一原发布写区核实际安装字节，使用 CAS 更新 control 中对应 methods 并保存持久回执，成功才允许原发布 release。中断保留原 marker、准备/部署/准入阶段与前后像，恢复只接同一事务，不能放游戏后再改 control 补绿。不增加独立发布 writer，不扩大准入 entries/refresh 或权限，不重建数据库。

本次迁移只准入 #81 已上线组合上的最终修复闭包，不采用旧 f6e 或任何中间部署。开发仅交代码、固定材料与命令；实际生产部署、准入、编号由原集成/ops 接。

### 3. 连续失败和发布停滞告警

在原 refresh 生命周期为每个实际选中 step 写开始/终态，包括准入拒绝、启动失败、非零退出和 D1 发布失败。按 step+character 和不同 cycle 计连续失败；相同 request 重放幂等，未执行或未知终态不冒失败/成功，成功后清连续失败计数。对所有 refresh step 连续三个明确失败周期追加一行主管 inbox。

固定 producer 的发布水位从原 D1 成功记录初始化，不用部署时刻覆盖旧水位；运行成功但 `unchanged` 另列，不伪造新 D1。超过 12 小时没有发布同样告警。沿原 refresh 及既有 stall 观察入口检查，覆盖没有新 refresh 周期的情况；不另建 daemon/cron/模型。告警携带 step、周期/发布时间与本地回执路径，持久去重并保留恢复/再次恶化信息。

### 4. outcome 补算及历史分账

提供一次显式、全新 request 的 `--only-producer outcome --character silent` 补算路径，先核 LogDB 已同步截止线，以 LogDB 的 runs/decisions/state_index offset/length 读取对应原始证据，复用原 reducer，保持角色、进阶、SL、缺帧和观察性限制。固定夹具对比原始扫描与 LogDB 索引输入的结果；若索引不完整则失败保留，不能默默少算。

由原 ops 在修复部署/方法准入完成后沿原刷新队列运行一次，冻结截止线/源 SHA/方法清单/分母/新 D1 和真实消费者读回。旧三次 published、原 D1、data_attempts 和后续失败均不改；新增发布与历史分别登记。开发不运行生产补算、不写 live/STOP/正式知识。

### 5. 验证和交付

固定测试覆盖：无关 agent/src 发布不改变 outcome 方法；真实依赖/ROOT 验证器改变会改变方法；缺叶/动态边遗漏拒绝；未携带方法准入的相关发布拒绝；准入 CAS 漂移、部署中断、同事务恢复和重复调用；第三次失败/12 小时门限、步骤隔离、未知终态、告警去重；旧 D1 不改且新发布可由消费者读回；LogDB/raw reducer 等价。

按仓库规则做生产 tsc、沙箱 Vitest（最多一个 worker、无文件并行）及定向 Python 检查，nice 19，总进程不超过两个，不安装依赖。交固定提交/保留分支、ROOT/LIVE 映射和回退、原件及 queue request；gitleaks 后评论交 review。最终实际组合 full 归原集成唯一检查。

自然验收保留给原 ops：修复后成功补算；再接一次只改无关 agent/src 的正常 LIVE 发布，逐字核 outcome 方法不变并有成功 outcome:silent/D1 回执。固定测试不代自然验收，不关闭科学父项。

## 当前停点

2026-10-29：仅完成规则/issue/源码只读核查、in-progress 标签及本方案；未改可执行代码或生产控制，未跑补算。按主管“先回方案，我批了再实现”在实施前等待批准。

## 2026-10-30 批准与工程接续

主管已在 #84 最新评论批准本方案并指定 main9b0cf595、未知动态依赖拒绝、五项同批及部署后优先补算。此前待批段落保留为历史停点；实际批准原文和本轮交付/检查限制见 `20261030-issue84-fixed-producer/approval.json` 与 `report.md`。原方案提交另保留在 `refs/heads/issue-84-proposal-original`。

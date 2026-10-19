# V6 W3 共用生产请求工厂验收

本批保留 main 10936edd3 的 B：冻结历史包、跨方向同种子配对、路线入口和空闲预计算；补上 W5 与 W7 共用的生产请求工厂。代码基线为 main 601160a34，未改正式游戏知识、大脑题型、触发、药水路由或 Jev 出牌消费者。

`agent/src/sim/v6-request-factory.ts` 的 `createV6ProjectionFactory` 在开局接收本角色冻结包与只读模型，在实际局面调用 `create`，统一验证加牌、删牌、升级、回血和药水等资源变化，构造 V6ProjectionRequest。保留原始实例计数和药水槽身份；缺历史、异角色、篡改哈希、身份/时间不符均返回 unavailable。off 在读取局面、知识或历史前退出。

目标集合、方向来源、供给蒙特卡洛和条目输出复用既有 B。路线成本和跨 Boss 离场边界由实际路线调用方显式提供，不从未来实战倒填；回血必须重投影，未覆盖目标保留未知。冻结组合指标只覆盖本局内存快照。新的可选 `preparationKey` 和 prepare 第三参数防止同牌组但药水/路线不同的选项误共用准备缓存，旧两参数接口保持兼容。精确接入合同见 `interfaces.md`。

## 检查

固定数据覆盖五种资源变化、金币/索引/牌组限制、槽编号与数组位置不一致、重复槽拒绝、实例计数和输入不变、路线回血与未知、角色/时间/哈希隔离、五角色 off 无读取，以及准备缓存隔离。TypeScript、完整 Vitest、gitleaks 结果与代码 SHA 见 `acceptance.json`；不把固定题检查解释为真实 V6 对局验收。

首轮完整 Vitest 在复核发现药水槽身份问题后被明确终止（143），其 TypeScript 与早先 15 项定向检查原件保留。随后修复并增加固定回归，变基到直接 V6 授权的 main 601160a34 后另存 r3 完整检查，不覆盖旧原件。中间 r2 命令的日志目录位置错误，未运行测试，不计作产品失败或通过。

## 交接与未决

ops 已在原 w1H:p8 线程以 codex1 / gpt-6.1-sol high 接管 v2 直接 on 授权，保留原定时任务、托管与学习/回收流程。不开 V5/影子局，STOP 与 Regent 暂停由原 ops 沿 W5+B、Nova 和校准资源条件管理。新工厂为工程接口交付，仍需 W5/W7 实际接入并由各原会话完整验收；本会话没有开局或改开关。

学习闭环审计发现的提证与局间刷新缺口已由原批次修复为 main 7bfae61f7：共用 CLI、任务模板读取 V6/Jev 记录，原局间路径生成并校验冻结历史包。此处已读实际代码；运行时真实刷新、失败回滚与下一局消费者读回仍待原 ops 核实，不能把钩子落地称为学习已入库。详见 `learning-loop-audit.md`。

三份历史异议原文已读并于本会话 22:25 实际转达 Roy，保留原生消息证据。旧手动通知与新版 ACK CLI 格式不兼容，登记仍 pending；已沿原通道交兼容问题，不手改 ACK、不代 Roy 认可。校准续批沿原工作树继续；核心卡 R2 已结束并独立核验，868 冻结输入、195 产物与17结果引用 SHA 均通过，372 局/244 经验、17 组合和12648见证行对账；原日志仅抽11段224646字节，不称重算全量统计。当前 schema 验证通过，正式核心知识未发布；见 `2026-10-19-v6-build-cores-r2-audit/`。

原 ops 原启动器的学习闭环补接批次 `v6-learning-loop-20261019-223658` 已在 main 7bfae61f7 交付代码；正式知识发布 223156 仅19条小脑/7枚举子集，未发布核心卡，244经验未改；自动复盘 224302 无新 bug、ledger检查0，双策略 224304-s2 原 dataset 仍持锁，待原完成事件。W5 的精确接口 prompt 被 agent_blocked 拒绝，W7 为 queued question，均不算实际送达；待 Claude 沿原通道协调，不绕过阻塞。另 7 项原工作树缺失的历史学习通知已实际转达并经 CLI 登记双阶段回执，父要求仍 blocked；不与三份旧 V6 通知的 pending ACK 混同。

## 联合检查过程记录（2026-10-19 23:05 CST）

r3 完整检查退出 1：585 文件中 584 通过，5578 项通过、1 项失败、2 项原有跳过。唯一失败是未修改的 `thief.test.ts` T2 超过全局 15000ms（实际 26863ms），原日志与退出码保留；r4 仅对此文件作 runner-only 120s 超时复验，11/11 通过。未据此称完整检查通过。

检查期间 main 进入 15a7ce929，包含原 ops 运行接线与学习者的 Silent reflex/vocab 正式子集发布。本树自动暂存变基后逐项核实四份代码 SHA 未变，另起 r5 联合 tsc/完整 Vitest（threads、2 workers、nice19、命令行 testTimeout=120000）。未改共享配置或测试源码；最终结果以 `acceptance.json` 为准。

## 核心卡第二轮停点（2026-10-19 23:14 CST）

R2 complete 仅指冻结输入审计完成，4方向17组合/34份 attempt 主口径仍在原 scratch 与 Silent/pending。simulation 均 n=0/unknown；每条组合、经验的关联是描述性证据，持有不等于生效，最高观察值不等于因果最优。原 CLI 遇旧 inventory 的 null range 退出1，冻结适配器调用原统计内核，不把它写成原 CLI 兼容通过；遗物前提可表达，消费者实际读回仍未知。异议与核验范围已实际向 Roy 显示；原 ops 随后在 main 77006d053 的23:18回执确认读取原result/report、六异议和17引用SHA，并挂回原223156发布线。其868输入/195产物验收沿本watcher原证据归属，不冒ops重算或正式发布。不派续批，父要求不关闭。

## r5 运行池失败（2026-10-19 23:23 CST）

r5 TypeScript退出0，完整Vitest退出1：584文件通过，唯一失败文件paths.test.ts共11项，原因是threads池不支持既有测试的process.chdir()。5568通过/11失败/2原有跳过；与本批生产改动无关，但本轮不能称完整通过。原日志、SHA和退出码保留于checks/r5-thread-pool-failure。回到forks池、命令行超时120s，在随后最新main上另起完整检查；不改测试或共享配置。

## 原 live 读回与显式出牌开关（2026-10-19 23:26 CST）

已实际读取原 ops 23:22:19 回执 `.artifacts/ops-wake-20261019-2315/live-verification.json`，SHA256 `c1d36ad36b76655e257ba50afb630536b0fc2fd014722d0a2c8ab7969b0409b9`，原字节副本见 notice-delivery。`de4e1deee` 已为 main/live 祖先，实际 live `b0c86240d` 的四文件状态与 main 相同：核心卡缺失，244经验原字节保留，正式19标签/7枚举。原锁内实际 live 路径的19条消费者 true/false/unknown 通过，仅为固定离线题面，未证明自然采用或收益。原未变 live 源码已有宿主 tsc/full 5573通过、2跳过以及93项精确组合检查，本会话不重跑该 live full；原学习者 sandbox full 的15失败/3errors及中断保留。新增 main 学习链源码不借用该旧回执称 full 通过，待原完成事件。

core R1、66标签/14枚举和真实任务名提案注册 exit2 invalid task link 仍 pending；R2新草稿已挂原发布待办但未派批。未代ACK、未关父，STOP/Regent及v2门槛保持。最终授权 on 边界必须向原 Herdr actor 显式传 `V6_COMBAT_ENTRIES=on`，不能只传 `V6_REFLEX`；本批没有启用开关或开局。

## r6 完整检查通过与 W9 联合停点（2026-10-19 23:31 CST）

r6 基线77006d053，agent树02a86f1839929ccaaffe0fda06b7b8250cd84213：tsc退出0，完整Vitest585文件/5580通过/2原有跳过，392.50s；学习链Python固定9项通过，gitleaks零发现。期间main合入W9 f90868e7c，方向运行时与日志新增stage和大脑耗时；不把r6冒充包含W9的联合树检查。随后变基到最新main，保持本批四份源码/测试SHA不变，另存最终联合检查。原live未变源码的旧full仍不重跑。

## 最终联合验收（2026-10-19T23:39:37+08:00）

r7 基线7093f670f，包含W9监督与学习链补接；tsc退出0，完整Vitest585文件/5580通过/2原有跳过，402.79s；Python学习链9项与W9监督9项均通过。随后变基到main 78468e4d9，逐项验证四份代码SHA、整个agent树及其他运行源码未变；仅ops/inbox-dev.md等记录追加，源码等价凭据见checks/final/source-equivalence.json。不再重复相同源码的full。原失败和中断检查保留独立目录。

原校准23:30:33读回1205/1316起点（1199成功、6显式失败、111未完成），仍running、未过四门槛或发布，见notice-delivery/calibration-progress-20261019-2332.json。本批不开新任务，合入并交原ops/Claude后停下。工作树回收须等原ops核实际live接入与完成回执，不提前删原现场。

# V6-W5 Jev 拿牌与正式投影消费

2026-10-19，v6-w4w6（Codex gpt-6.1-sol xhigh）。本包按 Roy/Claude 的 W5 指派实现，默认关闭，只合 main，不开局或执行验收题的动作。

## 实现和接口

- `agent/src/v6/card-pick.ts`：实际奖励索引映射为 `card<index>`，仅提供当前合法动作和 skip。英文 choice 的候选放在 criteria，符合现有 Nova Decisions 适配器；正式基线 f7580b3f5 的 W1.2 合并指标按方向/组合共享一次，选项包含 W3 正式逐组合条目。大脑临时组合来源保持 brain，缺失方向、组合、目标条目补明确 unknown，不补零或跨角色取值。
- 题面保留全部方向概率、补齐可得率、组合角色、胜率/配对差与标准误、凑齐/凑不齐胜率、期望、可信度及本角色本进阶 applies_to=card_pick 的小脑记忆。组合指标保留 first / including_sl 两个独立口径、原始计数、版本/进阶来源计数、DPR/启动/历史摘要，以及具名目标进阶的模拟、回归、收缩值与未知原因。来源中的其他或未知版本/进阶不筛除；source run_ids 从短题面省去，完整原件留在条目日志，不把观测战绩解释为因果收益。逐组合角色与作用标签直接读取正式 combination row，同时传入凑齐概率的采样 SE/分母、未知原因；共享模型限制标签去重一次，不以方向级角色冒充组合角色。
- 兜底读取 W3 的 `target_mixtures`：排除本幕 current_gate 为 much_worse 的选项，依次比较 clearance 配对差、本幕配对差、skip；未知值保持未知。非法选择、概率或置信度、异常和超时均走同一兜底，无大脑升级、重问或重试。
- loop 的 `V6_BUILD=on` + `V6_CARD_DECIDER=jev` 直接进入 Jev；单题独立最多 5000ms，计算预算另计，实际动作仍经现有闸。shadow 只记 Jev 将选什么，动作沿原大脑路径，影子请求/用量独立计数。构筑条目、实际选择、usage、耗时与回退写入 v6-build.jsonl / decisions.jsonl。
- `V6ProjectionRuntime(engine, request)` 接受正式 `V6ProjectionRequest/Table`，通过 `LoopOptions.v6Projection` 注入。循环在幕初/重规划之前读表，存下新大脑权重后重新计算奖励表；等待/过场调用有界 precompute。off 或战斗时不读提供器。实际目标使用 f17/f33/f48 和有序 f48→f49 身份，不添加旧占位目标。

## 固定数据与冻结请求验收

固定测试覆盖正式 W1.2 校验/加载到 W5 短题面的混合与未知来源、first/including_sl 独立分母和未知校正结果，以及五角色 off 题面/动作 JSON 字节等价、合法索引、unknown 条目、W3 真实引擎到 W5 的 P=1/W0=null 条目、英文 Decisions criteria、兜底顺序，以及真实 runLoop 的成功/错误/非法/超时单请求路径。shadow 验证 Jev 选牌而最终执行大脑 skip；独立 runtime 验证耗尽父计算预算后仍有计算窗口，以及等待预计算的上界和复用。

冻结题只请求，不执行动作，不写游戏知识。`verify-frozen.mts` 直接从公司凭据文件读取 key，只允许 Nova 的单次 `/api/alpha/decisions` 请求与 `typesafe/jev-1.14`，SDK retries=0；已有 started 回执禁止重发。三次不同版本的冻结格式验收原件均保留：

| 题面 | SHA256 | 大小 | 输入/输出 token | 耗时 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 初版 | ddd51f7cd0566e0bc98d6ff7f9e505387c2ff977a92e1146f01286e37e6c2813 | 39491 B | 17570 / 40 | 1178ms | HTTP 200，合法 skip |
| compact-v2（W1.1） | 44da1ec7db4e24ce04ba384f3a874a9f562fd867a27d7f7e10d123b5de70082e | 7636 B | 3419 / 40 | 612ms | HTTP 200，合法 skip |
| pooled-v3（W1.2，最终） | 95fc47def8f88e2ea6d7ffca312e4d86c7e7c13bc55a0a77a6508e6ec6c2e2d7 | 11673 B | 5271 / 40 | 1007ms | HTTP 200，合法 skip |

最终题面与实际生成结果离线逐字节读回一致，见 pooled-v3/frozen-final-readback.json。该固定合成题故意没有投影估计；结果只证明协议、答案格式和这一题的延迟，不能证明策略质量、自然采用或生产延迟分布。

首次从错误 cwd 调用 npx tsx 时下载到外部 npm 缓存后因路径不存在失败；没有改项目依赖。随后在 agent/ 使用已有工具 `npx --no-install tsx` 执行冻结验收。

## 待集成（Claude 已明确本轮范围）

1. W3 的生产冻结历史包与开局只读加载器由 watcher 提供，包含 coverage、逐层帧、Boss 首试、机会/供给及组合指标、哈希和生成时间。本包先接正式同步输入与循环注入接口；路线进场 HP/危险线继续由既有投影提供方注入，没有以当前 HP 冒充预测或另造危险阈值。未注入时条目明确 unknown，不能报告生产模型已接通。
2. W3 pick 表目前没有跨方向的同种子连战配对差/SE。Claude 确认本轮先交付现有接口；T3 和增量 T2 保持 unknown，不用边际 SE 拼配对 SE。watcher 后续合入字段后补 T2/T3 提供方—消费方集成测试。
3. 未合 live，不分配行为发布号；STOP、Regent 状态和其他会话文件保持原状。工作树保留，不能以仅 main 合入满足要求 main/live 双发布的自动回收验收。

补组合角色字段之前的全量检查为 tsc 退出 0、579 文件/5558 项通过/2 项原有跳过（431.21s），原件保留 pre-role-checks/。补字段后 19 项定向测试通过（role-checks/，从工作树根目录运行，未加载 agent 的全局 setup）；补字段后在 agent/ 重新执行主代码 tsc 和完整 Vitest，579 文件/5558 项通过/2 项原有跳过（479.81s），源码 gitleaks 退出 0，原件见 pre-w12-checks/。该轮基于 c71adb784。W1.2/W2.2 合入 f7580b3f5 后已变基并适配；pooled-checks/ 保留首次定向检查 1 项旧单口径断言失败（27 项通过）的原件，修正断言后 pooled-recheck/ 的 30 项/4 文件通过；最新完整检查基于 f7580b3f5：tsc 退出 0，Vitest 581 文件/5576 项通过/2 项原有跳过（483.30s），源码 gitleaks 退出 0，8 个源码/测试文件的哈希核对一致，原件见 pooled-final-checks/。按 Claude 通知，主树快进合入前仍协调，避免与 B 集成撞车。源码与材料的暂存快照 gitleaks 同样退出 0。每次全量检查期间源码保持固定。

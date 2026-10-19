# W4 与 W3 正式组合投影对齐

2026-10-19，v6-w4w6，Codex gpt-6.1-sol xhigh。W4 基础题型、build-core-v1 和 W6 已先前合 main，本追加包只对齐正式提供器。

`agent/src/v6/projection-consumer.ts` 使用 W3 的 `v6ProjectionEntries`，消费真正的逐组合值，不把方向聚合值复制到每个组合。幕初与重规划题沿实际 targets 使用 f17/f33/f48 及有序两 Boss 编号；不再添加旧 boss_id/joint 占位行。药水可信度同样按实际本幕及连战目标读取，缺方向或未知可信度保持 unknown。

最高方向取大脑最高权重方向；核心补齐率按正式排行榜首组合、已知连战目标概率混合。跨方向连战比较只读 W3 `act_evaluations[].versus[].joint_paired_delta`，不使用 take-minus-skip 差，也不从两个边际 SE 推导配对 SE。跨目标 SE 使用加权相关性上界；目标质量缺失、不为 1 或配对缺失时不生成已知比较。

提供方—消费方固定集成测试直接用 W3 正式引擎和确定性 runner，验证 P=1 时 W0=null 的合法条目进入 W4 核心组合摘要、实际目标身份、act 同种子跨方向连战比较原值读回，以及 pick 未提供该字段时保持无已知比较。补充 runtime 测试锁住实际目标不产生幽灵 unknown 行。新增链式夹具最初缺少 second-opening/resources，得到 null；补齐固定链资源后通过，未修改模拟器。

Claude 已确认：本轮先交付现有消费接口；T3 与增量 T2 在缺 pick 跨方向配对字段时保持 unknown。watcher 补充每个选项下、相对大脑最高方向的连战配对差与 SE 后再补集成测试。生产冻结历史包加载器亦由 W3 提供；没有从历史推导新游戏知识。

早期稳定检查：formal-provider-2043/ 的 tsc 退出 0，完整 Vitest 577 文件、5537 通过、2 原有跳过、350.89 秒。随后 W3 独立计算预算 e3aec6e85 合 main，已变基并补链式合同测试；最终检查另存 formal-provider-final/，不覆盖旧结果。最终检查完成前不修改受测源码。

最终稳定基线 e3aec6e85：tsc 退出 0；完整 Vitest 577 文件、5538 通过、2 原有跳过，468.03 秒。定向合同测试 2 项通过。源码与材料暂存 gitleaks 结果另存 formal-provider-final/gitleaks.log；合入前再次核 main 未前进，测试期间源码和测试保持固定。

改动不涉及 sim/、reflex/jev/、eye/jev-prompt-log.ts、游戏知识、共享配置或实际游戏运行；所有开关仍默认关闭。合入 main 不代表 live 已发布，未创建 live 或分配行为发布号。回收工具要求 main/live 双发布，故保留原工作树。

# W2.2 合并统计与 A10 折算

按 Roy 2026-10-19 在 main 1daceab74 的口径更新离线组合生成器。估计不再按代码版本或实际进阶分层，只分 first / including_sl；我方能力合并。版本、实际进阶与逐来源原始计数保留在 sources，合计 raw_counts 可对账。正式知识、运行时、投影模拟算法均未修改。

敌人强度相关的各 Boss 胜率、整场净掉血、打完回合数同时输出 simulation / regression，并另外给出小样本 shrinkage。回归用组合×目标固定截距、每指标一个统一的 A10 居中进阶偏移；独立局 cluster bootstrap 200 次估计误差。组合内没有进阶变化、实际进阶缺失、预测越界或有效 bootstrap 不足时保留未知及原因，不假设偏移为零。小样本 n<10 以 n/(n+10) 向所属方向独立局并集均值收缩；同局重叠组合先聚合，不重复增加分母。原始描述中位数、计数及极值不被收缩值覆盖。模型是观察相关，不能作因果收益。

模拟桥只读冻结历史原始字节，核 SHA 后复用既有 preFightState / syntheticBossStart / runBossSim；单个 nice=10 的 Node 进程。用冻结输入最小已知历史 max_hp 作全体共同入口 HP，逐条核对原始 max_hp，保留实际牌组/升级/最大HP/遗物资源。只接受精确 A10、无 estimated 字段且部件匹配的静态开场；不以最近进阶替代。任一样本截断/超时，整场三项结果未知，删失数量保留；可信度 unknown，不声称模型对该组合已验证。配置、原始入口、牌组和模型文件 SHA 均留审计。

固定数据覆盖版本/进阶合并、未知进阶只从回归排除、统一偏移识别、目标截距、方向重叠去重、误差重现、越界未知、小样本无方向、源计数对账，以及模拟桥的实际牌组保留、共同 HP、精确 A10 拒绝、缺失入口拒绝和删失。40 个 Python 测试与 6 个 TypeScript 测试通过。新增组合前提检查复用 W1 事实投影与三值求值器，原始帧核 SHA；false 排除，unknown 不补成未成型零，入口与生效时都须满足。公开合同由 watcher 维护，本工作树不改格式。

冻结复核沿用上一轮 KAY522KT5NXR / P-toxin-footwork 的清单、字节切点与学习者贡献见证。新旧描述统计的 n/value/p25/p75/SE/evidence/distribution、Boss 统计和成型原始计数共 452 项一致（raw-reconciliation.json）。真实入口 SHA bafceb93cde6995098a82c6164dbca1054d04d6ae57baa226f33d25a3e0d14dc，offset 6452148221，63144 字节；其原始 max_hp=70，但不是稳定且未出牌 T1，故实际模拟 n=0 并明确原因。只有 A0 一局，回归偏移不可识别，同样未知。首次回放发现 compact 未保留 max_hp，原输出 frozen-generated.* 保留；修复后另存 frozen-generated-v2.*，不覆盖初次失败。当前冻结题验证了未知保留，未证明实际模拟模型的准确性。

第二轮出牌小脑批次的独立验收单独存于 ../2026-10-19-v6-reflex-distill-r2-audit/。学习审计结束不代表全部经验转换或正式知识发布。

2026-10-19 20:57:08 CST 交付停点：按 Claude 最新指派，分支变基 e3aec6e85 后只提交生成器与材料，不自行合入 main；定向测试复跑 40 Python + 6 TS、主代码 tsc 均通过。完整 vitest 由 watcher 将 W1.2 格式与本提交联合后执行，当前没有声称完整检查通过。公开格式实际读取 watcher 的 interfaces.md 和 build-core.ts；指定的 w12-pending-interface.md 在核查时不存在。contract-v2.json 记录当前格式 SHA 与两份冻结 metrics 的严格校验。已有 watcher 通知成功送达，后续把提交号交原通道联合原子集成。

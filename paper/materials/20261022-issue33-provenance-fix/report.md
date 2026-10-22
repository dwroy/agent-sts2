# #33 来源审计返修

针对[集成员退回意见](https://github.com/dwroy/agent-sts2/issues/33#issuecomment-6328967393)，在原开发提交 `276f3089c413b129e67362e3c84eae23baae993f` 上补修。本报告接续原交付，原报告、退出1的全量检查、分项复核、集成员中断检查及其结论均不改写。核验原件位于 main 的 `paper/materials/20261022-issue33-integrator-review/`。

## 缺陷与修补

原包装器凭工具名硬编码来源清单，确实会把 `jev-hints.json` 记成 `.md`，并给 fights 表记录不相干的房间/结果统计。正文变化时，ToolHost 的来源清单和 SHA 可能保持不变。此前交付的来源审计结论不充分。

基础来源现在按原渲染器的文件常量和实际选择器确定：

| 工具/选择器 | 内容来源 |
|---|---|
| monster / encounter / stats.fights | common/monster-db.json 与本角色 monster-records.json |
| stats.room_costs | 本角色 room-costs.json |
| stats.rest | 本角色 outcome-stats.json |
| old.guide / old.handbook / old.jev_hints | 所选攻略 / ds-handbook.md / jev-hints.json；未选的旧知识不冒充来源 |
| experience | 本角色 experience.json 与 common/shared-experience.json |
| potion | 本角色 potion-equivalents.json |

动态填值也有独立依赖：Boss 战绩占位符读本角色 boss-damage.json，问号房统计读 room-costs.json，卡牌结果读 outcome-stats.json，怪物数字读公共怪物库及本角色战绩。依赖由实际调用的填值加载器登记，不拿攻略/手册或其他统计表的 SHA 代替。Jev 提示直接使用合并后的怪物数据填数时，也记录这两个输入。

生产知识查询使用每次调用独立的 AsyncLocalStorage 输入快照，正文解析与来源哈希使用同一份字节；同大小、同 mtime 的副本更新也不复用旧解析缓存。动态填值使用当前 ToolContext 知识目录，避免混入默认目录的内容。旧加载器在查询作用域之外保持原路径、缓存和算法；查询不写其缓存。旧数据加载器的攻略预填在查询内延后到所选文本实际渲染，避免把未选攻略的占位符依赖算进其他表。

每项来源保留文件、相对路径、版本和 SHA；无显式版本的文本以内容 SHA 标识版本。缺件标 missing/unreadable 及空 SHA，不伪造文件。目录重建出的公共怪物兼容视图明确标 `catalog-compatible-view`，记录视图字节 SHA 与 catalog 原件 SHA，区别于实际存在的文件。经验条目自身的外部来源哈希标为 `entry`，不再冒充 experience.json 的文件 SHA。

## 固定验证

`agent/tests/brain-agent-provenance.test.ts` 的16项检查使用真实 ToolHost 和知识副本，覆盖两项核验反例、三个统计选择器、三个旧知识来源、四类动态依赖、同大小/同 mtime 更新、经验缓存隔离、并发查询、catalog 兼容视图及铁甲原渲染等价性。修改提示、角色战绩、公共怪物数字或动态统计副本时，正文和对应来源 SHA 同步变化；ToolHost 中的全文、字节数及来源数组与工具返回一致。

定向检查7文件/113项及生产 tsc 已通过。新一轮独立完整 Vitest 为652文件/6154项通过、2项原有跳过，退出0、无中断、无需失败文件补跑；路径测试另以单 fork 跑11项通过，合计653文件/6165项通过。本轮先核实并固定检出原 HEAD 的 `paper/materials/issue29-brain-speed/results.jsonl`，不更改原材料字节或测试规则。10个修补执行叶子在检查结束后与冻结 SHA 及 index 核同，知识数据未变、#26 四叶核同。结果、命令、输出与解压 SHA 见 `verification.json`，源码清单见 `source-freeze.json`。

没有修改角色知识、原始证据、游戏规则、模拟参数、引擎/强度/预算或 #26 的四个依赖叶子。铁甲默认知识目录下两项被退回查询的返回正文，与原渲染器逐字节一致；W0 等价检查也通过。行为差异仅在修复错误来源、陈旧查询缓存或非默认知识目录时，读取并标注当前查询实际输入，不加入新游戏结论。

## 交接边界

只交付返修分支，待集成员再次独立核验；未合 main/live、未改 STOP、未分配 release_id、未开模型或游戏、未关闭其他会话、未登记回收。#26 已独立合 main 的结论保留，生产挂载及 #33 自然首局验收继续由原 ops 在自然边界执行；不新增实验或关闭科学父项。返修回退为本补丁逆补丁；整体功能仍可回退原 #33 功能提交。

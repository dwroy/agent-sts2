# #35 集成核验

2026-10-22T10:40:28+08:00：通过，源码 `0485abd6f4d0ce8edefb9f747744528fadfbd85c` 已合本地 main `c208665e6dbcc8244f2516b7c3d7d0f3fde7a00a`，交 ops 自然局边界发布与首局读回。尚未上线，未运行真实对局。

- 交付 12 个源码/文档与 9 份检查原件逐项核 SHA；#33 已在原基线中。独立工作树的 2116 个输入检查前后不变，历史固定输入从原 Git blob 恢复，没有在线取数。
- nice 19、fork 单 worker 完整检查：tsc 退出 0、Python 学习闭环 17 项通过；Vitest 655 文件、6174 项通过、2 项既有跳过、0 失败。完整原件位置、字节数、SHA 见 checks.json，不把开发自测当独立复验。
- 固定构筑序列覆盖拿/跳过/买/删/升级/事件加牌和变牌、牌组差分确认、重复牌、SL 快照回退/重放、新局清空、开头 4 条加最近 36 条、20 字理由及题面上限。构筑题固定保留“本局已做的选择，不是规则；运行计划的转向条件照旧有效”。未据此新增游戏知识；包括铁甲在内各角色均按本 issue 授权增加本局状态。
- 额外生产调用路径验收使用固定商店轨迹、模拟 ModClient 和模拟大脑，无联网模型请求：Codex/DeepSeek 各 1 次大脑请求、7 个实际执行动作、4 次已确认买牌均继承原计划理由和原引擎来源；新 loop 从实际写出的 state/decision 日志恢复，下一道构筑题读回 4 条，再用 1 次请求跳过，最终 5 条。复验脚本 production-probe.mts（依赖保留的独立工作树；在该工作树 agent/ 中用 node --import tsx 执行绝对路径；默认写新 artifacts 目录，可用 CONSTRUCTION_PROBE_OUTPUT 指定新目录），模拟游戏接口，不运行真实 play CLI。
- journal/decision 日志保留理由与 planRef；成功 SL 写恢复快照，重启按原日志恢复；construction-log 快照由复盘摘要按 offset/bytes/SHA 引用。没有额外工具或额外理由生成请求。
- 合并使用原 ops/live-merge.lock，先备份绑定、finally 恢复及校验字节 SHA/文件模式。14 个交付文件与原提交完全一致、原提交保留祖先关系。当前 main 的记录保持原样，开发原两条 decision-log 保存在原提交，另追加本次集成记录；并行 ops 未提交记录保留，索引无暂存及冲突。

ops 后续：沿原发布锁核实际 live 精确组合与依赖 #33/#26，按行为发布分配 release_id；自然构筑题确认本局历史、短理由、原来源和重启/SL 日志读回。不得把此处源码/模拟检查当生产首局验收。回退沿原发布组合回滚 feature 源码，保留原 state/decision/construction-log 和未完学习引用。未修改 live、STOP、服务或生产配置。

来源、输入清单和本地原件 SHA 见 checks.json 与 input-manifest.json。对局行为实际上线记录与 Roy 通知由 ops 按原流程完成。

# #28 最终组合与唯一完整检查

2026-10-24T03:24:38+08:00。#50 已由原 ops 发布 V6-R423 并固定读回，前置释放后进行本次检查。

原候选 `7087caea9ee456953a060c0bf73846b6b5f0b249` 在当前 main `a47a7bafcfc903e91cdf20b314f113ffdd33f462` 精确重组，受测树 `8bdbb4234d8d8d0bfcd3a9d29a41eb917b65a325`、隔离锚点 `091b45f1875ed9fa71cdfe456eeb2913aa12da46`。24 份交付叶全部与原候选逐 blob 相同，21 份开发叶及原 CLI 测试修复均保留；来源账本保留于提交祖先，不覆盖 main 后续记录。旧工作树的后续合并现场未改。清单、SHA 和前像见 assembly.json、candidate-leaves-readback.json。

唯一完整 Vitest：679 个文件，6643 通过、2 跳过、0 失败；退出码 0。production 与 tools TypeScript 均退出 0。完整结果 SHA256 `49d9ab77d3471379e30a60cbccfb94a723ceaf216553b8bf0385aabdb11b2466`，原件位置与字节数见 full-summary.json。单 worker、无文件并发、nice 19，在原 live-merge 锁内运行；新 full 次数恰为 1，模型调用 0。

首次知识锁非阻塞预检因原刷新者持锁而停止，发生于 full 启动前，new_full_runs=0；原失败和持锁现场分别保存为 precheck-lock-failure.json/.log、knowledge-lock-wait.json。随后同一候选沿原锁阻塞接续，未杀进程、未重启 full。隔离原 instance-binding，实体化 issue29 受跟踪夹具，创建测试缓存父目录；未安装依赖。

在知识刷新锁下从实际 live `6d89243c385c11eec7b923fba907cb8dd250e4bc` 冻结 469 份非 builders 知识文件，另冻结 2242 份源码/工具/夹具输入，检查后 SHA 全部相同。inputs-before.json 与 knowledge-before.json 保留逐项值；这是本次明确冻结范围，不能推定其他文件已核验。原 85 条 reflex 的 SHA256 仍为 `d489acc71907783ef889a60e6a5672135052ecf6489db3b41ea87ecc4901c776`，candidate/main/live 字节一致。

本次只验工程框架。没有新增学习条目、真实 Jev 调用或游戏动作，未改现有开关。真实两臂回放、独立局区间、学习实际入库/消费者读回、Roy 开关决定与 A/B 仍开放；不关闭 #28 或科学父项，不登记完成回收。main 集成另核原发布锁、绑定备份/恢复、运行源码漂移及并行记录；实际 live 发布与自然读回交原 ops。随后按 #37 → #20 父推进。

提交前 gitleaks 初检将 inputs-before.json 的 `learner-keycheck-retry.test.ts` 文件 SHA 行识别为 generic-api-key；已重算实际文件 SHA 核同，仅对这一完整行设精确例外，再扫描全部交付和材料。原输入清单及首败日志均未改，说明见 secret-scan-exception.json；未使用宽泛忽略。

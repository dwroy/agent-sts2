# #25 live 组合准入核验（2026-10-21）

结论：#25 + #16 + #15 + #8 的精确组合通过集成准入，交 ops 在原自然局终边界发布；维持 `status:waiting-release`，源码核验不代首局消费者验收。按 Roy 本轮指示（#25 comment-6315888677，Claude转达），不增加上线前后检查点指标对比。

## 组合与知识冻结

- live 基线 `0a9dc70e3ef096e7d0d6eb1524cd20e2cbe906c6`（R410），核验结束时未变。
- ops 当前计划 `paper/materials/20261021-issues15-8-release-ops/receipt.json`，SHA256 `c76d7eefa31b0ab2d7361ec38ef4193a9cea2310a24f669fdd047460eb1b60b5`。
- 48文件源码树 `725a2480a532bef1c3b4b344660505cc53b997ce`；逐叶大小、SHA256、Git blob 全部匹配。47文件与已验收 main 相同；builder 保留旧 live 逻辑、只加入 #15 opening 入口，不夹带 main 的增量刷新实现。
- 在原 `ops/live-merge.lock` 内只读冻结当时最新213份 live 知识JSON，覆盖到隔离核验树；保留新组合的两份 open-book 与 opening-value 数据。实际受检树 `229355abe292bcc1ff588b95f3c2fd63db596f23`。各叶清单见 `review.json`。
- 只覆盖知识JSON，不用旧 live builder 覆盖已计划源码；没有更改生产树、STOP、绑定或角色登记。组合不包含 #29 引擎实验、P4 或整份 #17 调度脚本；ROOT 调度器与手工 CLI 仍走原路径。

## 检查

- `tsc -p tsconfig.json --noEmit`：通过。
- 完整 `vitest run --maxWorkers=1 --no-file-parallelism`：636文件、6005测试通过，2跳过；1496.02秒。默认 fork，nice19，同一窗口单worker。
- 25项 Python 固定数据测试：全部通过，覆盖 manual notice、open-book refresh、opening-value、brain card distill/dataset。
- 检查前后2370个代码/配置/知识输入SHA一致，变化0；结束时原计划完整SHA、48叶和 live 基线均未变。
- 48文件组合补丁 gitleaks 通过，0发现。检查结果和日志SHA见 `review.json`、`checks.json`，本地原日志保留。
- 原31文件预览 `99d39c51c745d220b3ea8e6450c0b8f1b53f4224` 已被 ops 替换。它的 tsc 通过；Vitest 主动中止（exit130），不算通过或产品失败。历史日志未覆盖，也没有用此前 main 全检代本次组合全检。

## ops 继续完成的发布与验收

按原绑定硬约束先备份、合并后恢复并校验；沿原自然边界核正式 live 提交与发布号，写上线记录和双通知。当前 CARD=brain / REFLEX=off、Regent暂停的运行配置沿原授权处理。

这次准入精确覆盖上述48文件与冻结知识。发布时继续保留最新工作知识；若JSON推进，沿原知识发布锁与其独立校验核对差异，不用旧快照覆盖。新源码、外部来源/版本或组合变化不自动继承本结论，交回精确差异核验。

首局分别读回 #15 自然奖励的模型/数据身份、预算和耗时，#16 策略消费者共存，以及 #25 的真实来源/条目/字节预算与模拟参考边界。未自然触发的消费者保持待验，不为补验切生产配置。外部参考不能提升 known、混入本系统证据分母或代游戏机制验收。#8 的 R4 CLI兼容与实际角色ACK分别核；#13/#14 研究CLI登记仍pending，不代填确认。

ops 后续提供的50文件备选 `2c6990342cb5490817fd49101e7b9c4ee88b7a23`（0268补丁）明确不替换本48文件候选；不在本次准入范围，沿后续独立窗口核验，不阻塞 P0 #15。本结论只承认48文件与其冻结知识。

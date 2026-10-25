# #66 原 ops 部署核收清单

2026-10-25T19:58:26+08:00 实际检查与独立终态核收已通过：690 文件、6739 过、0 败、2 跳，三 tsc 0、完成回调 0、LIVE 五文件 83 过；原 worker/子进程已退出、full 锁已释放，ROOT/LIVE/依赖及索引语义/树不变。精确 main 提交见同目录 `main-integration.json`，推送读回见 `main-push-readback.json`。原 ops 现接本清单实施自然边界部署，本文件自身不启动生产写入。

来源固定 `a3638d6f147b58a3b306032e0ed7d9df57f2a6cf`，含 #67 最小接线。原实际 LIVE 前像 `86b31b7a57c9325d220b2b3eab41a97761e545cc`；配套精确补丁 `live-runtime-exact.patch` 的 SHA256 为 `39666b67407d2be574eb479bf3e9343259df453ab70935590a0b825a6b22f14b`。`deployment-handoff.json` 逐项给出 11 个源码/CLI 叶的前后像 SHA 与模式，以及两个 ROOT 学习注入叶；按原差量部署，保留实际 ROOT/LIVE 的历史差异。测试、夹具、文档、材料、审计 CLI 保持 ROOT，修复隔离检查所用 archetypes 模型不属于生产部署叶。

1. 沿原 publication-admission 和自然边界结算现有对局/reader/writer；保存实际运行源码、runtime 路径、当前 K1、修订/候选/事件/绑定及成员逐叶 SHA。先用实际旧版本配套 CLI 的 SQLite backup API 写入唯一新备份文件并核读回、SHA 和恢复入口，不能直接复制活动 DB/WAL。
2. 在原唯一 writer 合同内安装上述 11 个配套 runtime 源码/CLI 叶和 ROOT 的 `learner/lib/knowledge-classification.ts`、`learner/lib/knowledge-runtime.ts`。核实际安装 SHA 与前像；若 LIVE 或安装根已变化，先按差量重新核适用性，不能整叶覆盖。
3. 用新 CLI 对原同一 runtime 执行 `init`，增量 schema2→3。分别核原 K1 ID、修订/候选/事件/绑定及成员不变、schema3/索引存在、旧无标签记录为 unknown。源码升级不等于正式分类内容发布，不部署测试造的标签。
4. 用实际安装的 ToolDef 与原消费者读回版本、分类 coverage 和分阶段 empty_reasons；旧在途绑定保持原 ID/成员，新自然绑定另存实际证据。分类候选仍由原学习者凭系统对局/允许外部来源、稳定目标 SHA 和 parent/path/type 条件提交，沿原 K1 发布链核收。
5. 原 ops 在实际 live 提交核准后按 `eval/versions.json` 分配 release_id，记录 decision-log、双箱和原 issue。#60 自然采用/收益、#62 首题原件缺口及其他科学父项保持，#67/#68 后续工程不作为本项发布前置。

命令从实际配套源码的 `agent/` 执行；以下变量由原 ops 填实际已核绝对路径，不能使用示例新建生产目录：

```bash
nice -n 19 node --import tsx tools/knowledge-runtime.ts backup --runtime "$CLASSIFICATION_RUNTIME" --destination "$PRE_UPGRADE_BACKUP"
# Install the matched source/CLI bundle, then:
nice -n 19 node --import tsx tools/knowledge-runtime.ts init --runtime "$CLASSIFICATION_RUNTIME"
```

回退须同时恢复旧 reader/CLI 与旧 schema2 兼容库：保留升级后的库与历史，用旧配套 CLI 将已核升级前一致备份 restore 到新的目录，再沿原边界恢复旧绑定/入口。不能让 schema2 reader 打开 schema3，也不能原地覆盖升级后的 DB。新 CLI 的 restore 会升级至 schema3，不能用于准备旧 reader 回退库。

```bash
# Execute with the saved old matching source/CLI, into a NEW directory:
nice -n 19 node --import tsx tools/knowledge-runtime.ts restore --runtime "$OLD_READER_RESTORE_DIRECTORY" --backup "$PRE_UPGRADE_BACKUP"
```

工程检查的终态、实际生产部署、真实工具读回与自然采用分别回执；不以 main 集成代上线，不重复启动有效 full。

2026-10-25T20:13:26+08:00 参数勘误（ops6397483753）：上版restore示例误写--destination，实际CLI restore要求--backup；已按agent/tools/knowledge-runtime.ts实码纠正。原误文保于3782a52cb历史，ops未执行错误命令。backup命令的--destination保持实际合同。只改交接记录，不重full或重放原自然事务。

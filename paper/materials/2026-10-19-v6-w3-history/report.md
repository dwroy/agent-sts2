# V6-W3 生产冻结历史包

生产包与只读加载器已实现，内容来自已有冻结日志及 W2.2 统计产物。没有写入构筑解释或正式构筑卡。

- 生成入口：`knowledge/builders/build-v6-history.py --manifest INPUTS.json --out NEW.json`。单个 nice≥10 Node 子进程；输入逐文件校验字节数/SHA，解析时再次校验；输出拒绝覆盖，以临时文件硬链接原子创建。更新生产快照应在对局之间由 ops 完成。
- 生产路径：`knowledge/characters/<character>/v6-history.json`；本次仅 Silent 有实际包。372 局、10,932 个 run×floor 摘要、604 个 Boss 首试观测、4,174 个机会、1 个现有组合指标。组合覆盖不完整，缺失保持未知。
- 文件 SHA256 `4858fedc44da6d43a49ea23716199897df1398c65900f931893156bd4e3cb40b`；内部内容 SHA256 `4d73cf029c198357cc322b053d8e5954d088c74a3a632e4bfa9adeae48e83f22`；生成时间 `2026-10-19T13:22:24.227Z`。输入清单与真实构建回执见同目录 `inputs-v2.json`、`build-receipt.json`。
- 运行时 `loadV6HistoryPack(knowledgeDir, character, config)` 只读取本角色文件。开局调用一次并保留快照；不在题内重算日志、不跨角色回退。校验路径/大小/严格格式/内容哈希/时间/角色；缺失与损坏分别返回 missing/invalid。off 在任何文件访问前返回 disabled。
- 第一尝试截止、回滚截断、同层轮询去重沿用 W3 提取；floor_frames 的 observed_frames 是轮询数，不能作为独立局分母。组合指标使用 W1.2/W2.2 的两份 attempt 合并口径，来源局必须包含在 coverage。

固定测试覆盖角色隔离、off 零 IO、哈希/时间/软链失败、快照不被文件后改影响、轮询/回滚、实际 CLI 与错误 SHA、原始丰富牌对象正规化。首次完整检查只有既有文件监听测试失败；原件保留在 checks-2130。该文件隔离复验 7/7 通过；未改该测试。完整复跑与最终联合检查结果在验收补记中记录。

本次交付接口供 W5 在开局读取；接入到大脑/触发/药水路由由其原会话负责。未开局、STOP 保留、未恢复 Regent。

## 独立验收补记

独立完整复跑 checks-2145：tsc 退出 0，vitest 580 文件、5,561 通过、2 跳过（839.84s）。 检查时基线 a1743a354 的 agent 树与最新 main f7580b3f5 相同，随后工作分支快进最新 main，逐文件 SHA 确认功能代码未变。最终共同树验收另见 runtime 报告。完整检查原件 SHA 与保留位置见同目录 evidence JSON。

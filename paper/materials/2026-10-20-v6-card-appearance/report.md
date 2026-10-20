# 冻结出现概率表交付（2026-10-20）

Roy 07:2x 简化投影的离线数据部分。实现提交号在交付记录及 interfaces.md 登记；W3 的查表公式、Wk 模拟和题面由原 watcher 实现。本任务未启动对局、调用模型、派学习批次、修改正式构筑/经验知识或动 live/STOP。

`knowledge/builders/appearance_stats.py` 直接消费现有刷新链已经冻结的本角色原始状态，不从最终牌组倒填出现次数。每局结束的 `refresh.sh` 仍调用同一个 `refresh-v6-history.py`，出现表与其余历史包同一次校验和原子替换；任一步失败保留旧包。代码版本与实际进阶仅作来源，主概率合并统计，统一进阶偏移和 A10 结果仅附列。

精确 TS 导出、历史包字段和消费限制见 [interfaces.md](interfaces.md)。缺少表/目标层/来源/稀有度保留 unknown；本任务没有 MC、W0、其他角色或临近层回退。关闭加载仍在读取文件前返回，旧包不含可选字段时序列化字节及内容摘要保持一致。

## 实际历史重放

本次只在功能工作树生成统计包，持久审计在主项目 `ops/codex-ops/v6-refresh/silent/refresh-gvw5soon/`。只读取既有日志，模拟显式关闭。实际刷新退出 0，四个子步骤及冻结前缀复核通过，原子替换成功，见 [real-refresh.receipt.json](real-refresh.receipt.json)；生产加载器实际读回 `loaded`，内容摘要一致，见 [runtime-readback.json](runtime-readback.json)。372 个已结束 Silent 局，奖励完整机会 4,762 次（372 局）、商店首次完整库存 910 次（339 局），234 个观察身份、468 个来源/牌条目，572 个剩余机会区间，目标层来自实际 Boss 证据：17、33、48、49。

F8→F17 的完整首试区间 n=335；32 局未见目标层，不补后续零。奖励、商店、升级、删牌机会中位数分别为 3、0、3、0。原始分布、实际局号和字节证据保留；此处中位数只描述历史实际路线，不能保证未来机会。详见 [real-statistics.json](real-statistics.json)。

新包 26,089,041 字节，小于加载上限 128 MiB，生产封装校验通过。与旧包逐字段比较，只有追加的 `appearance`、冻结 `cutoff` 和输入 `sources` 改变；既有 coverage、floor_frames、histories、observations、opportunities、labels、17 份 combo_metrics 全部相同，见 [packet-comparison.json](packet-comparison.json)。出现表单独为 4,308,839 字节，通过实际 TS schema 校验。

已独立从冻结审计记录重算全部 468 项出现/升级计数，并抽查 10 条原始状态字节、SHA、局号和层数，见 [evidence-readback.json](evidence-readback.json)。首次临时读回脚本误读原始 envelope 的局号位置，错误记录保留为 `evidence-readback-initial-error.json`；修正为实际 `state.run_id` 后全部通过。该脚本错误不涉及生产提取器。

同机会同牌重复只算一次，升级版本与基础共享身份并另列升级出现次数；多张牌的联合出现、奖励只能取一张、升级对象与休息选择的冲突、金币与买得起均未建模。升级机会仅显式可用 SMITH，删牌仅显式可用且未使用的商店服务；未记录事件服务不推测。逐层有帧仍可能漏同层奖励，已明确是观察下限，并标记幸存和路线选择偏差。

## 验证记录

- Python 固定数据 10 项通过：分母、重复牌、升级、缺字段、首试截止、缺帧/未到目标、统一偏移及实际原子刷新入口。
- TS 固定测试验证 Python/TS 合同、计数与分布一致性、来源和角色范围、旧包字节等价及关闭时不读取。
- 最终 tsc 退出 0；完整 Vitest 601 文件全部通过，5,739 项通过、2 项跳过（844.81 秒，两个 worker）。结果及受测基线见 [checks.json](checks.json)。变基到 2968efc217fb8b4db56e6c4abdaae39002b6019f，期间只有运维记录改动，源码与受测版本相同。
- 首次完整 Vitest 为 600 文件通过、1 文件既有出牌用例超过 30 秒；原件保留。相同文件独立复跑 9/9 通过，再降低并发完整重跑通过；未改超时、代码或断言。
- 首轮全检因 main 新源码合入而中断，原件保留为 `before-rebase-*`；首次日志重放因将审计目录改为持久位置而中断，保留 `worktree-audit-path-aborted-*`，均不记成功。
- 原始 stdout/stderr 以 gzip 无损保存，`raw-output-manifest.json` 记录原字节数及 SHA，保留失败与中断原件。gitleaks 对全部暂存源码、26 MB 生成包及材料扫描退出 0、0 泄漏。

工作树只在 main/live 均有实际发布回执后按原 retention 流程登记；本任务不代 ops 恢复对局或分配发布编号。

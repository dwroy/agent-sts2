# Issue #19：main 三文件四项基线断言

基线：`60cf1f34c`，独立分支 `issue-19-main-baseline-tests`。只改三个固定数据测试；生产源码、知识和运行配置保持基线字节。未运行 play、调用模型、启动学习/模拟批次或修改 live、STOP。

## 契约及引入点

这不是五项包的修复漏同步。历史测试源 `31a24bb2bf02fa26bac9fd284b9834e4e3f97bf9` 的 provider / projection-entries 两个文件与本任务 main 基线的 Git blob 完全相同（见 evidence.json）。它们经 `7c2e920b0` 精确集成；该提交说明精确 live 包通过不等于 main 整树通过，main 保留未运输的投影实现。

- `303bbb1ac`（先于五项集成）已经把 main 的投影实现改为查表 P、只计算完成组合 W、不计算 W₀；`805a0ffe9` 保留目标局部数值/上界。main 的该实现没有在 `7c2e920b0` 被换回旧公式。
- `40e8eef2e` / decision-log 2026-10-20 19:41:13 授权按既有设计核对并修测试；`e3d1285c1` / 20:52:45 明确保留当时精确包的旧 expected_win 混合字段，其 P×W 实现尚未运输。不能把精确包的旧字段语义强加给已保留 P×W 实现的 main，也不能把这次测试修复扩大为删除字段。
- 同一 `7c2e920b0` 将 `constructionCoverage` 默认谓词从 `currentBossKnown` 恢复为完整实测加权值；真实 reward A 路由显式传 `cardResultKnown`，要求当前牌组的实测指标。旧 `805a0ffe9` 引入的低 P 测试没有同步这一安全门变化。

| 原失败 | 依据与修复 | 保留的实质约束 |
|---|---|---|
| provider:139，P=.5、W=1 时 expected_win/win 预期 null、实际 .5 | 按 main 的 P×W 公式断言 .5，W₀ 明确未计算 | prepare 不访问一般补牌 G；W₀/null、样本分母、诊断复制、方向题面不泄露混合字段 |
| projection-entries:23，预期 general_win.n=20、实际 undefined | 不再要求已移除的 W₀ 采样；两个完成组合的 W 分别为 1、.25 | 分别断言 P×W=.75、.1875，各行共享 direction max=.75，不能复制最大值覆盖组合；保留 P=1 边界和严格格式验证 |
| target-values:18，低 P 上界误期望 coverage.reason=null | 目标局部已知上界不能成为实测值；默认 coverage 为 known=0、ratio=0、两个 unknown、insufficient_known_options | P=0 / .04 的 W/PW 保持 null，上界 [0,P]；篡改上界仍判未知 |
| target-values:58，超时后低 P 上界误期望放行 | 同上，完整断言阻止放行 | 超时后仍逐行保留有效上界、W/PW=null，currentBossKnown=true；不擦除有用信息 |

调用方兼容证据：`agent/src/sim/v6-projection.ts` 的 general_source=not_computed / formula=formation_times_completed；`agent/src/sim/v6-projection-entries.ts` 从组合自身复制值并单列 direction_value；`agent/src/v6/construction-safety.ts` 的默认谓词与 reward A 覆盖谓词；`agent/src/sim/v6-card-results.ts:cardResultKnown`。既有 `v6-construction-safety.test.ts` 和 `v6-card-results.test.ts` 继续验证 >=2 选项、比例阈值及 A 实测门；本次未改这些消费者或阈值。

## 验证原件

所有命令 nice 19，单 worker 串行；PATH 加入 `~/.local/node/bin`。仅固定数据，没有网络模型请求。完整测试在 threads 下运行，`paths.test.ts` 因 Node 不允许线程内 chdir 单独使用一个 fork；两个分片合计覆盖完整测试集，无测试遗漏，没有新增排除或延长超时。

- `baseline.log`：未改基线，3 文件失败、4 失败 / 6 通过，exit 1。
- `targeted.log`：首轮改动，44 通过 / 1 失败；新组合均值浮点误差导致精确相等失败，原件保留。均值改用 14 位精度校验（.25 / .1875）后另存重跑。
- `targeted-final.log`：6 文件、45 项通过，exit 0；含三个修复文件、construction-safety、card-results、card-results-input。
- `tsc.log`：生产类型检查通过，exit 0。
- `full-threads.log`：637 文件通过，6030 项通过 / 2 项既有条件跳过，exit 0；单 worker 耗时 1498.97 秒。
- `full-paths.log`：剩余 paths 文件、11 项通过，exit 0；两分片合计 638 文件、6041 项通过 / 2 项既有条件跳过，没有失败。未修改条件跳过的 logdb / third-party 测试。

`evidence.json` 记录基线提交/生产树、三个受测测试文件 SHA256、历史测试 blob 同步关系与执行命令。所有失败原件保留，不用定向结果冒充完整绿色。

gitleaks：三个实际修改的测试文件及材料扫描均通过。另存的 `gitleaks-tests.log` 是整个既有 agent/tests 树的额外宽扫，返回 11 项命中；它不代表本次差异扫描，不据此修改无关夹具或增加 allowlist。最终暂存差异扫描通过（`gitleaks-staged.log`）；公开评论正文发前单独扫描。原始日志的末尾空行保持原样；代码和说明文件通过 diff --check。

本次不改变对局行为，不分配 release_id；交集成员核验后沿 #8 原链集成。科学父要求、校准/拿牌收益与角色确认均不因测试修复完成而关闭。

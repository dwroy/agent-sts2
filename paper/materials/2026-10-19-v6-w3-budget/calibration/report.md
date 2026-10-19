# 同冻结生产模型 Silent Boss 校准续批

批次 `v6-boss-calibration-resume-20261019-2022`；任务 `v6-boss-calibration-resume`；状态 **blocked-host-process-visibility / incomplete**。请求 `roy-20261019-current-production-boss-calibration`，父 `roy-20261017-human-pace-h0` 不关闭。`published=false`；未发布、未合 main/live、未改正式知识、未记 shipped。

当前沙箱 `/proc/1` 是 `codex-linux-sandbox`，只见本命令进程；`/proc/1/root/proc` 仍是同一视图。无法完成授权要求的“执行前再次核宿主 /proc 身份、cwd/命令及锁”，也无法在运行中核真实 play 恢复。因此未启动计算子进程，未声称旧 PID 已退出或两原锁空闲。派发时宿主确认保留为历史事实；本批没有确认真实冲突。详见 [process-check.json](process-check.json)。这不是审批拒绝，不需要 Roy 重复授权；待原宿主启动器具备上述可观察条件后才能继续本请求。

## 身份与冻结

原批次 `20261019-081928-fix-batch`、原分支 `silent-boss-calibration-refresh-20261018-083038`、owner、工具会话 70517、提案 `silent-proposal-da817af4fc7159de`、账本 `silent-0519` 均保留。本批是新 codex1 离线执行身份，没有冒充旧线程。任务要求 Sol 6.1/high；未核原生 turn_context，不能报告档位生效。未改账号、配置或权限。

本树 HEAD 为 `03cb9f2bfb89dadfb0dbda4cc875bc7536714737`。生产冻结 `9f4245511181c6228cf63dc44700ea28ccf35730`，模型 SHA256 `c9f5bfecafd45698af4c8e14f929c4d41cf03afb73818d0dedc2f257c4ef858b`。722 个输入均逐字节 SHA 核验通过；原模型只读引用，无 prepare、无新模拟器、无全仓复制。

- fights SHA256：`ba46c92dfbc17c17155752447b7eda4a1f9648f2e821b0e6e4bf4ad05dbc17d6`
- sources SHA256：`7e7bcb05662ca4be24f7f1607b215ebad0331567b0498ed42adc1d219c151a3d`
- split 文件 SHA256：`b185330cd434929c5a4211779753d554dc22ed8c701165dc986a4debf0be9daf`
- 固定 658 场 × T1/pre = 1316 起点；107 tune / 551 validation；每起点 200 样本。
- 原始非空输入行索引 i 的种子为 `1 + i * 101`。始终传完整输入，不对子集重编号。

精确路径、字节数及 SHA 见 [input-manifest.json](input-manifest.json)、[verified-model-references.json](verified-model-references.json)。冻结身份文件精确复制到本 scratch，其余输入只读引用原 scratch；原件未改。

## 检查点与分片

从指定 Git 提交的 `2026-10-19T110716_0800-217` 检查点恢复，原 status 仍为 incomplete。217 行 SHA256 `b87c8ed95c3a16363d4f858207f675051d0cb96eec7ae2d0fdf7172e650df6b6` 与记录一致；215 行成功、2 行显式失败，已逐行核冻结实际结局和 200 样本。失败原行见 [explicit-checkpoint-failures.json](explicit-checkpoint-failures.json)，不算 0 胜率。后续 274/280 行观察不回填本检查点。

| 预期 | 已完成 | 成功模拟 | 显式失败 | 缺失 | 本批新算 |
|---:|---:|---:|---:|---:|---:|
| 1316 | 217 | 215 | 2 | 1099 | 0 |

[shard-plan.json](shard-plan.json) 分为 10 个分片、每片 T1/pre 各一任务，共 20 任务。只规划缺失起点，避免已完成半对重算；计划不是已执行。固定数据核验分片并集=1099 缺失集合、无重叠、原行号与种子不变、重复一致/不一致拒绝、成功与显式失败计数；[data-checks.json](data-checks.json) exit 0。未实现或运行后台驱动。

授权的未来总量≤12（含协调器）、计算子进程≤10、全部 nice19、五个线程环境变量=1；真实对局恢复必须总量≤4。实际只有本批只读核验脚本以 nice19 运行，模拟子进程=0，没有 play 或真实 LLM 调用；未改 STOP/Regent，未启轮询模型/调度器。

## 四门与对照

四门保持 validation n≥10、Brier≤整体1.25倍、预测与实际胜率差≤0.15、穿透血 sim/log∈[0.7,1.3]。当前全量不存在，全部当前指标和四门结果记 null/待全量，不将计划场数冒充成功模拟分母，也未用时间前缀作验证统计。

[逐 Boss × T1/pre 旧表及当前未决表](boss-comparison-pending.md) 共 24 行，旧表来自冻结 `7e1193cef9467416bc10c8e344a49f4fd98390c7`；机器结果 [boss-comparison-pending.json](boss-comparison-pending.json)。[paired-pending.json](paired-pending.json) 保留 548 个共同验证候选 key、3 个新增验证 key；共同成功配对数待全量。R386 实验体、R392 永世沙漏、R393 女王的配对指标均未计算，不能归因。

原 tune-only T1 系数 a=2.0443/b=0.4536/c=0，pre a=2.2681/b=0.5105/c=0；本批没有拟合或用验证集选择参数。原 incomplete 内容指纹保留；本 scratch 只有 [未完成准备指纹](preparation-content-fingerprint.json)，没有完整结果指纹或 package，也没有自动发布 boss-trust。

A10/F49 保留原审计：658 个开场；A10 HP 与开场来源 756 个敌人记录均为 A10，49 个带伤害定义的招式来源 A10、estimated 列为空，另有 27 个无伤害记录招式定义；这不表示模型机制完整或已经校准通过。F49 实际尝试 36 场。来源审计不能消除数值/机制不足；不外推 F48/F49 联合通关。SL 是分别记录的实际结局尝试，同一 run 非独立局分母。

## 测试、提交、账本与未决

未修改仓库代码/测试，未新增提交或 patch；原先未跟踪任务模板保持。按记录/数据例外，本批未重跑 tsc/vitest。原 tsc=0、完整 vitest=1（4497 例中 11 失败）、Python21=0、定向16例=0 保留；原完整失败日志 `/home/dw/Projects/agent-sts2/learner/runs/20261019-081937-fbd78246-f888-40b7-bd52-b9d5e04bf880-silent-boss-calibration/source-sandbox.log` 和 original-check-disposition.json 未改，不能以数据核验替代原测试通过。新数据核验 exit 0；本批 gitleaks 结果见 result.json 与 gitleaks.log。

原六项提交完整列表见 result.json；无新提交、合入、发布号、账本/通知事件。`silent-0519` 仍 proposed，提案仍 pending-not-live-implemented。没有新增对局结论或异议，未代 ACK，未关闭任何父要求。

下一步先解决宿主进程可见性及原锁检查，再沿已冻结清单计算缺失 1099 起点、合并核全量、package、确认 tune-only 系数，并完成共同 keys/新增样本/H0 三修正项对照。**下一 H0 优先 Boss 待完整当前指标后提出**；现在指定会预设结果。本批停止，不自动续批或发布。

# #31 预登记：GPT high / xhigh 实盘对照

2026-10-21，开发基线 ee36abb93077c6d79d70b301a773519b97b4ec89。登记于源码交付前，尚未启用排程、未运行试验局或额外模型请求。授权：[issue #31](https://github.com/dwroy/agent-sts2/issues/31)、[按局引擎配置补充](https://github.com/dwroy/agent-sts2/issues/31#issuecomment-6314752420)。这里的阈值是实验操作规则，不是游戏知识。

## 样本与分账

- 计划 20 个新局，按 high、xhigh 逐局交替，各分配 10 局；模型固定 gpt-6.1-sol，normal tier。整局冻结 engine / effort / trial_id / sequence；重启、SL、额度等待不算新局。保留已结束局和所有中断/错误/缺回执，不能删掉坏局重新抽样。
- 只在相同角色、**实际 ascension** 内比较。climb 规则保持；升级后另建进阶分层，不把目标进阶当实际进阶。若 20 局后某一层不足各 10 局，报告缺口，请 Roy 决定是否追加；本排程不自动超过 20 局，也不自行降阶凑样本。
- 默认既有战绩基线排除带 trial_id 的局，原始成本/用量保留。`eval/metrics.py --brain-trial <id>` 可显式查询；正式同进阶对照用本目录所述 `eval/brain_trial.py`。`runs.jsonl` 及每局复盘增加实验身份，学习者保留原对局证据并识别实验组，不把它当既有 xhigh 基线。
- 同时保存代码提交、配置 SHA、知识摘要、时间、首局原生回执。知识刷新和上线仍可发生，逐局披露；按相邻 high/xhigh 配对展示，版本或知识变化的跨界对另列，不称因果控制已完成。

## 指标和判定

结果：最高层数、胜负、死亡遭遇、各幕/Boss 进场 HP 与通过证据。Boss 仅用原状态里 boss_id 与实际敌人 ID 匹配，后幕出现/最终获胜确认通过；缺帧、未识别、多 Boss 未完整覆盖都写 unknown，不按层数猜 Boss 已过。进场 HP 是首个已记录战斗帧的 HP，可能迟于实际进场；SL 后另列首次观察限制。

大脑：每局调用总耗时（失败行与 primary_ms 纳入）、配置首次记录至结束的整局时长；每题型单题 p50/p90（nearest-rank）、重问、路由超时、物理 stall/流式重连、容量错误、等待事件、fallback、90 秒脑预算超限和实际 decision time_budget 超限/兜底次数；token 分 input/output/cache/reasoning，未知成本不记 0 美元。物理调用的已知用量与脑行的聚合用量不相加以免重算；失联前无法计量的 token 明确未知。统计原件可以按文件、行号、SHA 重算。

所有配置局都进意向分组结果表；严格质量/速度汇总只纳入配置一致、已结束、每条脑记录有匹配原生模型和档位的局；缺回执、实际不匹配、混档、未结束单列。严格排除不使坏结果消失，必须同时看全部分配局的结果/故障率。原生 receipt 不等于服务端内部算力证明，只证明 Codex 原生 turn_context 的实际上下文。

满足以下全部条件才给“可考虑扩大 high 试验”的建议：同一进阶每组至少 10 个有效结束局；high 每局脑耗时中位数至少降低 25%；high 层数中位数不低于 xhigh 超过 3 层；通过首幕 Boss 的比例不低超过 20 个百分点；high 未接受脑题比例不高超过 5 个百分点；下面固定回放有效配对至少 24/32、动作一致率至少 80%，无未解释的重大合法性/资源约束分歧。任一不满足或分层样本不足，建议保留 xhigh / 追加受控样本，不全面切换。这是小样本筛查，无统计显著性或非劣效证明；胜负与因果收益不能由一致率替代。最终全面切换由 Roy 定。

## 决策质量：固定回放（批次后才运行）

使用 #29 已冻结的 32 题，每题 high / xhigh 都答一次，逐题交替先后顺序。输入固定到本基线 Git blob `paper/materials/issue29-brain-speed/fixtures.jsonl`，禁止重新从新知识库构题。题型分布沿原清单：奖励8，事件/营火/商店/路线/幕初计划/选择各4。该回放不代表未来实盘题覆盖，只作为合法性、完成率与动作一致率的辅助指标；沿 #29 的主动作定义，依次取 choice / plan / route，缺少这些字段则主动作未知；另比 choice/cards/route/plan/discard/drink 全动作字段（route 逗号串归一为列表）。reason/confidence 与可选 V6 建议不参与机械一致率，重大分歧逐题列动作、由人审证据，不自动把 xhigh 当正确答案。

成本预算：64 次计划请求、每题 90 秒，无路由重问、无 stall 重试；引擎自动 session 修复/exec 回退也计物理请求，**持久上限 96 次**。顺序执行、nice19、最多2个进程；使用专门的开发隔离 home，禁止使用生产 brain home，不复制凭据或改共用配置。理论计划最坏约96分钟，额外重启/额度等待可增加墙钟，物理总数不得超过96。本开发交付不实际调用模型。工具支持 dry preparation，`--run --home` 才发送；若没有合规的既有开发 home，则保留待执行，不借用对局账号。

## 止损与停止

ops 每个结束局后、下一局前运行分析；第一局先核原生回执，再继续第二局。以下任一发生时由 ops 在自然边界停本排程并回到 xhigh，在 issue 评论原因，不热改正在玩的局：

1. 请求/原生模型或档位不一致、同局混档；首局缺原生回执也先停排查。此项是实验完整性门。
2. 同进阶两臂各至少4个结束局后，只比较各臂最早相同数量局：high 在 F≤17 且未获胜的早死数比 xhigh 多至少3局。F≤17 是预定操作分界，不声称所有版本首幕恰好17层。
3. 任意 high 局未接受脑题比例达到20%，或连续两局 high 因脑配置/接口故障无法继续。脚本输出前者，后者由 ops 核原故障/控制器退出记录；额度等待与游戏自然阵亡分别记录。

脚本只输出止损信号，不修改配置、live、STOP 或进程。20局分配满额后 admission 返回78，原 autoplay 保留存档并退出等原 ops 定下一政策，不默默续跑 high。取消排程只在自然局间清除其启用变量；回滚仍保留原试验、失败与统计材料。

## 上线与接续（ops 执行）

开发交 review → 集成员完整检查合 main → ops 原发布锁及局间流程上线、登记实际 release_id / decision-log / 双通知。此开发树不发布 live，不预占 release_id。

启用变量仅作用于原对局启动入口：`BRAIN_TRIAL_SCHEDULE=<运行根内预登记 schedule.json 的绝对路径>`。ops 可沿原局间发布流程在运行根的 `ops/production-runtime.sh` 设置，供下一次 run.sh 读取；只在本会话 export 不会改变既有 autoplay 的环境。不得在正在运行的控制器上改档。原 `run.sh` 读取排程及 run-config/runs 日志，resume 同局保留 profile；遇到尚未结束的非本试验局拒绝纳入，等它自然结束再启用。不要运行开发树的 play，不改 STOP。

止损/回退时由 ops 在同一自然边界入口明确 `unset BRAIN_TRIAL_SCHEDULE BRAIN_RUN_CONFIG` 并设置 `BRAIN_CODEX_EFFORT=xhigh`，再按原流程恢复；不要把仍设置的手动 profile 留给下一局。本提交不修改该生产设置文件。

手动单局合同：`BRAIN_RUN_CONFIG={"engine":"codex","effort":"high"}`；未来 #32 复用 `engine:"deepseek"` 加强度，但本提交生产入口明确拒绝 DeepSeek，避免静默换成 Codex。试验排程只接受本20局Codex方案。模型、超时、开卷/策略库接入由 #32 保持独立。

首局需核 `run-config.brain.run_profile`、`human_pace.model_effort`、每条脑行 `requested_effort`/`run_brain`，以及 `native_receipt` 的原生 thread_id、turn_id、model、effort 和来源 SHA。session 在 revert 前读取自己的 turn_context，正常情况下下一次 state observe 将原生确认追加到 run-config 的 `brain_native_receipt`；它不改变 config_sha，不冒称配置变化。每个原生模型/档位变更再记一条；详细每题确认始终在 brain/codex-calls。exec 或丢失回执为 null，不能从请求推定成功。

重算命令（只读生产日志；输出另存材料，发公开评论前扫描）：

```bash
nice -n 19 python3 eval/brain_trial.py --logs <运行根>/logs \
  --trial-id issue31-gpt-high-xhigh-v1 > <本批结果路径>/report.json
```

固定回放准备时用 `git show ee36abb93077c6d79d70b301a773519b97b4ec89:paper/materials/issue29-brain-speed/fixtures.jsonl` 恢复到仓库内 `data/issue31-quality/fixtures.jsonl`；工具启动即冻结 SHA，已有输出身份不符拒绝继续。`node --import tsx tools/issue31-quality-replay.ts --fixtures <文件> --out <仓库内专用输出目录>` 只准备清单；批次结束后以同参数加 `--run --home <既有隔离开发home>` 实际重答。报告命令加 `--fixed-replay <输出目录>/results.jsonl` 输出有效配对/分歧动作。原始题面和输出留本地，公开只发脱敏汇总。

本 issue 的“首局实际档位、每臂至少10局、对照报告与建议”仍由 ops 自然数据和批次后开发接续完成，源码/固定夹具通过不关闭这些验收。

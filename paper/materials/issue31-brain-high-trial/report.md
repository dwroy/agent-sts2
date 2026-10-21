# #31 开发交付

基线 `ee36abb93077c6d79d70b301a773519b97b4ec89`，独立工作树 `issue-31-brain-high-trial`。开发内容为按局配置、交替排程、原生回执、重算工具及[预登记方案](preregistration.md)。本树未运行游戏、未修改 live/STOP、生产账号、共用设置、其他角色知识或会话；没有实际模型请求。

## 行为与接口

- `BRAIN_RUN_CONFIG` 严格 JSON：engine（codex/deepseek）、effort、可选 trial_id/sequence；本次只启用 Codex，DeepSeek 生产请求明确拒绝并指向 #32，不会静默替代。`ops/run.sh` 的旧 `BRAIN_CODEX_EFFORT` 可显式覆盖默认 xhigh；router 的人类节奏入口读取本局配置，90秒预算和原有恢复/兜底机制保持。
- `BRAIN_TRIAL_SCHEDULE` 显式启用 [schedule.json](schedule.json)，默认不启用。`ops/brain_trial.py` 从已记录局身份分配 high/xhigh，不按控制器启动数推进；重启同局、SL、额度等待留在原组。非试验在途局、损坏/重复/混合分配或20局满额返回78，由原 ops 处理。不开新循环、不更改当前局。
- run-config 保存 `brain.run_profile`、真实请求档位；每条脑行保存 `run_brain`、`requested_effort` 和 `native_receipt`。session 的当前线程/turn_id 对应 `turn_context` 在 revert 前提取 model/effort 和原行 SHA；首次及档位/模型变化在后续 state observe 追加 `brain_native_receipt`，config_sha 不变。exec 及缺回执记未知；不能从配置推定实际档位。每个物理 session 调用的确认也在 codex-calls。
- `eval/brain_trial.py` 只读原始 JSONL，按角色/实际进阶/引擎/档位分组，保留逐局、逐题、Boss首帧HP、SL尝试、耗时、预算、失败/容量、用量及文件/行号/SHA；严格有效组与全部意向分配结果同时保存，输出止损信号，不操作游戏。Boss/SL覆盖不足写未知。
- `ops/report.py` 给复盘及 runs.jsonl 带实验身份，学习者可读。`eval/metrics.py` 默认从旧战绩基线隔离试验局，原始成本不丢；显式 `--brain-trial <id>` 才查询试验，并按档位/进阶分列，不加混合 total。
- `agent/tools/issue31-quality-replay.ts` 固定 #29 32题（[SHA清单](quality-manifest.json)）、64次计划请求，持久96物理调用上限。只准备/dry-run已验证；实际重答须在批次后显式启用，专用开发 home，禁止生产 brain home。补充报表支持 `--fixed-replay`，列主动作一致率、全动作字段及分歧，不把 xhigh 当正确答案。

## 验证记录

完成回执见 [validation.json](validation.json)。原始 Vitest 输出在本树本目录 `vitest.log`、`targeted-final.log`、`paths-final.log`（忽略文件，留本地）；固定数据测试，无模型或游戏调用。所有命令 nice19，Vitest单worker。

- 生产 `tsconfig.json --noEmit` 通过；新回放工具与生产/learner源码的独立 tsc 通过。
- 全量线程套件仅排除需fork的paths：646文件中645通过，6078项通过/2跳过/1失败，24分52秒。唯一失败是稀疏工作树未展开已提交的 #29 `results.jsonl`，导致check-imports引用不存在。随后从基线 Git blob精确恢复此文件，工作树无该文件差异；未修改导入门禁或测试断言。
- 修复输入后定向检查：check-imports、run-profile、codex-session、router、人类节奏、run-config、codex-only，共7文件118项通过；paths另以单fork运行，11项通过。原全量失败日志保留；全量未再重复跑25分钟，不把初跑exit1写成exit0。
- Python 新测试6项通过；既有评估算法测试20通过/8项因当前Python缺DuckDB跳过；`bash -n ops/run.sh`通过；冻结32题回放dry-run通过、模型调用0。

额外执行的全量 `tsconfig.tools.json` 未通过：错误来自未改动的 boss-loss-backtest、boss-sim/pairs、combat-latency-replay 等旧工具文件；不以它代替生产检查或宣称工具全量通过。新回放脚本单独与生产/learner源码一起检查通过。原失败转录保留在本开发会话，未伪装为生产故障。

## 集成与实际验收待办

1. 集成员核源码、完整检查并合 main。按原 ops 发布锁把执行代码接入 live；由 ops 核分配行为发布号并写实际上线 decision-log 与双通知，本开发不预占编号。
2. ops 等自然局间启用排程，首局核原生请求与实际 model/effort，再继续交替。每局后检查报告止损信号，必要时沿预登记步骤恢复 xhigh。现有未结束非试验局不会被纳入。
3. 两组各10局以及同进阶有效样本尚未产生，首局原生自然回执也未验收。满额仍不足时向 Roy 报缺口；固定回放在批次后运行，开发再出结论/建议，全面切换由 Roy 定。
4. #32 复用 `brain.runProfile`/`BRAIN_RUN_CONFIG` 合同，后续实现 DeepSeek 路由、预算和实际回执；本提交不让它接管生产。

本树尚未实际进入 main/live，不登记 retention complete，不清理活动工作树，不关闭 issue 或科学验收父项。

---
title: Roy 授权的大脑仅用 Codex、不可用时等待与战绩口径
effort.codex: xhigh
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# 独立功能：大脑仅用 Codex

Roy 2026-10-07 09:00 manual 已明确授权本任务：决策不要让 DeepSeek 做，只用 Codex；Codex 不可用时暂停等待恢复，不让 DeepSeek 或 Jev／代码代替大脑作答。DeepSeek 大脑打的局在爬塔统计中单独标注，默认不计战绩。本批是独立架构／统计功能，不修其他队列 bug，不混入 boss 校准；无须再请求架构批准。

- 独占工作树：{{worktree}}；根目录：{{project_root}}
- 角色：{{character}}；日志只读：{{logs_dir}}；临时产物：{{scratch}}
- 开工确认工作树干净，再合入 {{base_branch}}
- 合入：{{merge}}；目标：{{merge_dir}}

先读 AGENTS.md、docs/learning-protocol.md、notes/ops-handoff.md 的 live 流程，以及根目录 notes/fix-queue-v4.md 中“大脑只用 codex，不用 DeepSeek 兜底”节。Roy 已说明 live .env 去掉 BRAIN_FALLBACK=deepseek；此项只是用户交接事实，不读取／改写任何 .env 或 key 文件，不把它当完整功能已经实现。

1. 查清大脑各调用及失败路径：路线、选牌、事件、商店、休息、整局计划，以及脑失败后转到 Jev／代码的路径。额度用尽、登录失效、预检失败、连续超时休息等可恢复的 Codex 不可用应在当前决策的安全点等待并有界退避重试，恢复后仍由 Codex 回答同一题。不能把失败、空答案或重试耗尽变成非 Codex 脑决策；不要默默跳过脑题。区分暂时不可用与程序错误，不用无条件吞异常的死循环掩盖真实故障。
2. 暂停／恢复要有结构化日志、run id／决策类型／原因／时间及收件箱通知，避免每次重试刷屏；停止信号和原时间预算要可解释，等待不能使自动循环弃局、另开一局或产生重启风暴。让 stall 检查识别这种有心跳的正常等待，恢复后能继续同一题／同一局，不擅自发游戏动作。只禁止代替大脑：保持既有 Jev 战斗执行和代码求解职责，不能把整场出牌也改由 Codex。安全执行校验仍按原职责工作，不能替大脑选择另一个选项。
3. 根据 brain.jsonl 的实际成功回答引擎建立每局来源标记；不要把兼容 deepseek_calls／ds_* 字段误当真实引擎。保留 Codex、DeepSeek 和混合情况及各脑题成功数量、未知／缺日志与归类依据；给出透明的一致统计定义。用户点名的 MCCK2602T1SR、UJ0K3G10609Y、U8K28UUGYP3U、L9SGRBB5R698、D4LJ9QMGFB8Q 和 10-07 额度耗尽期间的局逐一核对实际日志，不仅硬编码这五局。DeepSeek 脑局默认排除于 Codex 爬塔战绩／学习曲线／论文绩效表，但单独显示原始局数和成绩，保留全部原始数据和旧快照；混合引擎局不能默认为纯 Codex 战绩。未知历史不能编造引擎，报告其范围和兼容办法。复盘及学习证据仍可引用这些局，费用和用量不能因绩效排除而消失。
4. 统一 eval/metrics.py、论文数据／学习曲线及爬塔相关口径；查自动 climb 是否使用同一战绩口径，避免排除统计后仍让其他引擎胜局偷偷升阶。保留首次尝试与 SL 分账，按角色隔离；所有统计提供可追溯标记／排除原因和包含非 Codex 局的显式口径。先保存原统计，不回改旧报告；新的报告写明口径改变。若 Codex-only 全局架构影响铁甲，说明仅限 Roy 明确要求的引擎等待／来源口径差异，不能顺便改其游戏策略、知识或角色数据。
5. 固定夹具验证各大脑题失败后无 DeepSeek／Jev／代码代答、恢复后同题只执行一次、取消／预算／退避／心跳和通知幂等；覆盖 Codex／DeepSeek／混合／未知历史、角色隔离、SL、学习证据及成本保留、metrics／paper／climb 口径一致。不得调用真实 LLM 或运行 play 测试。记录撤去源码的有意义回归验证。报告各调用覆盖、局号分类表、实际统计差异、等待与恢复入口和未完成事项。

## 测试、提交、live 与回报

一个任务一个工作树，不编辑其他学习者工作树。只在本工作树和 scratch 修改实现、任务报告及测试；根目录学习账本仅经 CLI 追加，不能把 Roy 架构要求冒标游戏知识或 bug-infra。不要直接编辑根目录 notes/、ops/；运行时收件箱通知逻辑可以作为代码实现，测试写入固定临时夹具。不要改运维 prompt、key、.env、hooks／config；不装依赖、不推送、不停当前对局、不运行 play。

每次代码提交前在 agent/ 跑 bash tools/test-sandbox.sh（含 tsc），PATH 加 ~/.local/node/bin，TMPDIR 指向 scratch；后台 nice、最多4进程。Python统计／调度测试也用固定数据。全局 Git 身份，提交前 gitleaks，提交带 Co-Authored-By。

自测通过自行按 live 流程合入，不另设审核：持根目录 ops/live-merge.lock，确认知识刷新结束，保存 live 的全部刷新（含新增文件），查重叠、预检再合本任务源码，记合入前提交；合后沙箱检查通过后登记发布。失败保留原检查及合入受阻历史，按流程回退本次代码并保留原刷新。先 date 再写 decision-log；改变对局行为须唯一 eval 版本。源码、实际合入、发布及固定树都写清楚，shipped 由运维核实登记。

完成报告放 {{scratch}}/report.md 和 report.json；最终沿 fix-batch JSON 协议回报 task=fix-batch，fixes 的 item 明确“Roy 已授权独立功能：Codex-only 大脑等待与统计口径”，给 base、逐源码 commit／test／fails_without_fix、skipped、merged、tests、全部提交／固定发布树／版本／报告路径。fix-batch 只是完成事件和外部检查通道名，本任务是新功能。提交或合入受阻写清楚事实供运维兜底，不能假称成功、绕过引擎／key 自检或等待未经要求的新审批。

---
title: Roy 已授权独立功能 boss-sim-automation
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# Roy 已授权独立功能：B4/B5 自动触发与自动验收

任务：boss-sim-automation；独立工作树，流程按角色/boss隔离实现，首批角色 silent。授权来自 Roy 2026-10-07 12:11、12:35 manual，notes/fix-queue-v4.md「B4 / B5 纳入标准流程，自动触发」完整原节；docs/boss-sim.md §13/14。Roy 不再逐次拍板，完成调度检查+学习者任务模板后，第一批自动做静默 AEONGLASS B4。任务引用的10死/2.24/71%对0%由学习者从日志再核实，不能当运维新增机制。

## 触发及去重

每次 boss 校准重跑后、每局结束后检查。B4 必须同时：最新低可信且至少一项模型偏差（Brier>整体1.25倍、预测实际胜率差>15pp、打穿比不在0.7–1.3，不能只有场数不足）；累计死该boss≥5或当前进阶最近20局≥3；有逐回合日志战斗≥8。每boss一次B4结束后≥10场新战斗且下次校准仍偏差才重触发；同一时间最多一个B4/B5学习者批次，独立任务/工作树，存触发证据键和冷却，不反复派重复任务。

B5：当前进阶最近20局前两大死因且≥3、B2因低可信不用，B4已做过或只差场数。扩验证集（新局仅进验证）、核对实盘整场预测、试模拟策略调整、评估B2排序收益，按原标准达标进名单，B2自然生效。保持按角色日志/知识分账，不复制铁甲游戏经验。

## 自动验收，严格隔离模拟改动

B4/B5 后续校正只改 fullFight/模拟专用字段，实盘 solver 和5回合推演逐字节不变（§13式防回归检查），不以“只改模拟”绕过本任务调度源码检查。验证集该boss打穿比/胜率差/Brier至少一项进入或接近标准、其余不变差，整体T1起和战前Brier不变差超过0.005；明确“接近”的可重复判据、缺数据 fail closed，学习者凭记录执行自动验收而非请求Roy。

不满足则留独立分支、台账rejected含原因/数据/证据、进入冷却；不假称上线。通过自动按 live 流程发布、重跑校准/character boss-trust，decision-log、唯一eval版本、kind=fight/mechanic台账含局/回合证据。报告 paper/materials/<角色>/boss-sim-b4-<boss>-<日期>.md 或 b5-…，升级小结引用。调度完成/失败、重试、租约、证据变更、新数据冷却、B4/B5互斥及验收边界全部固定夹具测试；保留原失败历史。

机制上线后确保首批 AEONGLASS B4 真实派发，不只写 pending 文件或报告“可派”；写清 batch/PID/证据与后续完成事件，若未满足重新核实后的条件据实报告差额。不要在自动机制外启动不可追踪后台批次。

工作树：{{worktree}}；根目录：{{project_root}}；角色：{{character}}；只读日志：{{logs_dir}}。
开工确认自己的工作树干净并先合 {{base_branch}}；合入分支 {{merge}}，目标 {{merge_dir}}。

## 边界、测试与上线

这是 Roy 已授权的独立新功能，fix-batch 仅为调度完成事件及外部完整检查通道；不要当普通修复队列批次，不新造 bug-infra 或架构游戏知识条目。只在分配的独立工作树和 {{scratch}} 写源码、报告、测试；使用本项目自身对局日志，按角色隔离数据，不读游戏包或 key/.env，不安装依赖、不推送、不运行 play、不停止当前对局或调度。每个后台任务 nice、最多4进程，统计/测试用固定夹具。

开工先读取 README、最新 STATE、decision-log、docs/learning-protocol.md、本任务对应 notes/fix-queue-v4.md 授权原节。本任务内明确的 Roy 2026-10-07 新授权优先于旧文档限制；不要把同样已授权的规则更改送回待审批，不更改 ops 运维 prompt。任何游戏机制、参数、判断和新规则必须有学习者自己核实的角色局号/回合证据；没有证据不修改。

每次代码提交前在 agent/ 用原 bash tools/test-sandbox.sh（内含 tsc、固定排除），PATH 加 ~/.local/node/bin，TMPDIR 指向 scratch，SANDBOX_WORKERS≤4、nice。Python/调度检查同样固定数据。保存初稿失败、撤源码红/恢复绿、全套原日志和固定检查树，不能削弱断言或把沙箱限制当源码失败。全局 Git 身份，提交前 gitleaks，Co-Authored-By 带实际引擎模型。

自测通过按任务 live 流程自行合入，无须另设审核：根目录 ops/live-merge.lock 内检查无知识刷新/report.py，保存 live 全部刷新（包括新增未跟踪知识），查重叠、预检合本任务源码，记合前提交。合后原沙箱通过再登记唯一 eval/versions.json 发布和 decision-log（先 date），无行为变更的纯派发记录不冒造版本。失败保留原日志并按流程回退本次代码、保留刷新；提交/合入受阻明确写回报由运维兜底。

完成报告写 {{scratch}}/report.md 和 report.json，最终 JSON 沿 fix-batch 协议 task=fix-batch，fixes.item 明确本独立功能名，列 base、每项源码 commit、test、fails_without_fix、skipped、merged、tests、所有实际源码/合入/发布/固定树和报告路径；不把未做的工作写成成功。游戏条目 kind=fight/mechanic 依证据和 ledger CLI，不冒称 shipped；运维核实登记。

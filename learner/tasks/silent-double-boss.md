---
title: Roy 已授权独立功能 silent-double-boss
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# Roy 已授权独立功能：A10 双 boss 优化与学习流程 A–D

任务：silent-double-boss；角色 silent，独立工作树，不与 B4/B5 或普通 codex-dev 批次混用。授权来自 Roy 2026-10-07 12:22、12:35 调度 manual，notes/fix-queue-v4.md「A10 连打两场 boss 的针对性优化 + 学习流程四处补强」完整原节。先做 A，再做 B/C/D，先把可验证的 A 上线，可分阶段交接；其余不能静默遗忘。

## A 优先：F48→F49 资源与合计通关率

自行核查 JMH5C51RLN4E、9TG1RP5LFAAK、TDLBRNA0R05B、ZVYUL2YP3518 及全部相关静默 A10 实盘，不以任务引用代替证据提取。学习者按数据拟合参数/权重，报告样本量、时间切分、缺数据和不确定性。

1. F48 终局剩余 HP/药水按 F49 剩余资源价值定价，覆盖实盘求解/推演终局 HP 价值和当前 boss 药水持有价值=0的入口；只在实际观察确认的双 boss 结构生效，其余角色/进阶保持等价，避免泄露未来未观察机制。
2. B2/整场模拟对 F48 看两场合计清关概率，第一场结束把实际模拟剩余 HP/药水传到第二场，不能用两场独立概率相乘冒充资源连续条件；报告胜 F48 死 F49 的验证效果。
3. 三幕路线/休息按双战备战，沿用 silent-0163/S1.fix27 修过的结构，不回退或重置原 shipped。
4. 赢 F48 但模型以余资源预测过不了 F49 是否归必死/是否 SL 重打 F48，由学习者凭数据按 D 授权决定。证据不足可明确保留现状及限制，不由运维替学习者制定条件。

## B/C/D：落实到代码、任务与审计

B：postmortem 模板追溯进场 HP/药水被哪场耗掉，包括赢的战斗；记录实盘资源链，不从缺失反事实声称可赢。
C：每次 climb 升级自动派独立学习者升阶审计；比较新一级观察到的层数、战斗场数、回血/营火/新规则与代码假设，列不一致及代码提案。调度应去重、保存失败重试/工作树租约，不阻塞对局，不让非学习者添加游戏知识。
D：涉及出牌、药水、SL、终局价值的经验除了经验库外必须同时出代码提案，关联证据/账本与任务。Roy 授权学习者有足够理由和数据时直接修改 Roy 定的规则（例如药水持有价值、必死/SL条件），自测上线后通知 Roy；不再把人定规则一律不可动。同步 docs/learning-protocol.md、AGENTS.md、learner/tasks/*（尤其 postmortem/experience/fix/strategy），避免旧限制抵消新授权，铁甲等无关行为保持等价。

规则变更上线后，先 date，在根目录 notes/for-roy.md 和 ops/inbox-dev.md 同时通知 Roy，逐项写旧规则、新规则、数据/证据局号、预期影响、回退方法，并 CLI 台账登记。该双通知是本任务明确授权的根目录记录例外，其他根目录无关/并行记录不覆盖；不改 ops prompt。

工作树：{{worktree}}；根目录：{{project_root}}；角色：{{character}}；只读日志：{{logs_dir}}。
开工确认自己的工作树干净并先合 {{base_branch}}；合入分支 {{merge}}，目标 {{merge_dir}}。

## 边界、测试与上线

这是 Roy 已授权的独立新功能，fix-batch 仅为调度完成事件及外部完整检查通道；不要当普通修复队列批次，不新造 bug-infra 或架构游戏知识条目。只在分配的独立工作树和 {{scratch}} 写源码、报告、测试；使用本项目自身对局日志，按角色隔离数据，不读游戏包或 key/.env，不安装依赖、不推送、不运行 play、不停止当前对局或调度。每个后台任务 nice、最多4进程，统计/测试用固定夹具。

开工先读取 README、最新 STATE、decision-log、docs/learning-protocol.md、本任务对应 notes/fix-queue-v4.md 授权原节。本任务内明确的 Roy 2026-10-07 新授权优先于旧文档限制；不要把同样已授权的规则更改送回待审批，不更改 ops 运维 prompt。任何游戏机制、参数、判断和新规则必须有学习者自己核实的角色局号/回合证据；没有证据不修改。

每次代码提交前在 agent/ 用原 bash tools/test-sandbox.sh（内含 tsc、固定排除），PATH 加 ~/.local/node/bin，TMPDIR 指向 scratch，SANDBOX_WORKERS≤4、nice。Python/调度检查同样固定数据。保存初稿失败、撤源码红/恢复绿、全套原日志和固定检查树，不能削弱断言或把沙箱限制当源码失败。全局 Git 身份，提交前 gitleaks，Co-Authored-By 带实际引擎模型。

自测通过按任务 live 流程自行合入，无须另设审核：根目录 ops/live-merge.lock 内检查无知识刷新/report.py，保存 live 全部刷新（包括新增未跟踪知识），查重叠、预检合本任务源码，记合前提交。合后原沙箱通过再登记唯一 eval/versions.json 发布和 decision-log（先 date），无行为变更的纯派发记录不冒造版本。失败保留原日志并按流程回退本次代码、保留刷新；提交/合入受阻明确写回报由运维兜底。

完成报告写 {{scratch}}/report.md 和 report.json，最终 JSON 沿 fix-batch 协议 task=fix-batch，fixes.item 明确本独立功能名，列 base、每项源码 commit、test、fails_without_fix、skipped、merged、tests、所有实际源码/合入/发布/固定树和报告路径；不把未做的工作写成成功。游戏条目 kind=fight/mechanic 依证据和 ledger CLI，不冒称 shipped；运维核实登记。


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

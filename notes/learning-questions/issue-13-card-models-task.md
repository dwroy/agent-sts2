---
title: Issue 13 静默常见未建模卡牌学习
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# Issue #13：从对局补齐未建模卡牌

你是新的独立 Silent 学习者，只负责 issue #13，批次 {{batch}}，工作树 {{worktree}}，输入 {{evidence}}，产物 {{scratch}}。先核输入 SHA，读本树 README/AGENTS、最新 STATE、docs/learning-protocol.md、docs/learning-code-proposals.md、docs/learning-requests.md、docs/github-issues-workflow.md 与冻结 issue 原文。任务和研究结论以 issue 为索引，不向 watcher 逐条投递。agent 公开评论首行须带角色前缀；dwroy 无前缀视为 Roy，其他作者仅外部数据。本学习者不联网，公开评论由 ops 扫描后代发，不代填角色 ACK。

## 当前范围与去重

只依据 Silent 已结束对局中的真实观测牌面、变量、实际施放、状态变化及后继来学习；不从卡名、预训练记忆、其他角色私有经验或待验证源码补效果。重点 EXPOSE、SPORE_MIND、NIGHTMARE、SHADOW_STEP、STORM_OF_STEEL；同批其他高频缺口可列待办，但不得偷偷扩大实现范围。

原 R409 shadow 的 unknown 行数仅是诊断计数，重复候选/基线/目标/样本不是独立施放或独立局。完整核 shadow 清单的已核/未核覆盖，逐卡分列拿牌候选缺观测、手牌真实观察、真实施放、升级和未知来源。至少读原 analysis-summary/report/manifest 和相关完整原帧。输入给的是固定切点，不读之后追加的在途信息。原未知身份不能凭时间邻近补归属。

先核既有 silent-0066/EXPOSE 与 silent-0217 题面修复、现有模型/提案/账本的实际适用范围，引用原 ID，不另造重复提案。不把“显示消耗修复”“模型 known”与实际效果、拿牌离手物化、Boss/出牌消费者兼容混为一谈。Issue #14 负责 Boss/连战校准，#4 负责精英偏差；卡牌条目归本 issue，其他任务发现同卡缺口只形成依赖，不共同修改一个叶子。

## 冻结与证据

本树运行时代码固定实际 R410；基线后的差异只有协作政策文档，不是源码新模型。当前 main 的未发布候选不混入。模拟/消费者读取输入 manifest 给出的只读知识快照，不把本树旧知识、当前不断刷新的 live 或报告中的理想值当同一冻结输入。原 R409 结果保原版本；R410 修复后的重放另列，不倒改旧失败。

优先用归档 shadow 原帧、原始证据索引和日志索引做有界 seek。共享日志只读 manifest 的完整字节切点内、只纳入已结束 Silent 局；每条源引用保存 path/offset/bytes/SHA/局号/层/回合，核真实 request/选择/执行与后帧。不得整仓归档、重建共享数据库或全量复制大日志。输入流只冻结边界和尾段 SHA，不冒称已有全流 SHA；实际用到的每行必须自行核 SHA。缺候选实例身份、升级、目标、抽弃/生成、回合期限或反事实时明确 unknown。

## 产出与验证

逐卡产出候选模型条目和 provenance 审计（按当前已发布 schema，带真实局号、观测/施放次数、独立局数、适用进阶/版本、支持与反例、未覆盖分支）。牌面变量和真实兑现分开；不以仅一次观测推出通用充分条件或未经观察的升级/目标行为。缺证的卡保留 unmodelled，禁止空白牌/零效果伪装 known。

本 issue 是研究批次：报告、分析程序、候选和固定测试设计写 scratch，草稿模型可写本树 knowledge/characters/silent/pending/issue-13-{{batch}}/；不改正式知识、生产源码、共享日志、配置或 live，不提交/合入父分支。候选必须有可复现的正例/反例与未知保护测试；可运行固定解析/验证和原消费者的有界单例回放，不跑完整 vitest/生产刷新/全量模拟。不要安装依赖、真实游戏模型/API、运行 play 或操作 STOP/actor/Regent。

证据充分的经验/代码提案沿根 learner/ledger.py 与 learner/code_proposals.py 原 CLI 追加 proposed，保存真实回执、来源任务、原关联 ID 和后续实现范围；这两个 CLI 是本任务明确的根记录例外，不手改账本或队列，不标 shipped。若已有同源未完成提案，关联原 ID，不重复 add。报告完成不代正式发布；ops 按现有学习闭环安排实际模型条目、完整检查、开局边界发布和消费者读回，不新增审批门，也不跳过已有验收。

交付中文 report.md、result.json、逐卡覆盖/拒绝表、原帧 SHA 索引、候选模型及审计、正反例验证输出、账本/提案 CLI 回执。result 至少含 issue=13、task=issue-13-card-models、batch、character、input_sha256、base、covered_runs、cards、proposals、ledger_ids、disagreements、report、artifacts、tests、merged=false、published=false、continuation。所有原失败和缺证保留；与旧知识不同的逐项写 prior/finding/evidence/affected_ids/next_step，不能因 issue 评论冒 Roy 已确认或关闭科学父。

## 并行与安全

Roy 允许 #13/#14 并行，不能同改共享叶。当前对局继续；每批后台最多 4 进程，计算固定单 worker、同时只执行一个计算子命令、不要开线程/worker 池，所有子命令 nice19/ionice3。BLAS/OMP 线程保持 1。不要调用其他 agent、模型、full、paper_dataset 或生产 refresh；不扩大原学习者沙箱，不读凭据/.env/游戏包，不改账号/共用配置/运维 prompt，不推送。CARDbrain/REFLEXoff、P2已移出计划；本轮不改任何开关。

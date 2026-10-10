# 仓库布局

2026-10-04 定的布局（Roy 批准），2026-10-10 按 main 核对。旧路径到新路径的逐个文件对照见 [path-map.tsv](path-map.tsv)；当前模块职责见 [v4-architecture.md](v4-architecture.md) §1。

路径的写法：项目根目录下的文档（docs/、learner/）里写的是从项目根算起的路径；agent/ 里的代码注释和 README 写的是从 agent/ 算起的路径（src/…、tests/…、tools/…），但数据、知识、日志仍写项目根下的路径（knowledge/…、data/…、logs/…）。代码里的路径一律从模块自己的位置推出项目根（agent/src/core/paths.ts 的 PROJECT_ROOT；Python 用 `Path(__file__).resolve().parents[n]`），不看当前目录；环境变量或配置里给的相对路径（例如 .env 里的 `DECISION_LOG=logs/decisions.jsonl`）也从项目根解析。

## 顶层目录

**third_party/jev-sts2/**　上游 [DiscreteTom/jev-sts2](https://github.com/DiscreteTom/jev-sts2) 的原样副本，git submodule，钉在 002e873（上游最后一次提交，2026-09-19），永远不改。我们的代码不从这里导入，它只作参照：哪些文件从上游哪个文件来、改了多少，见 [third-party.md](third-party.md)。

**agent/**　我们的 TypeScript 包：package.json、package-lock.json、tsconfig*.json、vitest.config.ts、.env.example、README.md、PLAN.md（上游早期设计文档，原样保留，代码注释里的「PLAN.md §x」指它）。CLI 入口是 agent/src/index.ts，npm 脚本从 agent/ 运行；开发会话只做检查、shadow、回放，对局由运维在 `.worktrees/live` 启动。.env 放在 agent/.env（不进 git），依赖在 agent/node_modules。

**knowledge/**　知识数据（不是代码）。common/ 放和角色无关、从观察所得的事实：monster-db.json、move-model.json、event-pages.json、card-upgrades.json。characters/<角色>/ 放该角色的 experience.json、jev-hints.json、outcome-stats.json、room-costs.json、boss-damage.json、potion-equivalents.json、fight-value*.json、boss-trust.json、sl-elites.json 等。怪物战绩已拆到各角色的 monster-records.json，加载时合并共用怪物事实；旧攻略仅在拥有该文件的角色目录读取。agent/src/knowledge/files.ts 根据启动设置/CHARACTER 选角色，缺省才用 DEFAULT_CHARACTER="ironclad"；缺文件不读取别的角色。builders/ 放重建脚本和战后刷新入口 refresh.sh，共用事实先刷新，统计按角色刷新。

**learner/**　离线学习者：run.ts 是入口，lib/ 是启动器代码，tasks/ 是任务说明。按角色复盘、更新 knowledge/characters/<角色>/、实现提案；ledger.py / code_proposals.py 是账本和提案登记 CLI。原始运行记录在 learner/runs/，关键产物另归档进 paper；正常派发由 ops 调度器负责。

**ops/**　对局循环、战后刷新与报告、事件调度及宿主动作。脚本通常从主检出加载，对局源码从 live 加载。ops/codex-ops/ 是不进 git 的队列、learn.json、租约、broker 与会话状态目录；运维 prompt 的更改须先给 Roy 看。

**eval/**　评估：versions.json（代码版本表）、metrics.py、calibration.py 和它们调用的 TS 小程序（原 tools/eval）。

**docs/**　当前说明、历史设计和专题验证记录；入口 README.md，原始 v4 架构保存在 history/，path-map.tsv 保留目录迁移对照。

**paper/**　状态快照、decision-log、讨论、学习账本、冻结证据与论文表。STATE 文件是当时现场快照，旧实验和失败原件保留，补验另存。

**experiments/**　一次性实验的脚本、样本和结论，按实验分目录，保持当时的样子。

**notes/**　报告和复盘。代码仓库里的几份回放报告和外层仓库的 notes/ 合在一起；运行时读的复盘文件是 `<工作区>/notes/lessons.md`（工作区 = 环境变量 STS2_WORKSPACE，默认项目根；在 .worktrees/ 下的工作树里跑时要把它设成主检出）。

**logs/**　原始日志（decisions.jsonl、states.jsonl、brain.jsonl、runs.jsonl……），不进 git，只追加。原来在 jev-sts2/logs。

**data/**　能重建的数据，不进 git：game-data.json（mod 的游戏数据缓存）、logdb/（日志库的 Parquet 分片）、logdb-venv/（日志库用的 Python 环境，带 duckdb）、fight-value-rows.jsonl。原来在 jev-sts2/.cache。

## agent/src 的模块

**core/**　把各部分接起来的地方：config.ts（环境变量和命令行参数）、paths.ts（项目根、logs/、data/、knowledge/、工作区）、index.ts（命令的接线：doctor、shadow、play、record、replay、explain；src/index.ts 只是转进来的入口）、cli/（doctor、运行时装配、控制台输出）、util/（JSON、终端格式、单实例锁、数据版本）。

**hand/**（手）　和游戏打交道、把决定落到游戏里：mod/（mod 的 HTTP 客户端、状态的校验、端口发现）、act/（执行闸：动作合法性、派发、动作身份、回合开始的等待）、screens/（除战斗以外每个界面的出题和代码决定：地图、奖励、商店、休息、事件、选牌……，以及代码的卡牌参考分 card-value.ts）、loop.ts（决策循环：预算、熔断、记录）。

**eye/**（眼）　看和记：决策日志、Jev 提示日志、每局的配置记录（run-config），replay/ 是录制原始状态和离线重放。

**reflex/**（小脑）　战斗：combat-plan.ts（每回合给 Jev 的出题和代码的出牌线）、combat.ts、回合求解器、推演（rollout、rollout-live）、卡牌模型、伤害、药水的代价和蒙特卡洛、被动件、起手损失、偷金贼的事实、Jev 的经验块；jev/ 是 Jev（TypeSafe System One）的客户端、题型、答案解析和计价。

**brain/**（大脑）　构筑、路线、事件这些大题：brain.ts / router.ts（生产强制 Codex、校验、原题等待恢复；历史可配置路由仍保留）、engines/（Codex exec/session、额度和缓存记录，以及旧引擎适配）、knowledge.ts（全量知识前缀）、specs.ts（答案格式）、llm/（历史命名的客户端和消息）、tools/（离线知识/日志查询及 stdio MCP）、build-facts.ts（构筑事实）、wait.ts（等待状态）。

**sim/**（模拟器）　B2 的 boss 整场模拟和它的 worker 池、B3 的构筑模拟、boss 时钟（boss-clock.ts）、路线图和路线投影、boss 信任度、SL 重试的计算缓存；worker 文件和调用它的模块放在一起。

**memory/**（工作记忆）　一局之内记住的东西：run-journal.ts（本局日志）、run-brief.ts、run-plan.ts 和 run-plan-merge.ts（整局计划）、fight-plan.ts、牌组和牌组画像、types.ts（界面记忆和决定的类型）、journal-replay.ts。

**sl/**　存档读档（SL）重打：控制器、哪些战斗重打、重打时的探索、终局判断、重新载入。

**knowledge/**（知识库）　只有代码：读知识数据（files.ts 决定每个文件在 common/ 还是 characters/<角色>/）、按进阶过滤、渲染成前缀和工具输出（render/）；数据本身在项目根的 knowledge/。

## agent 下的其他目录

**agent/tests/**　vitest 测试，固定数据跟着测试放在 tests/*-data；Python 的测试（*_test.py）也在这里，由 vitest 调起。

**agent/tools/**　回放和分析工具（*-replay.ts、*-summary.py、回测、校准）、logdb/（日志库：sync.py、query.py、views.sql）、boss-sim/、fake-mod.mjs、check-imports.ts（每个相对导入都能找到文件）、restructure-check/（这次搬家前后的对照脚本：决策摘要、大脑提示、构建器输出）。

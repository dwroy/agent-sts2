# 仓库布局

2026-10-04 定的布局（Roy 批准）。旧路径到新路径的逐个文件对照见 [path-map.tsv](path-map.tsv)；模块划分的依据是 [v4-architecture.md](v4-architecture.md) §1（手、眼、小脑、大脑、模拟器、工作记忆、知识库）。

路径的写法：项目根目录下的文档（docs/、learner/）里写的是从项目根算起的路径；agent/ 里的代码注释和 README 写的是从 agent/ 算起的路径（src/…、tests/…、tools/…），但数据、知识、日志仍写项目根下的路径（knowledge/…、data/…、logs/…）。代码里的路径一律从模块自己的位置推出项目根（agent/src/core/paths.ts 的 PROJECT_ROOT；Python 用 `Path(__file__).resolve().parents[n]`），不看当前目录；环境变量或配置里给的相对路径（例如 .env 里的 `DECISION_LOG=logs/decisions.jsonl`）也从项目根解析。

## 顶层目录

**third_party/jev-sts2/**　上游 [DiscreteTom/jev-sts2](https://github.com/DiscreteTom/jev-sts2) 的原样副本，git submodule，钉在 002e873（上游最后一次提交，2026-09-19），永远不改。我们的代码不从这里导入，它只作参照：哪些文件从上游哪个文件来、改了多少，见 [third-party.md](third-party.md)。

**agent/**　我们的 TypeScript 包：package.json、package-lock.json、tsconfig*.json、vitest.config.ts、.env.example、README.md、PLAN.md（上游的设计文档，原样保留，代码注释里的「PLAN.md §x」指它）。运行从这里开始：`cd agent && npx tsx src/index.ts play`，npm 脚本也在这里。.env 放在 agent/.env（不进 git）。依赖装在 agent/node_modules。

**knowledge/**　知识数据（不是代码）。common/ 放和角色无关的游戏事实：monster-db.json（怪物数据；里面的遭遇战绩是我方记录，以后要拆出去）、move-model.json、event-pages.json、card-upgrades.json。characters/ironclad/ 放铁甲战士自己的打法结果和建议：experience.json、ironclad-guide.md、ds-handbook.md、jev-hints.json、outcome-stats.json、room-costs.json、boss-damage.json、potion-equivalents.json、fight-value.json、fight-value-gates.json、boss-trust.json、sl-elites.json。读哪个角色由 agent/src/knowledge/files.ts 的 `DEFAULT_CHARACTER`（现在是 "ironclad"）一处决定，哪个文件在 common/ 也只在那里列。builders/ 放从日志重建这些数据的脚本：build-*.py、refresh-potion-equivalents.sh、monster-db-check.py，以及每局结束后的刷新入口 refresh.sh（运维原来在 ops/report.py 里拼的那串命令）。

**learner/**　离线学习者：run.ts 是入口（`agent/node_modules/.bin/tsx learner/run.ts …`），lib/ 是启动器的代码（原 src/learner），tasks/ 是任务说明。它读 knowledge/ 和 logs/，改 knowledge/characters/ironclad/experience.json。

**eval/**　评估：versions.json（代码版本表）、metrics.py、calibration.py 和它们调用的 TS 小程序（原 tools/eval）。

**docs/**　设计和说明文档，包括本文件、path-map.tsv、third-party.md。

**experiments/**　一次性实验的脚本、样本和结论，按实验分目录，保持当时的样子。

**notes/**　报告和复盘。代码仓库里的几份回放报告和外层仓库的 notes/ 合在一起；运行时读的复盘文件是 `<工作区>/notes/lessons.md`（工作区 = 环境变量 STS2_WORKSPACE，默认项目根；在 .worktrees/ 下的工作树里跑时要把它设成主检出）。

**logs/**　原始日志（decisions.jsonl、states.jsonl、brain.jsonl、runs.jsonl……），不进 git，只追加。原来在 jev-sts2/logs。

**data/**　能重建的数据，不进 git：game-data.json（mod 的游戏数据缓存）、logdb/（日志库的 Parquet 分片）、logdb-venv/（日志库用的 Python 环境，带 duckdb）、fight-value-rows.jsonl。原来在 jev-sts2/.cache。

## agent/src 的模块

**core/**　把各部分接起来的地方：config.ts（环境变量和命令行参数）、paths.ts（项目根、logs/、data/、knowledge/、工作区）、index.ts（命令的接线：doctor、shadow、play、record、replay、explain；src/index.ts 只是转进来的入口）、cli/（doctor、运行时装配、控制台输出）、util/（JSON、终端格式、单实例锁、数据版本）。

**hand/**（手）　和游戏打交道、把决定落到游戏里：mod/（mod 的 HTTP 客户端、状态的校验、端口发现）、act/（执行闸：动作合法性、派发、动作身份、回合开始的等待）、screens/（除战斗以外每个界面的出题和代码决定：地图、奖励、商店、休息、事件、选牌……，以及代码的卡牌参考分 card-value.ts）、loop.ts（决策循环：预算、熔断、记录）。

**eye/**（眼）　看和记：决策日志、Jev 提示日志、每局的配置记录（run-config），replay/ 是录制原始状态和离线重放。

**reflex/**（小脑）　战斗：combat-plan.ts（每回合给 Jev 的出题和代码的出牌线）、combat.ts、回合求解器、推演（rollout、rollout-live）、卡牌模型、伤害、药水的代价和蒙特卡洛、被动件、起手损失、偷金贼的事实、Jev 的经验块；jev/ 是 Jev（TypeSafe System One）的客户端、题型、答案解析和计价。

**brain/**（大脑）　构筑、路线、事件这些大题：router.ts（选引擎、兜底、重问）、engines/（DeepSeek、Claude、Codex）、knowledge.ts（全量知识前缀的系统提示）、specs.ts（答案格式）、message.ts、llm/（DeepSeek 客户端和消息）、tools/（kb_* 知识工具、logs_query、给 CLI 引擎用的 MCP 服务器）、build-facts.ts（构筑题的事实）。

**sim/**（模拟器）　B2 的 boss 整场模拟和它的 worker 池、B3 的构筑模拟、boss 时钟（boss-clock.ts）、路线图和路线投影、boss 信任度、SL 重试的计算缓存；worker 文件和调用它的模块放在一起。

**memory/**（工作记忆）　一局之内记住的东西：run-journal.ts（本局日志）、run-brief.ts、run-plan.ts 和 run-plan-merge.ts（整局计划）、fight-plan.ts、牌组和牌组画像、types.ts（界面记忆和决定的类型）、journal-replay.ts。

**sl/**　存档读档（SL）重打：控制器、哪些战斗重打、重打时的探索、终局判断、重新载入。

**knowledge/**（知识库）　只有代码：读知识数据（files.ts 决定每个文件在 common/ 还是 characters/<角色>/）、按进阶过滤、渲染成前缀和工具输出（render/）；数据本身在项目根的 knowledge/。

## agent 下的其他目录

**agent/tests/**　vitest 测试，固定数据跟着测试放在 tests/*-data；Python 的测试（*_test.py）也在这里，由 vitest 调起。

**agent/tools/**　回放和分析工具（*-replay.ts、*-summary.py、回测、校准）、logdb/（日志库：sync.py、query.py、views.sql）、boss-sim/、fake-mod.mjs、check-imports.ts（每个相对导入都能找到文件）、restructure-check/（这次搬家前后的对照脚本：决策摘要、大脑提示、构建器输出）。

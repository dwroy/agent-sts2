---
title: 机制审计（只出提案）
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Write
timeout_min: 45
max_turns: 200
model.claude: opus
default.report: {{worktree}}/notes/mechanics-residuals.md
default.summary: {{worktree}}/experiments/mechanics/summary.json
default.monster_db: {{worktree}}/knowledge/common/monster-db.json
default.out: {{worktree}}/notes/mechanics-proposals.md
default.min_n: 20
---
# 任务：机制审计（只出提案，不改代码）

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：从求解器的残差里找出**游戏文字没写、求解器没建模**的机制，写成一份提案由独立策略学习者依据证据实现。全程用中文。自己做，不许再派下级 agent。**只写提案文件 {{out}}，不许改任何代码、数据、测试，不许提交。**

背景（docs/mechanics-learning.md，先读它）：Roy 2026-10-02 定，机制要从日志里学出来、写进游戏库、让当前角色大脑看到、由模拟器用**数据驱动的通用规则**，而不是一个敌人一个敌人地手写。第一个例子：偷窃草蜢的振翅（FLUTTER_POWER）描述只有「从攻击牌中受到的伤害减少50%」，日志里却是最后一层被打掉就眩晕、本回合行动取消（MCK9SMSK40ZY F19 T4：抢夺 14，实际 0）。它现在走「层数打到 0 就眩晕」这一类通用规则（MECH_RULES）。

## 输入
- 残差报告：{{report}}（agent/tools/mechanics-residuals.ts 生成；每个记录的战斗回合，求解器对实际打出的线预测的本回合掉血 vs 实际，按场上的敌人能力、本回合被去掉的能力、敌人分组；负数 = 求解器高估掉血）。分组的明细在 {{summary}}。
- 怪物数据库：{{monster_db}}。每个怪物的 `powers`（能力名和游戏描述）、`moves`（出招表），以及 `observed`（日志统计的机制：powers_stripped、escape_moves、kill_rewards、mid_turn_stuns）；顶层 `observed.powers_stripped` 是每个能力在所有怪物上的合计。口径见 `meta.note` 和 `observed.note`。
- 日志库（只读，DuckDB）：`{{worktree}}/data/logdb-venv/bin/python {{worktree}}/agent/tools/logdb/query.py --no-sync "SELECT ..."`；`--schema` 看表；`--raw states <off>` 按字节偏移取一行原始状态（state_index.off）。用法见 {{worktree}}/docs/logdb.md。原始日志在 {{logs_dir}}（很大，不许整份读，只用日志库或按偏移读）。
- 求解器和规则：{{worktree}}/agent/src/reflex/turn-solver.ts（`incomingHits`、`STRIP_COUNTERS`、EnemySim 字段的注释里有每个已建模机制和证据）、{{worktree}}/agent/src/knowledge/mechanics.ts（规则门槛）、{{worktree}}/agent/src/reflex/combat-plan.ts（`MODELLED_ENEMY_POWERS`、`POWER_NOTES`、`enemySims`）。

## 做法
1. 先跑 `date`。读 docs/mechanics-learning.md 和残差报告。
2. 挑候选：报告里 n ≥ {{min_n}} 且 |偏差| ≥ 1 的组（能力、被去掉的能力、敌人），和「单个回合残差最大」的回合。已经由规则或手写代码处理、偏差接近 0 的跳过。**最多 8 个候选**（Roy 2026-10-02：上限 45 分钟、只看偏差最大的前 8 组）：按 |偏差| × n 排序取前 8，其余在提案末尾列一行「未看」。时间不够时先把已看完的候选写进提案，不要留空。
3. 每个候选：
   - 按报告里的例子回合去日志库查：那一回合前后的帧（敌人的 move_id、intents、powers、血量和格挡，我们的血量和格挡）、出的牌、下回合第一帧。弄清实际发生了什么：招式中途变了？伤害和意图不一样？回了血？死亡机制？日志本身的问题（帧缺失、SL 重来、观察帧）？
   - 提出一个机制假设，**用更多回合检验**：数出符合 n 和例外，例外要解释或列出。只看一两个回合的不算结论。
   - 对照游戏描述：描述已经说了的、求解器也建模了的，是代码 bug（写「需要修 bug」和位置），不是新机制。
4. 每个机制归到一类：
   - **A 数据规则·已有类**：「层数打到 0 就眩晕」。能力满足门槛（mechanics.ts）而且求解器有它的计数器（`STRIP_COUNTERS`）就自动生效，不用改代码；没有计数器就写「需要代码：给 X 加计数器」，说明它每次怎么减少（证据）。
   - **B 数据规则·换招类**（docs/mechanics-learning.md §8，MECH_MOVE_RULES）：「能力被去掉或少一层 → 招式立刻换成另一招」，按怪物统计（`observed` 的 move_changed / changed_to / changed_next，`powers_lowered`）。（怪物, 能力）满足门槛（mechanics.ts `moveChangeOf`）而且求解器看得见它被去掉（turn-solver.ts `MOVE_RULE_POWERS`）就自动生效；看不见就写「需要代码：让求解器看得见 X 被去掉」，说明它怎么被去掉（证据）。
   - **B′ 数据规则·新类**：上面两类都不是、但可以写成和怪物无关的通用规则、从 `observed` 读数据的，写出规则的形状、需要在 build-monster-db.py 里统计什么、门槛建议。
   - **C 需要代码**：只能手写的（伤害公式、目标选择、回血、阶段、召唤……），写出改哪里、怎么验证。
   - **D 不是机制**：噪声、日志问题、已建模。
5. 每个候选估一下改了之后残差会怎么变（受影响回合数、偏差从多少到多少），以及风险（会不会让求解器在别的回合说错）。

## 提案文件 {{out}}（用 Write 写，整份覆盖）
开头：日期、输入文件（报告的生成时间和怪物数据库的场数）、一句话结论。然后每个候选一节：
- 标题：怪物 / 能力 / 一句话机制
- 证据：回合列表（run id + 层 + 回合，至少 3 个）、符合 n / 例外 n、日志库的查询语句（能复现）
- 假设和检验
- 类别（A/B/C/D）和具体要做的事
- 预计效果和风险
- 未授权架构问题或缺数据限制（已授权规则提案不转回审批）
最后一节「已在用的观察规则核对」：报告里振翅的偏差（规则关 → 开）、规则自己的核对（说眩晕而没眩晕、漏掉的），有问题就写出来。

## 学习账本（写完提案之后）
账本是 `{{project_root}}/paper/materials/learning/ledger.jsonl`，字段见 `{{project_root}}/paper/materials/learning/README.md`。**只用** `python3 {{project_root}}/learner/ledger.py` 写（JSON 从标准输入传入），不许直接改这个文件。
- A、B、B′、C 类的每个候选登记一个条目（D 类不登记）：先 `python3 {{project_root}}/learner/ledger.py find --character {{character}} --text <能力名或怪物 ID>` 看有没有；有就 `update`（`status` 改成 `proposed`，`where` 追加 `{"proposal": ["{{out}}"]}`，`evidence` 追加例子回合）；没有就 `add`：`kind` 是 `mechanic`（「需要修 bug」的是 `bug-infra`），`status` 是 `proposed`，`by` 是 `learner:mechanics-audit`，`claim` 是你的机制假设，`evidence` 是例子回合（局号、层、回合），`first_run` 是最早的例子局，`prior` 照 README 判断（求解器或 agent 在这之前是不是已经按这个机制处理对了），`where` 是 `{"proposal": ["{{out}}"]}`。
- 写完 `python3 {{project_root}}/learner/ledger.py check` 退出码要是 0；提案里每个候选的标题后面写上账本 id。

## 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv`。
- 只写 {{out}}、{{scratch}} 和学习账本（只经 learner/ledger.py 追加）；不许改代码、数据、测试和其他笔记；不许 git commit / push；不运行 play，不碰正在跑的对局进程；不读 sts2.dll 或 .pck。
- 查询只用 `--no-sync`（不写日志库）；大文件只按偏移读。

## 回报
用中文简短回报：看了哪些候选、各归哪一类、最值得做的三件事。最后附一个 json 代码块：
```json
{"out": "{{out}}", "candidates": [{"mechanic": "…", "monster": "…", "power": "…", "class": "A|B|C|D", "n": 0, "bias": 0.0, "action": "…", "ledger": "<id 或 null>"}]}
```


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

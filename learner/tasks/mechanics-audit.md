---
title: 机制审计（只出提案）
tools: Read, Grep, Glob, Bash, Write
timeout_min: 120
max_turns: 400
model: opus
default.report: {{worktree}}/notes/mechanics-residuals.md
default.summary: {{worktree}}/experiments/mechanics/summary.json
default.monster_db: {{worktree}}/src/knowledge/monster-db.json
default.out: {{worktree}}/notes/mechanics-proposals.md
default.min_n: 20
---
# 任务：机制审计（只出提案，不改代码）

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：从求解器的残差里找出**游戏文字没写、求解器没建模**的机制，写成一份提案给 Dai 审。全程用中文。自己做，不许再派下级 agent。**只写提案文件 {{out}}，不许改任何代码、数据、测试，不许提交。**

背景（docs/mechanics-learning.md，先读它）：Dai 2026-10-02 定，机制要从日志里学出来、写进游戏库、让 DeepSeek 和 Jev 看到、由模拟器用**数据驱动的通用规则**，而不是一个敌人一个敌人地手写。第一个例子：偷窃草蜢的振翅（FLUTTER_POWER）描述只有「从攻击牌中受到的伤害减少50%」，日志里却是最后一层被打掉就眩晕、本回合行动取消（MCK9SMSK40ZY F19 T4：抢夺 14，实际 0）。它现在走「层数打到 0 就眩晕」这一类通用规则（MECH_RULES）。

## 输入
- 残差报告：{{report}}（tools/mechanics-residuals.ts 生成；每个记录的战斗回合，求解器对实际打出的线预测的本回合掉血 vs 实际，按场上的敌人能力、本回合被去掉的能力、敌人分组；负数 = 求解器高估掉血）。分组的明细在 {{summary}}。
- 怪物数据库：{{monster_db}}。每个怪物的 `powers`（能力名和游戏描述）、`moves`（出招表），以及 `observed`（日志统计的机制：powers_stripped、escape_moves、kill_rewards、mid_turn_stuns）；顶层 `observed.powers_stripped` 是每个能力在所有怪物上的合计。口径见 `meta.note` 和 `observed.note`。
- 日志库（只读，DuckDB）：`{{worktree}}/.cache/logdb-venv/bin/python {{worktree}}/tools/logdb/query.py --no-sync "SELECT ..."`；`--schema` 看表；`--raw states <off>` 按字节偏移取一行原始状态（state_index.off）。用法见 {{worktree}}/docs/logdb.md。原始日志在 {{logs_dir}}（很大，不许整份读，只用日志库或按偏移读）。
- 求解器和规则：{{worktree}}/src/strategy/turn-solver.ts（`incomingHits`、`STRIP_COUNTERS`、EnemySim 字段的注释里有每个已建模机制和证据）、{{worktree}}/src/knowledge/mechanics.ts（规则门槛）、{{worktree}}/src/screens/combat-plan.ts（`MODELLED_ENEMY_POWERS`、`POWER_NOTES`、`enemySims`）。

## 做法
1. 先跑 `date`。读 docs/mechanics-learning.md 和残差报告。
2. 挑候选：报告里 n ≥ {{min_n}} 且 |偏差| ≥ 1 的组（能力、被去掉的能力、敌人），和「单个回合残差最大」的回合。已经由规则或手写代码处理、偏差接近 0 的跳过。
3. 每个候选：
   - 按报告里的例子回合去日志库查：那一回合前后的帧（敌人的 move_id、intents、powers、血量和格挡，我们的血量和格挡）、出的牌、下回合第一帧。弄清实际发生了什么：招式中途变了？伤害和意图不一样？回了血？死亡机制？日志本身的问题（帧缺失、SL 重来、观察帧）？
   - 提出一个机制假设，**用更多回合检验**：数出符合 n 和例外，例外要解释或列出。只看一两个回合的不算结论。
   - 对照游戏描述：描述已经说了的、求解器也建模了的，是代码 bug（写「需要修 bug」和位置），不是新机制。
4. 每个机制归到一类：
   - **A 数据规则·已有类**：「层数打到 0 就眩晕」。能力满足门槛（mechanics.ts）而且求解器有它的计数器（`STRIP_COUNTERS`）就自动生效，不用改代码；没有计数器就写「需要代码：给 X 加计数器」，说明它每次怎么减少（证据）。
   - **B 数据规则·新类**：可以写成和怪物无关的通用规则、从 `observed` 读数据的（例如「某能力被去掉时招式换成另一招」——巨斧机器人 STOCK→BOOT_UP 23/23），写出规则的形状、需要在 build-monster-db.py 里统计什么、门槛建议。
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
- 要 Dai 定的问题
最后一节「已在用的观察规则核对」：报告里振翅的偏差（规则关 → 开）、规则自己的核对（说眩晕而没眩晕、漏掉的），有问题就写出来。

## 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv`。
- 只写 {{out}} 和 {{scratch}}；不许改代码、数据、测试和其他笔记；不许 git commit / push；不运行 play，不碰正在跑的对局进程；不读 sts2.dll 或 .pck。
- 查询只用 `--no-sync`（不写日志库）；大文件只按偏移读。

## 回报
用中文简短回报：看了哪些候选、各归哪一类、最值得做的三件事。最后附一个 json 代码块：
```json
{"out": "{{out}}", "candidates": [{"mechanic": "…", "monster": "…", "power": "…", "class": "A|B|C|D", "n": 0, "bias": 0.0, "action": "…"}]}
```

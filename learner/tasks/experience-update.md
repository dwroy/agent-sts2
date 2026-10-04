---
title: 经验库更新
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 600
default.base_branch: v4
default.merge: no
default.merge_dir: {{project_root}}/jev-sts2-v3
---
# 任务：更新经验库（{{runs}}）

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：把新写好的复盘并进经验库 `knowledge/characters/ironclad/experience.json`，同时在变更记录里追加一节。全程用中文。自己做，不许再派下级 agent。

- 新复盘的局（run id，逗号分隔）：{{runs}}
- 改代码的工作树：{{worktree}}（在这里改 experience.json、跑测试、提交）
- 合并基线：{{base_branch}}
- 是否合入对局分支：{{merge}}（`no` = 只在本分支提交；`v3` = 按第 8 节合入 {{merge_dir}}）
- 复盘：{{project_root}}/notes/lessons.md（只读）
- 变更记录：{{project_root}}/paper/materials/experience-changelog.md（只追加一节）
- 日志（只读）：{{logs_dir}}
- 临时文件只放在：{{scratch}}

## 1. 开工
1. 往任何文件里写时间之前，先跑 `date` 取当前时间。
2. 在 {{worktree}} 里 `git status` 确认工作区干净，然后 `git merge --no-edit {{base_branch}}`。有冲突就停下，在回报里写明，不要硬解。
3. **先读方法**：变更记录 experience-changelog.md 的「2026-09-28 首次构建」一节（来源和方法、字段怎么算、以后怎么更新），和**最后两节**（最近两次增量）。本次的做法、口径、格式照最后两节；只有第 4 节的机制推理是新加的。
4. 读 lessons.md 里这几局的小节（按 `## <run id>` grep 定位，再按行号读；文件有 2 MB 以上，不许整份读）。小节后面如果有「勘误」，按勘误用。

## 2. 方法（照变更记录）
- **来源**：这几局的复盘，加上日志里重新抽出来的数字。日志文件很大，只能按 run id grep 或按字节偏移 seek 流式读；`deepseek-reasoning.jsonl`、`states.jsonl` 没有 run id，按时间窗定位。可以沿用变更记录里写过的抽取脚本和工具（`agent/tools/boss-fights-extract.py`、`agent/tools/boss-clock-calibrate.ts --rows`、`agent/tools/knowledge-slice.ts` 等），在 {{worktree}} 里跑。
- **口径**沿用上一节（「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房，问号另算；汇总截至哪个时间、哪些局只进数字，都写明）。用同样的口径把上一节的数字重算一遍，对上了再加新局；对不上的，先找原因并写进本节。
- **合并原则**：同一件事只留一条；单局事实并入汇总条目作证据；丢掉纯代码 bug 和战斗里的出牌细节（带真实游戏数据的 bug 记录，把数据留下）。
- **字段**：
  - evidence 用 12 位 run id，n_support = 证据局数；结论相反的局进 contradicting / n_contradict；反例多过支持时退役；
  - confidence：high = n ≥ 5 且反例 ≤ n/3，或 n ≥ 4、原文就是规则、没有反例；med = n ≥ 2；low = 其余；
  - asc：机制类（招式、数值公式、触发时机）写 [0,20]，数字用按进阶填的占位符；策略和统计类按证据的进阶段写（A8+ 的证据写 [8,20]，只在 A9 验证过的写 [9,20]）；低进阶学来、在 A8+ 被反驳或没有数据的策略条目，写进阶上限（如 [0,7]）或退役（Dai 2026-10-04）；last_seen 取证据局和反例局里最新的日期（notes 里 `run-MMDD-…` 文件名）；
  - card / relic / potion / event 类 scope 带中文 name；
  - 代码修好了的机制，把对应条目退役，写明 retired_reason；
  - version 改成下一个版本号（今天的日期 + 序号，照文件里现有的写法）。
- **字数预算**（Dai 2026-10-04，取代原来的 200 条上限）：agent/tests/experience.test.ts 限制所有 active 条目的 lesson 总长 ≤ 60000 字符。V4 大脑的知识前缀带着本进阶适用的全部条目，每道题都要付这些字数。条数不限，但：
  - 同一件事只留一条；重复的、互相矛盾的、被代码修掉的，合并或退役；
  - 总长超过 55000 字符时，开工先压缩：把 n_support = 1、confidence low 的条目并进同一 scope 的相近条目（证据、反例一起带过去），再把冗长的条目压短（留数字和局号，删重复的叙述）。在回报里列出合并、退役、压缩了哪些条目；
  - 确实放不下就在回报里写「需要 Dai 定」，**不许改测试的预算**；
  - 回报里写 active 条数、总字符数，以及在 A8、A9 各适用多少条、多少字符。
- **只用已有的 scope 类型**（boss、elite、hallway、act、general:<话题>、card、relic、potion、event）。v3 的切片（agent/src/knowledge/experience.ts 的 relevance）不认识的类型会被整条丢掉。
- **药水**（照上一节）：
  - `potion:*` 和 `general:potion` 条目只改句内数字，不加证据局（n 不变）；
  - 其他条目里原有的喝药/留药分句一字不改，新加的证据只写非药水的部分；
  - **不许新增或加强任何「什么时候喝 / 别喝」的说法，不许写喝药规则**。
- **知识库一视同仁**：攻略（knowledge/characters/ironclad/ironclad-guide.md）、DeepSeek 手册（ds-handbook.md）、Jev 提示（jev-hints.json）、代码的卡牌参考分（card-value.ts 的 TIER 表和角色分类）、boss 笔记（run-journal.ts 的 BOSS_NOTES）都算知识库。每次更新都要核对：和复盘数据冲突的，改成数据版本（写明局数）；数据说明无效的删掉；还没有数据覆盖的先保留。改了什么、没改什么都记进本节（照上一节「和手写知识、代码冲突」的写法）。

## 3. 每条结论都要对数据
- 每个主题在变更记录里写一行「主题 | 数据 | 结论」（照上一节「对照数据检查的主题」的表）。数字要能从日志或 monster-db.json 复算出来。
- 经验库自己带偏、或写了没被执行的地方（DeepSeek 的推理引了条目，但结果相反或没照做），单独列一小节，引原话。

## 4. 机制推理（新增要求）
这次开始，经验更新要做**机制总结**：力量、敏捷、各种能力牌和增益（包括遗物和敌人的增益/减益）怎么起作用、和什么搭配、在哪些战斗里决定了胜负。
- 从这几局的复盘（「机制：」那一句和 3 条经验）和日志出发，再用已有的全部复盘和日志验证，不只看这几局。
- **每条机制结论都要有三样**：
  1. **推理**：机制本身怎么算（例：力量加到每一段攻击上，所以多段牌收益按段数放大；敏捷只加在卡牌格挡上），为什么在这类战斗里决定胜负（例：boss 的血量和回合数 → 每回合要多少伤害 → 这张能力牌几回合回本）；
  2. **证据**：支持的局数和反例局数（evidence / contradicting 里的 run id），带进阶；
  3. **典型案例**：一两个 run id + 一句话（哪场战斗、哪回合、数字）。
- 写进 experience.json：能对应到具体牌或遗物的，写进（或新建）那张牌 / 遗物的 `card:*` / `relic:*` 条目；跨牌的综合结论写进 `general:deck` 或 `general:plan`。条目文字的结构：「结论。机制：…。搭配：…。决定胜负的战斗：…（n=…）。典型案例：<run id> …」。
- 变更记录本节里加一小节 `### 机制推理`，每个机制一行：「机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目」。
- 机制推理同样**不许写喝药规则**；药水只能作为事实出现在推理里（例：力量药水 = 一回合的临时力量）。
- 说不清机制、只有相关性的，写成「观察」，不要写成因果。

## 4.1 V4 的重点（Dai 2026-10-03）
Dai：「我更倾向于通过总结归纳历史战斗，沉淀下来的经验给到 ds」——经验库是给 DeepSeek 做构筑、路线、休息、事件决策用的。这一轮除了照常合并，重点补三类，都要对数据（第 3 节），说清楚口径和局数：
1. **路线与血量管理**（现在只有 general:route 8 条、general:rest 4 条，XC4TNGZU4KT9 F8/F9 两次路线复核在 36/80、11/80 都「保持」，F11 死在双敌走廊）：
   - 按血量比例分档（例如 <25%、25–40%、40–60%、>60% max HP），各幕、各房间类型（走廊 / 精英 / 问号 / 休息 / 商店）下一场的掉血和死亡率；数据用 logs（fights 表、room-costs.json 的口径），A8 以上。
   - 什么情况下改路线（绕开精英 / 走廊、去休息点或商店）实际更好：找日志里低血时走了不同节点的局对比，说清楚是观察还是因果。
   - 写成 `general:route` / `general:rest` / `general:elite` / `act:*` 条目，句式照现有条目：结论 + 数据（n、比例）+ 典型案例 run id。
2. **SL 重打的对照**（同一场战斗、同样抽牌的多次尝试是天然的对照实验）：logs/sl-attempts.jsonl 的每场多次尝试，哪一次赢了、和输的几次差在哪（`explore`、`sl_explore`、decisions 的 sl_attempt）。能归纳成 boss / 精英打法经验的，写进 `boss:*` / `elite:*` 条目（区分「赢的那次改了什么」和「运气」），每条写明几场重打、几次赢。
3. **A9**（V4.4 起）：boss 伤害比 A8 高约 10–18%、增益多 1 层（monster-db observed / 第 3 节可复算）；A9 的死亡分布（二幕 boss 为主）。已有条目的 asc 范围按证据更新；A9 特有的结论单列。
- 机制推理（第 4 节）照做；药水规则限制（第 2 节）照旧。
- **CPU**：对局在跑（boss 模拟会占满核），抽数据、跑工具只用单进程或最多 4 个 `nice -n 19` 进程，不跑 boss 模拟池。

## 5. 更新 experience.json
- 只改 {{worktree}}/knowledge/characters/ironclad/experience.json（和第 2 节里核对后需要改的手写知识文件）。JSON 格式、字段顺序、缩进照原文件。
- 改完跑 `python3 -c 'import json; json.load(open("knowledge/characters/ironclad/experience.json"))'` 确认合法。

## 6. 切片大小
照上一节「切片大小」：用固定种子 20260929 从 states.jsonl 抽 A8、A9 各 20 个状态 × 6 种界面，分别用改前、改后的 experience.json 跑 `agent/tools/knowledge-slice.ts`，报告中位 / 最大（字）。逐局、逐回合的细节压成一句放条目里，完整数字留在变更记录。写明 active 条目数和置信度分布。

## 7. 测试和提交
- `export PATH=$HOME/.local/node/bin:$PATH`，`npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run` 退出码都要是 0（高负载时战斗测试可能超时，先重跑一次再下结论）。测试用固定数据。
- 在 {{worktree}} 提交：`git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit`，英文提交信息，写明版本号和增删改条数。不推送。
- 在变更记录末尾追加一节（标题照上一节：`## <日期> 第N次增量：<局数> 局 A几（version …，分支 …，<提交号>）`），小节依次是：来源、对照数据检查的主题、经验库自己带偏或写了没被执行的地方、**机制推理**、新增、更新、退役、和手写知识及代码冲突、代码问题（不给 DS）、测试、切片大小。只追加，不改前面的内容；工作区仓库（{{project_root}}）不要提交，由调用方提交。

## 8. 合入（只有 merge = v3 时做；V4 一律 merge = no，由开发会话审过后合入 v4 / v4-live）
本次 merge = {{merge}}。是 `no` 就跳过本节，在回报里写「未合入，待调用方合入」。是 `v3` 时，在 `flock {{project_root}}/ops/v3-merge.lock` 锁里做：
1. 等后台知识刷新跑完：`while pgrep -f 'jev-sts2-v3/tools/buil[d]-' >/dev/null; do sleep 10; done`（方括号不能省）；
2. 在 {{merge_dir}} 里，如果有刷新过、没提交的知识数据：`git add notes/fight-value-backtest.md knowledge`，commit "Refresh knowledge data"；
3. `git merge --no-edit <本分支>`；
4. 跑 tsc 和 vitest，退出码都要是 0；不是 0 就 `git merge --abort`（或回退到合入前的提交），在回报里写明；
5. 不停对局，不运行 play。

## 9. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的：{{worktree}}（本分支）、变更记录（只追加一节）、{{scratch}}；merge = v3 时还有 {{merge_dir}} 的合入。ops/、notes/ 和 paper/ 下的其他文件都只读。
- 不推送；不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`（node_modules 是共用的软链接）；logs/ 只读。

## 10. 回报
最后一条消息按这个格式写（中文），不要写别的：

```
## 经验库更新回报
- 版本：<旧> → <新>；提交：<提交号>（分支 …）；合入：<v3 的提交号 / 未合入>
- 条数：新增 N、更新 N（加证据 N、只改数字 N）、退役 N；active <旧> → <新>
- 机制推理：每个机制一行「机制 — 结论 — 证据局数 — 典型案例 run id」
- 改了的手写知识：file:line — 改成什么（没有写「无」）
- 测试：tsc 退出码；vitest 文件数 / 用例数 / 退出码（重跑过的写明）
- 切片大小：中位涨多少、最大多少
- 需要 Dai 定的事（没有写「无」）：……
```

最后再单独给一个 json 代码块：

```json
{"task": "experience-update", "version": "...", "commit": "...", "merged": null, "added": 0, "updated": 0, "retired": 0, "active": 0, "mechanisms": ["..."], "tests": {"tsc": 0, "vitest": 0, "cases": 0}}
```

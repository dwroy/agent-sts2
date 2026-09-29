# 建议：把「机制推理」加进运维会话的经验库那一段（给 Dai 审）

来源：notes/v4-dev-brief.md 第 5 项「复盘要做机制推理」：更新经验库的方法里加上机制总结——力量、敏捷、各种能力牌和增益怎么起作用、和什么搭配、在哪些战斗里决定了胜负；每条都要有推理、证据（局数）和典型案例。那一项写明「改 ops-session-prompt.md 之前先问 Dai」，所以这里只起草，**ops/ops-session-prompt.md 没有改**。同样的要求已经写进 learner/tasks/experience-update.md（第 4 节），两边用的是同一套文字。

## 1. 现在的文字（ops/ops-session-prompt.md:79，定时任务 2 第 4 步）

> 4. **经验库**：每满 5 局新复盘，派 agent 在 jev-sts2-exp 的 exp-update 分支更新 src/knowledge/experience.json，先 merge v3。方法和格式照 paper/materials/experience-changelog.md 的上一节，改动也记在那里。不许写喝药规则，然后合入 v3。

## 2. 建议的新文字（整段替换）

> 4. **经验库**：每满 5 局新复盘，派 agent 在 jev-sts2-exp 的 exp-update 分支更新 src/knowledge/experience.json，先 merge v3。方法和格式照 paper/materials/experience-changelog.md 的上一节，改动也记在那里。另外每次都要做**机制推理**：
>    - 总结力量、敏捷、各种能力牌和增益（包括遗物、敌人的增益和减益）怎么起作用、和什么搭配、在哪些战斗里决定了胜负；
>    - 每条机制结论都要有三样：**推理**（机制本身怎么算，为什么在这类战斗里决定胜负，例如 boss 血量和回合数 → 每回合要多少伤害 → 这张能力牌几回合回本）、**证据**（支持和反例的局数、进阶，run id 进 evidence / contradicting）、**典型案例**（一两个 run id + 一句话，写明哪场、哪回合、数字）；
>    - 从这批新复盘出发，再用全部复盘和日志验证；只有相关性、说不清机制的写成「观察」，不写成因果；
>    - 能对应到具体牌或遗物的写进 card: / relic: 条目，跨牌的综合结论写进 general:deck 或 general:plan；不新造 scope 类型（v3 的切片会整条丢掉不认识的类型）；active 上限 200 不变，新增前先合并或退役；
>    - 变更记录的这一节加一小节「机制推理」，每个机制一行：机制 | 推理 | 证据 | 典型案例 | 进了哪个条目；
>    - 机制推理同样不许写喝药规则，药水只能作为事实出现在推理里。
>
>    不许写喝药规则，然后合入 v3。

## 3. 配套的小改动（可选，一起审）

**a. 复盘也留一句机制观察**（定时任务 2 第 2 步，给子 agent 的要求里「内容包括 3 条经验……」那一条后面加一条）：

> - 记录里加一句以「机制：」开头的观察：本局力量、敏捷、能力牌、增益（包括敌人的）在决定胜负的战斗里起了什么作用、差了多少（带数字）；没有就写「机制：无」。

理由：经验更新要做机制推理，最省事的原料是复盘当时就记下的那一句；不加也能做，只是经验 agent 要自己回日志里找。learner/tasks/postmortem.md 已经这样写了。

**b. 如果决定用 V4 的学习者启动器**（learner/README.md），第 4 步可以写成：

> 4. **经验库**：每满 5 局新复盘，在后台运行
>    `cd ~/Projects/sts2-jev/jev-sts2 && npx tsx learner/run.ts --engine claude --task experience-update --set runs=<5 个 run id> --cwd ~/Projects/sts2-jev/jev-sts2-exp --set merge=v3 --model opus`
>    任务说明（learner/tasks/experience-update.md）已含上面的方法和机制推理；日志在 jev-sts2/learner/runs/。回报后照常记 decision-log、提交工作区仓库。

第 2 步（复盘）、第 3 步（修 bug）同理，见 learner/README.md 的对应表。这要等 v4-learner 合进 v4（jev-sts2）之后才能用。

**c. 变更记录的方法**：paper/materials/experience-changelog.md 首节「以后怎么更新」可以加第 4 条「每次增量做机制推理，写法见运维 prompt 第 4 步，结果记在本次一节的『机制推理』小节」。这个文件现在也只读，没改。

## 4. 为什么这样写
- 「推理 + 证据 + 案例」三样缺一不可：只有局数是相关性（经验库以前就被「条目读到了、做不到」「照抄了没执行」带偏过，见变更记录第七、八次增量的「经验库自己带偏」小节）；只有推理没有局数，DeepSeek 无法判断可信度；案例让它能对照当前局面。
- 「只用已有 scope」是为了 v3 现在的切片：src/knowledge/experience.ts 的 relevance() 对不认识的 scope 类型返回 null，新类型的条目永远不会下发。V4 的全量前缀会把 general:plan 放进「机制/综合」主题，也不受影响。
- 「上限 200 不变」：tests/experience.test.ts 限制 active ≤ 200，现在是 198；机制条目多半是给已有的 card:/relic: 条目补推理，而不是新增。

## 5. 需要 Dai 定的事
1. 第 2 节的新文字是否采用（可以改字）。
2. 第 3 节 a（复盘加「机制：」一句）、c（变更记录方法加一条）是否一起改。
3. 机制条目多了以后，active 上限 200 是否放宽；或者给机制单开一种 scope（例如 `mechanic:STRENGTH`），这要同时改 v3 的切片代码（relevance 里加这一类、决定在哪些界面下发）和 V4 的主题表，属于代码改动，不在这次范围里。
4. 是否把运维会话的三类学习任务改为调用学习者启动器（第 3 节 b），以及合入 v3 是否继续由学习者自己做（`--set merge=v3`），还是改成只产出分支、由评估后再合。

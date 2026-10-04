# 学习账本（论文用）

论文的核心结论是「这套架构靠自己的对局学会了打」。要站得住，每一项打法上的提升都要能追溯到对局证据（docs/learning-protocol.md §3–4），而且要能把「第一次就做对的」（大模型预训练带来的，§8 的混杂因素）和「输过之后学会的」分开。这个账本就是这条证据链：学习者每发现一件事、每学到一条，就在这里记一行；之后它去了哪里、有没有上线、上线以后有没有用，也都追加在这里。

- 文件：`ledger.jsonl`，**只追加**，一行一个 JSON。不改旧行；更正也是追加一行。
- 写入：只用 `python3 learner/ledger.py add|update`（校验、自动编号、加锁追加；校验不过什么都不写，exit 2）。
- 查：`python3 learner/ledger.py find [--character silent] [--kind K] [--status S] [--run 局号] [--asc N] [--text 关键词] [--json]`、`show <id>`、`fold`（全部条目的当前状态）。
- 校验：`python3 learner/ledger.py check`（整份文件；有问题 exit 1）。
- 谁写：学习者（复盘、经验库更新、机制审计、修 bug 任务，见 learner/tasks/*.md）；开发会话（审核、上线：`accepted` / `rejected` / `shipped`）；之后的效果审计（`effect`）。运维会话只检查、不写。
- 论文表：`eval/learning-curve.py` 读账本和日志，按角色、进阶写 `paper/data/learning-curve-<角色>.csv`（`ops/paper_dataset.py --no-raw` 会顺带跑）。

## 两种行

一个条目的当前状态 = 它的 add 行 + 之后所有同 id 的 update 行，按文件顺序合起来（`ledger.py fold`）。

### add 行（新的发现 / 学到的一条）

| 字段 | 必填 | 说明 |
|---|---|---|
| `op` | 自动 | `"add"` |
| `id` | 自动 | `<角色>-NNNN`，如 `silent-0001`（不要自己填） |
| `ts` | 自动 | 写入时间（本地时区 ISO） |
| `by` | 是 | 谁写的：`learner:postmortem`、`learner:experience-update`、`learner:mechanics-audit`、`learner:fix-batch`、`dev` …… |
| `character` | 是 | 角色的知识 id（小写：`silent`、`ironclad`） |
| `asc` | 自动 | 发现时的进阶 = `first_run` 在 runs.jsonl 里的进阶；局不在 runs.jsonl 里时必须自己填 |
| `kind` | 是 | `mechanic`（机制怎么运作）/ `card`（牌、遗物的价值和用法）/ `route`（路线、休息、商店、事件）/ `fight`（某场战斗怎么打）/ `potion`（药水的事实，不写喝药规则）/ `bug-infra`（代码、日志、接口的问题）/ `other` |
| `claim` | 是 | 结论，**学习者自己的话**，一两句（≤ 800 字） |
| `evidence` | 是 | 证据列表：`{"run": 局号, "floor": 层, "turn": 回合, "note": "一句话", "role": "support" \| "contradict" \| "repeat"}`；只有 `run` 必填。局号要在 runs.jsonl 里，而且是这个角色的局 |
| `first_run` | 是 | 第一次观察到这件事的局（这个角色里最早的） |
| `prior` | 是 | 学之前 agent 是不是已经做对了：`yes`（在任何学习之前的局里已经做对，多半来自预训练）/ `partly`（有时对、有时错）/ `no`（学之前一直做错或没做）/ `unknown`（学之前没碰到过可比的局面） |
| `prior_runs` | 否 | 判断 `prior` 用的更早的局 |
| `prior_note` | 否 | 判断 `prior` 的一句话依据 |
| `status` | 是 | 见下 |
| `where` | 否 | 去了哪里，每项是字符串列表：`lessons`（复盘小节的局号）、`experience`（经验条目 id）、`knowledge`（知识文件路径）、`proposal`（提案文件）、`changelog`（变更记录的小节标题）、`commits`（提交号） |
| `version` | 否 | 上线的 eval 版本（eval/versions.json 的 `name`）；`status` 是 `shipped` 时必填 |
| `note` | 否 | 备注 |

### update 行（之后的变化）

`{"id": …, "by": …}` 加上至少一项：

| 字段 | 说明 |
|---|---|
| `status` | 新状态；`rejected` 要带 `note` 写原因；`shipped` 要有 `version`（这一行或更早的行） |
| `evidence` | 追加的证据（同上格式）。**同一个错误在之后的局里又犯了**，用 `"role": "repeat"` |
| `where` | 追加去处（列表会合并去重） |
| `version` | 上线的 eval 版本 |
| `claim` | 改写结论（旧的留在文件里） |
| `effect` | 效果审计（之后补）：`{"runs_after": [上线后用得上的局], "applied": 照做了几局, "repeats_after": 上线后又犯了几次, "outcome": "一句话", "audited": 时间, "by": 谁}` |
| `note` | 备注 |

### 状态

`observed`（复盘里看到，还没进知识）→ `proposed`（写进经验库分支、知识文件或提案，等开发会话审）→ `accepted` / `rejected`（开发会话审核）→ `shipped`（合进 live，有 eval 版本）→ `retired`（经验条目退役，或被后来的证据推翻）。

## 新错还是老错

复盘里每条关键失误后面标「第一次遇到」或「之前学过 / 之前见过 <账本 id>」，同时在账本里：第一次遇到的 `add`；老错 `update` 追加一条 `"role": "repeat"` 的证据。论文由此算：每一级里新错和老错各多少；上线以后又犯的（`ledger.py` 里的 repeats after shipping），即学了但没用上的。

## 论文怎么用

- **学出来的 vs 预训练的**：`prior` 是 `yes` 的条目算预训练带来的；`no` / `partly` 而后 `shipped` 的算学出来的。
- **证据链**：每个 `shipped` 条目都能从 `evidence` 的局号 → 复盘小节（`where.lessons`）→ 经验条目或提案（`where.experience` / `proposal`）→ 提交（`commits`）→ eval 版本（`version`）→ 之后的局（`effect`）。
- **学习曲线**：`paper/data/learning-curve-<角色>.csv`，每个进阶一行：局数、第一次尝试赢、SL 后赢、平均层数、这一级里发现的条目、这一级里上线的条目、老错重犯次数（eval/learning-curve.py 的说明）。

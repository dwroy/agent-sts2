---
title: 复盘
tools: Read, Grep, Glob, Bash
timeout_min: 120
max_turns: 400
default.code_dir: {{project_root}}/jev-sts2-v3
---
# 任务：写复盘（{{runs}}）

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：给下面这几局写复盘，追加到 notes/lessons.md。全程用中文。自己做，不许再派下级 agent。

- 要复盘的局（run id，逗号分隔）：{{runs}}
- 工作目录：{{cwd}}
- 日志目录（只读）：{{logs_dir}}
- 复盘文件：{{project_root}}/notes/lessons.md（只追加）
- 对局用的代码（只读，引 file:line 用）：{{code_dir}}
- 临时文件（抽取脚本、中间结果）只放在：{{scratch}}

## 1. 先确认
1. 每个 run id 都在 {{logs_dir}}/runs.jsonl 里（已结束），而且 lessons.md 里还没有以 `## <run id>` 开头的标题。已经有了的跳过，并在回报里写明；不在 runs.jsonl 里的也跳过并写明。
2. 往任何文件里写时间之前，先跑 `date` 取当前时间，不要估。

## 2. 读哪些材料
- `{{project_root}}/notes/run-*-<run id>.md`（一局可能有好几个文件，是中途重启留下的，都要看）。
- `{{logs_dir}}` 下的：
  - `runs.jsonl`：run_id、ended、victory、floor、ascension、code（代码版本）、tokens、ds_cache_hit、death_fight 等；
  - `decisions.jsonl`：每条有 run_id、floor、turn、label、decider、chosen、rationale、confidence、fallback、usage、journal、result；
  - `run-plans.jsonl`：run id 在 `run` 字段；
  - `deepseek-reasoning.jsonl`：**没有 run id**，按这局第一条到最后一条决策的时间窗（decisions.jsonl 的 ts）抽；
  - `states.jsonl`：约 4 GB，**没有 run id**，按 session / 时间窗定位；
- 这些文件都很大，**只能按 run id grep，或者按字节偏移 seek 后流式读**（`grep -F <run id>`、`tail -c`、`dd skip=`、Python 按偏移读都行）。不许整份 cat，不许整份读进内存，不许用 Read 工具打开整个大文件。
- 需要看代码时读 {{code_dir}}（只读），行号按那里的当前版本写，并注明 runs.jsonl 里这局的 code 版本。

## 3. 每局写什么
每局用**一次** `cat >> {{project_root}}/notes/lessons.md <<'EOF' … EOF` 追加一节，**只追加，不改旧内容**（不许用编辑工具改 lessons.md，不许重写整个文件）。

标题：`## <run id>（A几，第N层，死因）`。死因写清楚是哪场战斗、敌人中文名 + ID、关键数字（照 lessons.md 里最近几节的写法）。

正文：
1. **3 条经验**，每条一行，格式 `- [一句话标题；bug 还是打法（哪一方：DeepSeek 路线/构筑/休息、Jev 出牌、代码）] 正文`：
   - 写明卡牌、遗物、敌人的 ID（中文名 + ID）；
   - 标明是 bug 还是打法；**bug 要带 file:line**（在 {{code_dir}} 里找到具体行），写明是新 bug 还是 notes/fix-queue.md 里已有的。
2. **一段记录**，`- [记录] …`，包括：
   - 进场血量（每场关键战斗）、每回合伤害和需要的伤害；
   - DeepSeek 的构筑、路线、休息决定（引原话要能在日志里找到出处）；
   - Jev 的出牌：低信心的次数、选推演最优的比例、推演和实际的对比、击杀顺序、focus 选项；
   - 代码自己做主的回合数；
   - 保血规则（HP 护栏）替换了几次、代价是多少；
   - 药水情况（拿到几瓶、在哪喝的；只记事实，不写喝药建议）；
   - 路线预测（投影血量对实到血量）和 boss 时钟（需要/估计、实打/估值）；
   - 用时、token 和缓存命中。
3. **机制观察**（新增，给经验库的机制推理用，v4-dev-brief 第 5 项）：本局里力量、敏捷、能力牌、增益（包括敌人的）在决定胜负的战斗里起了什么作用：怎么起作用、和什么搭配、差了多少（带数字）。放在记录里，以「机制：」开头；本局没有值得写的就写「机制：无」。

## 4. 数字的规矩
- **每个数字都要对过日志**。查不到的写「未记录」，不许估，不许从别的局套。
- 引 DeepSeek 或 Jev 的原话，要能在 decisions / run-plans / deepseek-reasoning 里找到。
- 写完一节后，重新 grep 一遍你写的关键数字（进场血量、每回合伤害、死亡回合），确认和日志一致；不一致的，在回报里写明（已追加的内容不许改；有错就在本局小节后面追加一段「### 勘误（时间，learner）」，只写改正的句子）。

## 5. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv`、`set` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的这两处：notes/lessons.md（只追加）和 {{scratch}}。其他文件（ops/、paper/、notes/ 下的其他文件、任何代码）都只读。
- 不推送；不提交（lessons.md 的提交由调用方做）。
- 不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`；logs/ 只读。

## 6. 回报
最后一条消息按这个格式写（中文），不要写别的：

```
## 复盘回报
- 已追加：<run id>（A几，第N层，死因一句话）……每局一行；跳过的写原因
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - <run id>：<一句话> — <file:line>（新 / fix-queue 已有）
- 写成「未记录」的项：<run id>：<哪几项>
- 需要 Dai 定的事（策略类证据，没有写「无」）：……
```

最后再单独给一个 json 代码块，给调用方的脚本读：

```json
{"task": "postmortem", "appended": ["<run id>", "..."], "skipped": [{"run": "<run id>", "reason": "..."}], "bugs": [{"run": "<run id>", "where": "agent/src/...:123", "what": "...", "new": true}]}
```

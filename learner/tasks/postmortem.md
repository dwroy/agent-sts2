---
title: 复盘
effort.codex: xhigh
tools: Read, Grep, Glob, Bash
timeout_min: 120
max_turns: 400
default.code_dir: {{project_root}}/.worktrees/live
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
{{^is_ironclad}}
3. 这次复盘的是{{character_name}}（{{character}}）的局：每个 run id 在 runs.jsonl 里的 `character` 要是 {{character}}（不分大小写；没有这个字段的旧局是铁甲战士的）。不是的跳过，并在回报里写明。
{{/is_ironclad}}

## 2. 读哪些材料
- `{{project_root}}/notes/run-*-<run id>.md`（一局可能有好几个文件，是中途重启留下的，都要看）。
- `{{logs_dir}}` 下的：
  - `runs.jsonl`：run_id、ended、victory、floor、ascension、code（代码版本）、tokens、ds_cache_hit、death_fight 等；
  - `decisions.jsonl`：每条有 run_id、floor、turn、label、decider、chosen、rationale、confidence、fallback、usage、journal、result；
  - `run-plans.jsonl`：run id 在 `run` 字段；
  - `deepseek-reasoning.jsonl`：**没有 run id**，按这局第一条到最后一条决策的时间窗（decisions.jsonl 的 ts）抽；
  - `states.jsonl`：大文件；新版 state.run_id 可按局号流式抽取，旧帧按 session / 时间窗核对；
- 这些文件都很大，**只能按 run id grep，或者按字节偏移 seek 后流式读**（`grep -F <run id>`、`tail -c`、`dd skip=`、Python 按偏移读都行）。不许整份 cat，不许整份读进内存，不许用 Read 工具打开整个大文件。
- 需要看代码时读 {{code_dir}}（只读），行号按那里的当前版本写，并注明 runs.jsonl 里这局的 code 版本。

## 3. 每局写什么
每局用**一次** `cat >> {{project_root}}/notes/lessons.md <<'EOF' … EOF` 追加一节，**只追加，不改旧内容**（不许用编辑工具改 lessons.md，不许重写整个文件）。

标题：`## <run id>（A几，第N层，死因）`。死因写清楚是哪场战斗、敌人中文名 + ID、关键数字（照 lessons.md 里最近几节的写法）。
{{^is_ironclad}}
这局是{{character_name}}的，标题的第二项写角色名：`## <run id>（A几，{{character_name}}，第N层，死因）`（进阶仍是第一项）。lessons.md 里标题没有角色名的都是铁甲战士的局：照它们的写法只是照格式，那些局的打法结论不要拿来解释这局，这局的经验只从这局自己的日志里来。
{{/is_ironclad}}

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
   - 药水情况（拿到几瓶、在哪喝的，区分饮用/丢弃/补充；建议须同时有证据与代码提案）；
   - 路线预测（投影血量对实到血量）和 boss 时钟（需要/估计、实打/估值）；
   - 用时、token 和缓存命中。
3. **机制观察**（新增，给经验库的机制推理用，v4-dev-brief 第 5 项）：本局里力量、敏捷、能力牌、增益（包括敌人的）在决定胜负的战斗里起了什么作用：怎么起作用、和什么搭配、差了多少（带数字）。放在记录里，以「机制：」开头；本局没有值得写的就写「机制：无」。
4. **新错还是老错**（论文用，paper/materials/learning/README.md）：3 条经验里每个关键失误，在那一行末尾标一个：
   - `（第一次遇到）`：学习账本和这个角色更早的复盘里都没有这件事；
   - `（之前见过：<账本 id>）`：账本里有、还没上线（状态不是 shipped）；
   - `（之前学过：<账本 id>，<eval 版本>）`：账本里有、已经上线，这局又犯了。
   查法：`python3 {{project_root}}/learner/ledger.py find --character {{character}} --text <关键词>`（换几个关键词：牌名、敌人名、ID），再按 `## ` 标题 grep lessons.md 里这个角色更早的复盘。只认这个角色自己的局。

## 3.0 实盘资源链（包括赢的战斗）
用 `nice -n 19 python3 {{project_root}}/learner/resource_chain.py --logs {{logs_dir}} --run <run> --character {{character}} --out {{scratch}}/<run>-resources.json` 流式抽取，随后自己核对 states/decisions/sl-attempts：每场（也包括赢的）记录进场/离场 HP、max HP、带槽位的药水、净 HP 变化、药水在哪回合被饮用/丢弃/获得、证据行/时间和 SL 尝试。SL 恢复单列，不当回血；战斗净 HP 变化不是敌人总伤害。退出帧缺失或首帧不是 T1 明示；工具不自动判胜负。

追溯关键进场资源：它由前面哪场战斗、事件、奖励、休息点消耗/补充而来；F48→F49 等相邻战斗逐段列实盘资源，不能把赢的战斗省掉。不从未记录的反事实声称“前一场留药/少掉血就能赢”；需要数据时另提案与验证。

## 3.1 学习账本（每局写完复盘之后）
账本是 `{{project_root}}/paper/materials/learning/ledger.jsonl`，字段见 `{{project_root}}/paper/materials/learning/README.md`（先读）。**只用** `python3 {{project_root}}/learner/ledger.py` 写，不许直接改这个文件。
- 3 条经验（包括 bug）每条对应账本里的一个条目：
  - 第一次遇到的：`add` 一个条目，`status` 是 `observed`，`by` 是 `learner:postmortem`，`where` 写 `{"lessons": ["<run id>"]}`。`claim` 用你自己的话写结论；`evidence` 带局号、层、回合；`first_run` 是这个角色最早出现这件事的局（通常就是这局）；`kind` 按 README 选（bug 是 `bug-infra`）。
  - `prior`：**在任何学习之前** agent 是不是已经做对了。看这个角色更早的局里有没有同样的局面、当时怎么做的：一直做对写 `yes`，有对有错写 `partly`，一直做错写 `no`，没碰到过写 `unknown`；用到的局写进 `prior_runs`，一句话依据写进 `prior_note`。
  - 之前见过 / 学过的：`update` 那个条目，`evidence` 追加这局（又犯了同样的错用 `"role": "repeat"`；只是又一次印证用 `"support"`；和结论相反用 `"contradict"`），`where` 追加 `{"lessons": ["<run id>"]}`。
- 「机制：」里有新机制的，同样 `add` 一个 `kind` 为 `mechanic` 的条目（「机制：无」就不用）。
- 写法：把 JSON 从标准输入传进去，例如 `python3 {{project_root}}/learner/ledger.py add <<'EOF'` + 一个 JSON 对象 + `EOF`。它会校验（局号要在 runs.jsonl 里、是这个角色的局，字段和取值要对），通过才追加并打印条目 id；不通过 exit 2、什么都不写，按提示改了再写。
- 写完跑 `python3 {{project_root}}/learner/ledger.py find --run <run id>`，确认每局都有条目；再跑 `python3 {{project_root}}/learner/ledger.py check`，退出码要是 0。

## 4. 数字的规矩
- **每个数字都要对过日志**。查不到的写「未记录」，不许估，不许从别的局套。
- 引 DeepSeek 或 Jev 的原话，要能在 decisions / run-plans / deepseek-reasoning 里找到。
- 写完一节后，重新 grep 一遍你写的关键数字（进场血量、每回合伤害、死亡回合），确认和日志一致；不一致的，在回报里写明（已追加的内容不许改；有错就在本局小节后面追加一段「### 勘误（时间，learner）」，只写改正的句子）。

## 5. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv`、`set` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的以下授权记录：notes/lessons.md（只追加）、学习账本 paper/materials/learning/ledger.jsonl（只经 learner/ledger.py 追加）、下文授权的提案 CLI 记录和 {{scratch}}。其他文件（ops/、paper/、notes/ 下的其他文件、任何代码）都只读。
- 不推送；不提交（lessons.md 和账本的提交由调用方做）。
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
- 学习账本：<run id>：新增 <id,…>；更新 <id,…>（老错 <id>）……每局一行；`ledger.py check` 退出码
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：……
```

最后再单独给一个 json 代码块，给调用方的脚本读：

```json
{"task": "postmortem", "appended": ["<run id>", "..."], "skipped": [{"run": "<run id>", "reason": "..."}], "bugs": [{"run": "<run id>", "where": "agent/src/...:123", "what": "...", "new": true}], "ledger": {"added": ["<id>"], "updated": ["<id>"], "repeats": ["<id>"], "check": 0}, "code_proposals": [], "implementation_domains": [], "report": "{{scratch}}/report.md"}
```


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-dai.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

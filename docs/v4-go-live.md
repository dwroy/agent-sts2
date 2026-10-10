# V4 上线说明（给 Roy）

写于 2026-09-30，依据 v4-sync（v4 13ac482：v3 c52587c 已合入，含 M1、M2a、M2b、M3a–c、M4a–c），第 1 节按上线前审查的 7 项修复更新过。本文只是说明：没有改 ops/，没有改运行环境，也没有上线。

一句话：V4 上线后**默认就会改变对局行为**，不能再说「默认请求和 v3 逐字节相同」。`KNOWLEDGE_PREFIX=off`（默认）时，DeepSeek 请求的系统提示、消息格式和参数仍是 v3 的；但题面内容已经不同（M2a 路线、M2b 构筑事实），带路线的题在路线不合法时会多问 DeepSeek 一次。默认开、**没有开关**的有六项：路由器、路线（M2a）、构筑事实（M2b）、带路线题的补问、执行闸（M3b，含发送前复核）、Jev 题面的药水和机制经验（M3a，在 JEV_CONTEXT=v1 下生效，线上 .env 就是 v1）。三个新日志默认开，各有环境变量可关。知识前缀和 Claude 都要写环境变量才会开。

## 1. V4 相对 v3 改了什么

默认开、没有开关（要回退只能换代码）：

| 模块 | 改了什么 |
|---|---|
| 大脑路由器 | DeepSeek 的决策调用都走路由器（agent/src/brain）：统一校验答案、按题型选引擎、失败时回退，每题写一行 brain.jsonl。默认引擎是 deepseek、不带工具，v3 自己的修复（一致性补问、从推理里找回选择）照旧；除带路线的题外，路由器对 DeepSeek 只记录问题、不补问。 |
| 路线（M2a） | map/route-plan 在整张地图上要一串节点（地图写成文字行，标出所在位置、走过的点、飞行靴次数、所有 boss 点，A10 有第二个 boss）。代码只查合法性（checkRoute：下一步、连线、一步一行、飞行靴跳跃次数、以 boss 结尾）并给出所选路线的事实（到达血量的中位数和 p75、休息点、到下个休息点前的战斗数、下一个精英、boss），不给候选路线、代码分数或名次（f66bf8d）。路线块跟着选牌、休息点、事件的最后一题走，回答 keep 或新路线；幕初古神题看整张地图。大脑失败时这一层用代码的贪心走法（不给大脑看）。 |
| 带路线题的补问 | 带路线的题（map/route-plan、map/route-review，以及附带路线块的选牌、休息、事件题）路线不合法时，**对 DeepSeek 也补问一次**（specs.ts：pickSpec 带路线时 `reask: true`、routePlanSpec `reask: true`）。补问后还不合法：附带路线的题 choice 照用、路线不变；路线规划题判失败，走代码的贪心走法。补问的调用计入 DEEPSEEK_MAX_CALLS。 |
| 构筑事实（M2b） | 选牌、商店、休息、事件、选牌屏的题面去掉代码分数和名次、角色张数、门槛和建议，只留事实和日志统计（没有数据写「无数据」），也不删选项（docs/v4-build-facts.md）。路线块里的分数也已由 M2a 去掉。回放 20 题：新题面首答合法 18/20（旧题面 20/20；商店步骤写法、选多张牌的写法各错 1 题，补问也没救回），构筑决定一致 11/18 |
| 执行闸（M3b） | 动作的索引指向的牌、目标、药水、节点、选项，决策时核对一次，**发送前重新读状态再核对一次**。不一致就不发、重新规划，决策日志写 `gate_reject`（`at`: decision 或 dispatch）。同一局面（状态指纹）连续被拒 3 次（两处的拒绝都算，只有动作真正发出后才清零）：战斗里改为结束回合，其他屏走代码的基线决策，不再问模型和 Jev；一直拒下去时 25 次轮询后打出 `stuck for 25 polls`。回放：113 次历史上的过期喝药拒掉 102 次，误拒 0/1,648 |
| Jev 题面（M3a） | Jev 的出牌题多两段：「药水经验」（留药打 boss 的经验和实测数据，加上整局计划里提到药水的原话）和「机制经验」。只当证据，不设门槛。回放 20 次走廊喝药：喝的次数 18/20 没变，16/20 的喝药概率下降，每题多约 1,800 token。没有单独开关：`JEV_CONTEXT=off` 会把 v3 已有的 v1 视图一起关掉，不建议 |

要写环境变量才开，或者能用环境变量关：

| 模块 | 改了什么 | 默认 | 开关 |
|---|---|---|---|
| Claude 引擎 | 可以按题型交给 Claude（订阅登录态，不用 API key）。程序路径：`BRAIN_CLAUDE_BIN`，不写时按 PATH → ~/.local/bin/claude 找成绝对路径（ops/run.sh 的 PATH 只加了 ~/.local/node/bin）。配置里任何地方用到 claude（默认引擎、按题型、回退引擎）时，开局前跑一次 `claude --version`：失败就在控制台打 `ERROR: claude is unavailable for this run`、写进 run-config 的 `claude_check` 和 `warnings`，整个进程不再启动它（有回退就直接问回退引擎）。程序启动失败（找不到、不能执行）冷却 30 分钟；额度用完、登录失效冷却 30 分钟，限流 2 分钟，过载 1 分钟；每次调用默认 2 分钟超时，连续 2 次超时（补问的也算）冷却 10 分钟。两次都答得不合法（或补问失败、超时）时按 `BRAIN_FALLBACK` 退一次回退引擎，再不行才落到 Jev/代码。退回 DeepSeek 时同样受 `DEEPSEEK_MAX_CALLS` 约束，答了但答案不能用的那次也计数 | 关（引擎是 deepseek） | `BRAIN_ENGINE`、`BRAIN_ENGINE_<题型>`（题型取 label 第一段的大写：MAP、EVENT、SHOP、REST、REWARD、SELECTION、RUN_PLAN、FIGHT_PLAN）、`BRAIN_FALLBACK`、`BRAIN_CLAUDE_BIN`、`BRAIN_CLAUDE_MODEL(_<题型>)`（opus 固定成 claude-opus-5-5，不写时是 claude-sonnet-5）、`BRAIN_CLAUDE_TIMEOUT_MS`（默认 120000）、`BRAIN_CLAUDE_MAX_CALLS`（每个进程的上限，默认 150）、`BRAIN_CLAUDE_TOOLS` |
| 知识前缀 | 系统提示 = v3 规则 + 「和数据冲突时以数据为准」 + 本进阶的全量知识：旧攻略、全部经验、怪物库、遭遇战绩、统计表。当前数据下 A9 是 170,145 字，DeepSeek 约 12 万 token，缓存热了以后命中约 95%。memory 里不再重复经验条目。M1 回放 30 题：全部合法；p50 从 24.6 s 降到 12.6 s；成本持平（$0.365 对 $0.340）；和原选择一致的比例从 80% 到 87%。前缀没有长度上限：估计超过 15 万 DeepSeek token（knowledge.ts `PREFIX_WARN_TOKENS`）时，控制台打 `WARNING: KNOWLEDGE_PREFIX=full`、写进 run-config 的 `warnings`；某题遇到上下文超长的错误时，这一题退回 v3 提示（不带前缀）重问一次，brain.jsonl 那一行的 `knowledge.error` 写原因 | 关 | `KNOWLEDGE_PREFIX=full` |
| brain.jsonl | 大脑每题一行：请求、答案、校验问题、补问、回退原因（`fell_back_from.kind`）、用量 | 开，在决策日志旁边 | `BRAIN_LOG=<路径>`；`BRAIN_LOG=off` 关 |
| jev-prompts.jsonl | 每次问 Jev 的原文 | 开 | `JEV_PROMPT_LOG=off` 关 |
| run-config.jsonl（M4c） | 每局开局写一行：提交号、分支、引擎和模型、知识前缀的哈希和 token 估计、Jev 和进阶配置，不含 key；开局告警在 `warnings`。metrics.py `--group-by config` 按这一行分组（docs/eval.md §8） | 开 | `RUN_CONFIG_LOG=off` 关 |

对局外、上线用不到的：agent/tools/logdb（DuckDB 分析库）、eval/metrics.py、calibration.py（M3c、M4b）；learner/run.ts（M4a，把复盘、经验更新、批量修 bug 写成任务文件交给 claude 或 codex；运维 prompt 的修改建议在 learner/proposal-ops-prompt.md，等你审）。

新增的日志文件都在 logs/，按审查实测：brain.jsonl 约 1–1.5 MB/局，jev-prompts.jsonl 约 1.3–2 MB/局，run-config.jsonl 约 3 KB/局；三个加起来 24 小时约 70 MB。

## 2. 两种切换方式

两种方式都要**先把 v3 合进 v4**。v3 在 389bdb7 之后又合了修复批次和经验更新；不合的话，V4 跑的是缺这些修复的代码，和 v3 的差异就分不清来自哪里。用下面的命令看冲突（只读）：

```bash
git -C ~/Projects/sts2-jev/jev-sts2 merge-tree --write-tree --name-only v3 v4
```

2026-09-30 v3 c52587c 对 v4 9841bbc 有 10 个文件冲突：agent/src/brain/llm/deepseek.ts、agent/src/memory/types.ts、agent/src/hand/screens/{combat-plan,event,oneshot,potion-discard,rest,selection,shop}.ts、knowledge/builders/build-room-costs.py。这些屏幕文件 M2b 和 v3 的修复都改过，除了文字冲突，还要当心语义冲突：v3 新加的修复里如果又往大脑题面加了分数，要按 M2b 的规矩改成事实。

### a) 新开运行工作树 jev-sts2-v4run（建议第一批用这个）

一句话：v3 原样保留，对局从 v4 的一个运行分支启动；回退就是把启动目录改回 v3。

步骤（v3 合进 v4、测试全过之后）：

```bash
cd ~/Projects/sts2-jev/jev-sts2
# v4 已经在 jev-sts2 里检出，同一个分支不能在两个工作树检出，所以开一个运行分支 v4-live
git worktree add -b v4-live ../jev-sts2-v4run v4
cd ../jev-sts2-v4run
ln -s ../jev-sts2/logs logs && ln -s ../jev-sts2/node_modules node_modules && ln -s ../jev-sts2/.cache .cache
cp ../jev-sts2-v3/.env .env      # 含 key：只复制，不要打印；再在末尾追加下面的 V4 变量
# 知识数据用 v4 自己的工具按最新日志刷新一遍（和 report.py 每局后的刷新命令相同，只是换成这个工作树）
python3 knowledge/builders/build-monster-db.py --quiet --move-model-out knowledge/common/move-model.json
python3 knowledge/builders/build-outcome-stats.py; python3 knowledge/builders/build-room-costs.py; python3 knowledge/builders/build-boss-damage.py; python3 knowledge/builders/build-card-upgrades.py
```

ops/ 里要改的地方（这里只写出来，本次没有改）：
- **ops/run.sh 第 6 行** `cd "$HOME/Projects/sts2-jev/jev-sts2-v3"` 改成 `cd "$HOME/Projects/sts2-jev/jev-sts2-v4run"`。
- **ops/report.py 第 362–363 行**（refresh_knowledge 的 tools 和 move-model 路径）也要改成 jev-sts2-v4run。不改的话，每局后的知识刷新还写进 v3，V4 的怪物库、统计表、前缀就一直停在上线那一刻。
- 同样写死 v3 的还有：ops/wait-run.sh 第 10–11 行、ops/answer.sh 第 4 行、ops/plan_adherence.py 第 218 行（SRC）。另外，运维会话 ops-session-prompt.md 的合入流程（修复合进 v3）要加一步「再合进 v4 和 v4-live」。

风险：
- 维护两条线。运维会话往 v3 合的修复不会自动到 V4，要走 v3 → v4 → v4-live；v4-live 用 `git merge --ff-only v4` 跟上。
- report.py 路径漏改：知识数据不再刷新，而且不会报错。第一局之后看 run-config 的 `code` 是否带 `+dirty`，以及 knowledge 的修改时间。
- 回退很快：run.sh 第 6 行和 report.py 两行改回 v3，下一局就是 v3。logs/ 是共用的，run-config 和 versions.json 能分开 V3 和 V4 的局。

### b) 把 v4 合进 v3

一句话：v3 就变成 V4，ops/ 一行都不用改；回退要 revert 合并提交。

步骤：先用 ops/STOP 让 autoplay 在一局结束时停下；在 jev-sts2-v3 里持 `flock ops/v3-merge.lock` 执行 `git tag V3-final && git merge v4`（如果 v3 已经合进过 v4，这里基本没有冲突）；tsc、vitest 全过后提交；.env 追加 V4 变量；删掉 STOP 文件。

风险：
- 修 bug 的 agent 也往 v3 合代码，合并要和它们错开（同一把锁）。
- 回退要 `git revert -m 1 <合并提交>` 再把后续修复理顺。直接 reset 到 V3-final 会丢掉之后的修复。只改环境变量（BRAIN_ENGINE=deepseek、KNOWLEDGE_PREFIX=off）只能把大脑请求退回 v3，M2b、M3a、M3b 的代码改动还在。
- 好处：知识刷新、经验更新、修复流程、report.py 都照旧。

### .env 追加（两种方式一样）

`RUN_CONFIG_LOG` 不用写，默认就是 logs/run-config.jsonl。TARGET_ASCENSION 和对照组保持一致（线上 .env 现在是 8；A9 有 55 局 v3 基线：experiments/eval/baseline-2026-09-29.md）。

起步配置「DeepSeek 全量知识」（只换系统提示，不用 Claude）：

```bash
# V4
BRAIN_ENGINE=deepseek
KNOWLEDGE_PREFIX=full
# 其余照 v3 的 .env：DEEPSEEK_MODEL=deepseek-flash、DEEPSEEK_REASONING_EFFORT=max、DEEPSEEK_TIMEOUT_MS=300000、JEV_CONTEXT=v1、RUN_PLAN=v1
```

配置「关键题用 Opus」（路线、事件和幕初先古、商店交给 Claude Opus，其余题仍由 DeepSeek 回答）：

```bash
BRAIN_ENGINE=deepseek
KNOWLEDGE_PREFIX=full
BRAIN_ENGINE_MAP=claude          # map/route-plan、map/route-change
BRAIN_ENGINE_EVENT=claude        # 事件，以及 event/act-plan（幕初先古 + 整幕路线）
BRAIN_ENGINE_SHOP=claude         # shop/plan
BRAIN_CLAUDE_MODEL=opus          # 固定成 claude-opus-5-5
BRAIN_CLAUDE_TOOLS=off           # 知识已经在前缀里；M1 回放就是这样跑的（开着会挂 kb_* 工具，更慢）
BRAIN_FALLBACK=deepseek          # 额度、限流、超时时退回 DeepSeek
BRAIN_CLAUDE_MAX_CALLS=40        # 每个进程（约一局）的上限；A9 每局 MAP+EVENT+SHOP 约 8.4 题
```

估算（M1 回放的数据，订阅按 API 等价价格折算，不实际扣费）：每局约 8–9 题，每题热缓存约 $0.14、耗时 6–17 s。每局还有 3 次冷写（每种 schema 一次，每次约 $1.4），因为每局结束后知识刷新会改掉前缀。合计每局约 $5（等价），消耗的是订阅额度。

## 3. 第一批建议

- **第 0 步（2–3 局，冒烟）**：`BRAIN_ENGINE=deepseek`、`KNOWLEDGE_PREFIX=off`。大脑请求和 v3 相同，只验证 M2b、M3 的代码在真局里跑得通：没有卡住、没有重启循环、执行闸拒绝的次数不离谱。
- **第 1 批（10 局）**：「DeepSeek 全量知识」。
- **第 2 批（10 局）**：「关键题用 Opus」。
- 每组 10 局时，通过率的 Wilson 区间约 ±30 个百分点，只能看方向。进阶和对照组相同。

看哪些数（`P=data/logdb-venv/bin/python`）：

```bash
$P eval/metrics.py --ascension 9 --since <上线时间> --group-by config --md --total
$P eval/calibration.py --ascension 9 --since <上线时间> --group-by config --md
```

- metrics.py：
  - 主要看「过一幕 boss」「过二幕 boss」「终层」。
  - 药水（M3a）：「进一幕 boss 带药（瓶）」「非 boss 战喝药 / 10 层」。
  - 构筑（M2b）：「一幕 boss 有力量来源」。
  - 路线（M2a 合入以后）：「一幕精英进场血量 < 78% 次数 / 局」「二幕第一个休息点前死亡」。
  - 代价：「大脑调用 / 局」「输入 token / 局」「缓存命中率」「每次调用平均耗时」和按引擎的几行。
  - 对照组是同一进阶最近的 v3 组（`V3.route-review · 未记录配置`）。
- calibration.py：三行都不该变，因为算法没改。「推演本回合掉血 ±2 内」、「路线投影 2–3 层误差」、「boss 时钟 实打/估值」如果明显变了，先查 bug。
- 日志库里另外看（`$P agent/tools/logdb/query.py "…"`）：
  - 大脑回退：`SELECT engine, fallback_from, fallback_kind, count(*) FROM llm_calls WHERE ts > '<上线时间>' GROUP BY ALL`
  - 答案不合法：`count(*) FILTER (WHERE parse_error)`
  - 执行闸拒绝：`SELECT count(*) FROM decisions WHERE result LIKE 'not dispatched: gate refused%' AND ts > '<上线时间>'`
- **回退条件**（任一条满足就回退，再和你商量）：
  - 卡住或重启循环（ops/restarts.log 一直在涨）；
  - 大脑不合法或回退超过每局 2 题；
  - 执行闸在同一局面反复拒绝；
  - 10 局里过一幕 boss 明显低于 v3（例如 ≤ 3/10，对 A9 v3 的 53%）。

  回退方法：方式 a 把 run.sh 和 report.py 改回 v3；方式 b revert 合并提交。只退知识前缀或 Claude 的话，改 .env（`KNOWLEDGE_PREFIX=off`，删掉 `BRAIN_ENGINE_*`），下一局生效。

## 4. 上线前检查清单

- [ ] v3 已合进 v4（方式 b 是 v4 合进 v3），运行工作树里 `npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run` 都是 0。负载高时战斗测试可能超时，重跑一次再下结论。
- [ ] eval/versions.json 的 V4 条目填好 `commit`（上线提交）和 `source`（decision-log 那一条），然后提交。不填的话，V4 的局按祖先关系会算进 V3.route-review。
- [ ] 知识数据已刷新（见 2a 的命令；方式 b 不用），experience.json 是 v3 最新的版本。`KNOWLEDGE_PREFIX=full` 时跑 `npx tsx agent/tools/gkb-dump.ts --ascension <进阶> --sizes-only`，确认能渲染、大小正常（A9 约 17 万字）。
- [ ] 日志库同步一次：`$P agent/tools/logdb/sync.py`。新表 run_config 要同步过才有；旧库 query.py 会提示去同步。
- [ ] 用 Claude 时：本机 `claude` 登录态有效，订阅额度够一批（约 10 局 × 9 题）；`BRAIN_FALLBACK=deepseek` 已设。额度用完不会卡住，只会退回 DeepSeek，brain.jsonl 里记 `fell_back_from.kind` 为 `quota`。第一局开局后看控制台没有 `ERROR: claude is unavailable`，run-config 的 `claude_check.ok` 是 true、`bin` 是绝对路径（run.sh 的 PATH 里没有 ~/.local/bin，代码自己会找；装在别处就写 `BRAIN_CLAUDE_BIN`）。
- [ ] 日志大小：
  - 新增三个文件（审查实测）：brain.jsonl 约 1–1.5 MB/局；jev-prompts.jsonl 约 1.3–2 MB/局；run-config.jsonl 约 3 KB/局；24 小时合计约 70 MB。
  - 大头仍是 states.jsonl：每局约 11 MB，现在 3.9 GB。
  - 磁盘剩 900 GB。
- [ ] 第一局开局后检查：
  - logs/run-config.jsonl 有这局的一行，`code`、`branch`、`brain.engine`、`knowledge.prefix` 都对；
  - brain.jsonl 有行，`knowledge.prefix_sha` 和 run-config 里的一样；
  - 决策日志里执行闸拒绝的次数正常。
- [ ] crontab 里的 ops/auto-relaunch.sh 还在：切换期间它会在没有 STOP 文件时拉起 autoplay。改 run.sh 要趁 STOP 在的时候改。
- [ ] 药水代价（§6，v4-potion 合进 v4 / v4-live 之后）：ops/report.py 的 `refresh_knowledge` 加上药水换算表的刷新（见 §6「上线要改的地方」）；运行工作树里 `knowledge/builders/refresh-potion-equivalents.sh --dry-run` 能跑，说「up to date」或「would rebuild (…)」。

## 5. v3 同步记录

### 2026-09-30：v3 c52587c 合进 v4-sync（基于 v4 2617d02，含 M2a）

- 合并提交 96a2be7，带进 v3 在 389bdb7 之后的 48 个提交（5 次合并、4 次知识数据刷新、2 次经验和攻略更新，其余是修复批次 I–L）。
- 冲突 11 个文件，处理方式：
  - agent/src/brain/llm/deepseek.ts：两边都留。v3 的 severalOptionKeys、DATA_OVER_GUIDES，加上 V4 导出的 `SYSTEM`。默认配置下，大脑请求的系统提示和请求格式仍和（合并后的）v3 相同（题面内容因 M2a、M2b 不同，见第 1 节）。
  - agent/src/memory/types.ts：afterDiscard 两个字段都留（V4 的 moreIds 和 v3 的 via）。
  - agent/src/reflex/combat-plan.ts：用 V4 执行闸的 intent（带 expect），后面接上 v3 等液态记忆取牌屏的逻辑。
  - agent/src/hand/screens/potion-discard.ts：用 v3 填好数字的药水文字和 drinkableSlots/drinkVariant，每个槽位加回 V4 执行闸要的 `id`。
  - agent/src/hand/screens/event.ts、rest.ts、map.ts：只有 import 冲突，两边合并。
  - agent/src/hand/screens/selection.ts：保留 V4 的 facts 题面（不带 why 和 unranked）；「第几张」改用 v3 的 selectingText（每次回答一张牌）；followUpTargetScore 只返回分数。
  - agent/src/hand/screens/shop.ts、oneshot.ts：保留 V4，不给代码删牌顺序和目标牌分值；加上 v3 的 annotatePlating import。
  - knowledge/builders/build-room-costs.py：用 v3 的说明，加上 V4 的 p90。
- 知识数据（knowledge/ 下的 *.json、攻略、经验库）都取 v3 的版本。ds-handbook.md 的路线一段保留 V4（M2a）的写法。room-costs.json 由 v3 的脚本生成，没有 p90：上线前按 2a 的命令用合并后的脚本重建一次，重建后同时有 p90、UnknownFight 和战内掉血。
- 放弃的 v3 修复：
  - f8aef72（删牌顺序里把整局计划的 +40 单独写出，并注明「只是参考」）。起因是 UNRL F14，大脑把代码的删牌顺序当成结论。V4 M2b 已经不给大脑看这个顺序（code_removal_order、eligible_cards 里的 code remove value 都删了），问题的来源已不存在。batch-l 第 1 组的第一个测试改成断言题面里没有这个顺序；第二个测试（remove:<诅咒> 删的就是诅咒）不变。
- v3 修复在 V4 里补做的部分（合并后的单独提交）：
  - 0349d90：对应 2f6ae4c（白兽雕像「先喝再走」）。V4 的 map/route-plan 原来只认 "discard"。现在题面列出 drinkable_potions 和 fruit_juice，回答可以写 "drink": [槽位]；校验方式和 discard 相同。routePlanSpec 的 schema 也加了 drink。
  - b4f68ac：对应 7eb1de7（一选一的题回答了多个 key）。v3 只修在 DeepSeek 的 choose() 里；V4 路由器的其他路径（Claude；DeepSeek 带工具或补问时）经过 normalisePick，现在也取第一个 key，并在 reason 里注明。
  - 1564cc4：对应 1fdbb97（购物清单写在 "choice" 里）。shopPlanList 移到 brain/specs.ts，shopPlanSpec 和商店屏按同一种方式读取，非 v3 路径不再判定为缺少 plan。
  - d6f4a9b：对应 5afb91f / 5518d8b（从推理里找回 route）。V4 的 route_review 没有带名字的路线，所以只找回 keep；不从文字里猜节点序列。
  - 67a5519、a0c997e：对应 337074d。知识前缀里 Jev 提示的 {CRAB_KILLS_EN}、{LAG_NO_STRENGTH_EN} 用 fillGuideFacts 填上（合并后 A9 前缀里这两个是原样的占位符）。房间代价表把 UnknownFight 显示为「问号里的战斗」，并加上战内掉血。
- 其余 v3 修复原样保留：推演、求解器、药水、Jev 线、执行、卡牌文字、事件、商店执行、日志回放。
- 测试：`npx tsc -p tsconfig.json --noEmit` 为 0；`npx vitest run` 88 个文件、1,465 个测试全过。
- 注意：v3 的 d79f14f、4f57bbd 改了 Jev 线上药水的算法（不再扣药水成本；没模拟的药水总是可选）。第 1 节里 M3a、M2b 的回放数字是在这次合并前测的；上线对照要用合并后的 v3 局。

### 2026-09-30：V3-final（6e7611f）合进 v4-sync（基于 v4 7a0fd88）

- 合并提交 a19c49e，带进 v3 在 c52587c 之后的 27 个提交（修复批次 M、N；A8 窗口 1–11 局的经验、攻略、卡牌评级、boss 数据；两次知识刷新）。后续修正 3ecd8b5、ba44291。
- 冲突 4 个文件：
  - agent/src/brain/llm/deepseek.ts：配置两个字段都留（V4 的 systemPrompt、v3 的 factsSnapshotDir）。
  - agent/src/hand/loop.ts：import 两边合并（V4 的 actOf、v3 的 isFightPlanReply）。商店一次计划仍走 brain.choosePlan，传入屏幕自己的校验（v3 7b54237）；日志行里 V4 的 brain 和 v3 的 recovered_from_reasoning、note 都留。战斗计划、整局计划用 V4 的 `count(…, meta.brain)`，加上 v3 的 isFightPlanReply 和 note。
  - agent/src/reflex/combat-plan.ts：保留 V4 的 jevLessonLine；它现在用 lessonText 填经验里的占位符（v3 b5e1f44 的意图）。
  - agent/src/hand/screens/selection.ts：保留 V4 的 facts 题面（不带 why、unranked）；followUpTargetScore 只返回分数（+40 改用常量 RUN_PLAN_REMOVE_BONUS）。
- 为合并而改的 V4 代码（在合并提交里）：brain.choosePlan 加 accept 参数，和 askJson 一样并进 spec 的校验（withAccept，accept 通过即合法）；DeepSeek 引擎把这个校验交给 v3 的 choosePlan，空回答就从推理里取屏幕接受的计划。choosePlan、askJson 的返回类型加 note。
- 知识数据都取 V3-final 的版本；ds-handbook.md 的路线一段仍是 V4（M2a）的写法；event-pages.json 保留 V4 新增的页。room-costs.json 仍然没有 p90：上线前照旧用合并后的脚本重建。knowledge/builders/build-boss-damage.py 只有 v3 的改动，直接合入。
- 放弃的 v3 修复：16559ba（单独的删牌屏把整局计划的 +40 拆开写，并注明「只是参考」）。理由和上次放弃 f8aef72 相同：V4 M2b 不给 DeepSeek 看代码分值、排名和 why，没有可拆的数。batch-m 第 6 组改成断言题面里没有 code value、removal order 和 +40 的说法。
- 补做（合并后单独提交）：
  - 3ecd8b5，对应 8546fde（系统提示里攻略、手册的数据按天冻结）。KNOWLEDGE_PREFIX=off 完全沿用 v3：DeepSeekClient 的攻略和手册按天快照，存在 logs/guide-facts/<日期>-<hash>.md。full 的前缀是自己渲染的，v3 的快照管不到；而且前缀开头的「数据版本」行每局都会变，缓存从第一块就断了。现在做了三件事：① render/facts.ts 把每个占位符的值按天冻结在同一目录的 <日期>-prefix-facts.json 里，覆盖攻略、手册、Jev 提示里的怪物库数字（按进阶分开）和经验条目；同一个占位符在攻略和经验里取同一个数。② 数据版本行从头部移到经验之后、怪物之前，单独成块「## 数据版本」。③ 头部加一句：旧知识和经验里的战绩数字可能是当天早些时候的，和统计表不同时以统计表为准。效果：同一天内，每局结束刷新数据后，前缀从「数据版本」块起才变；前面的头部、旧知识和经验（A8 约 9.7 万字，全长约 17.6 万字）保持逐字节不变，可以继续命中缓存。没有配置目录时（工具、回放、测试）照旧现填。
  - 同一提交还处理了 b5e1f44 带来的问题：经验条目里的占位符在 V4 前缀和 kb_experience 里也要填。合并后 experience.monster、experience.route 里原样出现了 {BOSS_RECORD:…}、{LASER_T4}、{UNKNOWN_FIGHTS:9:2}，现在都填上了。
  - ba44291，对应 fa46f6c 和 7b54237 在 V4 路由器路径（重问、带工具）上的部分：chat() 带回 finish_reason；空回答取推理里最后一个符合题目 spec 的答案；取不到时，问题里写明 finish_reason，由路由器的重问充当「再问一次」。
  - f26ae1a（逗号连接的两个对象）：这一半由 pickJsonObject 处理，V4 的 parseAnswerText 也调用它，所以自动生效。截断回答保留完整成员这一半只在 v3 路径（choose、choosePlan）里做。路由器路径不做，截断的回答按不合法重问；v3 对自由格式的计划同样不做。
- 其余 v3 修复原样保留：八音盒建模（求解器、推演、线承诺；执行闸照常带 expect，batch-m 第 4 组改用 toMatchObject 并检查 expect）、boss 时钟（撕裂+、狱火/深红披风、主宰伤害）、「现在结束会死」按牌名写（含 Beckon）、知识恶魔排序、回血写成 hp +N、战斗计划的格式检查。
- agent/tests/run-config.test.ts 的 DeepSeek 客户端原来会用默认目录 logs/guide-facts（软链到线上的 logs），现在改用测试自己的目录。改之前的第一次全量测试已经往那里写了两个小文件：2026-09-30-3493cfe2.md 和 2026-09-30-f28937d5.md，内容是测试夹具的攻略和手册。它们和线上快照不同名，不会被读到；第二天第一次写快照时，v3 的清理会把它们删掉。这个 agent 没有删除权限。
- 测试：`npx tsc -p tsconfig.json --noEmit` 为 0；`npx vitest run` 96 个文件、1,556 个测试全过。
- 上线注意：v4-live 升级到这个版本后，logs/guide-facts 里会多一个 <日期>-prefix-facts.json，每天第一次渲染前缀时写入。

## 6. 药水代价（2026-09-30 Roy 定，分支 v4-potion）

一句话：用掉的药水按「以后要扣的血」计价。代价 = 这瓶药在当前进阶、当前幕的持有价值（药水换算表 knowledge/characters/ironclad/potion-equivalents.json 的公式值）；boss 战为 0；精英和走廊一样；死亡数永远排第一。细节在 docs/potion-equivalents.md §8。

**行为变化**（默认开；`POTION_COST=off` 写进 .env 就全部关掉，下一局生效，题面和排序回到接入前）：
- 求解器：喝药的线分数减「HP 权重 × 代价」。代码自己的排序、选项里谁排前面、HP 护栏（含每场预算）、随机药水的「胜过最佳不用药线」都按「掉血 + 药水代价」比。代码自己仍然不在有不用药的线时喝药。
- 推演：后续回合的自动出牌按同样的代价决定喝不喝；每条线的 value 扣掉本回合和后续回合喝掉的药的期望代价。rollout_best 先比死亡样本数，再比「本场掉血 + 药水代价」；「并列」也按这个合计判定。
- 题面：每个选项多一项 `potion_cost`（「fight HP loss X; potions used N (…); potion cost Y HP (…); total Z」）；`potion_context.potion_cost` 一句话说代价从哪来。每道有药可喝的非 boss 战斗题多一条「本场不用药」的线（和某个选项一样就并进去、标 `no_potion_fight`），所以选项可能多一个。
- 走廊里「喝不喝都一样」的题，rollout_best 从喝药的线（以前并列时常落在喝药线上）移到不喝的线；随机药水不再「胜过」不用药的线时，代码直接打自己的线，Jev 少被问一次。
- boss 战：代价 0，选项、分数、rollout_best 和现在完全一样（测试锁住；离线回放 boss 20 次见下），题面上的 `potion_cost` 都写 0。boss 战不加「本场不用药」的线（要 Roy 确认）。

**离线回放**（`npx tsx agent/tools/potion-cost-replay.ts` → experiments/potion-cost/summary.md，不调用任何模型）：notes/potion-drinks-2026-09-29.md 附表 A 的 154 次非 boss 战喝药，重算 150 次（3 次是代码开场直接喝果汁、1 次是已修的去重 bug，不涉及排序）。同一个重建局面，推演最优本回合喝药：代价关 104 次 → 代价开 45 次；本回合不喝 24 → 100（其中 20 次推演后续回合会喝，80 次整场不喝）；并列 22 → 5。按附表分类：值得喝 15 次 9 → 9（只有 1 次从「本回合喝」变成「后续回合喝」），小收益 74 次 66 → 23，持平 60 次 28 → 12。「不喝会死」的 10 个局面推演最优全部用药（100%，8 次本回合就喝）。boss 战抽查 20 次：选项、每个选项的推演数字、推演最优和并列 20/20 完全相同。

**上线要改的地方（本次没有改 ops/）**：
- **ops/report.py `refresh_knowledge`（现在第 360–376 行）**：`cmd` 最后一段（第 374 行的 `…/logdb/sync.py >/dev/null 2>&1'`）后面接上 `f'; {wt}/tools/refresh-potion-equivalents.sh >/dev/null 2>&1'`（在日志库同步之后；输出也可以留在 refresh.log 里）。它只在「表的生成日期不是今天」或「表里没有 .env 的 TARGET_ASCENSION」时重建（读 `{wt}/.env`，用 `{wt}/.cache/logdb-venv/bin/python`），其余时候什么都不做，一天最多重建一次（约 3 秒）。重建会改 knowledge/characters/ironclad/potion-equivalents.json（和其他知识数据一样，run-config 的 `code` 会带 `+dirty`）。
- 升进阶：改 .env 的 TARGET_ASCENSION 后，下一局赛后的刷新会因为「表里没有这个进阶」重建一次（场数不够的进阶借最近进阶的输入）。上线当天也可以手动跑一次：`knowledge/builders/refresh-potion-equivalents.sh`（`--dry-run` 只看会不会重建）。
- 表加载不了时代价按 0 算（题面写明），对局不会停。

**怎么看效果**（`P=data/logdb-venv/bin/python`；`$P eval/metrics.py --ascension <进阶> --since <上线时间> --group-by config --md --total`，对照同进阶上线前的组）：
- 「非 boss 战喝药 / 10 层」应该下降（V3 A9 55 局：2.24）；
- 「进一幕 / 二幕 boss 带药（瓶）」应该上升（V3 A9：1.37 / 1.33）；
- 「死时手里的药（瓶，输的局）」（新指标：死的那场战斗进场带的药 − 这场里喝的）不该上升（V3 A9：0.16）——上升说明药留过头、死时还攥着；
- 过一幕 / 二幕 boss、终层照常看。
- 决策日志：`rollout.potion_costs` 为 true 的题是代价在场的题；`rollout.no_potion.key` 是「本场不用药」选项的 key（`merged` 表示并进了原选项），和 `choice` 比就知道 Jev 选了它几次。

**回退条件**：10 局里走廊死亡明显变多（「死时手里的药」上升、或一幕通过率明显低于对照），先 `POTION_COST=off`，再和 Roy 商量。

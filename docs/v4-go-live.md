# V4 上线说明（给 Dai）

写于 2026-09-30，依据 v4 9841bbc（含 M1、M2b、M3a–c、M4a–b）加 v4-logdb 的 M4c（每局配置落盘）。M2a 路线（v4-brain）写本文时**还没合入 v4**。本文只是说明：没有改 ops/，没有改运行环境，也没有上线。

一句话：默认配置下，大脑发出的请求和 v3 逐字节相同。上线后**默认就会改变对局行为**的是三项，都是代码改动、没有开关：构筑题面去掉代码分数（M2b）、执行闸（M3b）、Jev 题面的药水和机制经验（M3a，在 JEV_CONTEXT=v1 下生效，线上 .env 就是 v1）。知识前缀和 Claude 都要写环境变量才会开。

## 1. V4 相对 v3 改了什么

| 模块 | 改了什么 | 默认 | 开关 |
|---|---|---|---|
| 大脑（路由器、引擎） | DeepSeek 的决策调用都走路由器（src/brain）：统一校验、补问一次、失败回退。可以按题型交给 Claude（订阅登录态，不用 API key）；Claude 额度用完、限流或超时时自动退回 DeepSeek，并记下原因。每题写一行 logs/brain.jsonl | 开，引擎是 deepseek、不带工具，请求和 v3 逐字节相同（有测试锁定） | `BRAIN_ENGINE`、`BRAIN_ENGINE_<题型>`（题型取 label 第一段的大写：MAP、EVENT、SHOP、REST、REWARD、SELECTION、RUN_PLAN、FIGHT_PLAN）、`BRAIN_FALLBACK`、`BRAIN_CLAUDE_MODEL(_<题型>)`（opus 固定成 claude-opus-5-5，不写时是 claude-sonnet-5）、`BRAIN_CLAUDE_MAX_CALLS`（每个进程的上限，默认 150）、`BRAIN_CLAUDE_TOOLS`、`BRAIN_LOG` |
| 知识前缀 | 系统提示 = v3 规则 + 「和数据冲突时以数据为准」 + 本进阶的全量知识：旧攻略、全部经验、怪物库、遭遇战绩、统计表。当前数据下 A9 是 170,145 字，DeepSeek 约 12 万 token，缓存热了以后命中约 95%。memory 里不再重复经验条目。M1 回放 30 题：全部合法；p50 从 24.6 s 降到 12.6 s；成本持平（$0.365 对 $0.340）；和原选择一致的比例从 80% 到 87% | 关 | `KNOWLEDGE_PREFIX=full` |
| 路线（M2a） | 写本文时还没合入 v4。v4-brain 在做：完整地图交给大脑自由规划，代码只查合法性（包括飞行靴、A10 的第二个 boss）并给出所选路线的事实，旧的候选路线代码删掉 | — | 合入后以它的说明为准 |
| 构筑事实（M2b） | 选牌、商店、休息、事件、选牌屏的题面去掉代码分数和名次、角色张数、门槛和建议，只留事实和日志统计（没有数据写「无数据」），也不删选项（docs/v4-build-facts.md）。路线题和构筑题里附带的路线块还带分数，等 M2a。回放 20 题：新题面首答合法 18/20（旧题面 20/20；商店步骤写法、选多张牌的写法各错 1 题，补问也没救回），构筑决定一致 11/18 | 开 | 没有开关；要回退只能换代码 |
| Jev 题面（M3a） | Jev 的出牌题多两段：「药水经验」（留药打 boss 的经验和实测数据，加上整局计划里提到药水的原话）和「机制经验」。只当证据，不设门槛。每次问 Jev 的原文写进 logs/jev-prompts.jsonl。回放 20 次走廊喝药：喝的次数 18/20 没变，16/20 的喝药概率下降，每题多约 1,800 token | 开（线上是 JEV_CONTEXT=v1） | 没有单独开关：`JEV_CONTEXT=off` 会把 v3 已有的 v1 视图一起关掉，不建议。`JEV_PROMPT_LOG=off` 只关原文日志 |
| 执行闸（M3b） | 动作发出前核对：它的索引指向的牌、目标、药水、节点、选项，是不是决策时看到的那个。不一致就不发，重新规划，决策日志里写 `gate_reject`。回放：113 次历史上的过期喝药拒掉 102 次，误拒 0/1,648 | 开 | 没有开关 |
| 日志库和评估（M3c、M4b、M4c） | tools/logdb（DuckDB 分析库）、tools/eval/metrics.py、calibration.py 都在对局外运行。对局进程每局开局时写一行 logs/run-config.jsonl：提交号、分支、引擎和模型、知识前缀的哈希和 token 估计、Jev 和进阶配置，不含 key。metrics.py `--group-by config` 按这一行分组（docs/eval.md §8） | run-config 默认开 | `RUN_CONFIG_LOG=off` 关 |
| 学习者（M4a） | learner/run.ts 把复盘、经验更新、批量修 bug 写成任务文件，交给 claude（订阅）或 codex 执行 | 对局外，上线用不到它 | 运维 prompt 的修改建议在 learner/proposal-ops-prompt.md，等你审 |

新增的日志文件：brain.jsonl、jev-prompts.jsonl、run-config.jsonl，都在 logs/。

## 2. 两种切换方式

两种方式都要**先把 v3 合进 v4**。v3 在 389bdb7 之后又合了修复批次和经验更新；不合的话，V4 跑的是缺这些修复的代码，和 v3 的差异就分不清来自哪里。用下面的命令看冲突（只读）：

```bash
git -C ~/Projects/sts2-jev/jev-sts2 merge-tree --write-tree --name-only v3 v4
```

2026-09-30 v3 c52587c 对 v4 9841bbc 有 10 个文件冲突：src/llm/deepseek.ts、src/project/types.ts、src/screens/{combat-plan,event,oneshot,potion-discard,rest,selection,shop}.ts、tools/build-room-costs.py。这些屏幕文件 M2b 和 v3 的修复都改过，除了文字冲突，还要当心语义冲突：v3 新加的修复里如果又往大脑题面加了分数，要按 M2b 的规矩改成事实。

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
python3 tools/build-monster-db.py --quiet --move-model-out src/knowledge/move-model.json
python3 tools/build-outcome-stats.py; python3 tools/build-room-costs.py; python3 tools/build-boss-damage.py; python3 tools/build-card-upgrades.py
```

ops/ 里要改的地方（这里只写出来，本次没有改）：
- **ops/run.sh 第 6 行** `cd "$HOME/Projects/sts2-jev/jev-sts2-v3"` 改成 `cd "$HOME/Projects/sts2-jev/jev-sts2-v4run"`。
- **ops/report.py 第 362–363 行**（refresh_knowledge 的 tools 和 move-model 路径）也要改成 jev-sts2-v4run。不改的话，每局后的知识刷新还写进 v3，V4 的怪物库、统计表、前缀就一直停在上线那一刻。
- 同样写死 v3 的还有：ops/wait-run.sh 第 10–11 行、ops/answer.sh 第 4 行、ops/plan_adherence.py 第 218 行（SRC）。另外，运维会话 ops-session-prompt.md 的合入流程（修复合进 v3）要加一步「再合进 v4 和 v4-live」。

风险：
- 维护两条线。运维会话往 v3 合的修复不会自动到 V4，要走 v3 → v4 → v4-live；v4-live 用 `git merge --ff-only v4` 跟上。
- report.py 路径漏改：知识数据不再刷新，而且不会报错。第一局之后看 run-config 的 `code` 是否带 `+dirty`，以及 src/knowledge 的修改时间。
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

看哪些数（`P=.cache/logdb-venv/bin/python`）：

```bash
$P tools/eval/metrics.py --ascension 9 --since <上线时间> --group-by config --md --total
$P tools/eval/calibration.py --ascension 9 --since <上线时间> --group-by config --md
```

- metrics.py：
  - 主要看「过一幕 boss」「过二幕 boss」「终层」。
  - 药水（M3a）：「进一幕 boss 带药（瓶）」「非 boss 战喝药 / 10 层」。
  - 构筑（M2b）：「一幕 boss 有力量来源」。
  - 路线（M2a 合入以后）：「一幕精英进场血量 < 78% 次数 / 局」「二幕第一个休息点前死亡」。
  - 代价：「大脑调用 / 局」「输入 token / 局」「缓存命中率」「每次调用平均耗时」和按引擎的几行。
  - 对照组是同一进阶最近的 v3 组（`V3.route-review · 未记录配置`）。
- calibration.py：三行都不该变，因为算法没改。「推演本回合掉血 ±2 内」、「路线投影 2–3 层误差」、「boss 时钟 实打/估值」如果明显变了，先查 bug。
- 日志库里另外看（`$P tools/logdb/query.py "…"`）：
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
- [ ] tools/eval/versions.json 的 V4 条目填好 `commit`（上线提交）和 `source`（decision-log 那一条），然后提交。不填的话，V4 的局按祖先关系会算进 V3.route-review。
- [ ] 知识数据已刷新（见 2a 的命令；方式 b 不用），experience.json 是 v3 最新的版本。`KNOWLEDGE_PREFIX=full` 时跑 `npx tsx tools/gkb-dump.ts --ascension <进阶> --sizes-only`，确认能渲染、大小正常（A9 约 17 万字）。
- [ ] 日志库同步一次：`$P tools/logdb/sync.py`。新表 run_config 要同步过才有；旧库 query.py 会提示去同步。
- [ ] 用 Claude 时：本机 `claude` 登录态有效，订阅额度够一批（约 10 局 × 9 题）；`BRAIN_FALLBACK=deepseek` 已设。额度用完不会卡住，只会退回 DeepSeek，brain.jsonl 里记 `fallback_kind=quota`。
- [ ] 日志大小：
  - 新增三个文件：brain.jsonl 每题一行，估计每局不到 1 MB；jev-prompts.jsonl 每局约 45 次 Jev 调用，估计每局不到 1 MB；run-config.jsonl 每局约 3 KB。
  - 大头仍是 states.jsonl：每局约 11 MB，现在 3.9 GB。
  - 磁盘剩 900 GB。
- [ ] 第一局开局后检查：
  - logs/run-config.jsonl 有这局的一行，`code`、`branch`、`brain.engine`、`knowledge.prefix` 都对；
  - brain.jsonl 有行，`knowledge.prefix_sha` 和 run-config 里的一样；
  - 决策日志里执行闸拒绝的次数正常。
- [ ] crontab 里的 ops/auto-relaunch.sh 还在：切换期间它会在没有 STOP 文件时拉起 autoplay。改 run.sh 要趁 STOP 在的时候改。

## 5. v3 同步记录

### 2026-09-30：v3 c52587c 合进 v4-sync（基于 v4 2617d02，含 M2a）

- 合并提交 96a2be7，带进 v3 在 389bdb7 之后的 48 个提交（5 次合并、4 次知识数据刷新、2 次经验和攻略更新，其余是修复批次 I–L）。
- 冲突 11 个文件，处理方式：
  - src/llm/deepseek.ts：两边都留。v3 的 severalOptionKeys、DATA_OVER_GUIDES，加上 V4 导出的 `SYSTEM`。默认配置下，大脑请求仍和（合并后的）v3 逐字节相同。
  - src/project/types.ts：afterDiscard 两个字段都留（V4 的 moreIds 和 v3 的 via）。
  - src/screens/combat-plan.ts：用 V4 执行闸的 intent（带 expect），后面接上 v3 等液态记忆取牌屏的逻辑。
  - src/screens/potion-discard.ts：用 v3 填好数字的药水文字和 drinkableSlots/drinkVariant，每个槽位加回 V4 执行闸要的 `id`。
  - src/screens/event.ts、rest.ts、map.ts：只有 import 冲突，两边合并。
  - src/screens/selection.ts：保留 V4 的 facts 题面（不带 why 和 unranked）；「第几张」改用 v3 的 selectingText（每次回答一张牌）；followUpTargetScore 只返回分数。
  - src/screens/shop.ts、oneshot.ts：保留 V4，不给代码删牌顺序和目标牌分值；加上 v3 的 annotatePlating import。
  - tools/build-room-costs.py：用 v3 的说明，加上 V4 的 p90。
- 知识数据（src/knowledge/*.json、攻略、经验库）都取 v3 的版本。ds-handbook.md 的路线一段保留 V4（M2a）的写法。room-costs.json 由 v3 的脚本生成，没有 p90：上线前按 2a 的命令用合并后的脚本重建一次，重建后同时有 p90、UnknownFight 和战内掉血。
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

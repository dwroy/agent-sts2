# 评估指标（tools/eval/metrics.py）

V4 架构 §1 的「评估 evaluator」、§4 的 M4（notes/v4-dev-brief.md 第 7 项）：每个版本冻结后跑一批，按**每局都能算的代理指标**和上一版本对比，Dai 决定上线。脚本建在日志库上（docs/logdb.md），不读 JSONL、不改任何文件。第一份基线：experiments/eval/baseline-2026-09-29.md。

## 1. 用法

```bash
P=.cache/logdb-venv/bin/python        # 日志库的 Python 环境（要 duckdb）
$P tools/eval/metrics.py --ascension 9 --md                    # A9，按版本，markdown 表（指标 × 版本）
$P tools/eval/metrics.py --ascension 8 --since 2026-09-29T13:26 --group-by day
$P tools/eval/metrics.py --ascension 9 --group-by family --md  # V3 的子版本合成一列
$P tools/eval/metrics.py --group-by commit --per-run           # 按提交号，并列出每一局
$P tools/eval/metrics.py --json > out.json                     # 每局的数和每组的汇总
```

- 选项：`--ascension N`（可重复）、`--since / --until`（按开局时间，ISO；不带时区按 UTC，例如 `2026-09-29T21:26+08:00` 是本地时间）、`--group-by version|family|commit|ascension|day`（默认 version；day 按本地日期 UTC+8）、`--md`、`--json`、`--per-run`（附每局一行）、`--total`（加一列「全部」）、`--min-n`（默认 10，局数少于它的组和指标标 `*`）、`--no-sync`、`--db / --logs`、`--versions`（版本表）、`--strength-sets`（力量来源清单的 JSON，默认现算，见 §3）。
- 默认先做一次增量同步（tools/logdb/sync.py），自己 nice 19 + ionice idle，DuckDB 2 线程；A8 + A9 全部 ~1.5 秒。
- **只算已结束的局**：runs.jsonl 里有、states.jsonl 里有帧的局。正在打的局不算（它的指标是半截的）；09-24 那几局没写 runs.jsonl 的也不算。

## 2. 「代码版本」怎么认

1. **每局的提交号**：runs.jsonl 的 `code`。ops/run.sh 每次启动对局进程前取运行工作树（现在是 jev-sts2-v3）的 `git rev-parse --short HEAD`，工作树有未提交的改动时加 `+dirty`——这些改动是每局结束后自动刷新的知识数据（monster-db.json、room-costs.json 等），不是代码，所以**去掉 `+dirty` 就是这局跑的提交**。局中重启过的局，`code` 是最后一次启动时的提交。runs / frames / decisions 里没有别的版本字段。
2. **提交号太细**：v3 每次合并、每次知识刷新都是新提交，平均每个提交 1–3 局，没法比。所以按 **tools/eval/versions.json 的命名版本**分组：一局属于「版本的起点提交是这局提交的祖先（或就是它）」的**最后一个**版本——看 git 的祖先关系，不看时间，所以 v3 在 v4 之后的提交不会被算成 V4。版本表每条写了 decision-log 的哪一条或哪个 tag 说它什么时候上线：

   | 版本 | 起点提交 | 依据 |
   |---|---|---|
   | baseline | 910671b | decision-log 09-28 11:12：回退到消融前的 1910898（加 move model），之后第一阶段修复逐项合入 |
   | V2 | 189fc29 | tag V2-start；decision-log 09-28 22:19 |
   | V3-pre | debdecc | tag V3-pre；decision-log 09-28 23:22 |
   | V3 | 17ac095 | tag V3；decision-log 09-28 23:22（每个目标的集火选项、击杀顺序推演） |
   | V3.oneshot | 0c93138 | decision-log 09-29 12:50（商店、休息点、事件的 DeepSeek 一问定） |
   | V3.route-review | ea6ca1c | decision-log 09-29 16:00（选牌和休息点题面带路线复核；去掉掉血重规划） |

   比第一条还早的局记为 `before baseline`；消融实验的局（runs.jsonl 的 `arm`）单独成组，如 `before baseline [arm jev]`。子版本只列了改变决策方式的大改动；其间的修复批次（A–I）和经验库更新（2026-09-29.2–.7）并在所在的版本里，要细看用 `--group-by commit`。`--group-by family` 把 V3、V3.oneshot、V3.route-review 合成 V3。
3. **兜底**：提交号为空、或者 git 里找不到（被 rebase 掉）时，按开局时间归到在它之前提交的最后一个版本（`--json` 里 `version_how = "time"`）。2026-09-29 的 354 局已结束对局全部按 git 认出，没有用到兜底。
4. **V4 开跑前**：在 versions.json 末尾加一条 V4（第一个上线跑的提交）。执行大脑用哪个引擎是环境变量（BRAIN_ENGINE…），不在 `code` 里：同一版本不同引擎的对比先看每组的「按引擎」几行；要按配置分组，得让 runs.jsonl 记下配置（像 `arm` 那样），见 §5。

version_compare.py 的做法（手列 run id + 按时间窗口）在这里不需要：提交号在每局里都有。

## 3. 指标口径

每个指标先按局算，再在组内汇总。

| 指标 | 每局怎么算 | 汇总 |
|---|---|---|
| **boss 战（先认它）** | 每幕**第一场房间类型是 Boss 的战斗**（fights.room：本层地图帧上的当前节点，没有就用上一层选的节点）。一局已经到了下一幕（或胜局的最后一幕）却没有 Boss 房的战斗时，取这一幕的最后一场战斗，记为「推断」（`--per-run` 的「boss 层」列标出）。boss 层就是这场战斗的层，**不写死 17/33/48**。 | 2026-09-29 全部已结束对局：每个打过的幕都有 Boss 房战斗，推断 0 次 |
| 非 boss 战喝药 / 10 层 | 不是 boss 战的战斗里喝药的次数（fights.potions_n：`use_potion` 决策按时间对到这场战斗的帧）÷ 终层 × 10 | 每局的数取均值、中位数 |
| 进每幕 boss 带药 | 这幕 boss 战第一帧（第一个战斗决策时）持有的药水数（fights.potions_in） | 只对打到这幕 boss 的局，各幕 n 不同 |
| 一幕 boss 有力量来源 | 一幕 boss 战**第一帧**：牌组里有给持久力量的牌（去掉升级的 `+` 再比），**或**有给持久力量的遗物，**或**玩家身上已有力量（STRENGTH_POWER > 0，不管哪来的，如事件给的） | 占打到一幕 boss 的局；另列三类各几局 |
| 一幕精英进场血量 < 78% | 一幕 room = elite 的战斗，第一帧血量 < 0.78 × 最大血量（严格小于：62/80 算，63/80 不算） | 每局次数取均值；另给合计占一幕精英战的比例 |
| 二幕第一个休息点前死亡 | 分母：有二幕楼层的局。分子：死在二幕的层、且这层低于二幕第一个休息点（floors.room_node = RestSite）的层，或者二幕一个休息点都没到 | 比例；一幕就死的局不进分母，三幕死的不算 |
| 各阶段通过率 | 过一幕 boss：胜局，或 frames 里出现过二幕（max_act ≥ 2），或一幕 boss 战 outcome = won；过二幕同理；胜局看 runs.victory | 比例，分母是组内全部局 |
| 大脑调用 | llm_calls（deepseek-reasoning.jsonl + brain.jsonl，按局归属见 docs/logdb.md），**去掉 `duplicate`**（路由器的 DeepSeek 引擎不带工具时，同一次调用两个文件都记）。每局：行数、input（全部提示 token，含缓存命中）、cache_hit、output（含推理）、latency_ms 之和；按引擎分开 | 调用数、耗时对全部局取均值；token 只对**每次调用都有 usage** 的局（deepseek-reasoning 从 2026-09-28 11:03 UTC 起才有 usage，更早的是「—」）；缓存命中率 = 命中合计 ÷ 输入合计；每次调用耗时 = 耗时合计 ÷ 调用合计 |

**力量来源的清单不另造**：tools/eval/strength-sources.ts 调 src/project/deck-profile.ts 的 `strengthSourceIds`，用的就是题面「力量来源」那一项的判断（`isStrengthCard` / `isStrengthRelic` → card-model.ts 的 `givesLastingStrength`，读游戏数据里的牌和遗物文本），在 .cache/game-data.json 上算出 id 清单；metrics.py 每次启动调它一次（~0.3 秒），算不出来就报错，不会拿空清单。当前游戏数据（mod 0.16.2）得到：
- 牌：ARSENAL、BRAND、BULK_UP、DEMON_FORM、DOMINATE、FIGHT_ME、INFLAME、MAD_SCIENCE、PROWESS、RESONANCE、RUPTURE；
- 遗物：BRIMSTONE、EMBER_TEA、GIRYA、MINI_REGENT、RAINBOW_RING、RED_SKULL、SHURIKEN、SLING_OF_COURAGE、SPARKLING_ROUGE、SWORD_OF_JADE、TOASTY_MITTENS、VAJRA。

没用 src/strategy/card-value.ts 的 `SCALING`：那是「成长」集合，含腐化、无痛、壁垒等不给力量的牌。

**区间**：均值用 Student t 的 95% 区间（n ≥ 2；这些量都不为负，下限截到 0）；比例用 Wilson 95% 区间。局数（或这个指标的 n）少于 `--min-n`（默认 10）标 `*`：样本不足，区间只作参考。

## 4. 核对

- 每局非 boss 战喝药次数、进 boss 带药数和 ops/version_compare.py 的结果（paper/materials/v3-vs-v2-10runs-2026-09-29.md 的逐局表：hallway + elite 次数、F17/F33/F48 带药）逐局一致：V2 10 局、V3 10 局、V3-pre 2 局，22 局全部相同。
- 各组的局和 decision-log 对得上：A8 的 V3 组是 decision-log 的 V3 10 局（VNWR … Y3XT）加上之后同代码的 6189、VG7H；V2 组是 10 局窗口加 FA82、YKFW（decision-log 09-29 00:40 记的「V2 代码」两局）。
- brain.jsonl 的去重在 v4-brain 冒烟实验的真实日志上核对过：5 次不带工具的 DeepSeek 调用标为 duplicate，2 次带工具的（deepseek-reasoning.jsonl 里没有）不标。

## 5. 局限

- **帧只在决策点记**：「进场血量」「带药数」是第一个战斗决策时的状态；战前自动触发的效果已经算进去。
- **力量来源按文本判断**：条件型遗物（彩虹戒指、红骷髅、手里剑、勇气投石索）也算来源；壶铃不看锻炼了几次（0 次也算）。战斗中才获得的力量不算来源——打出的牌本来就在牌组里，药水、预备打击的力量只管一回合（A9 的 49 场一幕 boss 战里 35 场战中出现过力量，只有 30 场有来源）。
- **喝药只算战斗里的**：地图上喝的（果汁等）不算；v3 基本不在战斗外喝药。
- **大脑调用含整局计划**：runs.jsonl 的 `deepseek_calls` / `ds_tokens_*` 不含 run-plan 调用，所以这里的数比 runs.jsonl 大（例：Y36H 29 次 vs 26 次）。Jev（小脑，战斗里挑选）不在这里；它的 token 在 runs.jsonl 的 `tokens`。brain.jsonl 一行是一个问题（含补问，`attempts` 是模型调用次数），deepseek-reasoning.jsonl 一行是一次 API 调用。
- **配置不在版本里**：同一个提交可以用不同环境变量跑（BUILD_ONESHOT、BRAIN_ENGINE、进阶目标……）。进阶用 `--ascension` 分开；引擎看按引擎的几行；其他配置目前只能靠时间（`--since/--until`）切。建议 V4 在 runs.jsonl 里记下 BRAIN_ENGINE 等配置。
- **版本表手工维护**：新版本上线要加一行；子版本的粒度是人定的。
- **样本小**：一个版本 5–20 局时，终层、token 这类局间差异大的量区间很宽，版本间的差多半落在区间里，只能看方向；通过率的 Wilson 区间在 n = 10 时约 ±30 个百分点。
- 时间：库里是 UTC；`--since/--until` 不带时区按 UTC；`--group-by day` 和 `--per-run` 的开局时间按本地（UTC+8）。

## 6. 测试

- `.cache/logdb-venv/bin/python tests/eval_metrics_test.py`：每个指标的算法用手写的小样本测（boss 在第 9 层也认得出、推断 boss、推断出的 boss 战里喝药不算非 boss、力量来源三类和「只看第一帧」、78% 的边界 62/80 与 63/80、二幕第一个休息点的各种情况、t / Wilson 区间、只对 usage 齐全的局算 token、版本表的祖先关系 / `+dirty` / 按时间兜底 / 消融分组）；有 duckdb 时再把 tests/eval-data（`make-fixture.py` 生成：两局、幕很短、boss 在第 4 层和第 3 层，一局的 boss 节点被写成 Monster）同步进临时库，从视图一直算到分组输出和命令行。没有 duckdb 时只跑算法测试，其余跳过并写明原因。
- vitest 的 tests/eval.test.ts 调上面的 Python 测试，并测 `strengthSourceIds` 和 strength-sources.ts 的输出（固定的 tests/logged-states/game-data.json）。

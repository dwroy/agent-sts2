# 评估指标（tools/eval/metrics.py）

V4 架构 §1 的「评估 evaluator」、§4 的 M4（notes/v4-dev-brief.md 第 7 项）：每个版本冻结后跑一批，按**每局都能算的代理指标**和上一版本对比，Dai 决定上线。脚本建在日志库上（docs/logdb.md），不改任何文件。第一份基线：experiments/eval/baseline-2026-09-29.md。§7 是「眼」的预测对实际（tools/eval/calibration.py），第一份：experiments/eval/calibration-2026-09-30.md；它的三个摘要也是版本表的三行。

## 1. 用法

```bash
P=.cache/logdb-venv/bin/python        # 日志库的 Python 环境（要 duckdb）
$P tools/eval/metrics.py --ascension 9 --md                    # A9，按版本，markdown 表（指标 × 版本）
$P tools/eval/metrics.py --ascension 8 --since 2026-09-29T13:26 --group-by day
$P tools/eval/metrics.py --ascension 9 --group-by family --md  # V3 的子版本合成一列
$P tools/eval/metrics.py --group-by commit --per-run           # 按提交号，并列出每一局
$P tools/eval/metrics.py --ascension 9 --group-by config --md  # 版本 + 大脑引擎/模型 + 知识前缀（§8）
$P tools/eval/metrics.py --json > out.json                     # 每局的数和每组的汇总
```

- 选项：`--ascension N`（可重复）、`--since / --until`（按开局时间，ISO；不带时区按 UTC，例如 `2026-09-29T21:26+08:00` 是本地时间）、`--group-by version|family|config|commit|ascension|day`（默认 version；day 按本地日期 UTC+8；config 见 §8）、`--md`、`--json`、`--per-run`（附每局一行）、`--total`（加一列「全部」）、`--min-n`（默认 10，局数少于它的组和指标标 `*`）、`--no-sync`、`--db / --logs`、`--versions`（版本表）、`--strength-sets`（力量来源清单的 JSON，默认现算，见 §3）、`--no-calibration`（不算 §7 的三行校准）、`--boss-clocks`（校准用现成的 boss 时钟 JSONL，不跑 tsx）、`--game-data`。
- 默认先做一次增量同步（tools/logdb/sync.py），自己 nice 19 + ionice idle，DuckDB 2 线程；A9 全部 ~3 秒（其中校准 ~2 秒：按偏移读 decisions.jsonl 的原始行、跑一次 tsx 重算 boss 时钟），`--no-calibration` ~1 秒。
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
4. **V4**：versions.json 末尾已有一条 V4，`commit` 为 null（「上线时填」）；commit 为空的条目不参与分组。上线时填上第一个跑对局的 V4 提交和 decision-log 那一条（docs/v4-go-live.md）。执行大脑用哪个引擎、知识前缀开没开是环境变量，不在 `code` 里：每局开局时对局进程把配置写进 logs/run-config.jsonl，`--group-by config` 按它分组（§8）。

version_compare.py 的做法（手列 run id + 按时间窗口）在这里不需要：提交号在每局里都有。

## 3. 指标口径

每个指标先按局算，再在组内汇总。

| 指标 | 每局怎么算 | 汇总 |
|---|---|---|
| **boss 战（先认它）** | 每幕**第一场房间类型是 Boss 的战斗**（fights.room：本层地图帧上的当前节点，没有就用上一层选的节点）。一局已经到了下一幕（或胜局的最后一幕）却没有 Boss 房的战斗时，取这一幕的最后一场战斗，记为「推断」（`--per-run` 的「boss 层」列标出）。boss 层就是这场战斗的层，**不写死 17/33/48**。 | 2026-09-29 全部已结束对局：每个打过的幕都有 Boss 房战斗，推断 0 次 |
| 非 boss 战喝药 / 10 层 | 不是 boss 战的战斗里喝药的次数（fights.potions_n：`use_potion` 决策按时间对到这场战斗的帧）÷ 终层 × 10 | 每局的数取均值、中位数 |
| 进每幕 boss 带药 | 这幕 boss 战第一帧（第一个战斗决策时）持有的药水数（fights.potions_in） | 只对打到这幕 boss 的局，各幕 n 不同 |
| 死时手里的药 | 输的局：最后一场 outcome = died 的战斗进场时的药水数 − 这场里喝掉的（fights.potions_in − potions_n；战斗中新得的药，如混沌药水给的，看不到） | 只对输的局（有 died 的战斗）；均值、中位数 |
| 一幕 boss 有力量来源 | 一幕 boss 战**第一帧**：牌组里有给持久力量的牌（去掉升级的 `+` 再比），**或**有给持久力量的遗物，**或**玩家身上已有力量（STRENGTH_POWER > 0，不管哪来的，如事件给的） | 占打到一幕 boss 的局；另列三类各几局 |
| 一幕精英进场血量 < 78% | 一幕 room = elite 的战斗，第一帧血量 < 0.78 × 最大血量（严格小于：62/80 算，63/80 不算） | 每局次数取均值；另给合计占一幕精英战的比例 |
| 二幕第一个休息点前死亡 | 分母：有二幕楼层的局。分子：死在二幕的层、且这层低于二幕第一个休息点（floors.room_node = RestSite）的层，或者二幕一个休息点都没到 | 比例；一幕就死的局不进分母，三幕死的不算 |
| 各阶段通过率 | 过一幕 boss：胜局，或 frames 里出现过二幕（max_act ≥ 2），或一幕 boss 战 outcome = won；过二幕同理；胜局看 runs.victory | 比例，分母是组内全部局 |
| 校准（三行，§7） | 这局的推演回合、路线投影节点、boss 战（tools/eval/calibration.py 的行） | 组内合并：推演本回合掉血 ±2 内的回合比例；路线投影离计划 2–3 层的中位误差（投影 − 实际）和中位 \|误差\|；boss 时钟实打/估值的中位。回合、节点彼此不独立，不给区间；n < `--min-n` 标 `*` |
| 大脑调用 | llm_calls（deepseek-reasoning.jsonl + brain.jsonl，按局归属见 docs/logdb.md），**去掉 `duplicate`**（路由器的 DeepSeek 引擎不带工具时，同一次调用两个文件都记）。每局：行数、input（全部提示 token，含缓存命中）、cache_hit、output（含推理）、latency_ms 之和；按引擎分开 | 调用数、耗时对全部局取均值；token 只对**每次调用都有 usage** 的局（deepseek-reasoning 从 2026-09-28 11:03 UTC 起才有 usage，更早的是「—」）；缓存命中率 = 命中合计 ÷ 输入合计；每次调用耗时 = 耗时合计 ÷ 调用合计 |

**力量来源的清单不另造**：tools/eval/strength-sources.ts 调 src/project/deck-profile.ts 的 `strengthSourceIds`，用的就是题面「力量来源」那一项的判断（`isStrengthCard` / `isStrengthRelic` → card-model.ts 的 `givesLastingStrength`，读游戏数据里的牌和遗物文本），在 .cache/game-data.json 上算出 id 清单；metrics.py 每次启动调它一次（~0.3 秒），算不出来就报错，不会拿空清单。当前游戏数据（mod 0.16.2）得到：
- 牌：ARSENAL、BRAND、BULK_UP、DEMON_FORM、DOMINATE、FIGHT_ME、INFLAME、MAD_SCIENCE、PROWESS、RESONANCE、RUPTURE；
- 遗物：BRIMSTONE、EMBER_TEA、GIRYA、MINI_REGENT、RAINBOW_RING、RED_SKULL、SHURIKEN、SLING_OF_COURAGE、SPARKLING_ROUGE、SWORD_OF_JADE、TOASTY_MITTENS、VAJRA。

没用 src/strategy/card-value.ts 的 `SCALING`：那是「成长」集合，含腐化、无痛、壁垒等不给力量的牌。

**区间**：均值用 Student t 的 95% 区间（n ≥ 2；这些量都不为负，下限截到 0）；比例用 Wilson 95% 区间。局数（或这个指标的 n）少于 `--min-n`（默认 10）标 `*`：样本不足，区间只作参考。

**SL（docs/sl.md §5）**：组里有 SL 记录（logs/sl-attempts.jsonl → 表 sl_attempts）的局时多六行，没有时输出和以前一样。上面各行是**最终**成绩（重打之后）；「第一次尝试」各行是只算第一次尝试的成绩：这局第一条 `predicted_death`（某场战斗第 1 次尝试预判必死、触发重打）的层就是「第一次尝试」的死亡层和终层，不算胜，某幕 boss 只有在这层之前（boss 层 < 死亡层）且最终也过了才算过；没有这种行的局（SL 关、或从没重打）第一次尝试 = 最终。另有「SL：有 SL 记录的局」「SL：重打次数 / 局」（reload 成功的 predicted_death 行数）。`--per-run` 多一列「SL 重打 / 第一次尝试终层」。注意：日志库的 fights 按层切战斗，同一场战斗的几次尝试合成一场（喝药数是几次的和），按战斗的指标在 SL 局里是「重打之后」的口径。

## 4. 核对

- 每局非 boss 战喝药次数、进 boss 带药数和 ops/version_compare.py 的结果（paper/materials/v3-vs-v2-10runs-2026-09-29.md 的逐局表：hallway + elite 次数、F17/F33/F48 带药）逐局一致：V2 10 局、V3 10 局、V3-pre 2 局，22 局全部相同。
- 各组的局和 decision-log 对得上：A8 的 V3 组是 decision-log 的 V3 10 局（VNWR … Y3XT）加上之后同代码的 6189、VG7H；V2 组是 10 局窗口加 FA82、YKFW（decision-log 09-29 00:40 记的「V2 代码」两局）。
- brain.jsonl 的去重在 v4-brain 冒烟实验的真实日志上核对过：5 次不带工具的 DeepSeek 调用标为 duplicate，2 次带工具的（deepseek-reasoning.jsonl 里没有）不标。

## 5. 局限

- **帧只在决策点记**：「进场血量」「带药数」是第一个战斗决策时的状态；战前自动触发的效果已经算进去。
- **力量来源按文本判断**：条件型遗物（彩虹戒指、红骷髅、手里剑、勇气投石索）也算来源；壶铃不看锻炼了几次（0 次也算）。战斗中才获得的力量不算来源——打出的牌本来就在牌组里，药水、预备打击的力量只管一回合（A9 的 49 场一幕 boss 战里 35 场战中出现过力量，只有 30 场有来源）。
- **喝药只算战斗里的**：地图上喝的（果汁等）不算；v3 基本不在战斗外喝药。
- **大脑调用含整局计划**：runs.jsonl 的 `deepseek_calls` / `ds_tokens_*` 不含 run-plan 调用，所以这里的数比 runs.jsonl 大（例：Y36H 29 次 vs 26 次）。Jev（小脑，战斗里挑选）不在这里；它的 token 在 runs.jsonl 的 `tokens`。brain.jsonl 一行是一个问题（含补问，`attempts` 是模型调用次数），deepseek-reasoning.jsonl 一行是一次 API 调用。
- **配置不在版本里**：同一个提交可以用不同环境变量跑（BUILD_ONESHOT、BRAIN_ENGINE、进阶目标……）。V4 起每局的配置在 logs/run-config.jsonl（§8），`--group-by config` 分组；更早的局没有记录（「未记录配置」），只能靠时间（`--since/--until`）切。
- **版本表手工维护**：新版本上线要加一行；子版本的粒度是人定的。
- **样本小**：一个版本 5–20 局时，终层、token 这类局间差异大的量区间很宽，版本间的差多半落在区间里，只能看方向；通过率的 Wilson 区间在 n = 10 时约 ±30 个百分点。
- 时间：库里是 UTC；`--since/--until` 不带时区按 UTC；`--group-by day` 和 `--per-run` 的开局时间按本地（UTC+8）。

## 6. 测试

- `.cache/logdb-venv/bin/python tests/eval_metrics_test.py`：每个指标的算法用手写的小样本测（boss 在第 9 层也认得出、推断 boss、推断出的 boss 战里喝药不算非 boss、力量来源三类和「只看第一帧」、78% 的边界 62/80 与 63/80、二幕第一个休息点的各种情况、t / Wilson 区间、只对 usage 齐全的局算 token、版本表的祖先关系 / `+dirty` / 按时间兜底 / 消融分组）；有 duckdb 时再把 tests/eval-data（`make-fixture.py` 生成：两局、幕很短、boss 在第 4 层和第 3 层，一局的 boss 节点被写成 Monster）同步进临时库，从视图一直算到分组输出和命令行。没有 duckdb 时只跑算法测试，其余跳过并写明原因。
- `.cache/logdb-venv/bin/python tests/eval_calibration_test.py`（§7）：对齐逻辑用手写的小样本测——选中的线（回答、升级、HP 护栏和支配换线、code-fallback 不算）、题面里 hp_lost / 推演文字 / rollout_turns 的解析（随机药水线取均值、超时兜底不算预测）、按「还在打的样本」加权的逐回合累计、预测对到同一回合（下回合第一帧；战斗在本回合结束用结束血量，巨兽爆炸取战后帧、燃烧之血不算；死了是 0；日志缺回合记为对不上）、路线节点对到同一节点（第 i 步必须在计划层 + 1 + i 层走到；离开计划就停；死在路上下一节点记 0）、每个房间的代价、层数分桶、boss 本体的血（同族只算神官、蟹两只钳子、巨兽死后的标记血量）、按进阶/幕/版本分组、metrics 的三个摘要；有 duckdb 时把 tests/calibration-data（`make-fixture.py` 生成：A9 一局走完一份一幕路线计划、重算过的回合、code-fallback 回合、boss 战、二幕死亡；A8 一局升级换线、死在计划路线的精英房）同步进临时库，从视图、原始行一直算到报告、JSON 和 metrics 的三行（boss 时钟用固定的 boss-clocks.jsonl，另用假的重算函数核对传给 tsx 的是 boss 战第一帧的状态）。
- vitest 的 tests/eval.test.ts 调上面两个 Python 测试，并测 `strengthSourceIds` 和 strength-sources.ts 的输出（固定的 tests/logged-states/game-data.json），以及 boss-clock-recompute.ts 在一个记录下来的 boss 局面（yg3h-f33-t1）上的输出和进程内直接调 `bossClock` / `deckEstimate` 完全一样、认不出的 boss 给 `{key, error}`。

## 7. 校准：预测对实际（tools/eval/calibration.py）

V4 架构 §1「眼」的「预测对实际的偏差记录」（M3）。**只测量，不改任何预测算法**（路线投影、卡牌口径等 A/B/C 等 Dai 讨论后再定）。

### 7.1 用法

```bash
P=.cache/logdb-venv/bin/python
$P tools/eval/calibration.py --ascension 9 --md                       # markdown 报告（默认就是 markdown）
$P tools/eval/calibration.py --ascension 8 --since 2026-09-28T03:12 --md
$P tools/eval/calibration.py --ascension 9 --json [--rows]            # 汇总、覆盖率、最坏的例子；--rows 附每一行对齐结果
```

选项和 metrics.py 一样（`--ascension`、`--since/--until`、`--group-by version|family|config|commit|day`、`--min-n`、`--no-sync`、`--db/--logs/--versions`），另有 `--top`（最坏的例子列几个，默认 10）、`--no-boss`（不算 boss 时钟）、`--boss-clocks FILE`（用现成的 boss-clock-recompute.ts 输出）、`--game-data`。先增量同步，再查日志库；预测本身不在库的列里，按库里的偏移（decisions.off / frames.off）去读 decisions.jsonl、states.jsonl 的那几行，不整读文件。A9 全部约 3 秒。只算已结束的局（同 metrics.py）。

分组：每个进阶一组「全部」，再按幕（一幕/二幕/三幕：推演和 boss 按战斗的幕，路线按计划的幕），再按代码版本（versions.json，和 metrics.py 同一套认法）。误差一律是**预测 − 实际**（HP）：推演为正是多报掉血，路线为正是投影的到达血量比实际高（偏乐观）。每张表给 n、中位误差、平均误差、p10/p90、中位 |误差|、±2 以内、多报 >2、少报 <−2 的比例；n < `--min-n` 标 `*`。

### 7.2 推演（战斗里选中的那条线）

- **预测从哪来**：plan-choice 决策（label `combat/plan-choice*`）题面里每条线的 criteria（decisions.jsonl 的 `questions.plan.criteria`，JSON 字符串）：`hp_lost`（turn solver 的本回合精确值，含敌人回合；随机药水线是分布「mean X [a-b]」，取均值）、`rollout`（「N-turn rollout (S samples): expected further HP loss X …」）、`rollout_turns`（「T1 exact: hp -24 …; T2: hp -6.4 [0-14] …, alive 8/8, won 0/8; …」）。decisions 表只有 rollout_best 等几列，所以按 off 读原始行。
- **选中的线**：回答的 choice；有升级（`escalation`）用升级的 choice；理由里写了 HP 护栏「playing plan N」或支配换线「plan N … is as good or better on every axis, playing it」的，用换上的 plan N；`code-fallback`（代码用自己的最优线，不写是哪条）和喝药后重算的线（「drink … first, then re-plan」，没有 hp_lost）不算，报告开头列出没对上的回合数和原因。
- **每回合一条**：这回合最后一次 plan-choice（它的线一直打到回合结束）。回合中重算过（抽到牌、喝了药）的回合照算，另给「只决策一次」的回合的 ±2 比例；A9 1822 个回合里 608 个重算过。
- **对齐**：决策和状态帧 ts 相同（decisions.ts = frames.ts；2026-09-30 核对：日志里全部 18134 个 plan-choice 决策都对上唯一一个战斗帧，回合和血量都相同），由帧得到 (局, 第几场, 第几回合) 和决策时血量。
  - 本回合：实际 = 决策时血量 − 下回合第一帧血量（turns 视图的 start_hp）；这回合打完战斗就结束的，减**战斗结束血量** = min(最后一个战斗帧, 战后第一帧)：瀑布巨兽死亡爆炸只出现在战后帧，燃烧之血的战后回血（战后帧更高）不算；死在这场是 0。下回合没有帧、后面却还有回合（日志缺）的，这个 k 记为对不上。
  - 推演窗口（一般 5 回合，超时降级时更短）：预测 = T1 + Σ 第 k 回合的平均掉血 × 还在打的样本占比（rollout_turns 的均值只对还在打的样本：T2 是全部样本，除非 T1 就赢了或死了；之后是上一回合末「活着 − 已赢」）；实际 = 同样这几个回合的掉血（战斗提前结束按结束血量）。报告另给按 k = 1..5 的累计误差。
  - 到战斗结束：预测 = expected further HP loss（窗口内加窗口后的模型终值，所以是「到这场结束」，不是 5 回合）；实际 = 决策时血量 − 战斗结束血量。超时兜底（「no rollout … a fallback, not a forecast」）不算预测。
- **局限**：推演假设的后续打法和实际不同（后面每回合 Jev 重新选线），窗口和到结束的误差里混着策略差异；有复活遗物（蜥蜴尾巴）时 solver 按死亡算掉血，实际被救回（A9 最坏的一条就是这个）；帧只在决策点记，回合最后一个决策之后的自伤算在下回合开头的血量里（本回合的实际掉血仍然对）；09-28 前的决策没有 rollout_turns（窗口为空），更早的没有 rollout（只有本回合）；老数据的「expected further HP loss」可能超过当时血量（GG0Y F33 185.4，之后才截到血量）。

### 7.3 路线投影

- **预测从哪来**：decisions.jsonl 的 `route_plan`（2026-09-28 06:35 起：map/route-plan 开局和改线规划、event/act-plan 先古选项一起定的整幕路线、map/route-change 选牌/休息点复查后的改线），每一步 `hpOnArrival` 是**做计划时最大血量**的比例（截在 0–1）；预测 = hpOnArrival × 做计划时的最大血量（决策 fingerprint 的 maxHp）。同一局同一份路线重复记的只算一次。
- **对到同一节点**：地图上的选择（choose_map_node 决策对到同 ts 的 MAP 帧，按 option_index 取 map_avail 的节点）给出 (幕, 行, 列) → 走进的层；计划的第 i 步必须在「计划层 + 1 + i」层走到，而且前面每一步都照计划走了——中途改线、走了别的节点就停在那里（之后再走回同一节点也不算）。实际 = 进这个节点时的血量（floors.entry_hp：上一层最后一个地图帧）。
- **死在路上**：最后走到的节点所在层就是这局的终层、而且没赢（死在那个房间里），计划的下一个节点记 0 血（「死在路上」），这个房间的代价记全部进场血量。
- **分桶和拆分**：离计划点几层（1、2、3、4–5、6–8、9–12、13+）；计划的第一个节点（离计划 1 层）投影的就是做计划时的血量，只作核对（A8、A9 都是 100% 在 ±2 以内），**汇总从 2 层起**；按到达的节点类型（走廊/精英/问号/休息/商店/宝箱/boss：到达血量的误差是前面所有房间的累积）；每个房间自己的代价（相邻两个节点：投影之差对实际进场血量之差，负数是回血）。
- **局限**：选牌、休息点的复查**没改线**时，按当时血量重新投影的那份（state.route_review 的 keep）没有落盘（只在 DeepSeek 的题面里，deepseek-reasoning.jsonl 不存题面数据），这里只有改线的那次；按现在的 room-costs.json 离线重算也不是当时写下的数，所以没算。投影在最大血量处截断，最大血量变了（加上限）按做计划时的算；boss 节点的投影含缩放仪开场回血，实际是地图帧上的血量（不含）；休息点投影按回血算，实际锻造了就是误差（「每个房间的代价」里休息点的均值 −16 对投影 −24 就是它）；同一个节点会被多份计划（开局、改线）各投影一次，节点之间不独立。

### 7.4 boss 时钟

- **没有落盘，离线重算**：时钟（act_boss_clock）只作为 facts 在 DeepSeek 的题面里；deepseek-reasoning.jsonl 只存问题文本，decisions.jsonl、run-plans.jsonl 里也没有它的数（run-plans 的理由里偶尔提到）。所以每场 boss 战取**第一个战斗帧**的原始状态（states.jsonl 按 fights.first_off 的偏移读，去掉 agent_view），连同实际进场血量交给 tools/eval/boss-clock-recompute.ts，调 src/strategy/boss-clock.ts 的 `bossClock(state, knowledge, entryHp)`（和 tools/boss-clock-calibrate.ts 一样），**算法不改**。用的是当前工作树的代码和知识数据（monster-db.json、boss-damage.json）以及 .cache/game-data.json，不是那局跑的版本；当时 DeepSeek 看到的是按「预计进场血量」算的，这里用实际进场血量，所以数不一定和当时的题面相同。
- **boss 战**：和 metrics.py 同一个认法（每幕第一场 Boss 房间的战斗，没有就推断）。
- **估值** = 时钟的牌组每回合伤害（deck，按时钟自己估的战斗回合数）；另给按实际回合数的估值（deckEstimate(牌组, boss, 实际回合数)）。
- **实打** = boss 本体掉的血 ÷ 回合数，口径同 tools/boss-fights-extract.py（时钟估值的「11 + 0.92 × 原始估计」就是按它标定的，见 boss-clock.ts ESTIMATE_BASE）：本体 = 第一帧的非 minion 敌人（同族只算神官、女王不算汞合体、帝王蟹两只钳子都算）；赢局按本体的最大血量（最后一击在最后一帧之后），输局按最大血量 − 本体合计的最低血量；回血、复活不加，格挡不算；巨兽死后的标记血量（999999999）当作已死。
- **掉血/回合** = (进场血量 − 战斗结束血量，死了是 0) ÷ 回合数，对时钟的 hp_loss_per_turn；**可活回合**只在输局里看得到（死的那回合），对时钟的 survivable_turns（估 − 实）。另数时钟报「够」（gap 0）的赢局和输局各几场。
- **局限**：赢局的回合数含最后不完整的一回合；测试体（三个阶段）的本体血量只按第一帧的第一阶段算（同 boss-fights-extract.py，时钟标定时也把它排除了），它的实打/估值偏低、不能读；一个进阶一幕只有几十场，按 boss 分更少；二幕、三幕的 boss 在 A9 只有 12 场和 1 场。

### 7.5 进版本表的三行（metrics.py）

metrics.py 默认对选中的局跑一遍 calibration（`--no-calibration` 关掉），每局留一个摘要（calibration.run_digest），组内合并成三行：推演本回合掉血 ±2 以内的回合比例；路线投影离计划 2–3 层的中位误差和中位 |误差|；boss 时钟实打/估值的中位。回合、节点、boss 战在组内合并，彼此不独立（同一场战斗的回合、同一局的节点），所以只给 n，不给区间。

## 8. 每局配置（logs/run-config.jsonl）和 `--group-by config`

V4 的决策取决于环境变量（引擎、按题型覆盖、模型、知识前缀……），runs.jsonl 只有提交号，分不开。所以对局进程在**第一次看到一个新 run id 时**写一行配置（src/telemetry/run-config.ts，loop.ts 里一处调用）：

- 路径：默认和决策日志同目录（logs/run-config.jsonl）；`RUN_CONFIG_LOG=<路径>` 改，`RUN_CONFIG_LOG=off` 关。
- 字段：`ts, run_id, ascension, character, floor`（进程第一次看到这局时的层：> 1 说明是局中重启接手）`, restart, process {pid, started}`；`code {commit, code`（短号 + `+dirty`，同 ops/run.sh）`, dirty, dirty_files`（改动的受跟踪文件名，最多 20 个：每局后刷新的知识数据）`, branch, worktree}`，进程启动时读一次（跑的是启动时加载的代码）；`brain {active, engine, by_prefix, fallback, reask, tools, log, engines {<引擎>: {model`（实际发送的 id，opus → claude-opus-5-5；DeepSeek 是 DEEPSEEK_MODEL）`, model_by_prefix, timeout_ms, effort, reask, tools, max_calls}}, claude {schema, max_budget_usd}}`（只列这套配置会问到的引擎：默认、按题型、回退）；`knowledge {prefix, ascension, prefix_sha, prefix_chars, prefix_tokens_est {deepseek, claude}, system_sha, system_chars, experience_version, error?}`；`deepseek {model, max_calls, timeout_ms, reasoning_effort, combat_reasoning_effort, effort_by_label}`；`jev {enabled, model, context, strict, prompt_log}`；`loop {mode, combat_planner, build_decider, build_oneshot, combat_deepseek, fight_plan, run_plan, escalation, confidence, run_start, character}`；`target_ascension, arm, config_sha`（除时间、局、进程以外全部配置的哈希：相同 = 同一套配置）。
- **没有 key**：逐字段从解析后的配置挑（白名单），不写 key、key 文件路径、base URL；写之前再把整行和进程里所有秘密（配置里的 key、名字含 KEY / TOKEN / SECRET / PASSWORD 的环境变量值、`*_KEY_FILE` 的路径）以及 `sk-…`、`Bearer …` 形状比一遍，命中就不写，note 里只说变量名。
- **一局一行**：同一进程里一个 run id 只处理一次；重启的进程（auto-relaunch）只有配置和文件里这局已有的行不同时才再写一行（`restart: true`）。
- **知识前缀**：KNOWLEDGE_PREFIX=full 时用大脑自己的 KnowledgePrompt 按这局的进阶渲染（和这局第一问用的是同一份渲染、同一个缓存；`prefix_sha` 就是 brain.jsonl 的 `knowledge.prefix_sha`，`system_sha` 就是它的 `system_sha`），当前数据 A9 约 90 ms、170,145 字；off 时记 v3 系统提示的哈希和长度。token 是估计：按 M1 回放实测的字数比（DeepSeek 0.70、Claude 0.97 token/字，experiments/brain-replay/m1-0929/notes.md），不是分词器。
- 失败不影响对局：写不了就一条 note。

日志库：表 `run_config`（extract.py `run_config_row`，`VERSIONS["run-config"] = 1`，列见 docs/logdb.md）；`runs` 视图带上这局**第一行**的配置（开局时的配置）：`cfg_code, cfg_branch, cfg_worktree, brain_engine, brain_by_prefix, brain_fallback, brain_label, knowledge_prefix, prefix_sha, prefix_tokens_deepseek, jev_model, jev_context, target_ascension, config_sha, config_rows`（0 = 没记录）`, config_changed`（局中重启换过配置）。

`brain_label`（抽取器算）：默认引擎和模型，再加上被别的引擎或模型回答的题型（label 第一段大写），同引擎同模型的题型合并：`deepseek:deepseek-flash`、`deepseek:deepseek-flash; EVENT,MAP=claude:claude-opus-5-5`、`claude:claude-sonnet-5; MAP=claude:claude-opus-5-5`；没有 DeepSeek（没有大脑）是 `none`。

`--group-by config`（metrics.py 和 calibration.py）：组名 = 版本 · brain_label · 知识前缀，例如 `V4 · deepseek:deepseek-flash · 知识前缀 full`；没有配置行的局是 `<版本> · 未记录配置`；局中换过配置的单独成组（`· 局中改过配置`），不和同配置的局混；消融的 `[arm …]` 照旧。`--per-run` 多一列「配置」，`--json` 的每局带 `brain_label, knowledge_prefix, config_rows, config_changed`。按引擎的调用、token、耗时仍在每组的「按引擎」几行里。

测试：tests/run-config.test.ts（字段、没有 key、秘密命中不写、一局一行、重启换配置、loop 里写一行、extract.py 读写入的行、Python 样本和写入的键一致）；tests/logdb_test.py（抽取、brain_label、runs 视图的配置列、旧库缺表时的提示）；tests/eval_metrics_test.py（待填的版本条目、config 分组、命令行）。

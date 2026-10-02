# SL：boss 和难打精英的死亡重打（src/sl/）

Dai 2026-10-01/02 定：目标改为让模型快速学习、看能摸到多高的天花板，允许 SL，但做最简单的版本——**只在死亡时用**：
boss 战、以及按战绩最难打的 5 种非 boss 战斗（src/sl/sl-elites.json，不限精英），在「这回合一结束就必死」时不结束回合，回主菜单再「继续」，
游戏从进房间时的存档把这场战斗从第 1 回合重新开始，换打法再打；赢了接着往下打。不做构筑分叉、不做 boss 实验室，
**不读、不写、不复制任何存档文件**（Dai 10-02），不改随机种子。架构不变：Jev 出牌，DeepSeek 做构筑、路线和战斗计划。
`SL_ENABLED` 默认开（Dai 2026-10-02：SL 做成开关、默认开；原先默认关）；关的时候对局循环、题面和日志与没有 SL 时逐字节相同（tests/sl-loop.test.ts、boss-lines-planner 的 golden）。

## 1. 机制：确认了什么、推测了什么

只读查过（2026-10-02）：

| 事实 | 证据 | 状态 |
|---|---|---|
| 局内每个画面 mod 都给 `save_and_quit`（战斗里是 `end_turn, play_card, save_and_quit`） | states.jsonl 末尾的 COMBAT / CARD_SELECTION / REWARD / EVENT 帧的 available_actions | 确认 |
| 主菜单有这局可继续时给 `continue_run`（菜单规划器一直在用） | src/screens/misc.ts、tests/scenarios.ts | 确认 |
| GAME_OVER 只给 `continue_game_over`，点了之后才有 `return_to_main_menu` | 最后几局的 GAME_OVER 帧 | 确认 |
| 局结束后 current_run.save 不在了 | 现在 modded/profile1/saves/ 下只有 history、prefs、progress，没有 current_run.save（最后一局 00:08 结束） | 确认 |
| history/&lt;开局 unix 时间&gt;.run 在 GAME_OVER 出现时就写了，早于 continue_game_over | 1790866223.run（负局）mtime 23:10:55 = 控制台「run ended (defeat)」23:10:55，continue_game_over 在 23:11:00；胜局 1790867487.run 00:08:51.23 vs GAME_OVER 帧 00:08:51.36 | 确认 |
| 游戏进程没了以后「继续」会从存档接着打 | ALBM9RUA77WR（10-01 本机被挤掉）重开后在 F21 的 REWARD 画面接着打；VG7H 在 F14 EVENT 接着打 | 确认（但没有一次是战斗中途断的） |
| 「继续」回到这场战斗的第 1 回合，抽牌和敌人行动与第一次相同（同样的打法得到同样的结果） | 日志（§10.1）：VNKN9952ZNA0 F33 第 2 次（漏记的重打）打法相同，T1–T5 手牌、抽牌顺序、敌人意图、每回合血量逐一相同，T5 照样死；ZPPVDTSFJXJM F33（09-27 中途重开，从 T1 再来）打法相同，连 T6 洗牌后的手牌都相同 | 确认 |
| 打法不同时，抽牌堆的顺序仍然不变（抽牌牌只是让牌早到），直到弃牌堆洗回抽牌堆 | VNKN F25 三次尝试从 T1 起打法就不同，25 张牌（整个抽牌堆）T1–T5 的抽出顺序完全相同；JW925EDF9ZTQ F48 第 2 次 T3 先打祭品、耸肩无视+，第 1 次 T4 的牌在 T3 就来了，顺序一直对到 T7 洗牌（§10.1） | 确认（打法不同的 2 场，没有反例） |
| 洗牌后不同 | VNKN F25 三次在 T5 洗牌后抽到的牌都不同（弃牌堆内容不同）；JW92 F48 T7 洗牌后两次手牌不同 | 确认；所以已知顺序只用到第一次洗牌为止 |
| 状态里的抽牌堆列表不是抽牌顺序 | agent_view.combat.draw 按名字（Unicode 码位）排序并合并同名（「防御*3」）：09-28 以来抽样 168 个多行牌堆全部有序；手牌数组才是抽牌顺序（抽到的牌加在末尾） | 确认；只用来知道牌堆里有哪些牌 |
| 死亡时（GAME_OVER）current_run.save 已经被删 | history 在 GAME_OVER 时就写了，STS1 也是死亡时删档 | 推测；所以 SL 必须在敌方回合之前触发——现在的方案正是这样 |
| `save_and_quit` 在战斗中直接回主菜单，没有确认框 | mod 的动作名；没有日志 | 推测；若有确认框，第一步等主菜单会超时，这局停用 SL（§3），控制台和日志会写明 |
| 重打不经过 GAME_OVER，所以失败的尝试不写 history/*.run，也不记 progress 里的死亡 | 上面两条 | 推测 |
| 存档里的 num_reloads 每「继续」一次加 1 | 字段名 | 推测；我们不读也不改 |

## 2. 预判必死（src/sl/judge.ts）

只在对局循环**马上要发 `end_turn`**、而且这场战斗还能重打时问。判断要保守：任何一条不满足就不 SL。

共同条件：
- mod 自己的 `end_turn_will_kill_player` 为真（意图伤害对现有格挡）；
- 没有能复活的：没有瓶中精灵，蜥蜴尾巴没用过（combat-plan 的 revivesOf）；
- 身上没有缓冲（Buffer）、无实体（Intangible）；有涟漪盆（Ripple Basin）而本回合没打攻击牌时不判（它的格挡这里不算）；
- 没有特殊阶段的敌人（最大血量 ≥ 100 万，如瀑布巨人喷发；意图是 DeathBlow）；
- 我们自己数也死：Σ 攻击意图（伤害 × 段数）− 现有格挡 − 回合末格挡（镀层 / 多层护甲 / 金属化、斗篷扣每张留手牌 1 点、
  无痛按每张留手牌都当虚无算、山铜在没格挡时 6 点）− 再生 ≥ 当前血量。

然后满足其一：
- **rules**：手里没有能打的牌，也没有能喝的药；
- **least-loss**：这一步是回合规划器的 `combat/least-loss` 结束回合——它已算过所有出牌线（含建模的药水）都死、没有未建模的药、
  随机药的蒙特卡洛也没有活的样本，结束回合掉血最少。手里有能打的抽牌牌时不判（抽到什么不知道）。

**校准**（states.jsonl 到 2026-10-02 的全部 A8+ boss 和名单精英战，回合末 4557 个、其中死亡 201 个）：rules 判了 121 次，121 次真死；
两层合起来判 140 次，139 次真死；唯一一次没死（7KDMKN16GD6B F27 T7）是无痛从虚无牌给的格挡，已改成按每张留手牌算。
漏掉的约 30%：手里还有能打的牌或能喝的药而规划器不是 least-loss（约 50 次）、mod 不报致死而死于自伤（深红斗篷、地狱火、瓦解，约 15 次）、
瓶中精灵 / 蜥蜴尾巴在手。这些死亡照常发生（会写 sl-attempts 的 died 行，便于以后放宽）。mod 报致死但没判必死时，控制台写
`SL: ending the turn may be lethal (...), not certain: 原因`。

## 3. 控制器（src/sl/controller.ts、reload.ts）

- **认战斗**：每读一次状态都看一下。开场活着的敌人里有 boss（知识库 type = Boss），或有名单精英的敌人 id，就从这一帧开始记为
  第 1 次尝试（进程重启时按 sl-attempts.jsonl 里这一局这一层这场的行数接着数）。每回合第一个能行动的帧记血量、格挡、敌人血量；
  出牌、喝药在发出后记下（牌名 → 目标）。离开战斗（奖励画面、地图）记 won，GAME_OVER 记 died / won，局没了记 unfinished。
- **重打**：发 `end_turn` 之前（发之前那次重读的状态上）判必死，且还有次数（boss 最多 1 + `SL_BOSS_RETRIES` 次，名单精英 1 + `SL_ELITE_RETRIES` 次）：
  1. 不发 end_turn；决策日志这一行写 `not dispatched: SL reloaded the fight (...)`；
  2. `save_and_quit` → 等到主菜单、不在局里、有 `continue_run`（每步最多 `SL_STEP_TIMEOUT_MS`，默认 60 秒；请求超时但其实生效了也算）；
  3. `continue_run` → 等到局里战斗、能行动；连续几次读到局里但不在战斗（地图、别的房间）就算回错地方；
  4. 核对：同一局、同一层、开场敌人相同（id 排序后比）→ 写这次尝试的行（predicted_death，reload ok，resumed_turn）、第 k+1 次开始；
     对局记忆回到战斗开始时：RunJournal 和蜥蜴尾巴记录恢复成第一次见到这场战斗时的样子，按战斗的屏幕记忆、出牌计划、答案缓存清空。
     DeepSeek 的战斗计划通常从 fight-plans 日志按这场战斗恢复（和第一次相同，不多调用）。
- **失败就放弃**：save_and_quit 不在可选动作里、等主菜单 / 战斗超时、继续后不在同一局同一层同一场——记这次尝试的行（reload.ok = false、
  失败的步骤和原因、give_up_reason），**这局之后不再 SL**，正常往下打（还在战斗里就照常结束回合，会死就死）。如果卡在主菜单而没有
  「继续」，循环按「局没了」结束进程，autoplay 重开时菜单规划器会点「继续」（这局 SL 仍是停用的，因为日志里有 give_up_reason）。
- **次数用完**：照常结束回合，死了就是这局的结局；控制台写 `no retry left`。
- 对局进程只在这局真正结束（胜、死、局没了）时才打「stopped: run N ended」，所以 autoplay 不会把重打当成局结束。
- 控制台每一步都有 `SL:` 开头的一行：跟踪哪场战斗、预判必死和原因、save_and_quit / continue_run 的结果、回到第几回合、第几次开始、失败原因。

## 4. 日志

- **logs/sl-attempts.jsonl**（`SL_LOG`，默认在决策日志旁边）每次尝试一行：`run_id, act, floor, encounter`（开场敌人 id 排序用 + 连）、
  `enemies, fight_kind`（boss / elite）、`elite`、`attempt`（第几次）、`max_attempts`、`from`（「first play of the fight」或
  「reloaded from the game's room-entry save of F17 (save_and_quit, continue_run)」）、`started_at, ended_at`、
  `result`（won / died / predicted_death / unfinished）、`turns, end_hp, end_block, incoming`、`judge`（tier、原因）、
  `reload`（ok、ms、resumed_turn 或失败的 step、reason）、`give_up_reason`、`summary`（每回合血量 / 格挡 / 敌人血量 / 出牌、喝的药、谁打死的）、
  `draws`（这次尝试从抽牌堆出来的牌按顺序 `order`（卡 id，升级的带 `+`）、`names`、`turns`，前 `clean` 张是这场战斗开场牌堆的顺序，`broke` 是在哪里、为什么断的；§10）。
- **decisions.jsonl**：SL 开着时每行加 `sl_attempt`（正在打的 boss / 名单精英战是第几次，战外 null）和 `sl_reloads`（这局到此重打几次；
  0 就是「到此为止都是第一次尝试的打法」）。SL 关时没有这两个字段。重打的战斗题用了已知抽牌或加算力时，这题的 log 多 `sl_retry`
  （`known_draws`：已知的后面几张牌，`compute`：采样数和预算；§10）。
- **run-config.jsonl**：SL 开着时多一个 `sl`（开关、次数、显示模拟、超时、日志、精英名单和日期），也进 config_sha。
- 日志库（docs/logdb.md）：表 sl_attempts，decisions 多 sl_attempt、sl_reloads。注意 fights 视图按层切战斗，同一场的几次尝试合成一场。

## 5. 统计口径（tools/eval/metrics.py，docs/eval.md §3）

上面原有的各行是**最终**成绩（重打之后）。组里有 SL 记录时多六行：「SL：有 SL 记录的局」「SL：重打次数 / 局」，以及
**第一次尝试**的终层、过一幕、过二幕、胜局：这局第一条 predicted_death（第 1 次尝试预判必死、触发重打）的层就是第一次尝试的死亡层，
不算胜；某幕 boss 只有在它之前（boss 层 < 死亡层）才算过。没有这种行的局（SL 关、没重打过）第一次尝试就是最终成绩，所以和以前的版本可比。
`--per-run` 多一列「SL 重打 / 第一次尝试终层」。注意：预判误判（不该死却重打了）会让第一次尝试记成死在这层——按校准很少。

## 6. 换打法：重打时 Jev 题面多一块

第 2 次起，这场战斗的每个战斗题（回合方案题和逐张出牌题）多 `previous_attempts`；选项、数字、排序都不变，仍由 Jev 选：

```json
{
  "note": "SL retry: this fight was reloaded from its start (the game's save from entering the room) because the earlier attempt(s) below reached a certain death. The deck, the draws and the enemy moves are the same as long as the plays are the same, so playing the same way loses the same way: look for a different line (when to block, which enemy to kill first, when to drink which potion, which cards to set up). Information, not an order: the options and their numbers are unchanged and you still choose.",
  "this_attempt": "attempt 2 of at most 4",
  "attempts": [{
    "attempt": 1,
    "ended": "certain death at the end of T6 with 9 HP + 0 block against 31 incoming from 女王 (Attack 31) (the fight was reloaded before the enemy turn)",
    "potions_drunk": "T4 格挡药水",
    "turns": [
      "T1: 72 HP; 女王 400/400, 火炬头融合体 36/36; played 痛击 -> 女王, 打击 -> 女王, 防御",
      "T2: 66 HP; ...",
      "T6: 9 HP; 女王 180/400; played 防御, 防御"
    ]
  }]
}
```

`SL_RETRY_KNOWN_DRAWS`（默认开，§10）：note 多一句「抽牌堆不管怎么打都按同样的顺序来，直到洗牌：known_draws 列出接下来的牌」；
已知时题面多一行 `known_draws`：「SL retry: the next 10 cards of the draw pile, in the order they come (the next first), are known from attempt 1:
痛击+, 打击, 血墙, …. The options' numbers and the rollout draw these first; past them the draws are random.」（最多列前 10 张，即两手牌；规划用全部已知的牌）

`SL_RETRY_SHOW_SIM`（默认开）：重打的 boss 战即使是低可信 boss，也把整场模拟的数字放进题面（每个选项的 `whole_fight_sim` 以
「low confidence:」开头，另有 `whole_fight_sim_trust: "低可信 (low trust): ..."`），只作换思路的参考；排序（rollout_best 等）仍按原规则，
低可信 boss 不按模拟排。

## 7. 配置

| 变量 | 默认 | 含义 |
|---|---|---|
| `SL_ENABLED` | on（2026-10-02 起） | 总开关 |
| `SL_BOSS_RETRIES` | 5 | boss 战最多 1 + 5 次（Dai 2026-10-02） |
| `SL_ELITE_RETRIES` | 3 | 名单里的难打战斗最多 1 + 3 次（Dai 2026-10-02） |
| `SL_RETRY_SHOW_SIM` | on | 重打时低可信 boss 也给整场模拟（标低可信） |
| `SL_RETRY_KNOWN_DRAWS` | on（Dai 2026-10-02） | 重打时按前几次尝试看到的抽牌顺序算（§10）；关：抽牌照旧随机，题面和选择与 v4 3488dc5 逐字节相同 |
| `SL_RETRY_COMPUTE` | on（Dai 2026-10-02） | 第 2 次起多算（§10.3：rollout 24 个样本、每题最多 20 秒、每回合最多 30 秒，随机药水 ×3，B2 ×2）；关：照旧 |
| `SL_LOG` | 决策日志旁的 sl-attempts.jsonl | off 不写 |
| `SL_STEP_TIMEOUT_MS` | 60000 | 等主菜单、等回到战斗各自的上限 |

难打战斗名单 src/sl/sl-elites.json（Dai 2026-10-02：按战绩取前 5，不限精英，各重打 3 次）：A8–A9 至少 8 场、死亡率 ≥10% 的非 boss 战斗按死亡次数排——残杀千足虫 11/38（精英）、蜂群术士 7/43（精英）、熟睡甲虫 + 盛碗虫 7/50（走廊，按熟睡甲虫认）、胧光怪 7/62（走廊）、感染棱柱 5/32（精英）；按死亡率排更高但场数太少、没收：三骑士 2/9、机甲骑士 2/11、青蛙骑士 2/11（三幕）。改名单只改这个文件。

## 8. 风险和局限

- **不碰存档**：我们只发 mod 动作，和玩家自己「保存并退出、继续」一样；Steam 云存档照常同步，没有额外的存档损坏风险。
- **save_and_quit 弹确认框**（推测没有）：等主菜单会超时 60 秒，这局停用 SL；之后循环照常处理这个弹窗（若点了确认回到主菜单，
  进程按「局没了」结束，autoplay 重开后「继续」这局，SL 仍停用）。第一次真打出 SL 时看控制台确认（§9）；真有确认框就在 reload.ts 加一步。
- **误判**：不该死却重打，白费一次尝试，第一次尝试的统计记成死在这层。校准里 0 次（修正后）。
- **漏判**：约 30% 的死亡不触发 SL（§2），照常死。
- **进程在重打中途崩溃**：这次尝试的行还没写，重开的进程会把重来的这场当作同一次尝试接着数（多给一次机会）；进程重启后从日志重建的
  DeepSeek 对局记忆里会带着失败那次尝试的帧（日志是连续的）。
- **时间**：每次重打大约 20–40 秒加上重打这场的时间；ops/run.sh 的 `--max-minutes 240` 够用。
- **DeepSeek 不知道重打**：它的战斗计划和第一次相同；要不要把「之前的尝试」也给 DeepSeek 的战斗计划，见回报里的待定事项。
- **已知抽牌**（§10）：只在每个状态都核对过「这次到目前为止抽到的牌就是前一次的顺序」时才用；一旦洗牌、有牌被放进抽牌堆、或者抽到别的牌，
  这次尝试剩下的部分就不用了（控制台一行 `SL: the draws left the order ...`）。核对是按状态做的：抽牌牌打出后、下一个状态读到之前的那一刻
  规划已经用了预测——预测错了，下一个状态就会发现并停用，那一步规划用的是错的牌。
- **加算力的时间**：第 2 次起每个规划题的 rollout 最多 20 秒、每回合合计最多 30 秒（§10.3 的测量：实盘时钟下中位 1.1 秒、p90 9.9 秒）。
- **复盘**：同一层的回合数会从 1 重新开始；看 decisions 的 sl_attempt 区分是第几次。

## 9. 上线步骤（运维会话）

1. B2（jev-sts2-v4sim）和 v4-sl 都合进 v4 后，运行工作树 jev-sts2-v4run 的 .env 加 `SL_ENABLED=on`（次数用默认，或按 Dai 定的）。
2. 第一局里第一次 SL 时看控制台：`SL: certain death foreseen at F.. T.. attempt 1/4 (rules: ...)` → `SL: save_and_quit -> completed`
   → `SL: continue_run -> completed` → `SL: back in the fight at F.. T1 (.. s); attempt 2/4 begins`。logs/sl-attempts.jsonl 那一行
   `reload.ok = true`、`resumed_turn = 1`。若 `resumed_turn` 不是 1（游戏在战斗中途也存档），或出现 `reload failed at ...`，记下原因告诉
   开发会话（SL 已自动在这局停用，对局继续）。
3. 统计：`tools/eval/metrics.py --group-by version --md` 里看「第一次尝试」各行和最终成绩并列。
4. 回退：.env 里 `SL_ENABLED=off`（或删掉这一行），下一局起生效。

## 10. 重打：已知抽牌顺序、多算（SL_RETRY_KNOWN_DRAWS、SL_RETRY_COMPUTE）

Dai 2026-10-02 定：重打时用前面尝试看到的抽牌顺序（「知道下回合抽什么」，人类 SL 玩家最大的优势），重打时多算；两个开关，默认开。
起因（V4.3 运维报告）：VNKN F33 第 2 次打法和第 1 次一模一样、又死在 T5；VNKN F25 三次里 Jev 每次都选 rollout 的最优线，几次的差别只来自
rollout 被时间预算砍到 1–4 个样本的噪声。也就是说重打基本是在重复自己。

### 10.1 日志里看到的（2026-10-02，所有从进房存档打了不止一次的战斗，含运维 10-02 下午补的 XSPHCB4GUSEU F48）

| 战斗 | 尝试 | 打法 | 抽牌 | 敌人行动 |
|---|---|---|---|---|
| VNKN9952ZNA0 F25 残杀千足虫（名单精英） | 3（SL） | T1 起就不同（第 2 次 T1 打防御不打第二张打击；T2–T4 目标、顺序都不同） | 整个抽牌堆 25 张在 T1–T5 的顺序三次完全相同（手牌顺序也相同）；T5 抽牌堆空了以后耸肩无视 / 剑柄打击触发洗牌，三次洗出来的牌都不同（重锤 / 打击 / 打击、打击+），弃牌堆内容不同（第 1 次有两张愤怒复制，第 3 次少一张打击+） | 三段各自按 扭动→缠绕→膨胀 循环，三次相同，只被自己的死亡 / 重接打断 |
| VNKN9952ZNA0 F33 碾碎者+火箭（boss） | 2（第 2 次是 back_in_fight 漏记的重打，0660f99 已修） | 相同（连 T1 开场弃牌的选择、火焰药水都相同） | 26 张相同 | T1–T5 意图、伤害、每回合血量完全相同，T5 同样死 |
| JW925EDF9ZTQ F48 实验体（boss） | 2（同上，漏记） | T1–T2 相同，T3 起不同（第 2 次先打祭品，再打耸肩无视+） | 38 张开场牌堆顺序一直相同：第 2 次在 T3 就抽到了第 1 次 T4 的防御，到 T7 洗牌前一张不差；洗牌后两次手牌不同 | 招式序列相同（撕咬、头槌、多重爪 ×3、撕裂、扑击、怒吼、撕裂），伤害因虚弱 / 力量不同而不同 |
| ZPPVDTSFJXJM F33 碾碎者+火箭 | 2（09-27 游戏中途断了，「继续」回到 T1） | 相同 | 相同，T6 洗牌后的 T6、T7 手牌也相同 | 相同 |
| XSPHCB4GUSEU F48 女王+火炬头聚合体（boss） | 6（SL，5 次重打都成功，每次约 8 秒） | 6 次完全相同（Jev 每次选同一条线，见下） | 28 张相同（T5 羽化往抽牌堆里加牌，之后不算） | 相同；6 次都在 T5 以 9 血对 24 伤害判必死 |

结论：
- **开场抽牌堆的顺序在进房存档里就定了，和打法无关**（5 场，没有反例）。抽牌牌（祭品、耸肩无视、剑柄打击、燃烧契约）只让牌早到，不改顺序。
- **打乱它的**：洗牌（弃牌堆洗回抽牌堆；打法不同时 3/3 次结果不同；打法相同时洗出来也相同，但那时已知顺序也没用了）；有牌被放进抽牌堆的随机位置
  （XSPH F48 T5 羽化往抽牌堆加了 3 张；死亡局里无厌者的液化地面把狂乱逃离洗进抽牌堆）；牌从抽牌堆出去却没进手牌（从顶上打出、弃掉、消耗，或手牌满 10 张）——位置不明。生成进手牌的牌
  （原始力量把攻击牌变成的巨石、JW92 F48 T1 一张不在抽牌堆里的坚定不移）不碰抽牌堆，不影响。
- **状态里的抽牌堆列表不是顺序**：按名字排序、同名合并（§1）。顺序只能从手牌看：每一步新进手牌、同时离开抽牌堆的牌，按手牌里的先后。
  风箱（Bellows）把开场手牌升级：牌堆里是「打击」，手里是「打击+」，按同一张牌算。
- **为什么 XSPH F48 六次一模一样**（notes/sl-retry-report.md §3）：游戏在同样打法下完全确定；代码也确定——回合求解器没有随机性，rollout 的种子
  是「局 id + 幕 + 层 + 回合」的哈希（rollout-live seedOf），同一局面每次尝试抽同样的样本、得出同样的数，随机药水的蒙特卡洛和 B2 的种子也是固定的；
  T1–T4 每条线在 rollout 里都是每个样本都死（「saturated」，数字分不出线），B2 的 600 个样本里每条线都是 0 胜；Jev 的概率在几次之间有几个百分点的差别
  （题面多了 previous_attempts，T1 的 rollout 样本数被时间砍成 6 / 4 / 8），但最高的选项从没变过，循环照最高的走。
- **敌人行动**：能比的回合都一样（XSPH F48 也是）。但这 5 场的敌人都是固定脚本（碾碎者+火箭在两局不同的种子里 T1–T5 招式完全一样；女王、火炬头聚合体、实验体也是一招接一招；move-model 里
  它们每招只有一个后继，千足虫只在死亡时多一个重接），rollout 的招式模型本来就几乎确定。对招式真随机的 boss 还没有一次重打的证据，
  所以**没有做**「按前一次的敌人招式算」（待定，见回报）。

### 10.2 已知抽牌（SL_RETRY_KNOWN_DRAWS，src/sl/draws.ts）

- **记录**：控制器每读一个战斗状态就交给这次尝试的 DrawTracker：比较上一个状态，离开抽牌堆（按卡 id + 升级）并且新进手牌的牌按手牌顺序记下
  （新回合手牌全部算候选，回合内只看比上个状态多出来的；从手牌末尾往前对，所以保留在手里的同名牌不会被当成新抽的）。洗牌那一步，旧牌堆剩下的牌先抽
  （手牌里前几张，必须正好是旧牌堆那几张）仍算顺序，之后的不算；有牌被放进抽牌堆、牌离开抽牌堆却没进手牌、或者跟踪不是从这场战斗第一帧开始的
  （进程重启），从那里起都不算。`clean` 是可用的前缀长度，`broke` 是断的原因；整条记录写进这次尝试的 sl-attempts 行（`draws`），进程重启后照样读得到。
- **使用**：第 k 次尝试开始时，取前面几次尝试 `clean` 部分的公共顺序（两次有重叠部分不一致就整个不用，并写明哪次第几张不同）。每个状态核对：这次到目前
  为止抽到的牌必须逐张等于已知顺序的前缀，这次也没断过，而且现在的抽牌堆里装得下已知顺序剩下的牌；不满足就这次尝试剩下的部分不用，控制台一行
  `SL: the draws left the order attempt 1 saw (F25 T5 attempt 2): T5: reshuffle (...); random draws from here`。满足时 env.sl.knownDraws 是接下来的牌（下一张在前）。
- **规划里**（combat-plan，每个用到的地方都按抽牌堆列表的位置对上同一批牌；任何一张对不上就不用）：
  - 回合求解器：抽牌牌先抽已知的牌，作为能打的牌进这条线（`SolverInput.knownTop`，牌号从 700 起），超出已知部分的才是期望值。两张抽牌牌按打出的先后分已知的牌。
    这条线打出抽牌牌后循环照旧重新规划，用的是真抽到的牌。
  - rollout：每个样本的抽牌堆顶上是已知的牌（按顺序），只有其余的洗乱（`RolloutInput.piles.drawTop`）；后面回合的手牌因此也是已知的，直到用完。
  - 随机药水的蒙特卡洛：抽牌类药水的样本先抽已知的牌。B2（整场模拟）：每个样本同样先抽已知的牌。
  - 题面：一行 `known_draws`（§6），previous_attempts 的 note 多一句；log 的 `sl_retry.known_draws`。
- **局限**：只到前面尝试第一次洗牌为止（一副 25–40 张的牌组大约是前 5–8 回合）；后面的洗牌顺序不知道。没有记录前面尝试打出顶牌这类事件的位置，
  遇到就停在那里。核对在状态之间做：抽牌牌打出后、下一个状态读到之前用的预测如果错了，那一步算错（下一个状态发现后停用）。judge（§2）不变：
  有能打的抽牌牌时 least-loss 仍然否决（Dai：判定不放宽）。

### 10.3 多算（SL_RETRY_COMPUTE）

第 2 次尝试起（`RETRY_COMPUTE`，src/sl/controller.ts）：rollout 24 个样本（平时 8）、每个规划题的预算最多 20 秒（平时 1.5 秒），同一回合的几道题
（抽牌后重新规划会再问）合计最多 30 秒（像 B2 的回合预算；用完后的题回到平时的 1.5 秒；记在屏幕记忆 `slRetryCompute`，键里有第几次尝试）；随机药水 36 个样本、1.2 秒（平时 12、0.4 秒）；
B2 每条线 1200 个样本（平时 600；它自己的每题 25 秒、每回合 30 秒上限不变）。rollout 的时间表多了 5 回合 × 24 / 16 / 12 三档，排在原来的 8 样本时间表前面，
预算不够时照旧往下降。理由和测量见 notes/sl-retry-report.md §6–§7：实盘时钟（机器有对局在跑）在 607 个已记录的死亡局规划题上，多算后每题中位 1.1 秒、p90 9.9 秒，
93% 的题跑满 24 样本 × 5 回合（平时 1.5 秒只有 70% 跑满 8 × 5），30/607 题超过 15 秒；千足虫这类重局面 20 秒内跑到 16–24 个样本（平时 1–4 个、3 回合）。
B2 600 样本在已记录的 boss 题上多数 0.02–3 秒（20 线程），翻倍后由它自己的上限截住。Dai 之前接受过 boss 每回合多 20–30 秒。
同一题换随机数的对照：8 个样本时 rollout_best 有一半会变，24 个样本降到 38%；有已知抽牌时 8 个样本已是 35%，24 个样本 31%——已知抽牌以后多算几乎不再降噪，
多算主要帮已知抽牌用不上的回合和实盘被砍样本的重局面。

### 10.4 失败保护和开关

- 规划里用到已知抽牌或多算的任何一步抛错：整题去掉这两样重新规划（`withSlRetryFallback`，和 MECH_RULES 的做法一样），等于两个开关都关。
- 控制器里记录 / 核对出错：这次尝试不再用已知抽牌，SL 本身照常。
- 两个开关都关（或第 1 次尝试）：题面、Jev 看到的内容、每个答案的结果与 v4 3488dc5 逐字节相同（tests/sl-retry-planner.test.ts：4 个已记录的重打局面，
  在 3488dc5 的 git archive 上算的摘要）。sl-attempts 行照样记 `draws`（只是日志）。

- 附带（同一个提交）：已知抽牌让求解器的线多很多，`distinctPlans` 原来两两比较支配关系（O(n²)，JW925EDF9ZTQ F48 T1 108 秒）；改成按结果向量的字典序排序、
  只和已找到的前沿比，结果集合和原来一模一样（注释里有证明；所有钉住的摘要不变），这一题 3 秒，开关关时的同一题也从 12 秒降到 0.7 秒。

### 10.5 离线评估（notes/sl-retry-report.md）

tools/sl-retry-replay.ts 把已记录的局面按四种情况重新规划（off / draws / compute / both，另有换随机数的 off2 / draws2 / compute2 / both2 量噪声），
tools/sl-retry-summary.py 出表。要点：
- 212 场 A8+ boss / 名单战死亡局的 T1–T3（635 题）：70% 的题拿得到已知抽牌；rollout 的最优线「没有样本死」净多 17 题（换随机数的对照净 2 题），
  预测的死亡比例和掉血平均几乎不变。
- 噪声很大：同一题换随机数，8 样本的 rollout_best 有 47% 会变；已知抽牌降到 33%；所以多算在已知抽牌之后仍然有用。
- XSPHCB4GUSEU F48（6 次一模一样的女王）：加了已知抽牌和多算，T1、T3 的最优线变了，但没有一条线在任何样本里活过 T5，B2 每条线 0 胜。

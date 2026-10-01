# SL：boss 和难打精英的死亡重打（src/sl/）

Dai 2026-10-01/02 定：目标改为让模型快速学习、看能摸到多高的天花板，允许 SL，但做最简单的版本——**只在死亡时用**：
boss 战、以及按战绩最难打的 5 种非 boss 战斗（src/sl/sl-elites.json，不限精英），在「这回合一结束就必死」时不结束回合，回主菜单再「继续」，
游戏从进房间时的存档把这场战斗从第 1 回合重新开始，换打法再打；赢了接着往下打。不做构筑分叉、不做 boss 实验室，
**不读、不写、不复制任何存档文件**（Dai 10-02），不改随机种子。架构不变：Jev 出牌，DeepSeek 做构筑、路线和战斗计划。
`SL_ENABLED` 默认关；关的时候对局循环、题面和日志与没有 SL 时逐字节相同（tests/sl-loop.test.ts、boss-lines-planner 的 golden）。

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
| 「继续」回到这场战斗的第 1 回合，抽牌和敌人行动与第一次相同（同样的打法得到同样的结果） | Dai 10-02：这是这类游戏的 SL 规则，默认如此；存档里有各随机数发生器的状态 | 按 Dai 的规则当作前提，不做自测；代码只做轻防护（§3） |
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
  `reload`（ok、ms、resumed_turn 或失败的 step、reason）、`give_up_reason`、`summary`（每回合血量 / 格挡 / 敌人血量 / 出牌、喝的药、谁打死的）。
- **decisions.jsonl**：SL 开着时每行加 `sl_attempt`（正在打的 boss / 名单精英战是第几次，战外 null）和 `sl_reloads`（这局到此重打几次；
  0 就是「到此为止都是第一次尝试的打法」）。SL 关时没有这两个字段。
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

`SL_RETRY_SHOW_SIM`（默认开）：重打的 boss 战即使是低可信 boss，也把整场模拟的数字放进题面（每个选项的 `whole_fight_sim` 以
「low confidence:」开头，另有 `whole_fight_sim_trust: "低可信 (low trust): ..."`），只作换思路的参考；排序（rollout_best 等）仍按原规则，
低可信 boss 不按模拟排。

## 7. 配置

| 变量 | 默认 | 含义 |
|---|---|---|
| `SL_ENABLED` | off | 总开关 |
| `SL_BOSS_RETRIES` | 5 | boss 战最多 1 + 5 次（Dai 2026-10-02） |
| `SL_ELITE_RETRIES` | 3 | 名单里的难打战斗最多 1 + 3 次（Dai 2026-10-02） |
| `SL_RETRY_SHOW_SIM` | on | 重打时低可信 boss 也给整场模拟（标低可信） |
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
- **复盘**：同一层的回合数会从 1 重新开始；看 decisions 的 sl_attempt 区分是第几次。

## 9. 上线步骤（运维会话）

1. B2（jev-sts2-v4sim）和 v4-sl 都合进 v4 后，运行工作树 jev-sts2-v4run 的 .env 加 `SL_ENABLED=on`（次数用默认，或按 Dai 定的）。
2. 第一局里第一次 SL 时看控制台：`SL: certain death foreseen at F.. T.. attempt 1/4 (rules: ...)` → `SL: save_and_quit -> completed`
   → `SL: continue_run -> completed` → `SL: back in the fight at F.. T1 (.. s); attempt 2/4 begins`。logs/sl-attempts.jsonl 那一行
   `reload.ok = true`、`resumed_turn = 1`。若 `resumed_turn` 不是 1（游戏在战斗中途也存档），或出现 `reload failed at ...`，记下原因告诉
   开发会话（SL 已自动在这局停用，对局继续）。
3. 统计：`tools/eval/metrics.py --group-by version --md` 里看「第一次尝试」各行和最终成绩并列。
4. 回退：.env 里 `SL_ENABLED=off`（或删掉这一行），下一局起生效。

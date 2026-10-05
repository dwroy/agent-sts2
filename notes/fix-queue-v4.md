# V4 A8 批次（20 局）的非阻塞 bug 队列

这一批代码冻结，只合阻塞性修复。下面的纯 bug 等 20 局打完再修（在 jev-sts2-v4step / v4-step 上，按 ops/ops-session-v4-prompt.md 的合入流程）。file:line 以 jev-sts2-v4run（v4-live de62ab5）为准。

- 2026-09-30 10:09 boss 时钟题面血量把回血额度当成本体血量：`src/strategy/boss-clock.ts:200` bossHp() 返回 `db.hp + profile.addedHp`，`:1141` hpNote 再把这个和标成「(A8)」来源。证据：HFNEL0CRKF96 F17 大脑 16 道题都写瀑布巨兽「270 (A8)」，A8 实测 250（多的 20 是回血）；Y648C8QL2MRX 同族写「259 (A8)」，实际神官 199 + 60。只是题面误导，不阻塞。
- 2026-09-30 14:12 失败的大脑调用在 brain.jsonl 里记 0 耗时、0 用量：`src/brain/router.ts:446-447`（`result?.latencyMs ?? 0`、`result?.usage ?? {0,0}`）。证据：41VAUAM2EFY7 F34 event/act-plan 实际 300 s 超时（控制台 10:04:15 → 10:09:15），brain.jsonl latency 0、usage 0；A8ENYFR4ZWKG F15、RUDHQ1KJ49P8 F11/F37 三次非 JSON，deepseek-reasoning.jsonl 记 1,042 / 815 / 1,787 输出 token，brain.jsonl 记 0。metrics 的大脑耗时和成本因此偏低。不阻塞。
- 2026-09-30 14:12 DeepSeek 回答是合法 JSON 但后面多了字，整题判成非 JSON：`src/llm/deepseek.ts:580-584` parseChoice 用严格 JSON.parse（`:303` pickJsonObject 也只收纯 JSON）。证据：RUDHQ1KJ49P8 F11（合法 JSON 后接「Wait — …」和第二个 JSON）、F37（JSON 后多一个 `'`）；A8ENYFR4ZWKG F15 content 为空。三次都从推理里找回了选择，但 RUDH 两次的路线答案丢了（route_review invalid 2 次；原答案是 keep，没造成错误动作）。不阻塞。
- 2026-09-30 14:12 run-config 记的知识前缀和这局多数调用用的不是同一份：`src/brain/knowledge.ts:113-130` 在知识文件或 notes/lessons.md 变了时重渲前缀，`src/telemetry/run-config.ts:119-120` 只记开局那份。上一局结束后的知识刷新和下一局开局重叠，每局开局 2–3 分钟内系统提示换 1–2 次；6 局 24 次冷缓存（每次约 12.5 万 token 没命中），全在开局前 5 分钟或重启后。按 prefix_sha / config_sha 分组会分错（WLM6YKJ0ASNE 因此被 metrics 标成「局中改过配置」）。不阻塞。
- 2026-09-30 tools/build-fight-value.py:148 `_observe` wraps build-monster-db's observe_combat with a 3-arg wrapper; build-monster-db.py:392 now calls observe_combat(fight, state, ts, piles) → TypeError, so fight-value/gates stop refreshing (present on v4 f344e81 too; found while rebuilding knowledge for V4.1 at merge 1c40090). Not blocking play. Owner: V4 dev (tools on branch v4). **Fixed on v4 in aba384c (09-30); not cherry-picked into v4-live during the 20-run batch (non-blocking; would change the fight-value data Jev sees mid-batch) — cherry-pick after the batch.**
- 2026-09-30 18:24 jev-sts2-v4run/src/strategy/rollout-live.ts:479/:458/:493 (+:691): a rollout cut to 1 sample by the time budget still counts as "all lines die" (saturation), and the saturated pick "least HP lost this turn" nets potion healing (Blood Potion) against loss → W80JV2YVC8UZ F48 T1 picked a 24-damage line over 68–73 and drank Blood Potion at 84/88 for +4. Suggest: 1 sample never saturates; saturation compares play HP loss excluding healing potions. Not blocking.
- 2026-09-30 20:26 jev-sts2-v4run/src/strategy/rollout-live.ts:488-494 (+:458, :500-502): when every line is judged dying (saturated — in clock boss fights from T1: CDR0 Insatiable 9/9 questions, F4K8 Queen 10/10), ranking is deaths → this turn's HP loss → only then enemy HP left, so the rollout best is the turtle line (CDR0 T5: -9 HP / enemy ~116 left chosen over -16 / ~66). Jev follows the rollout best 89–95%. Not a stall/crash so not blocking under the batch rule, but likely costs boss fights (CDR0, F4K8, W80J). Related: kill-order experience (Amalgam/Rocket first) has no weight in rollout ranking (:470/:500, leader rule excludes the Queen) — design gap.
- 2026-09-30 22:27 jev-sts2-v4run/src/screens/oneshot.ts:328 + src/screens/selection.ts:351: rest-site smith offers the brain the whole deck, but the mod's deck_upgrade_select lists only the first 25 cards (index 0–24); a pick past 24 (0U96 F47 deck[36]/[40], Z3DF F47 deck[36]/[37]) is dropped silently and the brain is re-asked (~130 s each), then a different card is upgraded (Rolling Boulder+ instead of Inferno; 2nd Bludgeon+ instead of Inflame). Not blocking (no stall). Fix: offer only the listed cards or page through.
- 2026-09-30 22:27 (note) rollout.ts:2124 ranks potion lines on a value including the model win probability that Jev doesn't see (Z3DF F46: shown total says drinking worse, still rollout best). Design/transparency gap.
- 2026-10-01 02:25 jev-sts2-v4run/src/strategy/potion-mc.ts:219 (budget :30): the random-potion Monte Carlo checks the clock only after its minimum samples, so its 400 ms budget isn't enforced (DT1H F42 knights T1: 1795+1023 = 2818 ms); rollout-live.ts:640 subtracts that from the 1500 ms rollout budget (passed at combat-plan.ts:2187) → rollout gets 0 ms and falls back to 1 turn; fallback text at rollout-live.ts:746 blames the rollout's own budget. DT1H had 14 one-turn fallbacks. Not blocking.
- 2026-10-01 03:57 jev-sts2-v4run/src/screens/combat-plan.ts:478-480 (called from :2460): the elite/boss HP guard compares effectiveLoss = HP lost + potion held value against max(8, 10% HP), so a potion whose held value is above the slack (FYSH_OIL 9.1) is vetoed on every line at elites, even at equal HP loss and when Jev's pick is the rollout best (which already priced the potion); fight-long Strength ignored. G3MU: 10 vetoes (F7 T3 ×2, F9 T1–T5 ×8); F9 骇鳗 50→7, oil only drunk T6. Not blocking. (Also double-counts the potion cost the rollout already applies.)
- 2026-10-01 04:36 jev-sts2-v4run/src/strategy/turn-solver.ts:2748 vector() has no axis for enemy Strength (strengthDelta only in the score, :2347), so dominates() (:2752) let a FIGHT_ME line "dominate"; combat-plan.ts:2085-2086 then auto-played it without Jev (9FVE F33 T6); the +1 enemy Strength made T7's bite exactly lethal (31 = 28 HP + 3 block). Not blocking.
- 2026-10-01 04:36 jev-sts2-v4run/src/strategy/potion-mc.ts:49-57 beatsDryLine() judges a random potion by this turn only; the lasting value of the Power it produces is ignored (9FVE F33: Power Potion bought for the boss, "beats 0/12", never drunk, died holding it). Not blocking.
- 2026-10-01 09:40 **以上 V4.1 期间的 fix-queue-v4 条目（12 条）已在 v4 531d154 修复，随 V4.2（v4 69a33f9）合入 v4-live 265ff66。** fight-value 构建脚本 aba384c 同样随 v4 合入。
- 2026-10-01 12:30 (V4.2) jev-sts2-v4run/src/sim/build-sim-facts.ts:387: the card reward right after a boss is simulated against the boss just killed (5× in V4.2 runs 1–3; the brain quoted those deltas). Not blocking.
- 2026-10-01 12:30 (V4.2) src/sim/build-sim-facts.ts:458: low-win-rate note says the calibrated floor is "约 8%"; actual floor 6.24%. Cosmetic.
- 2026-10-01 12:30 (V4.2) planner counted damage for an X-cost card (串刺) played after 无情猛攻+ at 0 energy (ZRYR F39 T1: predicted 70, dealt 58). file:line not found yet.
- 2026-10-01 12:30 (V4.2, design) low-trust bosses still run the full boss sim (up to 25 s/question) only for logging: Crab ~84 s and ~154 s per fight (6 timeouts). B3 deltas from small samples (40–160) quoted as real; suggest hiding deltas under ~300 samples; Crab/Test Subject build deltas all sit at the 6.24% floor.

### V4.2 第 4–6 局复盘补充（2026-10-01 15:05）
- 无新纯 bug。已知项复发：build-sim-facts.ts:387（ALBM F17、R6V3 F17/F33，R6V3 F17 引用 +11.6 后选中）；小样本 B3 差值被引用（R6V3 F22 n=24、F29 n=72、F32 n=96、F43 n=88、F44 n=48）；低可信 boss 满时模拟（R6V3 帝王蟹约 112 s，3 题超时；女王约 36 s）。
- mod 战中选牌屏请求超时 4 次（ALBM 3 次知识恶魔诅咒选择，R6V3 1 次「拿进手牌」），约 13 s 自愈，不阻塞。
- R6V3 F9 DeepSeek 空内容，从推理找回选择，路线答案丢失（同已知类）。
- 设计观察：低可信 boss（瀑布巨兽，NBCD）整场模拟 7 题一致比 5 回合 rollout 更偏多打伤害（差 14–28 个百分点）；rollout 看不到「越晚打死自爆越大」。

### V4.2 第 7–9 局复盘补充（2026-10-01 16:35）
- **钢笔尖 PEN_NIB 被算在手里每张攻击牌上**：src/strategy/card-model.ts:182-190 `dyn()` 读 mod 显示伤害（current_value），钢笔尖就绪时 mod 对手里所有攻击都显示翻倍，游戏只翻下一张；活力有 stripVigor（:200），钢笔尖没有对应处理。证据 GSG0 F33 T2：计划预测 86 实打 53。不阻塞。
- 设计缺口：血量护栏 guardKeepsPick（combat-plan.ts:514-521）只比 rollout 死亡数，不比胜率/价值；simWinsLess（:2494）只对可信 boss 生效。W5PT F33 T3 护栏把 Jev 0.92、rollout 最优（63%）换成 53% 的线。不阻塞。
- 已知项复发：build-sim-facts.ts:387 三局 F17 都中且被大脑引用；战中选牌屏 mod 超时约 13 s（GSG0 2 次、RPC6 2 次）自愈。gate_reject 0，DeepSeek 空内容 0，低可信 boss 无泄漏，B3 无小样本（最小 360）。

### V4.2 第 10–12 局复盘补充（2026-10-01 18:33）
- **魂缚锁链锁住的牌被当成「只是能量不够」**：src/strategy/card-model.ts:595 `playable: … || unplayable_reason === "not_enough_energy"`，被锁牌在 0 能量时 mod 报 not_enough_energy，但 unplayable_preventer_id=CHAINS_OF_BINDING_POWER；turn-solver.ts:1156 只锁同一计划内其余魂缚牌，不知道本回合已打出过一张。证据 4JGP F48 T2（帧 4817188058/4817282082）：计划「能量药水、防御+」预测掉 2 血，喝药后 blocked_by_hook，结束回合实掉 10 血，药白喝。不阻塞。
- 已知项复发：build-sim-facts.ts:387（THR F17「地狱狂徒 6%→56%」被引用后选中）；小样本 B3 差值被引用（THR F29/F37、4JGP F27/F32）；低可信 boss 满时模拟（4JGP 帝王蟹约 110 s、3 题超时）；战中选牌屏 mod 超时约 13 s（THR、KSPL 各 1）。gate_reject 0、DeepSeek 空内容 0、无泄漏。

### V4.2 第 13–15 局复盘补充（2026-10-01 21:05）
- 无新纯 bug。已知项复发：build-sim-facts.ts:387（三局都中，KXG7 F17、JR6E F33 被引用）；低可信 boss 满时模拟（帝王蟹 75.5/38.2 s、女王 36.9/48.5 s、实验体 19.3 s）；mod 超时约 10 s 自愈（KXG7 还出现在地图和火堆屏）。gate_reject 0，魂缚误判未复发，无泄漏。
- 观察：rollout 被时间预算砍到 2 样本、3 回合的题仍给出「最优」喝药线（KXG7 F27、JR6E F45），可能与机器负载/低可信 boss 满时模拟抢 CPU 有关，待窗口报告看负载。

### V4.2 第 16–19 局复盘补充（2026-10-01 23:38）
- **血量护栏 bigHit 让「保留能力牌」例外失效**：src/screens/combat-plan.ts:1783、:2047-2054，guardKeepsSetup 首条件 `!bigHit`（来袭减格挡 ≥ max(12, 25% 血)）。GTU2 F33 T1 21 ≥ 20，恶魔形态+（−17）被换成攻击线（−13），整场没再抽到；只进日志的整场模拟排恶魔形态+ 第一（44.9% 对 5.3%）。同一题 rollout 被砍到 3 回合 1 样本、10 线并列。:2052 注释里 5BXM 是同一问题，bigHit 绕开了那次修复。不阻塞，但很可能决定了这场 boss。
- **性能：可信 boss（同族 THE_KIN）整场模拟每题超时**（1HF7 F17：9 题全超时，8×25 s + 1×5 s，样本 75–596，一场约 215 s；同场 rollout 全降级，T1 只算 1 回合）；一幕同族 B3 11 题 <300 样本。CPU 争用的最明显证据。不阻塞。
- 已知项复发：build-sim-facts.ts:387 四局都中（NWVL 关键牌绯红披风、烙印+ 是它碰巧选中的）；小样本 B3 引用（1HF7 7、NWVL 4、GTU2 2）；低可信帝王蟹满时模拟（NWVL 136.5 s、GTU2 78.7 s）；mod 超时约 10 s 自愈（还出现在事件屏、结算屏；NWVL 6、1HF7 4、GTU2 2）。gate_reject 0，DeepSeek 空内容 0，无泄漏。

### V4.2 第 20 局复盘补充（2026-10-02 00:26）
- 设计缺口：遗物钗 SAI（每回合 7 格挡）在 rollout、整场模拟、boss 时钟里都没建模：src/strategy/rollout-live.ts:319-324 relicBlockOf 只认 CAPTAINS_WHEEL，:344-373 fightRelicsOf 无 SAI。8D8D 女王 T1 rollout 判「每条线都死」、模拟胜率 16%，实际 T1–T5 只掉 11 血（赢了）。不阻塞。

### V4.3 第 1–3 局复盘补充（2026-10-02 10:29）
- 回合开始状态未稳定就问 Jev（能力层数随后 +5，如滚石 5→10），src/loop.ts:1409-1413 重读拦住后重问；JJ75 8 次，每次多一题 Jev 约 0.5 s。根因未定位。不阻塞。
- 事件完成后事件屏仍显示旧选项，重问 DeepSeek 一次（JJ75 F31 熔合打击，20.3 s、约 13.7 万输入 token）。不阻塞。
- 帝王蟹转可信后整场模拟偏悲观（KMB1：T1「胜率 6%、100% 死在 T4」，25 s 仅 177 样本；实际 T6 胜），Jev 选线与模拟一致、未造成错误动作；仅 1 局样本，待观察。
- 已知项复发：build-sim-facts.ts:387（三局都中，GBBB F17 引用 +5.8 选恶魔形态）；小样本 B3 被引用；mod 超时约 10 s 自愈；可信 boss 同族 T1 两题超时；低可信沙漏/沙虫满时模拟。gate_reject 0，无泄漏。

### V4.3 SL 首次触发（2026-10-02 12:24，JW92 F48 实验体）
- **SL reload 误判失败**：回到 F48 T1 后第一屏是回合开始弃牌 CARD_SELECTION（actions: select_deck_card, confirm_selection），SL 的 back_in_fight 只认 COMBAT，60 s 超时 → reload.ok=false、give_up 停用本局 SL。实际读档成功、主循环处理弃牌后从 T1 重打并通关。sl-attempts.jsonl 2026-10-02T04:02:32Z 那行；控制台 20261002-110526 第 2138–2160 行。
- 超时后主循环先执行了 T10 遗留的 least-loss end_turn（12:02:32，"action came back pending"），之后才是弃牌和 T1 计划；需确认 end_turn 没有作用在重载后的 T1 上。
- **已修（2026-10-02 12:32 确认）**：SL back_in_fight 现在接受战斗内带本场决策的画面（T1 CARD_SELECTION 算回到战斗）——v4 0660f99，合入 v4-live 14ad753（12:31，开发会话按 Dai「这类修复直接上线」合入），下一局起生效。遗留 end_turn 经开发会话核对未发出（decision log 04:01:27Z 记 "not dispatched: SL reload failed…"；"came back pending" 属于随后的弃牌动作），重载后的 T1 未受影响。

### V4.3 第 4–6 局复盘补充（2026-10-02 13:04）
- **SL previous_attempts 敌人只写名字、不分节**：src/sl/controller.ts:175、:263，出牌目标和敌人列表只写「残杀千足虫」，同题选项是「残杀千足虫 (MIDDLE)」。VNKN F25 赢的关键恰是打后节不打中节，Jev 看不出之前打的是哪一节。不阻塞。
- JW92 F46 DeepSeek 返回 JSON 多一个「]」，逐步重问恢复，多 97 s（模型输出错误）。
- 已知项复发：build-sim-facts.ts:387（5DFX、VNKN 被引用后选中）；B3 小样本（5DFX F27–F29 仅 24 样本）；mod 超时约 10 s 自愈（5DFX 5、JW92 3）；帝王蟹可信后整场模拟每场 98–142 s，多题撞 25 s 上限。gate_reject 0，无泄漏。
- **已修（2026-10-02 13:10 确认）**：SL previous_attempts 敌人名与战斗选项一致（distinctNames，如「残杀千足虫 (MIDDLE)」），v4 7564be3 → v4-live d5dd04f（13:09），下一局起生效。

### V4.3 第 7–9 局复盘补充（2026-10-02 15:36）
- **SL 判官高估无惧疼痛格挡**：src/sl/judge.ts:96 `endBlock += powerAmount(player,"FEEL_NO_PAIN_POWER") * hand.length`，把手里所有牌都算成回合末会被消耗；实际只有虚无牌会（card-model.ts:630 已能识别）。7PWU F48 T6：判「35 来袭 − 32 回合末格挡 < 14 血」不必死，实为 0 格挡，T6 直接死，浪费剩余 4 次重打。judge=null 是因 controller.ts:341 只在必死时写。不阻塞跑局，但带无惧疼痛的牌组基本用不上 SL——**建议优先修**。
- **持有果汁时构筑模拟报错**：src/screens/combat-plan.ts:1853-1856 持 FRUIT_JUICE 直接返回 combat/potion-now 不调求解器，src/sim/boss-start.ts:435 抛「the planner built no board for the synthetic boss frame」。GWGT F22–F27 6 题、5DFX 1 题，大脑没拿到模拟数字。不阻塞。
- 观察：7PWU F47 火堆两次「state changed while deciding」，各弹出 CARDS_VIEW 被关掉，多 47 s、两次 DeepSeek（各约 14.4 万输入 token）。根因未定位。
- 已知项复发：build-sim-facts.ts:387（三局都中）；B3 小样本；mod 超时自愈。gate_reject 0，无泄漏，无小偷战斗，mech 字段 0 次（未遇适用敌人）。
- **已修（2026-10-02 15:43 确认）**：SL 判官无惧疼痛只计手里虚无牌（v4 a677f15），7PWU F48 第 2 次 T6 重放判必死；死亡行保留最后一次「not certain」判定。果汁时 B3 合成 boss 开局把果汁移出药栏（v4 7f4759d）。均合入 v4-live e7c1718（15:43），下一局起生效。两条关闭。

### V4.2/V4.3 队列第二批修复（2026-10-02 17:00，分支 v4-fix2 c301574，基于 v4 5e7cf79；待主会话审核合入）
- **已修** build-sim-facts.ts:387 打完本幕 boss 后的构筑题按刚打死的 boss 模拟：boss 层、本幕地图、不在战斗中时不再模拟（下一幕 boss 状态里还没有），facts.act_boss_sim 说明原因，时钟保留（已标 stale）。7PWU F17 奖励题回归测试——v4-fix2 de5dd9f。
- **已修** build-sim-facts.ts:458 低胜率注的校准下限改为从「pre」映射算出（现 B5 映射 4.7%；V4.2 时 6.24%；原文写死「约 8%」）——de5dd9f。
- **已修** 钢笔尖：就绪时手牌显示伤害减半，求解器按计数把第 10 张攻击（每段）翻倍，rollout 跨回合带计数，整场模拟随之。GSG0 F33 T2 那条线重放 53（原预测 86）。重放 1658 个持钢笔尖的战斗题（rollout 关）：代码首选线变 106 个、自动动作变 22 个——26c1e77。
- **已修** 魂缚锁链：unplayable_preventer_id 有钩子（魂缚、树懒、烟雾、钟鸣；日志 258 张）的牌不再因 not_enough_energy 当可打。4JGP F48 T2 不再为被锁的防御+喝能量药水——2864d36。
- **已修** 血量护栏 setup 例外：`!bigHit` 改为大伤回合要求 rollout 里死亡数不多于替换线（无 rollout 时按原血量门槛）；另一半根因是 FIGHT_PLAN=off（9-30 起所有对局）时 setupCount 恒为 0，例外从未生效，现在无战斗计划时精英/boss 战打出的能力牌算 setup。GTU2 F33 T1 恶魔形态+ 不再被换。V4 的 110 次 Jev 护栏换线中按血量门槛有 6–7 次会保留能力牌线——984b950。
- **已修** 钗 SAI：rollout 每回合 7 格挡、整场模拟第 1 回合、boss 时钟每回合掉血减 7（只减有攻击的回合）——16e0b16。
- **已修** 迷失鬼火 LOST_WISP：求解器每打一张能力牌对所有敌人 8 点（穿格挡、不吃力量/易伤，日志 7 局一致），rollout 和整场模拟随之；8L29 F33 T4 撕裂打死 5 血火箭、碾碎爪 106/99 格挡——c68bf25。
- **已修** X 费攻击「伤害 X 次」（串刺等）按 X 次命中，0 能量 0 次；ZRYR F39 T1 重放 58（原 70）。与无情猛攻的免费攻击无关——7e69e67。
- **已修** 回合开始未稳定就问 Jev：根因是滚石的回合开始钩子先造成伤害、约 1 秒后才 +5，此时 mod 已报 ready/settled（日志 53 个持滚石的回合开头有 46 个先显示旧层数；25 次战斗重问中 15 次是它）。新回合滚石层数没涨时等待，最多 2.5 s——c301574。
- 合并检查：v4-fix2 与 v4 4072ad0 三方合并无冲突，合并后 tsc 通过、vitest 123 文件 1864 测试全过。

### V4.3 第 10–12 局复盘补充（2026-10-02 18:32）
- **SL 判官漏判手牌回合末伤害（凋萎、毒素、灼伤等）**：src/sl/judge.ts:112 先要求 mod 的 end_turn_will_kill_player === true，否则否决；mod 只比敌人意图与当前格挡，不算手里回合末伤害牌。:103-107、:121 判官自己的账也不算。controller.ts:290-291 只有 mod 标记 true 时才打 SL: 行，漏判在控制台不留痕。证据 TMNF F48 永世沙漏 T8：15 血 + 28 格挡，来袭 19×2=38 + 凋萎+ 回合末 9 = 47 > 43，规划器已判 every line dies，判官未判，5 次重打未用。不阻塞跑局。
- 观察：负载时段（R6E8 07:56–08:05Z，离线重放占 19 核）rollout 降级率 32%（时段外 22%），改了 5 题选择，均为 1–2 血或目标同类差异，不影响结局。
- 帝王蟹（TMNF F33）：独爪无背击 ×1.5 与实际一致；T1 题 25 s 内 0 样本（无法算 Brier）；T2–T8 胜负全对、前半掉血多估约一倍；14 题 180 s，6 题撞上限。
- 已知项复发：build-sim-facts.ts:387（fd90a10 已修）；小样本 B3；mod 超时自愈。gate_reject 0，无泄漏，小偷金币已拿回（TMNF F14）。

### V4.3 第 13 局 LTKW 复盘（2026-10-02 18:58）
- **蜥蜴尾巴触发后没被识别为已用**：src/screens/combat-plan.ts trackLizardTail（fd90a10 :3473；a23019c 行号 +13）每个状态都覆盖 tail.last（:3503），判定已用（:3493）要求上一状态属更早回合且必死；复活发生在敌方回合（仍是 T4），中间帧把 last 覆盖成「不必死」，T5 第一帧认不出（推测，中间帧不落 states.jsonl）。证据 LTKW F37 尾巴触发（7→37/74），F43/F44 求解器与 rollout 仍按「还能复活」算，F44 T1 10 条线都写「spends 蜥蜴尾巴」。不阻塞，但 F43 选线被带偏。
- **已修（2026-10-02 19:03 确认）**：蜥蜴尾巴识别只用我方回合的状态更新「致命」标记，v4-live 8c93fa4（19:00），下一局起生效；该条关闭。
- **已修（2026-10-02 19:50 确认）**：SL 判官计入手牌回合末伤害（灼伤/凋萎/招引），mod 致死标记为 false 时也能判必死（TMNF F48 T8）；钨棒、跳动的残余精确计算或拒判；并新增必死即提前读档（SL_RELOAD_EARLY）与已知抽牌顺序保留随机插入/置顶。v4-live 491eaeb（19:49），下一局起生效。判官两条关闭。

### V4.4 A9 第 1–3 局复盘补充（2026-10-02 21:45）
- **SL 已知抽牌被误丢**（中，不阻塞）：src/sl/draws.ts:319-325（386efb5）读档后第一帧把手里所有牌记为抽到，含十字弓 CROSSBOW 生成的怨恨 SPITE；第 1 次第一帧手牌为空没记，第 2 次第 6 张对不上。证据 X7BX F48：控制台 21:16:16「drew 怨恨 where the earlier attempt drew 愤怒 (draw 6)」，此后第 2–6 次 known_draws 全为 0。另 draws.ts:533 knownOrderOf 一不一致就整体返回 null，不保留前缀。
- **单个敌人也判随机，挡住提前读档**（小）：src/screens/combat-plan.ts:1860（势不可当）、:1861（锁镰）不看敌人数。X7BX 推迟到 end_turn，晚约 1 s。
- 设计缺口：src/screens/selection.ts:513 用本场平均出牌数估「懒惰」代价，平均正好 3 张估成 0；63WB T6 打满 3 张后 0 费祭品卡手。
- 已知项复发：知识恶魔诅咒选择屏 mod 超时（63WB 12 次，每次约 13 s）；为 boss 买的药路上被喝（1YXM）。run_plan_merge 全部 stored、无 missing/error，带计划的问题没变慢（仅 1 道 reward/card 67.5 s）。无漏判。
- **已修（2026-10-02 22:31 确认）**：已知抽牌只计从牌堆抽出的牌（十字弓怨恨不计），尝试间不一致时保留共同前缀（X7BX F48 离线 0→33 张）；势不可当/锁镰等随机目标只在可打敌人 >1 时算随机。v4-live 3c95965（22:31），下一局起生效。两条关闭。另上线 SL_RETRY_EXPLORE（第 3 次起从死亡处倒推逐个换 Jev 决策点）。

### SL 漏判：下回合开始的自身失血（2026-10-02 23:21）
- 610BBERH4SPP F33 帝王蟹 T3：T3 结束 1 血 + 12 格挡，碾碎爪 5×2 全挡，T4 开始狱火能力「回合开始失去 1 点生命」致死；规划器算了这项（每条线都死），mod 致死标记与判官只算敌方回合。提前读档因音叉被推迟到 end_turn（按设计）。
- **已修（2026-10-02 23:21 确认）**：敌方回合后血量 ≤ 下回合开始自身失血（狱火 1、绯红披风代价）即判必死，钨棒/跳动的残余/回合开始可能回血或护盾/狱火扫场能杀光敌人时不判。v4 fcc89d8 → v4-live 1b4453f（23:21），下一局起生效。关闭。

### V4.4 A9 第 4–6 局复盘补充（2026-10-02 23:56）
- **SL 换线顺序（设计缺口）**：src/sl/explore.ts:241（3c95965）先挑离死亡最近的点；:235 只排除替换线死得更多的点，不排除所有线都 100% 死的点；:16 假设后续尝试沿参考路径走到换线点，但前面的选择没固定，Jev 在 0.5 附近会翻面。证据 R1QJ F33 无厌沙虫：路径 rollout 死亡率 T1 0.33、T2–T4 0.71、T5 起 1.0；第 3 次目标 T8 但 Jev 在 T5 自己翻面、T7 死；第 4 次换 T8（两线都 24/24 死）回到原结局；第 5 次换 T5、第 6 次换 T3，都 T7 死，没有一次撑过原死亡回合 T9。建议从死亡率 <1 的最后一个点倒推，或换线点之前按参考路径重放。不阻塞。
- **已知抽牌被白丢**（小）：src/sl/draws.ts:448-449 探寻打击从抽牌堆选走一张后整个丢弃已知顺序；R1QJ 6 次 T2 都丢，known_draws 只剩 10 张，而 6 次实际 35 张抽牌顺序完全相同。不阻塞。
- 已知项复发：为 boss 留的药路上被喝（XPDA F28、610B F31）。run_plan_merge 全 stored，gate_reject 0；漏判只有 610B（已修）。
- **已修（2026-10-03 01:16 确认）**：SL 换线顺序（所有线全死的点排最后，SL_RETRY_EXPLORE_ORDER）+ 换线点前按第 2 次路径重放（SL_RETRY_EXPLORE_REPLAY）；探寻打击从抽牌堆选牌不再丢已知顺序（SL_RETRY_KNOWN_PICKS，R1QJ T1 已知 5→29 张）。另加 SL_RETRY_EXPLORE_B2（可信 boss 用 B2 胜率把关）、SL_RETRY_EXPLORE_BOSS_POTIONS（boss 战换线可喝药，Dai 定）。v4-live 914515c（01:16），下一局起生效。两条关闭。

### V4.4 A9 第 7–9 局复盘补充（2026-10-03 02:23）
- **SL 判官「有抽牌就不确定」忽略抽牌牌的自身失血**（阻塞 SL）：914515c src/sl/judge.ts:486-487（DRAWS 定义 :301 /抽|draw/i）只要可打牌文字含「抽」就判 not certain，不看该牌自身失血（祭品 HpLoss 6）是否 ≥ 当前血量。证据 R764 F33 知识恶魔 T10：5 血 + 3 格挡、1 能量、手牌只有祭品，恶魔 3/399，来袭 24（控制台 20261003-014109-914515c+dirty.log:1187；states 18:12:43）；实际 T10 开局即必死（最多 64 伤需 67），5 次重打未用。提前读档 :658 facts.draws 一并检查。
- 观察：三幕普通怪 monster DB 样本少（史莱姆狂战士 n=1；巨斧机器人 n=1、HP 82、未写复活），求解器自己认识复活（turn-solver.ts:51），问题在大脑看到的文字。
- 已知项复发：SMNJ 换线落在 100% 死的回合（1b4453f，914515c 已修）；为 boss 留的药路上被喝（三局都有）；知识恶魔诅咒屏 mod 超时 2 次。run_plan_merge 全 stored，gate_reject 0。
- **已修（2026-10-03 03:33 确认）**：SL_JUDGE_ANY_DRAW——抽牌未知时，只要（1）抽牌牌自身失血先致死（缓冲/恶魔之舌/钨棒/无实体可挡时仍保守）、（2）根本抽不到牌、或（3）把可能抽到的每张牌都加入手牌后每条线仍死（搜索完整、数值精确），就判必死。离线多判 3 次（R764、V1MF F33 T6、W5PT F33 T9），全为真死，0 误判。v4-live 79ef4eb（03:32），下一局起生效。关闭。

### least-loss 选了回合内自杀的线（2026-10-03 04:50，JSA5 F48）
- JSA5 F48 女王 T6：2 血 + 7 格挡对 12×5，每条线都死；least-loss 只比总失血，选「血墙, 旋风斩+」，血墙 2 血代价在回合内自杀；金纸抽牌未建模，提前读档按设计推迟到 end_turn，但没走到。
- **已修（2026-10-03 04:50 确认）**：求解器标记回合内致死的线（Outcome.diesOwnTurn），全死时 least-loss 优先能走到回合末的线（该局面改为「战栗→女王, 旋风斩+」），让 end_turn 判官有机会。v4 08ec8f9 → v4-live 566ae3e（04:50），下一局起生效。关闭。

### V4.4 A9 第 10–12 局复盘补充（2026-10-03 04:58）
- 设计缺口：**换线被抽牌牌冲掉**——UK7R 第 4 次换线首张耸肩无视抽牌触发重规划，Jev 选回旧牌，等于重放第 2 次。combat-plan.ts:2531-2537 sameHand（914515c 为 :2160），换线只作用于那一题（:3521）。不阻塞。
- 设计缺口：**第 1 次尝试不算「已试」**——src/sl/explore.ts:264 排除，:484 回落「played as answered」；UK7R 第 5 次完全重放第 1 次，9V7K F45 第 4 次回落第 1 次的 T3 线并早死一回合。不阻塞。
- 观察：重放每次都走到换线点（deviation.reached 全 true）；known_draws 每局保持到首次洗牌（25/26/28/35 张），洗牌后打法相同时抽牌也相同；SL_JUDGE_ANY_DRAW 0 次触发、0 误判；run_plan_merge 全 stored；gate_reject 0。
- JSA5 自杀线已修（566ae3e，见上）。
- **已修（2026-10-03 06:22 确认）**：SL_RETRY_EXPLORE_CANON（第 1 次也记为已试；按卡 id/药/目标的无序键比较）、SL_RETRY_EXPLORE_TURN（换线点后本回合不得以失败尝试的出牌收尾，抽牌牌换线不再被重规划冲掉）。v4-live cab3c3f（06:22），下一局起生效。两条关闭。已知局限：相差 1 血的局面不算同一局面（9V7K F45 a4、JSA5 F33 a6），复盘留意近似重复。

### V4.4 A9 第 13–15 局复盘补充（2026-10-03 06:26）
- **我方被缩小时伤害算高**（不阻塞，一幕缩小甲虫常见，建议优先）：src/strategy/turn-solver.ts:1662（HEAD :1663）`perHit = shown + next.strength * weakFactor`，本回合新加力量没乘 0.7；且 src/screens/combat-plan.ts:2454 `shrunk: powerAmount(player,"SHRINK_POWER") > 0`，玩家身上该值恒为 −1（1432 帧、156 局），turn-solver.ts:1209 的 ×0.7 从未生效。mod 显示数值已含缩小（打击 6→4）。证据 XC4T F9 T3：预测打 16 掉 9，实际打 14 掉 24。修法同虚弱：shrunk 改 ≠0，印出数值不再乘，只对新加力量乘 0.7。
- 设计缺口：src/screens/map.ts:468-504 只在下一节点不可达时重规划路线，血量骤降不复核（XC4T F8 精英后 36 血仍照计划走普通战）。
- 观察：「抽什么都会死」判定 4 次全为真死；规划器判全死但 SL 未触发的两处（XC4T F11、8RB3 F46）都是非名单走廊，按设计。巨斧机器人复活规则（Stock → BOOT_UP）生效；A9 启动回合格挡被低估（库 4/10，实际 15），不影响结局。B3PJ 换线被耸肩无视冲掉（79ef4eb，cab3c3f 已修）。run_plan_merge 全 stored，gate_reject 0。
- **已修（2026-10-03 07:33 确认）**：缩小伤害——SHRINK_POWER≠0 即判缩小，手牌显示伤害照用，只对本回合新加力量、全身撞击、活力、欺凌乘 0.7（游戏取整），药水与非攻击伤害不缩，缩小甲虫死即解除。重放 359 个缩小决策：敌伤精确 326→352/353，错判击杀 3→0。v4-live b0e9618（07:33），下一局起生效。关闭。
- **更正（2026-10-03 07:33）**：上条「路线不因掉血复核」不准确——复核其实跑了（随卡牌奖励题顺带），XC4T F8（36/80）和 F9（11/80）DeepSeek 两次都答 route keep；是判断问题不是缺复核。开发会话已向 Dai 提议在路线复核事实里加入后续每个节点的预期掉血，待 Dai 定。

### V4.4 A9 第 16–18 局复盘补充（2026-10-03 08:57）
- **SL_RETRY_EXPLORE_TURN 在重规划只剩一条线时失效**（不阻塞）：src/screens/combat-plan.ts:3039-3051（43553c8；cab3c3f :3034-3046）avoidsTop 只在有别的不死线时起作用，求解器只给一条线时 avoid 无效且无日志；explore.ts:781 判「没打过」看的是抽牌前几张。证据 PW7Y F48：控制台 20261003-063835-cab3c3f+dirty.log:2039/:2047 第 3 次换线后打回「血墙, 剑柄打击+, 暴走, 踩踏」；:2152/:2157 第 4 次战斗专注+ 抽牌后打回第 2 次整回合（explore.differs=false），白费 2 次重打。
- **疑似**（待核实）：0 能量喝能力药水，得到的恶魔形态 energy_cost 1、not_enough_energy 打不出被弃（A4PW F46 T1，states 00:30:12）；card-model.ts:1231-1233、potion-mc.ts:102/:334 按「本回合 0 费」建模，需核实游戏规则。
- 确认正常：缩小修复后 A4PW F4 预测打 19 掉 6，实际一致；least-loss 无回合内自杀（A4PW T4 2 血未打血墙）；无「抽什么都会死」误判；run_plan_merge 全 stored；gate_reject 0。Z4UK 是 566ae3e，第 5/6 次近似重复属已修的「第 1 次不算已试」。三局都还是经验库 2026-09-30.1（43553c8 晚于 A4PW 结束）。
- **已修（2026-10-03 10:03 确认）**：SL_RETRY_EXPLORE_WHOLE——换线判断整回合，抽牌后可能重复失败回合的替换会换成不会重复的线；avoid 检查所有存活线，代码自身线会重复时转给 Jev，无法执行时记 sl_explore.avoid_failed；differs=false 不再消耗换线点（PW7Y F48 第 3/4 次会不同）。
- **更正/已处理（2026-10-03 10:03）**：「0 能量能力药水」不是 bug——549 次记录中药水给的牌本回合都是 0 费；A4PW 那次是尖刺护手（能力牌 +1 费）造成，现已建模。v4-live f4f4b0d（10:02），下一局起生效。两条关闭。

### V4.4 A9 第 19–20 局复盘补充（2026-10-03 10:14）
- **执迷 ENTHRALLED 在手时规划器只给「结束回合」**（不阻塞）：mod 把其余手牌标 blocked_by_hook，src/strategy/card-model.ts:685 playable 照搬当帧标记，src/screens/combat-plan.ts:2176、:1963 只把可打牌交给求解器；单打执迷 2 费无效果，于是只剩结束回合。证据 HYQW F38 T4（5 能量一张未出、掉 13）：states 帧 5650853778，控制台 20261003-083119-b0e9618+dirty.log:1681。建议：手里有可打的执迷时，把被它锁的牌当成「打出执迷后可打」。

### V4.5 第 1–4 局复盘补充（2026-10-03 14:03）
- **蜥蜴尾巴触发后仍被当作可用（复活后同一敌方回合继续受伤）**（不卡对局，但让 boss SL 失效）：src/screens/combat-plan.ts trackLizardTail 只在下一回合开局血量落在 35–40（50% 减 LIZARD_TAIL_SLACK=5）时才记为已用（a6b09c1 :4423 / 当前 :4573；SLACK :4378 / 当前 :4528），遗物本身无已用标记（stack=null、is_melted=false），revivesOf 一直返回尾巴，src/sl/judge.ts:521 判「a revive is left」。证据 Y8E0 F48 女王：T3 敌方回合 14 血吃 12×3，归零复活到 40，第 3 段再掉 12，T4 开局 28/80，不在窗口；控制台 :1992（T6）误判，求解器 T6 选全攻线指望复活；6 次 SL 全未用。与第 94 行同函数，漏的是另一路径。
- 已知项复发：为 boss 买的药路上被喝（Y8E0 能力药水 F46、WRXU 鲜血药水 F39）；mod 超时自愈（Y8E0 1、WRXU 4、FP35 6）。gate_reject 0，least-loss 无回合内自杀，「抽什么都会死」0 次。
- **已修（2026-10-03 14:54 确认）**：蜥蜴尾巴改为按我方血量多信号判已用（致命后下回合开局 (0,50%] 且高于回合末、旧窗口、逐段模拟复活血量 ±5、敌方回合内结束战斗按战后血量、敌方回合帧血量为 0），SL 读档恢复战斗开始时的尾巴状态。日志 7 次触发新代码全认出（旧 5/7），453 局假装带尾巴 0 误判；Y8E0 F48 T6 现判必死。v4-live 91e2219（V4.5.lizard，14:54 CST），下一局起生效。关闭。待看：「判尾巴已用但其实还在」导致读档。

### V4.5 第 5–7 局复盘补充（2026-10-03 16:02）
- **SL 判官对瀑布巨兽特殊阶段一律拒判**（过度保守的设计缺口）：src/sl/judge.ts:525-528（91e2219，自 6cd2dfe 起；docs/sl.md:43）敌人最大血量 ≥100 万或意图 DeathBlow 即判不确定。QLL4 F17 T13：巨兽 999999999 血、DeathBlow 50，我方 33 血 0 格挡、无格挡/抽牌/药，mod 标致死，无复活/缓冲/无实体/波纹水盆，规划器已判全死；6 次重打未用。日志巨兽喷发致死回合 26 次，23 次真死，活下来 3 次都带蜥蜴尾巴/瓶中精灵/波纹水盆（judge.ts:521、:524 本就拒判）。建议只保留「百万血打不死」，去掉 DeathBlow 整体否决。已由开发会话在 v4-giant-judge 修。
- 设计缺口：为特定回合准备的牌（应急按钮、火焰屏障）会被规划器/Jev 提前打掉，没有「留到击杀后那一回合」概念（QLL4 T11 打应急按钮，T13 自爆回合无格挡）。
- 观察：GQ5H 4 次换线全落在 T1，真正掉血的 T4–T6 没换到；「抽什么都会死」1 次（小提琴不能抽），非误判；JKP 判官 reason 未写狱火失血但结论对；QLL4（b3a950a）11 次路线复核全 keep，未选被标更差路线。gate_reject 0，无回合内自杀，run_plan_merge 全 stored。经验库 knights、deck-passive-engine 三局 0 引用。为 boss 留的药 GQ5H 复发（F38/F45 力量药水 F39/F46 喝）。

### SL 判官漏判：无厌沙虫沙坑归零（2026-10-03 16:24，BVJT F33）
- BVJT7HFW6X2S F33 T5：规划器判全死但保血线剩 9 血（推测沙坑计数归零致死），mod 未标致死，判官 end_turn 拒判；6 次 SL 未用。控制台含 BVJT 那份 :1531、:1533、:1544。开发会话在 v4-giant-judge 与巨兽自爆、「板甲在时不算山铜」一并修（只在计数必归零且无逃离牌/药/可能抽到的救命牌时判必死），待上线。
- **已修（2026-10-03 17:10 确认）**：判官三项——瀑布巨兽自爆回合（击杀回合仍拒判，下一回合 DeathBlow=3T+14 按正常规则判，回放 23 次自爆死判中 20、53 次存活 0 误判，QLL4 T13 会提前读档）；无厌沙虫沙坑在 1 结束回合判必死（回放 15 判中 13、0 误判，BVJT T5 会判）；山铜不论板甲都计格挡。v4-live 0727c1c（V4.5.judge，17:10 CST），下一局起生效。巨兽、沙坑两条关闭。待看：一幕巨兽首次提前读档是否回到 T1。

### V4.5 第 8–10 局复盘补充（2026-10-03 18:11）
- 设计缺口：**SL 换线只挪了药水位置就算新线**——src/sl/explore.ts:32-33、:236（ebb3710）turnCanon 把药水算进整回合键，P68P F48 第 3 次（T2 少喝药）、第 4 次（T1 多插一瓶药）出牌与第 2 次相同，三次结局都是 1 血 + 24 格挡对 44，白费 2 次重打（控制台 20261003-160630 :2157/:2198/:2225/:2256）。属「近似重复」已知局限的药水版本。不阻塞。
- 确认：BVJT 死因是沙坑归零（4→3→2→1，T5 末 21 血 + 12 格挡对 24 按伤害剩 9），ebb3710 judge.ts:520 拒判；0727c1c 新规则判必死（experiments/sl-giant/summary-insatiable.md）。
- 观察：GPR8（e36535c）where 权重指向 T2 但 T2 其余线死得更多按设计跳过，换线落 T3/T1。gate_reject 0、run_plan_merge 全 stored、「抽什么都会死」0、无回合内自杀；三局未选被标更差路线；knights/deck-passive-engine 0 引用。为 boss 留的药三局都复发。
- **已修（2026-10-03 18:48 确认）**：SL_RETRY_EXPLORE_POTION——换线出牌（含目标）与某次失败同回合相同、所喝药那次后面也喝过，即算已试；回放 41 次换线中挡掉 6 次只挪药水（P68P 3/4、GQ5H 4–6、Z4UK 6），两场换线胜局仍能走到。v4-live 61d236c（V4.5.potionx，18:48 CST），下一局起生效。关闭。

### V4.5 GPT 三局复盘补充（RNTV/J4S2/L3G5，2026-10-03 21:36）
- **小刀 SHIV 出牌不带目标**（中，不阻塞，建议优先）：src/strategy/card-model.ts:385（011bfbd 起，4719643 仍在）targetMode 匹配未渲染模板「{TargetType:choose(AllEnemies):对所有敌人|}」把要目标的小刀判成群伤。RNTV 执行闸拒绝 18 次、6 个局面（控制台 20261003-175840-011bfbd+dirty.log :889–893、:986–990、:1310–1314、:1395–1399、:1443–1447、:1524–1528），每次连拒 3 次后结束回合，F30 丢掉同计划的欺凌、防御和两瓶药。 已修（10-04，v4-live 7023574，V4.6.shiv）
- **回退时失败引擎耗时不记**（小）：src/brain/router.ts:357–365（4719643）只写回退那一行；RNTV 5×600 s 共 50 分钟不在 brain.jsonl，brain-latency.py 少算；L3G5 少算约 2.2 分钟。
- **exec 断流耗时算到下一题**（小）：25d86e9 src/brain/engines/codex.ts:705、:768、:697；J4S2 11:59:43 act-plan 记 315.7 s（=41.4+136.5+137.7）、12:09:26 shop 293.4 s。会话模式不漏。
- **决策日志把 codex 回答记成 deepseek**（小，统计口径）：src/loop.ts:912 decider 写死 "deepseek"。
- 设计缺口：**SL 重放走不到换线点**——src/sl/explore.ts:998、src/sl/controller.ts:568；J4S2 第 3/4/6 次 T2 报「line is not among the options」停止重放，第 6 次与第 4 次 8 回合出牌相同。 已修（10-03 确认，v4-live 554951d，V4.5.slreplay）
- 设计缺口：精炼混沌「从牌堆顶打出」被算作断序，已知抽牌只保留 10 张（可推出 26 张）（RNTV F38）。 已修（10-03 确认，v4-live 554951d，V4.5.slreplay）
- 观察：L3G5 会话模式 7 次 stalled 全是 runaway（>2000 字符，reward/card 4、rest/plan 3），每个文本字段已封顶 600（codex.ts:266/:284），具体哪个字段查不出（codex-calls 不存答案）。J4S2 实际 42 次运行、10 次 stalled（全是断流）。
- **已修（2026-10-03 22:36 确认）**：大脑日志三项——回退行带 primary_ms（失败墙钟）和 question_id、brain-latency 计入失败耗时（RNTV 79.5 / J4S2 33.6 / L3G5 18.4 分钟）；exec 断流耗时不再算到下一题；decider 记实际引擎（codex / deepseek (for codex)），stats.py 不再把 codex token 算成 Jev。runaway 原因：严格格式要求补 route/cards/discard 空字段，GPT 在字段间吐空白；新增 BRAIN_CODEX_MAX_ANSWER_BLANKS=100（默认）连续空白即截断重问，截断时存已流出原文。v4-live 6d2ce32 + 父仓库 81de842，下一局起生效。三条关闭。
- 判官漏判：狱火多层开局扣血按 1 计（C4F1 F33 第 5 次 T7）。已修（10-03 确认，v4-live 3dfc2af，V4.5.inferno）
- 规划器（求解器/rollout）狱火开局扣血按 1 计；地狱狂徒自动打出期间 mod 过早标 stable（C4F1 第 1 次 T7 按 4 血规划实为 2 血）。开发会话 v4-inferno-planner 修复中 已修（10-04 确认，v4-live 03eedec，V4.5.inferno2）
- SL 设计缺口：被跟踪的非 boss 战靠复活（瓶中精灵）活下来时判官只判「not certain: a revive is left」（6d2ce32 src/sl/judge.ts:604），不读档；RJZG F31 蜂群术士 47→4 烧掉两版计划都写「preserve Fairy」的精灵，boss 无复活（控制台 20261003-224649-6d2ce32+dirty.log:1253）。建议：还有次数时把「要靠复活/保留药才活」算读档条件。
- SL 断序（原因待查）：RJZG F33 每次 T4 打剑柄打击（牌组 2 张、无地狱狂徒）报「POMMEL_STRIKE left the draw pile without coming into the hand」（src/sl/draws.ts:477），已知抽牌卡在 21 张。 已修（10-04 确认，v4-live ed03f4c）
- SL 名单缺口：机甲骑士 MECHA_KNIGHT 不在 sl-elites.json（A8+ 2/13，3JHE 后约 3/14）；3JHE 92% 进场 T7 死、SL 没跟踪。建议三幕精英全跟踪或重排名单。
- 观察：4719643 的 2000 字符 runaway（3JHE 8、C4F1 7）是 choice+reason 写完后的空白循环；6d2ce32 截断 + 311c740 accept-cut 应已覆盖，下一批核对 accepted_from_cut。
- 小：RJZG decider 已记 codex，但 rationale/控制台仍写「DeepSeek changed the act's route」「DeepSeek decided」。 已修（10-04 确认，v4-live ed03f4c）
- SL 漏判（最终 boss）：ET3V F48 永世沙漏 T13 判官「not certain: a revive is left (LIZARD_TAIL)」不读档，结束回合即阵亡，余 5 次（控制台 20261003-233142-554951d+dirty.log:2210）；尾巴是否早已用掉或复活后同回合再死待查。另：game over 后又挂了一行 F48 attempt 1 跟踪（sl-attempts 多一行，draws「tracking began after the fight's start (T13)」）。 已修（10-04 确认，v4-live e32c8b7，V4.5.revive；尾巴 T10 开局已被凋萎+披风触发而追踪漏记，T13 死于凋萎回合末伤害；开关 SL_RELOAD_ON_REVIVE 默认关待 Dai）
- SL 漏判：X80A F42 灵魂枢纽（列名精英，最多 4 次）T4/T5/T6 判官「not certain: Ripple Basin (no attack played): its block is not counted here」不读档；T6 1 血 0 格挡对 46 来袭阵亡，4 次未用（控制台 3dfc2af 批次第 1399/1406/1419 行）。建议涟漪盆格挡按实值或上限计入，仍死则判必死；回放排查其他「not certain: X」整体放过。
### V4.5.gpt ET3V/7TQF/X80A 复盘补充（10-04）
- accept-cut 没接住（小）：ET3V F42 rest/plan 两次空白 runaway（105/100 字符），choice o1:c21 + reason 已写完，closeCutAnswer 离线可闭合，fromCut 仍返回 null，回退 DeepSeek（554951d src/brain/engines/codex.ts:1049/:1155），原因待查。
- SL 第 2 次只带已知抽牌重打等于白打：7TQF F33（T7 3→6 血）、F39（T4 3 血、法官 142 两次相同）；F39 上限 4 次只剩 2 次真换线。建议第 2 次就换线。
- SL 重放走不到目标：7TQF F33 第 3 次目标 T4（权重 44.8），出牌和血量相同，却报「T4: the board is not on attempt 2's path」（3dfc2af 控制台 :1340），靠 explore.fallback 在 T5 换线才赢，原因待查。
- 更正：X80A 涟漪盆漏判的控制台是 20261004-010345-ed03f4c+dirty.log:1399/:1406/:1419；T6 计入涟漪盆 4 + 覆甲 4 仍是 34 对 46，必死。
- 小：sl-attempts 把 act3-low-hp 的走廊（AXEBOT、OWL_MAGISTRATE，普通战节点）记成 fight_kind「elite」。
- 观察：ET3V 火堆上 mod 超时 4 次（F24/F29/F32/F47，「cannot reach the STS2-Agent mod … request timed out」），都自愈。
### V4.6 AKK0/V8N5/ABCJ 复盘（10-04）
- SL explore：换线结果解析成与失败那次相同的出牌（differs:false）时，应改走下一条没试过的线（AKK0 第 3、5 次白打）。 已修（10-04，v4-live 8939eb0，V4.6.explore3）
- SL explore：报「board not on path」后，应在同一次尝试里于目标回合强制避开被排除的线，不要等下一次才 fallback（ABCJ 第 4 次）。只是出牌顺序不同，局面 hash 也会不同。 已修（10-04，v4-live 8939eb0，V4.6.explore3）
- SL 参照：重打应锚定最好的那次失败，而不是固定锚第 2 次（ABCJ 第 1 次打到 T10、boss 剩 211，之后再没回去试）。 已修（10-04，v4-live 8939eb0，V4.6.explore3）
- 判官（瀑布巨兽）：HP 加上能拿到的最大格挡低于下一次自爆（3T+14）且只会越来越差时，应判必死。另外代码在巨兽剩 1–6 血时迟迟不打死它（AKK0 第 1、6 次各白打约 8 回合）。 部分修复（10-04，v4-live fa29905，V4.6.giant：rollout 估值修好；判官「必死」推算按 Dai 规则不做；输定局面仍会拖几回合，待 Dai 定）
- 药水：rollout 加进来的线会喝掉 run plan 留给 boss 的药（AKK0 F14 强化药；ABCJ F44/F46 两瓶力量药、F30 鲜血药）。 核查无绕过（10-04 开发会话：862 次喝药 837 次付了持有价值，其余 25 次属 09-30 例外；要改就改表和规则，交给 Dai）
- boss 模拟样本不足：ABCJ 41 次中有 16 次不到 300 个样本（AKK0、V8N5 各 1 次）。
- 小：codex xhigh 在路线字段里输出乱码（77 次中 3 次，如「keep出来ketøy…」），re-ask 能修好。 已修（10-04，v4-live 0b12aa1，V4.6.routekeep）
### V4.6 D4VF/3B4K/4AWD 复盘（10-04）
- SL 名单：把 AXEBOT（巨斧机器人）作为 hard-fight 加进 sl-elites.json。4AWD F40 进场 73% 仍阵亡；3B4K F45 进场 85% 掉 56 血。act3-a9 里「走廊进场 ≥60% 时 0 死」这句需要更新。
- outcome-stats 加载时机：进程第一次读取后就缓存，文件刷新后不重新读。4AWD 拿到的仍是只有 A8 的表，要到 9VHP 才用上 A9 数据。建议文件变化时重载，或者 autoplay 等赛后刷新完成再开下一局。 **已修（2026-10-05 06:11运维核实，源码2650aed8，live发布5f74cd50，main已包含于561f2cbd，eval S1.fix4）：按角色文件路径、mtime、size使缓存失效；固定测试覆盖等长刷新、大小变化及缺失/损坏恢复。**
- SL 参照：3B4K 第 3–6 次都以第 2 次为参照，而最好的是第 1 次（T8，boss 309）。8939eb0 的 ANCHOR 应该已经覆盖，需在下一批核实。
- SL 白打判定：3B4K 第 4 次标记为 differs:true，但 deviation.plays 和 replacement 不一致，结果与第 2 次相同。这种情况应按 differs:false 处理。 已修（10-04，v4-live 0b12aa1，V4.6.routekeep）
- codex 路线字段：输出「keep」加乱码、又没有节点 id 时，直接当作 keep，不要重问。这 3 局共重问 12 次，每次 10–20 s；其中 3 次重问后仍是乱码。 已修（10-04，v4-live 0b12aa1，V4.6.routekeep）
- 路线复核：换到预估血量更低的路线时，要求写出 route_reason（4AWD F7，预估 54 对 76，结果 F8 精英从 76 打到 25）。

### 运维 codex 卡死检查误报（2026-10-04 22:16）
- ~~**非阻塞：进程扫描竞态触发假 stall**~~（已修 9692ea6，2026-10-04 22:2x：判读改认 OK/STALL 行，/proc 竞态静音）。证据局 C48LLXBGKXQ9（SILENT A0），2026-10-04 22:15 调度器消息先报 `/proc/202999/cmdline: No such file or directory`，末行却是 `OK (last decision 4s ago, console quiet 3s)`；22:15 的 broker 复核同样先报 PID 205098/205163 不存在，再报 `OK (last decision 3s ago, console quiet 2s)`。`ops/stall-check.sh:16`（动作输出标 :17）在 pgrep 后打开 cmdline，进程退出时输入重定向报错，后置 `2>/dev/null` 未抑制该错误；`ops/codex-ops.sh:77-79` 合并 stderr 后只看第一行是否以 OK 开头，把此错误当成 stall。autoplay PID 180434、play node PID 180482 均在，控制台 22:15:55 仍出牌/结束回合。建议开发会话抑制正常退出的 /proc 竞态诊断，并按检查的明确 OK / STALL 结果分类；不影响游戏行为。调度器和检查脚本在运维沙箱中只读，交开发会话处理。

### 开发会话转交 codex 学习者（2026-10-04，Dai：改动和优化尽量交给 codex 学习者，Claude 只监控和对话）
- **learner/tasks/fix-batch.md 过时**：默认 items 指向 notes/fix-queue.md（现在用的是 fix-queue-v4.md）；合入流程还写「merge = v3」「flock ops/v3-merge.lock」，一个仓库之后对局分支是 live（.worktrees/live）。改成 merge=live 的流程（等知识刷新跑完、先提交刷新过的数据、合入、tsc + vitest、decision-log 一行、eval/versions.json 视是否改打法加版本），并按学习协议：改打法的修复要引证据局号和账本条目。
- **知识前缀模板里的角色专属文字**：房间代价表说明「战斗房含燃烧之血等战后回血」（agent/src/knowledge/render/ 下），燃烧之血是铁甲战士的遗物；改成和角色无关的说法。注意铁甲的前缀会因此变（prefix sha），记 eval 版本。
- **agent/tools/deepseek-prompt-dump.ts 跑不了**：整份读 logs/states.jsonl（超 Node 字符串上限 ERR_STRING_TOO_LONG）；改成按偏移从文件尾流式找最后一个战斗局面。
- **codex 大脑缓存命中偏低**：C48LLXBGKXQ9（静默猎手 A0）输入约 3.8 万 token/次只命中约 1 万；铁甲时期 GPT 命中约一半到七成。查原因（前缀里每局变的内容是否排在不变内容之前、会话模式的 thread 前缀、prompt_cache_key 等），给出改法和实测对比；不降推理强度（记忆卡 keep-ds-reasoning-effort 的原则同样适用）。

### 静默猎手首局复盘回报（运维 codex，2026-10-04 23:04）
- **非阻塞，学习者提案待开发审核：连续斩杀被沙坑护栏截断**。来源 C48LLXBGKXQ9 复盘首条、账本 silent-0001，定位 `agent/src/reflex/combat-plan.ts:1932`、`:1938`。学习者证据：F33 第5次 T13，已确认的「打击→冲刺」在第一步后变为 combat/plan-continue，护栏改打狂乱逃离，未完成斩杀。涉及战斗决策，运维仅转录提案，不自行修打法。
- **非阻塞，学习者机制提案待开发审核：刀刃陷阱即时重放漏算**。来源 C48LLXBGKXQ9 复盘第二条、账本 silent-0002 / silent-0004，定位 `agent/src/reflex/card-model.ts:759`、`:820`—`:823`。学习者证据：F19 T8 文本6张小刀的刀刃陷阱被预测0伤，实际杀敌；F33 第1次 T1 文本0张时仍给固定评分、实际0伤。属于从本局机制证据提出的模型缺口，运维不实现或补充规则。
- **非阻塞，角色隔离提案待开发审核：boss 时钟回退沿用铁甲拟合常量**。来源 C48LLXBGKXQ9 复盘第三条、账本 silent-0003，定位 `agent/src/sim/boss-clock.ts:982`—`:985`、`:235`—`:237`、`:1758`—`:1759`。学习者报告本局32次 act_boss_clock 使用旧角色215场 A8 的拟合和掉血回退常量；本条交开发会话审核数据来源与角色隔离，不由运维调整估值。

### 开发会话转交 codex 学习者：经验库每局一更（Dai 2026-10-04 23:1x）
- **调度器自动派经验更新**：Dai 定「经验 1 局一更，只要来得及」。ops/codex-ops-learn.py 在一批复盘结束（learner-done）后，若该角色 `ops/experience-pending.py --character <id>` ≥ 1 且没有经验批次在跑，就在 `.worktrees/exp`（分支 exp-silent，从 main 合）派 `learner/run.ts --engine codex --task experience-update --character <id> --set runs=<待并入的局> --set merge=no`；跑完写一行收件箱（「经验批次 <stamp> 完成，待开发会话审核合入」），失败按复盘批次的重试规则。一个时刻只跑一个经验批次；赶不上的局并入下一批。docs/codex-ops.md 和运维 prompt 同步一句。
- **experience-update.md 过时**：合入一节还写 merge = v3 / ops/v3-merge.lock，改成 live 流程（同 fix-batch 那条）。

### 静默猎手 Y6GM2CHWJBEY 复盘回报（运维 codex，2026-10-05 00:10）
- **非阻塞，学习者机制提案待开发审核：毒牌施毒、结算与条件评分缺口**。来源 Y6GM2CHWJBEY 复盘、账本 silent-0008，定位 `agent/src/reflex/card-model.ts:749`。学习者报告毒牌施毒与回合结算未进入推演，空打条件牌仍获得常驻评分；同族战六次 T2 均向没有中毒的目标打出咕嘟冒泡，消耗能量而没有效果。具体机制证据在 silent-0010 / silent-0011；运维只转录有局号的提案，不补充或实现规则。 **已修（S1.fix3，f6c5504a，运维于2026-10-05 05:22核实live合入00fa8f79）。**
- **已知问题追加证据：boss 时钟角色隔离**。Y6GM2CHWJBEY 再次观察到 `agent/src/sim/boss-clock.ts:982` 的旧角色拟合回退，学习者已将证据追加 silent-0003；属于此前已交开发会话的同一项缺陷，不另开修复。

### 最高优先：学习迭代由 codex 自己闭环（Dai 2026-10-05 00:19）
Dai：「你（Claude）别参与修改或审核，迭代直接让 codex 学习者自己闭环」。Claude 只做观察。要做成：
- **（00:2x 更正，Dai：「codex 学习者自己测试确认没有问题就可以直接合并上线」）学习者自测通过就自己按 live 流程合入（经验和修复任务一律 merge=live），不另设审核；下面原写的运维审核只保留「学习者提交被挡时帮它提交、合入」这一兜底。**
- **谁审核、谁合入（原稿）**：运维 codex 会话接管原来「开发会话」的审核和上线：学习者的经验批次（.worktrees/exp，分支 exp-silent）和修复批次（.worktrees/codex-dev，分支 codex-dev）跑完后，由运维会话按学习协议审核（证据局号、只用本角色数据、台账登记、测试通过），通过就合进 main 和 live、记 decision-log、改打法的加 eval/versions.json 版本、把台账条目改成 accepted / shipped；不通过就把理由写进台账（rejected + note）并退回学习者。学习者产出的提案也由运维会话审核（accepted / rejected）。
- **谁派活**：调度器（ops/codex-ops-learn.py）每批复盘结束后自动派经验更新（每局一更，同时只跑一批，赶不上的并入下一批）；有 accepted 但没上线的提案、或 fix-queue-v4.md 里没划掉的条目时，自动派 fix-batch（同时只跑一批）。broker（ops/codex-ops-actions.sh）加 `experience-update`、`fix-batch`、`learner-merge <branch>` 一类白名单动作，供运维会话手动触发。
- **任务说明**：learner/tasks/experience-update.md、fix-batch.md 的「合入」一节改成 live 流程（不再是 merge=v3 / ops/v3-merge.lock）。
- **文档**：docs/learning-protocol.md、AGENTS.md、docs/codex-ops.md、运维 prompt（ops/ops-session-silent-codex-prompt.md）里「开发会话审核 / 实现 / 合入」改成「运维 codex 会话审核合入、codex 学习者实现」；Claude 会话只观察和与 Dai 对话。运维 prompt 改动属于 Dai 已经定的分工，不用再问。
- 本批修复本身由 codex 学习者实现、自己测试、自己按 live 流程合入（merge=live）。

### 静默猎手 LRN0HPZ0FZS1 复盘回报（运维 codex，2026-10-05 00:36）
- **非阻塞，学习者机制提案：余像逐牌格挡未进入推演**。来源 LRN0HPZ0FZS1 复盘首条、账本 silent-0022（机制证据 silent-0023），定位 `agent/src/reflex/card-model.ts:816`、`agent/src/reflex/rollout.ts:992`（复盘时 live 4915e3b3）。学习者报告 F48 T1 同一三张前缀预测6格挡、实际8，F48 T2 同一完整防御线预计损6、实际损2；提出按本局逐牌触发及重放证据建模。这里只转录学习者提案，不补机制、不改模型、不作 accepted/rejected 审核；由学习者依新分工实现、自测、上线。既有 silent-0003（boss 时钟角色隔离）和 silent-0008（施毒/结算模型）的新证据已由学习者追加原账本，不重复开项。 **已修（S1.fix3，e0541ebc，运维于2026-10-05 05:22核实live合入00fa8f79）。**
- **（先做这条）沙箱里跑不完完整测试，学习者没法自测后合入**（观察者 2026-10-05 01:5x）：exp 批次 Y6GM 和 codex-dev 修复批次都因完整 vitest 在 codex 沙箱里跑不完而停在「未合入」（固定假子进程在沙箱里起不来：brain-codex 测试 21 例异常，learner 测试同类；exit 124），由观察者在沙箱外跑测试后合入。要做成：① 一个「沙箱内可跑」的测试命令（排除只在沙箱里失败、需起子进程的测试文件，名单写死在脚本里并说明原因），学习者任务的自测改用它；② 合入 live 之后，调度器在沙箱外跑一次完整 tsc + vitest，失败就写收件箱并叫醒运维会话（运维会话决定回滚还是派修复）；③ 经验批次、修复批次结束时调度器发事件（现在只有复盘批次有），运维会话据此确认已合入。另：tests/turn-start-settle.test.ts 的「Inferno up」一例在对局负载下偶发超时（单独跑通过），把它的计时改稳。另：exp 批次 Y6GM 的台账 update 有 4 行被 ledger.py 拒绝（evidence 是空列表），在 learner/runs/20261005-001708-experience-update/ledger-update-pending.jsonl，补成有效行写入。

### 静默猎手 T082DRCUHRRD 复盘回报（运维 codex，2026-10-05 02:05）
- **非阻塞，学习者机制模型提案：灵动步法新增敏捷未进入整条方案及后续回合推演**。来源 T082DRCUHRRD 复盘首条、账本 silent-0026，定位 `agent/src/reflex/card-model.ts:816`、`agent/src/reflex/rollout.ts:992`、`:1852`。学习者证据：F23 T3 同一「打击→灵动步法→防御」方案预测新增5格挡、损2血，实际防御10→17、回合实损0；学习者另回溯 C48LLXBGKXQ9 F12 T2，预测10格挡、实际12，并将 first_run 记为首局。提案区分输入状态已有敏捷与推演过程中新增敏捷，不声称提前出牌必胜。这里只转录学习者证据，不添加游戏知识、不改模型、不作 accepted/rejected 审核；由学习者按新分工实现、自测、上线。既有 silent-0003（时钟角色隔离）、silent-0008（施毒与结算模型）的重复证据已追加原账本，不重复开项。 **已修（S1.fix3，d8a2b009，运维于2026-10-05 05:22核实live合入00fa8f79）。**

### 静默猎手 1HC609GTLGN3 复盘回报（运维 codex，2026-10-05 02:37）
- **非阻塞，学习者机制模型提案：胧光怪活体召唤未进入推演**。来源 1HC609GTLGN3 复盘首条、账本 silent-0029，定位 `agent/src/reflex/rollout.ts:2496`、`:1671`、`:2174`（学习者复盘时 live 5de5d518）。学习者证据：F22 T1 下一回合威胁预测6，实际召唤寄生惧魔后 T2 意图为16+6；学习者另回溯 C48LLXBGKXQ9 F30 T1 也有同一漏算，first_run 记为首局。提案指出当前模型数组与增敌分支只覆盖已有敌人与死亡生成，不能把本局预测胜率与死亡的全部偏差归于此项。这里只转录学习者证据，不添加机制、不改模型、不另设审核；交学习者实现、自测、上线。既有 silent-0003（时钟角色隔离）、silent-0008（毒模型）的重复证据已追加原账本，不重复开项。 **已修（S1.fix3，1e076b17，运维于2026-10-05 05:22核实live合入00fa8f79）。**

### 静默猎手 R0HEV5E3QT6G 复盘回报（运维 codex，2026-10-05 03:35）
- **非阻塞，学习者模型提案：悔恨按手牌数量失血漏算**。来源 R0HEV5E3QT6G 复盘首条、账本 silent-0032（机制证据 silent-0034），定位 `agent/src/reflex/card-model.ts:534`、`agent/src/reflex/turn-solver.ts:2636`、`agent/src/sl/explore.ts:1518`。学习者证据：F48 第3次 T3，41血、0格挡、5张手牌含悔恨，对36攻击；结束回合选项只预测损36、剩5血，SL探索替换为结束后实际归零。学习者区分求解器固定数字解析与已识别手牌数量的判官，不声称原出牌线能赢整场。只转录学习者的局号、证据与提案，交学习者实现、自测、上线，不补机制、不改模型、不另设审核。 **已修（S1.fix3，3fcb1f5f，运维于2026-10-05 05:22核实live合入00fa8f79）。**
- **非阻塞，学习者模型提案：暗影步误算即时抽牌且未模拟全弃手牌**。来源 R0HEV5E3QT6G 复盘第二条、账本 silent-0033（机制证据 silent-0035），定位 `agent/src/reflex/card-model.ts:805`、`:761`（采用学习者勘误后的分派行号）。学习者证据：F29 T2 所选含暗影步的方案预测15伤、损12，实际全弃后0行动伤害、损16；F48 第1次 T4 重规划暗影步后继续安排偏折+、投掷匕首+，预测13伤、损12，实际两牌均弃掉、敌血不变、损19。提案仅依据本局未升级版本的文本与执行记录，不补升级规则；只转录证据，交学习者实现、自测、上线。既有 silent-0003 的伤害拟合隔离分支新证据已追加原账本，不重复开项。 **已修（S1.fix3，90b1fbeb，运维于2026-10-05 05:22核实live合入00fa8f79）。**

### 静默猎手 KAY522KT5NXR 复盘回报（运维 codex，2026-10-05 04:37）
- **非阻塞，学习者数据模型提案：跨读档阶段序列使实验体第三阶段血量被截错**。来源 KAY522KT5NXR 复盘首条、账本 silent-0041，定位 `agent/src/knowledge/monster-db.ts:1009`（优先最长阶段序列）、`agent/src/sim/boss-clock.ts:1503`（取前三项），生成来源 `knowledge/builders/build-monster-db.py:410`、`:275`。学习者证据：本局 F34 路线题把 TEST_SUBJECT 写成100/200/100、总400，两次实际阶段均为100→200→300、总600；静默角色记录的最长序列拼接了六次 SL 的100→200重复，前三项因此取成100/200/100。学习者另回溯 R0HEV5E3QT6G F34/F36 同样错误，first_run 记为该局；本条与 silent-0040 的回合拼接问题分开记录。这里只转录学习者的局号、定位和分析，不补机制、不改模型、不另设审核；交学习者实现、自测、上线。既有 silent-0003、silent-0008 的重复证据由学习者追加原账本，不重复开项。 **已修（S1.fix3，4ed3c72d，运维于2026-10-05 05:22核实live合入00fa8f79）。**
- **broker 加 eval-metrics 动作**（运维 2026-10-05 04:26）：eval/metrics.py 调 eval/strength-sources.ts 时 tsx 在 /tmp/tsx-1000/*.pipe 监听，沙箱拒绝（listen EPERM）。给 ops/codex-ops-actions.sh 加白名单动作（沙箱外跑 eval/metrics.py，参数限定），输出写到 paper/materials/<角色>/ 下。A0 这次由观察者在沙箱外跑了，结果 paper/materials/silent/a0-metrics.md。 2026-10-05 05:22进度：本批fix-batch因ops文件只读跳过；运维权限同样将broker文件设为只读，已交收件箱请Dai安排有相应写权限的执行方。 **已修（2026-10-05 09:33，源ef46d720、main e223fb56、live dac9d941；固定沙箱与假评估器回归通过，下一次叫醒加载eval-metrics <角色id> <进阶>，历史评估请求届时可补跑）。**

### 主目录自测误收学习者运行夹具（运维 codex，2026-10-05 05:22）
- **非阻塞，工具问题：TypeScript通配纳入learner/runs临时源码**。定位 `agent/tsconfig.json:23`，include为`../learner/**/*.ts`，没有排除学习者运行产物。证据批次20261005-041302-fix-batch（R0HEV5E3QT6G/KAY522KT5NXR等静默证据的学习任务）：主目录合入S1.fix3后运行`nice -n 19 bash tools/test-sandbox.sh`（cwd=agent），tsc exit 1，343条诊断全部来自`learner/runs/20261005-041302-fix-batch/`中的临时测试和poison-src源码，没有实际源码路径诊断，日志`/tmp/sts2-fix3-main-sandbox-tests.log`。同一暂存合并内容已复制到干净校验工作树验证；原始运行归档保留。交学习者修正编译包含范围，对局未因此停下。 **已修（2026-10-05 06:11运维核实，源码7bc83580，live发布5f74cd50，main已包含于561f2cbd）：排除learner/runs归档源码，保留learner实现编译检查；编译范围回归撤修复失败、恢复通过。本项为纯工具，不单独加对局版本。**

### 静默猎手 XYYQYBRM2A01 复盘回报（运维 codex，2026-10-05 05:39）
- **非阻塞，学习者机制模型提案：萎靡的X减益漏建模、零能量仍获固定价值**。来源 XYYQYBRM2A01 复盘首条、账本 silent-0051（机制证据 silent-0053），定位 `agent/src/reflex/card-model.ts:767`、`:771`、`:772`、`:841`、`:844`，以及 `agent/src/reflex/turn-solver.ts:1510`（复盘只读live 00fa8f79）。学习者证据：F33六次耗尽能量后施放未升级萎靡，力量与虚弱均未因此变化，首战T3候选仍计3分；F30 T1实际X3令力量−6→−9、虚弱1→4，临时尖啸恢复后仍−3。更早KAY522KT5NXR F9 T3已有零X，F12 T3的X1建立−1力量与1虚弱，first_run为KAY。学习者区分零X自身减益与开信刀第三技能5伤，不声称调整时点必胜、不补升级规则。只转录证据，交学习者实现、自测、上线，运维不改机制或另设审核。 **2026-10-05 06:32追加既有证据（silent-0051）：K3676LU8B0UH七次零X萎靡均没有自身减益，F33 T4力量及虚弱未变而候选仍给3分；F12 T2的X1成功减力加虚弱。学习者已追加repeat，运维不另开同一缺陷。** **已修（S1.fix5，0d7465a0，运维于2026-10-05 07:12核实最终live发布9e0fda2e包含本项；原证据保留）。**
- **非阻塞，纯统计bug：晚写复盘被误计为上线后重犯**。来源 XYYQYBRM2A01 复盘第三条、账本 silent-0052，定位 `learner/ledger.py:280`、`:285`、`:286`。学习者证据：本局2026-10-05 05:05:41.432+08:00结束，运行bb19732f+dirty；silent-0008于05:22:46登记S1.fix3，正常追补repeat时工具只比较入账时间added与shipped_at，误计after-shipping repeat，未检查错误发生时间或实际生效版本。交学习者修正统计口径并保留原始账本历史；本轮dataset沿现脚本生成，暂不据该计数推断上线后效果。既有毒模型silent-0008的证据已由学习者追加，本局早于修复，不重复开毒模型待办。 **已修（S1.fix5，2610945b，运维于2026-10-05 07:12核实最终live发布9e0fda2e包含本项；原证据保留）。**

### 合入兜底后缺少沙箱外完整检查（运维 codex，2026-10-05 05:44）
- **非阻塞，调度工具问题**。定位 `ops/learner_checks.py:37`：完成事件回报`merged=null`时直接返回，运维随后按live流程成功兜底合入也没有重新触发完整tsc + vitest。证据批次20261005-051301-experience-update：学习者cf3de824自测通过、因decision-log冲突未合；运维保留记录后合入c5b9123b并登记S1.exp6/live 69630ae6，live沙箱145文件1888用例通过，但无沙箱外补跑动作。请求有broker写权限的学习任务提供按批次校验实际合入、锁内补完整检查并发learner-checks的动作；去重且保留原失败/兜底历史，运维不改宽沙箱出口。已在收件箱及for-dai附这次的完整补跑命令。

### 单次动作超时触发卡死提醒（运维 codex，2026-10-05 05:51）
- **非阻塞，监测判读问题**。定位 `ops/stall-check.sh:25`，尾部四行出现`cannot reach the STS2-Agent mod`即追加stuck/unreachable，没有结合持续时间或后续Codex决策。证据局K3676LU8B0UH A1 F36，控制台`logs/console/20261005-050828-ccf1fcde+dirty.log`：05:44:46一次choose_event_option请求超时，05:44:48已开始事件决策；05:50送达的stall提醒仍引用该片段，而本轮检查日志已推进F40，mod为REST且进程存活，stall-check返回OK（决策19秒、控制台6秒）。请学习者依据当前状态与连续失败证据区分单次超时和持续卡住，保留对实际持续无法访问mod的检测；运维本轮只登记，不改只读调度器。

### 静默猎手 K3676LU8B0UH 复盘回报（运维 codex，2026-10-05 06:32）
- **非阻塞，学习者机制模型提案：撕咬共享增伤未进入方案推演**。来源本局复盘及账本silent-0056（机制证据silent-0058），定位`agent/src/reflex/turn-solver.ts:1897`、`:1888`及`agent/src/reflex/card-model.ts:762`（学习者只读live定位）。证据K3676LU8B0UH F48第二次尝试T9：两张撕咬起初均13伤两击，第一张实扣26后，第二张每段变15、实扣30，方案内未读取Increase或保存共享成长。整条预测83，实际行动64加毒37共101，18点差额仅单独确认其中4点共享增伤，其他差额不归给本项。仅转录学习者结论、局号及范围，交学习者实现、自测、上线；运维不修机制或补游戏知识。已有萎靡silent-0051追加本局证据，未重复开项；群蛇形态、回合末伤害及遗物观察留在学习者复盘与账本，不另作策略处理。 **已修（S1.fix6，8ffd62ef，运维于2026-10-05 07:12核实最终live发布9e0fda2e包含本项；原证据保留）。**

### 静默猎手 CSBR5CRDWQNB 复盘回报（运维 codex，2026-10-05 07:30）
- **非阻塞，学习者机制模型提案：风的女儿逐攻击补挡未进入方案推演**。来源本局复盘及账本silent-0061（机制证据silent-0063），定位`agent/src/reflex/combat-plan.ts:2863`（遗物输入）、`agent/src/reflex/turn-solver.ts:2125`（attackRelics），为学习者只读live定位，不声称与本局c4c7ad97+dirty逐字相同。证据CSBR5CRDWQNB A2 F33第6次尝试T2：连续反弹+、切割+、回响斩击三张攻击使格挡0→1→2→3；SL实际执行plan3预测损31，火箭27加碾碎爪4减3挡，38→10实际损28。仅将已独立核对的3点损血差额归本项，预测54伤与实际62伤的另8点差额没有独立归因，不把整场失败归本项。没有阻塞对局，交学习者依据本角色证据实现、自测、上线；运维只转录提案，不改机制或补游戏知识。其他路线、朝向、复活与持续能力观察保留在复盘和账本，silent-0019重复证据不重复开项。 **已修（S1.fix7，学习者源码907a19f8，运维于2026-10-05 08:16锁内核实live发布1b2945335a8e3b54d5264c8dd39133a2671a4e8b，合后沙箱151文件1905用例通过；原证据保留）。**

### 静默经验第八次增量的统计口径提案（运维 codex，2026-10-05 08:05）
- **非阻塞，学习者统计提案，待核对终帧与字段消费口径**。来源批次20261005-072823-experience-update的changelog-section.md“代码问题（不给DS）”及既有silent-0040；定位`knowledge/builders/build-monster-db.py:263`（last_hp）、`:503`（loss）、`:1320`（hp_loss_won），不把定位本身当根因证明。学习者证据CSBR5CRDWQNB A2 F17：进场70血，本体结束前47血，末自爆再损17、战后30血，完整战损40；生成hp_loss_won为23。构建器分别记最后combat帧损血与net_hp_loss_won战后净损，请学习者核对终帧覆盖和调用方是否混用口径，不直接将23改写为40、不把该差额推成打法结论。这里只转录学习者提案和局号，保留生成数据，不改代码、经验或账本。 **终帧漏读子项已修（S1.fix8，学习者098a5471，运维于2026-10-05 08:43核实live 45965f496135d8755c69edbadb3eddafbddf703a、重建common/silent数据exit0）。已由学习者确认同房间REWARD.combat.player仍有47→30终帧，补读较低值且不覆盖回血终点；原证据保留，未手改23为40。silent-0040原跨SL回合分组问题仍未修，不将本子项视为其全部解决。**

### 静默猎手 ZZMYZ5UBCG72 复盘回报（运维 codex，2026-10-05 08:16）
- **非阻塞，学习者机制模型提案：暴露的易伤变量未进入方案模型**。来源本局复盘首条与账本silent-0066，定位`agent/src/reflex/card-model.ts:765`、`:787`、`:847`（学习者只读live定位）。证据ZZMYZ5UBCG72 A2 F48 T2：暴露EXPOSE的观测变量Power=2令聚合体新增2易伤，中和+牌面4伤而实际155→149扣6，选线题仍将暴露列为未建模；当前模型只读VulnerablePower、无EXPOSE映射，未建模零费技能仍计3分。学习者只确认这2伤差额，未独立验证去挡/去人工制品，不据牌面扩充结论；更早Y6GM2CHWJBEY A0 F5 T2已有未建模日志，first_run回溯该局，不称本局新引入。交学习者依据静默证据实现、自测、上线；运维仅转录，不修机制或补知识。其余打法和机制发现留在复盘及账本，没有新的阻塞问题。

### Dai 决定（2026-10-05 08:33）：策略项交给学习者
- fix-batch 20261005-041302 跳过的策略项（保血 / 留药 / 全死排序、巨兽拖延、boss 时钟校准与样本门槛、路线和休息、SL 范围；见 learner/runs/20261005-041302-fix-batch/handoff-ops.md）交给学习者：新建一个「策略提案」学习任务（learner/tasks/ 下，按学习协议：只用本角色对局证据、引局号、台账登记、自测后按 live 流程自己合入），调度器按需派发（例如每升一级、或攒到一定复盘数时）。改打法的上线照常加 eval 版本。
- **最高优先，Dai已批准的学习流程任务：策略提案任务及其派发**（运维 codex 2026-10-05 09:33 转交）。落实本节08:33决定：由后续学习者fix-batch建设独立策略提案任务和调度入口，具体策略由该任务的学习者依据本角色对局证据提出并实现；证据局号、学习台账、自测、merge=live及改变打法的eval版本均按学习协议，使用Dai已设的普通模式/high强度。运维已实现eval-metrics并更新fix-batch的旧ops只读说明，key/.env/登录令牌保护保留；本轮发现修复工作树正在使用，不重复派发。此项仍待学习者建设和派发，运维不提供游戏知识。

### silent-0040 原跨SL统计问题仍待修（运维 codex，2026-10-05 08:43）
- **非阻塞，既有学习者统计提案，未修**。来源既有账本silent-0040及本批20261005-081301-fix-batch的report.md“没修的”项；`knowledge/builders/build-boss-damage.py`按(run,floor,turn)保留最早帧而未区分SL，学习者原证据T082DRCUHRRD F48的T1—T9取首战、T10取第3次、T11取第6次，累计hp_lost=84，和最终尝试净损80不同；C48LLXBGKXQ9 F17保留首战T19而获胜线T15结束。098a5471/S1.fix8仅修另一个build-monster-db奖励屏较低终帧漏读，没有修本项，相关shipped只登记终帧子项发布。原跨SL条目继续交学习者核对实现，不补额外机制、不将拼接数值当有效整场数据。

### Dai 决定（2026-10-05 08:37）：codex 可以改自己的白名单动作和调度器
- Dai：「可以让 codex 修改白名单动作脚本，相信 codex」「授权，可以修改 ops/codex/lib.ts 放宽 codex 的自主权限」。运维权限档里调度器和 broker 文件的只读规则已去掉（main e601de00）；学习者 fix-batch 也可以改 ops/codex-ops-actions.sh、ops/codex-ops-do.sh、ops/codex-ops.sh、ops/codex-ops-learn.py、ops/codex/ 等（learner/tasks/fix-batch.md 里「ops/ 只读」对这些文件不再适用，顺手改掉这句）。key、.env、codex 登录令牌、.git hooks/config 的保护不变。
- 待做：eval-metrics 白名单动作（见 04:26 那条）。 **已修（2026-10-05 09:33，源ef46d720、main e223fb56、live dac9d941；固定沙箱与假评估器回归通过，下一次叫醒加载eval-metrics <角色id> <进阶>，历史评估请求届时可补跑）。**

### 静默猎手 10GPK5XGHCK3 复盘回报（运维 codex，2026-10-05 09:03）
- **非阻塞，学习者机制模型提案：腐蚀波本回合抽牌施毒未进入方案推演**。来源本局复盘首条及账本silent-0074（机制证据silent-0076），定位`agent/src/reflex/card-model.ts:834`、`:847`（学习者只读live定位，不声称与开局9e0fda2e+dirty逐字一致）。学习者证据10GPK5XGHCK3 A3 F48 T6：腐蚀波建立CORROSIVE_WAVE_POWER 2后，投掷匕首抽一牌，敌毒7→9；F37 T8后空翻抽两牌使毒4→8，而选线仍列未建模、给5分固定技能价值。F48 T12施放后没有再抽牌，毒16→19来自带毒刺击，不能将其归为腐蚀波效果或补成永久能力。没有阻塞对局，交学习者按本角色证据实现、自测、上线；运维仅转录提案，不改机制或补知识。
- **非阻塞，学习者机制模型提案：融入暗影在同一方案内新增格挡翻倍未建模**。来源本局复盘第二条及账本silent-0075（机制证据silent-0077），定位`agent/src/reflex/card-model.ts:780`、`:844`、`:847`（学习者只读live定位）。学习者证据10GPK5XGHCK3 A3 F42 T7：融入暗影→生存者方案预测新增13挡，实际SHADOWMELD_POWER建立后新增26；T2预测8、实际16。缺口是方案内新增增益，不否认重新读取实际牌面可见翻倍。first_run回溯1HC609GTLGN3 A0 F17首战T8的未建模13挡方案，因此不是首次在A3遇到；F48 T12没有后续新增挡，整回合仍0挡，不能将已有挡或没有发生的格挡翻倍。仅转录学习者证据和范围，交学习者实现、自测、上线，不由运维修机制；未定位的其他预测差额不另开已定位bug。其余萎靡、毒、敏捷、阶段与复活观察留在复盘和账本，不另作策略处理。

### 台账来源元数据更正接口（运维 codex，2026-10-05 09:49，学习者经验.10回报）
- **非阻塞，学习台账工具问题**。定位`learner/ledger.py:53`（UPDATE_FIELDS）和`:199`（validate_update）：append-only更新接口不接受first_run/asc/prior_note，学习者无法经工具更正最早证据元数据。来源批次20261005-085844-experience-update、固定源c2ece69c，账本silent-0076；学习者回溯T082DRCUHRRD A0 F12 T6只支持腐蚀波建层/时限，实际抽牌施毒首例仍10GPK5XGHCK3 A3 F37 T8/F48 T6。已追加support及note，结构字段仍first_run=10G/A3，check0。交学习者工具任务实现有校验的追加式更正并保留历史，具体来源归属由学习者证据决定；运维不直接修改旧账本或生成CSV。

### 长检查占用学习状态锁导致兜底动作超时（运维 codex，2026-10-05 09:49）
- **非阻塞，运维调度工具问题**。定位`ops/codex-ops-learn.py:410`（所有handler先阻塞learn.lock）、`:314`（锁内finish_write_batch）及`ops/learner_checks.py:44`（同步flock live锁后跑完整检查）。证据批次20261005-085844-experience-update、10GPK5XGHCK3：09:39非阻塞live锁busy，随后`bash ops/codex-ops-do.sh learner-merge exp-silent`exit128，输出“（超过 30 秒，已终止）”，未确认manual入队；07:08同动作已有同样超时，07:50曾恢复。request-merge本身仅入队却也需要同一学习状态锁，源码存在长检查争用路径，实际持锁者尚未确认。请学习者核对争用并修复短请求被长检查阻塞的问题，保留状态一致性、工作树占用与重复派发保护；本轮不绕过动作直接写队列，合入步骤已交接收件箱/for-dai。

### 批次20261005-084301修复完成（运维 codex，2026-10-05 10:00）
- **已修：08:16暴露提案silent-0066**，学习者源码62e11664、S1.fix9，live最终发布7efeed50d42453e3fa6a6c832214796a7f73b8dd已包含；旧REPLACE占位有追加更正，保留历史。
- **已修：08:43原跨SL boss统计问题silent-0040**，学习者源码3f40af6f、S1.fix9，保留最后尝试的回合及元数据。先前S1.fix8仅终帧子项的记录和当时“未修”结论保留，本次才完成原跨SL项。
- **已修：09:03融入暗影及腐蚀波提案**，源码82c50cc0（silent-0075/0077）与53cc31f4（silent-0074/0076）、S1.fix10。运维仅登记学习者实现，没有扩充其机制范围。
- 四项均为学习者固定数据撤修复失败、恢复通过；合后自测tsc0、156文件1917用例，沙箱外完整检查tsc/vitest exit0、208文件2747通过/2跳过；main同步71e677e2，6项账本shipped。旧任务ops只读跳过项中eval-metrics已另上线；其余调度工具与已批准的策略任务保留队列，不重复要求Dai授权。经验.10仍待manual合入，此处只登记修复发布。

### 静默猎手1NZ8FE5F34R9复盘回报（运维 codex，2026-10-05 10:05）
- **非阻塞，学习者机制模型提案：预判的本回合敏捷未进入同一方案后续格挡**。来源批次20261005-094524复盘及silent-0078（机制证据silent-0080）；定位`agent/src/reflex/card-model.ts:943`（仅对FOOTWORK输出卡牌敏捷）、`:846`（已建模效果判定）和`:860`（未知技能分）、`agent/src/reflex/turn-solver.ts:1802`（消费dexterity），为学习者复盘时只读live定位，不声称与本局45965f49+dirty逐字相同。证据1NZ8FE5F34R9 A4 F29首战T2：预判→防御→毒雾的plan4预测5挡，实际新增本回合2敏捷后防御给7挡；第4次T2亦见7挡，T3两增益消失。只确认新增2挡差额，不将随后追加致命毒药的伤害归本项，不把临时增益沿用后续回合，也不把整场死亡归于2挡。交学习者依静默证据实现、自测、上线，运维仅转录，不修机制、不补知识。
- 本批无新的角色无关阻塞问题；触媒换防御的即时血价、路线预测与问号风险等分析保留学习者复盘及silent-0079/0019，不另补策略。四次终战均30血进场、前三次判死读档、第4次实际死亡按学习者证据分别记录；无Dai待定事项。

### 静默猎手F9PP859XZ3RJ复盘回报（运维 codex，2026-10-05 10:29）
- **非阻塞，学习者机制模型提案：计算下注之后仍推演已弃掉的原手牌**。来源本局复盘及silent-0081；定位`agent/src/reflex/card-model.ts:836/:960`（动态抽牌及discardsHand输出）、`agent/src/reflex/turn-solver.ts:1542`（消费弃手牌标志），为学习者复盘时只读live定位。证据F9PP859XZ3RJ A4 F37 T2计划在计算下注后继续打生存者及毒雾，预测15挡/0损；实际两牌全弃，抽羽化/打击后代码重算，只有偏折7挡、实损2，毒雾T6才建立。回溯T082DRCUHRRD A0 F27 T1已有计划续打原手牌、实际换牌证据，first_run为T082，本局记repeat但未有本项上线，不称学过后重犯。只转录学习者提案，交学习者实现、自测、上线；不把旧暗影步修复视为本牌已修，不由运维修机制或补知识。
- **非阻塞，学习者机制模型提案：涂毒逐击新增毒未进入推演**。来源本局复盘及silent-0082（机制证据silent-0084）；定位`agent/src/reflex/turn-solver.ts:2001`、`agent/src/reflex/card-model.ts:843/:853/:961`（学习者只读live定位）。证据F9PP859XZ3RJ A4 F37 T5：两次攻击独立确认涂毒各新增1毒，实际5毒、模型仅算直接施毒3，漏2毒；预测24总伤、实际21直伤加5毒。蜃景预测2挡实增6挡的另4挡含同方案牌面更新差额，未独立全归涂毒；KAY522KT5NXR A0 F45 T4仅支持升级涂毒建2层，没有存活目标逐击对照，不作为本bug已验证旧错。交学习者按静默证据实现、自测、上线，运维仅转录，不扩充升级或其他机制结论。
- 本批没有角色无关的阻塞性纯bug或Dai待定事项；雕刻师仪式、苦无、路线等观察保留复盘及0083/0084/0085/0019，未定位的T7少估5伤等差额保留“未记录”，不据此另开已定位bug；不将新增五条账本全称A4首次遇到，不补打法。

### 动作清单完整检查失败（运维 codex，2026-10-05 11:02）
- **已修、待合入live**：观察者补测cf11fab8，tsc0、vitest214文件2758通过/1失败，`agent/tests/ops-codex.test.ts:107`检查`ops/codex-ops-do.sh:7`动作说明缺strategy-proposal。固定源`061d1ca9f3471a952e291efde38cfbeb6a44bd55`（.worktrees/step，step）补齐strategy-proposal/learner-recheck动作说明及docs/codex-ops.md用法；原回归修前失败、修后通过，固定沙箱tsc0、165文件1957用例通过。非阻塞live锁busy，未合入且无新MERGE_HEAD，不等锁、不重试，交接见notes/ops-handoff.md及paper/materials/silent/20261005-1054-broker-action-list-checks.md。
- **完整补测工具已实现，不重复开发**：05:44兜底后缺完整检查条目的工具源码f670884a已合入live 20c01c06并随后续发布保留；learner-recheck白名单动作在本轮代码中存在，可按固定批次核实源提交、固定树补完整检查、同批次同树去重、保留原失败历史并发learner-checks。此前10:52旧broker拒绝历史保留；当前清单修复合入后，用20261005-102754-experience-update批次补测最新live树，结果以动作回报为准，不用沙箱结果代替完整检查。

### 20261005-094524修复批次部分上线与复验阻塞（运维 codex，2026-10-05 11:15）
- **前六项已上线**：afd652a3策略任务/派发、f670884a兜底完整检查、a4f4ec86单次超时卡死误报、233ede56学习状态锁、87c89b7a账本追加更正、cd55a885预判临时敏捷；源提交均为main/live祖先，保留S1.fix11/20c01c06及cf11fab8，预判silent-0078经工具追加shipped。相应旧队列问题已实现；具体策略仍交学习者策略任务，运维不提供。
- **待学习者修测试隔离/预期问题后再合后两项**：定位`agent/tests/potion-cost.test.ts:298`和`:307`，来源本批live两次合后沙箱失败；相同固定快照452f7bc7在旧基线cd55a885与新源码e3e7068b均为2失败/23通过（potion-snapshot-baseline-source.log与potion-snapshot-fixed-source.log）。失败为rollout_best缺失和no_potion标签文本不同；学习者仅怀疑未隔离生成数据库，不视为已确定根因，不据此修改药水打法/模型、放宽断言或排除文件。证据夹具N95W F19 T3、ETYC F19 T1，均为既有铁甲测试，不借用为静默知识。学习者查清固定数据隔离与原测试契约，自测通过后再合3cd9fc6c/e3e7068b，并保留原失败记录。两项当前均非main/live祖先、silent-0081/0082仍proposed，无S1.fix12；live已回退452f7bc7、保留S1.exp12和七项刷新。
- **上一轮动作说明待办必须改合入方法**：061d1ca9的父86b24a1f含本次已撤回的两项模型，禁止整枝merge step或重跑旧部署脚本；下一manual从当时live建独立工作树，仅cherry-pick061d1ca9自身两文件差异再测试/合入。该方法保留动作说明修复且不带回未通过的模型；本轮只更正交接，未执行待manual合入。

### 最高优先：先解测试数据隔离阻塞，再尝试合入（运维 codex，2026-10-05 11:30）
- **纯测试基础设施问题，下一批先处理**：`agent/tests/potion-cost.test.ts:298`与`:307`仍阻塞发布；20261005-111301-fix-batch合后165文件、1945通过/2失败、总1947、vitest exit1，已回退452f7bc7。该批baseline-targeted.log与fixed-snapshot-targeted.log在相同不可变452f7bc7快照、旧/新源码都2失败/23未选择；前批快照全文件也2失败/23通过。根因仅怀疑测试依赖刷新数据库，尚未定位；查清测试读入的知识路径/缓存/固定夹具与原契约，给出固定数据回归并使当前live基线可复验。不凭自己的游戏知识改药水规则，不放宽断言、删除用例或新增排除。优先完成此项，**不要再次只复核原三项红绿后用同样失败的live检查重复尝试合入**。
- 当前三项固定提交均未上线：ed86d537动作说明与静态回归（含061d1ca9的两文件说明）、3cd9fc6c计算下注、e3e7068b涂毒；源分支166文件1958用例成功不等于合后成功。先解决上述测试问题，再按固定提交/live流程合入，保存全部失败及回退历史。0081/0082保持proposed、不登记S1.fix12；工具项不需要游戏账本。不引入未批准策略、不重建或覆盖在线刷新数据、不整枝merge旧step基线86b24a1f。

### 静默猎手9YBKCNBFP0X5复盘回报（运维 codex，2026-10-05 11:35）
- **非阻塞，学习者机制模型提案：异蛇头骨的毒雾额外施毒未进入后续回合推演**。来源批次20261005-111301复盘及silent-0086（机制证据silent-0087）；定位`agent/src/reflex/card-model.ts:972`、`agent/src/reflex/rollout.ts:2520`及`:1728–1731`，为学习者复盘时只读live aafd3e33定位，不声称与本局开局d9a3ea37+dirty逐字相同。学习者证据9YBKCNBFP0X5 A4 F25取得异蛇头骨；F48第6次T5毒雾PoisonPerTurn/能力层数3，T6两敌各4毒，T7/T8/T9各7/10/13，期间未实际打出其他施毒牌；后续回合模型仅读取并增加NOXIOUS_FUMES_POWER的3，未计遗物额外1。只定位后续回合毒雾触发缺口，不将能力改记为4层、不扩展为直接毒牌或随机瓶结论，不把整场失败或T9尚未定位的损失预测差额归于此项。交学习者依据本角色证据实现、自测、上线；运维仅转录，不修机制或补知识。
- 本批无新的角色无关阻塞问题或Dai待定事项；silent-0009/0079的重复证据、其他敏捷/余像及折扇等机制观察留在学习者复盘与账本，不新增策略、经验或SL名单。

### 静默猎手1LMBFGSMCWKU复盘回报（运维 codex，2026-10-05 11:56）
- **非阻塞，学习者机制模型提案：脆弱下新增敏捷直接加到折减后牌面格挡，方案高估**。来源批次20261005-114301复盘及silent-0089（机制证据silent-0091）；定位`agent/src/reflex/turn-solver.ts:1804`（将next.tempDex直接加到shown）、`:1812`（速度药水新增5敏捷），为学习者复盘时只读live定位，不声称与本局86b24a1f+dirty逐字相同。学习者证据1LMBFGSMCWKU A4 F48 T6：脆弱96、原3敏捷，速度药水后8敏捷；究极打击→速度药水→防御→残影方案预测22挡/0损，实际两牌各9挡、合18，末另斗篷扣4挡，对25攻击损3，末次重算已预测损3。仅确认两牌合计多估4挡；T3灵动步法后偏折/后空翻另见预测14挡、实际13。旧silent-0026修复的是能力敏捷遗漏，不视作覆盖本组合；更早C48LLXBGKXQ9 F12 T2、XYYQYBRM2A01 F17 T5使用速度药水时无脆弱，不借其推算本项。交学习者依静默证据实现、自测、上线；运维仅转录，不修机制或补知识，不把差额归为整局胜负原因。
- 本批无新的角色无关阻塞问题或Dai待定事项；其他打法和机制观察保留复盘及账本，五项旧条目均为support、无repeat。学习者已追加药水计数勘误（取得10瓶、使用9次、保留1瓶罐装幽灵），保留原文和更正历史；不由运维修改知识、经验或SL名单。

### 批次20261005-112812修复完成（运维 codex，2026-10-05 12:09）
- **已修：11:15/11:30固定药水测试数据隔离阻塞**，学习者e78352f7，S1.fix12，live发布991591d3；撤隔离3例失败、恢复26例通过，保留原断言和药水实现，不靠排除/放宽绕过。
- **已上线：10:29计算下注/涂毒提案**，3cd9fc6c/e3e7068b，silent-0081/0082经运维登记S1.fix12/shipped；机制0084已有经验记录，不重复当新bug。**动作说明与静态回归ed86d537同批已上线**，此前061d1ca9的两文件差异已有替代，原step含撤回模型的整枝合并禁令保留，不再待合入。
- **已修：11:35毒雾与异蛇头骨后续触发提案**，166594ed，silent-0086经运维登记S1.fix13/shipped，live发布00e809f4；仅转录学习者实现和9YBKCNBFP0X5证据，能力层数仍3，机制0087保留经验S1.exp13。
- 第一阶段源/合后166文件1959例，最终167文件1961例、tsc均通过；本轮经验补测固定72a6784f/61998977完整tsc0、218文件2769通过/2跳过，覆盖上述源码。原失败/回退历史保留，旧待办更新至已完成；11:56新脆弱/敏捷提案0089仍未包含在本修复，不由运维补打法。

### 批次20261005-121301修复完成（运维 codex，2026-10-05 12:37）
- **已修：11:56脆弱下新增敏捷格挡高估提案**，学习者源码71af970600794f87a993df428cdde14dd7809dd7，1LMBFGSMCWKU A4 F48 T3/T6、silent-0089（机制证据0091），已实际发布ef76ce1233381df370050a818dfd22edeb6bbbc9/S1.fix14，最终记录更正8f97aaef76e0ebe8b918b3218429cfd6cd8d9c5a。源及合后固定沙箱tsc0、168文件1964例通过，撤修复3失败/恢复3通过；只同步学习者产出及登记0089 shipped，0091不重复标已修。旧复盘提案和失败/回退历史保留，未修缓存/旧事件/超时及策略项仍按原队列与授权交学习者。完整外部补测由调度器后续事件归档。

### 批次20261005-124301修复完成（运维 codex，2026-10-05 13:14）
- **已修：旧事件选项屏重复问大脑**，源码25ce09bee5576b1adff8baf196fbe8b197a5ef11，JJ75S331VUKX A8 F31事件屏（turn不适用），已发布42ac6c1d52b8909b9ae292a7d236ffd80351614c/S1.fix15。`agent/src/hand/loop.ts:1735`复用原有有界状态变化等待；固定回归撤源码1失败/恢复1通过，调用2→1。源/合后沙箱tsc0、169文件1965例，独立完整外部tsc/vitest exit0、220文件2773通过/2跳过，固定树d96d4e36465a6b308b8825e0d1c20687e2e70af5。main机械同步固定完成提交，保留全部知识刷新和双方记录，无对应bug-infra账本id，不补建或冒用游戏条目。原F47覆盖层、单次超时/缓存证据不足及性能专项未修历史保留，策略项沿既有授权交学习者。

### 策略批次20261005-131301事实子项完成（运维 codex，2026-10-05 13:40）
- **已修子项：未校准静默时钟的boss本体血量与攻击事实供给**，学习者79f7579e29e39e1dcae9e1ea3bdceb53bf9a734b，silent-0098已兜底合入6a16980e431c72529c909a5314e0da3172835d1e/S1.strategy1，证据ZZMYZ5UBCG72 A2、9YBKCNBFP0X5/1LMBFGSMCWKU A4及CSBR5CRDWQNB A2，层/回合和限制见paper/materials/silent/20261005-1335-strategy1-release.md。第一样本即给当前进阶观测、base/shown分开及借级估计，无数据未知；女王400与聚合体199分列，不再混旧60补量。完整构筑/损血/存活回合校准仍未实现，不关闭整个时钟校准待办；其他策略因缺对照/阈值未实现。源及合后170文件1973例/tsc0，撤源码7失败恢复15通过，铁甲分支等价，完整外部检查待后续事件。只转录学习者产出，不加策略规则。

### 批次20261005-134302修复完成（运维 codex，2026-10-05 14:04）
- **已修：CARDS_VIEW关闭后火堆重复问大脑**，学习者源码518b6880b46db88752f3666ff8471267c3f6638d，7PWU4CD3QCP3 A8 F47火堆（turn不适用），已合入ee63d4bb09b28a5b530aa9ac82e704e158651be5、发布b05c898c38d9d940f5627e686162295ba0320dd9/S1.fix16。关闭成功后保留未执行答案、指纹/事实/问题均相同才复用；血量或牌组变动、关闭失败均不复用。撤源码1失败/恢复4通过，源及合后沙箱tsc0、171文件1977例，刷新7b607256七项知识blob保留，无对应账本id，不补建/冒用机制条目。main同步固定发布，完整外部检查待调度器后续事件；原已修清单82项及其他未修历史保留。

### 静默猎手UACFSW4VDDLD复盘提案（运维 codex，2026-10-05 14:04）
- **非阻塞，学习者机制模型提案：幻影之刃同方案首刀增伤遗漏9点**。来源UACFSW4VDDLD A6 F33首战T2、silent-0099（机制0101），学习者定位`agent/src/reflex/card-model.ts:863`（未建模能力回退8分）及`agent/src/reflex/rollout.ts:1001`（持续能力表未列），运行版本103fd5ff+dirty；只读当前live定位不声称逐字等同运行版本。方案预测20，实际打击10/中和5/首小刀14共29，358→329；敌方结算前3荆棘另329→326，不混入29。仅独立量化新建立能力的同方案首刀增伤，不将保留或跨回合误差、整局失败全归于此。交学习者依本角色证据实现/自测/上线，0099保持observed；运维不修机制，不把本批S1.fix16传输修复标为0099已修。其他阶段结束线和路线选择留学习者复盘/账本，无新纯阻塞bug或Dai待定事项。

### 阶段结束事实子项上线（运维 codex，2026-10-05 14:30）
- UACFSW4VDDLD A6 F48第6次T4/silent-0100：学习者固定源1d57f9d0dbbb63603e9ce9768e74cb2021478464已合入2b70928af6e2d02f6f683c9b522d601913ed5204、发布0a066c2f9dd01c0dba7a34b03570e646557bf817/S1.strategy2；单独展示当前阶段结束事实及最低即时损血参考，同值并列，由Jev决定。源及合后固定沙箱tsc0、172文件1982例，撤3失败/恢复5通过；0100已shipped。仅此事实子项完成，整体全死权重、路线/休息阈值、固定顺序、SL及完整时钟校准仍未实现，不将局部上线记作所有策略已修。完整外部检查待调度器事件。

### 幻影之刃模型提案已修（运维 codex，2026-10-05 15:10）
- 14:04的silent-0099提案由学习者源码d65609ff2bc98ec5ec2e06b558159aba89d93032实现，来源UACFSW4VDDLD A6 F33首战T2/第2次T5、F48首战T9（机制0101）；已合入6aa5eb0b22eaed2a649fa9e763ea9c96b5f3fca1、发布3ebbdc6c01a8685c09ebb2933f6dea76e35fb8d5/S1.fix17。0099已shipped，0101保留独立S1.exp15不重复登记；同方案首刀补伤、牌面已生效识别及后续回合每回合一次，边界按原handoff，不扩展完整保留/升级/叠加。撤源码5失败/1通过、恢复6通过，源与合后tsc0、173文件1988例，无重跑；七项刷新保留，首次预检误拒未动live历史保留。完整外部检查待本批learner-checks，其他策略和证据不足项继续保留，不新增机制或策略判断。

### 静默猎手6EV5V6PJJS9D复盘提案（运维 codex，2026-10-05 16:32）
- **非阻塞，学习者机制模型提案：音叉技能计数触发的7点格挡未进入方案推演**。来源批次20261005-161301及silent-0108（实测机制旧条目0072）；学习者定位`agent/src/reflex/passive-pieces.ts:192`、`agent/src/reflex/turn-solver.ts:1596`与`:2209`，只读复盘时live，不声称逐字等同本局运行源码。证据6EV5V6PJJS9D A6 F39 T3：打击→生存者+→带毒刺击→防御方案预测11挡/损21，实际脆弱下两技能给8/3挡，音叉计数9→10在弃牌完成后额外补7，最终18挡对32攻击损14；更早T082DRCUHRRD A0 F12 T7同线预测9挡、实际16，首次证据由学习者回溯。这里只转录学习者证据，0108保持observed；0072机制经验shipped不等于模型已修，该回合没有因差额当场死亡，不把整局失败全归于此。交学习者依据静默证据实现/自测/上线，运维不修机制或补打法。

### 音叉模型提案已修（运维 codex，2026-10-05 16:57）
- 16:32的silent-0108提案已由学习者源码dba8d7caf9f2b44dd2fd11fd8861ecc14be4c09b实现，证据6EV5V6PJJS9D A6 F39 T3、T082DRCUHRRD A0 F12 T7；实际合入68a415a9f71beca9549573141248aab2c81fa0d1、发布0ff3ce8214c3122805bb27ddafa668a76519e79a/S1.fix18。前者预测11挡/损21修为18挡/损14，计数跨回合持续、续行不重复補7；旧机制0072不重复登记，0108经ops登记shipped。固定两帧撤4失败/1通过、恢复5通过，源及合后沙箱tsc0/174文件1993例，无重跑；七项刷新保留，不改策略或药水，无生成器重建。独立完整外部检查待本批learner-checks，未修事项及原提案历史保留。

### 静默猎手2L1BNN9ZJEFU复盘提案（运维 codex，2026-10-05 18:06）
- **非阻塞，学习者机制模型提案：融入暗影+升级分支被排除**。silent-0112；学习者只读复盘时live8944c7a1定位`agent/src/reflex/card-model.ts:873`、`:966`及`agent/src/reflex/turn-solver.ts:1832`，不声称逐字等同本局脏工作树源码。证据2L1BNN9ZJEFU A6 F48第6次T8：11血面对42攻击，手上技法12挡后升级暗影使后续生存者13实增26、末38挡/损4；least-loss仍按25挡/损17写剩血−6，差13挡。普通版0075/S1.fix10及机制0077不代表升级分支已修，0112保持observed，不把差额当整局胜因或宣称换序必胜。
- **非阻塞，学习者机制模型提案：预判+升级分支漏传4点临时敏捷**。silent-0113；定位`agent/src/reflex/card-model.ts:875`、`:975`及`:887`。更早VN7RQJMJEFMX A6 F30 T1候选仅给常驻价值3，现场建4敏捷/4预判；75X1BARMNZ03 A6 F17 T2所选预判+→防御→带毒刺击→打击→生存者方案预测13挡、实际9+12=21，差8挡。本局2L1BNN9ZJEFU F48第6次T5先两防御再预判+，预测/实打均14挡/损16，虽然建4敏捷却无后续格挡牌，不能把本局这一正确读数写成少算8。普通版0078/S1.fix11与升级机制0080不代替升级牌模型修复；0113保持observed。两项均交学习者依静默证据实现/自测/上线，运维仅转录，不修机制或补打法。

### 两项升级牌模型提案已修（运维 codex，2026-10-05 18:54）
- 18:06的silent-0112/0113由学习者固定源码2184caaab265ebf86c0627aaef39c2e7a170a990/d91f9600286a67480b5044e019dbb1041e2239af实现，实际合入850ac015818ef7633d5d6a028a9e56e7b8ead55a、发布65d99e74c24daf6dfbe746d9dc810832e199c979/S1.fix19；本批源/合后沙箱tsc0、174文件1997例通过。0112按2L1BNN9ZJEFU A6 F48第6次T8实38挡/损4，撤2失败/4通过、恢复6通过；0113按VN7RQJMJEFMX A6 F30 T1、75X1BARMNZ03 A6 F17 T2实21挡及2L1BNN9ZJEFU F48第6次T5实14挡，撤2失败/2通过、恢复4通过。两项经ops登记shipped，旧普通版0075/0078和机制0077/0080不重复登记；保留原提案、首次旧high测试契约失败和修正后检查历史。七项刷新保留，完整外部检查待learner-checks，其他策略或证据不足项保持；运维只集成/登记学习者产出。

### 静默猎手53FLQ68CETW0复盘提案（运维 codex，2026-10-05 19:09）
- **非阻塞，学习者机制模型提案：爆发增益未进入后续技能推演，少算14格挡并误判必死**。silent-0114（实测机制0115）；证据53FLQ68CETW0 A6 F48第5次T12，爆发后BURST_POWER 1、5血2挡、三张各12伤凋萎、无敌攻击，对双防御预测余血−1/所有线必死；实际挡2→30→44、T13仍5血，少算额外防御12与余像2共14。学习者只读复盘时live65d99e74定位`agent/src/reflex/combat-plan.ts:2849`（仅读取通用重复）及`:2851`（攻击重复）、`agent/src/reflex/turn-solver.ts:1581`、`agent/src/reflex/card-model.ts:892`（未建模回退5分），不声称复原本局ee1f4fd1+dirty源码。没有整场替代胜局，不把差额当整局败因；0114保持observed，交学习者按本角色证据实现/自测/上线，运维不修机制或补打法。其他机制/路线/休息发现留复盘与账本，没有新角色无关阻塞bug。

### 爆发模型提案已修（运维 codex，2026-10-05 19:42）
- 19:09 silent-0114提案由学习者固定源dce7dc19c15f8cd1de57a5fffb2011ca1aac2187实现，实际代码合入2ec81b9f2f0856cac2cfecf5c65750759c3aafae、发布8e471de8012b69a91894ac74527fc65c59eefbf5/S1.fix20。53FLQ68CETW0 SILENT A6 F48第5次T12实44挡/损0，原模型30挡/损6；撤源码3失败/3通过、恢复6通过，源/合后固定沙箱175文件2003例/tsc0。仅0114经ops登记shipped，0115独立机制不混记本修复；原提案、能量断言校正及部署参数预检拒绝历史保留。三项刷新保留、完整外部检查待learner-checks；其他策略、证据不足和性能专项保持，运维只集成并登记学习者产出。

### 学习者升级爆发模型提案（运维 codex，2026-10-05 20:29）
- **非阻塞机制模型，来自经验.20学习者的只读定位**：证据VN7RQJMJEFMX SILENT A6 F27 T6，升级爆发建立2层，究极防御15重复后产生30格挡增量、剩1层；学习者定位`agent/src/reflex/card-model.ts:877`仍排除升级牌、`agent/src/reflex/combat-plan.ts:2853`只读BURST_POWER===1。来源learner/runs/20261005-194302-experience-update/handoff-ops.md及第二十节changelog、机制账本silent-0115。普通1层模型0114/S1.fix20已修，S1.exp20仅经验上线，升级/多层模型范围尚未在本任务实现；不把现场效果当作整场替代胜局，不补未观测组合。交学习者依本角色证据实现和固定测试后上线，运维只转录证据与定位，不改机制代码；ENKY的新0118组合另留其学习任务。

### 论文：token 消耗和对应的钱（Roy 2026-10-05 20:3x，高优先）
Roy：「论文的材料，要能算出消耗的 token 以及对应的钱；订阅的额度 Roy 会给，大概能算出来」。做成一个可重跑的统计（例如 eval/cost.py → paper/data/cost-<character>.csv 和 paper/materials/<character>/cost.md，接进 paper_dataset --no-raw），按**组件 × 进阶 × 局**分列：
- **对局大脑（codex GPT）**：logs/brain.jsonl、logs/codex-calls.jsonl 的输入 / 缓存命中 / 输出 / 推理 token、调用次数、耗时；DeepSeek 回退单列（按 API 价）。
- **Jev**：每局请求数和 token（runs.jsonl 的 jev_calls、tokens 等；按 TypeSafe 的 API 价）。
- **codex 学习者**：learner/runs/*.jsonl 的 learner_summary（每个批次的输入 / 缓存 / 输出 token、墙钟），按任务类型（复盘、经验、修复、策略）和它服务的局 / 进阶归属。
- **codex 运维会话**：ops/codex-ops/wakes*.jsonl 和 session rollout 的 token。
- **Claude 观察会话**：本会话的转录（~/.claude/projects/-home-dw-Projects-agent-sts2/*.jsonl 里 assistant 消息的 usage），只读取、不改。
- **订阅换算成钱**：codex 是 ChatGPT 订阅，按「周额度用掉的百分比 × 订阅价按周折算」估算，用 codex-usage 读到的 weekly / 5h 窗口百分比做时间序列（如果现在没有持续记录，就加一个定时快照，写进 logs/ 某个 jsonl），再按各组件的 token 份额分摊；Claude 订阅同理。订阅价和额度留成配置（例如 eval/cost-config.json 的占位），等 Roy 给数字后填；API 计价的部分（DeepSeek、Jev）直接算。
- 输出每一级的：局数、总 token、各组件占比、估算花费、每局 / 每胜的花费；以及从 A0 起的累计曲线。
- **订阅数字（Roy 2026-10-05 20:41）**：Claude = Max 20x，**$200/月**；ChatGPT（codex）= Pro 25x，**$500/月**。写进成本配置（如 eval/cost-config.json），注明来源和日期；周折算按 月费 × 12 / 52。Claude 观察会话与 codex 的额度互不相关，各自按自己的订阅算。

- **运维派发指令（Roy 已授权，2026-10-05 20:43，下一批 fix-batch 第一优先）**：本节为 Roy 批准的论文统计/运维架构任务，按已批准任务执行，不能因旧模板“仅纯 bug”“logs/、paper/ 只读”而略过。先做最小可用、自动持续的订阅额度采样，测试后先提交/合入并让调度器下一次运行开始追加快照，再完成各组件 token 与成本归集；其他队列项后置，勿让全量成本报表延后额度采样。沿用 broker/scheduler 的授权范围和 merge=live，不另设审核。只允许在本工作树改采样器、调度器、成本统计及配置，在主目录 logs/subscription-usage-snapshots.jsonl（或兼容读取该文件的新采样文件）追加安全额度数据，以及本节指定的生成论文表/成本报告；严禁覆盖历史、打印 key/token、修改认证或 .env、借动作执行任意命令。
- **首条观测已留档，窗口须校验**：`bash ops/codex-ops-do.sh scheduler-status` 在本轮 exit0，显示 `weekly limit 43% used`；`ops/codex/lib.ts:304` 实际只读 rate_limits.primary.used_percent，未核对窗口时长，所以这条缓存观测已于2026-10-05 20:42:53+08:00追加至 logs/subscription-usage-snapshots.jsonl，周/5h、重置时间、原采样时间保持未知，论文副本 paper/materials/silent/20261005-2037-cost-priority.md。下一批通过沙箱外安全调度采集真实窗口（按 window_minutes 区分周与5h），保留采样/重置时间、失败或过期状态，不能把 cached primary 值直接冒充实时周额度。采样失败不得阻塞对局或主调度，使用固定数据测试窗口映射、重置跨期、追加不丢历史和脱敏；不能把输入内缓存/输出内推理 token 再重复计入总额，也不能重复累加累计 token 事件。
- **本轮接收的订阅数值已有决定**：本节20:41 Roy给定的Claude $200/月、ChatGPT $500/月已在main 6e5ccbe2，按其指定月费×12/52折周并记录估算方法；未知API计价或额度参数明确缺失，不编造。运维没有新增游戏知识，也不改变打法。
- **分层（Roy 2026-10-05 20:5x 认可）**：这是评估和日志统计的新功能，不是运维也不是 bug 修复。采集归眼（日志）：已有的 brain.jsonl / codex-calls.jsonl / learner/runs 摘要 / 运维唤醒记录照用，只新增 codex 周额度百分比的时间序列 `logs/codex-usage.jsonl`；入库归日志库（agent/tools/logdb：把学习者和运维会话的 token 同步进来，与 llm_calls 统一查询）；计算归评估模块（`eval/cost.py` + `eval/cost-config.json`，与 eval/metrics.py 同处）；论文产出由 ops/paper_dataset.py 调用生成 paper/data/cost-*.csv 和成本说明页；运维只加定时额度快照和每局后的刷新。

### 完整补测失败：额度测试依赖TMPDIR（运维 codex，2026-10-05 21:24）
- **非阻塞纯测试基础设施，下一批fix-batch优先修复**：定位`agent/tests/subscription-usage.test.ts:36`（导入区`:1-2`），`mkdtempSync(join(process.env["TMPDIR"]!, "quota-test-"))`假定TMPDIR必有值。证据批次20261005-204301-experience-update，实际固定发布c3f0410c72166b5c3145fe25c12a2974569b4ff6/树ba54713b8b91189f4f38e569a06bf4df318f6371，沙箱外完整检查exit1：227文件226通过/1失败，2813例通过/1失败/2跳过，唯一失败“appends success and failure without losing history or disclosing account/error payloads”，TypeError path received undefined；原日志`ops/codex-ops/learner/20261005-204301-experience-update.fallback-ba54713b8b91189f4f38e569a06bf4df318f6371.checks.log`，21:09:35开始、561.33秒。该文件来自额度采样源bd418431，不是静默经验数据改坏。
- main当前同固定发布测试源码，21:22定向复现明确移除TMPDIR后1失败/2通过、exit1；学习者沙箱任务显式设置TMPDIR，原源/合后176文件2006例通过，因此完整环境暴露了临时目录假设。按Node临时目录API兼容未设置TMPDIR的正常环境，并保留有TMPDIR时的行为；固定数据验证未设置/已设置两种环境，保留成功/失败追加、历史不丢失及脱敏断言，不放宽断言、不新增排除、不要仅给完整测试命令补TMPDIR掩盖问题。
- 运维决定**派修复、保留上线**：失败发生在测试临时目录初始化，采样器21:15已有fresh周44%真实安全样本，对局行为不受此测试影响；不回滚经验.21或停止额度采样/对局/调度，14项shipped历史保留。当前20261005-204301-fix-batch仍在做成本归集/升级爆发，同工作树不并发修改；本项由下一批机械派发，修复自测通过自行合入后再补完整检查，失败历史保留，不记完整套件已通过。局号/层/回合不适用，无新增游戏知识或Roy待定。

- 2026-10-05 22:01 运维codex核实21:50分阶段通知：升级爆发机制缺口由学习者dafd280b→live e7370f88→32948742/S1.fix21修复，仅VN7RQJMJEFMX A6 F27 T6已观测2层；0115代码链登记、0114原shipped不重置。TMPDIR基础设施条目已在同一204301-fix-batch提前修复6bfbe3d2→live d5a4f6fc，源/合后tsc0及177文件2012例、未设置/已设置固定环境均通过；原21:24失败记录保留，修复已落main 3c06417b3530824fb9c81f4b3c5013a42a965bef。旧完整exit1不改，修后外部完整套件待该批最终完成事件，不再把本条机械派作未修；成本分层后续仍在当前批继续。详情paper/materials/silent/20261005-2150-cost-burst-exp22-release.md。

- 2026-10-05 22:10 22:06 learner-checks后续确认：经验.22批次20261005-211301-experience-update在修后固定树b248ad374edbe9dfd5dfc690e2ff7aa8cc3fbd55/发布d5a4f6fcbdb444ee026de83d7507d8dc8c6fb53b完整tsc+vitest exit0，228文件2820通过/2跳过，21:46:40开始562.58秒，原日志ops/codex-ops/learner/20261005-211301-experience-update.fallback-b248ad374edbe9dfd5dfc690e2ff7aa8cc3fbd55.checks.log。原21:20旧树ba54713b完整exit1和所有环境对照历史不改；TMPDIR本条新树完整补测完成，源/合后沙箱通过也保留，不重复派修。该检查覆盖固定d5a4f6fc已上线阶段，同fix-batch后续成本分层改动仍待最终事件的完整检查。

- 2026-10-05 22:33 运维codex确认22:20最终完成通知：成本分层83b73312已合入最终代码5ae08a3d/发布27f7a4d3，main机械同步64c93b382d5bdca7c3607ce5d23a4f31555c6929；安全采样、成本归集、日志库组件入口、规范codex-usage及每局/独立report刷新已全部实现。源/合后tsc0、178文件2013例通过，Python分层9例/既有35例、撤源失败恢复通过及Inferno首次失败/单独4例/最终全套通过历史保留。规范日志已有fresh周47%样本、10080分钟，旧快照兼容不覆盖；新分层成本表已刷新，Jev价格/Claude实时额度保持未知。S1.fix21唯一e7370f88、0115已登记/0114不重置，无新bug-infra/对局版本。最终树54560c457714274c6d35226b4427448232e4c6db完整外部检查通过learner-recheck动作请求，结果随后归档，不冒用d5阶段通过；详情paper/materials/silent/20261005-2220-final-component-cost-release.md。

- 2026-10-05 22:36 22:20最终固定发布完整补测已完成：204301-fix-batch/27f7a4d3/树54560c457714274c6d35226b4427448232e4c6db调度器fallback_checks rc0，外部tsc+vitest exit0、229文件2821通过/2跳过、22:21:37开始610.59秒，日志ops/codex-ops/learner/20261005-204301-fix-batch.fallback-54560c457714274c6d35226b4427448232e4c6db.checks.log。成本最终发布完整待办完成；原ba54713b TMPDIR失败及Inferno首次失败/重跑历史保留。运维补测请求取得锁时已是后续7bea7d99/c196d205树，有限动作已在执行、其结果交后续learner-checks，不与本固定发布混记或重复派发；详情paper/materials/silent/20261005-2220-final-component-cost-release.md。

## 2026-10-05 23:13 新复盘非阻塞缺陷（silent-0127，交学习者）

- [ ] `agent/src/reflex/rollout.ts:1386`（同时见`:1356`）：学习者发现没有眩晕后继数据时沿用原招式、缺伤害模型时沿用现场无攻击，漏掉熟睡甲虫醒后威胁。证据`3KME36ADUE4U` A7/F27第2/3次T1：下一轮报8、五轮仅损1／约94%，实际T2甲虫16＋丝虫8＝24攻击、14挡后损10；完成样本0/16和0/24。最早同型证据`53FLQ68CETW0` A6/F30 T3五轮全报0损、T4实际滚动；首次登记为本批，非已学习后重犯。来源notes/lessons.md本局首条、账本silent-0127；非对局卡死/崩溃/非法动作，运维只记证据，交学习者核对并实现，不自行补未知招式或游戏机制。未验证修复后的受控胜负，不把全部损血归因于此项；silent-0128机制观察保持observed。
- **Jev 计价（Roy 2026-10-05 23:14，TypeSafe 用量页截图）**：输入 **$0.042 / 百万 token**，输出免费（页面注：Estimated at $0.042/MTok input · Free output）。填进 eval/cost-config.json，combat:jev 的 api_usd 由此算出，Jev 的 cost_complete 应变 true。交叉核对：用量页「Last 30 days」截至 2026-10-05 共 $4.9641、119,495,182 tokens、24,740 requests（9/28 起有数，含铁甲和静默全部 Jev 调用）——用同一时段 logs 里的 Jev 合计对一下，差多少写进 paper/materials/silent/cost.md。

- **2026-10-05 23:22 运维机械派发优先级（23:15 manual，Roy 已授权）**：下一批 fix-batch 先完成上述 Jev 价格配置及 TypeSafe 近30天用量与全部角色日志合计的交叉核对，再处理23:13非阻塞证据0127及其余队列。Jev 输入 $0.042/百万 token、输出免费；页面 $4.9641 / 119,495,182 tokens / 24,740 requests（9/28起有数，10/05截图，近30天口径）。这是论文成本记录任务，沿20:37/20:46授权，不因游戏策略跳过；时间、输入/输出、缓存、完整性及角色/组件归属口径须明示，页面覆盖缺失或差额保持未知并据日志说明，不编造等额。运维不改计价源码，交学习者在任务工作树自测后 merge=live。

- [ ] **2026-10-05 23:31 非阻塞测试不稳定证据（运维交学习者，保留原失败）**：agent/tests/turn-start-settle.test.ts:165 的 Inferno 首次COMBAT指纹与最终指纹不同断言，在经验.24固定合后树（提交79b415c09d2cf198506fb00394de1818436d975e）失败，合后tsc0、177文件2018例通过/1失败，23:25:06开始302.52秒，原始 /tmp/sts2-2315-live-sandbox.log 将归档论文材料；与204301成本批曾记录的同断言失败一致。该经验仅改silent experience.json，agent/src与该测试未改；运维先恢复固定合前256b0eee，定向诊断及同树完整重跑最多一次，不降断言/排除名单、不据此添加游戏机制。后续学习者用固定夹具处理首次读取/时间假设，原失败不回改为成功；这是测试问题证据，非新的对局卡死。Roy Jev计价仍为最高优先。

- 2026-10-06 00:20 运维兜底完成（00:00 fix-done 20261005-232305-fix-batch）：Jev输入0.042美元/百万token/输出免费与TypeSafe用量页全部角色日志核对已实际上线，源80199dcc；silent-0127缺眩晕后继/伤害预测标未知已上线，源631f9485，实际live合入f4a6173a、发布9988ca8b/S1.fix22、main 81654027。源与合后固定沙箱tsc0/181文件2037例通过，0127原占位错误及真实SHA更正保留并登记shipped，不给Jev新建bug-infra或把0128完整机制冒记已修；完整外部检查已请求本批learner-recheck，待后续事件。仅关闭上述已实现范围，其他策略/超时根因/缓存实测/模拟性能专项与旧失败证据保持。

- 2026-10-06 00:32 [复盘新纯bug，非阻塞，交学习者] VLV17NUSFS61 SILENT A7 F48第6次T5：单行动题重复扣除现有格挡，结束选项需损12而非防守选项报0；学习者定位agent/src/reflex/combat.ts:61、:97、:141、:164，已扣playerBlock的hpLoss再减一次playerBlock。学习者回溯Z6CFLDR3N4SB A7 F48首战T10，已有9挡，结束需损40但带毒刺击选项31；账本silent-0130，first_run按原学习者记录Z6，不改first_run/prior。当前仍能执行/推进，无卡死或崩溃证据；Jev末题仍判致命，修复后受控胜负未记录，不把整局死亡归因于此项。运维只归档证据，不改伤害/出牌模型；详notes/lessons.md的VLV17NUSFS61节。

- 2026-10-06 00:44 [新测试失败证据，非对局阻塞，根因未定] 000206 Inferno夹具兜底合后固定9fc1e4f8/树e00c7ce75b7a66da53f0dd33ac9dbaa88fe3ff1a唯一失败agent/tests/ops-herdr.test.ts:187:107（--close-on-exit registry期待空、仍有batch-1），同文件与ops/herdr-host.sh和合前341b75fe blob相同；源181文件2038例首过，合后tsc0/179文件2026例通过+1文件1例失败，paths未运行。已回退341b75fe并保失败分支/完整日志，原时间/指纹断言保留不弱化；本轮只一次同树隔离复测，结果随后追加。此为固定测试证据，运行run/floor/turn不适用，不能据此声称实际herdr进程清理bug已定位或新建游戏知识/bug-infra。详paper/materials/silent/20261006-0028-postmortem-and-inferno-handoff.md。

- 2026-10-06 00:52 [已完成测试修复，保留旧失败历史] Inferno首帧/时间竞态队列项由学习者195869aa实际合live 5b005215e6f578e34bac9f4bb25d50a8a18dd112、发布000ab7927ba3e57fa786b7d5f593a6eed290ccd2，main 1498dd0708ab8ce6bca024091456b48493bcd72f；源首过、首次合后herdr断言失败及回退保留、同一固定合后树一次完整复测tsc0、181文件2038例通过；herdr失败根因未定仍留队列，撤夹具改动1失败/恢复5通过，初次字段错误及既有23:15失败/回退历史保留。仅测试夹具改动，不增行为版本或台账；完整外部本批learner-recheck已请求待事件。新复盘重复扣挡0130仍待学习者，不能随本测试项冒记已修。

## 2026-10-06 02:31 经验第28批机制覆盖证据（转录学习者，待验证）

- [ ] **非阻塞机制模型提案**：`agent/src/reflex/card-model.ts:881`当前只在未升级时建立腐蚀波抽牌施毒，升级3层入口待核；已有CORROSIVE_WAVE_POWER读取与建立前缺口分开。来源第二十八次changelog/handoff-ops.md、账本silent-0076/0137；证据2PVLGRBGUX9S SILENT A7 F48首T11，后空翻抽2使36→42毒、敌HP212不变，之后扣42至170。仅转录学习者发现，未复原本局9988ca8b+dirty源码，不将死亡归因于此项；交学习者核对原帧、固定测试后实现，不按旧普通分支已修状态跳过升级证据。
- [ ] **非阻塞机制模型提案**：`agent/src/reflex/card-model.ts:983`敏捷入口仅FOOTWORK，专长MAD_SCIENCE的2敏捷入口待核。来源同批changelog/handoff-ops.md、silent-0136/0138；证据2PVLGRBGUX9S SILENT A7 F48首T2科学后1→3力/0→2敏捷、T4步法到5敏捷。0103旧攻击紧勒和0138四模板不可混用；只记学习者证据，不冒记已修或独立纯bug，不补其他模板/游戏知识，交学习者核对并实现。

## 2026-10-06 02:40 完整补测预算断言失败（运维交学习者，优先核查）

- [ ] **非阻塞预算/时钟问题，根因待核**：`agent/tests/target-options.test.ts:178:31` 的真实时钟1500ms预算断言，在经验第28批固定发布98f88e06ac849c29af6474c76121f37c2d8019ce/树d98a9fdb2704aea31f544c350f5a16ae902f64b7报1506>1500；完整tsc/vitest exit1，233文件2855例通过、1文件1例失败、2跳过。证据ops/codex-ops/learner/20261006-020339-experience-update.fallback-d98a9fdb2704aea31f544c350f5a16ae902f64b7.checks.log，02:25:43开始555.36秒，原SHA cb1f9f971f2391c38046c944ba4e87344acc9b6d30c02f16563168e392ac1ac1。同agent源码及固定夹具一次定向1文件22例通过/exit0（43.65秒），原日志paper/materials/silent/20261006-0236-target-options-check.txt。源825c94d5只改静默经验，不把该失败冒记为新机制问题或已定位生产bug。
- 运维选择**派修复、保留上线**：学习者用固定数据/受控时钟核对生产硬截止与测试时钟边界，只修实际存在的缺陷；若只是夹具时钟不稳则保持原预算含义。不得提高1500ms预算、放宽断言、增加排除或仅重跑后声称已修，不写游戏策略/知识。需修复则源码撤回失败/恢复通过及源/合后沙箱通过，再由调度器补完整套件；证据不足明确未修，保留本次失败与定向通过历史。局号/进阶不适用于新增系统缺陷，EZ2L F48 T2只是既有固定测试夹具，不新建bug-infra条目。

## 2026-10-06 03:00 最高优先：策略4完整补测的rollout时钟预算失败（交学习者）

- **最高优先，非阻塞系统预算/时钟问题，根因待核**：agent/tests/rollout-live.test.ts:249:40 的真实时钟固定夹具yg3h-f33-t1报2993>1800ms（生产常量agent/src/reflex/rollout-live.ts:72为1500ms，断言容许300ms末采样边界，超1193ms）。独立完整tsc/vitest exit1，234文件2861例通过、1文件1例失败、2跳过；固定6566b7d308947e1929cb398034dd8f02a1d1cb25/树298172c3021fbc4bdb6fc1b53f0a79e7b143fff3，02:47:22开始500.39秒，原SHA 0861eb38d55332c5fbf5a3663d7f133a5c4702c6d85f1b5067065a16df5c72e0。详paper/materials/silent/20261006-0257-strategy4-full-check-failure.md及原字节归档paper/materials/silent/20261006-0257-strategy4-full-check.txt。相关rollout测试/生产源码与策略4合前98f88e06 blob相同；六项知识自动刷新不能据此称无影响，生产缺陷和负载/夹具边界需依据受控证据区分。
- 运维选择派修复、保留S1.strategy4/0139实际shipped，对局照常。下一fix-batch先与02:40 target-options 1506>1500证据一起核查生产硬截止传播、最后采样/模拟边界和测试时钟/并发；只修已证实系统缺陷，**不得提高1500预算或1800断言、放宽/删断言/排除测试、仅重跑通过就称修复**。固定数据/受控时钟撤源失败、恢复通过，源/合后固定沙箱通过后由调度器补完整外部套件；仍未定位则明确未修、保留全部失败历史。不要改游戏机制、策略/经验或重置0139/相关账本；无对应新bug-infra不建或冒标shipped，局号/进阶不适用（yg3h是已有测试夹具名）。

## 2026-10-06 03:08 A8首胜复盘：升级萎靡机制覆盖证据（交学习者）

- [ ] **非阻塞机制模型提案**：agent/src/reflex/card-model.ts:815的MALAISE入口仅!upgraded；证据LLYSRQQ35AVW SILENT A8 F33 T3，萎靡+显示unmodelled，零能量实测CRUSHER力−1/虚弱+1、意图18→6且7挡覆盖，HP63不变；F38 T1花2能量减3力/加3虚弱；F48 T2花3能量，TORCH_HEAD_AMALGAM力0→−4、虚弱1→5、攻击13→10，TUNING_FORK另给7挡，HP69→66。来源notes/lessons.md本局新节、20261006-024301.out、silent-0144/0146，最早证据KAY522KT5NXR A0 F31 T1。
- 只转录学习者发现，不按角色无关阻塞bug由运维修，不自行补公式或重建bf63ab40+dirty对局源码。旧silent-0051/S1.fix5仅未升级模型，不重置它的shipped状态；0144原kind=bug-infra保持，升级机制实现与固定验证由学习者负责。无受控全战反事实，不将胜负或全部预测差额归因于此；此前03:00系统时钟预算核查仍为最高优先。

- 2026-10-06 03:19 运维勘误：03:03归档及队列曾将silent-0146与升级萎靡入口关联，原账本0146实际为微型帐篷同营火HEAL/SMITH可并存及两种顺序；0145为该帐篷购法与实回/升级收益。升级萎靡覆盖缺口只关联0144（旧机制观察0053、未升级模型0051独立），不关联0146。原账本、复盘及旧错误记录保持，A8小结按原条目写。

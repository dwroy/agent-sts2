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

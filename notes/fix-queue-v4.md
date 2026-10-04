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
- outcome-stats 加载时机：进程第一次读取后就缓存，文件刷新后不重新读。4AWD 拿到的仍是只有 A8 的表，要到 9VHP 才用上 A9 数据。建议文件变化时重载，或者 autoplay 等赛后刷新完成再开下一局。
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
- **非阻塞，学习者机制提案待开发审核：毒牌施毒、结算与条件评分缺口**。来源 Y6GM2CHWJBEY 复盘、账本 silent-0008，定位 `agent/src/reflex/card-model.ts:749`。学习者报告毒牌施毒与回合结算未进入推演，空打条件牌仍获得常驻评分；同族战六次 T2 均向没有中毒的目标打出咕嘟冒泡，消耗能量而没有效果。具体机制证据在 silent-0010 / silent-0011；运维只转录有局号的提案，不补充或实现规则。
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
- **非阻塞，学习者机制提案：余像逐牌格挡未进入推演**。来源 LRN0HPZ0FZS1 复盘首条、账本 silent-0022（机制证据 silent-0023），定位 `agent/src/reflex/card-model.ts:816`、`agent/src/reflex/rollout.ts:992`（复盘时 live 4915e3b3）。学习者报告 F48 T1 同一三张前缀预测6格挡、实际8，F48 T2 同一完整防御线预计损6、实际损2；提出按本局逐牌触发及重放证据建模。这里只转录学习者提案，不补机制、不改模型、不作 accepted/rejected 审核；由学习者依新分工实现、自测、上线。既有 silent-0003（boss 时钟角色隔离）和 silent-0008（施毒/结算模型）的新证据已由学习者追加原账本，不重复开项。
- **（先做这条）沙箱里跑不完完整测试，学习者没法自测后合入**（观察者 2026-10-05 01:5x）：exp 批次 Y6GM 和 codex-dev 修复批次都因完整 vitest 在 codex 沙箱里跑不完而停在「未合入」（固定假子进程在沙箱里起不来：brain-codex 测试 21 例异常，learner 测试同类；exit 124），由观察者在沙箱外跑测试后合入。要做成：① 一个「沙箱内可跑」的测试命令（排除只在沙箱里失败、需起子进程的测试文件，名单写死在脚本里并说明原因），学习者任务的自测改用它；② 合入 live 之后，调度器在沙箱外跑一次完整 tsc + vitest，失败就写收件箱并叫醒运维会话（运维会话决定回滚还是派修复）；③ 经验批次、修复批次结束时调度器发事件（现在只有复盘批次有），运维会话据此确认已合入。另：tests/turn-start-settle.test.ts 的「Inferno up」一例在对局负载下偶发超时（单独跑通过），把它的计时改稳。另：exp 批次 Y6GM 的台账 update 有 4 行被 ledger.py 拒绝（evidence 是空列表），在 learner/runs/20261005-001708-experience-update/ledger-update-pending.jsonl，补成有效行写入。

### 静默猎手 T082DRCUHRRD 复盘回报（运维 codex，2026-10-05 02:05）
- **非阻塞，学习者机制模型提案：灵动步法新增敏捷未进入整条方案及后续回合推演**。来源 T082DRCUHRRD 复盘首条、账本 silent-0026，定位 `agent/src/reflex/card-model.ts:816`、`agent/src/reflex/rollout.ts:992`、`:1852`。学习者证据：F23 T3 同一「打击→灵动步法→防御」方案预测新增5格挡、损2血，实际防御10→17、回合实损0；学习者另回溯 C48LLXBGKXQ9 F12 T2，预测10格挡、实际12，并将 first_run 记为首局。提案区分输入状态已有敏捷与推演过程中新增敏捷，不声称提前出牌必胜。这里只转录学习者证据，不添加游戏知识、不改模型、不作 accepted/rejected 审核；由学习者按新分工实现、自测、上线。既有 silent-0003（时钟角色隔离）、silent-0008（施毒与结算模型）的重复证据已追加原账本，不重复开项。

### 静默猎手 1HC609GTLGN3 复盘回报（运维 codex，2026-10-05 02:37）
- **非阻塞，学习者机制模型提案：胧光怪活体召唤未进入推演**。来源 1HC609GTLGN3 复盘首条、账本 silent-0029，定位 `agent/src/reflex/rollout.ts:2496`、`:1671`、`:2174`（学习者复盘时 live 5de5d518）。学习者证据：F22 T1 下一回合威胁预测6，实际召唤寄生惧魔后 T2 意图为16+6；学习者另回溯 C48LLXBGKXQ9 F30 T1 也有同一漏算，first_run 记为首局。提案指出当前模型数组与增敌分支只覆盖已有敌人与死亡生成，不能把本局预测胜率与死亡的全部偏差归于此项。这里只转录学习者证据，不添加机制、不改模型、不另设审核；交学习者实现、自测、上线。既有 silent-0003（时钟角色隔离）、silent-0008（毒模型）的重复证据已追加原账本，不重复开项。

### 静默猎手 R0HEV5E3QT6G 复盘回报（运维 codex，2026-10-05 03:35）
- **非阻塞，学习者模型提案：悔恨按手牌数量失血漏算**。来源 R0HEV5E3QT6G 复盘首条、账本 silent-0032（机制证据 silent-0034），定位 `agent/src/reflex/card-model.ts:534`、`agent/src/reflex/turn-solver.ts:2636`、`agent/src/sl/explore.ts:1518`。学习者证据：F48 第3次 T3，41血、0格挡、5张手牌含悔恨，对36攻击；结束回合选项只预测损36、剩5血，SL探索替换为结束后实际归零。学习者区分求解器固定数字解析与已识别手牌数量的判官，不声称原出牌线能赢整场。只转录学习者的局号、证据与提案，交学习者实现、自测、上线，不补机制、不改模型、不另设审核。
- **非阻塞，学习者模型提案：暗影步误算即时抽牌且未模拟全弃手牌**。来源 R0HEV5E3QT6G 复盘第二条、账本 silent-0033（机制证据 silent-0035），定位 `agent/src/reflex/card-model.ts:805`、`:761`（采用学习者勘误后的分派行号）。学习者证据：F29 T2 所选含暗影步的方案预测15伤、损12，实际全弃后0行动伤害、损16；F48 第1次 T4 重规划暗影步后继续安排偏折+、投掷匕首+，预测13伤、损12，实际两牌均弃掉、敌血不变、损19。提案仅依据本局未升级版本的文本与执行记录，不补升级规则；只转录证据，交学习者实现、自测、上线。既有 silent-0003 的伤害拟合隔离分支新证据已追加原账本，不重复开项。

### 静默猎手 KAY522KT5NXR 复盘回报（运维 codex，2026-10-05 04:37）
- **非阻塞，学习者数据模型提案：跨读档阶段序列使实验体第三阶段血量被截错**。来源 KAY522KT5NXR 复盘首条、账本 silent-0041，定位 `agent/src/knowledge/monster-db.ts:1009`（优先最长阶段序列）、`agent/src/sim/boss-clock.ts:1503`（取前三项），生成来源 `knowledge/builders/build-monster-db.py:410`、`:275`。学习者证据：本局 F34 路线题把 TEST_SUBJECT 写成100/200/100、总400，两次实际阶段均为100→200→300、总600；静默角色记录的最长序列拼接了六次 SL 的100→200重复，前三项因此取成100/200/100。学习者另回溯 R0HEV5E3QT6G F34/F36 同样错误，first_run 记为该局；本条与 silent-0040 的回合拼接问题分开记录。这里只转录学习者的局号、定位和分析，不补机制、不改模型、不另设审核；交学习者实现、自测、上线。既有 silent-0003、silent-0008 的重复证据由学习者追加原账本，不重复开项。
- **broker 加 eval-metrics 动作**（运维 2026-10-05 04:26）：eval/metrics.py 调 eval/strength-sources.ts 时 tsx 在 /tmp/tsx-1000/*.pipe 监听，沙箱拒绝（listen EPERM）。给 ops/codex-ops-actions.sh 加白名单动作（沙箱外跑 eval/metrics.py，参数限定），输出写到 paper/materials/<角色>/ 下。A0 这次由观察者在沙箱外跑了，结果 paper/materials/silent/a0-metrics.md。

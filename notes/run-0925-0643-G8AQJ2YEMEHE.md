## 复盘：run G8AQJ2YEMEHE — 阵亡，最高第 25 层

- 决策 371 个；Jev 调用 38 次，Claude 0 次，DeepSeek 23 次；token 88,006 入 / 2,610 出，约 $0.0038；用时 18.2 分钟
- 决策者：code 283，jev 33，jev-plan 25，deepseek 23，code-fallback 5，deepseek-plan 2

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 80→69（-11），决策 code 14，jev-plan 2，jev 1
- 第 3 层 小啃兽: HP 75→72（-3），决策 code 7，jev-plan 2，jev 1，code-fallback 1
- 第 5 层 缩小甲虫: HP 78→76（-2），决策 code 9，code-fallback 1
- 第 6 层 蛮兽: HP 80→80（-0），决策 jev-plan 4，jev 2，code 1
- 第 6 层 蛮兽: HP 80→66（-14），决策 code 5
- 第 9 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 72→72（-0），决策 code 5，jev 1，jev-plan 1
- 第 9 层 劫掠者斧手/劫掠者追踪手: HP 72→66（-6），决策 code 5，jev 2，jev-plan 1
- 第 12 层 旧日雕像: HP 72→72（-0），决策 code 6
- 第 12 层 旧日雕像: HP 72→72（-0），决策 code 6
- 第 14 层 墨宝: HP 70→69（-1），决策 code 3，jev 2，jev-plan 2
- 第 14 层 墨宝: HP 69→69（-0），决策 code 1
- 第 15 层 藤蔓蹒跚者: HP 75→69（-6），决策 jev-plan 2，code 2，jev 1
- 第 17 层 仪式兽: HP 75→75（-0），决策 deepseek 1，deepseek-plan 1
- 第 17 层 仪式兽: HP 75→64（-11），决策 deepseek 4，code 3，deepseek-plan 1
- 第 17 层 仪式兽: HP 64→44（-20），决策 code 18
- 第 17 层 仪式兽: HP 44→33（-11），决策 code 5，deepseek 2
- 第 19 层 地道虫: HP 80→72（-8），决策 code 7，jev-plan 4，jev 1
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 78→78（-0），决策 code 4
- 第 21 层 寄生惧魔/胧光怪: HP 80→60（-20），决策 code 7
- 第 21 层 寄生惧魔/胧光怪: HP 60→60（-0），决策 code 3，jev-plan 2，jev 1
- 第 21 层 寄生惧魔/胧光怪: HP 60→55（-5），决策 code 20，jev 1，jev-plan 1
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 61→61（-0），决策 code 7，code-fallback 1，jev 1
- 第 22 层 熟睡甲虫/盛碗虫（丝）: HP 61→57（-4），决策 code 4，jev 1
- 第 22 层 熟睡甲虫: HP 57→57（-0），决策 jev 2，code 1
- 第 22 层 熟睡甲虫: HP 57→49（-8），决策 code 3，jev 1，jev-plan 1
- 第 23 层 直飞产卵虫: HP 55→55（-0），决策 code 4
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 55→44（-11），决策 code 7，code-fallback 2
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 44→43（-1），决策 code 6，jev 1
- 第 25 层 蜂群术士: HP 49→38（-11），决策 jev-plan 3，code 3，jev 2
- 第 25 层 蜂群术士: HP 38→24（-14），决策 jev 4，code 2
- 第 25 层 蜂群术士: HP 24→2（-22），决策 code 4

### 死亡战斗：第 25 层 蜂群术士
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 打击 -> 蜂群术士, 双重打击 -> 蜂群术士
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 蜂群术士
- T4 [code] combat/end_turn: no playable cards; ending the turn
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / code: 64
- combat/end_turn / code: 46
- combat/plan / code: 43
- reward/claim / code: 38
- combat/plan-continue / jev-plan: 25
- map/route / code: 20
- combat/plan-choice / jev: 19
- combat/lethal / code: 18
- reward/proceed / code: 14
- selection/add / code: 9
- reward/card / deepseek: 8
- reward/card / code: 7
- combat/plan-choice / code-fallback: 5
- combat/plan-choice+potion / deepseek: 5
- combat/plan-choice+potion / jev: 5
- event/leave / code: 5
- event/choose / deepseek: 4
- map/route / jev: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-choice / deepseek: 2
- combat/plan-continue / deepseek-plan: 2
- rest/choose / deepseek: 2
- rest/proceed / code: 2
- selection/add / jev: 2
- selection/exhaust / code: 2
- combat/least-loss / code: 1
- combat/play / jev: 1
- event/choose / jev: 1
- map/route / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/choose / jev: 1
- selection/remove / code: 1
- selection/take into my hand / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：23 次（推翻 Jev 10 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.29 → o1）：Full HP at A0 makes reaching the Act 1 boss near-certain; two extra relics snowball act 2+ far more than one random card
- [deepseek] 第 2 层 T5 reward/card: 同意 Jev（card2 @0.07 → card2）：0-cost 6 damage is premium early Act 1; copies scale with strength and help kill elites. Deck can afford one bloat card.
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.35 → o0）：Map likely yields a relic/treasure route worth more than a random potion; 8 HP is better saved for elites/boss since HP 
- [deepseek] 第 5 层 T3 reward/card: 同意 Jev（card2 @0.26 → card2）：头槌: 9 damage for 1E, best raw Act 1 damage here, and recycling Bash (or later key cards like 狂宴) stays useful all run. S
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o1 @0.16 → o2）：Deck is attack-heavy (10 attacks/4 skills); an upgraded uncommon skill is the best permanent upgrade, and the rare energ
- [deepseek] 第 14 层 T2 reward/card: 同意 Jev（card0 @0.16 → card0）：Boss fight next; with 7 strike-named cards Perfected Strike hits ~22 (44 with Molten Fist's doubled 易伤) for 2E — strong 
- [deepseek] 第 15 层 T2 reward/card: 推翻 Jev（card1 @0.31 → card0）：Burning Pact: strongest card, adds draw plus exhausts junk; Orichalcum already gives 6 block, so True Grit barely improv
- [deepseek] 第 16 层 TNone rest/choose: 同意 Jev（o2 @0.23 → o2）：HP 94% makes resting wasteful; with 12 attacks, +1 permanent strength helps the Act 1 boss and every later fight more th
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.40 → plan1）：Free setup turn vs buffing boss; deal 14 and draw 2 while keeping both potions for the PLOW/high-damage turns. No HP los
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 推翻 Jev（plan1 @0.27 → p0）：Boss is buffing, so no incoming damage — a free safe turn for permanent +2 Dexterity that lasts this long, escalating-da
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 同意 Jev（plan1 @0.27 → plan1）：Race the beast: 21 permanent damage toward its 150 stun threshold, still safe at 64/80; shortening this ramping fight be
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 推翻 Jev（plan1 @0.21 → plan2）：Bash + Molten Fist applies 4 Vulnerable, amplifying all future damage in this long boss race; 18 HP is affordable at 75/
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 推翻 Jev（plan1 @0.46 → p1）：Free colorless card may push boss under 150 to trigger its stun (skips a big attack); potions are meant for boss fights,
- [deepseek] 第 17 层 T8 combat/plan-choice: 同意 Jev（plan3 @0.29 → plan3）：无情猛攻 deals 15, leaving 仪式兽 at 11 HP; next turn any attack kills while we survive with 26 HP.
- [deepseek] 第 17 层 T9 combat/plan-choice: 同意 Jev（plan1 @0.31 → plan1）：Preserves HP (27 vs 20) and still leaves boss at 16 HP; extra damage from plan2 not worth the risk of dying next turn.
- [deepseek] 第 17 层 T9 reward/card: 推翻 Jev（card0 @0.18 → card1）：Crimson Mantle gives recurring block every turn, fixing the deck's biggest weakness for the low-HP Beast fight.
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.17 → o2）：Perr's Blood gives unconditional +1 draw every turn — best consistency for a 21-card deck with avg cost 1, where energy 
- [deepseek] 第 18 层 TNone map/route: 同意 Jev（n0 @0.25 → n0）：Highest route value (28.82) at full HP; fights build deck and gold toward the boss, and Burning Blood sustains chip dama
- [deepseek] 第 19 层 T3 reward/card: 同意 Jev（card2 @0.41 → card2）：Deck has zero AoE; Breakthrough+ gives 13 damage to all for 1E, covering Act 2 multi-enemy fights cheaply. HP 78 makes t
- [deepseek] 第 21 层 T7 reward/card: 推翻 Jev（skip @0.23 → card2）：头槌+ 是12伤1费的优质攻击，还能回收熔融之拳/突破++等关键牌；牌组仅23张，仍在合理区间，优于跳过。

### Jev 低置信度（<0.35）决策：8 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 小啃兽, 防御, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 蛮兽, 防御, 防御) with confidence 0.20; code rank 1 (0.20)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (战斗专注+, 防御, 防御, 打击 -> 劫掠者斧手) with confidence 0.02; code rank 1 (0.02)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (防御, 剑柄打击 -> 墨宝, 双重打击 -> 墨宝) with confidence 0.32; code rank 1 (0.32)
- 第 21 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 双重打击 -> 寄生惧魔, potion 异鱼之油) with confidence 0.32; code rank 4 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (战斗专注+, 耸肩无视, 剑柄打击 -> 熟睡甲虫, 头槌+ -> 熟睡甲虫) with confidence 0.27; code rank 1 (0.27)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (头槌+ -> 熟睡甲虫, 耸肩无视, 双重打击 -> 熟睡甲虫) with confidence 0.19; code rank 1 (0.19)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 双重打击 -> 熟睡甲虫) with confidence 0.21; code rank 1 (0.21)

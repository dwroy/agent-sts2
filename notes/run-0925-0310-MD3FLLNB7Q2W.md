## 复盘：run MD3FLLNB7Q2W — 未结束，最高第 30 层

- 决策 382 个；Jev 调用 48 次，Claude 0 次，DeepSeek 16 次；token 89,482 入 / 2,769 出，约 $0.0039；用时 18.8 分钟
- 决策者：code 282，jev 43，jev-plan 31，deepseek 16，code-fallback 5，deepseek-plan 5

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 80→77（-3），决策 code 11，jev-plan 4，jev 2
- 第 3 层 小啃兽: HP 80→72（-8），决策 code 4，jev-plan 3，jev 2
- 第 4 层 毛绒伏地虫: HP 78→73（-5），决策 code 7，jev 1，jev-plan 1
- 第 5 层 墨宝: HP 79→67（-12），决策 code 9，jev 1
- 第 6 层 蛮兽: HP 73→52（-21），决策 code 9，jev 1，code-fallback 1
- 第 9 层 利齿之眼/雾菇: HP 73→65（-8），决策 code 6，jev-plan 2，jev 1
- 第 11 层 闪光贾克斯果/飞蝇菌子: HP 71→51（-20），决策 code 9，jev 2，jev-plan 2，code-fallback 1
- 第 12 层 藤蔓蹒跚者: HP 57→43（-14），决策 code 7，jev 5，jev-plan 1，code-fallback 1
- 第 13 层 小啃兽: HP 49→42（-7），决策 code 8，jev 2，jev-plan 1
- 第 14 层 树叶史莱姆（小）/树枝史莱姆（小）/蛇行扼杀者: HP 46→30（-16），决策 code 9，jev 2，jev-plan 2
- 第 17 层 仪式兽: HP 80→28（-52），决策 code 17，deepseek 8，deepseek-plan 5，jev 1，jev-plan 1
- 第 19 层 地道虫: HP 80→66（-14），决策 jev-plan 4，jev 2，code 2
- 第 20 层 偷窃草蜢: HP 72→60（-12），决策 code 7，jev-plan 2，jev 1，code-fallback 1
- 第 22 层 猎人杀手: HP 73→49（-24），决策 code 13，jev 4，jev-plan 1，code-fallback 1
- 第 23 层 啃咬机: HP 55→27（-28），决策 code 7，jev 3，jev-plan 3
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 74→54（-20），决策 code 12，jev 2，jev-plan 2
- 第 28 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 60→39（-21），决策 code 9，jev-plan 2，jev 1
- 第 28 层 盛碗虫（石）/盛碗虫（蜜）: HP 39→39（-0），决策 code 3
- 第 30 层 虱虫之祖: HP 86→84（-2），决策 code 7，jev 2

### 各类决策由谁做
- combat/plan-continue / code: 47
- combat/end_turn / code: 46
- combat/plan / code: 41
- reward/claim / code: 41
- combat/plan-choice / jev: 33
- combat/plan-continue / jev-plan: 31
- map/route / code: 24
- combat/lethal / code: 22
- reward/proceed / code: 17
- reward/card / code: 15
- combat/plan-choice / code-fallback: 5
- combat/plan-continue / deepseek-plan: 5
- combat/plan-choice / deepseek: 4
- combat/plan-choice+potion / deepseek: 4
- map/route / jev: 4
- rest/proceed / code: 4
- shop/buy / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/leave / code: 3
- rest/choose / code: 3
- combat/plan-choice+potion / jev: 2
- event/choose / deepseek: 2
- reward/card / deepseek: 2
- selection/remove / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/choose / jev: 1
- map/route / deepseek: 1
- rest/choose / jev: 1
- selection/add / deepseek: 1
- selection/upgrade / deepseek: 1
- selection/upgrade / jev: 1
- shop/buy / deepseek: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：16 次（推翻 Jev 9 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.14 → o2）：Two random relics this early snowball the whole run; the added Strike/Defend is a minor dilution at A0 and can be remove
- [deepseek] 第 5 层 T3 reward/card: 推翻 Jev（card0 @0.19 → card1）：Cheap 1E attack with per-turn Strength fits the low-cost deck and Act 1 damage needs; 3E Bludgeon clogs energy vs the Be
- [deepseek] 第 7 层 TNone selection/upgrade: 推翻 Jev（card14 @0.33 → card9）：痛击升级后 10 伤 3 层易伤，第 1 幕精英/boss 全靠它放大输出；战斗专注仅多抽 1 张，收益远小于此。
- [deepseek] 第 8 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.14 → buy_card1）：Hemokinesis is the best damage-per-energy here (15 for 1E), fixing this deck's weak Act 1 output for elites/boss while l
- [deepseek] 第 9 层 T3 reward/card: 推翻 Jev（card2 @0.23 → card1）：预备打击 is A-tier: 1E for 7 damage plus +3 Strength this turn amplifies 御血术/剑柄打击; a 3-cost Bludgeon is clunky with only 3 e
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.34 → plan1）：Enemy buffs, no attack threat; Bash+ vulnerable then Breakthrough uses all energy, deals 23 vs 10, and 1 HP cost is triv
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.30 → plan1）：Boss is buffing (no attack) this turn; take the free 13 damage and Vulnerable, save the potion — its draw is wasted by N
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 同意 Jev（plan1 @0.37 → plan1）：Full HP (99%); trade 18 HP for max damage 36 to race toward the 150 stun threshold faster. Save potion.
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 推翻 Jev（plan1 @0.26 → p0）：Drink potion for energy/draw; enables 御血术+打击 to push boss below 150, triggering stun and avoiding next big attack.
- [deepseek] 第 17 层 T5 combat/plan-choice: 同意 Jev（plan2 @0.33 → plan2）：Ringing limits us to one card, so draw is wasted; 16 dmg (max progress vs 129 HP boss) beats 7 block since 64 HP is heal
- [deepseek] 第 17 层 T7 combat/plan-choice: 推翻 Jev（plan2 @0.40 → plan1）：Enemy debuffs (no attack) so go all-out; 45 dmg plus Vulnerable 3 amplifies next turns far more than plan2's +4 raw, sam
- [deepseek] 第 17 层 T8 combat/plan-choice: 同意 Jev（plan1 @0.36 → plan1）：Deal 33, leave boss at 23 HP; two strikes next turn kill it. Other plans leave too much HP or delay.
- [deepseek] 第 17 层 T9 combat/plan-choice: 同意 Jev（plan1 @0.27 → plan1）：Can't kill this turn; preserve most HP (13) plus best draw, keeps enough buffer to survive the boss's 20 attack next tur
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o1 @0.04 → o2）：Golden Seal gives permanent +1 energy per turn for only 3 gold (income covers it); energy outweighs a few enchanted Stri
- [deepseek] 第 18 层 TNone map/route: 同意 Jev（n0 @0.34 → n0）：Equal route value to n1, but Unknown continuation offers shop/rest/event flexibility at full HP instead of a third strai
- [deepseek] 第 28 层 T3 selection/add: 推翻 Jev（card2 @0.14 → card8）：0-cost draw 4 (S-tier) adds the consistency a 26-card deck needs; deck already has ample attacks, and a second copy is s

### Jev 低置信度（<0.35）决策：17 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (防御, 打击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.18; code rank 1 (0.18)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 小啃兽, 打击 -> 小啃兽) with confidence 0.25; code rank 1 (0.25)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 小啃兽, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (预备打击 -> 雾菇, 打击 -> 雾菇, 打击 -> 雾菇) with confidence 0.22; code rank 1 (0.22)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (防御) with confidence 0.31; code rank 1 (0.31)
- 第 13 层 combat/plan-choice: Jev chose plan 1/4 (预备打击 -> 小啃兽, 剑柄打击 -> 小啃兽, 突破) with confidence 0.27; code rank 1 (0.27)
- 第 13 层 combat/plan-choice: Jev chose plan 3/3 (战斗专注, 无情猛攻 -> 小啃兽, 御血术 -> 小啃兽) with confidence 0.31; code rank 3 (0.31)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (突破) with confidence 0.22; code rank 1 (0.22)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 地道虫, 突破, 无情猛攻 -> 地道虫) with confidence 0.21; code rank 1 (0.21)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (坚毅, 防御, 防御) with confidence 0.30; code rank 1 (0.30)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (防御, 防御) with confidence 0.32; code rank 1 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (御血术 -> 猎人杀手) with confidence 0.10; code rank 1 (0.10)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (突破, 彼岸咆哮+) with confidence 0.29; code rank 1 (0.29)
- 第 25 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 直飞产卵虫, 打击 -> 直飞产卵虫) with confidence 0.30; code rank 1 (0.30)
- 第 28 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 预备打击 -> 盛碗虫（蜜）, 突破) with confidence 0.09; code rank 1 (0.09)

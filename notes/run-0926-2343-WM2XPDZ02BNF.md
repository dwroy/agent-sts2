## 复盘：run WM2XPDZ02BNF — 阵亡，最高第 27 层

- 决策 390 个；Jev 调用 86 次，Claude 0 次，DeepSeek 10 次；token 150,929 入 / 4,559 出，约 $0.0065；用时 20.6 分钟
- 决策者：code 245，jev 77，jev-plan 49，deepseek 10，code-fallback 9

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→57（-7），决策 jev-plan 3，jev 2，code 2
- 第 4 层 毛绒伏地虫: HP 56→52（-4），决策 code 7，jev 1，jev-plan 1
- 第 5 层 缩小甲虫: HP 58→56（-2），决策 code 7，jev 1，jev-plan 1
- 第 9 层 树枝史莱姆（中）/飞蝇菌子: HP 69→58（-11），决策 code 11，jev 1，jev-plan 1
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 64→33（-31），决策 code 12，jev 6，jev-plan 6，code-fallback 1
- 第 14 层 劫掠者弩手/劫掠者斧手/劫掠者暴徒: HP 65→49（-16），决策 code 9，jev 2，code-fallback 1，jev-plan 1
- 第 15 层 墨宝: HP 55→43（-12），决策 code 5，jev-plan 3，code-fallback 1，jev 1
- 第 17 层 墨影幻灵: HP 75→75（-0），决策 code 1
- 第 17 层 墨影幻灵: HP 75→47（-28），决策 jev 19，jev-plan 13，code 3
- 第 19 层 地道虫: HP 80→57（-23），决策 code 16，jev 4，jev-plan 3
- 第 20 层 外骨骼虫: HP 63→55（-8），决策 code 13，jev 3，jev-plan 3
- 第 22 层 猎人杀手: HP 56→21（-35），决策 code 16，jev 5，code-fallback 3，jev-plan 1
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 53→45（-8），决策 code 7，jev 6，jev-plan 4，code-fallback 2
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 45→27（-18），决策 code 6，jev 5，jev-plan 1，code-fallback 1
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 33→17（-16），决策 jev 18，code 9，jev-plan 8
- 第 27 层 熟睡甲虫: HP 17→17（-0），决策 jev 1
- 第 27 层 熟睡甲虫: HP 17→17（-0），决策 code 10

### 死亡战斗：第 27 层 熟睡甲虫
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 20): 战斗专注, 打击 -> 熟睡甲虫, 无情猛攻
- T9 [code] combat/plan: code plan (+11.6 over next): 撕裂, 火焰屏障, 耸肩无视; hp -6, dmg 0
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 24): 战斗专注, 无情猛攻 -> 熟睡甲虫, 双重
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 防御, 预备打击 -> 熟睡甲虫, 双重打击 -> 熟睡甲虫
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 熟睡甲虫
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 熟睡甲虫
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan / code: 69
- combat/plan-continue / jev-plan: 49
- combat/plan-choice+potion / jev: 42
- combat/plan-continue / code: 42
- combat/plan-choice / jev: 31
- reward/claim / code: 27
- map/route / code: 23
- combat/lethal / code: 15
- reward/proceed / code: 12
- reward/card / code: 11
- combat/plan-choice / code-fallback: 7
- event/choose / deepseek: 6
- event/leave / code: 5
- rest/choose / code: 5
- rest/proceed / code: 5
- combat/least-loss / code: 4
- shop/buy / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/end_turn / code: 3
- combat/plan-choice+potion / code-fallback: 2
- combat/play / jev: 2
- map/route / jev: 2
- selection/take into my hand / code: 2
- selection/upgrade / code: 2
- combat/plan-potion / code: 1
- map/route / deepseek: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/remove / code: 1
- selection/take into my hand / deepseek: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：10 次（推翻 Jev 5 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o0 @0.30 → o0）：立即获得2瓶药水与栏位，稳过前期精英/头目；拿诅咒换遗物风险高，跳路收益有限。
- [deepseek] 第 3 层 TNone event/choose: 推翻 Jev（o0 @0.17 → o1）：112 gold is guaranteed value (funds a Strike removal plus a card at the next shop); 7 HP at 63/80 with rests ahead is af
- [deepseek] 第 6 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.31 → buy_card1）：Twin Strike is multi-hit: breaks Vantom's 9 Slippery and scales with Inflame. 210 gold still covers Shrug It Off plus a 
- [deepseek] 第 7 层 TNone event/choose: 同意 Jev（o0 @0.18 → o0）：异鸟蛋是不可打出的废牌（等于诅咒，手册明确记录其占手牌致死案例）；+7 最大生命永久收益，A7 下更珍贵。
- [deepseek] 第 10 层 TNone map/route: 推翻 Jev（n1 @0.15 → n0）：HP 74% is below the 80% elite rule; only 2 block cards and Vantom demands high entry HP. Rest path also has another Rest
- [deepseek] 第 14 层 T4 reward/card: 同意 Jev（skip @0.10 → skip）：Perfected Strike needs Strikes (we're deleting them) and is one big hit, terrible vs Vantom's 9 Slippery stacks; deck wa
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.38 → o0）：4 extra energy on turn 1 of every combat supercharges Demon Form/Inflame setup (boss turn 1 is free), no ongoing cost; 大
- [deepseek] 第 21 层 TNone event/choose: 同意 Jev（o1 @0.27 → o1）：5 HP is cheap for choosing from 2 relics (avoids duds); the 15 HP version is too steep at 70% HP with the Knowledge Demo
- [deepseek] 第 21 层 TNone event/choose: 推翻 Jev（o0 @0.06 → o1）：风-themed doll likely gives per-turn tempo/agility value; deck already has block sources but needs speed to race Knowledg
- [deepseek] 第 27 层 T9 selection/take into my hand: 推翻 Jev（card0 @0.37 → card1）：狱火已在场：撕裂每回合开始掉血换+1力量，喂多段攻击；残酷需先垫易伤，黑暗之拥2费且无消耗源，二者无即时价值。

### Jev 低置信度（<0.35）决策：41 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (防御, 痛击 -> 小啃兽) with confidence 0.13; code rank 1 (0.13)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.29; code rank 1 (0.29)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 缩小甲虫, 防御) with confidence 0.30; code rank 1 (0.30)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.26; code rank 1 (0.26)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (耸肩无视, 防御, 防御) with confidence 0.23; code rank 1 (0.23)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (防御, 预备打击 -> 毛绒伏地虫) with confidence 0.13; code rank 1 (0.13)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 双重打击 -> 劫掠者暴徒) with confidence 0.13; code rank 1 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 痛击+ -> 墨影幻灵) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (预备打击 -> 墨影幻灵, 防御, 巨像) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/3 (无情猛攻 -> 墨影幻灵, 耸肩无视+) with confidence 0.22; code rank 2 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 墨影幻灵) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.23; code rank 1 (0.23)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 墨影幻灵) with confidence 0.34; code rank 1 (0.34)

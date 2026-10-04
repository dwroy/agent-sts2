## 复盘：run PFBKJTWPY8DK — 阵亡，最高第 27 层

- 决策 297 个；Jev 调用 47 次，Claude 0 次，DeepSeek 14 次；token 101,912 入 / 2,678 出，约 $0.0044；用时 18.2 分钟
- 决策者：code 200，jev 39，jev-plan 36，deepseek 14，code-fallback 8

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→54（-10），决策 code 8，jev 1，jev-plan 1，code-fallback 1
- 第 4 层 毛绒伏地虫: HP 80→76（-4），决策 code 7，jev-plan 2，jev 1
- 第 6 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→65（-15），决策 code 3，jev-plan 2，code-fallback 2，jev 1
- 第 7 层 墨宝: HP 71→58（-13），决策 jev 3，jev-plan 2，code 2
- 第 8 层 树枝史莱姆（中）/蛇行扼杀者: HP 61→49（-12），决策 code 9，jev 1，jev-plan 1
- 第 9 层 蛮兽: HP 52→39（-13），决策 code 7，jev-plan 5，jev 3，code-fallback 1
- 第 14 层 小啃兽: HP 68→50（-18），决策 jev-plan 5，jev 4，code 4
- 第 15 层 方柱构装体: HP 56→56（-0），决策 code 10
- 第 17 层 仪式兽: HP 80→58（-22），决策 code 16，jev-plan 7，jev 5，code-fallback 2
- 第 19 层 偷窃草蜢: HP 76→48（-28），决策 code 7，jev 3，jev-plan 2
- 第 20 层 地道虫: HP 54→41（-13），决策 code 5，jev 1，jev-plan 1，code-fallback 1
- 第 25 层 感染棱柱: HP 66→52（-14），决策 code 11，jev 3，jev-plan 3，code-fallback 1
- 第 27 层 残杀千足虫: HP 51→5（-46），决策 code 8，jev 5，jev-plan 5

### 死亡战斗：第 27 层 残杀千足虫
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 血墙
- T2 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 1/4 (拆卸+ -> 残杀千足虫, 熔融之拳+ -> 残杀千足虫, 撕裂+) with confidence 0.76; code rank 1 conf 0.76
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳+ -> 残杀千足虫
- T3 [jev] combat/plan-choice: Jev chose plan 2/2 (撕裂+) with confidence 0.79; code rank 2 conf 0.79
- T3 [code] combat/plan: code plan (only line): end turn; hp -20, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 23): 耸肩无视, 预备打击 -> 残杀千足虫, 双
- T4 [jev] combat/plan-choice: Jev chose plan 2/2 (无惧疼痛, 防御) with confidence 0.49; code rank 2 conf 0.49
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -11, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 跃跃欲试
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan / code: 56
- combat/plan-continue / jev-plan: 36
- reward/claim / code: 30
- combat/plan-choice / jev: 28
- combat/plan-continue / code: 24
- map/route / code: 23
- reward/proceed / code: 12
- combat/lethal / code: 9
- combat/plan-choice / code-fallback: 6
- event/choose / deepseek: 6
- event/leave / code: 6
- reward/card / code: 6
- rest/choose / code: 4
- rest/proceed / code: 4
- reward/card / deepseek: 4
- shop/buy / code: 4
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- combat/plan-choice+potion / jev: 3
- map/route / jev: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-choice+potion / code-fallback: 2
- reward/card / jev: 2
- selection/remove / code: 2
- selection/upgrade / deepseek: 2
- selection/upgrade / jev: 2
- shop/buy / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/plan-guarded / code: 1
- combat/plan-potion / code: 1
- event/choose / jev: 1
- run/finalize / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：14 次（推翻 Jev 6 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.16 → o2）：两件遗物提供贯穿全局的永久战力；附加的打击/防御在前期尚可使用，代价可接受。精英额外抽牌仅在精英战生效，价值偏窄。
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o1 @0.02 → o1）：Max HP loss is permanent; a random upgrade likely hits Strike/Defend (+3) while 20 HP heals to full, funding elite path 
- [deepseek] 第 4 层 T3 reward/card: 推翻 Jev（card2 @0.42 → card0）：Twin Strike: 10 dmg for 1E now, scales double with future Strength, best frontload vs Ceremonial Beast; AOE can come lat
- [deepseek] 第 5 层 TNone shop/buy: 同意 Jev（buy_card4 @0.15 → buy_card4）：狱火是店内最强牌：每回合6点AOE且随自伤成长，补足牌组缺AOE、缺能力、缺成长三大短板；金币不花就浪费。
- [deepseek] 第 6 层 T3 reward/card: 同意 Jev（card0 @0.26 → card0）：撕裂+狱火每回合自伤即+1力量，是本局唯一的成长来源，正是 run plan 缺的力量scaling；坚毅/邪眼无消耗体系只是普通格挡。
- [deepseek] 第 7 层 T2 reward/card: 同意 Jev（card2 @0.01 → card2）：Anger: 0-cost 6 dmg beats Strike here, uses spare energy each turn and scales with Rupture strength; deck still lacks fr
- [deepseek] 第 12 层 TNone event/choose: 同意 Jev（o1 @0.48 → o1）：150 gold for +2 Strength across 5 fights (likely including the 252-HP boss) far beats one upgrade or Dazed risk; gold ho
- [deepseek] 第 17 层 T8 reward/card: 推翻 Jev（card2 @0.31 → card0）：Rupture/tea strength makes Fiend Fire a scaling multi-hit burst that races the Beast to its 150 stun; deck lacks the blo
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.13 → o0）：4 permanent upgrades power up the Rupture/Inferno engine and key attacks with no drawback; Ash-per-shuffle junk would cl
- [deepseek] 第 18 层 TNone selection/upgrade: 同意 Jev（card12 @0.38 → card12）：狱火升级提升每次失血的AOE伤害，整场反复触发，配合撕裂自伤成长最契合7回合沙虫时钟。
- [deepseek] 第 18 层 TNone selection/upgrade: 推翻 Jev（card19 @0.24 → card18）：Dismantle+: 10×2 with Bash vulnerable, and Rupture strength boosts both hits — best scaling finisher for the 7-turn Insa
- [deepseek] 第 21 层 TNone event/choose: 同意 Jev（o1 @0.03 → o1）：免费遗物二选一：本局瓶颈是伤害与成长，取更可能补输出的玩偶，备战无厌沙虫的倒计时。
- [deepseek] 第 22 层 TNone shop/buy: 推翻 Jev（buy_relic0 @0.13 → buy_card3）：Shrug It Off at 48 is premium block+draw for a block-starved deck, and leaves 168 gold to still remove a Strike next.
- [deepseek] 第 23 层 TNone event/choose: 推翻 Jev（o1 @0.45 → o0）：Bottleneck is permanent Strength/scaling for the 7-turn sand clock; power pool holds Demon Form/Inflame, and 宾邦 duplicat

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 缩小甲虫) with confidence 0.12; code rank 1 (0.12)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (无情猛攻 -> 小啃兽, 双重打击 -> 小啃兽) with confidence 0.14; code rank 1 (0.14)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (痛击+ -> 仪式兽, 拆卸 -> 仪式兽) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 痊愈药水 (confidence 0.09) (0.09)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (跃跃欲试) with confidence 0.31; code rank 1 (0.31)
- 第 25 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 预备打击 -> 感染棱柱, 打击 -> 感染棱柱) with confidence 0.20; code rank 4 (0.20)
- 第 25 层 combat/plan-choice: Jev chose plan 1/4 (狱火+, 防御, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 27 层 combat/plan-choice: Jev chose plan 1/4 (防御, 双重打击+ -> 残杀千足虫, 耸肩无视, 愤怒 -> 残杀千足虫) with confidence 0.27; code rank 1 (0.27)

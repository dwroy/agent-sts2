## 复盘：run CAYKKMTJWBPM — 未结束，最高第 21 层

- 决策 289 个；Jev 调用 24 次，Claude 0 次，DeepSeek 13 次；token 48,162 入 / 1,502 出，约 $0.0021；用时 11.7 分钟
- 决策者：code 233，jev 21，deepseek 13，jev-plan 12，deepseek-plan 7，code-fallback 3

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→64（-0），决策 jev-plan 3，jev 2，code 1
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）: HP 63→63（-0），决策 code 7，jev 1
- 第 2 层 树叶史莱姆（中）: HP 62→59（-3），决策 code 4
- 第 3 层 毛绒伏地虫: HP 65→65（-0），决策 jev 1
- 第 3 层 毛绒伏地虫: HP 64→64（-0），决策 code 11
- 第 5 层 小啃兽: HP 70→63（-7），决策 code 4，jev-plan 2，jev 1
- 第 7 层 多尼斯异鸟: HP 69→59（-10），决策 deepseek 2，deepseek-plan 2，code 2
- 第 7 层 多尼斯异鸟: HP 58→52（-6），决策 code 6
- 第 11 层 异蛙寄生虫: HP 58→57（-1），决策 deepseek-plan 2，code 2，deepseek 1
- 第 11 层 异蛙寄生虫/扭动虫: HP 56→37（-19），决策 code 12，deepseek-plan 3，deepseek 1
- 第 13 层 闪光贾克斯果/飞蝇菌子: HP 67→59（-8），决策 code 10，jev 1
- 第 13 层 飞蝇菌子: HP 58→57（-1），决策 code 2，jev 1，jev-plan 1
- 第 15 层 墨宝: HP 55→52（-3），决策 code 12
- 第 17 层 仪式兽: HP 80→80（-0），决策 code 1
- 第 17 层 仪式兽: HP 79→79（-0），决策 code 3
- 第 17 层 仪式兽: HP 78→47（-31），决策 code 25
- 第 17 层 仪式兽: HP 47→47（-0），决策 code 2
- 第 19 层 偷窃草蜢: HP 74→79（+5），决策 code 1，jev 1
- 第 19 层 偷窃草蜢: HP 78→70（-8），决策 code 6，jev 4，jev-plan 3
- 第 19 层 偷窃草蜢: HP 70→68（-2），决策 code 4
- 第 20 层 地道虫: HP 74→68（-6），决策 code-fallback 1，jev 1，jev-plan 1
- 第 20 层 地道虫: HP 67→49（-18），决策 code 12，jev-plan 2，code-fallback 2，jev 1

### 各类决策由谁做
- combat/plan / code: 61
- combat/plan-continue / code: 45
- reward/claim / code: 34
- map/route / code: 17
- combat/lethal / code: 14
- combat/plan-choice / jev: 14
- combat/plan-continue / jev-plan: 12
- reward/proceed / code: 10
- selection/exhaust / code: 10
- combat/plan-continue / deepseek-plan: 7
- reward/card / code: 7
- combat/end_turn / code: 6
- event/leave / code: 5
- combat/plan-choice / code-fallback: 3
- event/choose / deepseek: 3
- map/route / jev: 3
- rest/proceed / code: 3
- reward/card / deepseek: 3
- selection/add / code: 3
- selection/upgrade / code: 3
- shop/buy / code: 3
- combat/plan-choice / deepseek: 2
- combat/plan-choice+potion / deepseek: 2
- rest/choose / code: 2
- selection/remove / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/potion-now / code: 1
- event/choose / jev: 1
- event/only / code: 1
- rest/choose / jev: 1
- selection/add / deepseek: 1
- selection/choose / jev: 1
- selection/upgrade / deepseek: 1
- selection/upgrade / jev: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1

### 兜底介入（Claude/DeepSeek）：13 次（推翻 Jev 8 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.39 → o2）：Choice of 3 rares can hand us Demon Form/Immolate/Offering, our missing power and AOE; one Injury is removable later and
- [deepseek] 第 2 层 T5 reward/card: 推翻 Jev（card0 @0.08 → card2）：选愤怒：0费6伤、能自我复制，既补前期最缺的输出，又放大烙印的力量收益，助boss快速压到150血触发击晕。
- [deepseek] 第 4 层 TNone selection/add: 推翻 Jev（card7 @0.25 → card0）：缺 AOE 是输局主因；突破 1 费对全体 9 伤，仅失 1 血，兼顾自伤流与清小怪，优先于单体。
- [deepseek] 第 6 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.23 → buy_card1）：预备打击仅24金，A级力量牌：本回合+3力量放大双重打击/愤怒，助力接下来的精英战与仪式兽跌破150血击晕爆发。
- [deepseek] 第 7 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.24 → plan1）：Maximize damage and set Vulnerable 2 for a fast kill; 17 HP is affordable at 69/80 with a forced RestSite next, so save 
- [deepseek] 第 7 层 T1 combat/plan-choice+potion: 同意 Jev（p0 @0.43 → p0）：牌组零格挡牌，覆甲药水提供持续格挡（精英战多回合），且本回合0能量无事可做。A3精英战该用就用。
- [deepseek] 第 8 层 TNone selection/upgrade: 推翻 Jev（card13 @0.34 → card9）：痛击是唯一的易伤来源；升级后 10 伤 3 层易伤，放大愤怒/双重打击/剑柄打击的多段输出，对 252 血boss收益最大。
- [deepseek] 第 11 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.46 → plan1）：Enemy only applies status cards, no attack incoming—pure damage turn. Plan1 deals 21 vs 12 for a trivial 1 HP, maximizin
- [deepseek] 第 11 层 T3 combat/plan-choice: 推翻 Jev（plan2 @0.35 → plan1）：Both lose 0 HP, but plan1 kills two worms vs one, cutting next turn's incoming damage — fewer live enemies is strictly b
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o0 @0.17 → o0）：Heal is capped (only +17) and forces a fight risking >8 HP; 84 gold funds an Act 2 strike removal, and a rest site still
- [deepseek] 第 15 层 T3 reward/card: 同意 Jev（card1 @0.42 → card1）：Taunt adds badly-needed block plus a repeatable vulnerable source to amplify Rage/Twin Strike/Bash; deck has only Defend
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o1 @0.06 → o0）：Deck has just 1 upgrade in 23 cards; 4 free upgrades strengthen key attacks/block without diluting the deck or draining 
- [deepseek] 第 20 层 T5 reward/card: 推翻 Jev（skip @0.11 → card0）：Deck has only 2 non-basic block cards; boss The Insatiable demands sustained blocking. Blood Wall+ gives 20 block for 2E

### Jev 低置信度（<0.35）决策：5 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 烙印, 防御, 打击 -> 树叶史莱姆（小）) with confidence 0.13; code rank 1 (0.13)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (烙印, 打击 -> 毛绒伏地虫, 防御, 愤怒 -> 毛绒伏地虫) with confidence 0.25; code rank 1 (0.25)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (防御, 剑柄打击+ -> 偷窃草蜢, 挑衅 -> 偷窃草蜢, 头槌 -> 偷窃草蜢) with confidence 0.07; code rank 1 (0.07)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 偷窃草蜢, 头槌 -> 偷窃草蜢) with confidence 0.11; code rank 1 (0.11)
- 第 20 层 combat/plan-choice: Jev chose plan 1/4 (祭品+, 烙印, 突破, 愤怒 -> 地道虫, 跃跃欲试, 打击 -> 地道虫) with confidence 0.30; code rank 1 (0.30)

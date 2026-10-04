## 复盘：run RAWTLJF81MXW — 阵亡，最高第 17 层

- 决策 207 个；Jev 调用 30 次，Claude 0 次，DeepSeek 6 次；token 53,163 入 / 1,666 出，约 $0.0023；用时 12.5 分钟
- 决策者：code 148，jev 29，jev-plan 23，deepseek 6，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→64（-0），决策 code 7，jev-plan 2，jev 1
- 第 4 层 缩小甲虫: HP 70→68（-2），决策 code 7，jev 1，code-fallback 1
- 第 6 层 小啃兽: HP 66→54（-12），决策 code 2，jev 1，jev-plan 1
- 第 8 层 树枝史莱姆（中）/飞蝇菌子: HP 67→67（-0），决策 code 7
- 第 11 层 异蛙寄生虫: HP 73→73（-0），决策 code 3，jev 3，jev-plan 1
- 第 11 层 异蛙寄生虫/扭动虫: HP 73→73（-0），决策 code 7
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 79→50（-29），决策 code 7，jev 4，jev-plan 4
- 第 14 层 藤蔓蹒跚者: HP 56→33（-23），决策 code 4，jev 3，jev-plan 3
- 第 15 层 多尼斯异鸟: HP 39→20（-19），决策 jev 6，jev-plan 4，code 2
- 第 17 层 仪式兽: HP 52→4（-48），决策 code 31，jev 10，jev-plan 8

### 死亡战斗：第 17 层 仪式兽
- T11 [code] combat/plan: code plan (only line): 防御; hp -13, dmg 0
- T11 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 14): 耸肩无视, 打击 -> 仪式兽, 打击 ->
- T12 [code] combat/plan: code plan (only line): 防御, 耸肩无视; hp -0, dmg 0
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T12 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T13 [code] combat/plan: code plan (only distinct line): 撕裂+, 无惧疼痛, 打击 -> 仪式兽; hp -0, dmg 7
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 无惧疼痛
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T13 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T14 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 10): 剑柄打击 -> 仪式兽
- T14 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 43
- combat/plan-continue / jev-plan: 23
- reward/claim / code: 21
- combat/plan-continue / code: 20
- combat/plan-choice / jev: 18
- map/route / code: 16
- combat/plan-choice+potion / jev: 10
- combat/lethal / code: 9
- reward/proceed / code: 8
- reward/card / code: 7
- event/choose / deepseek: 4
- event/leave / code: 4
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- rest/choose / code: 2
- rest/proceed / code: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- combat/plan-guarded / code: 1
- combat/play / jev: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/take into my hand / code: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：6 次（推翻 Jev 2 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o0 @0.32 → o0）：药瓶皮套给额外栏位+2瓶药水，前期战力与精英/boss保命最实在；诅咒换随机遗物不值，羽翼之靴控制力有限。
- [deepseek] 第 3 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.19 → buy_card0）：剑柄打击仅26金：1费9伤抽1，立即补强前期输出；余80金下轮还能买拆卸，删牌留待以后更划算。
- [deepseek] 第 5 层 TNone event/choose: 同意 Jev（o0 @0.33 → o0）：74/80 HP makes the 24 heal mostly wasted; 8 HP is cheap and 86 gold funds an act-2 shop (Strike removal/core card) while
- [deepseek] 第 6 层 T2 reward/card: 同意 Jev（card0 @0.37 → card0）：16-18 dmg for 2E, better than Strike/energy; deck is damage-starved for the 252-HP Beast and needs front-load now. Skip 
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o1 @0.16 → o0）：异鸟蛋是不可打出的废牌，只占手牌；+7 最大生命直接增强生存，手册也明说优先选最大生命。
- [deepseek] 第 13 层 TNone event/choose: 同意 Jev（o2 @0.10 → o2）：牌组缺格挡牌（仅3张）且要删打击；圆环可把打击变为防御向的坚韧之环，最贴合跑图计划；攻击已有10张，再加攻击收益低。

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 11 层 combat/plan-choice+potion: Jev chose to drink 无色药水 (confidence 0.14) (0.14)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 毛绒伏地虫, 踩踏) with confidence 0.17; code rank 1 (0.17)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/4 (拆卸 -> 多尼斯异鸟, 耸肩无视, 打击 -> 多尼斯异鸟, potion 迅捷药水) with confidence 0.30; code rank 1; HP guard: plan 1 (拆卸 -> 多尼斯异鸟, 耸肩无视, 打击 -> 多尼斯异鸟,  (0.30)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 4/4 (打击 -> 多尼斯异鸟) with confidence 0.32; code rank 4; HP guard: plan 4 (打击 -> 多尼斯异鸟) loses 11 HP, more than 4 over the cheapest line, pl (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 仪式兽) with confidence 0.18; code rank 3; HP guard: plan 3 (打击 -> 仪式兽) loses 9 HP, more than 4 over the cheapest line, playing (0.18)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (完美打击 -> 仪式兽, 拆卸+ -> 仪式兽) with confidence 0.33; code rank 1; HP guard: plan 1 (完美打击 -> 仪式兽, 拆卸+ -> 仪式兽) loses 24 HP, more than 4 ov (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.04; code rank 1 (0.04)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (预备打击 -> 仪式兽, 剑柄打击 -> 仪式兽, 打击 -> 仪式兽) with confidence 0.15; code rank 2 (0.15)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (预备打击 -> 仪式兽) with confidence 0.26; code rank 2; HP guard: plan 2 (预备打击 -> 仪式兽) loses 15 HP, more than 4 over the cheapest line, pl (0.26)

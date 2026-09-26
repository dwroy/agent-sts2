## 复盘：run YVWAWAPXJXGV — 阵亡，最高第 48 层

- 决策 565 个；Jev 调用 92 次，Claude 0 次，DeepSeek 21 次；token 195,516 入 / 5,426 出，约 $0.0084；用时 33.5 分钟
- 决策者：code 404，jev 75，jev-plan 48，deepseek 21，code-fallback 17

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→53（-11），决策 code 14，jev 1，jev-plan 1
- 第 3 层 小啃兽: HP 59→45（-14），决策 jev 1，jev-plan 1，code-fallback 1，code 1
- 第 4 层 毛绒伏地虫: HP 51→45（-6），决策 code 3，jev 1，jev-plan 1
- 第 5 层 树叶史莱姆（中）/飞蝇菌子: HP 51→45（-6），决策 code 10，jev-plan 2，code-fallback 1，jev 1
- 第 6 层 藤蔓蹒跚者: HP 51→49（-2），决策 code 7，code-fallback 1，jev 1
- 第 8 层 旧日雕像: HP 79→59（-20），决策 code 11，jev 1
- 第 9 层 闪光贾克斯果/飞蝇菌子: HP 65→64（-1），决策 code 5，jev-plan 2，jev 1
- 第 13 层 蛮兽: HP 68→64（-4），决策 code 5，code-fallback 2，jev-plan 2，jev 1
- 第 14 层 异蛙寄生虫/扭动虫: HP 68→57（-11），决策 code 16，jev 2，jev-plan 1
- 第 17 层 同族信徒/同族神官: HP 85→36（-49），决策 code 16，jev 6，jev-plan 6，code-fallback 1
- 第 19 层 外骨骼虫: HP 76→69（-7），决策 code 11
- 第 21 层 地道虫: HP 75→72（-3），决策 code 3，jev-plan 3，jev 1
- 第 22 层 外骨骼虫: HP 78→52（-26），决策 code 5，code-fallback 1
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 58→32（-26），决策 code 14，code-fallback 2
- 第 30 层 猎人杀手: HP 63→37（-26），决策 code 14，jev 4，jev-plan 2，code-fallback 2
- 第 31 层 残杀千足虫: HP 43→46（+3），决策 code 9，jev-plan 4，jev 1
- 第 33 层 火箭/碾碎爪: HP 77→10（-67），决策 code 12，jev 9，jev-plan 8，code-fallback 1
- 第 35 层 虔诚雕刻师: HP 71→68（-3），决策 code 10，jev 1，jev-plan 1
- 第 39 层 活体盾/高塔炮手: HP 67→53（-14），决策 code 11，code-fallback 2
- 第 40 层 青蛙骑士: HP 59→24（-35），决策 code 21，jev-plan 5，jev 4，code-fallback 1
- 第 43 层 电球头: HP 55→21（-34），决策 code 8，code-fallback 2，jev 2，jev-plan 1
- 第 45 层 守护机器人/电击机器人/组装师: HP 52→50（-2），决策 jev 4，code 3，jev-plan 1
- 第 48 层 永世沙漏: HP 65→8（-57），决策 jev 22，jev-plan 7，code 1
- 第 48 层 永世沙漏: HP 8→8（-0），决策 jev 1
- 第 48 层 永世沙漏: HP 8→8（-0），决策 code 2

### 死亡战斗：第 48 层 永世沙漏
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 究极防御
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan / code: 103
- combat/plan-continue / code: 71
- reward/claim / code: 58
- combat/plan-continue / jev-plan: 48
- map/route / code: 39
- combat/plan-choice+potion / jev: 35
- combat/plan-choice / jev: 28
- reward/proceed / code: 27
- combat/lethal / code: 26
- reward/card / code: 17
- combat/plan-choice / code-fallback: 16
- event/choose / deepseek: 9
- event/leave / code: 9
- rest/proceed / code: 9
- combat/end_turn / code: 8
- shop/buy / code: 7
- map/route / jev: 6
- reward/card / deepseek: 4
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- rest/choose / code: 3
- selection/remove / code: 3
- shop/buy / deepseek: 3
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/play / jev: 2
- map/route / deepseek: 2
- selection/add / code: 2
- selection/enchant / deepseek: 2
- combat/plan-choice+potion / code-fallback: 1
- combat/plan-potion / code: 1
- combat/potion-now / code: 1
- event/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1
- selection/upgrade / jev: 1

### 兜底介入（Claude/DeepSeek）：21 次（推翻 Jev 12 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.21 → o2）：3 upgraded card rewards snowball Act 1 damage and tempo, worth far more than one lost common chest relic; path skips are
- [deepseek] 第 11 层 TNone event/choose: 同意 Jev（o0 @0.31 → o0）：选卡优于付 14 血：第 1 幕仍缺格挡与 AOE，8 选 2 可补短板；神官长战前血量比随机遗物更值钱。
- [deepseek] 第 12 层 TNone selection/upgrade: 推翻 Jev（card10 @0.19 → card9）：痛击升级后易伤 3 层、伤害更高，配合拆卸与旋风斩打神官长战收益最大；战斗专注只多抽 1 张。
- [deepseek] 第 15 层 TNone shop/buy: 同意 Jev（buy_card1 @0.31 → buy_card1）：Kin boss + two fast-growing followers: 18 AOE damages all three, matching run plan's AOE priority; leaves 90g toward Mol
- [deepseek] 第 15 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.16 → buy_card2）：放血是A级能量牌：+2能量让旋风斩++爆发清信徒，也支撑痛击++接拆卸的连招；商店是本幕最后消费机会，余钱无用。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.25 → o0）：每场战斗首回合+4能量远超单张卡或改地图：能抢先打出燃烧/能力牌并配合AOE爆发，对帝皇蟹boss也有利。
- [deepseek] 第 18 层 TNone map/route: 同意 Jev（n1 @0.32 → n1）：Higher route value; Unknown node beats a shop we can't afford (89 gold < 100 removal). Extra fights build the strength/A
- [deepseek] 第 20 层 TNone selection/enchant: 推翻 Jev（card11 @0.16 → card4）：牌组短板是格挡；打击按计划优先删除，防御留队更久且每场都用，附魔在此最持久。
- [deepseek] 第 21 层 T1 reward/card: 推翻 Jev（skip @0.07 → card1）：狱火持续AOE，配合御血术/突破/放血每回合多次触发，正适合同回合平衡帝皇蟹双钳；HP 92%、护喉甲可抵消自伤。
- [deepseek] 第 27 层 TNone event/choose: 推翻 Jev（o2 @0.19 → o0）：锋利2附在多段/AOE攻击上，随力量成长放大爆发，利于帝皇蟹双钳同回合击杀；本局仅2张格挡、2张能力，另两项收益小。
- [deepseek] 第 27 层 TNone selection/enchant: 推翻 Jev（card6 @0.23 → card5）：Sharp adds damage per hit: on 0-cost Whirlwind+ every hit on both claws gains +2, exactly the burst needed to kill Kaise
- [deepseek] 第 29 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.21 → buy_card2）：血墙仅24金：16格挡补足短板（非基础格挡只2张），失2血还能触发狱火群伤，利于帝皇蟹双钳平衡。
- [deepseek] 第 30 层 T6 reward/card: 推翻 Jev（skip @0.31 → card2）：牌组非基础格挡仅3张且下一节点强制精英；此牌随力量成长（现约25挡/3E），高效补防。
- [deepseek] 第 34 层 TNone event/choose: 推翻 Jev（o2 @0.44 → o0）：+1 energy per turn is huge for a 29-card deck with Demon Form and a 512 HP boss; one curse is minor dilution.
- [deepseek] 第 37 层 TNone event/choose: 同意 Jev（o1 @0.35 → o1）：战斗专注是S级过牌，不能删；87%血量下3点血很便宜，重掷可望换到打击或诅咒被删，休息点和小邮箱还能回复。
- [deepseek] 第 37 层 TNone event/choose: 同意 Jev（o1 @0.09 → o1）：御血术+是1费20伤的高效攻击，面对凋萎boss不该删；84%血量、前有2-3个休息点，4点血便宜，重掷争删打击/诅咒。
- [deepseek] 第 37 层 TNone event/choose: 推翻 Jev（o1 @0.46 → o0）：Free card removal thins a 29-card deck; 5 HP is worth more for the Aeonglass fight, and rerolls already cost 3 and 4 HP.
- [deepseek] 第 40 层 T7 reward/card: 同意 Jev（skip @0.01 → skip）：29-card deck already attack-heavy; 头槌 adds no block or scaling for 永世沙漏. Keeping the deck lean limits Wither dilution be
- [deepseek] 第 43 层 T4 reward/card: 推翻 Jev（skip @0.31 → card2）：HP 27 and only 6 block cards; 4 Plating/turn is cheap persistent defense for the long Aeonglass fight, and 棋子 draws a ca
- [deepseek] 第 44 层 TNone map/route: 同意 Jev（n1 @0.02 → n1）：Route value 8>6.1; a monster fight feeds 白兽雕像 potion, card reward and Burning Blood heal before the rest site, and the d

### Jev 低置信度（<0.35）决策：35 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.10; code rank 1 (0.10)
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (旋风斩+) with confidence 0.29; code rank 1; HP guard: plan 1 (旋风斩+) loses 16 HP, more than 9 over the cheapest line, playing plan 4 ( (0.29)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 拆卸 -> 闪光贾克斯果) with confidence 0.30; code rank 1 (0.30)
- 第 13 层 combat/plan-choice: Jev chose plan 1/4 (拆卸 -> 蛮兽, 防御, 防御) with confidence 0.14; code rank 1 (0.14)
- 第 14 层 combat/plan-choice: Jev chose plan 3/4 (旋风斩+) with confidence 0.12; code rank 3; HP guard: plan 3 (旋风斩+) loses 16 HP, more than 7 over the cheapest line, playing plan 1 ( (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (放血, 预备打击+ -> 同族神官, 痛击+ -> 同族信徒, 突破, 打击 -> 同族信徒) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 同族神官, 御血术+ -> 同族神官) with confidence 0.21; code rank 1 (0.21)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 30 层 combat/plan-choice: Jev chose plan 1/4 (狱火, 突破, 耸肩无视) with confidence 0.20; code rank 1 (0.20)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (防御) with confidence 0.08; code rank 1 (0.08)
- 第 31 层 combat/plan-choice: Jev chose plan 3/3 (拆卸 -> 残杀千足虫, 放血, 踩踏, 突破, potion 格挡药水) with confidence 0.15; code rank 3 (0.15)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 3/3 (拆卸 -> 碾碎爪, 剑柄打击 -> 碾碎爪, 打击 -> 碾碎爪, 防御) with confidence 0.09; code rank 3 (0.09)
- 第 33 层 combat/plan-choice: Jev chose plan 2/4 (防御, 燃烧, 突破) with confidence 0.26; code rank 2 (0.26)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 3/3 (防御, 预备打击+ -> 火箭, 旋风斩+) with confidence 0.24; code rank 3 (0.24)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 3/3 (打击 -> 碾碎爪, 打击 -> 碾碎爪, 战斗专注, 耸肩无视+) with confidence 0.25; code rank 3 (0.25)

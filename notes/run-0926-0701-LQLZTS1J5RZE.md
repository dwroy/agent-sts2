## 复盘：run LQLZTS1J5RZE — 阵亡，最高第 23 层

- 决策 368 个；Jev 调用 43 次，Claude 0 次，DeepSeek 7 次；token 71,724 入 / 2,184 出，约 $0.0031；用时 18.0 分钟
- 决策者：code 289，jev 37，jev-plan 29，deepseek 7，code-fallback 6

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→51（-13），决策 code 7，jev 1，jev-plan 1
- 第 3 层 淤泥旋螺: HP 55→49（-6），决策 code 10，code-fallback 1，jev 1，jev-plan 1
- 第 4 层 噬尸蛞蝓: HP 55→38（-17），决策 code 8，jev-plan 3，jev 2
- 第 6 层 化石追踪者: HP 44→30（-14），决策 code 11，code-fallback 3，jev-plan 3，jev 2
- 第 9 层 鬼祟珊瑚群: HP 60→26（-34），决策 code 10，jev 3，jev-plan 2，code-fallback 2
- 第 11 层 下水道蚌: HP 32→28（-4），决策 code 10，jev 1
- 第 12 层 海洋混混/钙化邪教徒: HP 34→30（-4），决策 code 16，jev 1
- 第 15 层 卑鄙地精/地精佣兵/胖地精: HP 60→58（-2），决策 code 14
- 第 17 层 灵魂异鱼: HP 80→80（-0），决策 code 1
- 第 17 层 灵魂异鱼: HP 80→26（-54），决策 code 23，jev-plan 12，jev 9
- 第 19 层 地道虫: HP 70→58（-12），决策 code 16，jev 1，jev-plan 1
- 第 20 层 外骨骼虫: HP 62→51（-11），决策 code 19，jev 4，jev-plan 2
- 第 21 层 虱虫之祖: HP 57→39（-18），决策 code 23
- 第 22 层 幼虫/直飞产卵虫/结实的卵: HP 45→25（-20），决策 code 15，jev-plan 4，jev 2
- 第 23 层 棘刺蟾蜍: HP 31→5（-26），决策 code 19

### 死亡战斗：第 23 层 棘刺蟾蜍
- T2 [code] combat/plan: code plan (+25.2 over next): 恶魔形态+; hp -23, dmg 0
- T2 [code] combat/plan: code plan (only line): end turn; hp -23, dmg 0
- T3 [code] combat/plan: code plan (only distinct line): 狱火, 耸肩无视, 防御+; hp -2, dmg 0
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T3 [code] combat/plan: code plan (only distinct line): 防御+; hp -2, dmg 0
- T3 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T4 [code] combat/plan: code plan (+8.7 over next): 战斗专注, 打击 -> 棘刺蟾蜍, 打击+ -> 棘刺蟾蜍, 突破; hp -2, dmg 54
- T4 [code] combat/plan: code plan (+9.7 over next): 打击 -> 棘刺蟾蜍, 打击+ -> 棘刺蟾蜍, 突破; hp -2, dmg 54
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 棘刺蟾蜍
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 突破
- T4 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 打击 -> 棘刺蟾蜍

### 各类决策由谁做
- combat/plan / code: 93
- combat/plan-continue / code: 82
- reward/claim / code: 30
- combat/plan-continue / jev-plan: 29
- combat/plan-choice / jev: 23
- combat/lethal / code: 16
- map/route / code: 15
- reward/proceed / code: 13
- reward/card / code: 9
- combat/end_turn / code: 8
- map/route / jev: 7
- combat/plan-choice / code-fallback: 6
- combat/plan-choice+potion / jev: 4
- event/choose / deepseek: 4
- event/leave / code: 4
- rest/choose / code: 3
- rest/proceed / code: 3
- reward/card / deepseek: 2
- reward/card / jev: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- combat/plan-guarded / code: 1
- combat/plan-potion / code: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / code: 1
- selection/take into my hand / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：7 次（推翻 Jev 6 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.19 → o0）：Fishing Rod gives roughly 8 free upgrades across the run; one random colorless card is less consistent and can dilute th
- [deepseek] 第 6 层 T5 reward/card: 同意 Jev（card1 @0.13 → card1）：被遗忘的仪式 is a free +2 net energy burst that exhausts itself, keeping the 14-card deck lean; helps burst turns for damage o
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o0 @0.14 → o1）：329 gold buys two removals plus a card in Act 2; the curse is removable with that gold, while 54 gold changes nothing.
- [deepseek] 第 14 层 TNone event/choose: 推翻 Jev（o2 @0.39 → o0）：牌组无力量来源、伤害吃紧；锋利2附在主力攻击（尤以多段/AOE如旋风斩）每次攻击都加伤，长期收益最高，优于格挡与能力附魔。
- [deepseek] 第 14 层 TNone selection/enchant: 推翻 Jev（card7 @0.11 → card6）：御血术 is our best repeatable 1E attack: +2 damage every play, and its self-damage triggers 狱火. Strikes get removed; 熔融之拳 e
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o1 @0.16 → o0）：Pael's Tear is free energy: banking leftover energy into +2 turns fuels Demon Form ramp and burst for Knowledge Demon; C
- [deepseek] 第 21 层 T6 reward/card: 推翻 Jev（skip @0.29 → card1）：Breakthrough gives the needed second AOE; its 1 HP loss triggers Inferno for 6 more to all enemies, and Demon Form scale

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.05; code rank 1 (0.05)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 打击 -> 鬼祟珊瑚群, 狱火) with confidence 0.29; code rank 1 (0.29)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 鬼祟珊瑚群, 狱火) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (呼唤, 呼唤) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/4 (呼唤, 预备打击 -> 灵魂异鱼, 御血术 -> 灵魂异鱼) with confidence 0.23; code rank 2; HP guard: plan 2 (呼唤, 预备打击 -> 灵魂异鱼, 御血术 -> 灵魂异鱼) loses 27 HP, mo (0.23)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.16; code rank 1 (0.16)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (无惧疼痛, 熔融之拳 -> 地道虫) with confidence 0.20; code rank 1 (0.20)
- 第 20 层 combat/plan-choice+potion: Jev chose to drink 鲜血药水 (confidence 0.27) (0.27)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 耸肩无视, 预备打击 -> 直飞产卵虫) with confidence 0.21; code rank 1 (0.21)
- 第 22 层 combat/plan-choice: Jev chose plan 2/4 (无惧疼痛, 熔融之拳 -> 幼虫, 打击 -> 幼虫) with confidence 0.24; code rank 2 (0.24)

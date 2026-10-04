## 复盘：run RJZGFGNYK56W — 阵亡，最高第 33 层

- 决策 655 个；Jev 调用 106 次，Claude 0 次，大脑 35 次（codex 34，deepseek 1）；token 725,788 入 / 5,671 出，约 $0.0307（Jev）；大脑 token 5,529,338 入（缓存命中 3,186,816，58%）/ 12,342 出；用时 43.6 分钟
- 决策者：code 379，jev-plan 124，jev 106，codex 45，deepseek (for codex) 1

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→55（-9，战后回复 +6），决策 code 6，jev 4，jev-plan 4
- 第 3 层 噬尸蛞蝓: HP 61→47（-14，战后回复 +6），决策 code 7，jev-plan 6，jev 3
- 第 4 层 淤泥旋螺: HP 53→46（-7，战后回复 +6），决策 code 8，jev-plan 2，jev 1
- 第 5 层 下水道蚌: HP 52→41（-11，战后回复 +6），决策 code 7，jev 1，jev-plan 1
- 第 13 层 花园幽灵鳗: HP 80→54（-26，战后回复 +6），决策 code 14，jev-plan 10，jev 9
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 60→56（-4，战后回复 +6），决策 jev-plan 8，code 6，jev 4
- 第 15 层 幽灵船: HP 62→62（-0，战后回复 +6），决策 jev 4，code 3，jev-plan 2
- 第 17 层 灵魂异鱼: HP 80→43（-37，战后回复 +6），决策 code 17，jev-plan 14，jev 8
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 73→73（-0，战后回复 +6），决策 code 8，jev-plan 2，jev 1
- 第 22 层 偷窃草蜢: HP 76→44（-32，战后回复 +6），决策 code 13，jev 3，jev-plan 3
- 第 24 层 寄生惧魔/胧光怪: HP 50→34（-16，战后回复 +6），决策 code 12，jev-plan 3，jev 2
- 第 28 层 外骨骼虫: HP 80→42（-38，战后回复 +6），决策 jev 10，code 8，jev-plan 6
- 第 30 层 棘刺蟾蜍: HP 80→41（-39，战后回复 +6），决策 code 13，jev 4，jev-plan 3
- 第 31 层 蜂群术士: HP 47→4（-43，战后回复 +6），决策 code 13，jev-plan 7，jev 5
- 第 33 层 知识恶魔: HP 49→0（-49），决策 code 136，jev-plan 53，jev 47

### 死亡战斗：第 33 层 知识恶魔
- T8 [jev] combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.29; code rank 2 conf 0.29
- T8 [code] combat/end_turn: no playable cards; ending the turn
- T9 [code] combat/plan: code plan (only distinct line): 契约终结, 愤怒 -> 知识恶魔, 重锤 -> 知识恶魔; hp -0, dmg 93
- T9 [code] combat/plan: code plan (only distinct line): 愤怒 -> 知识恶魔, 重锤 -> 知识恶魔; hp -0, dmg 63
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 重锤 -> 知识恶魔
- T9 [code] combat/end_turn: no playable cards; ending the turn
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 43 (outlasts the HP: 8 a turn x 5.4 turns + 20 > 17 HP); WASTE_AWAY 85 (1.1 cards a tur
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 43 (outlasts the HP: 8 a turn x 5.4 turns + 20 > 17 HP); WASTE_AWAY 85 (1.1 cards a tur
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 15): 心神不宁, 战栗 -> 知识恶魔, 痛击 -
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 10): 战斗专注, 痛击 -> 知识恶魔
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 铁斩波 -> 知识恶魔
- T10 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 132
- combat/plan-continue / jev-plan: 124
- combat/plan-choice / jev: 105
- combat/plan-continue / code: 61
- reward/claim / code: 39
- map/route-follow / code: 29
- selection/curse / code: 23
- combat/end_turn / code: 18
- combat/least-loss / code: 18
- combat/lethal / code: 18
- reward/proceed / code: 14
- reward/card / codex: 13
- rest/plan / codex: 8
- rest/proceed / code: 8
- event/choose / codex: 7
- event/leave / code: 7
- map/route-change / codex: 4
- shop/buy / codex: 4
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/add / codex: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/act-plan / codex: 1
- event/after-discard / code: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- reward/card / deepseek (for codex): 1
- run/finalize / code: 1
- selection/choose / codex: 1
- selection/free-card / code: 1
- selection/remove / codex: 1
- selection/upgrade / codex: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 28 层 combat/plan-choice: Jev chose plan 3/10 (火焰屏障, 耸肩无视) with confidence 0.17; code rank 3 (0.17)
- 第 28 层 combat/plan-choice: Jev chose plan 2/5 (心神不宁, 战栗 -> 外骨骼虫 #1, 主宰+ -> 外骨骼虫 #1, 铁斩波 -> 外骨骼虫 #1) with confidence 0.34; code rank 2 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御, 防御, 防御) with confidence 0.28; code rank 2 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御, 防御, 防御) with confidence 0.22; code rank 2 (0.22)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御, 防御, 防御) with confidence 0.19; code rank 2 (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (铁斩波 -> 知识恶魔) with confidence 0.15; code rank 2 (0.15)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (熔融之拳 -> 知识恶魔, 打击 -> 知识恶魔, 防御) with confidence 0.10; code rank 3 (0.10)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (契约终结, 岿然不动) with confidence 0.26; code rank 2 (0.26)
- 第 33 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 岿然不动) with confidence 0.22; code rank 4 (0.22)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (防御, 跃跃欲试+) with confidence 0.10; code rank 3 (0.10)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.29; code rank 2 (0.29)

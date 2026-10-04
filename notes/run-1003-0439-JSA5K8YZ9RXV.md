## 复盘：run JSA5K8YZ9RXV — 阵亡，最高第 48 层

- 决策 773 个；Jev 调用 147 次，Claude 0 次，DeepSeek 46 次；token 865,529 入 / 7,907 出，约 $0.0367（Jev）；DeepSeek token 6,510,861 入（缓存命中 5,996,288，92%）/ 220,453 出；用时 47.0 分钟
- 决策者：code 377，jev-plan 186，jev 147，deepseek 63

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→61（-3，战后回复 +6），决策 code 7，jev-plan 2，jev 1
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 67→67（-0，战后回复 +6），决策 jev 2，code 2
- 第 5 层 毛绒伏地虫: HP 73→72（-1，战后回复 +6），决策 jev 4，jev-plan 4，code 2
- 第 6 层 劫掠者弩手/劫掠者斧手/劫掠者暴徒: HP 78→75（-3，战后回复 +5），决策 jev-plan 6，code 3，jev 2
- 第 8 层 旧日雕像: HP 80→40（-40，战后回复 +6），决策 code 13，jev-plan 5，jev 2
- 第 9 层 藤蔓蹒跚者: HP 46→24（-22，战后回复 +6），决策 jev 7，jev-plan 7，code 5
- 第 11 层 蛮兽: HP 30→22（-8，战后回复 +6），决策 code 7，jev 4，jev-plan 4
- 第 13 层 异蛙寄生虫/扭动虫: HP 52→52（-0，战后回复 +6），决策 code 8
- 第 14 层 小啃兽: HP 58→41（-17，战后回复 +6），决策 jev 10，jev-plan 8，code 1
- 第 17 层 仪式兽: HP 71→52（-19，战后回复 +6），决策 jev-plan 12，jev 10，code 10
- 第 19 层 地道虫: HP 75→62（-13，战后回复 +6），决策 code 10，jev-plan 7，jev 3
- 第 22 层 偷窃草蜢: HP 68→68（-0，战后回复 +6），决策 jev-plan 5，code 4，jev 2
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 74→57（-17，战后回复 +6），决策 jev-plan 7，code 5，jev 3
- 第 27 层 异螨: HP 63→48（-15，战后回复 +6），决策 code 9，jev-plan 8，jev 4
- 第 28 层 寄生惧魔/胧光怪: HP 54→54（-0，战后回复 +6），决策 jev 4，code 4，jev-plan 2
- 第 31 层 猎人杀手: HP 60→58（-2，战后回复 +6），决策 code 8
- 第 33 层 知识恶魔: HP 80→20（-60，战后回复 +6），决策 code 56，jev-plan 53，jev 32
- 第 35 层 活体盾/高塔炮手: HP 69→50（-19，战后回复 +6），决策 jev 6，jev-plan 5，code 4
- 第 36 层 虔诚雕刻师: HP 56→49（-7，战后回复 +6），决策 jev 5，code 4，jev-plan 4
- 第 37 层 青蛙骑士: HP 55→47（-8，战后回复 +6），决策 code 10，jev-plan 9，jev 4
- 第 39 层 噪音机器人/电击机器人/组装师: HP 53→53（-0，战后回复 +6），决策 jev-plan 5，jev 3，code 3
- 第 42 层 史莱姆狂战士: HP 59→39（-20，战后回复 +6），决策 jev-plan 13，jev 7，code 7
- 第 45 层 咬人卷轴: HP 69→61（-8，战后回复 +6），决策 jev 13，jev-plan 8，code 3
- 第 46 层 拳击构装体/方柱构装体: HP 67→17（-50，战后回复 +6），决策 jev 11，jev-plan 4，code 4
- 第 48 层 女王/火炬头聚合体: HP 46→0（-46），决策 code 13，jev 8，jev-plan 8

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T3 [code] selection/exhaust: code: 飞剑回旋镖 scores 11 vs 与我一战！ 5
- T3 [jev] combat/plan-choice: Jev chose plan 1/3 (与我一战！ -> 女王) with confidence 0.80; code rank 1 conf 0.80
- T3 [code] combat/end_turn: no playable cards; ending the turn
- T4 [jev] combat/plan-choice: Jev chose plan 2/3 (防御, 愤怒+ -> 火炬头聚合体, 双重打击 -> 火炬头聚合体) with confidence 0.90; code rank 2 [calc mismatch: solver says ending now does not kill, mod says lethal:  conf 0.90
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒+ -> 火炬头聚合体
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 火炬头聚合体
- T4 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag counts the intents against t
- T5 [code] combat/plan: code plan (only line): 狱火+, 御血术 -> 火炬头聚合体, 打击 -> 火炬头聚合体; hp -3, dmg 48
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 御血术 -> 火炬头聚合体
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T5 [code] combat/end_turn: no playable cards; ending the turn
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-37): 血墙, 旋风斩+

### 各类决策由谁做
- combat/plan-continue / jev-plan: 186
- combat/plan-choice / jev: 98
- combat/plan / code: 70
- reward/claim / code: 67
- combat/plan-continue / code: 58
- combat/plan-choice+potion / jev: 45
- map/route-follow / code: 42
- combat/lethal / code: 26
- reward/card / deepseek: 26
- reward/proceed / code: 25
- selection/curse / code: 18
- selection/exhaust / code: 12
- combat/end_turn / code: 11
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- shop/buy / deepseek: 9
- combat/least-loss / code: 5
- event/leave / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- selection/upgrade / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion-lethal / jev: 3
- sphere/clear / code: 3
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/take into my hand / code: 2
- event/choose / deepseek: 1
- event/only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 3 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 1/4 (痛击+ -> 藤蔓蹒跚者) with confidence 0.30; code rank 1 (0.30)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 4/4 (防御, 预备打击 -> 藤蔓蹒跚者, 防御) with confidence 0.25; code rank - (rollout's best line, added) (0.25)
- 第 14 层 combat/plan-choice: Jev chose plan 1/8 (战栗 -> 小啃兽, 与我一战！ -> 小啃兽) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (飞剑回旋镖, 双重打击 -> 仪式兽, potion 再生药水) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.00; code rank 1 (0.00)
- 第 46 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 48 层 combat/plan-choice: Jev chose plan 3/6 (岩石铠甲+, potion 肌肉药水, 突然一拳 -> 火炬头聚合体, 究极打击 -> 女王) with confidence 0.34; code rank 3 (0.34)

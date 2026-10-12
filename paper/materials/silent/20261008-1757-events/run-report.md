## 复盘：run SY0WMJNNVRLM — 阵亡，最高第 33 层

- 决策 636 个；Jev 调用 175 次，Claude 0 次，大脑 37 次（codex 37）；token 907,321 入 / 8,900 出，约 $0.0385（Jev）；大脑 token 4,854,235 入（缓存命中 3,230,720，67%）/ 9,013 出；用时 34.5 分钟
- 决策者：code 264，jev 175，jev-plan 154，codex 43

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→54（-2），决策 code 7，jev-plan 5，jev 4
- 第 3 层 缩小甲虫: HP 54→54（-0），决策 jev-plan 5，jev 4，code 4
- 第 4 层 小啃兽: HP 54→49（-5），决策 jev 8，jev-plan 5，code 3
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 49→39（-10），决策 jev 16，jev-plan 13，code 1
- 第 9 层 异蛙寄生虫/扭动虫: HP 53→12（-41），决策 jev 23，jev-plan 9，code 2
- 第 14 层 墨宝: HP 33→33（-0），决策 jev-plan 6，jev 3，code 2
- 第 17 层 墨影幻灵: HP 54→14（-40），决策 code 17，jev-plan 12，jev 7
- 第 19 层 外骨骼虫: HP 58→47（-11），决策 jev-plan 8，code 7，jev 4
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 47→17（-30），决策 jev-plan 7，code 7，jev 5
- 第 21 层 异螨: HP 17→3（-14），决策 code 30，jev-plan 19，jev 9
- 第 30 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 64→70（+6），决策 jev 8，jev-plan 8，code 5
- 第 31 层 残杀千足虫: HP 70→46（-24），决策 jev-plan 6，jev 4，code 3
- 第 33 层 无厌沙虫: HP 70→0（-70），决策 jev 80，code 68，jev-plan 51

### 死亡战斗：第 33 层 无厌沙虫
- T7 [jev] combat/plan-choice: Jev chose plan 2/2 (狂乱逃离, 防御) with confidence 0.30; code rank 2 conf 0.30
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T7 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 5
- T8 [jev] combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 无厌沙虫, 中和 -> 无厌沙虫, 蛇咬 -> 无厌沙虫) with confidence 0.85; code rank - (rollout's best line, added) conf 0.85
- T8 [jev] combat/plan-choice: Jev chose plan 1/3 (中和 -> 无厌沙虫, 蛇咬 -> 无厌沙虫) with confidence 0.23; code rank 1 conf 0.23
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 蛇咬 -> 无厌沙虫
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 15
- T9 [code] combat/sandpit-guard: Sandpit 1 would reach 0 at the enemy turn (death regardless of HP/block): playing Frantic Escape instead of ending the turn
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 狂乱逃离, 精确切击 -> 无厌沙虫, 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 精确切击 -> 无厌沙虫
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 154
- combat/plan-choice+potion / jev: 106
- combat/plan / code: 66
- combat/plan-choice / jev: 57
- combat/plan-continue / code: 43
- reward/claim / code: 36
- map/route-follow / code: 29
- combat/least-loss / code: 20
- reward/card / codex: 15
- combat/lethal / code: 14
- combat/end_turn / code: 12
- reward/proceed / code: 12
- selection/choose / jev: 12
- event/leave / code: 9
- event/choose / codex: 7
- rest/plan / codex: 6
- rest/proceed / code: 6
- selection/add / codex: 3
- shop/buy / codex: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- shop/plan / codex: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- combat/sandpit-guard / code: 1
- event/act-plan / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- shop/buy / code: 1
- shop/discard / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：34 个
- 第 9 层 selection/choose: Jev chose 感染 with confidence 0.28 (0.28)
- 第 14 层 combat/plan-choice: Jev chose plan 1/10 (带毒刺击 -> 墨宝 #2, 打击 -> 墨宝 #2, 打击 -> 墨宝 #2, 灵动步法, 突然一拳 -> 墨宝 #1, potion 铁心药水) with confidence 0.33; code rank 1 (0.33)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (防御, 串刺 -> 墨影幻灵) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 31 层 combat/plan-choice: Jev chose plan 4/10 (偏折, 精确切击 -> 残杀千足虫 (MIDDLE), 爆发, 蛇咬 -> 残杀千足虫 (FRONT)) with confidence 0.26; code rank 4 (0.26)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (精确切击 -> 无厌沙虫) with confidence 0.33; code rank 1 (0.33)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 罐装幽灵 (confidence 0.12) (0.12)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/5 (触媒, 打击 -> 无厌沙虫, 打击 -> 无厌沙虫, 带毒刺击 -> 无厌沙虫) with confidence 0.34; code rank 1 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (精确切击 -> 无厌沙虫) with confidence 0.14; code rank 1 (0.14)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.06; code rank 1 (0.06)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.12; code rank 1 (0.12)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 罐装幽灵 (confidence 0.14) (0.14)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (精确切击 -> 无厌沙虫) with confidence 0.07; code rank 1 (0.07)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 罐装幽灵 (confidence 0.04); SL explore: replaying attempt 1's end turn instead of drink 罐装幽灵 before T5 (0.04)

## 复盘：run HNX4A2WBC34W — 阵亡，最高第 48 层

- 决策 850 个；Jev 调用 201 次，Claude 0 次，大脑 49 次（codex 49）；token 1,202,654 入 / 12,028 出，约 $0.0510（Jev）；大脑 token 6,691,351 入（缓存命中 4,096,896，61%）/ 12,614 出；用时 52.2 分钟
- 决策者：code 345，jev-plan 240，jev 201，codex 64

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→56（-0），决策 jev-plan 9，code 9，jev 8
- 第 3 层 缩小甲虫: HP 56→52（-4），决策 code 11，jev-plan 5，jev 3
- 第 4 层 小啃兽: HP 52→52（-0），决策 jev-plan 7，code 4，jev 3
- 第 5 层 利齿之眼/雾菇: HP 52→35（-17），决策 code 17，jev 7，jev-plan 7
- 第 6 层 毛绒伏地虫/缩小甲虫: HP 35→22（-13），决策 jev 11，jev-plan 10，code 7
- 第 8 层 扭动虫: HP 64→62（-2），决策 code 11，jev 3，jev-plan 3
- 第 12 层 藤蔓蹒跚者: HP 67→56（-11），决策 jev-plan 9，jev 5，code 4
- 第 14 层 旧日雕像: HP 75→32（-43），决策 code 15，jev 8，jev-plan 4
- 第 17 层 仪式兽: HP 54→35（-19），决策 jev-plan 16，code 14，jev 12
- 第 19 层 外骨骼虫: HP 67→67（-0），决策 jev-plan 8，code 5，jev 3
- 第 20 层 偷窃草蜢: HP 67→53（-14），决策 jev-plan 10，jev 7，code 6
- 第 21 层 外骨骼虫: HP 53→45（-8），决策 jev-plan 6，jev 5，code 2
- 第 28 层 蜂群术士: HP 61→59（-2），决策 jev-plan 14，jev 10，code 7
- 第 30 层 啃咬机: HP 59→54（-5），决策 jev 11，jev-plan 10，code 5
- 第 33 层 无厌沙虫: HP 58→19（-39），决策 jev-plan 41，jev 29，code 25
- 第 35 层 活体盾/高塔炮手: HP 63→57（-6），决策 code 5，jev-plan 4，jev 1
- 第 36 层 虔诚雕刻师: HP 57→38（-19），决策 jev-plan 11，jev 7，code 6
- 第 39 层 猫头鹰法官: HP 38→1（-37），决策 jev-plan 14，jev 13，code 3
- 第 43 层 电球头: HP 23→8（-15），决策 jev 7，jev-plan 4，code 3
- 第 48 层 永世沙漏: HP 78→0（-78），决策 jev 48，jev-plan 48，code 32

### 死亡战斗：第 48 层 永世沙漏
- T7 [jev] combat/plan-choice: Jev chose plan 1/6 (致命毒药+ -> 永世沙漏, 刀刃之舞, 致命毒药 -> 永世沙漏, 致命毒药 -> 永世沙漏) with confidence 0.99; code rank 1 conf 0.99
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 刀刃之舞
- T7 [jev] combat/plan-choice: Jev chose plan 6/6 (致命毒药 -> 永世沙漏, 致命毒药 -> 永世沙漏, 小刀 -> 永世沙漏, 小刀 -> 永世沙漏) with confidence 0.96; code rank - (rollout's best line, added) conf 0.96
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药 -> 永世沙漏
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀 -> 永世沙漏
- T7 [code] combat/plan: code plan (only distinct line): 小刀 -> 永世沙漏, 小刀 -> 永世沙漏; hp -36, dmg 97 [ending now kills by what the mod's lethal flag does not count: 38 HP lost in all, 20 of 
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 永世沙漏
- T7 [code] combat/end_turn: no playable cards; ending the turn
- T8 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 84): 后空翻, 打击 -> 永世沙漏, 防御
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-30): 防御, 暴露 -> 永世沙漏
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 暴露 -> 永世沙漏
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-30): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 240
- combat/plan-choice / jev: 157
- combat/plan / code: 96
- reward/claim / code: 50
- map/route-follow / code: 42
- combat/plan-continue / code: 41
- combat/lethal / code: 30
- combat/plan-choice+potion / jev: 27
- reward/card / codex: 19
- reward/proceed / code: 19
- selection/choose / jev: 17
- combat/end_turn / code: 14
- rest/plan / codex: 10
- rest/proceed / code: 10
- combat/least-loss / code: 9
- event/leave / code: 9
- shop/buy / codex: 9
- event/choose / codex: 8
- shop/leave / code: 6
- shop/open / code: 5
- shop/plan / codex: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- selection/upgrade / codex: 2
- combat/sandpit-guard / code: 1
- event/only / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 树叶史莱姆（小）, 打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）) with confidence 0.30; code rank 1 (0.30)
- 第 5 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 雾菇, 打击 -> 雾菇, 防御) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 藤蔓蹒跚者) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 selection/choose: Jev chose 萎靡 with confidence 0.22 (0.22)
- 第 21 层 combat/plan-choice: Jev chose plan 2/10 (触媒, 带毒刺击 -> 外骨骼虫 #2, 匕首雨, 打击 -> 外骨骼虫 #1) with confidence 0.34; code rank 2 (0.34)
- 第 30 层 selection/choose: Jev chose 防御 with confidence 0.12 (0.12)
- 第 36 层 selection/choose: Jev chose 匕首雨 with confidence 0.30 (0.30)
- 第 39 层 combat/plan-choice+potion: Jev chose plan 1/2 (防御, 后空翻) with confidence 0.27; code rank 1 (0.27)
- 第 43 层 selection/choose: Jev chose 灵动步法 with confidence 0.22 (0.22)
- 第 48 层 combat/plan-choice: Jev chose plan 4/4 (打击+ -> 永世沙漏, 腐蚀波, 串刺 -> 永世沙漏) with confidence 0.33; code rank 4 [ending now kills by what the mod's lethal flag does not count: 35 (0.33)

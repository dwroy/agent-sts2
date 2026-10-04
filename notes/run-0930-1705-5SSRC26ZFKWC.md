## 复盘：run 5SSRC26ZFKWC — 阵亡，最高第 17 层

- 决策 281 个；Jev 调用 49 次，Claude 0 次，DeepSeek 16 次；token 240,046 入 / 2,226 出，约 $0.0102（Jev）；DeepSeek token 2,170,885 入（缓存命中 1,962,752，90%）/ 69,794 出；用时 14.6 分钟
- 决策者：code 149，jev-plan 61，jev 49，deepseek 22

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→57（-7，战后回复 +6），决策 jev-plan 7，code 6，jev 5
- 第 3 层 海洋混混: HP 63→54（-9，战后回复 +6），决策 jev 4，jev-plan 4，code 4
- 第 4 层 蟾蜍蝌蚪: HP 60→60（-0，战后回复 +6），决策 jev-plan 6，code 5，jev 4
- 第 6 层 幽灵船: HP 66→51（-15，战后回复 +6），决策 jev-plan 7，jev 5，code 2
- 第 7 层 鬼祟珊瑚群: HP 57→44（-13，战后回复 +6），决策 code 8，jev-plan 6，jev 4
- 第 9 层 噬尸蛞蝓: HP 50→42（-8，战后回复 +6），决策 jev-plan 7，code 7，jev 4
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 48→45（-3，战后回复 +6），决策 jev 12，jev-plan 6
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 75→69（-6，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 15 层 骇鳗: HP 75→66（-9，战后回复 +6），决策 code 16，jev-plan 5，jev 3
- 第 17 层 瀑布巨兽: HP 72→0（-72），决策 code 36，jev-plan 7，jev 5

### 死亡战斗：第 17 层 瀑布巨兽
- T8 [code] combat/end_turn: no playable cards; ending the turn
- T9 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.65; code rank 2 conf 0.65
- T10 [code] combat/plan: code plan (only distinct line): 拆卸 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽, 打击 -> 瀑布巨兽; hp -0, dmg 20
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 瀑布巨兽
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T10 [code] combat/plan: code plan (only distinct line): end turn; hp -0, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 愤怒+ -> 瀑布巨兽, 愤怒+ 
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 愤怒+ -> 瀑布巨兽, 打击 -> 瀑布巨兽, 愤怒+ -> 瀑布巨兽, 防御
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 瀑布巨兽
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 61
- combat/plan / code: 41
- combat/plan-continue / code: 33
- combat/plan-choice / jev: 29
- reward/claim / code: 24
- combat/plan-choice+potion / jev: 16
- map/route-follow / code: 15
- reward/card / deepseek: 9
- reward/proceed / code: 9
- combat/lethal / code: 8
- combat/end_turn / code: 4
- shop/buy / deepseek: 4
- combat/least-loss / code: 3
- combat/plan-choice+potion-lethal / jev: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/upgrade / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / deepseek: 1
- event/leave / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 7 层 combat/plan-choice+potion: Jev chose plan 1/4 (防御, 防御, potion 易伤药水 -> 鬼祟珊瑚群, 拆卸 -> 鬼祟珊瑚群) with confidence 0.21; code rank 1 (0.21)
- 第 12 层 combat/plan-choice: Jev chose plan 3/5 (痛击+ -> 地精佣兵, 打击 -> 地精佣兵, 跃跃欲试) with confidence 0.22; code rank 3 (0.22)
- 第 12 层 combat/plan-choice: Jev chose plan 3/3 (拆卸 -> 地精佣兵, 血墙) with confidence 0.18; code rank - (rollout's best line, added) (0.18)
- 第 12 层 combat/plan-choice+potion-lethal: Jev chose plan 3/3 (end turn) with confidence 0.17; code rank - (rollout's best line, added) (0.17)
- 第 14 层 combat/plan-choice: Jev chose plan 1/5 (打击 -> 钙化邪教徒, 黑暗之拥, potion 爆炸安瓿, potion 药水形状的石头 -> 钙化邪教徒) with confidence 0.22; code rank 1 (0.22)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (血墙, 打击 -> 骇鳗, potion 药水形状的石头 -> 骇鳗) with confidence 0.16; code rank 1 (0.16)
- 第 15 层 combat/plan-choice: Jev chose plan 2/2 (痛击+ -> 骇鳗, 打击 -> 骇鳗, 愤怒 -> 骇鳗) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, potion 药水形状的石头 -> 瀑布巨兽) with confidence 0.09; code rank 1 (0.09)

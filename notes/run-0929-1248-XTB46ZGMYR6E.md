## 复盘：run XTB46ZGMYR6E — 阵亡，最高第 17 层

- 决策 284 个；Jev 调用 49 次，Claude 0 次，DeepSeek 20 次；token 146,692 入 / 2,490 出，约 $0.0063（Jev）；DeepSeek token 375,559 入（缓存命中 268,416，71%）/ 41,113 出；用时 12.1 分钟
- 决策者：code 159，jev-plan 56，jev 49，deepseek 20

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→56（-8），决策 code 9，jev-plan 3，jev 1
- 第 5 层 蟾蜍蝌蚪: HP 68→59（-9），决策 code 5，jev 3，jev-plan 2
- 第 6 层 淤泥旋螺: HP 63→59（-4），决策 code 5，jev 3，jev-plan 3
- 第 8 层 下水道蚌: HP 65→54（-11），决策 code 5，jev-plan 4，jev 2
- 第 9 层 骇鳗: HP 60→8（-52），决策 code 12，jev-plan 7，jev 5
- 第 11 层 海洋混混/钙化邪教徒: HP 28→2（-26），决策 code 12，jev 7，jev-plan 7
- 第 15 层 双尾鼠: HP 71→49（-22），决策 code 12，jev-plan 9，jev 8
- 第 17 层 灵魂异鱼: HP 83→83（-0），决策 jev 3，code 2，jev-plan 1
- 第 17 层 灵魂异鱼: HP 83→1（-82），决策 code 42，jev-plan 20，jev 16

### 死亡战斗：第 17 层 灵魂异鱼
- T19 [code] combat/plan: code plan (only line): 呼唤, 呼唤, 呼唤; hp -0, dmg 0 [calc mismatch: solver says ending now kills, mod says safe]
- T19 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T19 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T19 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T20 [code] combat/plan: code plan (only distinct line): 打击 -> 灵魂异鱼, 火焰屏障; hp -0, dmg 1
- T20 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T20 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T21 [code] combat/plan: code plan (dominates the score-best line): 战斗专注, 呼唤, 呼唤; hp -0, dmg 0 [calc mismatch: solver says ending now kills, mod says safe]
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 呼唤, 呼唤, 呼唤
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan / code: 66
- combat/plan-continue / jev-plan: 56
- combat/plan-choice / jev: 37
- combat/plan-continue / code: 24
- reward/claim / code: 18
- combat/plan-choice+potion / jev: 11
- map/route-follow / code: 11
- combat/lethal / code: 9
- reward/card / deepseek: 7
- reward/proceed / code: 7
- event/choose / deepseek: 3
- event/leave / code: 3
- map/route / code: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- shop/buy / deepseek: 3
- combat/least-loss / code: 2
- combat/plan-potion / code: 2
- map/route-plan / deepseek: 2
- shop/buy / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 5 层 combat/plan-choice: Jev chose plan 2/3 (防御, 痛击 -> 蟾蜍蝌蚪) with confidence 0.33; code rank 2 (0.33)
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (痛击+ -> 骇鳗, 御血术 -> 骇鳗); plan 1 (打击 -> 骇鳗, 打击 -> 骇鳗, 御血术 -> 骇鳗) is as good or better on every axis, playing it with confidence 0.34; (0.34)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/3 (防御, 防御, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 4/6 (防御, 御血术 -> 双尾鼠, 防御) with confidence 0.31; code rank 4 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (痛击+ -> 灵魂异鱼, 熔融之拳 -> 灵魂异鱼) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 灵魂异鱼) with confidence 0.02; code rank 2 (0.02)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (呼唤, 打击 -> 灵魂异鱼, 防御) with confidence 0.18; code rank 2 (0.18)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御, 呼唤, 防御) with confidence 0.34; code rank 1 (0.34)

## 复盘：run CWMPAZUR32MW — 阵亡，最高第 7 层

- 决策 76 个；Jev 调用 15 次，Claude 0 次，DeepSeek 4 次；token 23,055 入 / 757 出，约 $0.0010；用时 4.9 分钟
- 决策者：code 41，jev-plan 16，jev 14，deepseek 4，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 71→61（-10），决策 jev-plan 4，code 4，jev 3
- 第 3 层 海洋混混: HP 67→66（-1），决策 jev-plan 2，code 2，jev 1，code-fallback 1
- 第 3 层 海洋混混: HP 66→63（-3），决策 code 5，jev 1
- 第 7 层 花园幽灵鳗: HP 61→39（-22），决策 jev-plan 4，code 4，jev 2
- 第 7 层 花园幽灵鳗: HP 39→25（-14），决策 jev-plan 6，code 3，jev 3
- 第 7 层 花园幽灵鳗: HP 25→8（-17），决策 code 5

### 死亡战斗：第 7 层 花园幽灵鳗
- T6 [code] combat/plan: code plan (only line): end turn; hp -17, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 打击 -> 花园幽灵鳗, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 花园幽灵鳗
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 16
- combat/plan / code: 14
- combat/plan-choice / jev: 10
- combat/plan-continue / code: 5
- reward/claim / code: 5
- event/leave / code: 4
- event/choose / deepseek: 3
- map/route / code: 3
- map/route / jev: 3
- combat/least-loss / code: 2
- combat/lethal / code: 2
- reward/proceed / code: 2
- selection/add / code: 2
- combat/plan-choice / code-fallback: 1
- reward/card / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / deepseek: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 1 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.31 → o0）：A random relic gives immediate Act-1 tempo; the curse option poisons a thin 11-card deck with no exhaust, and +5 max HP 
- [deepseek] 第 3 层 T2 selection/add: 同意 Jev（card1 @0.36 → card1）：Act 1 normal fight: a guaranteed Strike on top speeds the kill and ends the fight sooner; 66/87 HP needs no extra 5 bloc
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.35 → o0）：8 HP 在 79% 血量下可承受（燃烧之血可回），随机遗物价值高于 100 金币+随机卡牌，且无需为 boss 留血至此。
- [deepseek] 第 6 层 TNone event/choose: 同意 Jev（o1 @0.04 → o1）：回满血才能安全打下一节点的精英（血量需>80%），也保证巨兽前的进场血量；单张基础牌附魔价值有限。

### Jev 低置信度（<0.35）决策：5 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 淤泥旋螺) with confidence 0.09; code rank 1 (0.09)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.05; code rank 1 (0.05)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 海洋混混, 防御) with confidence 0.16; code rank 1 (0.16)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (防御) with confidence 0.24; code rank 1 (0.24)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 花园幽灵鳗, 防御) with confidence 0.10; code rank 1; HP guard: plan 1 (防御, 打击 -> 花园幽灵鳗, 防御) loses 6 HP, more than 4 over the ch (0.10)

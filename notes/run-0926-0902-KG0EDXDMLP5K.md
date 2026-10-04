## 复盘：run KG0EDXDMLP5K — 阵亡，最高第 17 层

- 决策 264 个；Jev 调用 35 次，Claude 0 次，DeepSeek 2 次；token 48,197 入 / 1,498 出，约 $0.0021；用时 14.5 分钟
- 决策者：code 194，jev-plan 33，jev 29，code-fallback 6，deepseek 2

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 8，jev-plan 2，jev 1，code-fallback 1
- 第 3 层 噬尸蛞蝓: HP 61→46（-15），决策 code 4，jev 2，jev-plan 2
- 第 4 层 淤泥旋螺: HP 51→43（-8），决策 code 7，jev-plan 3，jev 2，code-fallback 1
- 第 5 层 潮湿邪教徒/钙化邪教徒: HP 49→35（-14），决策 code 8，jev 2，jev-plan 2
- 第 7 层 下水道蚌: HP 41→33（-8），决策 code 9，code-fallback 1，jev 1，jev-plan 1
- 第 9 层 骇鳗: HP 63→38（-25），决策 code 12，jev-plan 4，jev 3，code-fallback 2
- 第 12 层 海洋混混/钙化邪教徒: HP 68→55（-13），决策 code 12，code-fallback 1，jev 1，jev-plan 1
- 第 13 层 花园幽灵鳗: HP 60→27（-33），决策 code 11，jev-plan 5，jev 3
- 第 14 层 幽灵船: HP 33→20（-13），决策 code 11，jev 4，jev-plan 3
- 第 17 层 瀑布巨兽: HP 50→12（-38），决策 code 29，jev-plan 10，jev 7
- 第 17 层 瀑布巨兽: HP 12→12（-0），决策 code 10

### 死亡战斗：第 17 层 瀑布巨兽
- T13 [code] combat/plan: code plan (only distinct line): 防御; hp -0, dmg 0
- T13 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T14 [code] combat/plan: code plan (+9.6 over next): 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽; hp -0, dmg 30
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 瀑布巨兽
- T14 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 打击 -> 瀑布巨兽, 防御, 邪眼
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 邪眼
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan / code: 72
- combat/plan-continue / code: 34
- combat/plan-continue / jev-plan: 33
- combat/plan-choice / jev: 26
- reward/claim / code: 25
- map/route / code: 14
- reward/card / code: 11
- combat/lethal / code: 9
- reward/proceed / code: 9
- combat/plan-choice / code-fallback: 6
- event/leave / code: 3
- rest/proceed / code: 3
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- combat/plan-guarded / code: 2
- event/choose / deepseek: 2
- map/route / jev: 2
- rest/choose / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/add / code: 1

### 兜底介入（Claude/DeepSeek）：2 次（推翻 Jev 1 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.42 → o1）：轰鸣海螺无牌组代价，精英战开局+2抽+1能量，正好支撑一幕打精英拿遗物；诅咒+金币违背手册（无消耗手段不拿诅咒），加单卡收益也不确定。
- [deepseek] 第 15 层 TNone event/choose: 推翻 Jev（o0 @0.06 → o1）：Rest site must be used to heal (26/80), so this free upgrade is our only pre-boss one; cannon rewards upgraded attacks. 

### Jev 低置信度（<0.35）决策：11 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 淤泥旋螺) with confidence 0.18; code rank 1 (0.18)
- 第 4 层 combat/plan-choice: Jev chose plan 1/4 (防御, 突破, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (突破, 无情猛攻 -> 下水道蚌) with confidence 0.20; code rank 1; HP guard: plan 1 (突破, 无情猛攻 -> 下水道蚌) loses 15 HP, more than 8 over the cheapes (0.20)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (重锤 -> 骇鳗) with confidence 0.17; code rank 1; HP guard: plan 1 (重锤 -> 骇鳗) loses 8 HP, more than 6 over the cheapest line, playing p (0.17)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 打击 -> 幽灵船, 防御) with confidence 0.20; code rank 1 (0.20)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 幽灵船, 防御) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (突破, 打击 -> 瀑布巨兽, 邪眼) with confidence 0.25; code rank 2; HP guard: plan 2 (突破, 打击 -> 瀑布巨兽, 邪眼) loses 13 HP, more than 4 over the che (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 无情猛攻+ -> 瀑布巨兽) with confidence 0.21; code rank 2 (0.21)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (无情猛攻+ -> 瀑布巨兽, 邪眼) with confidence 0.11; code rank 1; HP guard: plan 1 (无情猛攻+ -> 瀑布巨兽, 邪眼) loses 17 HP, more than 4 over the cheap (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (痛击 -> 瀑布巨兽, 耸肩无视) with confidence 0.18; code rank 3 (0.18)

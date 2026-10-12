## 复盘：run 2H311EAD34GD — 阵亡，最高第 17 层

- 决策 647 个；Jev 调用 154 次，Claude 0 次，大脑 16 次（codex 16）；token 771,840 入 / 6,684 出，约 $0.0327（Jev）；大脑 token 2,101,081 入（缓存命中 843,904，40%）/ 3,823 出；用时 25.2 分钟
- 决策者：code 294，jev-plan 176，jev 154，codex 23

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→53（-3），决策 code 14，jev 5，jev-plan 5
- 第 4 层 海洋混混: HP 47→34（-13），决策 code 11，jev-plan 4，jev 3
- 第 5 层 噬尸蛞蝓: HP 34→34（-0），决策 code 12，jev-plan 8，jev 6
- 第 8 层 花园幽灵鳗: HP 55→4（-51），决策 jev 18，code 16，jev-plan 15
- 第 11 层 幽灵船: HP 25→14（-11），决策 code 16，jev-plan 5，jev 4
- 第 13 层 潮湿邪教徒/钙化邪教徒: HP 35→35（-0），决策 code 9，jev 6，jev-plan 5
- 第 14 层 化石追踪者: HP 35→31（-4），决策 code 5，jev-plan 5，jev 2
- 第 17 层 乐加维林族母: HP 52→0（-52），决策 code 157，jev-plan 129，jev 110

### 死亡战斗：第 17 层 乐加维林族母
- T10 [jev] combat/plan-choice: Jev chose plan 2/2 (小刀 -> 乐加维林族母, 猎杀者 -> 乐加维林族母, 投掷匕首 -> 乐加维林族母, 切割 -> 乐加维林族母) with confidence 0.10; code rank 2; HP guard: plan 2 (小刀 -> 乐加维林族母, 猎杀者 -> 乐加维林族母, conf 0.10
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 猎杀者 -> 乐加维林族母
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 切割 -> 乐加维林族母
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T10 [jev] selection/choose: Jev chose 打击 with confidence 0.19 conf 0.19
- T10 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T11 [code] combat/plan: code plan (only distinct line): 中和 -> 乐加维林族母; hp -0, dmg 0
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 打击 -> 乐加维林族母, 防御, 防御
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 176
- combat/plan / code: 114
- combat/plan-continue / code: 98
- combat/plan-choice / jev: 91
- selection/choose / jev: 42
- combat/plan-choice+potion / jev: 20
- reward/claim / code: 18
- map/route-follow / code: 15
- combat/least-loss / code: 11
- combat/lethal / code: 7
- reward/card / codex: 7
- reward/proceed / code: 7
- shop/buy / codex: 7
- combat/end_turn / code: 6
- rest/plan / codex: 4
- rest/proceed / code: 4
- event/choose / codex: 2
- event/leave / code: 2
- selection/discard / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：29 个
- 第 2 层 selection/choose: Jev chose 防御 with confidence 0.25 (0.25)
- 第 4 层 selection/choose: Jev chose 打击 with confidence 0.28 (0.28)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.22 (0.22)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.19 (0.19)
- 第 8 层 selection/choose: Jev chose 防御 with confidence 0.20 (0.20)
- 第 8 层 selection/choose: Jev chose 防御 with confidence 0.16 (0.16)
- 第 8 层 selection/choose: Jev chose 打击 with confidence 0.19 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (小刀 -> 乐加维林族母, 小刀 -> 乐加维林族母, 打击 -> 乐加维林族母, 打击 -> 乐加维林族母, 中和 -> 乐加维林族母, 匕首雨) with confidence 0.30; code rank 3; HP guard: plan 3 (小刀 (0.30)
- 第 17 层 selection/choose: Jev chose 投掷匕首 with confidence 0.04 (0.04)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (小刀 -> 乐加维林族母, 打击 -> 乐加维林族母, 匕首雨, 投掷匕首 -> 乐加维林族母, 中和 -> 乐加维林族母) with confidence 0.22; code rank 2 (0.22)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.22 (0.22)
- 第 17 层 selection/choose: Jev chose 小刀 with confidence 0.29 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (猎杀者 -> 乐加维林族母, potion 铁心药水) with confidence 0.12; code rank 1 (0.12)
- 第 17 层 selection/choose: Jev chose 切割 with confidence 0.26 (0.26)
- 第 17 层 selection/choose: Jev chose 小刀 with confidence 0.23 (0.23)

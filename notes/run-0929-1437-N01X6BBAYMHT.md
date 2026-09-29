## 复盘：run N01X6BBAYMHT — 阵亡，最高第 9 层

- 决策 115 个；Jev 调用 17 次，Claude 0 次，DeepSeek 9 次；token 46,589 入 / 885 出，约 $0.0020（Jev）；DeepSeek token 165,416 入（缓存命中 117,888，71%）/ 35,614 出；用时 8.1 分钟
- 决策者：code 65，jev-plan 24，jev 17，deepseek 9

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 jev 2，jev-plan 2，code 2
- 第 3 层 蟾蜍蝌蚪: HP 61→54（-7），决策 jev-plan 3，code 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 56→54（-2），决策 code 7，jev-plan 3，jev 2
- 第 6 层 拳击构装体: HP 52→50（-2），决策 jev-plan 3，jev 2，code 1
- 第 6 层 拳击构装体: HP 50→45（-5），决策 code 4，jev 1，jev-plan 1
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 51→27（-24），决策 code 9，jev 4，jev-plan 4
- 第 9 层 鬼祟珊瑚群: HP 57→7（-50），决策 code 10，jev-plan 8，jev 4

### 死亡战斗：第 9 层 鬼祟珊瑚群
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 鬼祟珊瑚群
- T3 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 4/4 (打击 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群, 防御) with confidence 0.86; code rank - (rollout's best line, added) conf 0.86
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 鬼祟珊瑚群
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -19, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 打击 -> 鬼祟珊瑚群, 防御, 原始力量
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 鬼祟珊瑚群
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 原始力量
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 24
- combat/plan / code: 19
- combat/plan-choice / jev: 17
- reward/claim / code: 12
- combat/plan-continue / code: 8
- combat/lethal / code: 7
- map/route-follow / code: 7
- reward/card / deepseek: 5
- reward/proceed / code: 5
- combat/least-loss / code: 2
- event/choose / deepseek: 2
- event/leave / code: 2
- map/route-plan / deepseek: 1
- rest/plan / deepseek: 1
- rest/proceed / code: 1
- run/finalize / code: 1
- selection/free-card / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/4 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.21; code rank 2 (0.21)
- 第 7 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 地精佣兵, 防御, 防御) with confidence 0.24; code rank - (rollout's best line, added) (0.24)

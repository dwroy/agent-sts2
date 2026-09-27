## 复盘：run 24UZ3PZNLKTQ — 阵亡，最高第 17 层

- 决策 204 个；Jev 调用 26 次，Claude 0 次，DeepSeek 0 次；token 44,710 入 / 1,148 出，约 $0.0019；用时 7.3 分钟
- 决策者：code 158，jev 26，jev-plan 20

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→59（-5），决策 code 8，jev-plan 4，jev 2
- 第 4 层 海洋混混: HP 64→49（-15），决策 code 10，jev-plan 2，jev 1
- 第 5 层 蟾蜍蝌蚪: HP 55→44（-11），决策 code 9，jev-plan 2，jev 1
- 第 11 层 噬尸蛞蝓: HP 60→55（-5），决策 code 9，jev 2，jev-plan 2
- 第 14 层 花园幽灵鳗: HP 80→57（-23），决策 code 12，jev 4，jev-plan 4
- 第 15 层 化石追踪者: HP 63→57（-6），决策 code 6，jev 1，jev-plan 1
- 第 17 层 乐加维林族母: HP 80→80（-0），决策 code 6，jev 1
- 第 17 层 乐加维林族母: HP 80→43（-37），决策 code 6，jev-plan 4，jev 3
- 第 17 层 乐加维林族母: HP 43→39（-4），决策 code 4
- 第 17 层 乐加维林族母: HP 39→17（-22），决策 code 10，jev 1，jev-plan 1
- 第 17 层 乐加维林族母: HP 17→9（-8），决策 code 3
- 第 17 层 乐加维林族母: HP 9→9（-0），决策 code 7

### 死亡战斗：第 17 层 乐加维林族母
- T11 [code] combat/plan: code plan (only distinct line): 狂怒, 打击 -> 乐加维林族母; hp -0, dmg 3
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 13): 耸肩无视, 突破, 打击 -> 乐加维林族母
- T12 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 8): 耸肩无视, 突破
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 防御
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan / code: 53
- combat/plan-continue / code: 22
- combat/plan-continue / jev-plan: 20
- combat/plan-choice / jev: 16
- reward/claim / code: 15
- map/route / code: 14
- combat/lethal / code: 9
- reward/proceed / code: 6
- selection/add / code: 6
- event/leave / code: 5
- combat/least-loss / code: 4
- event/choose / jev: 4
- reward/card / code: 4
- rest/choose / code: 3
- rest/proceed / code: 3
- map/route / jev: 2
- reward/card / jev: 2
- shop/buy / code: 2
- bundle/choose / jev: 1
- bundle/confirm / code: 1
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- combat/plan-guarded / code: 1
- event/heal / code: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/upgrade / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 1 层 event/choose: Jev chose 卷轴箱 with confidence 0.17 (0.17)
- 第 1 层 bundle/choose: Jev chose bundle 0 with confidence 0.05 (0.05)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 淤泥旋螺, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 15 层 reward/card: Jev chose 彼岸咆哮 (Attack, 3E) with confidence 0.27 (0.27)

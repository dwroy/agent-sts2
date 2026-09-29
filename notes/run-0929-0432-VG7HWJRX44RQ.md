## 复盘：run VG7HWJRX44RQ — 未结束，最高第 13 层

- 决策 152 个；Jev 调用 23 次，Claude 0 次，DeepSeek 19 次；token 70,550 入 / 1,207 出，约 $0.0030（Jev）；DeepSeek token 328,324 入（缓存命中 235,136，72%）/ 71,951 出；用时 11.1 分钟
- 决策者：code 83，jev-plan 27，jev 23，deepseek 19

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→53（-11），决策 code 11，jev 1，jev-plan 1
- 第 4 层 噬尸蛞蝓: HP 59→59（-0），决策 jev 5，jev-plan 3
- 第 4 层 噬尸蛞蝓: HP 59→59（-0），决策 jev-plan 2，jev 1
- 第 8 层 拳击构装体: HP 80→32（-48），决策 jev-plan 10，jev 7，code 5
- 第 8 层 拳击构装体: HP 32→32（-0），决策 code 6
- 第 13 层 花园幽灵鳗: HP 72→44（-28），决策 code 15，jev-plan 11，jev 8

### 各类决策由谁做
- combat/plan-continue / jev-plan: 27
- combat/plan / code: 21
- combat/plan-choice / jev: 17
- reward/claim / code: 15
- combat/plan-continue / code: 12
- map/route-follow / code: 12
- event/choose / deepseek: 6
- combat/plan-choice+potion / jev: 5
- event/leave / code: 5
- reward/card / deepseek: 4
- reward/proceed / code: 4
- shop/buy / deepseek: 4
- combat/lethal / code: 3
- rest/choose / deepseek: 2
- rest/proceed / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- event/only / code: 1
- map/route-plan / deepseek: 1
- selection/add / deepseek: 1
- selection/exhaust / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.19; code rank 2 (0.19)
- 第 13 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.20; code rank 2 (0.20)

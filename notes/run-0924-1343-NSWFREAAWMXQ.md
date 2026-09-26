## 复盘：run NSWFREAAWMXQ — 未结束，最高第 3 层

- 决策 35 个；Jev 调用 4 次，Claude 1 次，DeepSeek 0 次；token 3,595 入 / 168 出，约 $0.0002；用时 1.3 分钟
- 决策者：code 29，jev 2，jev-plan 2，claude 1，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→68（-12），决策 code 16，code-fallback 1
- 第 3 层 毛绒伏地虫: HP 74→74（-0），决策 code 7，jev-plan 2，jev 1

### 各类决策由谁做
- combat/plan-continue / code: 8
- combat/plan / code: 7
- combat/end_turn / code: 6
- combat/lethal / code: 2
- combat/plan-continue / jev-plan: 2
- reward/claim / code: 2
- combat/plan-choice / code-fallback: 1
- combat/plan-choice / jev: 1
- event/choose / claude: 1
- event/leave / code: 1
- map/route / code: 1
- map/route / jev: 1
- reward/card / code: 1
- reward/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：1 次（推翻 Jev 0 次）
- [claude] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.47 → o1）：150 gold up front buys a removal or a key card at the first shop; the fishing rod's random upgrades are slow.

### Jev 低置信度（<0.35）决策：1 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.06; code rank 1 (0.06)

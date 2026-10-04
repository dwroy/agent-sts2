## 复盘：run HGDBHW8CJK8C — 未结束，最高第 14 层

- 决策 195 个；Jev 调用 33 次，Claude 8 次，DeepSeek 0 次；token 41,911 入 / 1,421 出，约 $0.0018；用时 9.3 分钟
- 决策者：code 140，jev-plan 21，jev 19，claude 8，code-fallback 6，claude-plan 1

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 80→69（-11），决策 code 13，jev-plan 7，jev 4，code-fallback 1
- 第 3 层 蟾蜍蝌蚪: HP 75→76（+1），决策 code 6
- 第 5 层 淤泥旋螺: HP 80→76（-4），决策 code 6，jev-plan 2，code-fallback 1，jev 1
- 第 6 层 海洋混混/钙化邪教徒: HP 82→69（-13），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 7 层 双尾鼠: HP 78→75（-3），决策 code 14
- 第 9 层 花园幽灵鳗: HP 81→61（-20），决策 code 11，jev-plan 3，claude 1，jev 1
- 第 12 层 幽灵船: HP 67→67（-0），决策 code 2，code-fallback 1
- 第 12 层 幽灵船: HP 67→55（-12），决策 code 9，jev-plan 2，code-fallback 1，jev 1
- 第 13 层 气态炸弹/活雾: HP 61→53（-8），决策 code 8，jev 4，jev-plan 3，code-fallback 1
- 第 14 层 鬼祟珊瑚群: HP 59→52（-7），决策 code 6，claude 2，jev-plan 2，claude-plan 1，jev 1

### 各类决策由谁做
- combat/end_turn / code: 29
- combat/plan-continue / code: 22
- reward/claim / code: 22
- combat/plan / code: 21
- combat/plan-continue / jev-plan: 21
- combat/plan-choice / jev: 13
- combat/lethal / code: 10
- map/route / code: 9
- reward/proceed / code: 8
- combat/plan-choice / code-fallback: 6
- reward/card / code: 6
- combat/plan-choice+potion / claude: 3
- map/route / jev: 3
- event/choose / claude: 2
- event/leave / code: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-continue / claude-plan: 1
- map/route / claude: 1
- rest/choose / code: 1
- rest/proceed / code: 1
- reward/card / claude: 1
- reward/card / jev: 1
- selection/choose / jev: 1
- selection/exhaust / code: 1
- selection/remove / code: 1
- selection/upgrade / claude: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：8 次（推翻 Jev 6 次）
- [claude] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.25 → o2）：A pick of 1 from 3 rares (Demon Form / Offering / Feed class) outweighs one dead Injury card; the route planner cannot e
- [claude] 第 5 层 T3 reward/card: 同意 Jev（card1 @0.35 → card1）：Early deck is thin on block: Taunt gives 6 block plus Vulnerable for 1 energy; a second Setup Strike or Anger adds less.
- [claude] 第 8 层 TNone selection/upgrade: 推翻 Jev（card12 @0.15 → card15）：Demon Form+ (+4 Strength per turn) compounds most over the long boss fights that decide runs.
- [claude] 第 8 层 TNone map/route: 推翻 Jev（n0 @0.34 → n1）：Both routes contain an elite; take it now at 91% HP with Demon Form+ in the deck, followed by a treasure and an unknown 
- [claude] 第 9 层 T1 combat/plan-choice+potion: 推翻 Jev（plan2 @0.43 → plan1）：Four-eel elite (~117 HP) will last several turns: Demon Form+ on turn 1 (+4 Strength every turn) pays back far more than
- [claude] 第 11 层 TNone event/choose: 同意 Jev（o0 @0.15 → o0）：Fresnel Lens only helps future block cards and costs 13 max HP permanently; a free potion has no downside.
- [claude] 第 14 层 T1 combat/plan-choice+potion: 推翻 Jev（plan3 @0.33 → p2）：Skulking Colony has Hardened Shell 20: at most 20 HP lost per turn, so a 4+ turn fight where Strength barely helps and b
- [claude] 第 14 层 T1 combat/plan-choice+potion: 推翻 Jev（plan2 @0.49 → plan4）：Hardened Shell caps each turn at 20, so this is a 4-turn fight: lose only 7, apply Vulnerable 2 to hit the cap cheaply n

### Jev 低置信度（<0.35）决策：8 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 狂宴 -> 噬尸蛞蝓) with confidence 0.23; code rank 1 (0.23)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 防御) with confidence 0.19; code rank 1 (0.19)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 5 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.30; code rank 2 (0.30)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 海洋混混, 预备打击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.07; code rank 1 (0.07)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 狂宴 -> 幽灵船) with confidence 0.12; code rank 1 (0.12)
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 活雾, 狂宴 -> 活雾, 防御) with confidence 0.14; code rank 1 (0.14)
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 打击 -> 活雾) with confidence 0.18; code rank 1 (0.18)

## 复盘：run 833ZM0MJGWHC — 阵亡，最高第 49 层

- 决策 860 个；Jev 调用 174 次，Claude 0 次，大脑 47 次（codex 47）；token 962,657 入 / 10,185 出，约 $0.0409（Jev）；大脑 token 6,406,793 入（缓存命中 3,854,336，60%）/ 12,743 出；用时 43.9 分钟
- 决策者：code 378，jev-plan 248，jev 174，codex 60

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 56→55（-1），决策 code 14，jev-plan 7，jev 4
- 第 5 层 小啃兽: HP 60→60（-0），决策 code 8，jev-plan 4，jev 3
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 60→60（-0），决策 code 7，jev-plan 4，jev 3
- 第 7 层 蛮兽: HP 60→59（-1），决策 jev-plan 11，code 8，jev 7
- 第 12 层 异蛙寄生虫/扭动虫: HP 79→65（-14），决策 code 15，jev-plan 13，jev 6
- 第 14 层 方柱构装体: HP 65→63（-2），决策 code 13，jev 5，jev-plan 3
- 第 17 层 仪式兽: HP 63→51（-12），决策 jev-plan 11，jev 8，code 8
- 第 19 层 地道虫: HP 74→56（-18），决策 jev-plan 10，jev 5，code 5
- 第 21 层 盛碗虫（石）/盛碗虫（蜜）: HP 38→34（-4），决策 jev-plan 9，jev 5，code 5
- 第 22 层 猎人杀手: HP 34→23（-11），决策 jev-plan 13，jev 5，code 5
- 第 28 层 啃咬机: HP 52→38（-14），决策 jev-plan 10，jev 4，code 4
- 第 30 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 68→59（-9），决策 jev 7，code 7，jev-plan 4
- 第 31 层 棘刺蟾蜍: HP 59→59（-0），决策 code 10，jev-plan 7，jev 4
- 第 33 层 知识恶魔: HP 59→40（-19），决策 jev-plan 15，code 12，jev 6
- 第 35 层 咬人卷轴: HP 80→67（-13），决策 jev-plan 10，code 4，jev 3
- 第 37 层 虔诚雕刻师: HP 67→59（-8），决策 jev-plan 6，jev 5，code 3
- 第 38 层 史莱姆狂战士: HP 59→35（-24），决策 jev-plan 10，jev 9，code 2
- 第 42 层 咬人卷轴: HP 65→22（-43），决策 jev-plan 11，jev 8，code 1
- 第 45 层 电球头: HP 50→35（-15），决策 jev 9，jev-plan 9，code 4
- 第 46 层 巨斧机器人: HP 35→16（-19），决策 jev 18，jev-plan 14，code 2
- 第 48 层 永世沙漏: HP 45→23（-22），决策 jev-plan 13，jev 11，code 8
- 第 49 层 实验体 #C68: HP 23→0（-23），决策 code 79，jev-plan 54，jev 39

### 死亡战斗：第 49 层 实验体 #C68
- T5 [code] combat/plan: code plan (only line): end turn; hp -25, dmg 27
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (生存者+, 扫腿 -> 实验体 #C68, 预判, 防御) with confidence 0.43; code rank - (rollout's best line, added) conf 0.43
- T6 [jev] selection/choose: Jev chose 预判 with confidence 0.20 conf 0.20
- T6 [jev] combat/plan-choice: Jev chose plan 1/2 (扫腿 -> 实验体 #C68, 防御) with confidence 0.84; code rank 1 conf 0.84
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 27
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 带毒刺击+ -> 实验体 #C68, 带毒刺击 -> 实验体 #C68, 蜃景, 手上技法, 打击 -> 实验体 #C68
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 带毒刺击 -> 实验体 #C68
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 蜃景
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 手上技法
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 实验体 #C68
- T7 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 248
- combat/plan-choice / jev: 95
- combat/plan / code: 90
- combat/plan-continue / code: 61
- reward/claim / code: 50
- map/route-follow / code: 43
- combat/plan-choice+potion / jev: 41
- selection/choose / jev: 38
- combat/lethal / code: 28
- combat/least-loss / code: 21
- reward/proceed / code: 21
- reward/card / codex: 20
- combat/end_turn / code: 16
- event/leave / code: 11
- rest/plan / codex: 10
- rest/proceed / code: 10
- event/choose / codex: 9
- shop/buy / codex: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/curse / code: 4
- selection/upgrade / codex: 4
- event/plan / codex: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/discard / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- combat/mod-lethal / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 30 层 selection/choose: Jev chose 毒雾 with confidence 0.33 (0.33)
- 第 33 层 combat/plan-choice: Jev chose plan 8/10 (毒雾, 萎靡 -> 知识恶魔, potion 肌肉药水, 背刺 -> 知识恶魔) with confidence 0.32; code rank 8 (0.32)
- 第 46 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 巨斧机器人) with confidence 0.33; code rank 1 (0.33)
- 第 46 层 selection/choose: Jev chose 计算下注 with confidence 0.18 (0.18)
- 第 49 层 selection/choose: Jev chose 战术大师 with confidence 0.27 (0.27)
- 第 49 层 selection/choose: Jev chose 生存者+ with confidence 0.32 (0.32)
- 第 49 层 selection/choose: Jev chose 中和 with confidence 0.20 (0.20)
- 第 49 层 selection/choose: Jev chose 战术大师 with confidence 0.23 (0.23)
- 第 49 层 selection/choose: Jev chose 战术大师 with confidence 0.27 (0.27)
- 第 49 层 selection/choose: Jev chose 战术大师 with confidence 0.27 (0.27)
- 第 49 层 selection/choose: Jev chose 战术大师 with confidence 0.31 (0.31)
- 第 49 层 selection/choose: Jev chose 预判 with confidence 0.20 (0.20)

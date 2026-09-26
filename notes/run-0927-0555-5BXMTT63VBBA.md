## 复盘：run 5BXMTT63VBBA — 阵亡，最高第 33 层

- 决策 455 个；Jev 调用 54 次，Claude 0 次，DeepSeek 11 次；token 104,551 入 / 2,830 出，约 $0.0045；用时 26.5 分钟
- 决策者：code 351，jev 46，jev-plan 39，deepseek 11，code-fallback 8

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→60（-4），决策 code 9，jev-plan 2，jev 1，code-fallback 1
- 第 3 层 蟾蜍蝌蚪: HP 66→57（-9），决策 code 11，code-fallback 2
- 第 5 层 噬尸蛞蝓: HP 69→68（-1），决策 code 11，jev 3，code-fallback 3，jev-plan 2
- 第 6 层 化石追踪者: HP 74→53（-21），决策 jev-plan 5，code 5，jev 3
- 第 8 层 花园幽灵鳗: HP 59→38（-21），决策 jev-plan 7，code 7，jev 4
- 第 9 层 下水道蚌: HP 43→25（-18），决策 code 12，jev-plan 2，jev 1
- 第 15 层 拳击构装体: HP 84→81（-3），决策 code 8
- 第 17 层 瀑布巨兽: HP 86→40（-46），决策 code 20，jev 8，jev-plan 4
- 第 19 层 偷窃草蜢: HP 75→41（-34），决策 code 11
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 46→32（-14），决策 code 6，code-fallback 1
- 第 22 层 棘刺蟾蜍: HP 38→11（-27），决策 code 7，jev 5，jev-plan 3
- 第 23 层 虱虫之祖: HP 17→12（-5），决策 code 23
- 第 28 层 蜂群术士: HP 81→72（-9），决策 code 16，jev-plan 2，code-fallback 1，jev 1
- 第 30 层 残杀千足虫: HP 96→42（-54），决策 code 15，jev-plan 3，jev 1
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 50→5（-45），决策 code 23，jev 4，jev-plan 2
- 第 33 层 知识恶魔: HP 41→40（-1），决策 jev-plan 3，jev 2
- 第 33 层 知识恶魔: HP 40→33（-7），决策 code 12，jev 4，jev-plan 3
- 第 33 层 知识恶魔: HP 32→25（-7），决策 code 12，jev 1，jev-plan 1
- 第 33 层 知识恶魔: HP 24→8（-16），决策 code 5

### 死亡战斗：第 33 层 知识恶魔
- T10 [code] combat/plan: code plan (only distinct line): 上勾拳 -> 知识恶魔; hp -16, dmg 21
- T10 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 15): 剑柄打击 -> 知识恶魔, 巨像
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视+
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-18): end turn

### 各类决策由谁做
- combat/plan / code: 110
- combat/plan-continue / code: 68
- reward/claim / code: 41
- combat/plan-continue / jev-plan: 39
- combat/plan-choice / jev: 38
- map/route / code: 28
- combat/lethal / code: 19
- reward/proceed / code: 15
- reward/card / code: 12
- combat/plan-choice / code-fallback: 8
- combat/plan-guarded / code: 7
- event/leave / code: 6
- rest/proceed / code: 6
- combat/end_turn / code: 4
- combat/least-loss / code: 4
- event/choose / deepseek: 4
- rest/choose / code: 4
- shop/buy / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- map/route / jev: 3
- selection/curse / code: 3
- event/only / code: 2
- reward/card / deepseek: 2
- selection/upgrade / code: 2
- selection/upgrade / deepseek: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/plan-potion / code: 1
- map/route / deepseek: 1
- rest/choose / deepseek: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/upgrade / jev: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：11 次（推翻 Jev 5 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.04 → o1）：轰鸣海螺在精英战开局额外抽2张并获得能量，直接提升一幕精英胜率与遗物滚雪球；骨骰附赠诅咒风险太高，羽翼之靴收益偏弱。
- [deepseek] 第 3 层 T4 reward/card: 推翻 Jev（card0 @0.31 → card1）：Best common: 8 block + draw, fills two gaps (0 non-basic block, 0 draw) for the Giant's Pressure Gun/explosion. Whirlwin
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.17 → o0）：Free +6 max HP helps survive Waterfall Giant's eruption; 124 gold must stay untouched to afford an A8 shop Strike-remova
- [deepseek] 第 13 层 TNone shop/buy: 同意 Jev（buy_potion2 @0.13 → buy_potion2）：杂耍是陷阱牌；能量药水助 boss 自爆回合格挡或爆发，且 boss 前无商店，49 金值得花掉。
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o1 @0.33 → o1）：Heal 28 (56→84) before Waterfall Giant boss; self-damage deck needs HP buffer, and enchanting a Strike we plan to remove
- [deepseek] 第 16 层 TNone rest/choose: 同意 Jev（o1 @0.04 → o1）：满血 86/86，休息无收益；boss 前锻造升级撕裂/狱火等核心牌，提升打瀑布巨兽的输出速度。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.17 → o0）：Upgrade 4 is permanent and risk-free; deck has only 1 upgrade with S-tier targets (Demon Form, Rupture, Inferno, Bash). 
- [deepseek] 第 18 层 TNone selection/upgrade: 推翻 Jev（card16 @0.34 → card9）：Shrug It Off+ adds 3 block each cycle in a long Knowledge Demon fight; block is the deck's weakest area. Pommel/Breakthr
- [deepseek] 第 18 层 TNone selection/upgrade: 推翻 Jev（card10 @0.12 → card13）：Hemokinesis+ gives 20 damage for 1E — deck's best single-target hit, and each play triggers Rupture (+1 Str) and Inferno
- [deepseek] 第 20 层 T2 map/route: 同意 Jev（n1 @0.29 → n1）：Unknown slightly higher route value; at 44% HP an event may heal or help for free, and it still continues to two monster
- [deepseek] 第 30 层 T5 reward/card: 推翻 Jev（card0 @0.17 → card1）：Pommel Strike is the top-valued pick: 9 damage plus draw smooths into Demon Form, block and Inferno for the Knowledge De

### Jev 低置信度（<0.35）决策：22 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (撕裂, 防御, 打击 -> 噬尸蛞蝓) with confidence 0.32; code rank 1 (0.32)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 噬尸蛞蝓) with confidence 0.25; code rank 1 (0.25)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 化石追踪者, 防御, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 花园幽灵鳗, 防御, 打击 -> 花园幽灵鳗, 狱火, potion 虚弱药水 -> 花园幽灵鳗) with confidence 0.29; code rank 1 (0.29)
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 花园幽灵鳗, 打击 -> 花园幽灵鳗) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 瀑布巨兽, 打击 -> 瀑布巨兽, potion 能量药水, 打击 -> 瀑布巨兽, 狱火) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 瀑布巨兽, 狱火) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 瀑布巨兽, 剑柄打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (御血术 -> 瀑布巨兽) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (防御) with confidence 0.21; code rank 1 (0.21)
- 第 22 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.03; code rank 2 (0.03)
- 第 22 层 combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 棘刺蟾蜍, 防御, 打击 -> 棘刺蟾蜍) with confidence 0.32; code rank 3 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (突破, 巨像) with confidence 0.30; code rank 1 (0.30)
- 第 28 层 combat/plan-choice: Jev chose plan 2/2 (防御, 防御, potion 瓶中船) with confidence 0.25; code rank 2 (0.25)

## 复盘：run VCM94LZR1DTA — 胜利，最高第 48 层

- 决策 645 个；Jev 调用 111 次，Claude 0 次，DeepSeek 46 次；token 444,708 入 / 6,154 出，约 $0.0189（Jev）；DeepSeek token 1,279,446 入（缓存命中 861,184，67%）/ 248,243 出；用时 42.7 分钟
- 决策者：code 309，jev-plan 166，jev 111，deepseek 59

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→56（-8，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 5 层 淤泥旋螺: HP 62→53（-9，战后回复 +6），决策 code 6，jev-plan 4，jev 3
- 第 6 层 海洋混混: HP 59→58（-1，战后回复 +6），决策 jev-plan 7，code 5，jev 3
- 第 7 层 花园幽灵鳗: HP 64→31（-33，战后回复 +6），决策 jev 8，jev-plan 7，code 6
- 第 9 层 鬼祟珊瑚群: HP 61→42（-19，战后回复 +6），决策 code 7，jev-plan 5，jev 4
- 第 12 层 骇鳗: HP 72→53（-19，战后回复 +6），决策 code 14，jev-plan 8，jev 4
- 第 13 层 气态炸弹/活雾: HP 59→48（-11，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 15 层 幽灵船: HP 54→52（-2，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 17 层 瀑布巨兽: HP 80→14（-66，战后回复 +6），决策 jev-plan 18，code 15，jev 9
- 第 19 层 外骨骼虫: HP 68→61（-7，战后回复 +6），决策 jev-plan 8，code 7，jev 3
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 67→64（-3，战后回复 +6），决策 jev 5，jev-plan 4，code 2
- 第 27 层 残杀千足虫: HP 70→53（-17，战后回复 +6），决策 jev-plan 7，jev 6
- 第 28 层 寄生惧魔/胧光怪: HP 59→53（-6，战后回复 +6），决策 jev 6，jev-plan 6，code 2
- 第 30 层 啃咬机: HP 59→44（-15，战后回复 +6），决策 jev-plan 9，jev 6，code 2
- 第 33 层 火箭/碾碎爪: HP 74→18（-56，战后回复 +6），决策 jev-plan 19，jev 12，code 5
- 第 35 层 咬人卷轴: HP 68→68（-0，战后回复 +6），决策 jev 5，code 4，jev-plan 3
- 第 37 层 活体盾/高塔炮手: HP 74→55（-19，战后回复 +6），决策 jev-plan 11，code 6，jev 3
- 第 39 层 巨斧机器人: HP 81→54（-27，战后回复 +6），决策 code 15，jev-plan 12，jev 11
- 第 45 层 战斗好伙伴V1.0: HP 100→97（-3，战后回复 +3），决策 jev-plan 8，code 3，jev 2
- 第 46 层 幽灵骑士/连枷骑士/魔法骑士: HP 100→96（-4，战后回复 +4），决策 jev-plan 9，jev 6，code 4
- 第 48 层 永世沙漏: HP 100→6（-94，战后回复 +6），决策 code 17，jev-plan 10，jev 9

### 各类决策由谁做
- combat/plan-continue / jev-plan: 166
- combat/plan / code: 67
- combat/plan-choice / jev: 57
- reward/claim / code: 56
- combat/plan-choice+potion / jev: 53
- map/route-follow / code: 42
- combat/plan-continue / code: 35
- combat/lethal / code: 24
- reward/card / deepseek: 22
- reward/proceed / code: 21
- event/leave / code: 9
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- combat/end_turn / code: 7
- shop/buy / deepseek: 7
- event/choose / deepseek: 6
- shop/leave / code: 6
- shop/open / code: 5
- event/only / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/upgrade / deepseek: 3
- shop/plan / deepseek: 3
- sphere/clear / code: 3
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-follow / deepseek: 2
- selection/take into my hand / code: 2
- shop/buy / code: 2
- combat/least-loss / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/confirm / code: 1
- selection/enchant / deepseek: 1
- selection/exhaust / code: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 5 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.22; code rank 3 (0.22)
- 第 6 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 海洋混混, 防御, 防御) with confidence 0.30; code rank 3 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 御血术 -> 瀑布巨兽, 飞剑回旋镖) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (防御, 痛击 -> 瀑布巨兽, 打击 -> 瀑布巨兽); plan 1 (痛击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 血墙) is as good or better on every axis, playing it with confidence 0. (0.15)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.04; code rank 2 (0.04)
- 第 27 层 combat/plan-choice+potion: Jev chose plan 1/8 (飞剑回旋镖, 踩踏, potion 格挡药水) with confidence 0.25; code rank 1 (0.25)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 2/2 (燃烧, 打击 -> 胧光怪, 打击 -> 胧光怪, 拆卸 -> 胧光怪) with confidence 0.27; code rank 2 (0.27)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 1/2 (突破) with confidence 0.32; code rank 1 (0.32)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.21) (0.21)
- 第 39 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.26) (0.26)
- 第 39 层 combat/plan-choice: Jev chose plan 1/3 (御血术+ -> 巨斧机器人, 打击+ -> 巨斧机器人, 恶魔形态) with confidence 0.33; code rank 1 (0.33)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (燃烧+, 血墙, 打击 -> 永世沙漏) with confidence 0.08; code rank 1 (0.08)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (防御, 打击 -> 永世沙漏) with confidence 0.24; code rank 2 (0.24)

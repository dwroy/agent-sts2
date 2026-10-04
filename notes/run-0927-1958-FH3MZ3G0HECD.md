## 复盘：run FH3MZ3G0HECD — 阵亡，最高第 30 层

- 决策 368 个；Jev 调用 44 次，Claude 0 次，DeepSeek 8 次；token 85,676 入 / 2,238 出，约 $0.0037；用时 18.4 分钟
- 决策者：code 275，jev-plan 41，jev 35，code-fallback 9，deepseek 8

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 code 4，jev-plan 3，jev 2
- 第 4 层 海洋混混: HP 61→48（-13），决策 code 5，jev-plan 4，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 54→45（-9），决策 code 7，jev 1，code-fallback 1
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 51→23（-28），决策 code 16，code-fallback 4，jev-plan 3，jev 1
- 第 13 层 气态炸弹/活雾: HP 84→73（-11），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 14 层 海洋混混/钙化邪教徒: HP 79→60（-19），决策 code 8，jev 3，jev-plan 3
- 第 17 层 瀑布巨兽: HP 86→80（-6），决策 code 7
- 第 17 层 瀑布巨兽: HP 80→56（-24），决策 code 16，jev-plan 2，jev 1
- 第 19 层 地道虫: HP 81→61（-20），决策 code 5，jev 1，jev-plan 1
- 第 21 层 外骨骼虫: HP 67→49（-18），决策 code 6，jev-plan 2，jev 1
- 第 21 层 外骨骼虫: HP 49→47（-2），决策 code 3
- 第 23 层 啃咬机: HP 53→53（-0），决策 jev 2，jev-plan 1
- 第 23 层 啃咬机: HP 53→22（-31），决策 code 8，jev-plan 6，jev 3
- 第 23 层 啃咬机: HP 22→22（-0），决策 code 1
- 第 25 层 虱虫之祖: HP 26→20（-6），决策 code 13，jev 3，jev-plan 2，code-fallback 1
- 第 25 层 虱虫之祖: HP 20→14（-6），决策 code 4，jev 1，jev-plan 1
- 第 28 层 棘刺蟾蜍: HP 45→27（-18），决策 code 16，jev 2，jev-plan 2
- 第 29 层 异螨: HP 33→10（-23），决策 jev 7，jev-plan 7，code 5，code-fallback 2
- 第 29 层 异螨: HP 10→10（-0），决策 code 1
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 16→4（-12），决策 code 9，jev 2，jev-plan 2
- 第 30 层 熟睡甲虫/盛碗虫（丝）: HP 4→4（-0），决策 code 4

### 死亡战斗：第 30 层 熟睡甲虫/盛碗虫（丝）
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): potion 速度药水, 防御, 旋风斩
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 旋风斩
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan / code: 59
- combat/plan-continue / code: 57
- combat/plan-continue / jev-plan: 41
- reward/claim / code: 33
- combat/plan-choice / jev: 30
- map/route / code: 29
- combat/lethal / code: 16
- reward/card / code: 13
- reward/proceed / code: 13
- combat/plan-choice / code-fallback: 8
- event/leave / code: 7
- selection/add / code: 7
- event/choose / deepseek: 6
- combat/plan-guarded / code: 5
- shop/buy / code: 5
- combat/least-loss / code: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- combat/plan-choice+potion / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-potion / code: 2
- selection/remove / code: 2
- shop/buy / deepseek: 2
- combat/end_turn / code: 1
- combat/plan-choice+potion / code-fallback: 1
- event/only / code: 1
- run/finalize / code: 1
- selection/upgrade / jev: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：8 次（推翻 Jev 3 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.31 → o0）：牌组无力量无AOE，随机稀有牌（恶魔形态/祭品/重锤）能直接补前期输出；骰子加诅咒（已有进阶诅咒）不值，羽翼之靴只影响路线不提升战力。
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o1 @0.07 → o1）：暗之门删1张打击：计划删光打击提升抽牌质量；随机升级两张期望低（可能命中防御/打击）。
- [deepseek] 第 5 层 TNone event/choose: 同意 Jev（o0 @0.11 → o0）：Take the free relic — no downside, and HP trades for gold are the run's most repeated mistake; 7 HP is worth more before
- [deepseek] 第 9 层 TNone event/choose: 同意 Jev（o0 @0.17 → o0）：Free +6 max HP suits the Waterfall Giant self-destruct line; 138 gold is better saved for shop card removal than 55/99 o
- [deepseek] 第 11 层 TNone shop/buy: 同意 Jev（buy_card0 @0.11 → buy_card0）：Spite is 0-cost double-hit every turn with Inferno/Offering self-damage; cheap, closes boss damage race, then buy remova
- [deepseek] 第 11 层 TNone shop/buy: 推翻 Jev（buy_card3 @0.19 → remove）：商店第一优先是删打击：牌组仍剩4张打击，提炼牌组最稳；坚毅随机消耗会误吃祭品/重锤等关键牌，52金不值。
- [deepseek] 第 15 层 TNone event/choose: 推翻 Jev（o0 @0.11 → o1）：Heal to full (86) gives boss buffer above eruption stacks; rest site next still lets us forge a key upgrade instead of e
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.28 → o0）：Energy is the scarcest resource; extra energy from turn 3 fuels Inferno/strength plays every fight, far better than Defe

### Jev 低置信度（<0.35）决策：14 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (祭品, 防御, 痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 防御) with confidence 0.32; code rank 1 (0.32)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.20; code rank 1 (0.20)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 海洋混混) with confidence 0.06; code rank 1 (0.06)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御, 挑衅 -> 瀑布巨兽, 巨像) with confidence 0.09; code rank 1 (0.09)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (头槌 -> 啃咬机) with confidence 0.29; code rank 1 (0.29)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (狱火, 防御, 旋风斩) with confidence 0.11; code rank 1 (0.11)
- 第 25 层 combat/plan-choice: Jev chose plan 1/4 (火焰屏障, 狱火, potion 易伤药水 -> 虱虫之祖) with confidence 0.33; code rank 1 (0.33)
- 第 25 层 combat/plan-choice: Jev chose plan 2/2 (祭品, 耸肩无视) with confidence 0.17; code rank 2; HP guard: plan 2 (祭品, 耸肩无视) loses 7 HP, more than 4 over the cheapest line, playing p (0.17)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 头槌 -> 虱虫之祖) with confidence 0.31; code rank 1 (0.31)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 虱虫之祖, 挑衅 -> 虱虫之祖) with confidence 0.03; code rank 1 (0.03)
- 第 29 层 combat/plan-choice: Jev chose plan 5/5 (怨恨 -> 异螨, 狱火+, 耸肩无视, 头槌 -> 异螨) with confidence 0.31; code rank 5; HP guard: plan 5 (怨恨 -> 异螨, 狱火+, 耸肩无视, 头槌 -> 异螨) loses 16 HP, mo (0.31)
- 第 29 层 combat/plan-choice: Jev chose plan 1/4 (毒素, 打击 -> 异螨, 耸肩无视, 打击 -> 异螨) with confidence 0.18; code rank 1 (0.18)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 1/1 (剑柄打击 -> 异螨) with confidence 0.23; code rank 1 (0.23)
- 第 30 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 盛碗虫（石）, 狱火, 祭品, 痛击 -> 盛碗虫（石）, 剑柄打击 -> 盛碗虫（石）) with confidence 0.26; code rank 1 (0.26)

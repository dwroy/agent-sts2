## 复盘：run NEVMW4HGUJ1U — 阵亡，最高第 23 层

- 决策 367 个；Jev 调用 44 次，Claude 0 次，DeepSeek 9 次；token 74,247 入 / 2,281 出，约 $0.0032；用时 20.1 分钟
- 决策者：code 278，jev 39，jev-plan 36，deepseek 9，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→60（-4），决策 code 7，jev 1，jev-plan 1
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 66→66（-0），决策 jev-plan 2，jev 1
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）: HP 66→63（-3），决策 code 7，jev-plan 2，jev 1
- 第 5 层 缩小甲虫: HP 69→62（-7），决策 code 6
- 第 5 层 缩小甲虫: HP 62→62（-0），决策 code 1
- 第 6 层 利齿之眼/雾菇: HP 68→68（-0），决策 code 2，jev 1，jev-plan 1，code-fallback 1
- 第 6 层 利齿之眼/雾菇: HP 68→59（-9），决策 jev 3，jev-plan 3，code 2
- 第 6 层 利齿之眼/雾菇: HP 59→54（-5），决策 code 4，jev-plan 2，jev 1
- 第 8 层 异蛙寄生虫: HP 80→64（-16），决策 code 7，jev 1，jev-plan 1
- 第 8 层 异蛙寄生虫/扭动虫: HP 64→64（-0），决策 code 2，jev 1
- 第 8 层 扭动虫: HP 64→33（-31），决策 code 18，jev 1，jev-plan 1
- 第 11 层 墨宝: HP 46→46（-0），决策 code 3
- 第 11 层 墨宝: HP 46→38（-8），决策 code 7，jev 3
- 第 13 层 蛇行扼杀者/闪光贾克斯果: HP 70→67（-3），决策 code 5，jev 2，jev-plan 1
- 第 13 层 蛇行扼杀者/闪光贾克斯果: HP 67→67（-0），决策 jev 3，jev-plan 2，code 2
- 第 13 层 蛇行扼杀者: HP 67→66（-1），决策 code 5，code-fallback 1
- 第 15 层 蛮兽: HP 66→64（-2），决策 code 7，jev-plan 2，jev 1
- 第 17 层 同族信徒/同族神官: HP 87→25（-62），决策 code 31，jev 6，jev-plan 5
- 第 17 层 同族神官: HP 25→18（-7），决策 code 7，jev 1，jev-plan 1
- 第 19 层 偷窃草蜢: HP 78→78（-0），决策 code 4
- 第 19 层 偷窃草蜢: HP 78→50（-28），决策 code 8，code-fallback 1
- 第 20 层 地道虫: HP 56→20（-36），决策 code 10，jev-plan 6，jev 3，code-fallback 1
- 第 20 层 地道虫: HP 20→20（-0），决策 code 6
- 第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 46→5（-41），决策 code 16，jev-plan 6，jev 5，code-fallback 1
- 第 23 层 熟睡甲虫: HP 5→5（-0），决策 code 2

### 死亡战斗：第 23 层 熟睡甲虫
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 火焰屏障
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan / code: 90
- combat/plan-continue / code: 54
- combat/plan-continue / jev-plan: 36
- combat/plan-choice / jev: 34
- reward/claim / code: 30
- map/route / code: 20
- combat/lethal / code: 15
- reward/proceed / code: 11
- selection/add / code: 9
- reward/card / code: 7
- shop/buy / code: 7
- combat/least-loss / code: 5
- combat/plan-choice / code-fallback: 5
- event/choose / deepseek: 4
- event/leave / code: 4
- combat/plan-guarded / code: 3
- rest/proceed / code: 3
- reward/card / deepseek: 3
- selection/exhaust / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- combat/end_turn / code: 2
- map/route / jev: 2
- rest/choose / code: 2
- selection/remove / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / jev: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/confirm / code: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 6 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.23 → o0）：Elite fights are the run's main risk and reward; extra draw and energy at every elite start is a premium combat relic, f
- [deepseek] 第 8 层 T9 reward/card: 同意 Jev（card1 @0.24 → card1）：HP 39/80 and only 2 block cards; Flame Barrier blocks 12 and its retaliation chips Kin followers on their multi-hit atta
- [deepseek] 第 13 层 T3 selection/add: 推翻 Jev（card3 @0.18 → card5）：火焰屏障: 12 block plus per-hit retaliation shines vs the Kin's multi-hit attacks, preserving HP; also the 4th block card th
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o0 @0.36 → o0）：笨拙是永久手牌污染（经验手册明令避免诅咒换随机遗物）；仅失6血，前方有休息点，52金可凑够删牌钱。
- [deepseek] 第 17 层 T15 reward/card: 推翻 Jev（card1 @0.20 → card2）：缺永久力量成长：主宰配合痛击/上勾拳/挑衅的易伤叠加力量；地狱狂徒随机目标、依赖打击且无法集火信徒。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.18 → o0）：永久遗物：每战首回合+4能量，助T1抢打能力/爆发（boss首回合无攻击正合适），优于会熄灭的蜡烛和加一张牌。
- [deepseek] 第 20 层 T7 reward/card: 推翻 Jev（card1 @0.37 → card2）：Headbutt: solid 1E damage plus recursion (Flame Barrier vs multi-hits, Bash for vuln) for the long Knowledge Demon fight
- [deepseek] 第 21 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.12 → buy_card2）：HP 30%, long Knowledge Demon fight: True Grit gives 7 block for 1E and thins the deck via exhaust. No affordable power, 
- [deepseek] 第 22 层 TNone event/choose: 推翻 Jev（o0 @0.17 → o1）：压扁 likely heavy crushing damage; deck needs burst vs 379-HP Knowledge Demon and lacks strength/AOE, so take the stronger

### Jev 低置信度（<0.35）决策：15 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.31; code rank 1 (0.31)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）, 头槌 -> 树叶史莱姆（小）) with confidence 0.24; code rank 1 (0.24)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 雾菇, 防御, 头槌 -> 雾菇) with confidence 0.30; code rank 1 (0.30)
- 第 8 层 combat/plan-choice: Jev chose plan 2/2 (potion 灰水) with confidence 0.21; code rank 2 (0.21)
- 第 11 层 combat/plan-choice+potion: Jev chose to drink 鲜血药水 (confidence 0.31) (0.31)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 墨宝, 痛击 -> 墨宝) with confidence 0.16; code rank 1 (0.16)
- 第 13 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 闪光贾克斯果, 火焰屏障) with confidence 0.27; code rank 1 (0.27)
- 第 13 层 combat/plan-choice: Jev chose plan 1/4 (火焰屏障, 耸肩无视) with confidence 0.25; code rank 1 (0.25)
- 第 13 层 combat/plan-choice: Jev chose plan 2/2 (头槌 -> 蛇行扼杀者, 无情猛攻 -> 蛇行扼杀者) with confidence 0.30; code rank 2 (0.30)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (挑衅 -> 蛮兽, 头槌 -> 蛮兽, 打击 -> 蛮兽) with confidence 0.12; code rank 1 (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 同族信徒, 防御, 飞剑回旋镖) with confidence 0.29; code rank 2; HP guard: plan 2 (打击 -> 同族信徒, 防御, 飞剑回旋镖) loses 9 HP, more than 6 over th (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (头槌 -> 同族信徒, 挑衅 -> 同族神官, 双重打击 -> 同族神官) with confidence 0.33; code rank 1; HP guard: plan 1 (头槌 -> 同族信徒, 挑衅 -> 同族神官, 双重打击 -> 同族神官) l (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (挑衅 -> 同族神官) with confidence 0.27; code rank 1 (0.27)
- 第 23 层 combat/plan-choice: Jev chose plan 2/4 (防御, 主宰 -> 盛碗虫（丝）, 预备打击 -> 盛碗虫（丝）) with confidence 0.18; code rank 2 (0.18)
- 第 23 层 combat/plan-choice: Jev chose plan 2/3 (potion 速度药水, 挑衅 -> 盛碗虫（丝）, 预备打击 -> 盛碗虫（丝）, 飞剑回旋镖) with confidence 0.27; code rank 2 (0.27)

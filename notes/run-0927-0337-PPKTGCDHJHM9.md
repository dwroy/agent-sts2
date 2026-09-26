## 复盘：run PPKTGCDHJHM9 — 阵亡，最高第 17 层

- 决策 206 个；Jev 调用 26 次，Claude 0 次，DeepSeek 4 次；token 39,429 入 / 1,282 出，约 $0.0017；用时 11.2 分钟
- 决策者：code 153，jev-plan 23，jev 22，deepseek 4，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→56（-8），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 缩小甲虫: HP 62→56（-6），决策 code 11，jev 1，jev-plan 1，code-fallback 1
- 第 6 层 毛绒伏地虫: HP 80→79（-1），决策 code 10，jev-plan 2，jev 1，code-fallback 1
- 第 8 层 树枝史莱姆（小）/蛇行扼杀者: HP 80→74（-6），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 9 层 劫掠者刺客/劫掠者暴徒/劫掠者追踪手: HP 77→60（-17），决策 code 3，jev 2，jev-plan 1
- 第 11 层 树枝史莱姆（中）/飞蝇菌子: HP 66→47（-19），决策 code 8，jev-plan 4，jev 2
- 第 12 层 小啃兽: HP 53→24（-29），决策 code 4，jev 3，jev-plan 3
- 第 14 层 多尼斯异鸟: HP 54→36（-18），决策 code 8，jev-plan 2，jev 1
- 第 17 层 同族信徒/同族神官: HP 66→52（-14），决策 jev-plan 3，code 3，jev 1
- 第 17 层 同族信徒/同族神官: HP 52→26（-26），决策 code 13，jev 1，jev-plan 1
- 第 17 层 同族神官: HP 26→6（-20），决策 code 15，jev 4，jev-plan 2

### 死亡战斗：第 17 层 同族神官
- T9 [jev] combat/plan-choice: Jev chose plan 1/4 (预备打击+ -> 同族神官, 耸肩无视, 打击 -> 同族神官) with confidence 0.19; code rank 1 conf 0.19
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T9 [jev] combat/plan-choice: Jev chose plan 2/3 (防御) with confidence 0.21; code rank 2 conf 0.21
- T9 [code] combat/plan: code plan (only distinct line): end turn; hp -1, dmg 0
- T10 [code] combat/plan-guarded: code plan 痛击+ -> 同族神官, 旋风斩+ loses 13 HP, over the HP guard bound; playing 防御, 旋风斩+ instead (hp -10, dmg 16)
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩+
- T10 [code] combat/plan: code plan (only distinct line): end turn; hp -10, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 防御, 打击+ -> 同族神官, potion 迅捷药水, 头槌 -> 同族神官
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 同族神官
- T11 [code] combat/plan-continue: continuing the code-chosen plan: potion 迅捷药水
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 头槌 -> 同族神官
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): end turn

### 各类决策由谁做
- combat/plan / code: 46
- combat/plan-continue / code: 28
- combat/plan-continue / jev-plan: 23
- reward/claim / code: 20
- combat/plan-choice / jev: 18
- map/route / code: 11
- reward/proceed / code: 8
- combat/lethal / code: 7
- reward/card / code: 7
- combat/plan-choice / code-fallback: 4
- combat/plan-guarded / code: 4
- event/leave / code: 4
- map/route / jev: 4
- combat/least-loss / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- event/choose / deepseek: 2
- selection/add / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- event/only / code: 1
- map/route / deepseek: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 2 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.10 → o0）：免费升级每3场战斗一次，无副作用；赢局升级数高，诅咒死牌拖手牌，路线灵活性不如稳定成长。
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o1 @0.10 → o1）：Max HP loss is permanent; 钓鱼竿 already gives random upgrades. Heal to full keeps the 1-2 elite route open at A7.
- [deepseek] 第 5 层 TNone map/route: 同意 Jev（n1 @0.27 → n1）：Full HP: take the monster fight for a card reward and gold, then RestSite to upgrade for the boss; Unknown->Elite path r
- [deepseek] 第 9 层 T3 reward/card: 推翻 Jev（skip @0.15 → card0）：劫掠 gives the deck's missing draw plus 6 damage, cycling into Whirlwinds/skills for the Kin AoE fight; stronger tempo tha

### Jev 低置信度（<0.35）决策：7 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 缩小甲虫) with confidence 0.23; code rank 1 (0.23)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 劫掠者暴徒, 旋风斩) with confidence 0.31; code rank 2 (0.31)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (防御, 狱火, 防御) with confidence 0.12; code rank 1 (0.12)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (旋风斩) with confidence 0.28; code rank 1 (0.28)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 小啃兽, 预备打击 -> 小啃兽) with confidence 0.14; code rank 1 (0.14)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (预备打击+ -> 同族神官, 耸肩无视, 打击 -> 同族神官) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (防御) with confidence 0.21; code rank 2 (0.21)

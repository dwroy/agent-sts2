## 复盘：run 7TQFLQBKRE4S — 阵亡，最高第 39 层

- 决策 633 个；Jev 调用 144 次，Claude 0 次，大脑 36 次（codex 36）；token 963,176 入 / 8,495 出，约 $0.0408（Jev）；大脑 token 5,717,545 入（缓存命中 3,554,304，62%）/ 11,614 出；用时 43.6 分钟
- 决策者：code 261，jev-plan 178，jev 144，codex 50

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→63（-1，战后回复 +6），决策 jev-plan 4，code 4，jev 2
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 69→63（-6，战后回复 +6），决策 jev 8，jev-plan 3，code 2
- 第 4 层 缩小甲虫: HP 69→64（-5，战后回复 +6），决策 jev 5，jev-plan 2，code 2
- 第 5 层 树叶史莱姆（中）/飞蝇菌子: HP 70→56（-14，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 9 层 多尼斯异鸟: HP 87→73（-14，战后回复 +6），决策 jev-plan 8，jev 6，code 2
- 第 12 层 异蛙寄生虫/扭动虫: HP 79→59（-20，战后回复 +6），决策 jev 12，jev-plan 5，code 1
- 第 14 层 劫掠者刺客/劫掠者弩手/劫掠者追踪手: HP 57→55（-2，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 15 层 藤蔓蹒跚者: HP 61→59（-2，战后回复 +6），决策 jev-plan 4，jev 1
- 第 17 层 墨影幻灵: HP 87→73（-14，战后回复 +6），决策 jev-plan 11，code 11，jev 5
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 85→78（-7，战后回复 +6），决策 jev-plan 7，code 4，jev 3
- 第 21 层 地道虫: HP 84→84（-0，战后回复 +3），决策 jev-plan 5，jev 3
- 第 22 层 棘刺蟾蜍: HP 87→58（-29，战后回复 +6），决策 jev 6，jev-plan 6，code 3
- 第 23 层 啃咬机: HP 64→53（-11，战后回复 +6），决策 jev-plan 7，jev 5，code 5
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 85→73（-12，战后回复 +6），决策 jev-plan 9，jev 8，code 2
- 第 30 层 外骨骼虫: HP 79→75（-4，战后回复 +6），决策 jev-plan 9，jev 6，code 5
- 第 33 层 火箭/碾碎爪: HP 81→4（-77，战后回复 +6），决策 jev-plan 43，code 32，jev 24
- 第 35 层 咬人卷轴: HP 71→64（-7，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 36 层 虔诚雕刻师: HP 70→64（-6，战后回复 +6），决策 jev 7，jev-plan 7，code 1
- 第 37 层 噪音机器人/戳刺机器人/电击机器人/组装师: HP 70→32（-38，战后回复 +6），决策 code 11，jev 6，jev-plan 4
- 第 38 层 巨斧机器人: HP 38→12（-26，战后回复 +6），决策 code 12，jev 8，jev-plan 7
- 第 39 层 猫头鹰法官: HP 18→0（-18），决策 jev-plan 28，code 21，jev 17

### 死亡战斗：第 39 层 猫头鹰法官
- T2 [code] selection/exhaust: code: 打击 scores 70 vs 旋风斩+ 7
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [jev] combat/plan-choice: Jev chose plan 1/2 (与我一战！+ -> 猫头鹰法官, 狱火) with confidence 0.66; code rank 1 conf 0.66
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 被遗忘的仪式+, 火焰屏障, 双重打击 -> 猫头鹰法官, 双重打击（音乐盒复制） -> 猫头鹰法官, 旋风斩
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 猫头鹰法官
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击（音乐盒复制） -> 猫头鹰法官
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 178
- combat/plan-choice / jev: 80
- combat/plan-choice+potion / jev: 59
- combat/plan / code: 52
- reward/claim / code: 51
- combat/plan-continue / code: 33
- map/route-follow / code: 33
- combat/lethal / code: 21
- reward/card / codex: 20
- reward/proceed / code: 20
- combat/least-loss / code: 9
- shop/buy / codex: 8
- combat/end_turn / code: 7
- event/leave / code: 6
- rest/plan / codex: 6
- rest/proceed / code: 6
- selection/exhaust / code: 5
- event/choose / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion-lethal / jev: 3
- selection/upgrade / codex: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 25 层 combat/plan-choice: Jev chose plan 3/10 (狂怒, 防御) with confidence 0.24; code rank 3 (0.24)
- 第 25 层 combat/plan-choice: Jev chose plan 2/5 (主宰 -> 幼虫 #1) with confidence 0.27; code rank 2 (0.27)
- 第 38 层 combat/plan-choice: Jev chose plan 3/3 (end turn); plan 1 (御血术 -> 巨斧机器人) is as good or better on every axis, playing it with confidence 0.23; code rank 1 (0.23)
- 第 38 层 combat/plan-choice: Jev chose plan 2/2 (potion 力量药水) with confidence 0.34; code rank 2 (0.34)
- 第 39 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 猫头鹰法官, 防御, 烙印+, 坚毅) with confidence 0.24; code rank 1 (0.24)
- 第 39 层 combat/plan-choice: Jev chose plan 3/10 (战栗 -> 猫头鹰法官, 狂怒, 重锤+ -> 猫头鹰法官) with confidence 0.34; code rank 3 (0.34)
- 第 39 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 猫头鹰法官, 防御, 烙印+, 坚毅) with confidence 0.25; code rank 1 (0.25)

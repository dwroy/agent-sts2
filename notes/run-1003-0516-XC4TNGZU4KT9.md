## 复盘：run XC4TNGZU4KT9 — 阵亡，最高第 11 层

- 决策 168 个；Jev 调用 25 次，Claude 0 次，DeepSeek 10 次；token 146,619 入 / 1,511 出，约 $0.0062（Jev）；DeepSeek token 1,380,904 入（缓存命中 1,193,472，86%）/ 70,797 出；用时 10.3 分钟
- 决策者：code 83，jev-plan 48，jev 25，deepseek 12

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→51（-13，战后回复 +6），决策 jev-plan 8，code 6，jev 4
- 第 4 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 57→56（-1，战后回复 +6），决策 jev-plan 6，code 6，jev 2
- 第 5 层 毛绒伏地虫: HP 62→48（-14，战后回复 +6），决策 jev-plan 5，code 5，jev 2
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 54→21（-33，战后回复 +6），决策 code 9，jev-plan 8，jev 4
- 第 8 层 旧日雕像: HP 51→30（-21，战后回复 +6），决策 jev-plan 9，jev 4，code 3
- 第 9 层 毛绒伏地虫/缩小甲虫: HP 36→5（-31，战后回复 +6），决策 jev-plan 10，jev 7，code 7
- 第 11 层 树叶史莱姆（中）/飞蝇菌子: HP 11→0（-11），决策 code 8，jev 2，jev-plan 2

### 死亡战斗：第 11 层 树叶史莱姆（中）/飞蝇菌子
- T1 [jev] combat/plan-choice+potion: Jev chose plan 6/7 (防御, 与我一战！ -> 飞蝇菌子, 愤怒 -> 飞蝇菌子) with confidence 0.84; code rank 6 conf 0.84
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 与我一战！ -> 飞蝇菌子
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 飞蝇菌子
- T1 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T2 [jev] combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.95) conf 0.95
- T2 [code] selection/take into my hand: code: 祭品 scores 11 vs 倾泻 3
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 被遗忘的仪式, 防御, 预备打击 -> 飞蝇菌子, 打击 -> 飞蝇菌子, 打击 -> 飞蝇菌子
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 飞蝇菌子
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 飞蝇菌子
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 飞蝇菌子
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 48
- combat/plan / code: 23
- combat/plan-choice / jev: 22
- reward/claim / code: 16
- combat/plan-continue / code: 12
- map/route-follow / code: 9
- reward/card / deepseek: 6
- reward/proceed / code: 6
- combat/lethal / code: 4
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion / jev: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- event/choose / deepseek: 1
- event/leave / code: 1
- map/route-plan / deepseek: 1
- rest/plan / deepseek: 1
- rest/proceed / code: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：0 个

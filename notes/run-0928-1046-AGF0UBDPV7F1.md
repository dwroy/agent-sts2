## 复盘：run AGF0UBDPV7F1 — 阵亡，最高第 17 层

- 决策 206 个；Jev 调用 61 次，Claude 0 次，DeepSeek 0 次；token 146,486 入 / 2,626 出，约 $0.0063；用时 10.9 分钟
- 决策者：code 101，jev 61，jev-plan 44

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→64（-0），决策 jev 2，jev-plan 2
- 第 2 层 小啃兽: HP 64→54（-10），决策 code 4，jev 1，jev-plan 1
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 85→79（-6），决策 code 5，jev 4，jev-plan 2
- 第 7 层 毛绒伏地虫: HP 85→71（-14），决策 code 6，jev-plan 3，jev 2
- 第 9 层 藤蔓蹒跚者: HP 77→65（-12），决策 jev 3，jev-plan 3，code 1
- 第 9 层 藤蔓蹒跚者: HP 65→46（-19），决策 code 4，jev 1
- 第 13 层 树枝史莱姆（中）/蛇行扼杀者: HP 90→88（-2），决策 jev-plan 4，code 3，jev 2
- 第 14 层 旧日雕像: HP 89→88（-1），决策 jev-plan 4，jev 2，code 1
- 第 14 层 旧日雕像: HP 88→48（-40），决策 jev-plan 5，code 3，jev 3
- 第 14 层 旧日雕像: HP 48→48（-0），决策 code 1
- 第 15 层 蛮兽: HP 32→32（-0），决策 jev-plan 6，jev 5
- 第 15 层 蛮兽: HP 32→24（-8），决策 jev 2，jev-plan 2
- 第 15 层 蛮兽: HP 24→18（-6），决策 code 3
- 第 17 层 墨影幻灵: HP 66→20（-46），决策 jev-plan 12，code 9，jev 6
- 第 17 层 墨影幻灵: HP 20→1（-19），决策 code 5

### 死亡战斗：第 17 层 墨影幻灵
- T7 [code] combat/plan: code plan (only line): end turn; hp -19, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 打击 -> 墨影幻灵, 打击 -> 墨影幻灵, 挑衅 -> 墨影幻灵
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 墨影幻灵
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅 -> 墨影幻灵
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 44
- combat/plan-choice / jev: 33
- combat/plan / code: 30
- reward/claim / code: 20
- map/route / code: 8
- map/route / jev: 8
- reward/card / jev: 8
- reward/proceed / code: 7
- combat/plan-continue / code: 6
- combat/lethal / code: 5
- event/choose / jev: 5
- event/leave / code: 5
- selection/add / code: 5
- combat/least-loss / code: 2
- rest/choose / jev: 2
- rest/proceed / code: 2
- selection/take into my hand / code: 2
- shop/buy / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- combat/potion-now / code: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/remove / jev: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (potion 能力药水, card from 能力药水) with confidence 0.08; code reference rank 2 (0.08)
- 第 4 层 event/choose: Jev chose 分享知识 with confidence 0.14; code rank 2/2 (0.14)
- 第 6 层 reward/card: Jev chose 突破 (Attack, 1E) with confidence 0.32; code rank 3/4 (0.32)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.24; code reference rank 1 (0.24)
- 第 8 层 event/choose: Jev chose 拿起石剑 with confidence 0.24; code rank 2/2 (0.24)
- 第 11 层 shop/buy: Jev chose pay 100g to remove a card with confidence 0.34; code rank 1/7 (0.34)
- 第 11 层 shop/buy: Jev chose buy 火焰药水 (49g) with confidence 0.31; code rank 1/4 (0.31)
- 第 13 层 combat/plan-choice: Jev chose plan 3/4 (剑柄打击 -> 树枝史莱姆（中）, 狱火, 突破, potion 火焰药水 -> 蛇行扼杀者) with confidence 0.27; code reference rank 3 (0.27)
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (防御, 挑衅 -> 蛇行扼杀者, 打击 -> 蛇行扼杀者) with confidence 0.19; code reference rank 1 (0.19)

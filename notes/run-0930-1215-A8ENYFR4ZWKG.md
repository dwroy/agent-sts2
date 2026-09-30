## 复盘：run A8ENYFR4ZWKG — 胜利，最高第 48 层

- 决策 602 个；Jev 调用 86 次，Claude 0 次，DeepSeek 45 次；token 414,877 入 / 4,206 出，约 $0.0176（Jev）；DeepSeek token 6,030,782 入（缓存命中 5,533,440，92%）/ 282,575 出；用时 46.6 分钟
- 决策者：code 354，jev-plan 101，jev 86，deepseek 61

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→56（-8，战后回复 +6），决策 jev-plan 6，jev 5，code 5
- 第 4 层 缩小甲虫: HP 54→54（-0，战后回复 +6），决策 code 5，jev 1，jev-plan 1
- 第 5 层 毛绒伏地虫: HP 60→60（-0，战后回复 +6），决策 code 5，jev 2
- 第 6 层 蛮兽: HP 66→58（-8，战后回复 +6），决策 code 6，jev-plan 3，jev 2
- 第 11 层 墨宝: HP 64→39（-25，战后回复 +6），决策 code 6，jev-plan 4，jev 3
- 第 13 层 小啃兽: HP 45→36（-9，战后回复 +6），决策 code 8，jev 2，jev-plan 2
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 42→28（-14，战后回复 +6），决策 code 10，jev-plan 6，jev 4
- 第 17 层 仪式兽: HP 58→31（-27，战后回复 +6），决策 code 12，jev-plan 7，jev 5
- 第 19 层 外骨骼虫: HP 71→60（-11，战后回复 +6），决策 code 12，jev 3，jev-plan 3
- 第 20 层 地道虫: HP 66→55（-11，战后回复 +6），决策 code 12，jev 2，jev-plan 2
- 第 22 层 寄生惧魔/胧光怪: HP 61→56（-5，战后回复 +6），决策 jev-plan 8，jev 6，code 5
- 第 24 层 猎人杀手: HP 62→52（-10，战后回复 +6），决策 code 4，jev 3，jev-plan 3
- 第 29 层 虱虫之祖: HP 80→66（-14，战后回复 +6），决策 code 13，jev 3，jev-plan 1
- 第 30 层 棘刺蟾蜍: HP 72→43（-29，战后回复 +6），决策 jev 4，jev-plan 4，code 2
- 第 33 层 知识恶魔: HP 68→13（-55，战后回复 +6），决策 code 28，jev-plan 7，jev 6
- 第 35 层 活体盾/高塔炮手: HP 67→53（-14，战后回复 +6），决策 jev-plan 5，jev 4，code 4
- 第 38 层 咬人卷轴: HP 79→77（-2，战后回复 +6），决策 jev-plan 6，jev 5，code 1
- 第 39 层 猫头鹰法官: HP 83→57（-26，战后回复 +6），决策 code 11，jev-plan 5，jev 3
- 第 42 层 青蛙骑士: HP 93→69（-24，战后回复 +6），决策 jev-plan 7，jev 5，code 5
- 第 45 层 噪音机器人/电击机器人/组装师: HP 100→99（-1，战后回复 +1），决策 code 12，jev-plan 5，jev 2
- 第 46 层 拳击构装体/方柱构装体: HP 100→87（-13，战后回复 +6），决策 code 7，jev-plan 6，jev 5
- 第 48 层 实验体 #C29: HP 93→1（-92，战后回复 +6），决策 code 18，jev 11，jev-plan 10

### 各类决策由谁做
- combat/plan-continue / jev-plan: 101
- combat/plan / code: 88
- combat/plan-choice / jev: 77
- combat/plan-continue / code: 57
- reward/claim / code: 53
- map/route-follow / code: 42
- combat/lethal / code: 25
- reward/proceed / code: 22
- reward/card / deepseek: 21
- event/leave / code: 10
- event/choose / deepseek: 7
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- selection/add / code: 7
- shop/buy / deepseek: 7
- combat/plan-choice+potion / jev: 5
- shop/leave / code: 5
- shop/open / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/curse / code: 4
- selection/upgrade / deepseek: 4
- shop/plan / deepseek: 4
- event/only / code: 3
- event/plan / deepseek: 3
- selection/add / jev: 3
- selection/discard / code: 3
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/phase-setup / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/discard / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.18; code rank 2 (0.18)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 仪式兽, 头槌 -> 仪式兽, 突破) with confidence 0.32; code rank 1 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (祭品, 上勾拳+ -> 知识恶魔, 突破) with confidence 0.10; code rank 1 (0.10)
- 第 35 层 combat/plan-choice: Jev chose plan 2/2 (potion 消亡粉末 -> 活体盾) with confidence 0.11; code rank 2 (0.11)
- 第 45 层 combat/plan-choice: Jev chose plan 1/3 (撕裂+, 焚烧, 岩石铠甲+, 扯碎 -> 组装师) with confidence 0.19; code rank 1 (0.19)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (契约终结, 拆卸 -> 实验体 #C29) with confidence 0.27; code rank 1 (0.27)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (与我一战！ -> 实验体 #C29, 彼岸咆哮) with confidence 0.20; code rank 2 [calc mismatch: solver says ending now does not kill, mod says lethal] (0.20)

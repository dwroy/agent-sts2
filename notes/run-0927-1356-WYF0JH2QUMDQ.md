## 复盘：run WYF0JH2QUMDQ — 阵亡，最高第 33 层

- 决策 340 个；Jev 调用 0 次，Claude 0 次，DeepSeek 0 次；token 0 入 / 0 出，约 $0.0000；用时 6.9 分钟
- 决策者：code 282，code-fallback 58

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2），决策 code 12，code-fallback 2
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 60→60（-0），决策 code 12
- 第 7 层 毛绒伏地虫: HP 66→66（-0），决策 code 8，code-fallback 1
- 第 11 层 异蛙寄生虫/扭动虫: HP 72→54（-18），决策 code 16，code-fallback 3
- 第 12 层 墨宝: HP 60→54（-6），决策 code 4，code-fallback 1
- 第 14 层 树枝史莱姆（中）/飞蝇菌子: HP 59→53（-6），决策 code 10，code-fallback 1
- 第 15 层 利齿之眼/雾菇: HP 59→58（-1），决策 code 6，code-fallback 1
- 第 17 层 同族信徒/同族神官: HP 80→54（-26），决策 code 7，code-fallback 4
- 第 17 层 同族信徒/同族神官: HP 54→16（-38），决策 code-fallback 7，code 7
- 第 19 层 外骨骼虫: HP 68→67（-1），决策 code 10，code-fallback 1
- 第 23 层 地道虫: HP 73→60（-13），决策 code 7
- 第 23 层 地道虫: HP 60→60（-0），决策 code 4
- 第 24 层 异螨: HP 66→33（-33），决策 code 13，code-fallback 1
- 第 30 层 感染棱柱: HP 63→5（-58），决策 code 26，code-fallback 5
- 第 33 层 知识恶魔: HP 34→34（-0），决策 code 5，code-fallback 1
- 第 33 层 知识恶魔: HP 34→16（-18），决策 code-fallback 5，code 3
- 第 33 层 知识恶魔: HP 16→16（-0），决策 code 1

### 死亡战斗：第 33 层 知识恶魔
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / code: 77
- combat/plan / code: 55
- reward/claim / code: 30
- map/route / code: 26
- combat/plan-choice / code-fallback: 16
- combat/lethal / code: 15
- combat/plan-choice+potion / code-fallback: 14
- reward/proceed / code: 12
- event/choose / code-fallback: 9
- event/leave / code: 9
- reward/card / code: 9
- shop/buy / code: 7
- map/route / code-fallback: 6
- rest/choose / code: 4
- rest/proceed / code: 4
- selection/add / code: 4
- selection/upgrade / code: 4
- shop/buy / code-fallback: 4
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/play / code-fallback: 3
- reward/card / code-fallback: 3
- selection/remove / code: 3
- combat/least-loss / code: 2
- combat/end_turn / code: 1
- combat/plan-guarded / code: 1
- run/finalize / code: 1
- selection/add / code-fallback: 1
- selection/curse / code: 1
- selection/enchant / code-fallback: 1
- selection/upgrade / code-fallback: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：0 个

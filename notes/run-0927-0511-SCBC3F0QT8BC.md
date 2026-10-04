## 复盘：run SCBC3F0QT8BC — 阵亡，最高第 21 层

- 决策 294 个；Jev 调用 70 次，Claude 0 次，DeepSeek 10 次；token 115,771 入 / 3,280 出，约 $0.0050；用时 16.9 分钟
- 决策者：code 179，jev 52，jev-plan 35，code-fallback 18，deepseek 10

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→50（-14），决策 code 8，jev 4，jev-plan 4
- 第 4 层 缩小甲虫: HP 56→46（-10），决策 code 6，jev 3，jev-plan 2，code-fallback 1
- 第 7 层 毛绒伏地虫: HP 52→42（-10），决策 code 7，jev 2，jev-plan 2
- 第 9 层 小啃兽: HP 48→27（-21），决策 code 9，jev 2，jev-plan 2，code-fallback 1
- 第 11 层 墨宝: HP 33→20（-13），决策 code 5，code-fallback 1
- 第 13 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 50→40（-10），决策 code 8，jev 2，jev-plan 2
- 第 14 层 藤蔓蹒跚者: HP 46→33（-13），决策 jev-plan 5，code 5，jev 4
- 第 17 层 墨影幻灵: HP 80→59（-21），决策 jev 17，code-fallback 13，jev-plan 9，code 5
- 第 17 层 墨影幻灵: HP 59→14（-45），决策 code 13
- 第 19 层 偷窃草蜢: HP 68→45（-23），决策 code 18，jev 3，code-fallback 2，jev-plan 1
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 51→19（-32），决策 code 8，jev 7，jev-plan 5
- 第 21 层 棘刺蟾蜍: HP 25→2（-23），决策 code 10，jev 3，jev-plan 3

### 死亡战斗：第 21 层 棘刺蟾蜍
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (防御, 岩石铠甲) with confidence 0.24; code rank 1 conf 0.24
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 岩石铠甲
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.21; code rank 1 conf 0.21
- T3 [jev] combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 棘刺蟾蜍, 熔融之拳 -> 棘刺蟾蜍) with confidence 0.17; code rank 1 conf 0.17
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 棘刺蟾蜍
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 棘刺蟾蜍
- T3 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal]
- T4 [code] combat/plan: code plan (only distinct line): 打击 -> 棘刺蟾蜍, 打击 -> 棘刺蟾蜍; hp -0, dmg 18
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 棘刺蟾蜍
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): 坚定不移
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-20): end turn

### 各类决策由谁做
- combat/plan / code: 54
- combat/plan-continue / jev-plan: 35
- combat/plan-choice / jev: 33
- combat/plan-continue / code: 33
- reward/claim / code: 22
- map/route / code: 17
- combat/plan-choice+potion / jev: 14
- combat/plan-choice+potion / code-fallback: 13
- combat/lethal / code: 10
- reward/proceed / code: 10
- reward/card / code: 8
- event/leave / code: 6
- combat/plan-choice / code-fallback: 5
- combat/end_turn / code: 3
- event/choose / deepseek: 3
- map/route / jev: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- rest/choose / code: 2
- reward/card / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/only / code: 1
- rest/choose / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / jev: 1
- selection/upgrade / code: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/buy / deepseek: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：10 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.35 → o2）：三层稀有牌选择是A7下稀有机会，早期拿到恶魔形态/核心稀有牌可定胜负；受伤日后可100金删掉，风险可控。
- [deepseek] 第 1 层 TNone selection/choose: 推翻 Jev（card0 @0.24 → card1）：祭品是S级核心：0费得2能量抽3张，启动与过牌极强，早拿早滚雪球；坚定不移需格挡体系，原始力量不稳定。
- [deepseek] 第 3 层 TNone shop/buy: 同意 Jev（buy_card1 @0.34 → buy_card1）：Cheap A-tier attack with draw; deck needs more damage before elites, and removal can wait for a later shop.
- [deepseek] 第 4 层 T4 reward/card: 同意 Jev（card1 @0.01 → card1）：Cheap attack plus draw-until-skill cycles well in an attack-heavy deck, helping find Offering/Whirlwind/力量牌; deck can ab
- [deepseek] 第 5 层 TNone event/choose: 推翻 Jev（o2 @0.09 → o0）：攻击牌每场都打出，锋利+2伤害直接补本局最大缺口（无力量来源、boss 173血）；技能/能力附魔收益小且能力牌很少打。
- [deepseek] 第 5 层 TNone selection/enchant: 推翻 Jev（card5 @0.36 → card6）：锋利+2每段伤害对旋风斩最超值：多段AOE破墨影幻灵9层滑溜并随能量放大，且是本局长留的核心牌；打击将被删。
- [deepseek] 第 8 层 TNone selection/upgrade: 推翻 Jev（card11 @0.30 → card9）：痛击是唯一易伤来源，升级后10伤3层易伤覆盖两个输出回合，放大旋风斩等攻击，对墨影幻灵收益最稳；祭品耗血、卡组更缺血量。
- [deepseek] 第 13 层 T4 reward/card: 推翻 Jev（card0 @0.15 → card2）：Vantom战漫长且牌组格挡薄；1费每回合稳定4格挡，积累约40点，比无力量支撑的第二张旋风斩更能保命。
- [deepseek] 第 16 层 TNone rest/choose: 推翻 Jev（o0 @0.03 → o1）：满血无伤，休息浪费；升级核心牌（如剑柄打击/旋风斩）提升对墨影幻灵的输出与破滑溜能力。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.39 → o0）：Permanent +4 energy on turn 1 with no drawback: fuels Whirlwind burst and the Insatiable sandpit clock; o1's ash curse a

### Jev 低置信度（<0.35）决策：26 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.26; code rank 1 (0.26)
- 第 4 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 缩小甲虫, 防御) with confidence 0.07; code rank 1 (0.07)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 毛绒伏地虫) with confidence 0.24; code rank 1 (0.24)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 祭品, 打击 -> 毛绒伏地虫) with confidence 0.13; code rank 1 (0.13)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (祭品, 防御, 旋风斩) with confidence 0.26; code rank 1 (0.26)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (痛击+ -> 藤蔓蹒跚者, 打击 -> 藤蔓蹒跚者, 祭品, 打击 -> 藤蔓蹒跚者) with confidence 0.12; code rank 1 (0.12)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (防御, 熔融之拳 -> 藤蔓蹒跚者) with confidence 0.30; code rank 1 (0.30)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (跃跃欲试) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (坚定不移, 岩石铠甲, potion 异鱼之油) with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (祭品+, 打击 -> 墨影幻灵) with confidence 0.16; code rank 2 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (跃跃欲试) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (防御, 打击 -> 墨影幻灵, 打击 -> 墨影幻灵) with confidence 0.14; code rank 2 (0.14)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 3/3 (跃跃欲试) with confidence 0.28; code rank 3 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 墨影幻灵, 打击 -> 墨影幻灵, 剑柄打击 -> 墨影幻灵) with confidence 0.16; code rank 1 (0.16)

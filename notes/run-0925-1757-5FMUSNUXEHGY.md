## 复盘：run 5FMUSNUXEHGY — 阵亡，最高第 17 层

- 决策 200 个；Jev 调用 15 次，Claude 0 次，DeepSeek 18 次；token 43,073 入 / 1,421 出，约 $0.0019；用时 14.0 分钟
- 决策者：code 144，deepseek 18，jev-plan 14，jev 13，deepseek-plan 9，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→57（-7），决策 code 7，code-fallback 1
- 第 3 层 淤泥旋螺: HP 61→54（-7），决策 jev-plan 3，code 3，jev 2
- 第 5 层 海洋混混: HP 60→59（-1），决策 code 8，jev-plan 3，jev 2
- 第 8 层 骇鳗: HP 57→57（-0），决策 deepseek 1
- 第 8 层 骇鳗: HP 57→22（-35），决策 code 13，jev-plan 3，jev 2，deepseek-plan 2，deepseek 1
- 第 12 层 化石追踪者: HP 52→43（-9），决策 code 3，code-fallback 1
- 第 12 层 化石追踪者: HP 43→43（-0），决策 code 1
- 第 14 层 花园幽灵鳗: HP 73→55（-18），决策 code 7，deepseek 3，deepseek-plan 3
- 第 15 层 海洋混混/钙化邪教徒: HP 61→54（-7），决策 jev-plan 3，jev 2，code 2
- 第 15 层 海洋混混: HP 54→54（-0），决策 code 2
- 第 17 层 乐加维林族母: HP 86→86（-0），决策 deepseek 1
- 第 17 层 乐加维林族母: HP 86→86（-0），决策 code 7，deepseek 2，deepseek-plan 1
- 第 17 层 乐加维林族母: HP 86→49（-37），决策 code 2，deepseek 2，deepseek-plan 1
- 第 17 层 乐加维林族母: HP 49→3（-46），决策 code 16，deepseek 2，jev-plan 2，deepseek-plan 2，jev 1

### 死亡战斗：第 17 层 乐加维林族母
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T9 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T10 [code] combat/plan: code plan (only distinct line): 上勾拳 -> 乐加维林族母, 剑柄打击 -> 乐加维林族母; hp -10, dmg 32
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 乐加维林族母
- T10 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T11 [code] combat/plan: code plan (+11.5 over next): 上勾拳 -> 乐加维林族母, 打击 -> 乐加维林族母; hp -0, dmg 16
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 36): 剑柄打击 -> 乐加维林族母, 突破+, 突
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 上勾拳 -> 乐加维林族母
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan / code: 39
- reward/claim / code: 22
- combat/plan-continue / code: 20
- combat/plan-continue / jev-plan: 14
- map/route / code: 13
- combat/lethal / code: 9
- combat/plan-choice / jev: 9
- combat/plan-continue / deepseek-plan: 9
- reward/card / code: 9
- combat/plan-choice / deepseek: 8
- reward/proceed / code: 7
- combat/plan-choice+potion / deepseek: 4
- combat/least-loss / code: 3
- event/leave / code: 3
- map/route / jev: 3
- rest/proceed / code: 3
- selection/add / code: 3
- shop/buy / code: 3
- combat/plan-choice / code-fallback: 2
- event/choose / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- bundle/confirm / code: 1
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/choose / jev: 1
- selection/remove / code: 1
- selection/take into my hand / deepseek: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：18 次（推翻 Jev 10 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.35 → o0）：Deck lacks damage/AOE and strength for the 222-HP boss; a card pack adds real power while upgrading a Strike/Defend is m
- [deepseek] 第 6 层 TNone event/choose: 同意 Jev（o0 @0.17 → o0）：HP 81% is safe; relic beats 100g (A3 cuts gold, shop not guaranteed en route), and a random card dilutes this 15-card de
- [deepseek] 第 8 层 T1 combat/plan-choice: 推翻 Jev（plan1 @0.37 → plan2）：Saves 5 HP, keeps the same strength setup, and 武装 may upgrade a key card; elite fights are the right place to spend poti
- [deepseek] 第 8 层 T5 combat/plan-choice: 同意 Jev（plan3 @0.36 → plan3）：Leaves 骇鳗 at 2 HP so any attack next turn kills it before its 33 hit; near-certain safe finish, unlike plan2 which needs
- [deepseek] 第 9 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.19 → buy_card1）：28血需要虚弱减伤，上勾拳还提供易伤放大钢笔尖/旋风斩爆发；手册明确低血时买战斗专注曾致死。
- [deepseek] 第 14 层 T1 combat/plan-choice+potion: 推翻 Jev（plan2 @0.30 → plan1）：Max damage (51) nearly kills the buffing eel for an easy T2 finish; 5 extra HP is cheap at 73/80 with a rest before boss
- [deepseek] 第 14 层 T1 combat/plan-choice+potion: 推翻 Jev（p0 @0.35 → plan1）：90% HP, only 15 damage; save the random skill potion for the boss where a burst block matters more.
- [deepseek] 第 14 层 T2 combat/plan-choice+potion: 推翻 Jev（plan4 @0.35 → plan1）：Whirlwind at full 3 energy deals 47, kills one and leaves the other three at 4/5/3 HP; near-clearing the board now preve
- [deepseek] 第 16 层 TNone reward/card: 推翻 Jev（card1 @0.24 → card2）：1费全体9伤且吃力量成长，优于3费的跃跃欲试；第二张AOE为二幕多敌战（帝王蟹等）和长boss战做准备。
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 推翻 Jev（plan1 @0.06 → p0）：Enemy is asleep 3 turns; Bash's vulnerable would tick away wasted. Use sleep turns to set up powers/skills; free potion 
- [deepseek] 第 17 层 T1 selection/take into my hand: 推翻 Jev（card2 @0.11 → card1）：Incoming attack is 0 (boss asleep), so block is wasted; free 挑衅's vulnerable boosts this turn's attacks and cheapest if 
- [deepseek] 第 17 层 T4 combat/plan-choice: 推翻 Jev（plan2 @0.00 → plan1）：Full HP 86; trade 5 HP for 8 extra damage on a 222-HP boss we must race. Damage now is worth it.
- [deepseek] 第 17 层 T4 combat/plan-choice: 同意 Jev（plan1 @0.16 → plan1）：At full 86 HP with a 203-HP boss, 5 HP for 11 damage is a good trade to race the boss down; block is not needed yet.
- [deepseek] 第 17 层 T5 combat/plan-choice: 同意 Jev（plan1 @0.34 → plan1）：Bash+回旋镖 deals max 31 and leaves Vulnerable 2, amplifying the next two attack turns; 5 extra HP is worth ending the 192-
- [deepseek] 第 17 层 T6 combat/plan-choice: 同意 Jev（plan1 @0.45 → plan1）：Best damage (38) while still applying Weak+Vulnerable; races 161-HP boss faster, and 1 extra HP cost is worth 4 damage i
- [deepseek] 第 17 层 T6 selection/choose: 同意 Jev（card0 @0.23 → card0）：Upgrade 突破: +2 damage to all enemies for 1 energy, scales with strength and helps act-2 multi-enemy fights; 上勾拳/打击 upgra
- [deepseek] 第 17 层 T6 combat/plan-choice: 同意 Jev（plan2 @0.40 → plan2）：上勾拳的Weak削减Boss攻击，易伤2延续让下回合爆发；比plan1多12伤但少4血，弱化更利于长战。
- [deepseek] 第 17 层 T8 combat/plan-choice: 同意 Jev（plan1 @0.26 → plan1）：Most damage (33) while staying above the 21 incoming hit; racing a 21/turn boss favors burst over 5 extra HP saved.

### Jev 低置信度（<0.35）决策：4 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (铁斩波 -> 淤泥旋螺, 防御, 打击 -> 淤泥旋螺) with confidence 0.08; code rank 1 (0.08)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (飞剑回旋镖, 防御, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (防御, 上勾拳 -> 海洋混混) with confidence 0.01; code rank 1 (0.01)
- 第 15 层 combat/plan-choice: Jev chose plan 4/4 (potion 力量药水, 铁斩波 -> 钙化邪教徒, 飞剑回旋镖, 突破, 旋风斩) with confidence 0.34; code rank 4 (0.34)

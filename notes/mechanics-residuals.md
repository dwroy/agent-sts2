# 机制残差：求解器预测的本回合掉血 vs 实际（mechanics audit 输入）

`npx tsx tools/mechanics-residuals.ts run`（2026-10-02；怪物数据库 6200 场，最后 2026-10-02T09:55:36.889Z）。不调用任何模型。
每个记录的战斗回合：取这回合第一个规划决策的状态，用现在的代码规划三次（见下，不跑推演），在求解器的线里找出这回合实际打出的线（出牌和喝药的卡 id + 目标，从这个决策到结束回合），
它预测的本回合掉血 hp_lost 对比实际掉血（这一帧的血量 − 下回合第一帧的血量；当回合打赢取战斗最后一帧，死了是全部）。残差 = 实际 − 预测：**负数 = 求解器高估了掉血**。
「被去掉」= 决策时敌人身上有、结束回合那一帧（敌人还活着）没有或降到 0 的能力。分组里一个回合可以同时在多个组。docs/mechanics-learning.md 有口径和学习者任务。

回合 28939：能对上实际打出的线且有实际掉血的 28130，其中当回合打赢的 5365 个单列（不进下面任何分组和偏差：最后一帧在致死那张牌之前，那张牌的荆棘反伤、失去生命不在实际里；偏差 on -0.2 / move -0.2，|误差| move 0.2），下面的分组用其余 22765 个；对不上的 529（打了决策之后抽到的牌、旧代码的线现在不再生成等），战斗在敌方回合结束（没有之后的帧）的 280。
比较的是这回合第一个规划决策的 18291 个，第二、第三个的 3594 / 880 个（第一个之后抽到的牌打出了，就用之后重新规划的那个决策；它离回合结束更近，误差自然更小）。其中我们死了的 387 个（实际 = 全部血量，预测高于它的按它算；早期日志里也有放弃的局记成死亡），含敌方回合被复活接住的 12 个（仙女瓶少了一瓶 8、蜥蜴尾巴回血 4：按死亡算，回的血不是负的掉血）。线的沙坑在敌方回合后到 0（求解器的 hp_lost 不算这种直接死亡）的，预测按全部血量算：13 个。
出牌的目标按当时的敌人列表换算成决策时的序号（敌人死了游戏会把序号往前挪；求解器的线用决策时的序号）：换算过的回合 461 个（偏差 move -0.1）。卡牌按出牌时手里那张牌的升级标记比对（决策日志的卡 id 不带「+」）。
三种：off = MECH_RULES 关；on = MECH_RULES 开（v4 3488dc5 的实盘）；move = 再开 MECH_MOVE_RULES（学到的换招 + 凯撒蟹背后攻击要两只钳子都活着）。Surrounded 的朝向按实盘当时记的给（这场战斗里这个决策之前最后一次指定目标的出牌或喝药；之前一次都没有才按 startFacing）。
全部：偏差 off -0.1 / on -0.1 / move -0.1，|误差| off 0.2 / on 0.2 / move 0.2（n=22765）。

## MECH_MOVE_RULES 核对

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| 凯撒蟹：全部回合 | 510 | 78 | -0.4 | -0.4 | -0.3 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| 凯撒蟹：两只钳子都活着、本回合没死 | 469 | 78 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | RRMYC7MCSYX8 F33 T3 (1 vs 13); 0QSB9YV3UFCL F33 T3 (0 vs 8) |
| 凯撒蟹：本回合一只钳子死了（另一只的蟹之怒被去掉） | 15 | 15 | -6.4 | -6.4 | -5.5 | 6.4 | 6.4 | 5.5 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| 凯撒蟹：只剩一只钳子 | 26 | 17 | 0.6 | 0.6 | 0.1 | 0.6 | 0.6 | 0.1 | 8L29N792FA45 F33 T5 (11 vs 5); NWVLG96EE54U F33 T8 (5 vs 1) |
| 巨斧机器人：全部回合 | 144 | 28 | -0.1 | -0.1 | -0.1 | 0.2 | 0.2 | 0.2 | JR66CJ9T8H7W F45 T6 (0 vs 9); H14TDJAE4JB9 F38 T6 (15 vs 21) |
| 巨斧机器人：本回合复活（库存被拿掉） | 19 | 15 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| 打出的线触发了学到的换招 | 19 | 15 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| move 和 on 的预测不同的回合 | 10 | 9 | -0.8 | -0.8 | -0.4 | 3.4 | 3.4 | 0.4 | NX48MBG3SPRJ F33 T7 (3 vs 10); 8L29N792FA45 F33 T5 (11 vs 5) |

预测变了的回合（move ≠ on）10 个：JR66CJ9T8H7W F33 T7（实际 7，on 10 → move 7）；M75JX3KS80NB F33 T7（实际 5，on 8 → move 5）；1LJFBKUF51PE F33 T6（实际 11，on 13 → move 11）；TEK4MLSEGC4P F33 T7（实际 1，on 3 → move 1）；NWVLG96EE54U F33 T8（实际 5，on 1 → move 5）；NX48MBG3SPRJ F33 T7（实际 3，on 10 → move 7）；NX48MBG3SPRJ F33 T8（实际 5，on 2 → move 5）；8L29N792FA45 F33 T5（实际 11，on 5 → move 11）；5DFXQLAMFUB2 F33 T6（实际 0，on 1 → move 0）；HME0FA7VA0J6 F33 T7（实际 3，on 6 → move 3）

## 振翅核对

振翅在回合内被打光、结束回合时偷窃草蜢眩晕的回合（能对上线的）：n=16（16 场），偏差 off -3.7 → on -0.6，|误差| off 3.7 → on 0.6。
例：Q97BWZJ011BB F19 T4 (0 vs 10)；VQSA3FRA2ML9 F20 T5 (3 vs 3)；5R0G8U5TB6GY F22 T5 (1 vs 1)
规则自己的核对（打出的线）：求解器说眩晕而游戏里没有 0 次；游戏里振翅打光眩晕了而求解器的线没打光 1 次（Q97BWZJ011BB F19 T4：求解器对这条线的命中数和游戏不同）。

## 单个回合残差最大的 25 个（move）

| 回合 | 实际 | 预测 move | 预测 on | 预测 off | 比较的决策 | 敌人 | 本回合被去掉 |
|---|---|---|---|---|---|---|---|
| S780Y1W7AQZL F17 T5 | 79 | 4 | 4 | 4 | 第 1 个 | VANTOM | — |
| GGF8C3G76C7B F33 T14 | 0 | 55 | 55 | 55 | 第 1 个 | CRUSHER, ROCKET | CRUSHER:CRAB_RAGE_POWER |
| FA82FQHSJG2F F27 T8 | 1 | 25 | 25 | 25 | 第 2 个 | PARAFRIGHT, THE_OBSCURA | — |
| 92MWCWJCFDAE F7 T4 | 19 | 0 | 0 | 0 | 第 2 个 | SKULKING_COLONY | — |
| ZRYR5WLG6E9K F22 T1 | 0 | 18 | 18 | 18 | 第 2 个 | CHOMPER, CHOMPER | — |
| CY8UG7ABBSAS F15 T4 | 17 | 0 | 0 | 0 | 第 2 个 | SKULKING_COLONY | — |
| XJWF15R19UXF F8 T4 | 17 | 0 | 0 | 0 | 第 2 个 | SKULKING_COLONY | — |
| ZRYR5WLG6E9K F23 T3 | 0 | 17 | 17 | 17 | 第 1 个 | PARAFRIGHT, THE_OBSCURA | — |
| 1WSHZ8ML4EVF F27 T6 | 0 | 16 | 16 | 16 | 第 1 个 | DECIMILLIPEDE_SEGMENT_FRONT, DECIMILLIPEDE_SEGMENT_MIDDLE, DECIMILLIPEDE_SEGMENT_BACK | — |
| HGDBHW8CJK8C F14 T6 | 16 | 0 | 0 | 0 | 第 2 个 | SKULKING_COLONY | — |
| KXG79NARS0LT F27 T3 | 1 | 17 | 17 | 17 | 第 1 个 | CHOMPER, CHOMPER | — |
| Q8XR6EXAF6QV F37 T4 | 0 | 16 | 16 | 16 | 第 1 个 | THE_LOST, THE_FORGOTTEN | — |
| TXLHYU13L102 F31 T2 | 6 | -10 | -10 | -10 | 第 1 个 | PARAFRIGHT, THE_OBSCURA | — |
| WLM6YKJ0ASNE F33 T7 | 8 | 24 | 24 | 24 | 第 1 个 | CRUSHER, ROCKET | CRUSHER:CRAB_RAGE_POWER |
| WR2Y98A43YCY F23 T3 | 8 | 24 | 24 | 24 | 第 1 个 | PARAFRIGHT, THE_OBSCURA | — |
| 377JPY9LPG1L F19 T3 | 0 | 15 | 15 | 15 | 第 1 个 | THIEVING_HOPPER | — |
| 842N6N604DVX F25 T1 | 0 | 15 | 15 | 15 | 第 1 个 | BOWLBUG_ROCK, BOWLBUG_SILK, SLUMBERING_BEETLE | — |
| 8L29N792FA45 F35 T2 | 16 | 1 | 1 | 1 | 第 1 个 | LIVING_SHIELD, TURRET_OPERATOR | — |
| L34T7HND7EL8 F27 T1 | 4 | 19 | 19 | 19 | 第 2 个 | BOWLBUG_ROCK, BOWLBUG_NECTAR, BOWLBUG_SILK | — |
| N95WHBGC4CG9 F15 T3 | 15 | 0 | 0 | 0 | 第 1 个 | EYE_WITH_TEETH, FOGMOG | — |
| NWVLG96EE54U F29 T1 | 15 | 0 | 0 | 0 | 第 1 个 | BOWLBUG_ROCK, BOWLBUG_NECTAR, BOWLBUG_SILK | — |
| D3X1T7KBGK5T F28 T3 | 6 | 20 | 20 | 20 | 第 1 个 | DECIMILLIPEDE_SEGMENT_MIDDLE, DECIMILLIPEDE_SEGMENT_BACK | — |
| YN4ETG9Z8ERN F29 T2 | 5 | 19 | 19 | 19 | 第 1 个 | DECIMILLIPEDE_SEGMENT_FRONT, DECIMILLIPEDE_SEGMENT_MIDDLE, DECIMILLIPEDE_SEGMENT_BACK | — |
| 1HF7GR4PZAPC F48 T1 | 1 | 14 | 14 | 14 | 第 1 个 | TEST_SUBJECT | — |
| 2AX48ZA9H9DM F5 T3 | 13 | 0 | 0 | 0 | 第 1 个 | SHRINKER_BEETLE | — |

## 按场上的敌人能力（决策时）

### 偏差最负（求解器高估掉血）

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PAINFUL_STABS_POWER | 疼痛戳刺 | 每次你受到未被格挡的伤害时，将1张伤口洗入你的弃牌堆。 | — | 60 | 19 | -0.7 | -0.7 | -0.7 | 0.7 | 0.7 | 0.7 | CRRPX9MWJZGM F48 T4 (1 vs 12); 2WUMK6PK5QHD F48 T8 (20 vs 30) |
| ADAPTABLE_POWER | 适者生存 | 当这个怪物将要被击败时，它会复活变得更加强大。 | — | 105 | 20 | -0.6 | -0.6 | -0.6 | 0.7 | 0.7 | 0.7 | 1HF7GR4PZAPC F48 T1 (1 vs 14); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| ENRAGE_POWER | 激怒 | 每当你打出一张技能牌时，获得2点力量。 | — | 45 | 20 | -0.5 | -0.5 | -0.5 | 0.8 | 0.8 | 0.8 | 1HF7GR4PZAPC F48 T1 (1 vs 14); A8ENYFR4ZWKG F48 T1 (9 vs 15) |
| DEXTERITY_POWER | 敏捷 | 敏捷会增加从卡牌中获得的格挡。 | — | 64 | 22 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| POSSESS_STRENGTH_POWER | 抢夺力量 | 被击杀时，将偷窃的所有力量返还给玩家。 | — | 68 | 23 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 484 | 78 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| BACK_ATTACK_RIGHT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 487 | 78 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| BACK_ATTACK_LEFT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 507 | 78 | -0.4 | -0.4 | -0.3 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| POSSESS_SPEED_POWER | 抢夺速度 | 被击杀时，将偷窃的所有敏捷返还给玩家。 | — | 88 | 24 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| REATTACH_POWER | 接续 | 如果身体还有存活的其他部分，则在2回合后以25点生命复活。 | — | 250 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| RAMPART_POWER | 盾墙 | 在玩家回合开始时，高塔炮手获得25点格挡。 | — | 115 | 61 | -0.3 | -0.3 | -0.3 | 0.7 | 0.7 | 0.7 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| GALVANIC_POWER | 流电 | 能力牌被侵蚀为流电。 | — | 57 | 24 | -0.3 | -0.3 | -0.3 | 0.4 | 0.4 | 0.4 | Y3XT9EBS7U8B F43 T2 (14 vs 20); Y3XT9EBS7U8B F43 T3 (6 vs 12) |
| HATCH_POWER | 孵化 | X回合后孵化。 | — | 93 | 82 | -0.2 | -0.2 | -0.2 | 0.3 | 0.3 | 0.3 | TQX5JJX3UD39 F25 T2 (0 vs 8); WB023SWBTUU3 F28 T2 (11 vs 17) |
| ILLUSION_POWER | 幻象 | 死亡时，下回合会以完整生命值复活。 | — | 362 | 144 | -0.2 | -0.2 | -0.2 | 0.4 | 0.4 | 0.4 | FA82FQHSJG2F F27 T8 (1 vs 25); ZRYR5WLG6E9K F23 T3 (0 vs 17) |
| IMBALANCED_POWER | 失衡 | 如果这个生物的攻击被任意玩家完全格挡，则它将被击晕。 | — | 701 | 302 | -0.2 | -0.2 | -0.2 | 0.3 | 0.3 | 0.3 | 842N6N604DVX F25 T1 (0 vs 15); NWVLG96EE54U F29 T1 (15 vs 0) |

### 偏差最正（求解器低估掉血）

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WITHERING_PRESENCE_POWER | 凋萎存在 | 你每打出6张牌，将一张凋萎加入你的手牌。 | — | 166 | 22 | 0.7 | 0.7 | 0.7 | 1.5 | 1.5 | 1.5 | XWPVR2NK3M5K F48 T10 (21 vs 33); N1V27SUSFYWS F48 T7 (14 vs 5) |
| HARDENED_SHELL_POWER | 硬化外壳 | 这个生物每回合失去的生命值不会超过20点。 | — | 338 | 82 | 0.2 | 0.2 | 0.2 | 0.3 | 0.3 | 0.3 | 92MWCWJCFDAE F7 T4 (19 vs 0); CY8UG7ABBSAS F15 T4 (17 vs 0) |
| SHRINK_POWER | 缩小 | 这个生物的攻击伤害在3回合内减少30%。 | strips 1（1 场）→ ABOUT_TO_BLOW_MOVE 1；有攻击的 1/1 取消；非规则 | 38 | 17 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 0.2 | PU21Z67J65NE F17 T4 (6 vs 0); WY41FADPAGTW F42 T4 (6 vs 7) |
| HIGH_VOLTAGE_POWER | 高电压 | 这个生物的回合结束时，会获得2点力量。 | — | 24 | 15 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JW925EDF9ZTQ F39 T3 (3 vs 1); H5MZ6BKA1HVS F44 T2 (2 vs 2) |
| NEMESIS_POWER | 天罚 | 每两个回合结束时，获得1层无实体。 | — | 31 | 14 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | CRRPX9MWJZGM F48 T8 (15 vs 5); A8ENYFR4ZWKG F48 T7 (22 vs 28) |
| SURPRISE_POWER | 意外 | 这个生物有点不太对劲…… | — | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); DG1CDGW8Y5JE F11 T1 (1 vs 1) |
| THIEVERY_POWER | 偷窃 | 攻击时偷走金币。 | — | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); DG1CDGW8Y5JE F11 T1 (1 vs 1) |
| SUCK_POWER | 吮吸 | 这个生物每次造成未被格挡的伤害时，都会获得1点力量。 | — | 170 | 77 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 5HHLMV2DZ5AZ F14 T2 (8 vs 0); 0YG4ETM3MLHS F11 T2 (6 vs 12) |
| PERSONAL_HIVE_POWER | 人体蜂房 | 每当这个敌人被攻击命中时，在你的抽牌堆中加入晕眩。 | — | 342 | 75 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | B6ACRLQYB83N F29 T4 (8 vs 0); G8AQJ2YEMEHE F25 T4 (22 vs 28) |
| VIGOR_POWER | 活力 | 你的下一张攻击牌伤害增加。 | — | 189 | 86 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | TQCZFBK7T09Y F13 T3 (0 vs 0); TQCZFBK7T09Y F13 T4 (0 vs 0) |
| ASLEEP_POWER | 沉睡 | TODO | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 158 | 63 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T1 (0 vs 1); W5PTC48C3B1H F17 T2 (0 vs 1) |
| RAVENOUS_POWER | 饥饿 | 当有敌人死亡时，噬尸蛞蝓会立即吃下尸体，在本回合被击晕然后获得1点力量。 | — | 760 | 244 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | RBJ402TKQZ6F F15 T3 (2 vs 10); Y0CWCD0C03FL F6 T1 (6 vs 0) |
| SHRIEK_POWER | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | strips 90（90 场）→ STUNNED 90；有攻击的 90/90 取消；**眩晕规则** | 340 | 94 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Z7D7J1RUUJ61 F8 T2 (2 vs 9); Z7D7J1RUUJ61 F8 T4 (0 vs 4) |
| SLOW_POWER | 缓慢 | 你在本回合内每打出一张牌，该敌人本回合从攻击牌中受到的伤害增加10%。 | — | 332 | 83 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | DT1H1URTUAD8 F11 T3 (17 vs 23); P78Z8AGNN9Z3 F12 T2 (0 vs 1) |
| ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | strips 141（127 场）→ CHARGE_UP_MOVE 23/READY_MOVE 22；有攻击的 0/59 取消；非规则 | 950 | 281 | 0.0 | 0.0 | 0.0 | 0.4 | 0.4 | 0.4 | ZRYR5WLG6E9K F22 T1 (0 vs 18); KXG79NARS0LT F27 T3 (1 vs 17) |

### |误差| 最大

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WITHERING_PRESENCE_POWER | 凋萎存在 | 你每打出6张牌，将一张凋萎加入你的手牌。 | — | 166 | 22 | 0.7 | 0.7 | 0.7 | 1.5 | 1.5 | 1.5 | XWPVR2NK3M5K F48 T10 (21 vs 33); N1V27SUSFYWS F48 T7 (14 vs 5) |
| ENRAGE_POWER | 激怒 | 每当你打出一张技能牌时，获得2点力量。 | — | 45 | 20 | -0.5 | -0.5 | -0.5 | 0.8 | 0.8 | 0.8 | 1HF7GR4PZAPC F48 T1 (1 vs 14); A8ENYFR4ZWKG F48 T1 (9 vs 15) |
| ADAPTABLE_POWER | 适者生存 | 当这个怪物将要被击败时，它会复活变得更加强大。 | — | 105 | 20 | -0.6 | -0.6 | -0.6 | 0.7 | 0.7 | 0.7 | 1HF7GR4PZAPC F48 T1 (1 vs 14); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| PAINFUL_STABS_POWER | 疼痛戳刺 | 每次你受到未被格挡的伤害时，将1张伤口洗入你的弃牌堆。 | — | 60 | 19 | -0.7 | -0.7 | -0.7 | 0.7 | 0.7 | 0.7 | CRRPX9MWJZGM F48 T4 (1 vs 12); 2WUMK6PK5QHD F48 T8 (20 vs 30) |
| PAPER_CUTS_POWER | 纸伤难愈 | 每当这个生物对你造成未被格挡的伤害时，你失去1点最大生命。 | — | 132 | 73 | -0.1 | -0.1 | -0.1 | 0.7 | 0.7 | 0.7 | 75P1G37W7CB3 F36 T1 (13 vs 0); M6P7KAWMF6BC F37 T2 (1 vs 13) |
| RAMPART_POWER | 盾墙 | 在玩家回合开始时，高塔炮手获得25点格挡。 | — | 115 | 61 | -0.3 | -0.3 | -0.3 | 0.7 | 0.7 | 0.7 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| NEMESIS_POWER | 天罚 | 每两个回合结束时，获得1层无实体。 | — | 31 | 14 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | CRRPX9MWJZGM F48 T8 (15 vs 5); A8ENYFR4ZWKG F48 T7 (22 vs 28) |
| DEXTERITY_POWER | 敏捷 | 敏捷会增加从卡牌中获得的格挡。 | — | 64 | 22 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| POSSESS_STRENGTH_POWER | 抢夺力量 | 被击杀时，将偷窃的所有力量返还给玩家。 | — | 68 | 23 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| REATTACH_POWER | 接续 | 如果身体还有存活的其他部分，则在2回合后以25点生命复活。 | — | 250 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| POSSESS_SPEED_POWER | 抢夺速度 | 被击杀时，将偷窃的所有敏捷返还给玩家。 | — | 88 | 24 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| ILLUSION_POWER | 幻象 | 死亡时，下回合会以完整生命值复活。 | — | 362 | 144 | -0.2 | -0.2 | -0.2 | 0.4 | 0.4 | 0.4 | FA82FQHSJG2F F27 T8 (1 vs 25); ZRYR5WLG6E9K F23 T3 (0 vs 17) |
| ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | strips 141（127 场）→ CHARGE_UP_MOVE 23/READY_MOVE 22；有攻击的 0/59 取消；非规则 | 950 | 281 | 0.0 | 0.0 | 0.0 | 0.4 | 0.4 | 0.4 | ZRYR5WLG6E9K F22 T1 (0 vs 18); KXG79NARS0LT F27 T3 (1 vs 17) |
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 484 | 78 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| BACK_ATTACK_RIGHT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 487 | 78 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |

## 按本回合被去掉的敌人能力

### n ≥ 5，按偏差

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 15 | 15 | -6.4 | -6.4 | -5.5 | 6.4 | 6.4 | 5.5 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| FLUTTER_POWER | 振翅 | 从攻击牌中受到的伤害减少50%。 | strips 41（41 场）→ STUNNED 41；有攻击的 10/10 取消；**眩晕规则** | 16 | 16 | -3.7 | -0.6 | -0.6 | 3.7 | 0.6 | 0.6 | Q97BWZJ011BB F19 T4 (0 vs 10); VQSA3FRA2ML9 F20 T5 (3 vs 3) |
| WEAK_POWER | 虚弱 | 虚弱的生物造成的攻击伤害减少25%。 | strips 12（10 场）→ BOOT_UP_MOVE 8/ABOUT_TO_BLOW_MOVE 2；有攻击的 9/11 取消；非规则 | 7 | 7 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| CURL_UP_POWER | 蜷身 | 受到伤害时，蜷起身子并获得格挡。（每场战斗一次） | strips 94（94 场）→ WEB_CANNON_MOVE 88/CURL_AND_GROW_MOVE 6；有攻击的 0/88 取消；非规则 | 72 | 72 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 842N6N604DVX F31 T1 (3 vs 9); H5MZ6BKA1HVS F31 T1 (5 vs 9) |
| THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 101 | 101 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | RTF3KZLZPV2L F6 T2 (4 vs 11); 5LRZ7HJ7YGSY F3 T2 (6 vs 11) |
| VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | strips 81（66 场）→ ABOUT_TO_BLOW_MOVE 39/BOOT_UP_MOVE 29；有攻击的 57/69 取消；非规则 | 152 | 150 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | W6F4YXF3MT7A F46 T1 (0 vs 8); CRRPX9MWJZGM F46 T1 (5 vs 10) |
| STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | strips 101（97 场）→ STUNNED 45/BOOT_UP_MOVE 26；有攻击的 81/95 取消；非规则 | 200 | 192 | -0.1 | -0.1 | -0.1 | 0.2 | 0.2 | 0.2 | 2WUMK6PK5QHD F36 T2 (0 vs 7); 9GRPS5DC8KHN F7 T5 (6 vs 0) |
| PLATING_POWER | 覆甲 | 在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层。 | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); PYTG6PC12PEN F17 T2 (0 vs 0) |
| ASLEEP_POWER | 沉睡 | TODO | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); PYTG6PC12PEN F17 T2 (0 vs 0) |
| SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | strips 237（130 场）→ JAB_MOVE 82/WHIRLWIND_MOVE 62；有攻击的 0/134 取消；非规则 | 114 | 106 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F17 T3 (26 vs 28); 3MDJW1UAD5M6 F17 T4 (0 vs 0) |
| BURROWED_POWER | 埋地 | 格挡不会在其回合开始时移除。如果所有格挡被移除，则将其击晕。 | strips 124（121 场）→ STUNNED 124；有攻击的 102/102 取消；**眩晕规则** | 83 | 83 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F21 T3 (1 vs 2); JRN33CL7EB50 F24 T4 (2 vs 2) |
| PLOW_POWER | 横冲直撞 | 这个生物的生命值第一次下降到150或更低时，将其击晕。 | strips 47（47 场）→ STUNNED 47；有攻击的 47/47 取消；**眩晕规则** | 39 | 39 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | YP9CGPJE19GP F17 T4 (1 vs 1); PFBKJTWPY8DK F17 T3 (1 vs 1) |
| SHRIEK_POWER | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | strips 90（90 场）→ STUNNED 90；有攻击的 90/90 取消；**眩晕规则** | 77 | 77 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 4JVP9LTXYY9D F9 T3 (1 vs 1); 5FMUSNUXEHGY F8 T3 (0 vs 0) |
| STOCK_POWER | 库存 | 被击杀时，召唤一个全新的巨斧机器人。 | strips 24（24 场）→ BOOT_UP_MOVE 24；有攻击的 22/22 取消；非规则 | 9 | 9 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | P4ZDR744B9JC F37 T6 (0 vs 0); H14TDJAE4JB9 F38 T5 (0 vs 0) |
| ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | strips 141（127 场）→ CHARGE_UP_MOVE 23/READY_MOVE 22；有攻击的 0/59 取消；非规则 | 99 | 90 | 0.1 | 0.1 | 0.1 | 0.4 | 0.4 | 0.4 | VG7HWJRX44RQ F8 T2 (21 vs 13); NWVLG96EE54U F48 T7 (11 vs 5) |

### 怪物 × 被去掉的能力

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRUSHER × CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | — | 15 | 15 | -6.4 | -6.4 | -5.5 | 6.4 | 6.4 | 5.5 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| THIEVING_HOPPER × FLUTTER_POWER（眩晕） | 振翅 | 从攻击牌中受到的伤害减少50%。 | — | 16 | 16 | -3.7 | -0.6 | -0.6 | 3.7 | 0.6 | 0.6 | Q97BWZJ011BB F19 T4 (0 vs 10); VQSA3FRA2ML9 F20 T5 (3 vs 3) |
| AXEBOT × WEAK_POWER | 虚弱 | 虚弱的生物造成的攻击伤害减少25%。 | — | 5 | 5 | -0.6 | -0.6 | -0.6 | 0.6 | 0.6 | 0.6 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| MECHA_KNIGHT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 6 | 6 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | YFG53EZ372D7 F44 T3 (1 vs 4); VE975EGP2G3V F44 T5 (3 vs 3) |
| SCROLL_OF_BITING × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 18 | 17 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | 2WUMK6PK5QHD F36 T2 (0 vs 7); Y0KJC2MQ57Z4 F35 T2 (1 vs 1) |
| AXEBOT × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 8 | 7 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| AXEBOT × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 12 | 10 | -0.2 | -0.2 | -0.2 | 0.3 | 0.3 | 0.3 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T4 (12 vs 12) |
| EXOSKELETON × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 36 | 31 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | NH8A3VBDRDZW F27 T2 (2 vs 5); 92MWCWJCFDAE F31 T2 (5 vs 8) |
| LOUSE_PROGENITOR × CURL_UP_POWER | 蜷身 | 受到伤害时，蜷起身子并获得格挡。（每场战斗一次） | — | 72 | 72 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 842N6N604DVX F31 T1 (3 vs 9); H5MZ6BKA1HVS F31 T1 (5 vs 9) |
| MYTE × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 6 | 6 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 3MDJW1UAD5M6 F31 T4 (0 vs 1); K39JRY3WW4VM F25 T4 (6 vs 6) |
| PHANTASMAL_GARDENER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 37 | 37 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | 5FMUSNUXEHGY F14 T3 (-3 vs 0); 5DFXQLAMFUB2 F15 T3 (5 vs 7) |
| TOADPOLE × THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 101 | 101 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | RTF3KZLZPV2L F6 T2 (4 vs 11); 5LRZ7HJ7YGSY F3 T2 (6 vs 11) |
| CHOMPER × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 21 | 15 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | GG0Y0TJ2JXAR F27 T2 (10 vs 11); GGF8C3G76C7B F28 T3 (11 vs 11) |
| VANTOM × SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | — | 61 | 61 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F17 T3 (26 vs 28); 3MDJW1UAD5M6 F17 T4 (0 vs 0) |
| LAGAVULIN_MATRIARCH × PLATING_POWER（眩晕） | 覆甲 | 在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层。 | — | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); PYTG6PC12PEN F17 T2 (0 vs 0) |
| LAGAVULIN_MATRIARCH × ASLEEP_POWER（眩晕） | 沉睡 | TODO | — | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); PYTG6PC12PEN F17 T2 (0 vs 0) |
| TUNNELER × BURROWED_POWER（眩晕） | 埋地 | 格挡不会在其回合开始时移除。如果所有格挡被移除，则将其击晕。 | — | 83 | 83 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F21 T3 (1 vs 2); JRN33CL7EB50 F24 T4 (2 vs 2) |
| CORPSE_SLUG × VULNERABLE_POWER（眩晕） | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 41 | 41 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | HGDBHW8CJK8C F2 T3 (0 vs 0); VP5FZC9UCP63 F2 T2 (0 vs 0) |
| TOADPOLE × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 31 | 31 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | WQTRXBJY0Q1S F3 T2 (2 vs 2); UJS25W5ARGBV F4 T2 (2 vs 2) |
| CEREMONIAL_BEAST × PLOW_POWER（眩晕） | 横冲直撞 | 这个生物的生命值第一次下降到150或更低时，将其击晕。 | — | 39 | 39 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | YP9CGPJE19GP F17 T4 (1 vs 1); PFBKJTWPY8DK F17 T3 (1 vs 1) |
| CEREMONIAL_BEAST × STRENGTH_POWER（眩晕） | 力量 | 力量会增加攻击牌造成的伤害。 | — | 38 | 38 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | YP9CGPJE19GP F17 T4 (1 vs 1); PFBKJTWPY8DK F17 T3 (1 vs 1) |
| PHANTASMAL_GARDENER × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 13 | 12 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G6YVT0ALVQ65 F9 T2 (10 vs 10); KG0EDXDMLP5K F13 T5 (3 vs 3) |
| TERROR_EEL × SHRIEK_POWER（眩晕） | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | — | 77 | 77 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 4JVP9LTXYY9D F9 T3 (1 vs 1); 5FMUSNUXEHGY F8 T3 (0 vs 0) |
| INKLET × SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | — | 53 | 45 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | MGJ8W6C8L1DG F12 T1 (2 vs 2); MGJ8W6C8L1DG F12 T3 (1 vs 1) |
| AXEBOT × STOCK_POWER | 库存 | 被击杀时，召唤一个全新的巨斧机器人。 | — | 9 | 9 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | P4ZDR744B9JC F37 T6 (0 vs 0); H14TDJAE4JB9 F38 T5 (0 vs 0) |
| CHOMPER × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 6 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | GGF8C3G76C7B F28 T5 (0 vs 0); SFCEH58GXVT9 F31 T4 (1 vs 1) |
| WATERFALL_GIANT × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 14 | 14 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | ZANMLV9UU31K F17 T7 (0 vs 0); R6V3T4KSDABE F17 T5 (3 vs 3) |
| EXOSKELETON × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 13 | 13 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | YG3HAFACLMAR F30 T2 (1 vs 1); 4LC3YKCZV218 F19 T5 (1 vs 1) |
| WATERFALL_GIANT × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 7 | 7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Y36HXZ80A8LL F17 T9 (0 vs 0); RBJ402TKQZ6F F17 T6 (0 vs 0) |
| WRIGGLER × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 6 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | XWPVR2NK3M5K F8 T3 (1 vs 1); VUV4MSZUA34L F13 T2 (8 vs 8) |
| CUBEX_CONSTRUCT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 31 | 31 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 | 0.2 | 2XWM27TZ7T12 F14 T2 (5 vs 2); Z3DFG85QDRCD F39 T3 (7 vs 9) |
| KIN_FOLLOWER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 14 | 14 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JGJS7QE62GLD F17 T3 (6 vs 5); CMUXQKE4UDJ4 F17 T2 (10 vs 10) |
| PUNCH_CONSTRUCT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 35 | 34 | 0.1 | 0.1 | 0.1 | 0.3 | 0.3 | 0.3 | VG7HWJRX44RQ F8 T2 (21 vs 13); H5MZ6BKA1HVS F38 T4 (6 vs 10) |
| WRIGGLER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 24 | 24 | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | 9GRPS5DC8KHN F7 T5 (6 vs 0); H14TDJAE4JB9 F9 T7 (2 vs 2) |
| AEONGLASS × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 9 | 9 | 1.0 | 1.0 | 1.0 | 2.1 | 2.1 | 2.1 | NWVLG96EE54U F48 T7 (11 vs 5); JJ75S331VUKX F48 T5 (5 vs 0) |

## 按敌人

### 偏差最负

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| TEST_SUBJECT | 136 | 20 | -0.5 | -0.5 | -0.5 | 0.7 | 0.7 | 0.7 | 1HF7GR4PZAPC F48 T1 (1 vs 14); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| THE_LOST | 68 | 23 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| ROCKET | 487 | 78 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| PARAFRIGHT | 277 | 93 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | FA82FQHSJG2F F27 T8 (1 vs 25); ZRYR5WLG6E9K F23 T3 (0 vs 17) |
| OWL_MAGISTRATE | 93 | 25 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | ZPPVDTSFJXJM F39 T1 (6 vs 16); G1Z0X3WBH4XQ F44 T2 (13 vs 18) |
| CRUSHER | 507 | 78 | -0.4 | -0.4 | -0.3 | 0.4 | 0.4 | 0.4 | GGF8C3G76C7B F33 T14 (0 vs 55); WLM6YKJ0ASNE F33 T7 (8 vs 24) |
| THE_FORGOTTEN | 88 | 24 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| FROG_KNIGHT | 101 | 25 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | A8ENYFR4ZWKG F42 T1 (5 vs 11); A8ENYFR4ZWKG F42 T2 (13 vs 19) |
| CHOMPER | 338 | 96 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | ZRYR5WLG6E9K F22 T1 (0 vs 18); KXG79NARS0LT F27 T3 (1 vs 17) |
| LIVING_SHIELD | 115 | 61 | -0.3 | -0.3 | -0.3 | 0.7 | 0.7 | 0.7 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| DECIMILLIPEDE_SEGMENT_BACK | 227 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| DECIMILLIPEDE_SEGMENT_MIDDLE | 229 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| GLOBE_HEAD | 57 | 24 | -0.3 | -0.3 | -0.3 | 0.4 | 0.4 | 0.4 | Y3XT9EBS7U8B F43 T2 (14 vs 20); Y3XT9EBS7U8B F43 T3 (6 vs 12) |
| TURRET_OPERATOR | 133 | 61 | -0.3 | -0.3 | -0.3 | 0.6 | 0.6 | 0.6 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| SLUMBERING_BEETLE | 425 | 89 | -0.3 | -0.3 | -0.3 | 0.4 | 0.4 | 0.4 | 842N6N604DVX F25 T1 (0 vs 15); 7DXAW0ZBDFHP F28 T1 (11 vs 0) |

### 偏差最正

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | 166 | 22 | 0.7 | 0.7 | 0.7 | 1.5 | 1.5 | 1.5 | XWPVR2NK3M5K F48 T10 (21 vs 33); N1V27SUSFYWS F48 T7 (14 vs 5) |
| SKULKING_COLONY | 338 | 82 | 0.2 | 0.2 | 0.2 | 0.3 | 0.3 | 0.3 | 92MWCWJCFDAE F7 T4 (19 vs 0); CY8UG7ABBSAS F15 T4 (17 vs 0) |
| EYE_WITH_TEETH | 85 | 51 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 0.2 | N95WHBGC4CG9 F15 T3 (15 vs 0); P78Z8AGNN9Z3 F14 T3 (15 vs 17) |
| NOISEBOT | 22 | 11 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JW925EDF9ZTQ F39 T3 (3 vs 1); H5MZ6BKA1HVS F44 T3 (27 vs 27) |
| VANTOM | 527 | 72 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 0.2 | S780Y1W7AQZL F17 T5 (79 vs 4); 842N6N604DVX F17 T6 (11 vs 17) |
| ZAPBOT | 24 | 15 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JW925EDF9ZTQ F39 T3 (3 vs 1); H5MZ6BKA1HVS F44 T2 (2 vs 2) |
| FOGMOG | 149 | 58 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | N95WHBGC4CG9 F15 T3 (15 vs 0); P78Z8AGNN9Z3 F14 T3 (15 vs 17) |
| TRACKER_RUBY_RAIDER | 75 | 33 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | 75P1G37W7CB3 F5 T3 (12 vs 0); 981WMX8MQ7DK F13 T2 (10 vs 0) |
| GREMLIN_MERC | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); DG1CDGW8Y5JE F11 T1 (1 vs 1) |
| SOUL_FYSH | 752 | 80 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 | 0.2 | 4UWKHE61JLK4 F17 T12 (6 vs 14); F6NT0JYR6NLS F17 T11 (8 vs 0) |
| CROSSBOW_RUBY_RAIDER | 61 | 27 | 0.0 | 0.0 | 0.0 | 0.3 | 0.3 | 0.3 | 981WMX8MQ7DK F13 T2 (10 vs 0); JM7B0D40WCRQ F15 T2 (10 vs 18) |
| SHRINKER_BEETLE | 466 | 179 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 2AX48ZA9H9DM F5 T3 (13 vs 0); QZQU8860HG2F F12 T3 (8 vs 20) |
| WRIGGLER | 256 | 80 | 0.0 | 0.0 | 0.0 | 0.3 | 0.3 | 0.3 | V3UPVVLVMEJZ F14 T6 (8 vs 0); 24DPW2ED71QM F14 T4 (4 vs 12) |
| FOSSIL_STALKER | 170 | 77 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 5HHLMV2DZ5AZ F14 T2 (8 vs 0); 0YG4ETM3MLHS F11 T2 (6 vs 12) |
| ENTOMANCER | 342 | 75 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | B6ACRLQYB83N F29 T4 (8 vs 0); G8AQJ2YEMEHE F25 T4 (22 vs 28) |

### |误差| 最大

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | 166 | 22 | 0.7 | 0.7 | 0.7 | 1.5 | 1.5 | 1.5 | XWPVR2NK3M5K F48 T10 (21 vs 33); N1V27SUSFYWS F48 T7 (14 vs 5) |
| TEST_SUBJECT | 136 | 20 | -0.5 | -0.5 | -0.5 | 0.7 | 0.7 | 0.7 | 1HF7GR4PZAPC F48 T1 (1 vs 14); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| SCROLL_OF_BITING | 132 | 73 | -0.1 | -0.1 | -0.1 | 0.7 | 0.7 | 0.7 | 75P1G37W7CB3 F36 T1 (13 vs 0); M6P7KAWMF6BC F37 T2 (1 vs 13) |
| LIVING_SHIELD | 115 | 61 | -0.3 | -0.3 | -0.3 | 0.7 | 0.7 | 0.7 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| TURRET_OPERATOR | 133 | 61 | -0.3 | -0.3 | -0.3 | 0.6 | 0.6 | 0.6 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| TRACKER_RUBY_RAIDER | 75 | 33 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | 75P1G37W7CB3 F5 T3 (12 vs 0); 981WMX8MQ7DK F13 T2 (10 vs 0) |
| THE_LOST | 68 | 23 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| PARAFRIGHT | 277 | 93 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | FA82FQHSJG2F F27 T8 (1 vs 25); ZRYR5WLG6E9K F23 T3 (0 vs 17) |
| DECIMILLIPEDE_SEGMENT_BACK | 227 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| DECIMILLIPEDE_SEGMENT_MIDDLE | 229 | 67 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| THE_FORGOTTEN | 88 | 24 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); 3DGZWZ09GKQ4 F37 T2 (15 vs 27) |
| AXE_RUBY_RAIDER | 71 | 32 | -0.1 | -0.1 | -0.1 | 0.5 | 0.5 | 0.5 | 75P1G37W7CB3 F5 T3 (12 vs 0); G8AQJ2YEMEHE F9 T3 (6 vs 12) |
| SOUL_NEXUS | 71 | 16 | -0.2 | -0.2 | -0.2 | 0.5 | 0.5 | 0.5 | CRRPX9MWJZGM F45 T1 (23 vs 29); Q8XR6EXAF6QV F43 T5 (8 vs 3) |
| DECIMILLIPEDE_SEGMENT_FRONT | 231 | 67 | -0.2 | -0.2 | -0.2 | 0.4 | 0.4 | 0.4 | 1WSHZ8ML4EVF F27 T6 (0 vs 16); YN4ETG9Z8ERN F29 T2 (5 vs 19) |
| OWL_MAGISTRATE | 93 | 25 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | ZPPVDTSFJXJM F39 T1 (6 vs 16); G1Z0X3WBH4XQ F44 T2 (13 vs 18) |

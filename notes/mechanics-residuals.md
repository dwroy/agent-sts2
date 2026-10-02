# 机制残差：求解器预测的本回合掉血 vs 实际（mechanics audit 输入）

`npx tsx tools/mechanics-residuals.ts run`（2026-10-02；怪物数据库 6112 场，最后 2026-10-02T06:09:46.712Z）。不调用任何模型。
每个记录的战斗回合：取这回合第一个规划决策的状态，用现在的代码规划三次（见下，不跑推演），在求解器的线里找出这回合实际打出的线（出牌和喝药的卡 id + 目标，从这个决策到结束回合），
它预测的本回合掉血 hp_lost 对比实际掉血（这一帧的血量 − 下回合第一帧的血量；当回合打赢取战斗最后一帧，死了是全部）。残差 = 实际 − 预测：**负数 = 求解器高估了掉血**。
「被去掉」= 决策时敌人身上有、结束回合那一帧（敌人还活着）没有或降到 0 的能力。分组里一个回合可以同时在多个组。docs/mechanics-learning.md 有口径和学习者任务。

回合 28646：能对上实际打出的线且有实际掉血的 27847，对不上的 519（打了决策之后抽到的牌、旧代码的线现在不再生成等），战斗在敌方回合结束（没有之后的帧）的 280。
比较的是这回合第一个规划决策的 22488 个，第二、第三个的 4334 / 1025 个（第一个之后抽到的牌打出了，就用之后重新规划的那个决策；它离回合结束更近，误差自然更小）。其中我们死了的 372 个（实际 = 全部血量，预测高于它的按它算；求解器的 hp_lost 不算沙坑等「直接死亡」，早期日志里也有放弃的局记成死亡）。
三种：off = MECH_RULES 关；on = MECH_RULES 开（v4 3488dc5 的实盘）；move = 再开 MECH_MOVE_RULES（学到的换招 + 凯撒蟹背后攻击要两只钳子都活着）。Surrounded 的朝向按实盘当时记的给（这场战斗里这个决策之前最后一次指定目标的出牌或喝药；之前一次都没有才按 startFacing）。
全部：偏差 off -0.1 / on -0.1 / move -0.1，|误差| off 0.2 / on 0.2 / move 0.2（n=27847）。

## MECH_MOVE_RULES 核对

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| 凯撒蟹：全部回合 | 537 | 78 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| 凯撒蟹：两只钳子都活着、本回合没死 | 475 | 78 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | HME0FA7VA0J6 F33 T6 (-14 vs 10); RRMYC7MCSYX8 F33 T3 (1 vs 13) |
| 凯撒蟹：本回合一只钳子死了（另一只的蟹之怒被去掉） | 16 | 16 | -7.1 | -7.1 | -6.2 | 7.1 | 7.1 | 6.2 | GGF8C3G76C7B F33 T14 (0 vs 55); 8L29N792FA45 F33 T4 (2 vs 19) |
| 凯撒蟹：只剩一只钳子 | 46 | 26 | 0.3 | 0.3 | 0.0 | 0.4 | 0.4 | 0.1 | 8L29N792FA45 F33 T5 (11 vs 5); NWVLG96EE54U F33 T8 (5 vs 1) |
| 巨斧机器人：全部回合 | 160 | 27 | -0.1 | -0.1 | -0.1 | 0.2 | 0.2 | 0.2 | JR66CJ9T8H7W F45 T6 (0 vs 9); H14TDJAE4JB9 F38 T6 (15 vs 21) |
| 巨斧机器人：本回合复活（库存被拿掉） | 21 | 15 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| 打出的线触发了学到的换招 | 21 | 15 | -0.1 | -0.1 | -0.1 | 0.1 | 0.1 | 0.1 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| move 和 on 的预测不同的回合 | 11 | 9 | -0.5 | -0.5 | -0.4 | 3.4 | 3.4 | 0.4 | NX48MBG3SPRJ F33 T7 (3 vs 10); 8L29N792FA45 F33 T5 (11 vs 5) |

预测变了的回合（move ≠ on）11 个：JR66CJ9T8H7W F33 T7（实际 7，on 10 → move 7）；TEK4MLSEGC4P F33 T7（实际 1，on 3 → move 1）；NWVLG96EE54U F33 T6（实际 8，on 5 → move 8）；NWVLG96EE54U F33 T8（实际 5，on 1 → move 5）；NX48MBG3SPRJ F33 T7（实际 3，on 10 → move 7）；NX48MBG3SPRJ F33 T8（实际 5，on 2 → move 5）；5DFXQLAMFUB2 F33 T6（实际 0，on 1 → move 0）；M75JX3KS80NB F33 T7（实际 5，on 8 → move 5）；1LJFBKUF51PE F33 T6（实际 11，on 13 → move 11）；8L29N792FA45 F33 T5（实际 11，on 5 → move 11）；HME0FA7VA0J6 F33 T7（实际 3，on 6 → move 3）

## 振翅核对

振翅在回合内被打光、结束回合时偷窃草蜢眩晕的回合（能对上线的）：n=16（16 场），偏差 off -3.7 → on -0.6，|误差| off 3.7 → on 0.6。
例：Q97BWZJ011BB F19 T4 (0 vs 10)；5R0G8U5TB6GY F22 T5 (1 vs 1)；MCK9SMSK40ZY F19 T4 (0 vs 0)
规则自己的核对（打出的线）：求解器说眩晕而游戏里没有 0 次；游戏里振翅打光眩晕了而求解器的线没打光 1 次（Q97BWZJ011BB F19 T4：求解器对这条线的命中数和游戏不同）。

## 单个回合残差最大的 25 个（move）

| 回合 | 实际 | 预测 move | 预测 on | 预测 off | 比较的决策 | 敌人 | 本回合被去掉 |
|---|---|---|---|---|---|---|---|
| LXB3B2WT9E0W F33 T5 | 81 | 0 | 0 | 0 | 第 2 个 | THE_INSATIABLE | — |
| S780Y1W7AQZL F17 T5 | 79 | 4 | 4 | 4 | 第 1 个 | VANTOM | — |
| GGF8C3G76C7B F33 T14 | 0 | 55 | 55 | 55 | 第 1 个 | CRUSHER, ROCKET | CRUSHER:CRAB_RAGE_POWER |
| JR66CJ9T8H7W F48 T8 | -10 | 34 | 34 | 34 | 第 1 个 | AEONGLASS | — |
| PU21Z67J65NE F33 T11 | -26 | 18 | 18 | 18 | 第 1 个 | KNOWLEDGE_DEMON | — |
| Y08TU00D9VLH F33 T5 | 48 | 6 | 6 | 6 | 第 1 个 | THE_INSATIABLE | — |
| V5S6QVVQYL37 F17 T11 | -33 | 7 | 7 | 7 | 第 1 个 | CEREMONIAL_BEAST | — |
| VTREB5A9XWS7 F23 T4 | -21 | 19 | 19 | 19 | 第 2 个 | BOWLBUG_SILK, SLUMBERING_BEETLE | — |
| 0NG27W8QBNYX F24 T2 | -18 | 17 | 17 | 17 | 第 1 个 | SPINY_TOAD | — |
| 2WUMK6PK5QHD F48 T7 | -20 | 15 | 15 | 15 | 第 1 个 | TEST_SUBJECT | — |
| SK1USHSB1U7U F17 T7 | 0 | 34 | 34 | 34 | 第 1 个 | SOUL_FYSH | — |
| TTVYCS2ADZRM F33 T6 | 33 | 0 | 0 | 0 | 第 1 个 | THE_INSATIABLE | — |
| H7W047ZCEBSA F29 T5 | 0 | 31 | 31 | 31 | 第 1 个 | TOUGH_EGG, TOUGH_EGG, TOUGH_EGG, OVICOPTER | — |
| 7MDJ256RY2UU F17 T16 | -28 | 2 | 2 | 2 | 第 1 个 | WATERFALL_GIANT | — |
| QWXKQVYQGGCJ F17 T7 | 0 | 30 | 30 | 30 | 第 1 个 | SOUL_FYSH | — |
| G1Z0X3WBH4XQ F48 T7 | -14 | 15 | 15 | 15 | 第 3 个 | AEONGLASS | — |
| FSPKJAYY3ET6 F27 T3 | 2 | 29 | 29 | 29 | 第 1 个 | MYTE | — |
| YQL8D59999AX F31 T4 | -1 | 25 | 25 | 25 | 第 1 个 | ENTOMANCER | — |
| FA82FQHSJG2F F27 T8 | 1 | 25 | 25 | 25 | 第 2 个 | PARAFRIGHT, THE_OBSCURA | — |
| HME0FA7VA0J6 F33 T6 | -14 | 10 | 10 | 10 | 第 1 个 | CRUSHER, ROCKET | — |
| MAHAHJY541KJ F17 T7 | 1 | 25 | 25 | 25 | 第 1 个 | SOUL_FYSH | — |
| NWVLG96EE54U F46 T4 | 0 | 24 | 24 | 24 | 第 2 个 | FROG_KNIGHT | — |
| SK1USHSB1U7U F37 T4 | 2 | 26 | 26 | 26 | 第 2 个 | DEVOTED_SCULPTOR | — |
| V3UPVVLVMEJZ F33 T10 | -14 | 10 | 10 | 10 | 第 1 个 | KNOWLEDGE_DEMON | — |
| VTREB5A9XWS7 F23 T2 | -7 | 17 | 17 | 17 | 第 1 个 | BOWLBUG_ROCK, BOWLBUG_SILK, SLUMBERING_BEETLE | — |

## 按场上的敌人能力（决策时）

### 偏差最负（求解器高估掉血）

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PAINFUL_STABS_POWER | 疼痛戳刺 | 每次你受到未被格挡的伤害时，将1张伤口洗入你的弃牌堆。 | — | 61 | 19 | -1.3 | -1.3 | -1.3 | 1.3 | 1.3 | 1.3 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 383 | 260 | -1.1 | -1.1 | -1.1 | 1.1 | 1.1 | 1.1 | 0NG27W8QBNYX F24 T2 (-18 vs 17); UNRLW0W3XWLD F31 T2 (16 vs 26) |
| ADAPTABLE_POWER | 适者生存 | 当这个怪物将要被击败时，它会复活变得更加强大。 | — | 106 | 20 | -1.0 | -1.0 | -1.0 | 1.1 | 1.1 | 1.1 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); 1HF7GR4PZAPC F48 T1 (1 vs 14) |
| ENRAGE_POWER | 激怒 | 每当你打出一张技能牌时，获得2点力量。 | — | 45 | 20 | -0.5 | -0.5 | -0.5 | 0.8 | 0.8 | 0.8 | 1HF7GR4PZAPC F48 T1 (1 vs 14); A8ENYFR4ZWKG F48 T1 (9 vs 15) |
| HIGH_VOLTAGE_POWER | 高电压 | 这个生物的回合结束时，会获得2点力量。 | — | 32 | 19 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | JR66CJ9T8H7W F39 T4 (7 vs 25); JW925EDF9ZTQ F39 T3 (3 vs 1) |
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 491 | 78 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| BACK_ATTACK_RIGHT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 502 | 78 | -0.5 | -0.5 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| BACK_ATTACK_LEFT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 526 | 78 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| POSSESS_STRENGTH_POWER | 抢夺力量 | 被击杀时，将偷窃的所有力量返还给玩家。 | — | 70 | 22 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); YN4ETG9Z8ERN F38 T4 (0 vs 9) |
| HATCH_POWER | 孵化 | X回合后孵化。 | — | 109 | 85 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | WM2XPDZ02BNF F25 T8 (0 vs 16); TQX5JJX3UD39 F25 T2 (0 vs 8) |
| DEXTERITY_POWER | 敏捷 | 敏捷会增加从卡牌中获得的格挡。 | — | 78 | 21 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); YN4ETG9Z8ERN F38 T4 (0 vs 9) |
| PAPER_CUTS_POWER | 纸伤难愈 | 每当这个生物对你造成未被格挡的伤害时，你失去1点最大生命。 | — | 198 | 79 | -0.4 | -0.4 | -0.4 | 0.7 | 0.7 | 0.7 | FSPKJAYY3ET6 F35 T1 (12 vs 27); GMT2Q5L6BVL0 F36 T2 (2 vs 16) |
| SOAR_POWER | 翱翔 | 在落地之前受到的伤害减少50%。 | — | 21 | 20 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | 4JGPCH3WX6JV F39 T4 (18 vs 22); 7DFB21JE2DTK F44 T4 (15 vs 17) |
| RAMPART_POWER | 盾墙 | 在玩家回合开始时，高塔炮手获得25点格挡。 | — | 118 | 61 | -0.3 | -0.3 | -0.3 | 0.8 | 0.8 | 0.8 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| ILLUSION_POWER | 幻象 | 死亡时，下回合会以完整生命值复活。 | — | 488 | 152 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | FA82FQHSJG2F F27 T8 (1 vs 25); 92MWCWJCFDAE F27 T4 (1 vs 20) |

### 偏差最正（求解器低估掉血）

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GALVANIC_POWER | 流电 | 能力牌被侵蚀为流电。 | — | 70 | 22 | 1.0 | 1.0 | 1.0 | 2.0 | 2.0 | 2.0 | YVYZ6QHA85FN F46 T4 (0 vs 16); JJ75S331VUKX F39 T1 (12 vs 0) |
| SANDPIT_POWER | 沙坑 | 无厌沙虫的能力。 | — | 429 | 70 | 0.3 | 0.3 | 0.3 | 0.7 | 0.7 | 0.7 | LXB3B2WT9E0W F33 T5 (81 vs 0); Y08TU00D9VLH F33 T5 (48 vs 6) |
| WITHERING_PRESENCE_POWER | 凋萎存在 | 你每打出6张牌，将一张凋萎加入你的手牌。 | — | 165 | 21 | 0.2 | 0.2 | 0.2 | 1.9 | 1.9 | 1.9 | JR66CJ9T8H7W F48 T8 (-10 vs 34); G1Z0X3WBH4XQ F48 T7 (-14 vs 15) |
| HARDENED_SHELL_POWER | 硬化外壳 | 这个生物每回合失去的生命值不会超过20点。 | — | 413 | 82 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 92MWCWJCFDAE F7 T4 (19 vs 0); CY8UG7ABBSAS F15 T4 (17 vs 0) |
| SHRINK_POWER | 缩小 | 这个生物的攻击伤害在3回合内减少30%。 | strips 1（1 场）→ ABOUT_TO_BLOW_MOVE 1；有攻击的 1/1 取消；非规则 | 43 | 18 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 0.2 | PU21Z67J65NE F17 T4 (6 vs 0); SUUKNZNT3KDF F17 T6 (0 vs 1) |
| NEMESIS_POWER | 天罚 | 每两个回合结束时，获得1层无实体。 | — | 36 | 14 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | CRRPX9MWJZGM F48 T8 (15 vs 5); A8ENYFR4ZWKG F48 T7 (22 vs 28) |
| SURPRISE_POWER | 意外 | 这个生物有点不太对劲…… | — | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); VKPXGMV8YV31 F15 T1 (0 vs 0) |
| THIEVERY_POWER | 偷窃 | 攻击时偷走金币。 | — | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); VKPXGMV8YV31 F15 T1 (0 vs 0) |
| TERRITORIAL_POWER | 领地意识 | 这个生物在自身回合结束时，会获得1点力量。 | — | 292 | 74 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 0H1X9QMAAQ8V F14 T4 (15 vs 0); DT1H1URTUAD8 F13 T2 (6 vs 12) |
| SUCK_POWER | 吮吸 | 这个生物每次造成未被格挡的伤害时，都会获得1点力量。 | — | 247 | 78 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 5HHLMV2DZ5AZ F14 T2 (8 vs 0); 0YG4ETM3MLHS F11 T2 (6 vs 12) |
| VIGOR_POWER | 活力 | 你的下一张攻击牌伤害增加。 | — | 220 | 86 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | RUUBXYZV5064 F15 T5 (0 vs 2); TQCZFBK7T09Y F13 T3 (0 vs 0) |
| ASLEEP_POWER | 沉睡 | TODO | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 158 | 63 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T1 (0 vs 1); W5PTC48C3B1H F17 T2 (0 vs 1) |
| RAVENOUS_POWER | 饥饿 | 当有敌人死亡时，噬尸蛞蝓会立即吃下尸体，在本回合被击晕然后获得1点力量。 | — | 974 | 247 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | GSG0Q5KP9AAU F15 T1 (0 vs 10); RBJ402TKQZ6F F15 T3 (2 vs 10) |
| SHRIEK_POWER | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | strips 90（90 场）→ STUNNED 90；有攻击的 90/90 取消；**眩晕规则** | 340 | 94 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Z7D7J1RUUJ61 F8 T2 (2 vs 9); Z7D7J1RUUJ61 F8 T4 (0 vs 4) |
| WEAK_POWER | 虚弱 | 虚弱的生物造成的攻击伤害减少25%。 | strips 12（10 场）→ BOOT_UP_MOVE 8/ABOUT_TO_BLOW_MOVE 2；有攻击的 9/11 取消；非规则 | 708 | 522 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 | 0.2 | RRMYC7MCSYX8 F15 T3 (11 vs 0); 981WMX8MQ7DK F13 T2 (10 vs 0) |

### |误差| 最大

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GALVANIC_POWER | 流电 | 能力牌被侵蚀为流电。 | — | 70 | 22 | 1.0 | 1.0 | 1.0 | 2.0 | 2.0 | 2.0 | YVYZ6QHA85FN F46 T4 (0 vs 16); JJ75S331VUKX F39 T1 (12 vs 0) |
| WITHERING_PRESENCE_POWER | 凋萎存在 | 你每打出6张牌，将一张凋萎加入你的手牌。 | — | 165 | 21 | 0.2 | 0.2 | 0.2 | 1.9 | 1.9 | 1.9 | JR66CJ9T8H7W F48 T8 (-10 vs 34); G1Z0X3WBH4XQ F48 T7 (-14 vs 15) |
| PAINFUL_STABS_POWER | 疼痛戳刺 | 每次你受到未被格挡的伤害时，将1张伤口洗入你的弃牌堆。 | — | 61 | 19 | -1.3 | -1.3 | -1.3 | 1.3 | 1.3 | 1.3 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); CRRPX9MWJZGM F48 T4 (1 vs 12) |
| THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 383 | 260 | -1.1 | -1.1 | -1.1 | 1.1 | 1.1 | 1.1 | 0NG27W8QBNYX F24 T2 (-18 vs 17); UNRLW0W3XWLD F31 T2 (16 vs 26) |
| ADAPTABLE_POWER | 适者生存 | 当这个怪物将要被击败时，它会复活变得更加强大。 | — | 106 | 20 | -1.0 | -1.0 | -1.0 | 1.1 | 1.1 | 1.1 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); 1HF7GR4PZAPC F48 T1 (1 vs 14) |
| RAMPART_POWER | 盾墙 | 在玩家回合开始时，高塔炮手获得25点格挡。 | — | 118 | 61 | -0.3 | -0.3 | -0.3 | 0.8 | 0.8 | 0.8 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| ENRAGE_POWER | 激怒 | 每当你打出一张技能牌时，获得2点力量。 | — | 45 | 20 | -0.5 | -0.5 | -0.5 | 0.8 | 0.8 | 0.8 | 1HF7GR4PZAPC F48 T1 (1 vs 14); A8ENYFR4ZWKG F48 T1 (9 vs 15) |
| PAPER_CUTS_POWER | 纸伤难愈 | 每当这个生物对你造成未被格挡的伤害时，你失去1点最大生命。 | — | 198 | 79 | -0.4 | -0.4 | -0.4 | 0.7 | 0.7 | 0.7 | FSPKJAYY3ET6 F35 T1 (12 vs 27); GMT2Q5L6BVL0 F36 T2 (2 vs 16) |
| SANDPIT_POWER | 沙坑 | 无厌沙虫的能力。 | — | 429 | 70 | 0.3 | 0.3 | 0.3 | 0.7 | 0.7 | 0.7 | LXB3B2WT9E0W F33 T5 (81 vs 0); Y08TU00D9VLH F33 T5 (48 vs 6) |
| HIGH_VOLTAGE_POWER | 高电压 | 这个生物的回合结束时，会获得2点力量。 | — | 32 | 19 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | JR66CJ9T8H7W F39 T4 (7 vs 25); JW925EDF9ZTQ F39 T3 (3 vs 1) |
| NEMESIS_POWER | 天罚 | 每两个回合结束时，获得1层无实体。 | — | 36 | 14 | 0.1 | 0.1 | 0.1 | 0.6 | 0.6 | 0.6 | CRRPX9MWJZGM F48 T8 (15 vs 5); A8ENYFR4ZWKG F48 T7 (22 vs 28) |
| ILLUSION_POWER | 幻象 | 死亡时，下回合会以完整生命值复活。 | — | 488 | 152 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | FA82FQHSJG2F F27 T8 (1 vs 25); 92MWCWJCFDAE F27 T4 (1 vs 20) |
| DEXTERITY_POWER | 敏捷 | 敏捷会增加从卡牌中获得的格挡。 | — | 78 | 21 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); YN4ETG9Z8ERN F38 T4 (0 vs 9) |
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 491 | 78 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| BACK_ATTACK_RIGHT_POWER | 后方攻击 | 从后方对你攻击时，造成的伤害增加50%。 | — | 502 | 78 | -0.5 | -0.5 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |

## 按本回合被去掉的敌人能力

### n ≥ 5，按偏差

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | strips 27（27 场）→ ENLARGING_STRIKE_MOVE 9/ADAPT_MOVE 6；有攻击的 0/18 取消；非规则 | 16 | 16 | -7.1 | -7.1 | -6.2 | 7.1 | 7.1 | 6.2 | GGF8C3G76C7B F33 T14 (0 vs 55); 8L29N792FA45 F33 T4 (2 vs 19) |
| FLUTTER_POWER | 振翅 | 从攻击牌中受到的伤害减少50%。 | strips 41（41 场）→ STUNNED 41；有攻击的 10/10 取消；**眩晕规则** | 16 | 16 | -3.7 | -0.6 | -0.6 | 3.7 | 0.6 | 0.6 | Q97BWZJ011BB F19 T4 (0 vs 10); 5R0G8U5TB6GY F22 T5 (1 vs 1) |
| WEAK_POWER | 虚弱 | 虚弱的生物造成的攻击伤害减少25%。 | strips 12（10 场）→ BOOT_UP_MOVE 8/ABOUT_TO_BLOW_MOVE 2；有攻击的 9/11 取消；非规则 | 6 | 6 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | strips 99（95 场）→ STUNNED 44/BOOT_UP_MOVE 25；有攻击的 79/93 取消；非规则 | 193 | 185 | -0.3 | -0.3 | -0.3 | 0.5 | 0.5 | 0.5 | GMT2Q5L6BVL0 F36 T2 (2 vs 16); 123ZSH58F5FS F37 T2 (2 vs 13) |
| VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | strips 73（62 场）→ ABOUT_TO_BLOW_MOVE 38/BOOT_UP_MOVE 28；有攻击的 55/62 取消；非规则 | 97 | 95 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | GG0Y0TJ2JXAR F20 T4 (0 vs 12); W6F4YXF3MT7A F46 T1 (0 vs 8) |
| CURL_UP_POWER | 蜷身 | 受到伤害时，蜷起身子并获得格挡。（每场战斗一次） | strips 92（92 场）→ WEB_CANNON_MOVE 86/CURL_AND_GROW_MOVE 6；有攻击的 0/86 取消；非规则 | 70 | 70 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 842N6N604DVX F31 T1 (3 vs 9); H5MZ6BKA1HVS F31 T1 (5 vs 9) |
| PLATING_POWER | 覆甲 | 在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层。 | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); BFVATR4WANS6 F17 T3 (0 vs 0) |
| ASLEEP_POWER | 沉睡 | TODO | strips 56（56 场）→ STUNNED 56；有攻击的 0/0 取消；**眩晕规则** | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); BFVATR4WANS6 F17 T3 (0 vs 0) |
| SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | strips 234（129 场）→ JAB_MOVE 80/WHIRLWIND_MOVE 61；有攻击的 0/134 取消；非规则 | 116 | 106 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F17 T3 (26 vs 28); WFR4AUP2CWDT F17 T4 (0 vs 0) |
| BURROWED_POWER | 埋地 | 格挡不会在其回合开始时移除。如果所有格挡被移除，则将其击晕。 | strips 122（119 场）→ STUNNED 122；有攻击的 100/100 取消；**眩晕规则** | 83 | 83 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F21 T3 (1 vs 2); VE975EGP2G3V F20 T5 (1 vs 1) |
| THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 62 | 62 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | WQ67U1UY1D8V F5 T2 (0 vs 2); 5LRZ7HJ7YGSY F3 T2 (6 vs 4) |
| SHRIEK_POWER | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | strips 90（90 场）→ STUNNED 90；有攻击的 90/90 取消；**眩晕规则** | 77 | 77 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 4JVP9LTXYY9D F9 T3 (1 vs 1); 5FMUSNUXEHGY F8 T3 (0 vs 0) |
| STOCK_POWER | 库存 | 被击杀时，召唤一个全新的巨斧机器人。 | strips 23（23 场）→ BOOT_UP_MOVE 23；有攻击的 21/21 取消；非规则 | 10 | 10 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | P4ZDR744B9JC F37 T6 (0 vs 0); H14TDJAE4JB9 F38 T5 (0 vs 0) |
| PLOW_POWER | 横冲直撞 | 这个生物的生命值第一次下降到150或更低时，将其击晕。 | strips 46（46 场）→ STUNNED 46；有攻击的 46/46 取消；**眩晕规则** | 38 | 38 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 94FPBTS15SQT F17 T5 (0 vs 0); 02L476J8QWGH F17 T4 (1 vs 1) |
| ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | strips 138（124 场）→ CHARGE_UP_MOVE 23/READY_MOVE 22；有攻击的 0/59 取消；非规则 | 100 | 91 | 0.1 | 0.1 | 0.1 | 0.4 | 0.4 | 0.4 | VG7HWJRX44RQ F8 T2 (21 vs 13); NWVLG96EE54U F48 T7 (11 vs 5) |

### 怪物 × 被去掉的能力

| 能力 | 名称 | 描述 | 观察到的 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRUSHER × CRAB_RAGE_POWER | 蟹之怒 | 当有盟友死亡时，这个生物获得5点力量和99点格挡。 | — | 16 | 16 | -7.1 | -7.1 | -6.2 | 7.1 | 7.1 | 6.2 | GGF8C3G76C7B F33 T14 (0 vs 55); 8L29N792FA45 F33 T4 (2 vs 19) |
| SCROLL_OF_BITING × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 16 | 15 | -2.0 | -2.0 | -2.0 | 2.0 | 2.0 | 2.0 | GMT2Q5L6BVL0 F36 T2 (2 vs 16); 123ZSH58F5FS F37 T2 (2 vs 13) |
| EXOSKELETON × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 12 | 12 | -1.0 | -1.0 | -1.0 | 1.0 | 1.0 | 1.0 | GG0Y0TJ2JXAR F20 T4 (0 vs 12); UMX6X5FPP30L F20 T4 (0 vs 0) |
| THIEVING_HOPPER × FLUTTER_POWER（眩晕） | 振翅 | 从攻击牌中受到的伤害减少50%。 | — | 16 | 16 | -3.7 | -0.6 | -0.6 | 3.7 | 0.6 | 0.6 | Q97BWZJ011BB F19 T4 (0 vs 10); 5R0G8U5TB6GY F22 T5 (1 vs 1) |
| AXEBOT × WEAK_POWER | 虚弱 | 虚弱的生物造成的攻击伤害减少25%。 | — | 5 | 5 | -0.6 | -0.6 | -0.6 | 0.6 | 0.6 | 0.6 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| PHANTASMAL_GARDENER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 35 | 35 | -0.6 | -0.6 | -0.6 | 0.6 | 0.6 | 0.6 | G3MU2NADPEDU F14 T3 (3 vs 12); VCM94LZR1DTA F7 T4 (4 vs 11) |
| MECHA_KNIGHT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 6 | 6 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | YFG53EZ372D7 F44 T3 (1 vs 4); VE975EGP2G3V F44 T5 (3 vs 3) |
| AXEBOT × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 8 | 7 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T2 (2 vs 2) |
| TOADPOLE × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 6 | 6 | -0.3 | -0.3 | -0.3 | 0.3 | 0.3 | 0.3 | WQ67U1UY1D8V F5 T2 (0 vs 2); 24UZ3PZNLKTQ F5 T2 (2 vs 2) |
| AXEBOT × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 13 | 11 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | W80JV2YVC8UZ F45 T2 (-3 vs 0); P4ZDR744B9JC F37 T4 (12 vs 12) |
| MYTE × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 5 | 5 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 3MDJW1UAD5M6 F31 T4 (0 vs 1); FN0HCB4DVKZK F22 T6 (18 vs 18) |
| LOUSE_PROGENITOR × CURL_UP_POWER | 蜷身 | 受到伤害时，蜷起身子并获得格挡。（每场战斗一次） | — | 70 | 70 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 842N6N604DVX F31 T1 (3 vs 9); H5MZ6BKA1HVS F31 T1 (5 vs 9) |
| EXOSKELETON × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 36 | 31 | -0.2 | -0.2 | -0.2 | 0.2 | 0.2 | 0.2 | 92MWCWJCFDAE F31 T2 (5 vs 8); NH8A3VBDRDZW F27 T2 (2 vs 5) |
| WRIGGLER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 24 | 24 | -0.1 | -0.1 | -0.1 | 0.6 | 0.6 | 0.6 | M9PL14MGKZCN F7 T6 (6 vs 14); 9GRPS5DC8KHN F7 T5 (6 vs 0) |
| CHOMPER × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 22 | 16 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | GG0Y0TJ2JXAR F27 T2 (10 vs 11); ZANMLV9UU31K F23 T3 (0 vs 0) |
| VANTOM × SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | — | 61 | 61 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F17 T3 (26 vs 28); WFR4AUP2CWDT F17 T4 (0 vs 0) |
| LAGAVULIN_MATRIARCH × PLATING_POWER（眩晕） | 覆甲 | 在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层。 | — | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); BFVATR4WANS6 F17 T3 (0 vs 0) |
| LAGAVULIN_MATRIARCH × ASLEEP_POWER（眩晕） | 沉睡 | TODO | — | 47 | 47 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | W5PTC48C3B1H F17 T3 (0 vs 1); BFVATR4WANS6 F17 T3 (0 vs 0) |
| TUNNELER × BURROWED_POWER（眩晕） | 埋地 | 格挡不会在其回合开始时移除。如果所有格挡被移除，则将其击晕。 | — | 83 | 83 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G1Z0X3WBH4XQ F21 T3 (1 vs 2); VE975EGP2G3V F20 T5 (1 vs 1) |
| TOADPOLE × THORNS_POWER | 荆棘 | 当被攻击命中时，反击造成伤害。 | — | 62 | 62 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | WQ67U1UY1D8V F5 T2 (0 vs 2); 5LRZ7HJ7YGSY F3 T2 (6 vs 4) |
| PHANTASMAL_GARDENER × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 13 | 12 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | G6YVT0ALVQ65 F9 T2 (10 vs 10); V1Y4D9Y9GMVK F12 T4 (0 vs 0) |
| TERROR_EEL × SHRIEK_POWER（眩晕） | 尖叫 | 这个生物的生命值第一次降到50%或以下时，会被击晕。 | — | 77 | 77 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 4JVP9LTXYY9D F9 T3 (1 vs 1); 5FMUSNUXEHGY F8 T3 (0 vs 0) |
| INKLET × SLIPPERY_POWER | 滑溜 | 这个生物下一次要失去生命值时，只会失去1点生命。 | — | 55 | 45 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | MGJ8W6C8L1DG F12 T1 (2 vs 2); MGJ8W6C8L1DG F12 T3 (1 vs 1) |
| AXEBOT × STOCK_POWER | 库存 | 被击杀时，召唤一个全新的巨斧机器人。 | — | 10 | 10 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | P4ZDR744B9JC F37 T6 (0 vs 0); H14TDJAE4JB9 F38 T5 (0 vs 0) |
| CEREMONIAL_BEAST × PLOW_POWER（眩晕） | 横冲直撞 | 这个生物的生命值第一次下降到150或更低时，将其击晕。 | — | 38 | 38 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 94FPBTS15SQT F17 T5 (0 vs 0); 02L476J8QWGH F17 T4 (1 vs 1) |
| CEREMONIAL_BEAST × STRENGTH_POWER（眩晕） | 力量 | 力量会增加攻击牌造成的伤害。 | — | 37 | 37 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 94FPBTS15SQT F17 T5 (0 vs 0); 02L476J8QWGH F17 T4 (1 vs 1) |
| WATERFALL_GIANT × VULNERABLE_POWER | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 14 | 14 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | R6V3T4KSDABE F17 T5 (3 vs 3); 9NE1DHFGZC2K F17 T9 (0 vs 0) |
| CORPSE_SLUG × VULNERABLE_POWER（眩晕） | 易伤 | 易伤的生物从攻击中受到的伤害增加50%。 | — | 20 | 20 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | MX8KZU7ABQBQ F2 T3 (0 vs 0); 77QXNB8RFSQQ F2 T2 (0 vs 0) |
| WATERFALL_GIANT × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 7 | 7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | RBJ402TKQZ6F F17 T6 (0 vs 0); YQL8D59999AX F17 T7 (0 vs 0) |
| CUBEX_CONSTRUCT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 31 | 31 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 | 0.2 | 2XWM27TZ7T12 F14 T2 (5 vs 2); Z3DFG85QDRCD F39 T3 (7 vs 9) |
| KIN_FOLLOWER × STRENGTH_POWER | 力量 | 力量会增加攻击牌造成的伤害。 | — | 13 | 13 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JGJS7QE62GLD F17 T3 (6 vs 5); CMUXQKE4UDJ4 F17 T2 (10 vs 10) |
| PUNCH_CONSTRUCT × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 35 | 34 | 0.1 | 0.1 | 0.1 | 0.3 | 0.3 | 0.3 | VG7HWJRX44RQ F8 T2 (21 vs 13); H5MZ6BKA1HVS F38 T4 (6 vs 10) |
| AEONGLASS × ARTIFACT_POWER | 人工制品 | 免疫负面效果。 | — | 9 | 9 | 1.0 | 1.0 | 1.0 | 2.1 | 2.1 | 2.1 | NWVLG96EE54U F48 T7 (11 vs 5); JJ75S331VUKX F48 T5 (5 vs 0) |

## 按敌人

### 偏差最负

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| GUARDBOT | 23 | 11 | -0.8 | -0.8 | -0.8 | 1.7 | 1.7 | 1.7 | JR66CJ9T8H7W F39 T4 (7 vs 25); F4K88F267RCX F37 T4 (4 vs 15) |
| TEST_SUBJECT | 142 | 20 | -0.7 | -0.7 | -0.7 | 0.9 | 0.9 | 0.9 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); 1HF7GR4PZAPC F48 T1 (1 vs 14) |
| STABBOT | 27 | 17 | -0.7 | -0.7 | -0.7 | 1.5 | 1.5 | 1.5 | JR66CJ9T8H7W F39 T4 (7 vs 25); F4K88F267RCX F37 T4 (4 vs 15) |
| TOUGH_EGG | 237 | 85 | -0.6 | -0.6 | -0.6 | 0.7 | 0.7 | 0.7 | H7W047ZCEBSA F29 T5 (0 vs 31); WM2XPDZ02BNF F25 T8 (0 vs 16) |
| SPINY_TOAD | 379 | 97 | -0.6 | -0.6 | -0.6 | 0.6 | 0.6 | 0.6 | 0NG27W8QBNYX F24 T2 (-18 vs 17); UNRLW0W3XWLD F31 T2 (16 vs 26) |
| FROG_KNIGHT | 111 | 23 | -0.5 | -0.5 | -0.5 | 0.5 | 0.5 | 0.5 | NWVLG96EE54U F46 T4 (0 vs 24); A8ENYFR4ZWKG F42 T1 (5 vs 11) |
| ZAPBOT | 32 | 19 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | JR66CJ9T8H7W F39 T4 (7 vs 25); JW925EDF9ZTQ F39 T3 (3 vs 1) |
| PARAFRIGHT | 353 | 97 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | FA82FQHSJG2F F27 T8 (1 vs 25); 92MWCWJCFDAE F27 T4 (1 vs 20) |
| ROCKET | 502 | 78 | -0.5 | -0.5 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| SLUMBERING_BEETLE | 493 | 89 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | VTREB5A9XWS7 F23 T4 (-21 vs 19); VTREB5A9XWS7 F23 T2 (-7 vs 17) |
| CRUSHER | 526 | 78 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | GGF8C3G76C7B F33 T14 (0 vs 55); HME0FA7VA0J6 F33 T6 (-14 vs 10) |
| THE_LOST | 70 | 22 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | Q8XR6EXAF6QV F37 T4 (0 vs 16); YN4ETG9Z8ERN F38 T4 (0 vs 9) |
| OVICOPTER | 376 | 89 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | H7W047ZCEBSA F29 T5 (0 vs 31); WM2XPDZ02BNF F25 T8 (0 vs 16) |
| TOADPOLE | 601 | 178 | -0.4 | -0.4 | -0.4 | 0.4 | 0.4 | 0.4 | H7W047ZCEBSA F6 T3 (4 vs 10); HEACJRY5LEVD F7 T4 (-6 vs 0) |
| BOWLBUG_SILK | 492 | 137 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | VTREB5A9XWS7 F23 T4 (-21 vs 19); VTREB5A9XWS7 F23 T2 (-7 vs 17) |

### 偏差最正

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| GLOBE_HEAD | 70 | 22 | 1.0 | 1.0 | 1.0 | 2.0 | 2.0 | 2.0 | YVYZ6QHA85FN F46 T4 (0 vs 16); JJ75S331VUKX F39 T1 (12 vs 0) |
| THE_INSATIABLE | 495 | 70 | 0.2 | 0.2 | 0.2 | 0.6 | 0.6 | 0.6 | LXB3B2WT9E0W F33 T5 (81 vs 0); Y08TU00D9VLH F33 T5 (48 vs 6) |
| AEONGLASS | 165 | 21 | 0.2 | 0.2 | 0.2 | 1.9 | 1.9 | 1.9 | JR66CJ9T8H7W F48 T8 (-10 vs 34); G1Z0X3WBH4XQ F48 T7 (-14 vs 15) |
| SKULKING_COLONY | 413 | 82 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 92MWCWJCFDAE F7 T4 (19 vs 0); CY8UG7ABBSAS F15 T4 (17 vs 0) |
| MYSTERIOUS_KNIGHT | 22 | 5 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 4V5TA3ZG6MJS F23 T4 (2 vs 0); 4V5TA3ZG6MJS F23 T1 (5 vs 5) |
| EYE_WITH_TEETH | 135 | 55 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | N95WHBGC4CG9 F15 T3 (15 vs 0); P78Z8AGNN9Z3 F14 T3 (15 vs 17) |
| NOISEBOT | 24 | 15 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | JW925EDF9ZTQ F39 T3 (3 vs 1); 8XQMYEN4MZ36 F46 T3 (0 vs 0) |
| VANTOM | 581 | 71 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 0.2 | S780Y1W7AQZL F17 T5 (79 vs 4); 842N6N604DVX F17 T6 (11 vs 17) |
| GREMLIN_MERC | 217 | 76 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | NWVLG96EE54U F15 T2 (11 vs 0); VKPXGMV8YV31 F15 T1 (0 vs 0) |
| FOGMOG | 203 | 57 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | N95WHBGC4CG9 F15 T3 (15 vs 0); P78Z8AGNN9Z3 F14 T3 (15 vs 17) |
| CROSSBOW_RUBY_RAIDER | 65 | 27 | 0.0 | 0.0 | 0.0 | 0.3 | 0.3 | 0.3 | 981WMX8MQ7DK F13 T2 (10 vs 0); JM7B0D40WCRQ F15 T2 (10 vs 18) |
| BYRDONIS | 292 | 74 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 0H1X9QMAAQ8V F14 T4 (15 vs 0); DT1H1URTUAD8 F13 T2 (6 vs 12) |
| FOSSIL_STALKER | 247 | 78 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 5HHLMV2DZ5AZ F14 T2 (8 vs 0); 0YG4ETM3MLHS F11 T2 (6 vs 12) |
| WRIGGLER | 332 | 85 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 | 0.2 | 5TQX4PBBB9ZU F11 T6 (8 vs 0); V3UPVVLVMEJZ F14 T6 (8 vs 0) |
| SHRINKER_BEETLE | 601 | 179 | 0.0 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 2AX48ZA9H9DM F5 T3 (13 vs 0); QZQU8860HG2F F12 T3 (8 vs 20) |

### |误差| 最大

| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |
|---|---|---|---|---|---|---|---|---|---|
| GLOBE_HEAD | 70 | 22 | 1.0 | 1.0 | 1.0 | 2.0 | 2.0 | 2.0 | YVYZ6QHA85FN F46 T4 (0 vs 16); JJ75S331VUKX F39 T1 (12 vs 0) |
| AEONGLASS | 165 | 21 | 0.2 | 0.2 | 0.2 | 1.9 | 1.9 | 1.9 | JR66CJ9T8H7W F48 T8 (-10 vs 34); G1Z0X3WBH4XQ F48 T7 (-14 vs 15) |
| GUARDBOT | 23 | 11 | -0.8 | -0.8 | -0.8 | 1.7 | 1.7 | 1.7 | JR66CJ9T8H7W F39 T4 (7 vs 25); F4K88F267RCX F37 T4 (4 vs 15) |
| STABBOT | 27 | 17 | -0.7 | -0.7 | -0.7 | 1.5 | 1.5 | 1.5 | JR66CJ9T8H7W F39 T4 (7 vs 25); F4K88F267RCX F37 T4 (4 vs 15) |
| TEST_SUBJECT | 142 | 20 | -0.7 | -0.7 | -0.7 | 0.9 | 0.9 | 0.9 | 2WUMK6PK5QHD F48 T7 (-20 vs 15); 1HF7GR4PZAPC F48 T1 (1 vs 14) |
| LIVING_SHIELD | 118 | 61 | -0.3 | -0.3 | -0.3 | 0.8 | 0.8 | 0.8 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| TOUGH_EGG | 237 | 85 | -0.6 | -0.6 | -0.6 | 0.7 | 0.7 | 0.7 | H7W047ZCEBSA F29 T5 (0 vs 31); WM2XPDZ02BNF F25 T8 (0 vs 16) |
| SCROLL_OF_BITING | 198 | 79 | -0.4 | -0.4 | -0.4 | 0.7 | 0.7 | 0.7 | FSPKJAYY3ET6 F35 T1 (12 vs 27); GMT2Q5L6BVL0 F36 T2 (2 vs 16) |
| TRACKER_RUBY_RAIDER | 82 | 33 | -0.1 | -0.1 | -0.1 | 0.6 | 0.6 | 0.6 | 75P1G37W7CB3 F5 T3 (12 vs 0); 981WMX8MQ7DK F13 T2 (10 vs 0) |
| PARAFRIGHT | 353 | 97 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | FA82FQHSJG2F F27 T8 (1 vs 25); 92MWCWJCFDAE F27 T4 (1 vs 20) |
| ZAPBOT | 32 | 19 | -0.5 | -0.5 | -0.5 | 0.6 | 0.6 | 0.6 | JR66CJ9T8H7W F39 T4 (7 vs 25); JW925EDF9ZTQ F39 T3 (3 vs 1) |
| THE_INSATIABLE | 495 | 70 | 0.2 | 0.2 | 0.2 | 0.6 | 0.6 | 0.6 | LXB3B2WT9E0W F33 T5 (81 vs 0); Y08TU00D9VLH F33 T5 (48 vs 6) |
| SPINY_TOAD | 379 | 97 | -0.6 | -0.6 | -0.6 | 0.6 | 0.6 | 0.6 | 0NG27W8QBNYX F24 T2 (-18 vs 17); UNRLW0W3XWLD F31 T2 (16 vs 26) |
| TURRET_OPERATOR | 182 | 64 | -0.2 | -0.2 | -0.2 | 0.6 | 0.6 | 0.6 | 8L29N792FA45 F35 T2 (16 vs 1); G1Z0X3WBH4XQ F35 T1 (12 vs 25) |
| SLUMBERING_BEETLE | 493 | 89 | -0.4 | -0.4 | -0.4 | 0.5 | 0.5 | 0.5 | VTREB5A9XWS7 F23 T4 (-21 vs 19); VTREB5A9XWS7 F23 T2 (-7 vs 17) |

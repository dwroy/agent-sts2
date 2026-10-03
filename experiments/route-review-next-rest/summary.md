# Route review next_rest replay (tools/route-review-next-rest-replay.ts)

Logged route reviews with a plan in logs/brain.jsonl (from 09-30): 1926 rebuilt; skipped {}.
Outcomes: keep 1872, change 46, invalid 0, none 8.

Added to the question (the next_rest field as JSON, chars): median 579, p90 873, max 1820; the route_review block today: median 3219; plus 83 chars in the instructions.
As a share of the question's user message (memory, question, options, state; median 20479.5 chars): median 2.9%, max 10.9%.
Switch lines per review: 0: 0, 1: 1368, 2: 333, 3: 147, 4: 49, 5: 9, 6: 20. Reviews with at least one flagged switch line, of 1926: at 10% median / 15% p75: any flag 761 (39.5%), rest floor 451 (23.4%) (1015 (52.7%) without the elite-count rule), elite entry 457 (23.7%); at 15% median / 20% p75: any flag 687 (35.7%), rest floor 392 (20.4%) (967 (50.2%) without the elite-count rule), elite entry 410 (21.3%); at 20% median / 25% p75: any flag 603 (31.3%), rest floor 342 (17.8%) (923 (47.9%) without the elite-count rule), elite entry 350 (18.2%).

Changes: 46; the answer's stretch to its next rest site was the kept one 13, a listed switch line 30, another one 3; flagged at the rest floor 2, at the elite entry 2 (at 15%/20%: 1 and 2).

| run | F | label | HP | new vs kept (later rest floor; next elites) | flag: rest floor | flag: elite entry | listed | real | route_reason |
|---|---|---|---|---|---|---|---|---|---|
| 0QSB9YV3UFCL | 19 | reward/card | 70/80 | 到 F32 时新路线约 30/80，保留路线约 21/80（p75 耗尽 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F29 r11c1 进场 64/80（p75 27） |  |  | switch | F32 7/80 | 避F29精英，保HP且末段有店有火堆 |
| 41VAUAM2EFY7 | 6 | reward/card | 51/80 | 到 F8 时新路线约 51/80，保留路线约 33/80（p75 49 对 21）；下一只精英：新路线 boss 前没有精英，保留路线 F7 r6c3 进场 51/80（p75 51） |  |  | switch | F8 51/80 | HP64%低于精英线，改走问号 |
| 41VAUAM2EFY7 | 7 | event/plan | 51/80 | 下一只精英：新路线 F14 r13c5 进场 80/80（p75 80），保留路线 boss 前没有精英 |  |  | same | F8 51/80 | F13满血火堆锻造，顺路加打F14精英(后有火堆) |
| WLM6YKJ0ASNE | 21 | reward/card | 81/102 | 到 F25 时新路线约 92/102，保留路线约 29/102（p75 73 对 耗尽）；下一只精英：新路线 F25 r7c4 进场 92/102（p75 73），保留路线 F24 r6c2 进场 62/102（p75 43） |  |  | switch | F24 71/102 | 休息置于精英前，保满血进boss |
| A8ENYFR4ZWKG | 11 | reward/card | 45/80 | 到 F16 时新路线约 39/80，保留路线约 21/80（p75 23 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F12 r11c3 进场 45/80（p75 45） |  |  | switch | F16 34/80 | 45血0药，跳过精英保boss血量 |
| RUDHQ1KJ49P8 | 12 | event/plan | 66/80 | same stretch and elite |  |  | same | F13 66/80 | 金币已归零，改走走廊拿卡/药水 |
| 0U96U4D9Z3PP | 36 | event/choose | 66/85 | 到 F44 时新路线约 56/85，保留路线约 46/85（p75 36 对 18） |  |  | other | F44 56/85 | 问号替走廊省血，其余照计划 |
| Z3DFG85QDRCD | 27 | reward/card | 57/80 | 下一只精英：新路线 F31 r13c3 进场 80/80（p75 70），保留路线 F29 r11c2 进场 80/80（p75 80） |  |  | same | F28 57/80 | 问号免战，精英紧邻火堆 |
| QWXKQVYQGGCJ | 25 | rest/plan | 30/91 | 到 F29 时新路线约 76/91，保留路线约 18/91（p75 66 对 耗尽）；下一只精英：新路线 F29 r11c1 进场 76/91（p75 66），保留路线 F28 r10c0 进场 49/91（p75 39） |  |  | switch | F27 57/91 | 先火堆再精英，进精英约84% |
| HME0FA7VA0J6 | 24 | rest/plan | 60/80 | 到 F27 时新路线约 80/80，保留路线约 48/80（p75 75 对 35）；下一只精英：新路线 boss 前没有精英，保留路线 F25 r7c1 进场 80/80（p75 80） |  |  | switch | F27 80/80 | 跳精英保血，留锻造给螃蟹 |
| V1Y4D9Y9GMVK | 13 | rest/plan | 11/80 | 到 F16 时新路线约 31/80，保留路线约 16/80（p75 21 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F14 r13c6 进场 35/80（p75 35） |  |  | switch | F16 32/80 | 11血回血，绕开精英 |
| G3MU2NADPEDU | 21 | event/choose | 62/87 | 下一只精英：新路线 F31 r13c2 进场 79/87（p75 53），保留路线 boss 前没有精英 |  |  | same | F25 47/87 | 走商店花金，精英后接火堆 |
| G3MU2NADPEDU | 29 | reward/card | 56/87 | 到 F32 时新路线约 48/87，保留路线约 24/87（p75 34 对 11）；下一只精英：新路线 boss 前没有精英，保留路线 F31 r13c2 进场 56/87（p75 56） |  |  | switch | F32 70/87 | 避开精英，佛珠保问号安全 |
| 9FVEQKJ0Y1YQ | 11 | reward/card | 67/86 | 到 F16 时新路线约 56/86，保留路线约 31/86（p75 27 对 耗尽） |  |  | switch | F13 21/89 | 改走F12休息保血，双精英夹火堆，boss前96% |
| 9FVEQKJ0Y1YQ | 12 | reward/card | 21/89 | 下一只精英：新路线 boss 前没有精英，保留路线 F15 r14c4 进场 45/89（p75 40） |  |  | same | F13 21/89 | 避精英保血，问号有佛珠安全 |
| R31C86606UDG | 22 | event/choose | 68/80 | same stretch and elite |  |  | same | F24 51/80 | 绕开F31精英，保血进蟹战 |
| GSFSFQ3JWGEL | 13 | reward/card | 43/80 | 到 F16 时新路线约 43/80，保留路线约 26/80（p75 40 对 14）；下一只精英：新路线 boss 前没有精英，保留路线 F15 r14c2 进场 43/80（p75 43） |  |  | switch | F16 43/80 | 低血绕过F15精英走问号 |
| GSFSFQ3JWGEL | 43 | reward/card | 33/87 | 下一只精英：新路线 boss 前没有精英，保留路线 F45 r11c2 进场 59/87（p75 59） |  |  | same | F44 33/87 | 38%血避精英，保boss进场 |
| ALBM9RUA77WR | 7 | rest/plan | 74/80 | 到 F11 时新路线约 63/80，保留路线约 63/80（p75 48 对 51）；下一只精英：新路线 F9 r8c6 进场 80/80（p75 77），保留路线 F9 r8c6 进场 80/80（p75 80） |  |  | switch | F11 64/80 | 26金商店无用，改走问号 |
| R6V3T4KSDABE | 20 | event/plan | 70/80 | 到 F29 时新路线约 46/80，保留路线约 16/80（p75 9 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F24 r6c0 进场 54/80（p75 36） |  |  | switch | F29 66/80 | 无AOE怕千足虫，跳过精英保血 |
| GSG0Q5KP9AAU | 28 | reward/card | 9/86 | 到 F32 时新路线约 9/86，保留路线约 9/86（p75 4 对 耗尽） |  |  | switch | F32 9/86 | 9血少碰问号，双商店买药 |
| KXG79NARS0LT | 5 | event/choose | 73/80 | 到 F11 时新路线约 52/80，保留路线约 63/80（p75 31 对 52）；下一只精英：新路线 F9 r8c1 进场 69/80（p75 59），保留路线 F9 r8c2 进场 80/80（p75 80） |  | yes | switch | F11 71/80 | F7 顺路商店删打击补牌，火堆换商店 |
| 1HF7GR4PZAPC | 6 | event/choose | 70/80 | 到 F9 时新路线约 80/80，保留路线约 51/80（p75 80 对 36）；下一只精英：新路线 F15 r14c0 进场 76/80（p75 66），保留路线 F8 r7c0 进场 68/80（p75 63） |  |  | switch | F7 52/80 | 先休息再商店，避开低血精英 |
| KMB1MYF427N8 | 19 | reward/card | 53/87 | 到 F27 时新路线约 29/87，保留路线约 15/87（p75 耗尽 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F25 r7c6 进场 45/87（p75 26） |  |  | other | F27 51/87 | 避开双精英，多休息保血进boss |
| JJ75S331VUKX | 30 | reward/card | 31/80 | 到 F32 时新路线约 31/80，保留路线约 23/80（p75 26 对 14） |  |  | switch | F32 36/80 | 问号更省血，同到休息点 |
| 5DFXQLAMFUB2 | 24 | rest/plan | 57/89 | 到 F32 时新路线约 51/89，保留路线约 15/89（p75 27 对 耗尽）；下一只精英：新路线 F30 r12c5 进场 89/89（p75 89），保留路线 F28 r10c0 进场 83/89（p75 73） |  |  | switch | F27 83/89 | 少精英多休息，保血进王 |
| VNKN9952ZNA0 | 13 | event/choose | 55/80 | 到 F16 时新路线约 55/80，保留路线约 38/80（p75 53 对 28）；下一只精英：新路线 boss 前没有精英，保留路线 F15 r14c4 进场 55/80（p75 55） |  |  | other | F16 55/80 | 血量低于精英线，避战走问号保血进boss |
| VNKN9952ZNA0 | 21 | event/choose | 60/80 | 到 F32 时新路线约 54/80，保留路线约 20/80（p75 耗尽 对 耗尽）；下一只精英：新路线 F25 r7c3 进场 76/80（p75 62），保留路线 boss 前没有精英 |  |  | switch | F24 60/80 | 中路：精英前后各有休息，boss血更高 |
| VNKN9952ZNA0 | 25 | reward/card | 7/80 | 到 F27 时新路线约 7/80，保留路线约 7/80（p75 7 对 7） |  |  | switch | F27 7/80 | 飞行靴改走三火堆路线，少打两场 |
| XSPHCB4GUSEU | 27 | rest/plan | 8/80 | 到 F32 时新路线约 24/80，保留路线约 18/80（p75 耗尽 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F31 r13c5 进场 48/80（p75 34） |  |  | switch | F32 53/80 | 血少避开F31精英，走问号火堆 |
| 3DGZWZ09GKQ4 | 9 | event/plan | 54/80 | 到 F13 时新路线约 61/80，保留路线约 35/80（p75 51 对 20）；下一只精英：新路线 F12 r11c3 进场 78/80（p75 78），保留路线 F12 r11c3 进场 52/80（p75 47） |  |  | switch | F11 63/80 | 血量低于计划，精英前先休息 |
| LTKW24N3R9PG | 25 | rest/plan | 23/80 | 到 F32 时新路线约 47/80，保留路线约 23/80（p75 18 对 耗尽） |  |  | switch | F27 47/80 | 弃商店，多一个火堆保血 |
| LTKW24N3R9PG | 36 | reward/card | 27/74 | 下一只精英：新路线 F42 r8c2 进场 41/74（p75 27），保留路线 F43 r9c4 进场 41/74（p75 27） |  |  | same | F40 36/94 | 精英后接火堆，避开第二只精英 |
| LTKW24N3R9PG | 39 | event/choose | 16/74 | 下一只精英：新路线 F43 r9c4 进场 38/74（p75 38），保留路线 F42 r8c2 进场 38/74（p75 38） |  |  | same | F40 36/94 | 改走两商店，花269金找力量/删牌 |
| 1YXMHF6FSPK4 | 9 | reward/card | 48/80 | 到 F12 时新路线约 46/80，保留路线约 21/80（p75 41 对 10）；下一只精英：新路线 boss 前没有精英，保留路线 F11 r10c5 进场 48/80（p75 48） |  |  | switch | F12 50/80 | 60% 血不足，绕开精英走普通战 |
| XPDAUKKM1UT6 | 11 | reward/card | 47/80 | 到 F13 时新路线约 45/80，保留路线约 20/80（p75 40 对 9）；下一只精英：新路线 F14 r13c6 进场 69/80（p75 64），保留路线 F12 r11c5 进场 47/80（p75 47） |  |  | switch | F13 26/80 | 47血跳过精英，改普通战保血 |
| XPDAUKKM1UT6 | 12 | reward/card | 26/80 | 下一只精英：新路线 boss 前没有精英，保留路线 F14 r13c6 进场 50/80（p75 50） |  |  | same | F13 26/80 | 26血0药，跳过精英保boss血 |
| R1QJUBVBSSB2 | 5 | event/choose | 61/80 | 到 F12 时新路线约 55/80，保留路线约 51/80（p75 34 对 30）；下一只精英：新路线 F15 r14c5 进场 77/80（p75 45），保留路线 F11 r10c0 进场 78/80（p75 66） |  | yes | switch | F12 28/80 | F7改走商店兑现318金补强 |
| R1QJUBVBSSB2 | 11 | reward/card | 28/80 | 下一只精英：新路线 boss 前没有精英，保留路线 F15 r14c5 进场 50/80（p75 39） |  |  | same | F12 28/80 | 保血进boss，避开精英 |
| SMNJTGSHFMME | 23 | event/plan | 90/90 | 到 F25 时新路线约 81/90，保留路线约 90/90（p75 72 对 90） | yes |  | switch | F25 68/90 | 商店仅8金无用，改打怪拿卡 |
| EQL95K9F3LKQ | 44 | reward/card | 28/80 | 到 F47 时新路线约 15/80，保留路线约 1/80（p75 耗尽 对 耗尽） |  |  | switch | died F45 | 低血改走问号，省一场战斗 |
| UK7R9A0NMCXL | 23 | event/plan | 37/80 | 到 F29 时新路线约 80/80，保留路线约 19/80（p75 80 对 耗尽）；下一只精英：新路线 F30 r12c1 进场 80/80（p75 78），保留路线 F30 r12c3 进场 58/80（p75 耗尽） |  |  | switch | F25 37/80 | 先火堆养血，满血打精英 |
| B3PJGKHAQGK6 | 9 | reward/card | 10/80 | 到 F13 时新路线约 8/80，保留路线约 8/80（p75 耗尽 对 耗尽）；下一只精英：新路线 boss 前没有精英，保留路线 F12 r11c6 进场 34/80（p75 34） |  |  | switch | F13 12/80 | 避 42% 血强制精英，左线先火堆回血 |
| 9175DLPM2EFR | 21 | event/choose | 35/80 | 下一只精英：新路线 F29 r11c2 进场 80/80（p75 74），保留路线 F27 r9c0 进场 59/80（p75 53） |  |  | same | F24 35/80 | 先休息再打精英，血线更安全 |
| 9175DLPM2EFR | 37 | reward/card | 49/80 | 到 F40 时新路线约 35/80，保留路线约 42/80（p75 17 对 33） | yes |  | switch | died F39 | 11金商店无用，改走战斗多得卡牌与金币 |
| Y8E0KK4L7JBL | 24 | reward/card | 19/80 | 下一只精英：新路线 F31 r13c0 进场 80/80（p75 74），保留路线 F31 r13c0 进场 49/80（p75 33） |  |  | same | F25 19/80 | HP19：跳过 F27 战斗换休息，保证 F31 精英前满血 |

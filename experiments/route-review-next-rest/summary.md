# Route review next_rest replay (tools/route-review-next-rest-replay.ts)

Logged route reviews with a plan in logs/brain.jsonl (from 09-30): 1926 rebuilt; skipped {}.
Outcomes: keep 1872, change 46, invalid 0, none 8.

Added to the question (the next_rest field as JSON, chars): median 462, p90 713, max 1525; the route_review block today: median 3219; plus 71 chars in the instructions.
As a share of the question's user message (memory, question, options, state; median 20479.5 chars): median 2.2%, max 9.5%.
Switch lines per review: 0: 0, 1: 1368, 2: 333, 3: 147, 4: 49, 5: 9, 6: 20. Reviews with a clearly worse switch line: 950.

Changes: 46; the answer's stretch to its next rest site was the kept one 13, a listed switch line 30, another one 3; clearly worse than kept: 6.

| run | F | label | HP | new vs kept at the next rest site | worse | listed | real | route_reason |
|---|---|---|---|---|---|---|---|---|
| 0QSB9YV3UFCL | 19 | reward/card | 70/80 | 新路线到 F32 约 30/80，保留路线到 F28 约 40/80（p75 耗尽 对 3）；保留路线到 F32 时约 21/80（p75 耗尽） | yes | switch | F32 7/80 | 避F29精英，保HP且末段有店有火堆 |
| 41VAUAM2EFY7 | 6 | reward/card | 51/80 | 新路线到 F8 约 51/80，保留路线到 F8 约 33/80（p75 49 对 21） |  | switch | F8 51/80 | HP64%低于精英线，改走问号 |
| 41VAUAM2EFY7 | 7 | event/plan | 51/80 | same stretch |  | same | F8 51/80 | F13满血火堆锻造，顺路加打F14精英(后有火堆) |
| WLM6YKJ0ASNE | 21 | reward/card | 81/102 | 新路线到 F24 约 62/102，保留路线到 F25 约 29/102（p75 43 对 耗尽）；保留路线到 F24 时约 62/102（p75 43） |  | switch | F24 71/102 | 休息置于精英前，保满血进boss |
| A8ENYFR4ZWKG | 11 | reward/card | 45/80 | 新路线到 F16 约 39/80，保留路线到 F16 约 21/80（p75 23 对 耗尽） |  | switch | F16 34/80 | 45血0药，跳过精英保boss血量 |
| RUDHQ1KJ49P8 | 12 | event/plan | 66/80 | same stretch |  | same | F13 66/80 | 金币已归零，改走走廊拿卡/药水 |
| 0U96U4D9Z3PP | 36 | event/choose | 66/85 | 新路线到 F44 约 56/85，保留路线到 F44 约 46/85（p75 36 对 18） |  | other | F44 56/85 | 问号替走廊省血，其余照计划 |
| Z3DFG85QDRCD | 27 | reward/card | 57/80 | same stretch |  | same | F28 57/80 | 问号免战，精英紧邻火堆 |
| QWXKQVYQGGCJ | 25 | rest/plan | 30/91 | 新路线到 F27 约 57/91，保留路线到 F29 约 18/91（p75 57 对 耗尽）；保留路线到 F27 时约 57/91（p75 57） |  | switch | F27 57/91 | 先火堆再精英，进精英约84% |
| HME0FA7VA0J6 | 24 | rest/plan | 60/80 | 新路线到 F27 约 80/80，保留路线到 F27 约 48/80（p75 75 对 35） |  | switch | F27 80/80 | 跳精英保血，留锻造给螃蟹 |
| V1Y4D9Y9GMVK | 13 | rest/plan | 11/80 | 新路线到 F16 约 31/80，保留路线到 F16 约 16/80（p75 21 对 耗尽） |  | switch | F16 32/80 | 11血回血，绕开精英 |
| G3MU2NADPEDU | 21 | event/choose | 62/87 | same stretch |  | same | F25 47/87 | 走商店花金，精英后接火堆 |
| G3MU2NADPEDU | 29 | reward/card | 56/87 | 新路线到 F32 约 48/87，保留路线到 F32 约 24/87（p75 34 对 11） |  | switch | F32 70/87 | 避开精英，佛珠保问号安全 |
| 9FVEQKJ0Y1YQ | 11 | reward/card | 67/86 | 新路线到 F13 约 50/86，保留路线到 F16 约 31/86（p75 38 对 耗尽）；保留路线到 F13 时约 50/86（p75 38） |  | switch | F13 21/89 | 改走F12休息保血，双精英夹火堆，boss前96% |
| 9FVEQKJ0Y1YQ | 12 | reward/card | 21/89 | same stretch |  | same | F13 21/89 | 避精英保血，问号有佛珠安全 |
| R31C86606UDG | 22 | event/choose | 68/80 | same stretch |  | same | F24 51/80 | 绕开F31精英，保血进蟹战 |
| GSFSFQ3JWGEL | 13 | reward/card | 43/80 | 新路线到 F16 约 43/80，保留路线到 F16 约 26/80（p75 40 对 14） |  | switch | F16 43/80 | 低血绕过F15精英走问号 |
| GSFSFQ3JWGEL | 43 | reward/card | 33/87 | same stretch |  | same | F44 33/87 | 38%血避精英，保boss进场 |
| ALBM9RUA77WR | 7 | rest/plan | 74/80 | 新路线到 F11 约 63/80，保留路线到 F11 约 63/80（p75 48 对 51） |  | switch | F11 64/80 | 26金商店无用，改走问号 |
| R6V3T4KSDABE | 20 | event/plan | 70/80 | 新路线到 F29 约 46/80，保留路线到 F29 约 16/80（p75 9 对 耗尽） |  | switch | F29 66/80 | 无AOE怕千足虫，跳过精英保血 |
| GSG0Q5KP9AAU | 28 | reward/card | 9/86 | 新路线到 F32 约 9/86，保留路线到 F32 约 9/86（p75 4 对 耗尽） |  | switch | F32 9/86 | 9血少碰问号，双商店买药 |
| KXG79NARS0LT | 5 | event/choose | 73/80 | 新路线到 F11 约 52/80，保留路线到 F8 约 71/80（p75 31 对 63）；保留路线到 F11 时约 63/80（p75 52） | yes | switch | F11 71/80 | F7 顺路商店删打击补牌，火堆换商店 |
| 1HF7GR4PZAPC | 6 | event/choose | 70/80 | 新路线到 F7 约 70/80，保留路线到 F9 约 51/80（p75 70 对 36）；保留路线到 F7 时约 70/80（p75 70） |  | switch | F7 52/80 | 先休息再商店，避开低血精英 |
| KMB1MYF427N8 | 19 | reward/card | 53/87 | 新路线到 F27 约 29/87，保留路线到 F27 约 15/87（p75 耗尽 对 耗尽） |  | other | F27 51/87 | 避开双精英，多休息保血进boss |
| JJ75S331VUKX | 30 | reward/card | 31/80 | 新路线到 F32 约 31/80，保留路线到 F32 约 23/80（p75 26 对 14） |  | switch | F32 36/80 | 问号更省血，同到休息点 |
| 5DFXQLAMFUB2 | 24 | rest/plan | 57/89 | 新路线到 F27 约 83/89，保留路线到 F32 约 15/89（p75 83 对 耗尽）；保留路线到 F27 时约 83/89（p75 78） |  | switch | F27 83/89 | 少精英多休息，保血进王 |
| VNKN9952ZNA0 | 13 | event/choose | 55/80 | 新路线到 F16 约 55/80，保留路线到 F16 约 38/80（p75 53 对 28） |  | other | F16 55/80 | 血量低于精英线，避战走问号保血进boss |
| VNKN9952ZNA0 | 21 | event/choose | 60/80 | 新路线到 F24 约 52/80，保留路线到 F32 约 20/80（p75 38 对 耗尽）；保留路线到 F24 时约 52/80（p75 38） |  | switch | F24 60/80 | 中路：精英前后各有休息，boss血更高 |
| VNKN9952ZNA0 | 25 | reward/card | 7/80 | 新路线到 F27 约 7/80，保留路线到 F27 约 7/80（p75 7 对 7） |  | switch | F27 7/80 | 飞行靴改走三火堆路线，少打两场 |
| XSPHCB4GUSEU | 27 | rest/plan | 8/80 | 新路线到 F32 约 24/80，保留路线到 F29 约 24/80（p75 耗尽 对 15）；保留路线到 F32 时约 18/80（p75 耗尽） | yes | switch | F32 53/80 | 血少避开F31精英，走问号火堆 |
| 3DGZWZ09GKQ4 | 9 | event/plan | 54/80 | 新路线到 F11 约 54/80，保留路线到 F13 约 35/80（p75 54 对 20）；保留路线到 F11 时约 54/80（p75 54） |  | switch | F11 63/80 | 血量低于计划，精英前先休息 |
| LTKW24N3R9PG | 25 | rest/plan | 23/80 | 新路线到 F27 约 47/80，保留路线到 F32 约 23/80（p75 47 对 耗尽）；保留路线到 F27 时约 47/80（p75 47） |  | switch | F27 47/80 | 弃商店，多一个火堆保血 |
| LTKW24N3R9PG | 36 | reward/card | 27/74 | same stretch |  | same | F40 36/94 | 精英后接火堆，避开第二只精英 |
| LTKW24N3R9PG | 39 | event/choose | 16/74 | same stretch |  | same | F40 36/94 | 改走两商店，花269金找力量/删牌 |
| 1YXMHF6FSPK4 | 9 | reward/card | 48/80 | 新路线到 F12 约 46/80，保留路线到 F12 约 21/80（p75 41 对 10） |  | switch | F12 50/80 | 60% 血不足，绕开精英走普通战 |
| XPDAUKKM1UT6 | 11 | reward/card | 47/80 | 新路线到 F13 约 45/80，保留路线到 F13 约 20/80（p75 40 对 9） |  | switch | F13 26/80 | 47血跳过精英，改普通战保血 |
| XPDAUKKM1UT6 | 12 | reward/card | 26/80 | same stretch |  | same | F13 26/80 | 26血0药，跳过精英保boss血 |
| R1QJUBVBSSB2 | 5 | event/choose | 61/80 | 新路线到 F12 约 55/80，保留路线到 F7 约 61/80（p75 34 对 55）；保留路线到 F12 时约 51/80（p75 30） | yes | switch | F12 28/80 | F7改走商店兑现318金补强 |
| R1QJUBVBSSB2 | 11 | reward/card | 28/80 | same stretch |  | same | F12 28/80 | 保血进boss，避开精英 |
| SMNJTGSHFMME | 23 | event/plan | 90/90 | 新路线到 F25 约 81/90，保留路线到 F25 约 90/90（p75 72 对 90） | yes | switch | F25 68/90 | 商店仅8金无用，改打怪拿卡 |
| EQL95K9F3LKQ | 44 | reward/card | 28/80 | 新路线到 F47 约 15/80，保留路线到 F47 约 1/80（p75 耗尽 对 耗尽） |  | switch | died F45 | 低血改走问号，省一场战斗 |
| UK7R9A0NMCXL | 23 | event/plan | 37/80 | 新路线到 F25 约 37/80，保留路线到 F29 约 19/80（p75 37 对 耗尽）；保留路线到 F25 时约 37/80（p75 37） |  | switch | F25 37/80 | 先火堆养血，满血打精英 |
| B3PJGKHAQGK6 | 9 | reward/card | 10/80 | 新路线到 F13 约 8/80，保留路线到 F11 约 10/80（p75 耗尽 对 10）；保留路线到 F13 时约 8/80（p75 耗尽） |  | switch | F13 12/80 | 避 42% 血强制精英，左线先火堆回血 |
| 9175DLPM2EFR | 21 | event/choose | 35/80 | same stretch |  | same | F24 35/80 | 先休息再打精英，血线更安全 |
| 9175DLPM2EFR | 37 | reward/card | 49/80 | 新路线到 F40 约 35/80，保留路线到 F40 约 42/80（p75 17 对 33） | yes | switch | died F39 | 11金商店无用，改走战斗多得卡牌与金币 |
| Y8E0KK4L7JBL | 24 | reward/card | 19/80 | same stretch |  | same | F25 19/80 | HP19：跳过 F27 战斗换休息，保证 F31 精英前满血 |

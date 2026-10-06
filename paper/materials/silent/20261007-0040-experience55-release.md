# 静默经验第55批上线记录

2026-10-07 00:43，处理00:40 experience-done 20261007-000343-experience-update。

- 来源ZVYUL2YP3518 SILENT A10及00:00:18敌人ID勘误、本角色历史；源7c37095a2c77d579210790fe2c735e78f708a1e6→实际live 113c82ecfb44d1becbcd9a3f87529738cd287b8d→固定发布884c9f337d4300fb0bbae53d1764950a8f2c6ffc/树328bafcd031a7ddb08eca2c6d5b9f40027c5b9b0，唯一S1.exp55指向实际合入。
- 沿学习者产出：经验2026-10-06.29→2026-10-07.1新增0、更新21（均补证，纯数字0）、退役0，active126→126、55756→56138字；高58中41低27，旧五条压缩原文保持。A8 119/52862、A9 120/53161、A10 121/53741条/字，无新用药规则。
- 源初轮及定稿tsc0/vitest0、209文件2245例；初轮通过后因女王首试赢例四→五校正完整重跑，定稿通过，非失败或超时重跑。合后首轮tsc0/vitest0、209文件2245例。完整外部检查待本批learner-checks；既有fix36/37保持。
- 240配对切片增量中位−9、最大增量355，总体中位2863→2854、最大6152→5748字；本批67局采样与上批66局分开，旧66局七数组/血档/源节点/回血/SL逐行一致，新67局1059房57实际死亡，沿原件归档，运维不额外推导打法。前节未展开模板和本节更正分别保留。
- 合前ad01f74a152250f6d0c0f5e19fd5905d98b165b2，七份已自动刷新数据先提交dab6e7dcf4291d0a5fedb951a6c50bc392c719ba后成为已测基线；知识重叠/冲突0，其他知识blob保持，预合并rc0。经验源/合后blob一致，本经验无代码或生成器变动、无其他角色知识变动、不重建。
- 临时机制抽数初稿completed过滤丢pending选择牌产生StopIteration，学习者按后续稳定帧确认修正，原evidence-initial.py/log与修正版本均归档；不是生产代码或自测失败，旧失败历史保持。
- 原第55节32401字节、22行proposed、回报/两次源自测/合后自测/刷新及临时断言原件按原字节归档，SHA256见manifest.json；约103MB审计、历史证据、其他采样保持原目录，remaining-originals.json记录原路径/字节/SHA256。
- 21条经验对应22项台账；随后仅CLI/by=ops登记本批22项shipped，原first_run/prior/claim、全部support/repeat与历史保持。0196首证LRN0HPZ0FZS1/A0、prior=yes且既有shipped/exp54保持；独立0193已shipped/S1.fix36、0195已shipped/S1.fix37、0194已shipped/S1.exp52、0172旧待修项及最新复盘保持。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 196 item(s), 0 problem(s)。
- main随后机械集成固定发布，保留七份已测自动刷新；无新纯bug或Roy待定，不重复live合并、测试或论文刷新，后台成本/收件箱/知识刷新保留，对局继续。

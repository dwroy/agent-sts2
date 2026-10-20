# 交 watcher：活雾 BLOAT_MOVE 的召唤定义缺失

来源：Claude 2026-10-20 13:20 纯 bug 排查。只交既有学习闭环，不派新批次，不由开发写机制或牌值。

**证据局**：Silent A10 `9S9U3YSYEPK1` F12 T4→T5，原帧 `logs/states.jsonl` 字节 14233657663 / 14233748131。原件 SHA256、长度、时间戳及完整 combat 字段在 `agent/tests/combat-state-divergence-evidence.json` 的 `fog`；来源清单见本目录 `evidence-manifest.json`。

**观测**：T4 活雾 `BLOAT_MOVE` 意图同时含 Attack 与 Summon；选定突然一拳→防御后，我方 HP 6 不变，活雾 60→49。T5 原帧出现 GAS_BOMB（HP/maxHP 8、MINION 1、中毒 2、EXPLODE_MOVE 9 伤），活雾为 49 HP、中毒 4、SUPER_GAS_BLAST_MOVE 9 伤。冻结模拟 T5 没有气态炸弹，少算一个敌人。上述数字仅记该局原帧，不作为通用机制值发布。

**实现现状**：`agent/src/knowledge/monster-db.ts:summonsAt` 仅有已发布的 THE_OBSCURA / ILLUSION_MOVE → PARAFRIGHT；`agent/src/reflex/rollout-live.ts:boardRolloutInput` 也仅查询 ILLUSION_MOVE。现有数据库可见气态炸弹本身，但未见类型化发布的活雾召唤关系，不能靠开发把相邻帧猜成通用映射。

**请学习者核证**：BLOAT_MOVE 的召唤对象、数量、触发时机和条件；进阶范围；新敌人的 HP/能力/首个行动及毒雾先后；其他实际反例。每条保留证据局、独立分母、限制与反证。发布后消费者需能按实际 move 查询已核实召唤定义，并以本局原始 T5 复测敌人数、身份、HP、毒层和来袭。未经证实的条件保持 unknown，不填假值。

**已修但独立的问题**：同一局未打出的蛇咬被模拟弃掉。它的“保留”已经在 `silent-snakebite-retained-poison` 入库，本次只修数据传递；此修复不会补出气态炸弹，也不代表该局后续推演已准确。

**原闭环去重**：ops 已在 `46938d404` 将同一活雾缺口绑定到既有提案 `silent-proposal-99f14e823a866ad7`（来源 2026-10-18 postmortem；见 `paper/materials/20261020-1330-ops/dedup-and-origin-binding.json`）。本报告补充工程复现证据，不新建父要求、不派批次、不代填学习者确认；尚缺原 boss-sim 责任链的信息由既有调度通道核实。

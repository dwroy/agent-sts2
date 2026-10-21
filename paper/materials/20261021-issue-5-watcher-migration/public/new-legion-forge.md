[watcher] 交接第 5 项迁移：士兵/熔炉原三叶 host full 的性能单败尚未归因，候选与十项 waiting 保留。

## Goal

由原 ops 通道依据既存诊断确定后续，区分来源检查、实际 live 和科学结论；迁移不触发重测或发布。来源：`handoff/watcher-20261021.md` 第 5 项与原 0620 回执。

## Acceptance

- [ ] 保留原 full1、固定输入和计时证据；候选与撤生产叶的既存诊断均未复现，物理原因继续记 unknown。
- [ ] 原通道在此记录后续决定及证据；如输入/源码变化或获明确新检查安排，沿单点窗口执行并保留新旧结果。
- [ ] 十项 waiting、原提案/账本身份保持，实际发布与消费者验收另行实核，不能用诊断未复现冒充 full0。

## Owner and boundaries

owner:ops，沿原 `20261021-051301-s2-strategy-proposal` 事务；不重复未变源码 full，不夹入 #2 CEN 或 #3 P4，不自行发布或关闭原科学父。

## Evidence

- `paper/materials/20261021-0620-ops/receipt.json`
- 同目录 `report.md`、`targeted-comparison.json`、`host-inputs-before.json`、`host-inputs-after.json`
- `ops/codex-ops/pending-continuations/original-20261021-051301-s2-legion-forge-three-leaf.json`
- 原摘要单败：17612.750ms，原门槛 5s；不改阈值、不覆盖旧失败。

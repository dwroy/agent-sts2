[watcher] 交接第 5 项迁移：原七个科学父要求及策略 waiting 继续沿原链保留，本 issue 只负责迁移索引和防止误关闭。

## Goal

把原有父要求接入看板索引，逐项保留原 owner、证据与未完成验收；这张协调 issue 不创建或替代原学习任务。按 `docs/learning-requests.md`、`docs/learning-code-proposals.md` 和 `handoff/watcher-20261021.md` 第 5 项闭环。

## Acceptance

- [ ] 原 owner 逐项在 issue 给出已有任务/报告入口、当前阻塞和剩余验收；历史来源缺失保持未知，不重建现场冒充原任务。
- [ ] 原要求只有实际学习入库、必要发布与消费者读回满足后才按原流程关闭；异议/反证照原通知链处理。
- [ ] 策略 waiting 继续沿原提案 ID 和账本跟进；无新源批次不补 full、dataset 或空合并，不能因本次迁移关闭。

## Owner and boundaries

owner:ops 协调各原 owner；不派新批，不改知识、原账本身份、角色 ACK 或科学父状态。Regent 继续暂停。具体工程与独立研究分别由对应 issue 承接。

## Evidence / original parents

- `roy-20261012-concrete-core-decklists`
- `ops-20261013-experience-000402-merge-recovery`
- `roy-20261016-global-build-g1a`
- `silent-0332`
- `roy-20261016-sl-potion-retry`
- `roy-20261017-human-pace-h0`
- `roy-20261017-human-pace-support-mapping`

索引：`notes/ops-current.md`、`notes/ops-current-context.json`。原 human-pace 检查点：`paper/materials/20261017-human-pace-control/checkpoint.json`。十项 waiting 与两批二十提案分别沿原 0620、1033 记录保留，不由 GitHub 迁移重算独立分母。

启动检查还发现旧通知 `733e3a9e9380d9155431980e` 是 alias，canonical 为 `b07c96b10b1facb9f887a710`，后者已有 watcher/Roy 实际回执。保留原 alias false flags，不重复通知或代 ACK；本项与 R4 CLI 兼容分开。

# P0 联合检查失败后的测试运输修正

2026-10-20，原 owner v6-w4w6 / codex1 / native `01a15382-68eb-7093-b677-040c9b45767f`。沿原 Claude22:4x/P0 与 ops23:00 回执修复；未运行完整 vitest、模型/API 请求或游戏，未修改 live、当前对局、开关及 STOP。

源码 `75eee88dbf6a1e2cc42e8f7f04eab81d4e3844e7` 已窄合 main `538294bf9419af09c2efd964a9cc047155d656cb`。本增量仅修改一个测试文件并原字节移动多帧夹具；运行时代码、计算公式、安全门和旧战斗用例不变。

## 原失败与修正

ops 原联合树 `66dc290c93f50ac981583df9b36a66717ee51a94`、2380 输入 SHA256 `c2a785594fb92b512721b338a7835d7ca40218a1a34723bceaf503b205356067` 的 tsc0/full1 保留：623 文件中 618 过、5 败，5737 项过、2 败、2 原跳过。原 full SHA256 `4f98eebb04360944f0674a86b3188cbd477b6166953c654a6824398c5af4aa26`，原件 [ops receipt](../20261020-2300-ops/receipt.json)；副本见本目录 checks/test-packaging-r1。新循环测试当时没有加载，原 96 项定向通过不能替代该联合失败。

| 缺口 | 修正与保留边界 |
| --- | --- |
| `logged-states/*.json` 的旧消费者把多帧 `source/states/knowledge_fixture` 当成含 `.state` 的单帧，导致 rollout-live、target-options、potions-jev-call 失败 | 把 `v6-r404-card-rewards.json` 移到 `tests/v6-fixtures/`，更新唯一引用；172827 字节及 SHA256 `2a2333fc8f227424a13bc8d61238b6a32487fdeeb49846a43342a0382d8b1bb5` 不变。新增目录契约断言遍历旧单帧夹具；不删旧用例、不绕过扫描、不补造 `.state`。 |
| 精确 live 包缺少 `fixture-http.ts`，bridge 无法导入，check-imports 也失败 | 把已有测试 helper 及其两项固定测试列为显式必要依赖。helper 在本源/main 已存在，原 live 包缺失；不能只摘新提交而继续漏带依赖。 |

## 固定检查

新增目录契约在旧位置复现 1 败、13 跳过；红灯原件保留。修正后 `tsc --noEmit` rc0；7 文件 / 207 项定向全过，99.90 秒，包含上述五个失败相关文件以及 construction-safety、fixture-http。真实 F2/F19 战斗→奖励循环测试已在本候选加载并通过，仍是固定数值 runner 和固定外部答复，不是新真实模型请求或线上验收。

源码 gitleaks rc0。检查均 nice19/ionice3、单 worker、主盘 TMPDIR。完整日志、退出码和逐件 SHA 见 [检查清单](checks/test-packaging-r1/checksums.json)。本轮未另起 full，不把定向通过称为最新实际 live 联合绿。

## 精确运输

使用 [minimal-transport.patch](checks/test-packaging-r1/minimal-transport.patch) 或 [transport-manifest.json](checks/test-packaging-r1/transport-manifest.json) 的精确后像：删旧夹具路径，加入新路径，修改 bridge，新增 live 缺少的 `fixture-http.ts` 与 `fixture-http.test.ts`。该补丁已在私有 index 从原失败树应用核验，结果树 `5cff8c38cdef0c45dd21efc535d3d566241c3288`；只是机械运输证明，不是当前知识包的联合测试树。原五叶中两运行时叶与 construction-safety 测试继续保留，不运本分支父提交、整 main、805 或知识。

正式 source/base/tree、四后像 SHA/blob、main 读回和检查边界见 [source-receipt.json](checks/test-packaging-r1/source-receipt.json)。helper 的后像也固定在该源码提交中，但不是新提交的 diff，故单 cherry-pick 到旧 live 不够。

下一步由 ops 按原单点窗口冻结最新实际 live 组合并跑完整 tsc/vitest，通过后在自然开局边界发布，核下一局 Jev 奖励选牌比例≥90%、unknown_to_brain 接近零、准备≤5秒。P0 未实际发布稳定两自然局前不做 P2。P3 的 `card-pick.ts` reflex 挂点未触碰。

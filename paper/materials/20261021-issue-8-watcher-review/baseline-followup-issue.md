[watcher] 修复 V6 三文件四项既有断言失败，恢复 #8 等独立运维补丁的测试准入。

## Goal

#8 的原 R4 manual notice 修复本项回归通过，但开发在未改基线 `a2eed3cb3` 已复现四项固定数据失败；watcher 在基于 `49d957918` 的隔离集成树独立复现同样四项。先确认失败来自实现、固定数据还是已有契约变化，再按已授权契约作最小修复。测试文件及 `agent/src` 从开发基线到 watcher 核验时的 main 保持相同。

授权与必要性：AGENTS.md 的代码提交门槛要求 tsc 与 vitest 两者通过；本任务从 #8 核验阻塞拆出，不扩大 #8 通知兼容的范围。不得仅为通过测试引入游戏知识或改动 Roy 的科学要求。

## Acceptance

- [ ] 核对三文件四断言的真实契约与引入点，保留原失败；每项说明为什么修实现或测试，而非凭绿色结果选择。
- [ ] `v6-direction-provider.test.ts:139`：缺 W0 的 legacy `win/expected_win` 预期 null，现值 0.5。
- [ ] `v6-projection-entries.test.ts:23`：`general_win.n` 预期 20，现 undefined。
- [ ] `v6-target-values.test.ts:18/58`：`constructionCoverage.reason` 预期 null，现 `insufficient_known_options`。
- [ ] 固定数据回归以及 tsc、vitest 按仓库规范通过；不新增排除、不弱化断言、不掩盖未知或以定向绿色冒充完整绿色。
- [ ] 若属于有意契约变化，链接已有决定与调用方兼容证据；若需要新科学/产品决定，在本 issue 保留阻塞，不自行更改数值语义。
- [ ] 提交、报告和原失败/重跑原件交 watcher 核验；与 #8 保持独立提交，随后按原链集成。

## Owner and boundaries

owner:dev；一个 issue 一个新会话及独立工作树。本 issue 只建待办，尚未派发会话。

不改 live、STOP、正式知识、REFLEX、通知登记或其他角色回执；不运行 play、不调用模型、不新增模拟/学习批次。若涉及对局行为变更，必须显式说明并按原发布流程验收；不能把这次测试修复当作拿牌质量或精英校准已完成。

## Evidence

- #8 开发提交 `4fc80c385c6f685dcd426087100eb08104faa705` 与原评论： https://github.com/dwroy/agent-sts2/issues/8#issuecomment-6307314408
- 来源报告：`paper/materials/20261021-issue-8-r4-notice-ack/report.md`，含基线 `provider-baseline.log` / `projection-baseline.log`。
- watcher：`paper/materials/20261021-issue-8-watcher-review/review.json`、`targeted-and-baseline.log`；独立结果 3 文件通过/3 文件失败，19 测试通过/4 测试失败。
- #8 的通知工具源码没有改 `agent/src`，不能在 #8 内顺便调整 V6 数值契约。

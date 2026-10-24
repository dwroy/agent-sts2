## 修 bug 回报
- 合并基线：main → e8dd51b732e5876b2c0774758633011d74fc87aa（开工工作区干净；merge返回Already up to date）
- 修复（每条一行）：无新增修复，fixes=[]；未提交、未做空合并。
- 已被别人修掉的（当前工作树基线源码）：
  - silent-0254：无出牌决策的死亡战斗漏记 — 3b48088dec5fc6eafe576a1296bbdadde43432ee；基线祖先=True，live提交祖先=True。
  - 商店移除现场可选名单预判 — db20ec3cc6cd0e47ac014d0c523dd4ed1c781d26；基线祖先=True，live提交祖先=True。
  - codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f；基线祖先=True，live提交祖先=True。
  - ascension-up请求目标误作实际等级 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09；基线祖先=True，live提交祖先=True。
  - infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7；基线祖先=True，live提交祖先=True。
  - h1-b2-margin-sample-identity — 660b194c950f017e356a4b3da952e127c7e5c768；基线祖先=True，live提交祖先=True。
  - h1-budget-completion-health-contract/indifferent — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9；基线祖先=True，live提交祖先=True。
  - infra-paper-dataset-concurrent-gzip-keyscan-20261018 — 0b240cbd109a5e004f010d9659a871204c455639；基线祖先=True，live提交祖先=False。
  - ops-frozen-storage-v6-stream-20261019 — 39258bd0fba27da2ba5f95ef8f18acdd3e1f7896；基线祖先=True，live提交祖先=True。
  - infra-manual-learning-notice-ack-scope-20261019（源码兼容；角色ACK另核） — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee；基线祖先=True，live提交祖先=False。
  - infra-ordinary-close-candidate-failure-isolation-20261020 — b675eb67f3687fb137434ef9610f1503edbbe8bc；基线祖先=True，live提交祖先=False。
  - infra-v6-publication-task-link-20261020 / infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63；基线祖先=True，live提交祖先=True。
  - infra-ordinary-unassigned-tick-no-change-20261020 — ca6897f2e433c9c3bb45d0dad46ba685d864c87d；基线祖先=True，live提交祖先=False。
  - infra-proposal-repair-no-source-waiting-20261023 — 86b3b1721b4b6ad4db48b0279504144e490db010；基线祖先=True，live提交祖先=False。
  - 原生agent名长度适配 — cb11e5f5beaf2d9ce1320b4222d435dc9cdf0de1；基线祖先=True，live提交祖先=False。
  - ops-external-report-contract-20261024（模板合同） — 6b013cb487ccdd5cf6fd3f439537ec9cb9851f8d；基线祖先=True，live提交祖先=False。
  - kb_strategies宽查询来源元数据24KB封包 — d1f590e401e825895abd548adf331f21dc079c49；基线祖先=True，live提交祖先=False。
  - 窄cherry-pick提案处置与recheck格式兼容 — e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3；基线祖先=True，live提交祖先=True。
- 没修的：
  - infra-run-config-git-status-enobufs-20261023 — 当前codeInfo仍为单次git status，问题仍在；110800已有两叶固定候选及负控，队列明确由原ops在最新live精确组合补验，后批不要重复实现。未替原候选提交、合入或修改旧config。
  - 非阻塞账本状态回退：补链显式proposed使历史shipped回退 — 001301已有四叶候选及17项定向检查，队列要求后批不要重复实现/试恢复；原完整检查、24条CLI更正及实际集成仍待原owner。未更新账本或伪造shipped_at。
  - infra-jev-base-request-budget-issue25-20261022 / #37实际组合失败 — 原#25/#37工程链已负责投影和预算，当前交接记录实际live组合8败并退原开发者。太大且已有owner；未截断事实、改预算、重full或带入未发布候选。
  - 原v5-dpr-health/H1监控V6 A/B及战斗CARD_SELECTION适用性 — 已有001302六叶候选及原工程owner，队列明确不重复实现/派修；待原链实际组合检查和集成，不凭开关豁免真实错误。
  - core-build-notify-222802-rc2、sandbox-glob-startup-race上游生命周期 — 证据不足：原native失败缺stderr、扫描ENOENT删除者/精确时序未知；已有有界恢复和原owner。未重发通知、重派模型或改权限。
  - infra-h0-414-host-fixed-test-stability及历史超时/缓存/性能宽项 — 已有多个限定测试修复和原宿主失败/补验；根因与生产因果不足，原队列禁止重复未变full、增时限、削断言或盲叠候选。保留宽父，不称本次28项通过已解决性能。
  - infra-v6-refresh-invalid-json-provenance-20261020 — 原坏行完整性及来源覆盖属于原V6发布owner；缺本批可验证根因，保留原坏行/unknown，不重跑生产生成器或跳过坏行。
  - 出牌/药水/SL/终局/路线/休息/机制模型及精英悲观校准条目 — 策略类：均保留已有strategy-proposal原ID/证据/租约；普通fix-batch不新增打法或重复派研究。包括silent-0332、0461、0579、0581、0604及其他未完成模型提案。
  - arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression及原框架检查收尾 — 独立架构/策略/归因专项，超出普通纯bug批次；原owner、历史失败和科学父要求保持。
- 测试：tsc退出码0；定向Vitest 6文件/28用例/28通过/退出码0。非完整套件；没有源码提交，未运行提交前完整test-sandbox入口。
- 测试加载记录：首次默认配置加载因共享node_modules/.vite-temp只读EROFS退出1，未执行用例；第二次尝试使用不受支持的--cacheDir参数退出1，未执行用例；随后使用scratch内原配置包装器、native loader和scratch缓存，原6文件28项全部通过。无用例超时重跑、无断言/排除/生产配置修改。
- 合入：未合入。无本批源码产出，不合并main与live之间无关差异；特别是86b3b1721的waiting_repair与0b240cbd1的atomic_output虽然已在基线，当前live对应函数仍缺，沿原ops发布链继续，不能称已上线。
- 需要 Roy 定的事：无。

证据与范围：audit.json保存固定base、队列SHA、18项既有提交祖先与源码SHA；queue-open-index.json保存全部未勾选条目的原文/行号；source.diff为空，工作树严格干净。新提案/账本变更/版本/decision-log/通知均无；未更新队列、旧失败、其他角色ACK或科学父状态。测试JSON和三次启动日志均保留在本scratch。

```json
{
  "task": "fix-batch",
  "base": "e8dd51b732e5876b2c0774758633011d74fc87aa",
  "fixes": [],
  "skipped": [
    {
      "item": "infra-run-config-git-status-enobufs-20261023",
      "reason": "当前codeInfo仍为单次git status，问题仍在；110800已有两叶固定候选及负控，队列明确由原ops在最新live精确组合补验，后批不要重复实现。未替原候选提交、合入或修改旧config。"
    },
    {
      "item": "非阻塞账本状态回退：补链显式proposed使历史shipped回退",
      "reason": "001301已有四叶候选及17项定向检查，队列要求后批不要重复实现/试恢复；原完整检查、24条CLI更正及实际集成仍待原owner。未更新账本或伪造shipped_at。"
    },
    {
      "item": "infra-jev-base-request-budget-issue25-20261022 / #37实际组合失败",
      "reason": "原#25/#37工程链已负责投影和预算，当前交接记录实际live组合8败并退原开发者。太大且已有owner；未截断事实、改预算、重full或带入未发布候选。"
    },
    {
      "item": "原v5-dpr-health/H1监控V6 A/B及战斗CARD_SELECTION适用性",
      "reason": "已有001302六叶候选及原工程owner，队列明确不重复实现/派修；待原链实际组合检查和集成，不凭开关豁免真实错误。"
    },
    {
      "item": "core-build-notify-222802-rc2、sandbox-glob-startup-race上游生命周期",
      "reason": "证据不足：原native失败缺stderr、扫描ENOENT删除者/精确时序未知；已有有界恢复和原owner。未重发通知、重派模型或改权限。"
    },
    {
      "item": "infra-h0-414-host-fixed-test-stability及历史超时/缓存/性能宽项",
      "reason": "已有多个限定测试修复和原宿主失败/补验；根因与生产因果不足，原队列禁止重复未变full、增时限、削断言或盲叠候选。保留宽父，不称本次28项通过已解决性能。"
    },
    {
      "item": "infra-v6-refresh-invalid-json-provenance-20261020",
      "reason": "原坏行完整性及来源覆盖属于原V6发布owner；缺本批可验证根因，保留原坏行/unknown，不重跑生产生成器或跳过坏行。"
    },
    {
      "item": "出牌/药水/SL/终局/路线/休息/机制模型及精英悲观校准条目",
      "reason": "策略类：均保留已有strategy-proposal原ID/证据/租约；普通fix-batch不新增打法或重复派研究。包括silent-0332、0461、0579、0581、0604及其他未完成模型提案。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression及原框架检查收尾",
      "reason": "独立架构/策略/归因专项，超出普通纯bug批次；原owner、历史失败和科学父要求保持。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 28
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261024-164320-a49277ab-f5fe-4dca-98dd-91c4e364d08d-fix-batch/report.md"
}
```

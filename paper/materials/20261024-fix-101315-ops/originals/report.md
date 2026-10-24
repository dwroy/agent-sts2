## 修 bug 回报
- 合并基线：main → d93277a95c4c894ccc946193a399228ed92cdae2
- 修复（每条一行）：无已提交修复。kb_strategies 两叶候选已实现，因完整检查未通过而保留未提交；未登记 shipped。
- 已被别人修掉的：
  - silent-0254 无动作死亡归因 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
  - 额度恢复基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
  - 实际进阶通知 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
  - 核心通知错误诊断 — 5c92f2aaf0b758a1a5e7d591745694004664f83a
  - eval/神化固定超时夹具 — d9881ba593b0b8d701ebbe1c95626c0ebdd554c7
  - EZ2L 固定候选夹具 — bae9c45ccffefb284a1c6634526c8768a9f5f7a8
  - 账本发布前缀分叉 — dd478f0b3e5a0f234f082972d21b203dbf8229d7
  - 共享 main 启动暂态解析 — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2
  - 描述型 fixes 报告 — 4c16dab0457a61e22ef06b27e367d146cb99bab3
  - 窄发布来源核验 — 5ff419bbf2968a13167c6556885ced73736c6ec6
  - gzip 发布与扫描 — 0b240cbd109a5e004f010d9659a871204c455639
  - V6 任务登记及 12 KB 摘要预算 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
  - 手动学习通知 ACK 来源认证 — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee
  - 普通收尾候选故障隔离 — b675eb67f3687fb137434ef9610f1503edbbe8bc
  - 普通 tick 无改动完成 — ca6897f2e433c9c3bb45d0dad46ba685d864c87d
  - waiting 补链无源码却强要 live 合入 — 86b3b1721b4b6ad4db48b0279504144e490db010
  - 外部学习 report.md JSON 合同 — 6b013cb487ccdd5cf6fd3f439537ec9cb9851f8d
- 没修的：
  - kb_strategies 宽查询来源 metadata 超过24KB（队列1595） — 已实现未提交两叶候选；固定回归撤源码1败/恢复2过，tsc0、gitleaks0；完整沙箱130后默认workers重试124，628文件可见5725过/58败，无最终汇总。按每次提交前完整入口必须0的要求，保留strategy-budget-complete.patch与source-manifest.json，待原宿主精确检查；未合live。
  - ENOBUFS 运行配置溯源 — 原 110800 两叶候选待宿主完整检查；队列明确后批不要重复实现。
  - 补链回退 shipped 状态/上线时间 — 原 001301 四叶候选待完整检查及 CLI 更正，不重复实现或改账本。
  - v5-dpr-health/H1/V6/G2 监控与预算续项 — 范围较大，原 001302 六叶候选及模块 owner 待组合验收，不豁免未知/错误或降低样本门。
  - Jev 基础请求总预算 #25 — 范围较大，沿原投影/必要字段工程链；不能删事实或抬预算冒修复。
  - #36 原生名称长度/learner_tabs seal 生命周期 — 原 #36/#20 owner 已接续，不重复实现或操作在途 TUI/配置。
  - sandbox-glob-startup-race 上游目录生命周期 — 已有有界恢复；删除者及上游时序证据不足，不修改 deny/权限。
  - 历史固定测试超时家族与包装器分段验收 — 部分夹具已修；宽范围终态/性能因果证据不足，保留原失败与原检查链。
  - silent-0332 / invalid-json 冻结输入 / 胸箱 claimed-action 矛盾 — 原结构/策略提案及工程 owner 处理，资源与接口契约证据不足，保留严格守卫。
  - silent-0579 / silent-0581 / 斗篷及其余游戏模型、出牌、药水、SL、终局条目 — 策略类，沿既有 strategy-proposal 和候选链，本批不新增规则或重复提案。
  - arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression — 独立架构/策略研究，范围较大，不属于普通纯 bug 批次。
  - 七份旧提案 Markdown 原件缺失 — 证据不足，交原 owner/归档恢复链，不以摘要替代原件或重派研究。
- 测试：tsc退出码0；最后定向vitest 2文件/3用例/0（封包两例与恢复历史输入后的导入检查）。撤掉封包源码时1败1过/退出1；恢复后两例0，同一with-temp封装亦0。完整沙箱单worker无文件进度，中断130；默认4 workers及verbose有界重试600秒超时124，628个文件有已完成用例、5725过/58败（5783条可见完成），无最终完整汇总，后置paths阶段未运行，不冒称全套通过。
- 测试补证：可见失败含listen(127.0.0.1)/spawnSync EPERM，也有基线包装断言与稀疏输入缺口；未逐一归因58项。撤源码后check-imports与learner-launch-failures仍均失败（2文件/2例/1），后者Python16例实际OK但TS期望15。前者历史输入b84d95c5185941eec143cbcf2966d5770309cca5/211076字节已按storage CLI精确恢复，hash-object核同，随后导入检查通过；原失败保留。
- 合入：未合入（没有满足完整沙箱入口0的源码提交，未写live/版本/上线记录，未修改账本、提案队列或修复队列）。
- 需要 Roy 定的事（没有写「无」）：无。
- 候选与追溯：agent/src/brain/tools/agent-knowledge.ts、agent/tests/strategy-tool-budget.test.ts；strategy-budget-complete.patch、source-manifest.json、queue-audit.json、full-test-observations.json及全部原日志均在本scratch。证据为队列1595/原090927外部策略工具读回，run/floor/turn不适用（工具序列化）；固定夹具30条，不改知识文字、置信度、排序或游戏规则，精确ID和铁甲空结果逐字等价。新条目按kb_strategies/24KB/metadata查bug-infra均0项，不新建账本。
- 队列审计：1595行、72条未勾选均逐字与前批核同；17项既有修复重新核当前base祖先。最新1595工具缺陷单独实现候选；原owner/冻结候选、策略提案、历史失败及父项保持。

```json
{
  "task": "fix-batch",
  "base": "d93277a95c4c894ccc946193a399228ed92cdae2",
  "fixes": [],
  "skipped": [
    {
      "item": "kb_strategies 宽查询来源 metadata 超过24KB（队列1595）",
      "reason": "两叶候选已实现，撤源码回归失败、恢复通过；完整沙箱124，未提交/未合入，补丁与SHA清单已保存。"
    },
    {
      "item": "ENOBUFS 运行配置溯源",
      "reason": "原110800候选待宿主检查，队列要求不重复实现。"
    },
    {
      "item": "补链回退 shipped 状态/上线时间",
      "reason": "原001301候选待完整检查及CLI更正，不重复实现。"
    },
    {
      "item": "v5-dpr-health/H1/V6/G2 监控与预算续项",
      "reason": "原001302候选和模块owner待组合验收，范围较大。"
    },
    {
      "item": "Jev 基础请求总预算 #25",
      "reason": "原#25投影/必要字段工程链处理，范围较大。"
    },
    {
      "item": "#36 原生名称长度/learner_tabs seal 生命周期",
      "reason": "原#36/#20 owner接续，不重复实现或操作在途TUI。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "上游时序/删除者证据不足，保留隔离守卫。"
    },
    {
      "item": "历史固定测试超时家族与包装器分段验收",
      "reason": "宽范围根因证据不足；本轮另见基线15/16测试数量断言失败。"
    },
    {
      "item": "silent-0332 / invalid-json 冻结输入 / 胸箱 claimed-action 矛盾",
      "reason": "原结构/策略及工程owner处理，证据不足。"
    },
    {
      "item": "silent-0579 / silent-0581 / 斗篷及其余游戏模型、出牌、药水、SL、终局条目",
      "reason": "策略类，保留既有提案及候选，不新增游戏规则。"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression",
      "reason": "独立架构/策略研究，超出普通纯bug批次。"
    },
    {
      "item": "七份旧提案 Markdown 原件缺失",
      "reason": "证据不足，沿原owner/归档恢复链处理。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 124,
    "cases": 5783,
    "files": 628,
    "complete": false,
    "observed_passed": 5725,
    "observed_failed": 58,
    "targeted_vitest": 0,
    "targeted_files": 2,
    "targeted_cases": 3,
    "first_full_exit": 130
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261024-101321-540583b2-6eec-4ebd-9cf3-3bc8974806cc-fix-batch/report.md"
}
```

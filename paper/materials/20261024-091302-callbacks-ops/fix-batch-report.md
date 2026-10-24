## 修 bug 回报
- 合并基线：main → d6fc64f56c6cd0e2513e3f8a48e4fd171b3d7222
- 修复（每条一行）：无新增修复；fixes=[]。
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
- 测试：tsc 退出码 0；定向 vitest 7 文件 / 24 用例 / 退出码 0。首次默认配置加载 EROFS 退出 1、0 用例；改用 --configLoader runner 后通过，无超时重跑。源码未变，无提交，未重复整套 test-sandbox；不代表整套通过。
- 合入：未合入（无新增源码，不作空合并；未改 live/版本/上线记录）。
- 需要 Roy 定的事（没有写「无」）：无。

队列共 1593 行；72 条未勾选原文和逐条处置保存 queue-audit.json。历史未勾选不等于无实现；已修项核为本批 base 祖先并读回源码/测试入口。外部报告模板原源 b6399f1d 在 main 的实际集成提交为 6b013cb48，两份模板 diff 为空，未将原源冒称本树祖先。七组固定测试实际执行通过。
未修改队列、账本、提案状态、原报告/失败、main/live，无新增知识或代码提案。所有待办保持原 owner 与父项边界。

```json
{
  "task": "fix-batch",
  "base": "d6fc64f56c6cd0e2513e3f8a48e4fd171b3d7222",
  "fixes": [],
  "skipped": [
    {
      "item": "ENOBUFS 运行配置溯源",
      "reason": "原 110800 两叶候选待宿主完整检查；队列明确后批不要重复实现。"
    },
    {
      "item": "补链回退 shipped 状态/上线时间",
      "reason": "原 001301 四叶候选待完整检查及 CLI 更正，不重复实现或改账本。"
    },
    {
      "item": "v5-dpr-health/H1/V6/G2 监控与预算续项",
      "reason": "范围较大，原 001302 六叶候选及模块 owner 待组合验收，不豁免未知/错误或降低样本门。"
    },
    {
      "item": "Jev 基础请求总预算 #25",
      "reason": "范围较大，沿原投影/必要字段工程链；不能删事实或抬预算冒修复。"
    },
    {
      "item": "#36 原生名称长度/learner_tabs seal 生命周期",
      "reason": "原 #36/#20 owner 已接续，不重复实现或操作在途 TUI/配置。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "已有有界恢复；删除者及上游时序证据不足，不修改 deny/权限。"
    },
    {
      "item": "历史固定测试超时家族与包装器分段验收",
      "reason": "部分夹具已修；宽范围终态/性能因果证据不足，保留原失败与原检查链。"
    },
    {
      "item": "silent-0332 / invalid-json 冻结输入 / 胸箱 claimed-action 矛盾",
      "reason": "原结构/策略提案及工程 owner 处理，资源与接口契约证据不足，保留严格守卫。"
    },
    {
      "item": "silent-0579 / silent-0581 / 斗篷及其余游戏模型、出牌、药水、SL、终局条目",
      "reason": "策略类，沿既有 strategy-proposal 和候选链，本批不新增规则或重复提案。"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression",
      "reason": "独立架构/策略研究，范围较大，不属于普通纯 bug 批次。"
    },
    {
      "item": "七份旧提案 Markdown 原件缺失",
      "reason": "证据不足，交原 owner/归档恢复链，不以摘要替代原件或重派研究。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 24
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261024-091343-ea6b2be2-7b62-453e-9248-e8b4884ad375-fix-batch/report.md"
}
```

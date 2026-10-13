## 修 bug 回报

- 合并基线：main → 76d76fc2ae0e537d1579ad2934bd9b462d48d357
- 修复：rollout-live 持药文字夹具遗漏时钟/知识隔离 — 8867041f57f0e511606127e568603510af59a0e7 — 测试 agent/tests/rollout-held-potion.test.ts:preserves later-use facts with 10000 ms host pauses — 去掉修复时失败：是。固定 V1MF91VL7A2G/F33/T4；撤时钟隔离一败一过，恢复二过。
- 修复：学习状态锁固定夹具的同步五秒启动限时 — e770a6d09a8398aee4126f1b7ea37fc70687989f — 测试 agent/tests/learner-check-locks.test.ts:preserves real lock assertions after a six-second launcher delay — 去掉修复时失败：是。无游戏局/层/回合；来源旧 20261005-085844-experience-update 锁问题的验证夹具，原 Python 内容逐字保留。撤期限修复一败三过，恢复四过；非零退出及挂起结束保护通过。
- 已被别人修掉的：161 项来源/部署提交和本分支/main/冻结 live 祖先证据见 already-fixed.md 与 audit.json。近期包括 silent-0254 — 3b48088de；原生通知失败诊断 — 5c92f2aaf；实际进阶 — 8045d9fbf；空失败补链 — 3fdcd7792；共享 FS 固定快照 — 8390c62d7。仅核限定实现，不关闭宽提案或父学习要求。
- 没修的：sandbox-glob-startup-race 上游目录生命周期根因 — 证据不足：既有会话前恢复与复盘租约修复已在本树/live；本次两次工具构造沙箱仍遇并行工作树目录 ENOENT，不能归定删除者或扩大权限。；core-build-notify-222802-rc2 原历史通知恢复 — 证据不足：5c92f2aaf 已保存新失败诊断并维持幂等；旧 rc2 回执无 stderr，未证明通知未送达，未重发。；mod 单次请求超时与 Codex 缓存实测 — 证据不足：需要服务端/受控在线观测；本批离线、不调用 LLM 或网络。；boss 整场模拟性能与校准 — 太大/策略类：已有预算与测试时钟修复分别核实，剩余沿独立性能/校准任务，不添加机制。；silent-0332 双 boss 首战接续资源契约 — 证据不足：现有源码保留拒绝及种子/资源诊断；缺原触发样本，不编造 HP/药水，沿既有 5aa2672bd7cd1bf4 提案。；rest-timeout-accepted-route-not-committed（silent-0446） — 策略类/结构专用：当前超时分支仍未调用 applyResolved，沿既有 silent-proposal-2d3aa8dfb27dbe3f 独立 structure 任务；普通批不混入路线行为调整。；仍未闭环的出牌/药水/SL/终局/路线模型提案 — 策略类：原未划掉条目和既有提案状态逐项保存在 audit.json；不因局部实现或账本 shipped 关闭宽提案，不重复登记/派发。；arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression — 太大/策略类：获准独立功能与归因任务，不属于本普通纯 bug 批。；named-card-facts-transport 其他入口及 P1/P2 — 太大：事件资料透传子项 42c920f34 已实现；其余父范围沿原拥有者，不能把独立功能补完塞入本批或关闭父要求。；调度公平性及旧包装器收尾归因 — 证据不足：现有源码已有严格宿主定向续验入口，旧 waiting 排序观察未证明永久饥饿；不调整并发、任务状态或恢复历史动作。
- 测试：两个独立提交前均在全部批次工作区修复上执行原沙箱入口，tsc/vitest 退出码 0；每轮 370 文件/3535 项加 paths 1 文件/11 项，共 371 文件/3546 项。完整测试在合入后由调度器补跑，本批不冒称宿主全套通过。
- 测试历史：首轮 3 失败/3528 通过，持药语义与 strategy-research-scheduling 在隔离重跑通过；自有撤码备份 .ts 引入的 check-imports 失败已改存 .txt 后通过。第二轮 2 失败/3530 通过，ops-stall-recovery 与 unassigned-proposal-resolution 隔离重跑通过。第三轮 1 失败/3531 通过，learner-check-locks 旧五秒包装器隔离重跑通过，随后修复。三次失败、所有单项重跑和两项负对照完整保留，不倒写。
- 合入：未合入；最终锁内 merge-tree 退出码 0、无冲突，live 为 0b07f43b3bdf54138e922cb84f2fd41dce9db139。live 仍有未提交刷新数据；PID1=codex 的隔离视图无法核实宿主后台刷新已结束，未提交刷新或修改 live。交原调用方/运维在宿主视图按原流程接续。
- 需要 Roy 定的事：无。

```json
{
  "task": "fix-batch",
  "base": "76d76fc2ae0e537d1579ad2934bd9b462d48d357",
  "fixes": [
    {
      "item": "rollout-live 时钟隔离遗漏持药文字夹具",
      "commit": "8867041f57f0e511606127e568603510af59a0e7",
      "test": "agent/tests/rollout-held-potion.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "学习状态锁固定夹具仍以同步五秒子进程限时验证",
      "commit": "e770a6d09a8398aee4126f1b7ea37fc70687989f",
      "test": "agent/tests/learner-check-locks.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期根因",
      "reason": "证据不足：既有会话前恢复与复盘租约修复已在本树/live；本次两次工具构造沙箱仍遇并行工作树目录 ENOENT，不能归定删除者或扩大权限。"
    },
    {
      "item": "core-build-notify-222802-rc2 原历史通知恢复",
      "reason": "证据不足：5c92f2aaf 已保存新失败诊断并维持幂等；旧 rc2 回执无 stderr，未证明通知未送达，未重发。"
    },
    {
      "item": "mod 单次请求超时与 Codex 缓存实测",
      "reason": "证据不足：需要服务端/受控在线观测；本批离线、不调用 LLM 或网络。"
    },
    {
      "item": "boss 整场模拟性能与校准",
      "reason": "太大/策略类：已有预算与测试时钟修复分别核实，剩余沿独立性能/校准任务，不添加机制。"
    },
    {
      "item": "silent-0332 双 boss 首战接续资源契约",
      "reason": "证据不足：现有源码保留拒绝及种子/资源诊断；缺原触发样本，不编造 HP/药水，沿既有 5aa2672bd7cd1bf4 提案。"
    },
    {
      "item": "rest-timeout-accepted-route-not-committed（silent-0446）",
      "reason": "策略类/结构专用：当前超时分支仍未调用 applyResolved，沿既有 silent-proposal-2d3aa8dfb27dbe3f 独立 structure 任务；普通批不混入路线行为调整。"
    },
    {
      "item": "仍未闭环的出牌/药水/SL/终局/路线模型提案",
      "reason": "策略类：原未划掉条目和既有提案状态逐项保存在 audit.json；不因局部实现或账本 shipped 关闭宽提案，不重复登记/派发。"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression",
      "reason": "太大/策略类：获准独立功能与归因任务，不属于本普通纯 bug 批。"
    },
    {
      "item": "named-card-facts-transport 其他入口及 P1/P2",
      "reason": "太大：事件资料透传子项 42c920f34 已实现；其余父范围沿原拥有者，不能把独立功能补完塞入本批或关闭父要求。"
    },
    {
      "item": "调度公平性及旧包装器收尾归因",
      "reason": "证据不足：现有源码已有严格宿主定向续验入口，旧 waiting 排序观察未证明永久饥饿；不调整并发、任务状态或恢复历史动作。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3546
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-204302/learner/runs/20261013-204339-fix-batch/report.md"
}
```

本批只改五个测试叶，生产源码/知识数据/模型配置/运维 prompt 保持原样。没有对应 bug-infra 账本条目，不新建条目，也不把任何项标 shipped。两个来源提交分别保留，未推送、未运行 play、未停对局。原生通知仅只读 --help 验语法，未发送或重发。
现场：handoff-ops.md、check-history.json、batch-checked-files.json、ledger-lookup.json、notification-command-audit.md、各原始检查/撤码日志和 merge-result.json。工作树/失败/初稿保留，交原调用方/运维接续。

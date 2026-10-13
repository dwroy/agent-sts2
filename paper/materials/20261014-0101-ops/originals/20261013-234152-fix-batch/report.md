## 修 bug 回报

- 合并基线：main → b6cfca865bd7183f16f883fe073cec1ea87f9813
- 修复：第二策略槽真实批号的普通通知 ACK 校验 — 15eb85e2934e428c5e299fc4a1aba456d92fd685 — 测试 agent/tests/ordinary-notice-ack.test.ts:acknowledges verified ordinary notices without inventing a learning parent and rejects invalid proofs before writes — 去掉修复时失败：是。
- 修复：DPR 健康统计区分明确不支持、采样失败和候选 DPR 丢失 — 9e6dd82a34fb8c14e012be68fd0b632544f1459f — 测试 agent/tests/module-health.test.ts:separates unsupported candidates, failed sampling and missing DPR while preserving immutable incidents — 去掉修复时失败：是。证据 WA7FRJ7UABCV A10/F22 event/choose（非战斗回合）；本分支未合入。
- 已被别人修掉的：163 个历史限定源码条目逐项提交见 [already-fixed.md](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-234152/learner/runs/20261013-234208-fix-batch/already-fixed.md)；含 silent-0254 — 3b48088dec5fc6eafe576a1296bbdadde43432ee、额度余额基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f。另 F22 明确不支持的误报限定子项 — 9b87d54f097d84521152e6cca8d6072af8140394，自测期间已并行进入实际 live，保留该实现。
- 没修的：DPR执行性能、上游目录生命周期、旧未证通知投递、mod超时/缓存实测、调度公平性 — 证据不足；原策略/双boss/路线/架构/P1/P2/校准 — 策略类或太大，沿原提案/拥有者。48 原条目的逐项处置见 [queue-dispositions.md](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-234152/learner/runs/20261013-234208-fix-batch/queue-dispositions.md)。
- 测试：两次提交前最终 tsc 退出码 0；vitest 各 375 文件 / 3578 用例 / 退出码 0。DPR首轮4worker仅 rollout-live.test.ts:“code's ranking, options and auto-acts are unchanged by the rollout”超过原120秒（159.18秒）；单项单worker101.83秒通过，完整单worker再通过。两源码负对照退出1、恢复退出0；两gitleaks0；日志见 [check-history.json](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-234152/learner/runs/20261013-234208-fix-batch/check-history.json)。
- 合入：未合入；锁内整枝预检退出1、31处冲突（健康源码/测试2、知识10、历史/论文19）；live保持 7e04d9a42dd6080a8d3716dd165e44d4b30c458d，原两份dirty notes不动。无刷新目标改动，不造上线/版本/shipped；冲突与接续资料见 [handoff-ops.md](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-234152/learner/runs/20261013-234208-fix-batch/handoff-ops.md)。
- 需要 Roy 定的事：无。

```json
{
  "task": "fix-batch",
  "base": "b6cfca865bd7183f16f883fe073cec1ea87f9813",
  "fixes": [
    {
      "item": "第二策略槽真实批号的普通通知ACK校验",
      "commit": "15eb85e2934e428c5e299fc4a1aba456d92fd685",
      "test": "agent/tests/ordinary-notice-ack.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "DPR健康统计区分明确不支持/采样失败/候选DPR丢失",
      "commit": "9e6dd82a34fb8c14e012be68fd0b632544f1459f",
      "test": "agent/tests/module-health.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "V5 DPR执行性能",
      "reason": "证据不足：冻结六探针/39原题仍有21不足300、1零配对；只有分类子项完成，未定位可修执行根因，原300/1000/11000/24保持。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "证据不足：已有会话前恢复/租约源码已修，本轮工具仍遇并行目录ENOENT；归属未证，不扩大沙箱或凭据权限。"
    },
    {
      "item": "core-build-notify-222802-rc2 原历史通知恢复",
      "reason": "证据不足：新失败诊断/幂等已修；旧rc2无stderr，未证明未发送，不重投。"
    },
    {
      "item": "mod单次超时、Codex缓存实测",
      "reason": "证据不足：需服务端/受控在线取证，本批离线，不调用LLM或网络。"
    },
    {
      "item": "未闭环出牌/药水/SL/终局/路线及双boss接续提案",
      "reason": "策略类：逐项原ID/处置见queue-dispositions.json和audit.json；沿既有strategy-proposal链，不因限定实现关闭宽项、不重复派发。"
    },
    {
      "item": "rest-timeout-accepted-route-not-committed",
      "reason": "策略类/structure专用：原silent-proposal-2d3aa8dfb27dbe3f保留，不混入普通纯bug批。"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression",
      "reason": "太大/策略类：原独立功能和归因任务保留。"
    },
    {
      "item": "named-card-facts-transport 其他入口/P1/P2、boss校准",
      "reason": "太大/策略类：已有事件资料子项/校准入口保留，其他父范围沿原拥有者。"
    },
    {
      "item": "调度公平性/旧包装器收尾归因",
      "reason": "证据不足：定向宿主续验入口已修，原观察未证明永久饥饿；不改原队列/并发或恢复未知历史动作。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3578
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-234152/learner/runs/20261013-234208-fix-batch/report.md"
}
```

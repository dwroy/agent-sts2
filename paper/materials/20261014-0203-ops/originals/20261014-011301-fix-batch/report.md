## 修 bug 回报

- 合并基线：main → 6e78ec08cd7eb641b8ccd8f4c466bad8a7319058
- 修复（每条一行）：stall 子进程退出/超时诊断与启动确定性 — 9b6459fd99f26b17689134e33aa85d6190e71d7d — 测试 agent/tests/ops-stall-recovery.test.ts:retains exit, signal, stderr and timing evidence in a readable subprocess failure — 去掉修复时失败：是（4失败/3通过，恢复7通过）。
- 已被别人修掉的：163项历史限定源码逐项见 [already-fixed.md](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-011301/learner/runs/20261014-011327-fix-batch/already-fixed.md)；本批复核main/live/本树祖先均通过。第二槽ACK已有原源码 15eb85e2934e428c5e299fc4a1aba456d92fd685（未合main/live，重复草稿撤回）；DPR明确不支持诊断已实际部署 c988032d2。
- 没修的：策略/结构/架构独立任务、DPR性能、上游目录竞态、旧通知/缓存/公平性缺证 — 策略类 / 证据不足 / 太大；逐条原链见 [queue-dispositions.md](/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-011301/learner/runs/20261014-011327-fix-batch/queue-dispositions.md)。silent-0459成本项按原6a39提案链接续。
- 测试：最终tsc退出码0；vitest 376文件 / 3594用例 / 退出码0（2 worker，未重跑）。源码负对照退出1、恢复退出0；gitleaks0。重复ACK草稿先行沙箱376文件/3593用例0，撤回不提交；辅助类型检查首次CLI选项拒绝、改用--ignoreConfig后0，原日志保留。
- 合入：未合入；锁内预检29冲突（10知识、19历史/记录），保留10份刷新数据提交 5e064b7a25a30a838eb182df45e7fac448b2a469 和两份原dirty notes。未实际merge，无上线记录/eval版本/shipped，原源码与失败工作树保留。
- 需要 Roy 定的事（没有写「无」）：无。

```json
{
  "task": "fix-batch",
  "base": "6e78ec08cd7eb641b8ccd8f4c466bad8a7319058",
  "fixes": [
    {
      "item": "ops-stall-recovery-test-subprocess-timeout：子进程退出/超时诊断与六秒启动确定性验证",
      "commit": "9b6459fd99f26b17689134e33aa85d6190e71d7d",
      "test": "agent/tests/ops-stall-recovery.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "第二策略槽普通通知ACK批号兼容",
      "reason": "原源码15eb85e2934e428c5e299fc4a1aba456d92fd685已修但未合main/live；本批重复草稿已保存后撤回，不重复实现，原链兜底合入。"
    },
    {
      "item": "V5 DPR执行性能及前批附加诊断",
      "reason": "性能证据不足：未定位执行根因；c988032d2已部署明确不支持的诊断子项；9e6dd82a附加分类已有原提交待接续，不重复实现。原300/1000/11000ms/24线程保持。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "证据不足：有界预检恢复和原租约ID已修；具体删除者与上游生命周期仍未知，原沙箱与deny保持。"
    },
    {
      "item": "core-build-notify-222802-rc2 旧通知恢复",
      "reason": "证据不足：失败诊断与幂等源码已修，原rc2无stderr、未证明没有发送，不重投。"
    },
    {
      "item": "mod单次超时、Codex缓存实测、调度公平性及旧包装器收尾归因",
      "reason": "证据不足：需原服务端/在线或实际调度取证；已有定向续验入口保留，不改队列/并发或恢复未知动作。"
    },
    {
      "item": "未闭环出牌/药水/SL/终局/路线、双boss及结构提案",
      "reason": "策略类：53条原队列处置见queue-dispositions.json；保留原提案、拥有者和未观察边界，不重复派发或实施游戏规则。"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression、具名牌资料其他入口/P1/P2与boss校准",
      "reason": "太大/策略类：原独立功能、证据审计与拥有者接续；已有限定实现不关闭父范围。"
    },
    {
      "item": "silent-0455/0458 普通0费钢铁风暴",
      "reason": "策略类：已沿silent-proposal-69776c308a3b298e登记，不混入普通批。"
    },
    {
      "item": "silent-0459 独立run-plan成本漏计",
      "reason": "原条目明确沿silent-proposal-6a39ea0a435755c5接续，不另派普通修复或抢原实现链。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3594
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-011301/learner/runs/20261014-011327-fix-batch/report.md"
}
```

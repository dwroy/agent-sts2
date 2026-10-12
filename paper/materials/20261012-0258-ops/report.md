## 修 bug 回报

- 合并基线：main → d39eb1db3101bc480271fe31c9dcc5b7129cca54（开工干净，merge已是最新）
- 修复（每条一行）：无新增；当前已确认纯bug均已有修复，本批未修改代码或提交。
- 已被别人修掉的：额度恢复旧余额基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：升阶通知使用实际进阶 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：会话退出假模型夹具 — 874ae603b3927173f805e0b2fe789330bab710c7
- 已被别人修掉的：已批准推送动作注册 — c519952b31e3a0bb3acdd2115883ae8671b8a090
- 已被别人修掉的：首次冻结实现绑定 — fc95760d4ff8a9cbd45577efdd79b1215bd2cb92
- 已被别人修掉的：会话前ENOENT有界恢复 — bc2c40e313cc36682196277c53c50e30744b88c5
- 已被别人修掉的：派发夹具保留生产工作树guard — 2b09c47d431a580e9955d157f4dfb0e576186206
- 已被别人修掉的：宿主定向补验入口 — 24c2e3a75b5db6bac76d6c924f86b7fcd9438316
- 已被别人修掉的：宿主补验依赖路径映射 — 37195c92bd1694d0341cb3eed8245e1019f164e6
- 已被别人修掉的：烟雾/勒紧固定测试契约 — 96e31e9690c3eaf0c0856907d2f99f479d2a43b0
- 已被别人修掉的：量化实现有界接续入口 — b408252f87a77ee5389c4d90e52a9831c0873348
- 已被别人修掉的：其余141条历史记录 — 逐条提交和祖先核验见 [queue-review.md](queue-review.md)；近期源码核对见 current-source-recheck.json。
- 没修的：机制、出牌、药水、SL、终局、路线及休息的剩余提案 — 策略类：沿原有strategy-proposal及共享租约处理；已发布子范围不等于宽提案全部完成，本批不补开发者游戏知识。
- 没修的：silent-0332双boss接续资源异常根因 — 证据不足：诊断子项已在当前代码，仍缺触发seed及首战末资源，不猜填HP或药水。
- 没修的：core-build-notify-222802-rc2历史失败恢复 — 证据不足：保存stderr的修复5c92f2aa已在；历史回执仍无stderr和未发送证明，未重发。
- 没修的：sandbox-glob-startup-race上游目录竞态 — 证据不足：会话前有界恢复bc2c40e31已上线，目录实际创建/删除者及自然恢复仍未证。
- 没修的：调度公平性、mod短暂请求超时 — 证据不足：原队列未证永久饥饿或mod内部根因，不更改调度策略。
- 没修的：arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存和性能实测 — 太大/独立功能及策略研究：保留原专用任务，不混入本次纯bug批次。
- 测试：tsc退出0；定向vitest 10文件 / 80用例 / 退出0；无重跑。日志tsc.log、targeted.log。不声称运行完整sandbox或沙箱外套件；无新增提交，逐项撤修复验证不适用。
- 合入：未合入（无新增代码）。只读live切点 7bf7e0e5dc2b379c72c6c781c2831eaaa58c5ad0；未造空合并/版本/上线记录。main/live保留既有源码差异，verify_empty_fix严格同源码校验返回null，请调用方据本报告核实空批处置，未改原失败/调度状态。
- 需要 Roy 定的事：无。报告及核验材料保存在任务临时目录，修复队列和其他记录保持不变。

```json
{
  "task": "fix-batch",
  "base": "d39eb1db3101bc480271fe31c9dcc5b7129cca54",
  "fixes": [],
  "skipped": [
    {
      "item": "机制、出牌、药水、SL、终局、路线及休息的剩余提案",
      "reason": "策略类：沿原有strategy-proposal及共享租约处理；已发布子范围不等于宽提案全部完成，本批不补开发者游戏知识。"
    },
    {
      "item": "silent-0332双boss接续资源异常根因",
      "reason": "证据不足：诊断子项已在当前代码，仍缺触发seed及首战末资源，不猜填HP或药水。"
    },
    {
      "item": "core-build-notify-222802-rc2历史失败恢复",
      "reason": "证据不足：保存stderr的修复5c92f2aa已在；历史回执仍无stderr和未发送证明，未重发。"
    },
    {
      "item": "sandbox-glob-startup-race上游目录竞态",
      "reason": "证据不足：会话前有界恢复bc2c40e31已上线，目录实际创建/删除者及自然恢复仍未证。"
    },
    {
      "item": "调度公平性、mod短暂请求超时",
      "reason": "证据不足：原队列未证永久饥饿或mod内部根因，不更改调度策略。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存和性能实测",
      "reason": "太大/独立功能及策略研究：保留原专用任务，不混入本次纯bug批次。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "files": 10,
    "cases": 80
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261012-024302/learner/runs/20261012-024310-fix-batch/report.md"
}
```

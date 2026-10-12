## 修 bug 回报
- 合并基线：main → 6c7e632e4d5bd21aeba42acfd2b4dbeb7dc7fbee
- 修复（每条一行）：角色前缀测试固定隔离缺表／已有表 — 5ef3c4612bd2673c19968c5a2d24bf62af519ee1 — 测试 agent/tests/multi-character.test.ts:renders a prefix and a system prompt that say Silent and carry no Ironclad guide；renders the Silent's own fixed potion table when present without another character's guide — 去掉修复时失败：是（撤目录修复1败；恢复2过）
- 修复（每条一行）：受阻无产出经验批次不误派补链 — 84366ad06ee4f978394c1b9489a82c83ea12bd36 — 测试 agent/tests/blocked-experience-repair.test.ts:keeps an empty blocked attempt failed without scheduling proposal repair — 去掉修复时失败：是（撤源码3败、15过；恢复18过）
- 已被别人修掉的：152条历史修复及提交号逐项保存在同目录 queue-review.md / already-fixed-recheck.json，均为核查时 live 祖先；17个近期关键源码与上一批逐字一致。历史祖先不等同重新学习或验证所有游戏机制。
- 没修的：剩余机制、出牌、药水、SL、终局、路线和休息提案 — 策略类：沿既有 strategy-proposal 及专用任务；本批没有新增游戏判断，不把已上线子范围当作宽提案完成。
- 没修的：silent-0332 双 boss 接续资源异常根因 — 证据不足：当前代码已有分支、seed 和资源诊断，尚缺可复现触发样本；沿原提案核实，不猜填 HP 或药水。
- 没修的：core-build-notify-222802-rc2 历史失败恢复 — 证据不足：5c92f2aa 已保存后续通知诊断；历史回执仍 failed/rc2 且无 stderr，不能确定旧失败原因或证明未发送，保留去重，不重发。
- 没修的：sandbox-glob-startup-race 上游目录竞态 — 证据不足：bc2c40e31 会话前有界恢复及 4fef181d5 隔离预检暂时 ENOENT 单次复验均已上线；目录创建/删除者根因仍未证，不放宽权限或清理其他树。
- 没修的：调度公平性核查、mod 短暂请求超时 — 证据不足：队列仍仅有位置分布和自愈观察，没有永久饥饿或 mod 内部根因的确证。
- 没修的：arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存及性能实测 — 太大/独立功能及策略研究：保留原专用任务，不混入本次普通纯 bug 批次。
- 测试：两次提交前的成功入口均为 tsc 退出0；vitest 325文件 / 3218用例 / 退出0（324文件3207例，另paths1文件11例）。既有学习流程固定回归24例通过。最初入口tsc0、vitest 322文件3188例过／1例导入检查失败，原因是本批撤码备份 .ts 被扫描；保留同字节 .ts.txt 后定向复验通过，再完整重跑通过。没有战斗超时重跑。gitleaks两个源码提交扫描均退出0。
- 合入：未合入 — 锁内预检发现22处既有记录／账本冲突，按任务要求停止，未执行合并或解决历史记录冲突；正式锁内预检见 merge-result.json / live-merge-preview.txt。知识刷新提交 579511007c5fcd5f9bfe64e1257b87382d2c0f7e；合并前 live 579511007c5fcd5f9bfe64e1257b87382d2c0f7e。没有覆盖刷新数据或解决未授权的历史记录冲突，没有实际源码合入、上线记录、eval版本或shipped登记。
- 需要 Roy 定的事：无。合入冲突交运维沿原任务兜底；不重写旧失败／rc0／blocked／retry或历史错误补链项。

两项均为 N1ZEBMHZM4KC 收尾／学习流程的工具缺陷，战斗层／回合不适用。证据原件SHA、红绿过程、首次失败和测试日志见 verification.json。bug-infra关键词与局号查询均无对应条目，未新建账本。只改本批三文件，游戏规则与各角色行为保持原样。

```json
{
  "task": "fix-batch",
  "base": "6c7e632e4d5bd21aeba42acfd2b4dbeb7dc7fbee",
  "fixes": [
    {
      "item": "multi-character-potion-table-fixture-isolation：角色前缀测试依赖真实药水表",
      "commit": "5ef3c4612bd2673c19968c5a2d24bf62af519ee1",
      "test": "agent/tests/multi-character.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "blocked-experience-proposal-repair-dispatch：受阻无产出经验批次误派补链",
      "commit": "84366ad06ee4f978394c1b9489a82c83ea12bd36",
      "test": "agent/tests/blocked-experience-repair.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "剩余机制、出牌、药水、SL、终局、路线和休息提案",
      "reason": "策略类：沿既有 strategy-proposal 及专用任务；本批没有新增游戏判断，不把已上线子范围当作宽提案完成。"
    },
    {
      "item": "silent-0332 双 boss 接续资源异常根因",
      "reason": "证据不足：当前代码已有分支、seed 和资源诊断，尚缺可复现触发样本；沿原提案核实，不猜填 HP 或药水。"
    },
    {
      "item": "core-build-notify-222802-rc2 历史失败恢复",
      "reason": "证据不足：5c92f2aa 已保存后续通知诊断；历史回执仍 failed/rc2 且无 stderr，不能确定旧失败原因或证明未发送，保留去重，不重发。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录竞态",
      "reason": "证据不足：bc2c40e31 会话前有界恢复及 4fef181d5 隔离预检暂时 ENOENT 单次复验均已上线；目录创建/删除者根因仍未证，不放宽权限或清理其他树。"
    },
    {
      "item": "调度公平性核查、mod 短暂请求超时",
      "reason": "证据不足：队列仍仅有位置分布和自愈观察，没有永久饥饿或 mod 内部根因的确证。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存及性能实测",
      "reason": "太大/独立功能及策略研究：保留原专用任务，不混入本次普通纯 bug 批次。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "files": 325,
    "cases": 3218
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261012-083154/learner/runs/20261012-083203-fix-batch/report.md"
}
```

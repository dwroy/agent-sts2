## 修 bug 回报

- 合并基线：main → 817632b7893e37a8b02b21ae0ce90972688aa32b
- 修复（每条一行）：校准派发夹具缺少生产守卫要求的工作树目录 — 800409ce6edd7a85705564523df43b39d451c78a — 测试 agent/tests/calibration-dispatch-fixtures.test.ts:dispatches fixed feature fixtures while retaining missing-tree guards — 去掉修复时失败：是
- 修复（每条一行）：host-targeted-check-continuation：绑定身份和已有覆盖的宿主定向补验入口 — b534ef63195899ce24900c93a9053f94ddd003ed — 测试 agent/tests/learner-check-continuation.test.ts:binds host supplements to original coverage and exact sources without repeating full checks — 去掉修复时失败：是
- 修复（每条一行）：sandbox-glob-startup-race：会话前ENOENT有限重试 — cfa32d49f60b849ae5d45c907dc9a7721c3c9818 — 测试 agent/tests/learner-startup-recovery.test.ts:retries exact pre-session ENOENT after close with identical input and one final completion — 去掉修复时失败：是
- 已被别人修掉的：额度旧余额基线 — e5e2995d6；实际进阶通知 — 8045d9fbf；会话退出夹具 — 874ae603b；冻结实现绑定 — fc95760d4；推送注册 — c519952b3。当前实现已核；main部分通过增量提交纳入，详 recent-fixed-recheck.json。
- 已被别人修掉的：无决策死亡0254 — 3b48088de；回合末挡诊断0338 — c1d848049；商店移除事实0272 — db20ec3cc；rollout最佳线路夹具 — 366917d1e；原生通知诊断子项 — 5c92f2aaf（不等历史通知恢复）。历史141项提交仍为本基线/live祖先，逐项名称与完整提交见 prior-prior-already-fixed.md、already-fixed-recheck.json。
- 已被别人修掉的：运维在本批期间并行将原候选派发夹具2b09c47d4、宿主补验24c2e3a75、启动恢复bc2c40e31纳入live 6639e2f33f6200061d3111306abb5dfa0f908a83；本分支复用这些候选并重新验证，不冒称原功能首次实现。另发现并修正补验依赖映射误写strategy_implementation.py的问题，新增固定回归；这一修正尚未进入live。
- 没修的：机制/策略项 silent-0250,0256,0260,0263,0266,0268,0271,0273,0279,0287,0290,0291,0293,0295,0296,0297,0300,0308,0311,0317,0319,0320,0322,0329,0334,0339,0344,0347,0349,0362,0365,0367 — 策略类：保留既有独立strategy-proposal链；局部已实现不当宽项全部关闭，不重复派发或改玩法。
- 没修的：silent-0332 双boss接续资源契约 — 证据不足：仍缺触发seed/首战末帧，已有诊断提案silent-proposal-5aa2672bd7cd1bf4；保留正HP契约，不填造资源。
- 没修的：core-build-notify-222802-rc2历史失败恢复 — 证据不足：当前已保存新失败诊断，但历史失败缺stderr/未发送证明，不能安全重发原通知。
- 没修的：mod短暂请求超时 — 证据不足：缺mod内部根因，原自动恢复历史保留。
- 没修的：arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存/性能实测 — 太大／独立功能和策略研究：本普通纯bug批次不扩大职责或调用模型/网络。
- 没修的：调度公平性核查 — 证据不足：插入顺序快照不能证明永久饥饿；保持并发/队列状态，沿既有框架核查。
- 没修的：sandbox-glob-startup-race上游根因 — 证据不足：本批集成有界安全恢复；未确认目录消失的创建/删除者，也未验证自然复发。
- 没修的：ops-20261012-quantitative-continuation — 独立冻结续办：队列新增条目明确当前011302活批不修改、下批去重领取；本批不追加任务或改其冻结输入。
- 测试：三项提交前tsc均退出0；沙箱vitest依次289文件/2828用例/0、290文件/2830用例/0、291文件/2853用例/0。第二项首轮check-imports.test.ts:all resolve误收临时源码备份host-fixed-lib.ts（1失败、2818通过），备份原样更名.ts.txt后重跑原入口全部通过；原失败日志保留。三项撤修复分别1、2、1例失败，恢复分别1、2、23例通过；宿主协议19项Python固定检查全过，依赖映射单独撤修复失败。三次gitleaks均0；没有真实LLM或网络调用，固定排除项目未冒称通过。
- 合入：未合入。三次取live锁等待30/50/50秒均退出75，回调未开始，未执行刷新提交或合后测试。对固定live 6639e2f33f6200061d3111306abb5dfa0f908a83的只读merge-tree检查退出1，共6处冲突：notes/codex1-drain-ops-handoff.md、notes/for-roy.md、ops/inbox-dev.md、ops/learner_check_continuation.py、ops/tests/test_learner_check_continuation.py、paper/materials/decision-log.md。按有冲突即停处理，未修改live索引/分支/工作树；原脏notes/fight-value-backtest-silent.md保留。详live-merge-receipt.json与immutable-merge-preflight.log。
- 需要 Roy 定的事：无。三份独立源码和fixes-only.patch保留；依赖映射的dependency-mapping-only.patch在当前live上apply --check退出0，仅检查未应用，交原运维完成事件兜底。CLI未找到本三项对应bug-infra，因此没有新建或更新账本，没有版本、上线记录、shipped或新策略提案。报告及原失败/红绿/沙箱/gitleaks日志均在本目录。

```json
{
  "task": "fix-batch",
  "base": "817632b7893e37a8b02b21ae0ce90972688aa32b",
  "fixes": [
    {
      "item": "校准派发夹具缺少生产守卫要求的工作树目录",
      "commit": "800409ce6edd7a85705564523df43b39d451c78a",
      "test": "agent/tests/calibration-dispatch-fixtures.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "host-targeted-check-continuation：绑定身份和已有覆盖的宿主定向补验入口",
      "commit": "b534ef63195899ce24900c93a9053f94ddd003ed",
      "test": "agent/tests/learner-check-continuation.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "sandbox-glob-startup-race：会话前ENOENT有限重试",
      "commit": "cfa32d49f60b849ae5d45c907dc9a7721c3c9818",
      "test": "agent/tests/learner-startup-recovery.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "机制/策略项 silent-0250,0256,0260,0263,0266,0268,0271,0273,0279,0287,0290,0291,0293,0295,0296,0297,0300,0308,0311,0317,0319,0320,0322,0329,0334,0339,0344,0347,0349,0362,0365,0367",
      "reason": "策略类：保留既有独立strategy-proposal链；局部已实现不当宽项全部关闭，不重复派发或改玩法。"
    },
    {
      "item": "silent-0332 双boss接续资源契约",
      "reason": "证据不足：仍缺触发seed/首战末帧，已有诊断提案silent-proposal-5aa2672bd7cd1bf4；保留正HP契约，不填造资源。"
    },
    {
      "item": "core-build-notify-222802-rc2历史失败恢复",
      "reason": "证据不足：当前已保存新失败诊断，但历史失败缺stderr/未发送证明，不能安全重发原通知。"
    },
    {
      "item": "mod短暂请求超时",
      "reason": "证据不足：缺mod内部根因，原自动恢复历史保留。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存/性能实测",
      "reason": "太大／独立功能和策略研究：本普通纯bug批次不扩大职责或调用模型/网络。"
    },
    {
      "item": "调度公平性核查",
      "reason": "证据不足：插入顺序快照不能证明永久饥饿；保持并发/队列状态，沿既有框架核查。"
    },
    {
      "item": "sandbox-glob-startup-race上游根因",
      "reason": "证据不足：本批集成有界安全恢复；未确认目录消失的创建/删除者，也未验证自然复发。"
    },
    {
      "item": "ops-20261012-quantitative-continuation",
      "reason": "独立冻结续办：队列新增条目明确当前011302活批不修改、下批去重领取；本批不追加任务或改其冻结输入。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "files": 291,
    "cases": 2853
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261012-011302/learner/runs/20261012-011311-fix-batch/report.md"
}
```

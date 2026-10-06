# S1.fix27 上线记录

- 2026-10-06 09:07 运维处理09:05 fix-done：调度批次20261006-084301-fix-batch，学习者目录learner/runs/20261006-084302-fix-batch。源码3fe6251b746cebe816b9db3c0d8aa9d6090bec0a→实际代码合入6e9fec36e9eb8098c964114f2f9af097598ae4fc→固定已测发布1e047a360ec6aa1a19205c068fb73cef46d685ea/树1528d442a44ad2b1f90b2324726074d404475ebe，均为live祖先；唯一S1.fix27指向实际代码合入。学习者自测后自行上线，无须另设审核。
- 证据与实现沿用学习者回报：25226ZFLNR1J SILENT A10 F35、JMH5C51RLN4E SILENT A10 F44路线题（回合不适用）、F48第5次T13胜后8/60与F49 T1。前场Boss损血未建模时，后场HP中位数/p75及计划、记忆保留未知；不把单局损血推广为固定成本，不增加机制、路线/休息策略或药水规则。铁甲单Boss路线至Boss进场数字与排名等价，共同投影器未使用的Boss战后end/riskAfter及多Boss路径虚假确定值一并纠正；细节见原handoff，不由运维补公式。
- 最终源与合后固定沙箱tsc0、195文件2118例、exit0，均首轮通过。撤掉五个源码文件后固定六例5失败1通过，恢复6通过；初稿状态夹具缺字段失败及两次仅decision-log冲突的预检exit1历史保持。沙箱外完整tsc + vitest待learner-checks，不借用经验37的外部通过。
- 锁内先提交七项自动刷新549c890c6d7177a2d97557ef90f7ab3efaa2cac5，incoming知识为空、重叠为空；合前/合后全部知识blob一致，六项源码/测试blob与源提交一致。双方decision-log保留，其他notes与未跟踪刷新不覆盖；本轮只同步固定发布，不改live工作区，不重建知识。
- silent-0163原learner:fix-batch proposed逐字归档；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 165 item(s), 0 problem(s)。随后仅0163经CLI/by=ops追加shipped/S1.fix27；first_run=25226ZFLNR1J、prior=no、claim/evidence/kind及旧历史保持。0164/0165独立机制、0153/S1.fix26及旧shipped不重置。
- 112项已修历史逐项核对文件与未修范围保留在原批次。未修策略、证据不足和性能专项沿原任务，不因回报旧称呼新增Roy审批门槛；无Roy新待定。机械集成与论文数据刷新结果随后追加。

原日志指纹：

```json
{
  "source-sandbox": {
    "bytes": 502,
    "sha256": "61a9cb35320f811ac5787c85069f56c1de2b512c5b7a9d7856828a6619317bc7",
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-084302-fix-batch/source-sandbox.log"
  },
  "live-sandbox": {
    "bytes": 491,
    "sha256": "5d5b1ec4ee1194f8caff8db41dc3eee5ffd0c75d38d68aa134b72e4ef20abe8a",
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-084302-fix-batch/live-sandbox.log"
  },
  "route-boss-red": {
    "exit": 1,
    "summary": "5 failed | 1 passed (6)",
    "bytes": 5203,
    "sha256": "a2dd8b5b52ecc1ec911d39ee85d741af8e9cd30c96b3f72d32b1a410d4cd751f"
  },
  "route-boss-green-restored": {
    "exit": 0,
    "summary": "6 passed (6)",
    "bytes": 241,
    "sha256": "8bc60848acca3e6dc5d31d3542160f0940431f752a3fa75935b0dbbf25a7500e"
  },
  "report.json": {
    "bytes": 1117,
    "sha256": "dc13f8a941368f5a44db656a5de156ef81b43087864ed9c43aa0db2e0ce8ff88"
  },
  "report.md": {
    "bytes": 2532,
    "sha256": "a4501af950a5aedec7366cd6c8ab883e23ba3b568774564d3cdf50dc9e81ee5d"
  },
  "handoff-ops.md": {
    "bytes": 3400,
    "sha256": "4985fe168a764e10efa58d41ca9650b5bb40971f6c72b55b88d9573c6edbc445"
  },
  "route-boss-green-initial.log": {
    "bytes": 1406,
    "sha256": "d6ff132adbb4f30e8b0fa218af86a4f3b3f83a512877c36fb565d1dde23915a4"
  },
  "live-preflight-baseline.log": {
    "bytes": 403,
    "sha256": "571b50c63be4192458ce9e62ad26b1778f6053993df52f1d0fc07355358549ae"
  },
  "live-preflight.log": {
    "bytes": 403,
    "sha256": "b96b2215039f828fbc0b3a04e20794592455ffcfcd89f1e7e9d6098d5465423a"
  }
}
```

- 2026-10-06 09:07 原proposed归档b923590b12c6c548e59c73d9899656cf397cf782，main同步388688333229e92f4544f1d208c69e7e4e75cf9f，全部1021源码/测试blob一致、其他2130项main最新blob及双方日志保持，七项生成知识保留。CLI/by=ops仅silent-0163追加shipped/S1.fix27；first_run/prior/evidence/repeat不变，0164/0165/0150独立保持；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 165 item(s), 0 problem(s)。只关闭队列对应模型项，其他任务保留，随后论文数据刷新。

- 2026-10-06 09:12 论文数据和学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-06T01:07:58.495Z，五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN；行数{"commits.csv": 2767, "decisions_by_label.csv": 17757, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 531}。0163 shipped提交648570c3c004f55700ef76c8cb35212377d41c08；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 165 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台工作保留；完整外部检查待learner-checks，旧失败历史保持。

- 2026-10-06 09:13 09:13完整补测结案：20261006-084301-fix-batch固定发布1e047a360ec6aa1a19205c068fb73cef46d685ea/树1528d442a44ad2b1f90b2324726074d404475ebe沙箱外完整tsc + vitest exit0，246文件2926通过/2跳过（09:04:23起516.32秒）；原日志ops/codex-ops/learner/20261006-084301-fix-batch.fallback-1528d442a44ad2b1f90b2324726074d404475ebe.checks.log（61706字节/SHA256 b11f71bcd1ee62cad6effe2f3a0e966c5f9422e8b447cca8a78d4d5bbca53073），调度器checks_pending=false、checks/fallback_checks对应固定树rc0。源码、代码合入与固定发布均为main/live祖先，全部1021源码/测试blob与main一致，唯一S1.fix27和0163 shipped核对；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 165 item(s), 0 problem(s)。沿用main同步388688333229e92f4544f1d208c69e7e4e75cf9f及CLI shipped提交648570c3c004f55700ef76c8cb35212377d41c08，关闭完整补测待办，既有初稿字段/decision-log冲突预检/撤源失败历史保留。本轮只追加结案记录。

# 修复批次111301未上线

记录时间：2026-10-05 11:30。事件回报ops/codex-ops/learner/20261005-111301-fix-batch.out；学习者归档learner/runs/20261005-111302-fix-batch/handoff-ops.md及report.json。

{
  "task": "fix-batch",
  "base": "e2968b670d405ca9de18e5dda6aacf67bfe25be5",
  "fixes": [
    {
      "item": "计算下注后仍推演已弃原手牌（已有提交，本批复核）",
      "commit": "3cd9fc6c6b6bfa378508f7bd5ca2219c1088ad39",
      "test": "agent/tests/silent-calculated-gamble.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "涂毒逐击新增毒漏算（已有提交，本批复核）",
      "commit": "e3e7068b028e9d9bb75441b99a973161e9d90f4d",
      "test": "agent/tests/silent-envenom.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "动作清单缺strategy-proposal和learner-recheck",
      "commit": "ed86d537",
      "test": "agent/tests/ops-action-list.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "保血、留药、全死排序、巨兽拖延、boss时钟校准/样本门槛、路线/休息、SL范围、小偷优先、A10第二boss、无色估值",
      "reason": "策略类；按本任务范围不修改"
    },
    {
      "item": "旧事件屏/CARDS_VIEW重复重问",
      "reason": "证据不足，未定位可复现根因"
    },
    {
      "item": "Codex缓存命中偏低",
      "reason": "证据不足，离线任务不能进行受控LLM实测"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 1,
    "cases": 1947
  }
}

已核实ed86d537/3cd9fc6c/e3e7068b均非main/live祖先，live与codex-dev干净，live回退452f7bc7并保留自动刷新与S1.exp12。源分支precommit.log：tsc0，166文件1958用例通过；live-tests.log：tsc0，165文件1945通过/2失败、总1947，vitest exit1，paths阶段未执行。baseline-targeted.log与fixed-snapshot-targeted.log使用相同不可变知识快照、旧/新源码都2失败23未选择，确认同样基线问题，未定位最终根因。fixed-regressions.log中三项7例通过；红绿日志保留，但不能充作live合后成功。

本轮不合入、复测同样失败或改账本/版本；global ledger check88项0问题，当前其他复盘改动不提交。下一批最高优先先修测试数据隔离/原契约问题，不放宽断言、添加排除或修改游戏规则；之后再按live流程上线固定提交。没有实际合入前不调用整批learner-recheck，保留全部源祖先校验。

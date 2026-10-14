## 修 bug 回报
- 合并基线：main → f8d306514e2a8afafeac591d38773b92807f2518
- 修复（每条一行）：证据提取漏 run-plans 的 run 字段 — 78e9b05929366d097a728761d693d790ff16ac87 — 测试 agent/tests/extract-evidence.test.ts:keeps run-plans rows, original offsets and hashes without matching foreign mentions — 去掉修复时失败：是
- 已被别人修掉的：silent-0254 无动作死亡战斗归因 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：额度恢复旧余额基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：ascension-up 实际等级 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：core-build-notify 失败诊断 — 5c92f2aaf0b758a1a5e7d591745694004664f83a
- 已被别人修掉的：精确树宿主分段补验 — 24c2e3a75b5db6bac76d6c924f86b7fcd9438316
- 已被别人修掉的：会话前有界ENOENT恢复 — bc2c40e313cc36682196277c53c50e30744b88c5
- 已被别人修掉的：复盘启动租约ID — d9983263ffecea1bed4e29d65e7f854a3d2e33d7
- 已被别人修掉的：Python可重建缓存 — 1e8af775f6b90f100f20ff7c4a08dfddaba893a9
- 已被别人修掉的：paper Git同refs快照 — 16bfe0bd6ecaa91d04a91c01edc94cecc781f71f
- 已被别人修掉的：boss learner隔离home — 5921f8cd045853182c867a6430e75c3fcde00a87
- 已被别人修掉的：空产出经验误补链 — 84366ad06ee4f978394c1b9489a82c83ea12bd36
- 已被别人修掉的：未派ID策略报告机械处置 — 3a98e213a826e94f9708af4b1a265e1892659f4e
- 已被别人修掉的：无完整复盘失败误补链 — 3fdcd77927f01b35c20c6c5c1fcfd790676032d2
- 已被别人修掉的：ordinary ACK及前阶段验证 — 1594def2e1b65b665d3b345f31444194eb4d09e6
- 已被别人修掉的：第二策略槽ACK批号 — 15eb85e2934e428c5e299fc4a1aba456d92fd685
- 已被别人修掉的：注册feature通知ACK — 38b2f572d90b3b97a23f9eae983f583287492f9a
- 已被别人修掉的：嵌套producer通知身份 — 1dd4d434aef67f1d065dbdba23a875ae82741a88
- 已被别人修掉的：batch-f包装/参数化期限解析 — 56c256dad0d33b231b82b53113d3bdd84f9bfa20
- 没修的：出牌、药水、SL、终局、路线、休息及机制提案（包括silent-0308/0311/0339/0461/0465/0467/0469/0471） — 策略类：沿队列中已有独立strategy-proposal和原角色证据链；不重复实现或补游戏知识
- 没修的：silent-0459 独立run-plan整局成本漏计 — 原队列明确由silent-proposal-6a39ea0a435755c5独立链处理、不另派普通修复，本批保持原登记
- 没修的：v5-dpr-health-20261013 性能及B3/P1/P2补验 — 太大/独立专题：已有原线程和冻结30题/spec/r2及未完成R2结果，普通批次不领取或改变生产预算
- 没修的：调度公平性与sandbox-glob目录生命周期根因 — 证据不足：插入序观察未证明永久饥饿，具体删除者/原生扫描时序未核；现有有界重试及租约修复已在基线
- 没修的：arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression / 构筑资料跨入口父项 — 独立架构/策略功能及归因研究：不混入本次纯bug批次
- 测试：tsc 退出码 0；vitest 391 文件 / 3823 用例 / 退出码 0。首轮自建密钥扫描 .ts 副本被 check-imports.test.ts:all resolve 扫到，389 文件/3811 用例通过、1 失败且 paths 未运行；原字节改存 .txt 后完整重跑通过。无战斗超时重跑。固定 Python 5 例通过，撤掉 run 别名支持后 3 断言失败，恢复后 Vitest 2 例通过。
- 合入：未合入；实际 merge 退出码 1、18 处历史记录冲突，已 merge --abort；知识刷新提交 9696bbba993e7f3bcc96c9719ed9c76d973b9447 保留，12 个原脏文件全部逐 SHA 保持，源码没有上线。
- 需要 Roy 定的事（没有写「无」）：无

```json
{
  "task": "fix-batch",
  "base": "f8d306514e2a8afafeac591d38773b92807f2518",
  "fixes": [
    {
      "item": "证据提取漏run-plans真实run字段（fix-queue-v4 2026-10-14 14:46）",
      "commit": "78e9b05929366d097a728761d693d790ff16ac87",
      "test": "agent/tests/extract-evidence.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "出牌、药水、SL、终局、路线、休息及机制提案（包括silent-0308/0311/0339/0461/0465/0467/0469/0471）",
      "reason": "策略类：沿队列中已有独立strategy-proposal和原角色证据链；不重复实现或补游戏知识"
    },
    {
      "item": "silent-0459 独立run-plan整局成本漏计",
      "reason": "原队列明确由silent-proposal-6a39ea0a435755c5独立链处理、不另派普通修复，本批保持原登记"
    },
    {
      "item": "v5-dpr-health-20261013 性能及B3/P1/P2补验",
      "reason": "太大/独立专题：已有原线程和冻结30题/spec/r2及未完成R2结果，普通批次不领取或改变生产预算"
    },
    {
      "item": "调度公平性与sandbox-glob目录生命周期根因",
      "reason": "证据不足：插入序观察未证明永久饥饿，具体删除者/原生扫描时序未核；现有有界重试及租约修复已在基线"
    },
    {
      "item": "arch-funnel-guard / arch-learning-priority / arch-unified-resource-value / inv-f33-regression / 构筑资料跨入口父项",
      "reason": "独立架构/策略功能及归因研究：不混入本次纯bug批次"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3823,
    "files": 391
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-154303/learner/runs/20261014-154330-fix-batch/report.md",
  "merge_failure": {
    "exit": 1,
    "conflicts": 18,
    "refresh_commit": "9696bbba993e7f3bcc96c9719ed9c76d973b9447",
    "merge_aborted": true,
    "original_dirty_bytes_preserved": true
  },
  "already_fixed": [
    {
      "item": "silent-0254 无动作死亡战斗归因",
      "commit": "3b48088dec5fc6eafe576a1296bbdadde43432ee"
    },
    {
      "item": "额度恢复旧余额基线",
      "commit": "e5e2995d659d15af79ec8bba67a4a25c1cb7295f"
    },
    {
      "item": "ascension-up 实际等级",
      "commit": "8045d9fbf0a12523b1dbe39bbed8af06c7497b09"
    },
    {
      "item": "core-build-notify 失败诊断",
      "commit": "5c92f2aaf0b758a1a5e7d591745694004664f83a"
    },
    {
      "item": "精确树宿主分段补验",
      "commit": "24c2e3a75b5db6bac76d6c924f86b7fcd9438316"
    },
    {
      "item": "会话前有界ENOENT恢复",
      "commit": "bc2c40e313cc36682196277c53c50e30744b88c5"
    },
    {
      "item": "复盘启动租约ID",
      "commit": "d9983263ffecea1bed4e29d65e7f854a3d2e33d7"
    },
    {
      "item": "Python可重建缓存",
      "commit": "1e8af775f6b90f100f20ff7c4a08dfddaba893a9"
    },
    {
      "item": "paper Git同refs快照",
      "commit": "16bfe0bd6ecaa91d04a91c01edc94cecc781f71f"
    },
    {
      "item": "boss learner隔离home",
      "commit": "5921f8cd045853182c867a6430e75c3fcde00a87"
    },
    {
      "item": "空产出经验误补链",
      "commit": "84366ad06ee4f978394c1b9489a82c83ea12bd36"
    },
    {
      "item": "未派ID策略报告机械处置",
      "commit": "3a98e213a826e94f9708af4b1a265e1892659f4e"
    },
    {
      "item": "无完整复盘失败误补链",
      "commit": "3fdcd77927f01b35c20c6c5c1fcfd790676032d2"
    },
    {
      "item": "ordinary ACK及前阶段验证",
      "commit": "1594def2e1b65b665d3b345f31444194eb4d09e6"
    },
    {
      "item": "第二策略槽ACK批号",
      "commit": "15eb85e2934e428c5e299fc4a1aba456d92fd685"
    },
    {
      "item": "注册feature通知ACK",
      "commit": "38b2f572d90b3b97a23f9eae983f583287492f9a"
    },
    {
      "item": "嵌套producer通知身份",
      "commit": "1dd4d434aef67f1d065dbdba23a875ae82741a88"
    },
    {
      "item": "batch-f包装/参数化期限解析",
      "commit": "56c256dad0d33b231b82b53113d3bdd84f9bfa20"
    }
  ]
}
```

核验材料：
- 原缺陷：original-extractor-source.txt（SHA 与原补证相同）；original-extractor-identity-verification.json。
- 原截点：original-cut-readback/evidence-manifest.json 及 original-cut-readback-verification.json，15局77行的 run/offset/bytes/SHA 全相等。K3676LU8B0UH F1、turn 不适用；不分析计划内容为新游戏机制。
- 无匹配 bug-infra 账本条目，CLI find 对 extract-evidence / run字段 / 证据提取均0条，不新建、不标 shipped。silent-0459 为另一已登记独立成本提案，不挪作本修复账本。
- 18项已修的祖先/当前源码核对见 already-fixed-audit.json；其初始路径与大小写诊断另存 initial JSON。扩展历史测试来源读取未完成，已中止 session 30051（130），不当已验范围；队列已有上线/完整宿主闭合记录保持。
- 初次新增任务模板测试因夹具没提供 runs 失败，补固定 runs 后通过，未调整生产逻辑或断言；原工具输出由本批原始事件流保留。
- 合入现场：knowledge-overlap.json、live-before.json、live-merge.log、live-merge-abort.log、live-merge-result.json、live-workflow.log。刷新10文件与本分支知识改动的交集为空。
- 未运行合后live门禁/宿主完整套件，因为合入失败；未追加上线决定、eval版本或规则双通知，不声称live消费者已读回。
- 保留源码分支、原失败日志/初稿和过程副本，未登记完成回收、未推送、未运行play、未派下级agent。

冲突路径（全部保留，未人工解决）：
- CONFLICT (content): Merge conflict in notes/fix-queue-v4.md
- CONFLICT (content): Merge conflict in notes/for-roy.md
- CONFLICT (content): Merge conflict in notes/lessons.md
- CONFLICT (content): Merge conflict in ops/inbox-dev.md
- CONFLICT (content): Merge conflict in paper/data/README.md
- CONFLICT (content): Merge conflict in paper/data/commits.csv
- CONFLICT (content): Merge conflict in paper/data/cost-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-sources.json
- CONFLICT (content): Merge conflict in paper/data/cost-unattributed.csv
- CONFLICT (content): Merge conflict in paper/data/decisions_by_label.csv
- CONFLICT (content): Merge conflict in paper/data/learning-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/runs.csv
- CONFLICT (content): Merge conflict in paper/data/summary.json
- CONFLICT (content): Merge conflict in paper/data/verification.json
- CONFLICT (modify/delete): paper/materials/20261014-v5-boss-revalidation/ops-binding.json deleted in HEAD and modified in codex-fix-silent-20261014-154303.  Version codex-fix-silent-20261014-154303 of paper/materials/20261014-v5-boss-revalidation/ops-binding.json left in tree.
- CONFLICT (content): Merge conflict in paper/materials/decision-log.md
- CONFLICT (content): Merge conflict in paper/materials/learning/ledger.jsonl

## 修 bug 回报

- 合并基线：main → 3de2368c1bd09bf6aedb2ac03955845fcea00a4f（开工干净；git merge --no-edit main 为 Already up to date）。
- 修复（每条一行）：sandbox-glob-startup-race，会话前沙箱扫描ENOENT的有界恢复 — bc2c40e313cc36682196277c53c50e30744b88c5 — 测试 agent/tests/learner-startup-recovery.test.ts:retries exact pre-session ENOENT after close with identical input and one final completion — 去掉修复时失败：是。撤launcher/wrapper接线退出1（期望0实际1），恢复后23例退出0；原失败/恢复日志分别startup-red.log、startup-green-restored.log。
- 已被别人修掉的：无出牌死亡窗口0254 — 3b48088de；回合末挡诊断0338 — c1d848049；商店移除事实0272 — db20ec3cc；rollout最佳线路夹具 — 366917d1e；原生通知诊断子项 — 5c92f2aaf（不等历史通知已恢复）。当前相关实现及祖先已核，未重做。
- 已被别人修掉的：额度恢复 — e5e2995d6；实际进阶通知 — 8045d9fbf；会话退出模型夹具 — 874ae603b；冻结实现绑定 — fc95760d4；推送注册 — c519952b3；刀刃之舞A10范围 — 66c22ba7d。已核live祖先，main通过5b56a452b/3be7be019增量集成包含对应实现；没有推送或重复改玩法。
- 已被别人修掉的：历史141项提交均仍为本基线和live祖先；逐项名称/完整提交号见prior-already-fixed.md与本批重新核验already-fixed-recheck.json。前批派发夹具2b09c47d4、宿主定向补验24c2e3a75已有独立提交和原红绿/整套检查，但尚未合入，保留原拥有者成果，不冒称已上线。
- 没修的：silent-0250, silent-0256, silent-0260, silent-0263, silent-0266, silent-0268, silent-0271, silent-0273, silent-0279, silent-0287, silent-0290, silent-0291, silent-0293, silent-0295, silent-0296, silent-0297, silent-0300, silent-0308, silent-0311, silent-0317, silent-0319, silent-0320, silent-0322, silent-0329, silent-0334, silent-0339, silent-0344, silent-0347, silent-0349, silent-0362, silent-0365, silent-0367 — 策略类：原独立strategy-proposal链继续；已有局部实现不关闭宽项，本批不改出牌/药水/SL/终局或重复派发。
- 没修的：silent-0332 — 证据不足：当前源码仍保留正HP资源契约；缺触发seed/首战末帧，已有silent-proposal-5aa2672bd7cd1bf4收集诊断，不填造资源。
- 没修的：core-build-notify-222802-rc2 — 证据不足：5c92f2aaf已保存新失败诊断，旧失败缺stderr和未发送证明，不能安全重发原通知。
- 没修的：mod短暂请求超时 — 证据不足：缺mod内部根因，原自动恢复历史保留。
- 没修的：arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存/性能实测 — 太大／独立功能和策略研究；普通纯bug批次不扩大职责或调用模型/网络。
- 没修的：调度公平性核查 — 证据不足：插入顺序快照不能证明永久饥饿，保留现有并发/队列状态，交既有框架核查。
- 没修的：host-targeted-check-continuation、派发夹具工作树缺失 — 已有前批候选24c2e3a75、2b09c47d4，当前main/live尚未包含；原批合入受记录冲突阻塞，保留其拥有权和原测试，不重复实现。
- 没修的：sandbox-glob-startup-race上游根因 — 证据不足：本批只补会话前安全恢复，未确认目录消失的创建/删除者，未验证自然复发恢复。
- 测试：提交前原bash tools/test-sandbox.sh的tsc退出0；vitest 288文件 / 2848用例 / 退出0，单worker同一轮完成，未整套重跑。定向恢复测试23例退出0；撤码1例退出1为预期反证。初稿tsc的4处undefined错误已修并保留initial-tsc-failure.txt。bash -n及gitleaks暂存差异扫描均0。新测试只用内存假child和固定输入，不调用LLM、网络或凭据。固定排除仍由调度器在宿主补验，不冒称本沙箱IPC已通过。
- 合入：未合入。锁内预检 merge-conflicts-stop-before-mutation；合前/合后live 079dc2f156601556d48727cb14ad48fb95994afd。知识重叠 ["knowledge/characters/silent/boss-trust.json", "knowledge/characters/silent/experience.json"]。CONFLICT (modify/delete): notes/core-cycle-quantitative-learning-request.json deleted in 079dc2f156601556d48727cb14ad48fb95994afd and modified in codex-fix-silent-20261011-224302.  Version codex-fix-silent-20261011-224302 of notes/core-cycle-quantitative-learning-request.json left in tree.；CONFLICT (content): Merge conflict in notes/fix-queue-v4.md；CONFLICT (content): Merge conflict in notes/for-roy.md；CONFLICT (content): Merge conflict in notes/lessons.md；CONFLICT (content): Merge conflict in ops/inbox-dev.md；CONFLICT (content): Merge conflict in paper/data/README.md；CONFLICT (content): Merge conflict in paper/data/commits.csv；CONFLICT (content): Merge conflict in paper/data/decisions_by_label.csv；CONFLICT (content): Merge conflict in paper/data/learning-curve-silent.csv；CONFLICT (content): Merge conflict in paper/data/runs.csv；CONFLICT (content): Merge conflict in paper/data/summary.json；CONFLICT (content): Merge conflict in paper/data/verification.json；CONFLICT (content): Merge conflict in paper/materials/decision-log.md；CONFLICT (content): Merge conflict in paper/materials/learning/ledger.jsonl；CONFLICT (directory rename split): Unclear where to rename paper/materials/silent/20261011-core-cycle-quantitative-learning to; it was renamed to multiple other directories, with no destination getting a majority of the files.。未执行有冲突的merge，没有覆盖并行记录/账本/刷新数据；live原脏文件保留。完整回执live-merge-receipt.json、live-merge-preflight.log；仅本修复补丁fixes-only.patch已对实际合前live执行git apply --check退出0（未apply），留给运维沿完成事件兜底。无实际上线记录、版本或shipped。
- 需要 Roy 定的事：无。实际合入/宿主补验由既有运维闭环续办；上游目录生命周期根因与自然复发恢复仍未证。源任务及诊断见diagnosis.md。CLI按sandbox-glob/213504未找到对应bug-infra，故无账本更新、无新游戏知识和代码提案。

```json
{
  "task": "fix-batch",
  "base": "3de2368c1bd09bf6aedb2ac03955845fcea00a4f",
  "fixes": [
    {
      "item": "sandbox-glob-startup-race：会话前暂时ENOENT缺少有界安全恢复",
      "commit": "bc2c40e313cc36682196277c53c50e30744b88c5",
      "test": "agent/tests/learner-startup-recovery.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "silent-0250, silent-0256, silent-0260, silent-0263, silent-0266, silent-0268, silent-0271, silent-0273, silent-0279, silent-0287, silent-0290, silent-0291, silent-0293, silent-0295, silent-0296, silent-0297, silent-0300, silent-0308, silent-0311, silent-0317, silent-0319, silent-0320, silent-0322, silent-0329, silent-0334, silent-0339, silent-0344, silent-0347, silent-0349, silent-0362, silent-0365, silent-0367",
      "reason": "策略类：原独立strategy-proposal链继续；已有局部实现不关闭宽项，本批不改出牌/药水/SL/终局或重复派发。"
    },
    {
      "item": "silent-0332",
      "reason": "证据不足：当前源码仍保留正HP资源契约；缺触发seed/首战末帧，已有silent-proposal-5aa2672bd7cd1bf4收集诊断，不填造资源。"
    },
    {
      "item": "core-build-notify-222802-rc2",
      "reason": "证据不足：5c92f2aaf已保存新失败诊断，旧失败缺stderr和未发送证明，不能安全重发原通知。"
    },
    {
      "item": "mod短暂请求超时",
      "reason": "证据不足：缺mod内部根因，原自动恢复历史保留。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression、B4/B5、缓存/性能实测",
      "reason": "太大／独立功能和策略研究；普通纯bug批次不扩大职责或调用模型/网络。"
    },
    {
      "item": "调度公平性核查",
      "reason": "证据不足：插入顺序快照不能证明永久饥饿，保留现有并发/队列状态，交既有框架核查。"
    },
    {
      "item": "host-targeted-check-continuation、派发夹具工作树缺失",
      "reason": "已有前批候选24c2e3a75、2b09c47d4，当前main/live尚未包含；原批合入受记录冲突阻塞，保留其拥有权和原测试，不重复实现。"
    },
    {
      "item": "sandbox-glob-startup-race上游根因",
      "reason": "证据不足：本批只补会话前安全恢复，未确认目录消失的创建/删除者，未验证自然复发恢复。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2848,
    "files": 288
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261011-224302/learner/runs/20261011-224313-fix-batch/report.md"
}
```

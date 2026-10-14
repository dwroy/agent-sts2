## 修 bug 回报

- 合并基线：main → 8ae20b998c2bdbebefae82a72dbcd0883d457312
- 修复（每条一行）：校准/B4反证通知缺少同ID canonical来源绑定（队列1240/1248） — 1dd4d434aef67f1d065dbdba23a875ae82741a88 — 测试 agent/tests/feature-notice-registration.test.ts:binds feature producer provenance to the original native notice and preserves independent actor receipts；agent/tests/boss-sim-notice-registration.test.ts:binds B4 notices to original evidence, native delivery tokens and independent exact-text receipts — 去掉修复时失败：是（两文件两用例失败；恢复专项6文件7用例通过，Python固定4+3项）。
- 已被别人修掉的：无动作死亡战斗归因 silent-0254 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：额度恢复余额基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：升阶通知使用实际等级 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：核心通知退出诊断 — 5c92f2aaf0b758a1a5e7d591745694004664f83a
- 已被别人修掉的：未派发策略提案处置 — 3a98e213a826e94f9708af4b1a265e1892659f4e
- 已被别人修掉的：知识缓存固定签名夹具 — 8fbb441eb61eef226eb7366f9612003480c83988
- 已被别人修掉的：固定最佳线路夹具 — bbc5b993a7524bbb8e80a975f204f8d193657b46
- 已被别人修掉的：论文导出Git快照 — 16bfe0bd6ecaa91d04a91c01edc94cecc781f71f
- 已被别人修掉的：boss-sim隔离home透传 — 5921f8cd045853182c867a6430e75c3fcde00a87
- 已被别人修掉的：普通通知ACK — 672e198a4730012330f599068a0ef1efadb02002
- 已被别人修掉的：空失败复盘补链 — 3fdcd77927f01b35c20c6c5c1fcfd790676032d2
- 已被别人修掉的：启动恢复租约身份 — d9983263ffecea1bed4e29d65e7f854a3d2e33d7
- 已被别人修掉的：deck-cap固定夹具 — ec8c578b66bf5498372f1b779ae58a766dff8112
- 已被别人修掉的：共享经验固定FS快照 — 8390c62d76fc8c7d7b6b7292121a621f4666d39c
- 已被别人修掉的：第二策略槽ACK批号 — 15eb85e2934e428c5e299fc4a1aba456d92fd685
- 已被别人修掉的：卡死执行器诊断/受控启动夹具 — 9b6459fd99f26b17689134e33aa85d6190e71d7d
- 已被别人修掉的：Codex长思考/看门狗固定事件夹具 — a18376cce22eb9e47377d474a85fb864f7c636e2
- 已被别人修掉的：策略拒绝路径批量夹具 — df5f2e3fac5db56e3c92a241e2b4a170c6962212
- 已被别人修掉的：V5完整样本回传 — 288f37d323f7ed57eb3faf86beee6bcb8dd354e3
- 已被别人修掉的：宿主补验按精确SHA保留已过分段并只续失败/未运行项 — 24c2e3a75b5db6bac76d6c924f86b7fcd9438316
- 已被别人修掉的：会话退出夹具模型与fake catalog一致 — 874ae603b3927173f805e0b2fe789330bab710c7
- 已被别人修掉的：既有git-push-main入口登记 — c519952b31e3a0bb3acdd2115883ae8671b8a090
- 已被别人修掉的：空受阻经验误派提案补链 — 84366ad06ee4f978394c1b9489a82c83ea12bd36
- 已被别人修掉的：多角色药水表固定数据隔离 — 5ef3c4612bd2673c19968c5a2d24bf62af519ee1
- 已被别人修掉的：实现类量化学习冻结绑定入口 — 3be7be019f714524e34907e452e160596e5bc708
- 已被别人修掉的：原量化任务waiting有界接续 — 66283dd9982bdd7f480da7a4d9bfefea0572a9ac
- 已被别人修掉的：会话前有界恢复子项（上游目录根因未闭合） — bc2c40e313cc36682196277c53c50e30744b88c5
- 已被别人修掉的：补验接口拒绝超过500字符的完整参数化用例名 — f8896692b0d868b900ccffc8ed910321d0f3e765
- 已被别人修掉的：ascension-audit-report固定解析夹具反复启动同步Python且丢失退出诊断 — a11e32ae1a01ecf75cc57519be21f2d144c2cd18
- 已被别人修掉的：strategy-research-scheduling把完整Python验收塞入单个15秒用例 — cd1f5593430a2d13479368679b5d42994540f7c8
- 已被别人修掉的：potion-mc题面重复性夹具关闭采样预算导致整组30秒超时 — 519b63549f1c61276755066e5a76d0351cf09a7c
- 已被别人修掉的：rollout固定排序/选项/自动动作验收受真实时钟与整组计算量影响 — b68a650ab95c15a492cccac598906f32284229be
- 已被别人修掉的：已注册校准feature通知ACK — 38b2f572d90b3b97a23f9eae983f583287492f9a
- 已被别人修掉的：已跟踪Python源的字节码缓存回收 — 1e8af775f6b90f100f20ff7c4a08dfddaba893a9
- 已被别人修掉的：包装及 it.each 测试超时静态解析遗漏 — 56c256dad0d33b231b82b53113d3bdd84f9bfa20
- 没修的：出牌、药水、SL、终局、路线、休息及模型机制条目（含 silent-0308/0311/0317/0319/0320/0322/0324/0329/0332/0338/0339/0344/0347/0349/0362/0365/0367/0455/0461/0465/0467） — 策略类，沿已有独立 strategy-proposal、证据和原 owner 接续；普通纯 bug 批次不添加游戏判断、不重复派发。
- 没修的：silent-0459 独立 run-plan 请求成本漏计 — 队列明确交既有 silent-proposal-6a39ea0a435755c5 独立策略链，本批不重复实现。
- 没修的：全漏斗、资源价值、核心构筑、学习优先级及 named-card-facts-transport 宽项 — 太大，已有独立授权任务及消费者验收 owner；已修工具子项不关闭父要求。
- 没修的：v5-dpr-health-20261013 暖池供给/单样本性能父项 — 证据不足以定位剩余性能缺口的确定性执行 bug；取消/零预算/分类/完整样本回传子项已有源码，仍保持300最低、1000目标、11000ms期限及24线程上限，不据测试夹具修复宣称自然性能解决。
- 没修的：sandbox-glob-startup-race 上游目录生命周期 — 证据不足；上游目录移除者和生命周期根因未核定。已上线有界启动恢复与租约子项，本批不重复实现或扩大权限。
- 没修的：调度公平性永久饥饿及核心通知实际送达 — 证据不足；队列观测与退出诊断不等于永久饥饿或实际送达，不代写确认。
- 测试：tsc退出码0；最终固定源码vitest 389文件 / 3816用例 / 退出码0；gitleaks退出码0。首轮完整388文件3815用例通过，但跨越后续B4/JSON格式/来源副本改动，不作最终门禁；最终固定源码重新完整通过，无超时重跑。
- 合入：未合入；live锁内已保存刷新提交175dc5db70ddfb50b1bd5e208736d5dc8d1a00a1，知识重叠0；预检5个共享记录冲突（notes/fix-queue-v4.md、notes/for-roy.md、ops/inbox-dev.md、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl），没有执行源码merge或合后测试。live索引干净，其余原未提交记录保持。
- 需要 Roy 定的事：无

```json
{
  "task": "fix-batch",
  "base": "8ae20b998c2bdbebefae82a72dbcd0883d457312",
  "fixes": [
    {
      "item": "校准/B4反证通知缺少同ID canonical来源绑定（队列1240/1248）",
      "commit": "1dd4d434aef67f1d065dbdba23a875ae82741a88",
      "test": "agent/tests/feature-notice-registration.test.ts",
      "additional_tests": [
        "agent/tests/boss-sim-notice-registration.test.ts"
      ],
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "出牌、药水、SL、终局、路线、休息及模型机制条目（含 silent-0308/0311/0317/0319/0320/0322/0324/0329/0332/0338/0339/0344/0347/0349/0362/0365/0367/0455/0461/0465/0467）",
      "reason": "策略类，沿已有独立 strategy-proposal、证据和原 owner 接续；普通纯 bug 批次不添加游戏判断、不重复派发。"
    },
    {
      "item": "silent-0459 独立 run-plan 请求成本漏计",
      "reason": "队列明确交既有 silent-proposal-6a39ea0a435755c5 独立策略链，本批不重复实现。"
    },
    {
      "item": "全漏斗、资源价值、核心构筑、学习优先级及 named-card-facts-transport 宽项",
      "reason": "太大，已有独立授权任务及消费者验收 owner；已修工具子项不关闭父要求。"
    },
    {
      "item": "v5-dpr-health-20261013 暖池供给/单样本性能父项",
      "reason": "证据不足以定位剩余性能缺口的确定性执行 bug；取消/零预算/分类/完整样本回传子项已有源码，仍保持300最低、1000目标、11000ms期限及24线程上限，不据测试夹具修复宣称自然性能解决。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "证据不足；上游目录移除者和生命周期根因未核定。已上线有界启动恢复与租约子项，本批不重复实现或扩大权限。"
    },
    {
      "item": "调度公平性永久饥饿及核心通知实际送达",
      "reason": "证据不足；队列观测与退出诊断不等于永久饥饿或实际送达，不代写确认。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3816,
    "files": 389
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302/learner/runs/20261014-114327-fix-batch/report.md",
  "merge_preflight": {
    "exit": 1,
    "conflicts": [
      "notes/fix-queue-v4.md",
      "notes/for-roy.md",
      "ops/inbox-dev.md",
      "paper/materials/decision-log.md",
      "paper/materials/learning/ledger.jsonl"
    ],
    "knowledge_overlap": [],
    "preserved_refresh_commit": "175dc5db70ddfb50b1bd5e208736d5dc8d1a00a1",
    "actual_source_merge": false,
    "live_tests_run": false
  },
  "validation": {
    "red_vitest_files": 2,
    "red_vitest_cases": 2,
    "red_exit": 1,
    "restored_vitest_files": 6,
    "restored_vitest_cases": 7,
    "restored_exit": 0,
    "python_fixed_cases": 7,
    "gitleaks": 0,
    "preliminary_full_run_used_as_gate": false,
    "timeout_retries": []
  },
  "ledger": {
    "matching_bug_infra_ids": [],
    "new_entries": false,
    "shipped_updates": false
  },
  "source_provenance_readonly": "production-readonly-final.json"
}
```

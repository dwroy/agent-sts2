## 修 bug 回报

- 合并基线：main → 4d6f7edcd300dfb3b7123fd3754dfc545d64ed80
- 修复（每条一行）：v5-dpr-health-20261013：期限到时块内已完成样本未回传而丢失 — 288f37d323f7ed57eb3faf86beee6bcb8dd354e3 — 测试 agent/tests/build-sim-cancellation.test.ts:retains whole samples delivered before the deadline while their block is still running — 去掉修复时失败：是。证据8AGEGLG40SV3 F2/T6、F3/F4（turn=null），四原行offset/length/SHA读回；固定反例中旧码丢失第0个完整样本，新码保留。无需游戏机制推断，未证明原告警损失量；没有对应bug-infra账本，检索8AGE仅匹配无关silent-0365，不附本提交、不新建、不标shipped。
- 已被别人修掉的：V4.1最初12项与fight-value调用参数 — 已修，提交 531d15444f5e9c29d85d36ff098f3fbf33e647af
- 已被别人修掉的：失败引擎耗时及决策引擎归属 — 已修，提交 81de842c8459b425059cf8bc7c1df920d0164ef9
- 已被别人修掉的：去掉角色专属回血题面文字 — 已修，提交 6d2de57ceae3def4caf073951ed9d2f9d1544cd7
- 已被别人修掉的：prompt-dump从尾部读取状态 — 已修，提交 6ee8e2a2c1edc31492962137b96af8c6e1d12093
- 已被别人修掉的：沙箱固定排除和宿主完整补验 — 已修，提交 5c307224cd7ca34b249acd24f5c050a418a32c6f
- 已被别人修掉的：编译排除learner/runs — 已修，提交 7bc835803f2efd44a5cc6f2009933f3c3bee7653
- 已被别人修掉的：晚写复盘误计上线后重犯 — 已修，提交 2610945b6a2f9ea02cf3a7cd4b5980d24814ac39
- 已被别人修掉的：兜底合入完整检查入口 — 已修，提交 f670884a188a047bbd3f7f007c260ade62fae36a
- 已被别人修掉的：单次mod超时卡死误报 — 已修，提交 a4f4ec868d122dc92af510862c6240cf2eaff2b6
- 已被别人修掉的：策略任务及派发入口 — 已修，提交 afd652a3f75df6e7403439f01c565220327884da
- 已被别人修掉的：学习状态锁内长检查争用 — 已修，提交 233ede56047274ba53a4e1191a245fac816c37a8
- 已被别人修掉的：账本来源元数据追加更正 — 已修，提交 87c89b7aea90c7275e0fbb04b1e4148a4209630c
- 已被别人修掉的：TMPDIR未设置的额度测试 — 已修，提交 6bfbe3d2e2aa6e5e8c1969d5ee1cca08671ae02a
- 已被别人修掉的：Inferno回合初夹具确定性 — 已修，提交 195869aa77dc216de08e6d1c5842782b239cb670
- 已被别人修掉的：空fix成功判读 — 已修，提交 01b560ef4966da945511bfccd41abd09440fb0e9
- 已被别人修掉的：boss-clock历史数据隔离 — 已修，提交 38e95b24efafb862fc09b1fd026626acf481c47d
- 已被别人修掉的：无决策的开场死亡报告silent-0254 — 已修，提交 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：核心通知失败诊断core-build-notify-222802-rc2 — 已修，提交 5c92f2aaf0b758a1a5e7d591745694004664f83a
- 已被别人修掉的：额度恢复旧余额基线 — 已修，提交 e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：宿主推送注册实现 — 已修，提交 c519952b31e3a0bb3acdd2115883ae8671b8a090
- 已被别人修掉的：退出子进程模型夹具 — 已修，提交 874ae603b3927173f805e0b2fe789330bab710c7
- 已被别人修掉的：宿主定向续验入口 — 已修，提交 24c2e3a75b5db6bac76d6c924f86b7fcd9438316
- 已被别人修掉的：会话前有界ENOENT重试 — 已修，提交 bc2c40e313cc36682196277c53c50e30744b88c5
- 已被别人修掉的：复盘timestamp-only租约识别 — 已修，提交 d9983263ffecea1bed4e29d65e7f854a3d2e33d7
- 已被别人修掉的：无产出blocked经验提案补链 — 已修，提交 84366ad06ee4f978394c1b9489a82c83ea12bd36
- 已被别人修掉的：多角色药水表固定隔离 — 已修，提交 5ef3c4612bd2673c19968c5a2d24bf62af519ee1
- 已被别人修掉的：worker数据签名固定隔离 — 已修，提交 8fbb441eb61eef226eb7366f9612003480c83988
- 已被别人修掉的：rollout最佳线固定时钟 — 已修，提交 bbc5b993a7524bbb8e80a975f204f8d193657b46
- 已被别人修掉的：未预派普通策略提案处置 — 已修，提交 3a98e213a826e94f9708af4b1a265e1892659f4e
- 已被别人修掉的：卡死子进程确定性及错误证据 — 已修，提交 9b6459fd99f26b17689134e33aa85d6190e71d7d
- 已被别人修掉的：batch-c固定夹具隔离 — 已修，提交 5dd8a20c9d2dd4ed43120b1684e5577b993ac2ff
- 已被别人修掉的：固定评估版本表 — 已修，提交 d9881ba593b0b8d701ebbe1c95626c0ebdd554c7
- 已被别人修掉的：神化持药固定时钟 — 已修，提交 9e8c93555131c3347f9e809d9722a848a75c2692
- 已被别人修掉的：Git导出同一ref快照 — 已修，提交 16bfe0bd6ecaa91d04a91c01edc94cecc781f71f
- 已被别人修掉的：boss-sim隔离home透传 — 已修，提交 5921f8cd045853182c867a6430e75c3fcde00a87
- 已被别人修掉的：runLoop固定时钟 — 已修，提交 b3c6dd700b00d0d8b17d5d2efe6fe9aa353618fa
- 已被别人修掉的：补验前置拒绝JSON诊断 — 已修，提交 63f656fb07a21a7496353234269901a832eae497
- 已被别人修掉的：broker容量及回执失败隔离 — 已修，提交 a136ddc4b5b0a8696f10b2fae3073322d57e724c
- 已被别人修掉的：autoplay缺终态标记退出 — 已修，提交 db072ddab47ba94efb46dce2913927f936ecb97e
- 已被别人修掉的：JSONL断行追加 — 已修，提交 9b07240b18f862efdbe630889ade04e8976eaace
- 已被别人修掉的：普通ACK不造父要求 — 已修，提交 672e198a4730012330f599068a0ef1efadb02002
- 已被别人修掉的：ACK前阶段SHA复核 — 已修，提交 1594def2e1b65b665d3b345f31444194eb4d09e6
- 已被别人修掉的：失败空复盘不误派提案修复 — 已修，提交 3fdcd77927f01b35c20c6c5c1fcfd790676032d2
- 已被别人修掉的：旧30牌上限夹具兼容 — 已修，提交 ec8c578b66bf5498372f1b779ae58a766dff8112（源c0999eaa；后续历史边界钩子fa557ebdc保留）
- 已被别人修掉的：共享经验固定文件快照 — 已修，提交 8390c62d76fc8c7d7b6b7292121a621f4666d39c
- 已被别人修掉的：持药固定时钟/知识隔离 — 已修，提交 8867041f57f0e511606127e568603510af59a0e7
- 已被别人修掉的：异步有界锁夹具 — 已修，提交 e770a6d09a8398aee4126f1b7ea37fc70687989f
- 已被别人修掉的：第二策略槽ACK批号识别 — 已修，提交 15eb85e2934e428c5e299fc4a1aba456d92fd685
- 已被别人修掉的：明确不支持DPR分类 — 已修，提交 9e6dd82a34fb8c14e012be68fd0b632544f1459f
- 已被别人修掉的：完整样本间取消及零预算handler顺序 — 已修，提交 a7959132235badc87e669241c13dddf95510bfc5
- 已被别人修掉的：升阶通知使用实际进阶 — 已修，提交 5b56a452bb9be14d620b368ec46974c1b57901ca
- 已被别人修掉的：具名卡牌资料事件入口子项 — 已修，提交 42c920f34d9dc1c783ce894659849ab37ed6fd1b
- 已被别人修掉的：获批量化实现冻结绑定入口子项 — 已修，提交 fc95760d4ff8a9cbd45577efdd79b1215bd2cb92
- 已被别人修掉的：模拟排队等待计入调用方期限 — 已修，提交 c60407481a415f84efe608ad44b590b616275bc7
- 已被别人修掉的：过期请求不抢池/启动worker — 已修，提交 dc606a59adbeb4f7efe141a9aa022641275275c5
- 已被别人修掉的：准备阶段不补200ms — 已修，提交 c5e68dcf9d7d9e288b44ba59104596234d7433be
- 没修的：v5-dpr-health-20261013暖池配对样本不足与完整DPR性能父项 — 证据不足：本批固定反例只证明块内样本传输丢失，不证明8AGE原告警损失量或自然DPR供给/性能/胜率；300/1000/11000ms/24线程保持。
- 没修的：sandbox-glob-startup-race上游目录生命周期与自然恢复 — 证据不足：已有有界恢复与复盘租约修复；原无租约、具体目录删除者及自然恢复缺口保持，不放宽deny/租约。
- 没修的：core-build-notify-222802-rc2旧通知安全恢复 — 证据不足：失败诊断已修，旧无stderr失败是否送达未知，不能重放外部通知。
- 没修的：调度公平性核查 — 证据不足：原插入序观察不足以证明永久饥饿，需原dispatch/seen_runs/完成局时序；不改并发/排序/租约。
- 没修的：named-card-facts-transport其他入口与P1/P2消费者验收 — 策略类/独立功能：事件资料漏传子项已修，宽父项沿原具名卡/消费者任务。
- 没修的：出牌/药水/SL/终局/路线/休息与机制宽提案（含silent-0446/0459） — 策略类：已登记独立strategy-proposal链保留，不抢原实现任务、不重复提案/派发，不补游戏知识。
- 没修的：缓存实测、B4/B5校准、量化/核心、漏斗归因和统一资源价值父要求 — 策略类/独立功能：保持原owner/缺证范围，本批不调用LLM/网络，不将上线子项当父成果完成。
- 测试：tsc退出码0；vitest 378文件 / 3622用例 / 退出码0，完整沙箱首轮通过（主段377文件3611项，paths段1文件11项）。撤两源码后的有效负对照exit1，3失败/7过；恢复exit0，10过。真实固定铁甲worker补验首轮因cwd在根而缺tsx（原失败保留），改在agent目录后1过/13未选；完整样本/种子/顺序等价，期限可用样本数可能变化，不声称动作逐字等价。首审计错把c099当前四叶都当同源的断言失败保留，已按fa557历史钩子修正证据范围。gitleaks staged退出0；无LLM/网络调用。
- 合入：未合入。live锁内无知识builder运行/无可提交刷新数据；merge-tree预检exit1，包装器exit2，15项历史记录冲突（notes/fix-queue-v4.md、notes/lessons.md、paper/data下11项、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl），源码/知识无冲突。依任务第5节停止，未实际merge、未跑live合后检查、未覆盖刷新数据或修改eval/上线记录；live HEAD保持26bb0f07b6e72394e09b08dfb15f51a6c2d0fe86，两份原有未提交notes状态保持。清单见live-merge-tree.txt和live-merge-receipt.json；本分支干净，所有失败/补丁/原始证据保留。
- 需要 Roy 定的事：无。运维可沿原完成事件接续单一源码288f37d32；实际live实现前不分配发布号、不登记implemented/shipped。

```json
{
  "task": "fix-batch",
  "base": "4d6f7edcd300dfb3b7123fd3754dfc545d64ed80",
  "fixes": [
    {
      "item": "v5-dpr-health-20261013：期限到时块内已完成样本未回传而丢失",
      "commit": "288f37d323f7ed57eb3faf86beee6bcb8dd354e3",
      "test": "agent/tests/build-sim-cancellation.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "v5-dpr-health-20261013暖池配对样本不足与完整DPR性能父项",
      "reason": "证据不足：本批固定反例只证明块内样本传输丢失，不证明8AGE原告警损失量或自然DPR供给/性能/胜率；300/1000/11000ms/24线程保持。"
    },
    {
      "item": "sandbox-glob-startup-race上游目录生命周期与自然恢复",
      "reason": "证据不足：已有有界恢复与复盘租约修复；原无租约、具体目录删除者及自然恢复缺口保持，不放宽deny/租约。"
    },
    {
      "item": "core-build-notify-222802-rc2旧通知安全恢复",
      "reason": "证据不足：失败诊断已修，旧无stderr失败是否送达未知，不能重放外部通知。"
    },
    {
      "item": "调度公平性核查",
      "reason": "证据不足：原插入序观察不足以证明永久饥饿，需原dispatch/seen_runs/完成局时序；不改并发/排序/租约。"
    },
    {
      "item": "named-card-facts-transport其他入口与P1/P2消费者验收",
      "reason": "策略类/独立功能：事件资料漏传子项已修，宽父项沿原具名卡/消费者任务。"
    },
    {
      "item": "出牌/药水/SL/终局/路线/休息与机制宽提案（含silent-0446/0459）",
      "reason": "策略类：已登记独立strategy-proposal链保留，不抢原实现任务、不重复提案/派发，不补游戏知识。"
    },
    {
      "item": "缓存实测、B4/B5校准、量化/核心、漏斗归因和统一资源价值父要求",
      "reason": "策略类/独立功能：保持原owner/缺证范围，本批不调用LLM/网络，不将上线子项当父成果完成。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3622
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-050124/learner/runs/20261014-050137-fix-batch/report.md"
}
```

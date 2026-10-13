## 修 bug 回报

- 合并基线：main → 2f739c28ca61513bd0baf14a2e84867ed99c2f3d
- 修复（每条一行）：R335 路径拒绝夹具重复同步 Python 启动及退出诊断缺口 — df5f2e3fac5db56e3c92a241e2b4a170c6962212 — 测试 agent/tests/strategy-path-startup.test.ts:does not block the worker on a synchronous Python startup deadline；agent/tests/strategy-no-change-path.test.ts:retains the outside rejection — 去掉修复时失败：是。撤源码后固定超时探针 25 败，恢复两文件 49 过；24 场景只启动一次 Python，原五秒期限及路径拒绝断言保留，错误包含 code/signal/killed/stdout/stderr/耗时。
- 修复（每条一行）：R335 首 token 前长思考夹具依赖宿主真实计时与进程调度 — a18376cce22eb9e47377d474a85fb864f7c636e2 — 测试 agent/tests/brain-codex-watchdog.test.ts:before the first token only BRAIN_CODEX_FIRST_TOKEN_MS (off by default) and the router's timeout apply: long thinking is not a stall — 去掉修复时失败：是。恢复旧 case、保留新受控 case 后，相同名称筛选在固定完成回传延迟探针下旧 case 失败 1、新 case 通过 1；恢复修复后通过 1/筛选未运行 33，全部三项状态检查通过。真实 watchdog、首 token/静默期限、重试、事件重置和外部取消均保留，不推断原宿主失败的确切原因。
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
- 已被别人修掉的：旧30牌上限夹具兼容 — 已修，提交 ec8c578b66bf5498372f1b779ae58a766dff8112
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
- 已被别人修掉的：期限前完整样本逐次回传子项 — 已修，提交 288f37d323f7ed57eb3faf86beee6bcb8dd354e3；当前 streamResults/partial 消费者及 main 祖先已核。
- 没修的：v5-dpr-health-20261013 暖池低配对样本与完整 DPR 性能父项 — 证据不足：已有取消、期限、逐完整样本回传子项；没有新的固定执行反例可证明自然样本损失量或供给/胜率。保留 300/1000/11000ms/24 线程。
- 没修的：sandbox-glob-startup-race 上游目录生命周期与自然恢复 — 证据不足：已有有界恢复和复盘租约修复；具体删除者、无租约现场与自然恢复缺口仍未知，不放宽 deny 或租约。
- 没修的：core-build-notify-222802-rc2 旧通知安全恢复 — 证据不足：诊断已修，旧通知是否送达未知，不重放外部消息。
- 没修的：调度公平性核查 — 证据不足：原插入序观察不证明永久饥饿；保留原派发、seen_runs 与完成局时序链。
- 没修的：named-card-facts-transport 其他入口与 P1/P2 消费者 — 策略类/独立功能：事件漏传子项已修，宽父项沿原具名卡任务接续。
- 没修的：出牌、药水、SL、终局、路线、休息及机制宽提案（含 silent-0446/0459） — 策略类：保留原独立 strategy-proposal、证据和 owner，不重复提案/派发或补游戏知识。
- 没修的：缓存实测、B4/B5 校准、量化/核心、漏斗归因和统一资源价值父要求 — 策略类/独立功能：保留原 owner 和缺证范围，本批不调用模型或网络，不将上线子项当父成果完成。
- 测试：tsc 退出码 0；每次提交前的成功沙箱均为 vitest 380 文件 / 3650 用例 / 退出码 0（主段 379 文件 3639 项，paths 段 1 文件 11 项）；两次成功轮使用 2 workers、--retry=1，实际重试标记均为 0，gitleaks 两修复及刷新数据均为 0。首轮 378 文件 3630 过/6 败：strategy-research-scheduling、rollout-live（题面完整性及排序不变性两项）、component-usage、blocked-experience-repair 的原生进程/超时问题，以及我放在 scratch 的 TS 初稿导入路径错误；初稿已原样改为 .ts.txt 归档并保留首败。第二轮单 worker 379 文件 3638 过/1 败：learner-empty-fix 的 keeps new output or missing/failed checks pending for repair: {"base":"main"}，spawnSync 五秒 status=null；上述各失败均在后续完整成功轮通过，未改其生产规则、断言、限时或排除名单。另有一次工具创建前 glob ENOENT，同读取重试成功，原件保留。
- 合入：未合入。live 锁内先提交 10 项刷新数据 c1bb0ef724cfe8d599113b8ba76f2c6ebb0c2cfc（gitleaks 0），知识重叠为 []；merge-tree exit1、包装器 exit2，共 15 个历史记录冲突：notes/fix-queue-v4.md、notes/lessons.md、paper/data/ 下 11 项、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl；代码/知识无冲突。依任务只读记录/账本边界停止，没有执行实际 merge、合后测试或覆盖刷新数据。live 保留刷新提交，原两份未提交 notes 状态保持；本分支干净，两个源码提交及全部失败现场可由运维沿原完成事件兜底接续，未分配 eval 号或登记 shipped。
- 需要 Roy 定的事：无。两项均为纯测试基础设施，证据为 R335 tree4c937f62 宿主检查，无适用的对局局号/层/回合；bug-infra 检索无对应条目，未新建或标 shipped。生产源码、其他角色、游戏规则和 eval 编号均未改变。所有失败/初稿/负对照保留；首个首 token 探针被沙箱 catalog 读取限制挡住，已单独保留，不计作有效负对照。

```json
{
  "task": "fix-batch",
  "base": "2f739c28ca61513bd0baf14a2e84867ed99c2f3d",
  "fixes": [
    {
      "item": "R335 路径拒绝夹具重复同步 Python 启动及退出诊断缺口",
      "commit": "df5f2e3fac5db56e3c92a241e2b4a170c6962212",
      "test": "agent/tests/strategy-path-startup.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "R335 首 token 前长思考夹具依赖宿主真实计时与进程调度",
      "commit": "a18376cce22eb9e47377d474a85fb864f7c636e2",
      "test": "agent/tests/brain-codex-watchdog.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "v5-dpr-health-20261013 暖池低配对样本与完整 DPR 性能父项",
      "reason": "证据不足：已有取消、期限、逐完整样本回传子项；没有新的固定执行反例可证明自然样本损失量或供给/胜率。保留 300/1000/11000ms/24 线程。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期与自然恢复",
      "reason": "证据不足：已有有界恢复和复盘租约修复；具体删除者、无租约现场与自然恢复缺口仍未知，不放宽 deny 或租约。"
    },
    {
      "item": "core-build-notify-222802-rc2 旧通知安全恢复",
      "reason": "证据不足：诊断已修，旧通知是否送达未知，不重放外部消息。"
    },
    {
      "item": "调度公平性核查",
      "reason": "证据不足：原插入序观察不证明永久饥饿；保留原派发、seen_runs 与完成局时序链。"
    },
    {
      "item": "named-card-facts-transport 其他入口与 P1/P2 消费者",
      "reason": "策略类/独立功能：事件漏传子项已修，宽父项沿原具名卡任务接续。"
    },
    {
      "item": "出牌、药水、SL、终局、路线、休息及机制宽提案（含 silent-0446/0459）",
      "reason": "策略类：保留原独立 strategy-proposal、证据和 owner，不重复提案/派发或补游戏知识。"
    },
    {
      "item": "缓存实测、B4/B5 校准、量化/核心、漏斗归因和统一资源价值父要求",
      "reason": "策略类/独立功能：保留原 owner 和缺证范围，本批不调用模型或网络，不将上线子项当父成果完成。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3650
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-054301/learner/runs/20261014-054324-fix-batch/report.md"
}
```

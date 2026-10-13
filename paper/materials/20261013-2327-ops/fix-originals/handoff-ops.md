# 普通修复批交接（未作为上线回执）

本批仅改三个测试叶子：

- agent/tests/rollout-held-potion-fixture.ts
- agent/tests/rollout-held-potion.test.ts
- agent/tests/rollout-live.test.ts

队列 rollout-live 时钟隔离类的持药文字用例仍按真实 1500ms 计时，首轮因宿主暂停进入预算降级而丢失待验证文字；单独重跑能通过。迁移原断言到固定模型和固定工作时钟夹具，0/10000ms 宿主暂停分别验证；只撤时钟隔离时一败一过，恢复二过。证据固定 V1MF91VL7A2G / F33 / T4，纯测试基础设施，未添加游戏机制。

查 root ledger 的 bug-infra + rollout-live-best-test-determinism、V1MF91VL7A2G 均 0 项，无对应账本可追加，不新建游戏账本。code_proposals 与 implementation_domains 均空。

161 项已有来源/部署祖先清单见 already-fixed.md 和 audit.json。历史 cap 测试中三个消费叶保持原 c099 来源，约束断言已随后按 fa557 V5 无上限授权更新，不把旧四叶 SHA 当当前完全相同。宽策略提案、模型未知和父学习要求保持原状态。

冻结 live 83ef 与本批 main 基线的只读 merge-tree 预检有 19 冲突，包括 construction-opportunities 和知识刷新，以及队列、账本、并行通知和论文表。最终合入须按用户要求在 live-merge.lock 内核刷新与实际提交；不能覆盖并行记录或导入旧知识。此稿不是实际合入、上线或宿主全套通过证明，最终事实看 report.md/report.json。


第二项纯测试修复：learner-check-locks.test.ts 的旧同步执行器 5 秒上限在单线程整套中误杀固定 Python 夹具，隔离复验 0.2 秒通过。新增 learner-lock-fixture.ts 保留原 Python 文本逐字一致，异步子进程期限放在原 15 秒测试期限内；六秒启动延迟、输出成功但 exit9、挂起按 PID 终止三个边界补齐。只恢复旧五秒期限一败三过，恢复四过。Source 为这两个测试叶，生产 ops 源码未改；无对应 bug-infra 账本。

两项共五个测试叶。负对照/恢复均完成，最后提交前整套检查尚待终态。各来源提交将分别登记，不能把批次未合入或宽提案待证写成 shipped。

最终事实：两独立提交 8867041f57f0e511606127e568603510af59a0e7 / e770a6d09a8398aee4126f1b7ea37fc70687989f；每次提交前原沙箱入口均 tsc0/vitest0，371 文件3546项，两个 gitleaks0。最终锁内 live 0b07f43b3bdf54138e922cb84f2fd41dce9db139、merge-tree0/无冲突；旧19冲突已被后继推进消除。PID沙箱不能证宿主刷新结束，live有刷新数据，未合入/未提交数据，现场保持。请原ops宿主核 builders 后按原live流程合入该分支；源码相对合并基线只有五个测试叶，知识脚本/生产规则无改动，不需行为发布号。ledger查均0，无shipped登记。

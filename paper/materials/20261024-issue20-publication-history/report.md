# #20 已发布工作树误保留修复

依据 [Claude 评论6381379788](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6381379788)，基于 main `3d04b1d726f3f15ece3a7708dddebcb91ad6f092`；源码 `23b336a011bbdc4d26a6bd1224b9fe70c3652984`，分支 `issue-20-reclaim-publication-history`。影响 live 启动：否。无私有 kit 差量，不改学习 tab 一天观察。

原 acceptance 已经取当前实际 main/live，问题并非只读某个过期发布号：来源提交被精确叶子集成后不再是发布祖先，原门只接受当前整叶相同；后续演进/授权回退、同文件保留其他兼容修改时就误保留。三棵实际树当前均 waiting-worktree；本轮只读核发布，未执行 reclaim/complete/plan、未关闭 tab、未改原登记。

| issue | 原保留点 | 已核采用证据 |
|---|---|---|
| #47 | ops/tests/test_brain_view.py 的整个来源 blob 未出现在 live | 当前 main 原叶相同；live 2faa7ead017b977051b317355e352aa229b1344d 的 first-parent 增量与来源任务逐文件完整补丁的 verbatim patch-id 都是 c7f872f53970031f026abe88b57aa5c4481ec6f6。live 原文件另保 R414 import/fixture 兼容修改，未豁免测试发布。其余执行/测试叶子仍按原祖先/当前原叶门通过。 |
| #46 | ops/proposal_dispatch.py 在 main 后续演进 | main first-parent c8fe60d92a91d9328e5c93b90c8f4403094b7b67 曾有完整原叶，当前 live 原叶仍相同；其余执行/测试叶子通过。 |
| #49/#55 同会话 | brain.ts 等叶子在后续功能和 Roy 关闭引导后改变 | main 88b53d81c77011b41a0b5781f9abbd52e50688ca / live ce3caf630d989a2597f1450dab66ec62f8dcf2b7 曾有 brain.ts 原叶；其余变更叶子的历史采用见证分别落到 178326b9/3db681b6、88b53d81/986b30b9 等。关闭引导的后续改变不抹去旧发布。 |

全部逐文件证据见 actual-publication-proof.json，实际 main/live pins 为 3d04b1d726f3f15ece3a7708dddebcb91ad6f092 / ee0680a9b0955b5ce5371597bc8411dce4ca0bcb，读取前后同，原 allocation 绑定与 SHA 同列。发布门未再发现无法证明采用的执行/测试叶子；不代 owner/进程/脏改动/实例/归档等删除准入，更不表示三棵树已回收。

修复保留原源码祖先/当前原叶快路径；不通过时，各通道在本任务分配基线之后的 first-parent 发布变更中找历史完整原叶。窄集成仅接受来源 base→source 的整个逐文件补丁与实际 parent→publication 的 `git patch-id --verbatim` 相同，保留空白、模式、路径、上下文，不做部分 hunk 或模糊语义匹配；二进制只用祖先/完整叶证明。proof 单列 publication/commit/kind/source_leaf，补丁见证另列 parent/patch_id；原直接通过证明不增字段，旧归档重试 proof 保持兼容。原保存回执会按原固定 main/live pins 重核，不让当前新 tip 自动改写旧证明。

限制：每叶每通道最多检查256个 first-parent 变更，超界仍保留为未知；没有见证的改动继续原拒绝。不能以 main 代 live，不能借被丢弃的旁支或分配前旧 blob。新机制只核已有采用，不发布旧代码、不回退当前 live。

验证：production tsc0；同次 Vitest 两文件两包装全绿，内部 Python24+16=40，不与包装重复累加。此前固定 Python24亦过（同用例不另加）。新增6个固定仓库场景：精确叶集成后演进/回退、保同文件其他改动的原样窄集成、只发main未发live拒绝、丢弃旁支及分配前旧blob拒绝、空白不一致拒绝、超界未知保留；原进程/owner/实例/凭据/干净/归档/恢复门仍由原24/16组覆盖。nice19、单worker，无full。两份原字节输出与SHA在checks.json；Vitest尾空行保留于mtime=0的gzip，本地raw仍留。

源码改动：

- `agent/tests/worktree-retention.test.ts`
- `docs/learner-retention.md`
- `ops/tests/test_worktree_retention.py`
- `ops/worktree_retention.py`
- `paper/materials/decision-log.md`

交付：沿原 review 队列由集成员核验，再交原 ops 更新 worktree_retention.py，沿原回收器重试三棵树；不手删或跳过其他门。rollback 仅撤本 helper 的历史见证差量，保留来源分支、原证明与归档；旧代码会继续保留当前叶不同的来源，不能删登记强行通过。源码与材料/公开正文发前各做 gitleaks。

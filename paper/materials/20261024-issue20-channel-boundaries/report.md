# #20 分叉通道分配边界修正

核验退回：[6381989248](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6381989248)。旧候选 `23b336a01` 未合入/未部署；其独立 full 已中止、rc143，不是完整绿，本轮不复用。此补交基于 main `499ac4d7528d6d44bba54568590cd00acaf6d461`，源码 `403577593891669cd201355b3899a0104d03ed3f`，分支 `issue-20-reclaim-channel-boundaries`。影响 live 启动：否。

退回成立：`published ^allocation-base` 只排除 main 基线的祖先，不能证明分叉 live 上匹配叶子或完整补丁发生在分配后。旧三树可通过的自动采用证明不再沿用；不改写旧核验原件，不否认已知功能实际发布，但保守保留现场。

修复使用原 allocator 的真实程序顺序：创建/工具/干净状态通过后，在 allocated 落盘并返回任务前，把实际 integration-root HEAD 和本实例注册 live HEAD 各自保存到 `publication_boundaries`。包含 schema/root/phase、各通道工作树和完整 commit；live 不存在就缺席，不能用 main 推算。失败分配恢复时在任务返回前采集，已有快照不改；已 allocated 的旧记录缺快照时 resume 也不补造。

Project、source admission、complete 和已接受回执重核共同读取原 allocation。接受回执保存原文件 SHA，边界、root/runtime、基线不能被替换。历史查找先证明独立快照在对应发布提交的 first-parent 链上，只查其严格后继；不能借另一个分支的祖先集合，不能用 main 代 live，完全不靠提交日期/回执时间戳剪裁。原来源祖先/当前整叶快路径、256条上限、完整逐文件 verbatim 补丁、二进制整叶要求以及其余进程/owner/脏树/实例/归档门仍保留。

固定回归覆盖：分叉 live 分配前旧2→后来3而本任务仅main采用2；同文件兼容变化使整叶从未相同、但分配前完整补丁与任务patch-id相同；缺失live/全部快照、错分支/错root/runtime、接受后改allocation SHA；分叉各通道真实分配后采用应通过。旧叶反例把所有相关Git日期固定为同一个2035时间，故时间戳无法替代顺序证明。另核 allocator 实际不同main/live tips、resume保持旧快照/不回填旧allocated、Project贯通及原归档/恢复保护。

真实三树仅只读发布复核：

- #47：`retained`，source leaf not in recorded publication: ops/tests/test_brain_view.py; source publication allocation boundary unavailable: live。
- #46：`retained`，source leaf not in recorded publication: ops/proposal_dispatch.py; source publication allocation boundary unavailable: main。
- #49：`retained`，source leaf not in recorded publication: agent/src/brain/brain.ts; source publication allocation boundary unavailable: main。

实际 main/live pins 读取前后相同：True；原allocation SHA见 legacy-three-trees.json。没有调用生产 complete/reclaim/plan，没有改登记、造边界或关tab，其他删除准入未执行。旧三树继续保留，由原owner拿可靠历史边界或按原例外流程处理，不能拿这轮源码绿替代采用证据。

验证：production tsc0；最终同次三Vitest文件4项绿（Python31/16/11），另 issue-session Python62过；共120个Python固定用例，包装不重复相加。最初29项和中间三文件绿原件另存，均不另算独立项。最后只收紧resume对旧allocated不补造，最终重跑同三文件通过。nice19/单worker；本开发full0，与旧集成员full1/rc143分账。源码发前gitleaks0；材料与公开正文另扫。日志原字节及gzip SHA见 checks.json。

改动文件：

- `agent/tests/worktree-retention.test.ts`
- `docs/learner-retention.md`
- `ops/issue_session_project.py`
- `ops/tests/test_shared_tools.py`
- `ops/tests/test_worktree_retention.py`
- `ops/worktree_checkout.py`
- `ops/worktree_retention.py`
- `paper/materials/decision-log.md`

交回 review：集成员重组核验后再协调新的唯一完整检查，旧被中止full不能充绿。安装时须同批更新 worktree_retention.py、worktree_checkout.py、issue_session_project.py 三生产叶；本开发不安装/不改live或STOP，原14:49:42学习tab24h、私有kit及39/43父保持。回退本三生产叶差量，保留原allocation/接受证明/归档；不得回退到已知误放行23b候选或补造旧边界。

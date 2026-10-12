# 队列核对与固定验证

本批基线：dab16152d7ed52d5e25708113a8f736d6c64698f。只读live切点：8911faacac0b55e8a2cee23603ef99a30a75b7b8。
队列SHA256：84f59f4ed00489424c15cc22b31da7f8ec5a4f3cc36018569788e137b8de08f7。

对照上一批完整核对，队列仅追加普通策略批提案回写已修的关闭记录，见queue-delta.diff。历史159条来源记录均核为当前live祖先，其中149条为当前基线祖先，10条在main以等价整合保留；逐项见queue-commits.json。历史修复来源承接上一批审计，原报告与清单指纹见prior-audit-reference.json，不将历史红绿测试计作本批结果。

当前22个既有核对路径全部与前批审计SHA一致。新增提案回写修复的ops/proposal_dispatch.py、ops/tests/test_unassigned_proposal_resolution.py、agent/tests/unassigned-proposal-resolution.test.ts与3a98e213a源及当前live逐字相同。共25路径指纹见source-recheck.json。神化/萎靡的5个策略源码增量已由独立任务上线，不在本纯bug批重做；见changes-since-prior.txt。

当前实现确认：
- 普通策略批的results/resolve校验原提案ID、角色、来源、报告和live源码后回写，保留租约与seen_runs。原104302处置回执已留在paper/materials/20261012-1209-ops/original-proposal-resolution.json。
- 受阻无产出经验只跳过无源经验审计，仍保留failed/retry；有产出或含糊回报不豁免。
- compute-memo父线程和真实worker共享固定知识夹具，仍核签名变更和池重建。
- multi-character缺表/已有表前缀均固定隔离；rollout最佳线路和截止降级使用固定模型/时钟。
- 额度恢复仍要求完整额度窗口推进和两次稳定采样；升阶通知只读实测ascension。
- 会话前ENOENT恢复仍有限次且核租约/尚无会话输出；宿主续验仍绑定batch/source/tree/原日志SHA和已过覆盖。
- 量化入口允许原授权的有界waiting接续，入口实现不等于量化父任务完成。
- 双boss接续错误已有分支/seed/资源诊断，当前缺触发样本；silent-proposal-5aa2672bd7cd1bf4沿原策略链核实，不猜填资源。
- 核心通知已保存stdout/stderr，旧rc2缺stderr不能确认未发送，保留幂等历史。
- 具名卡事件子项已有42c920f34，根请求state=event_subtask_shipped_remaining_scope_pending；全入口/未知项自动派发/量化消费者属于原独立功能，本批不混入。
- 上游目录生命周期、调度公平性及mod短暂超时仍缺根因证据；其余机制/规则与全漏斗等继续既有专用提案，不新建重复项或派下级agent。

验证：原agent/tools/test-sandbox.sh带11个明确文件过滤，SANDBOX_WORKERS=1，nice执行；tsc0，threads11/95、fork12/106均0，去重12/106，累计201例。原入口在fork阶段重复已传过滤项，非失败重跑。日志targeted-tests.log/exit保留。固定数据、无真实LLM或网络、无新增依赖，临时文件在本批TMPDIR。

本批没有新代码、红绿撤码步骤、提交、合并或账本/版本写入。队列原文件未修改，HEAD等于base且工作树干净。严格空批函数因现有main/live源码差异返回null，no-change-proof.json记录165个不同路径；不以空合并绕过。report.md保存每条已修提交及所有未修分类，report.json与其JSON块一致。

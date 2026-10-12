# 两路并发运行跟踪：Fast入口的新失败

时间：2026-10-10T00:37:52.183081+08:00

request_id=watcher-20261010-parallel-runtime-fast-diagnostic。两路策略实际同时运行已验证（two-workers-running.json，各10ID且不重叠）；当前234302宿主仍活，231302与001301策略rc0但合入冲突，原完成事件已在队列，勿重复学习。新增运行定位：003040-fix-batch.err原错误为recursive Codex Fast launcher；ops/codex-ops-learner.sh:94每次从LEARNER_CODEX_BIN取原始CLI并覆盖STS2_CODEX_FAST_BIN，95又设LEARNER_CODEX_BIN为Fast wrapper；若上游已设为该wrapper，会把wrapper当原生CLI，触发codex-fast.sh:6拒绝。001301-fix-batch另为已终止树的.codex glob scan错误，原因不同，原证据保持。请由当前Fast入口源码拥有者按既有bug修复授权查真实启动环境，避免wrapper递归，固定假CLI回归并另立补验收；不交learner注入知识，不修改凭据/降低模型强度，不恢复Claude或新timer，不重派已完成核心/A10。这里是已有失败事件的根因补充，不新建学习任务或抢占活树。watcher两测试契约修正source4cf9d8805已实际live b934d888，原失败保持，实际live完整补验收正在后台持锁；结果另立host-full-2，尚未冒报通过。

定位是静态控制流推断；未读取上游进程完整环境，原生路径回连仍由入口拥有者核实。学习合入冲突与入口模型前失败分别处理。

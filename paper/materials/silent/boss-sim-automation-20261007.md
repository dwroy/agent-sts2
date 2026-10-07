# B4/B5 自动触发与自动验收：实际发布记录

Roy 2026-10-07 12:11、12:35 已授权独立功能 boss-sim-automation；不是普通修复队列批次，fix-batch 仅完成事件和完整外部检查通道。开工干净，先合 main，base=536713b82bd74bb347224dd26a5719f24894c1bf。实际源码 814fe9793c52751f15caf3a9d9928bb3f2209bea → live 4f96f0f2d1a0c5dd06335188385a804f05e8c950 → 发布 9895471c588b0afc31bc94cea6f15dd73de75f2b，唯一版本 S1.boss-sim-auto1。

首批 AEONGLASS B4 已由标准调度检查真实派发：batch=20261007-153133-fix-batch，PID=1937634，证据键=4306841dfc278360a3c9ce964a5f681f8a5af39d05160b81372662bef6acf2ee，工作树=/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133。引擎已实际启动证据：/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261007-153133-fix-batch.err first line; /home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/learner/runs/20261007-153136-boss-sim-batch.jsonl learner_launch/thread.started/turn.started。当前真实状态=running；后续完成事件事实=尚未观察到本批完成事件；wrapper finish 走 fix-done，已合入时后续完整检查走 learner-checks；原失败/重试/冷却保留。框架发布不等于模拟校正通过；后续学习者必须自己重放当前模型并执行自动验收。

## 自动流程与边界

每局结束、校准完成和调度 tick 使用同一检查入口。按角色/boss 保存证据、独立工作树、全局 B4/B5 互斥、PID/birth 租约和三次有界重试；证据变化不重置失败。完成后至少十场新战斗且新校准涵盖新数据才重触发。B5 保持角色分账、原 tune/切点、新数据只进验证，可信名单由原标准自然生成。

验收固定 before/after 数据、split、结局和覆盖；三项 boss 指标都不能变差，至少一项进入或接近标准，整体 T1/pre Brier 增加不超过 0.005。接近的可重复判据：超标量至少减少20%，剩余不超过原阈值10%；打穿比距[0.7,1.3]不超过0.03。Brier 用候选整体标准，B5 还须原 B2 全部准入条件。缺数据拒绝。校正只许 fullFight/模拟字段；保护实盘源码与调度/验收源码，基准实盘 solver 与五回合输出逐字节比对。完成事件独立重算验收，核实源码、唯一版本、实际发布角色校准；拒绝须 CLI fight/mechanic rejected 账本局/回合证据。保留分支和原失败，不冒称 shipped。

## 触发证据

本角色原日志和冻结校准独立复核：AEONGLASS 累计十死、十三场有逐回合日志。已发布旧模型验证 T1 n=3、Brier=0.5643、预测胜率0.71、实际0、打穿比2.238；验证局 DPYF2BAA3DKT、UMVLWER4CD98、HSX4HYATB4E2。原始开场偏移/哈希、SL实际结局、归档复算见 trigger-verification.json；最终检查和真实派发证据分别见 eligibility-final-readonly.json 和 first-dispatch.json。这些是触发偏差证据，不是新增游戏机制，也不声称旧校准是后来 A10 代码的预测。

## 检查与历史

最终组合源和合后固定树均用原 bash tools/test-sandbox.sh，nice、两个 worker、scratch TMPDIR；tsc/vitest exit0，合后 230 文件 2422 例。另有89项 Python固定夹具和实际 wrapper 假引擎退出码7→完成调用 rc7 夹具。最终源独立撤自动触发核心45项夹具真实红（2失败/28错误），按原字节恢复后45项全绿；原断言不改，固定树与源码SHA见 withdraw-final-proof.json。此前四个源码阶段各自通过原入口，所有源码提交、固定树和原日志见 report.json。实盘/五回合十四组合成输入归档逐字节相等；框架未改 agent/src，铁甲行为等价。

保留 python-initial/source-sandbox 初稿失败、撤触发核心真红/恢复绿、旧时序截断失败、一次并发编辑验证失误、继承 CSV 空白检查失败及沙箱启动限制原历史。集成预检发现并行 B/C/D 已上线，先拒绝未测组合，后保留双方调度功能、重新固定验证；首次宽扫描发现的四项都是已提交上游测试夹具检测项，原红报告保留，实际本功能16项变更文件重扫通过。没有减弱断言、修改原沙箱排除、安装依赖或把环境限制当源码失败。

锁内宿主进程检查、全部 live 刷新（含新增知识）保存、重叠/预检、合前提交、合后测试及唯一版本事实见 live-deployment.json。main机械集成保留其记录和数据；实际源码与固定树一致。没有运行 play、推送、读 key/.env/游戏包、停止对局或调度；父框架没有新建架构游戏账本条目。完整外部检查留原 fix-done/learner-checks 通道，未冒报通过。

所有初稿、失败、恢复、固定检查树、发布/派发及报告路径和 SHA256 见 artifact-manifest.json 与 report.json。B4/B5 后续报告按 paper/materials/silent/boss-sim-b4-<boss>-<日期含批次>.md / b5-… 留存并在升级小结引用。

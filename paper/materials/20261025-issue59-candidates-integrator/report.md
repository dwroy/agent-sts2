# #59 两个保留候选的串行核收

授权为同账号 ops 评论 6392739075。已在新隔离树 `.worktrees/integrator59-candidates-20261025` 精确应用两份原 patch；没有改原学习树或实际 ROOT/LIVE 源码，没有重跑旧 full、学习批次或发布事务。

候选提交 `e9f4ea1778242c98136c77eeabed01dd2c90c80e` 的父提交为 `275ce2c992a7541a1f1cc359ae6d91463b2c848a`，仅含六叶。验证锚点 `ae967f472ab3bb8346005fa4cf6605c53b643e5f` 与候选同树 `5b420012d45e6867e6d7e0e700fd95d83821aefb`；未推送候选或合入 main/live。原两份 patch、manifest、六叶原件、原定向记录、130 中断及两份 codex1 原生末回合/报告均逐 SHA 核同。详见 intake-verification.json。

`ops/codex-ops-learn.py` 通过 patch 合入，保留当前 #60 的 knowledge_runtime_env 导入、dispatch 捕获和入口控制，因此新集成叶 SHA 为 e557579ddfbbc42eaa6d0079ec1eab9217a09c0a68d96130c20e897a64d4ada4，而非旧树原叶 fcd3b5a0…。差异逐项保存在 codex-ops-learn.py.upstream-preserved.diff；其余五叶与原候选字节一致。没有用旧文件覆盖新发布兼容改动。

Silent 候选只扩原学习者的 A10 / 两敏捷 / 原未升级防御窄条件；其他进阶、铁甲战士及不满足条件者由原定向用例维持原行为。新增两个夹具分别与原局 Q7HBKHZTSPJ8、T5 的 states.jsonl 固定 offset/bytes/SHA 切片原始 state 完全相同；文件追加不影响原切片。此核收不扩大机制适用范围、可信度或收益。

实际执行一次双 tsc，production=0、knowledge-runtime=0；两组 Vitest 共 13 过/0 败（Silent 12，复盘 wrapper 1，后者内部要求 Python 9 项全过）。退出后独立核 PID/birth 已消失、唯一检查锁可取得、2848 输入/1417 依赖/tree/index 条目及 flags 未变。原 130 不改写为通过，也不借 #60 的 687 文件 full 覆盖六叶新组合。

下一步按原队列的 “after #60 frozen natural transaction” 串行边界执行：原 ops 先给 #60 原事务实际终态；再鲜核实际 ROOT/LIVE 及知识数据/依赖，重新固定最终部署组合，沿唯一检查门只跑一轮适用 full。若 #60 事务仍在途，保留六叶候选等待，不能先改冻结 ROOT 或把定向绿当最终准入。候选失败需实现返工时沿原候选/原树由 codex1 接，不重派整批。

11:06 独立读回 #60 原 worker 3664523/birth32041728 仍活，阶段 awaiting-original-owner-continuation、无持锁，worker-state 最新 reason 为 Errno 11 Resource temporarily unavailable；publication-state/publish.once 均不存在。已把此实态交回原 ops，不触 FIFO 或重放 worker。实际 ROOT 的 #60 全部 2848 冻结输入仍逐 SHA 一致。本角色检查已退出，无在途 full/模型/发布。旧 75/awaiting_review、禁自动 finish/retire/replay、原树/分支/日志与科学父全部保留。

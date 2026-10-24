# #56 同道原 owner 退役门修正

接续交付 `dfd847f819f13d681202d4ab7bc6742fc8fa18e9`，对应集成员退回的合成反例。原始退回与独立脚本在 main 的 `paper/materials/20261024-issue56-integrator/`，原失败记录不覆盖。本次没有生产事故或自然发生次数的结论。

原实现只在同 plan 重试或 unit ID 重叠时调用 `shared.retired`，而 `active_external` 提前排除了 terminal + wrapper PID 不活的原批。不同 plan 和不重叠 ID 因而能在原生尚未退役时复用同一道。

修正以原 `shared.retired` 为唯一退役证明入口：`done/failed` 且 PID 不活也须通过原门；缺原生终态、原 learner summary/output 或原 not-started 证明时保留原道及 worker 名额。来源变化与 ID 不重叠不能释放道位。原字段、rc、失败、lease 和计划世代不重置；下一次准入重新核原证据，证明齐全后释放，不给历史批次加永久阻断标记。原生仍在运行或未知时继续受四/二 worker 上限约束。

已核退役历史不占道或额度。已知所属道的未核 owner 只保该道，剩余 worker 容量仍供其他空道使用；独立自有槽继续走原路径。无法判断所属道的原保守处理不放宽。外部 dispatch、底层 writer 及外部期识别共用同一 owner 集合；不改变额度分档、磁盘门、发布、沙箱或知识。

## 固定证据与验证

- `independent-reproduce.py` 来自集成员原脚本，只将其隔离验证树常量改为当前 cwd，测试逻辑不改；本目录 JSON 中 failed/rc1 和 done/rc0 两例都仍被原 `shared.retired` 拒绝，同时新增 writer 调用均为 0，原 batch 字段完全相同。
- 新固定负控覆盖不同 plan、不重叠 ID、done/failed、PID 已退、原生 `task_started` 尚无终态。真实原门的正控追加匹配的 task_complete/turn_aborted、原 learner summary/output、已退出的原生身份回执后可续派。原 not-started 正控同样通过，未 mock 退役判断。
- 其他道续派、自有槽、底层 writer 准入、降档后保留未核原生 worker 名额，以及既有四道/额度/磁盘/来源/保留门均由固定回归检查。源码冻结见 `source-freeze.json`，最终检查记录另见本目录回执。

最终生产 tsc 退出 0；沙箱固定排除集 631 文件、5,844 项全部通过，单独 paths 11/11；Python 策略回归 109/109，外部调度原门固定测试 20 项通过。脚本两阶段 JSON stdout 原件留在 `sandbox.log`，分别提取为 `vitest.json` 与 `paths.json`，无上轮 outputFile 覆盖问题。冻结四叶 SHA 前后相同；本次未重跑无关 broad tools 检查，也不改写上轮额外 tools 52 诊断的非绿记录。

## 交接

修复提交在原 #56 分支累计交 review，由集成员/ops 沿原精确检查与发布流程推进；本开发会话不部署、不强制 tick、不运行模型/游戏、不改 live/STOP、不关闭其他会话。R434 及后续知识刷新仍保留。

自然五槽、原生 ultrafast、两小时四个完成单元和真实换号均为原 ops 上线后验收，固定测试不代替它们；学习与科学父要求保持开放。原交付报告及全部旧失败原件保留。回退本修正会重新引入已证实的同道退役漏洞，因此不能将旧 `dfd847f81` 原样发布；未部署时保留原现行调度，已部署后的处置沿原 owner/lease/发布门进行，不清现场或伪造终态。

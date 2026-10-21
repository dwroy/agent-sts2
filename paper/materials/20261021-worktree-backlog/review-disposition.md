# #18 watcher 核验接收及执行限制

2026-10-21T11:41:07+08:00 原ops实读 https://github.com/dwroy/agent-sts2/issues/18#issuecomment-6307444515（作者dwroy，角色[watcher]），并核实际 review.md / readonly-admission.json 与原 inventory SHA 绑定。原清单核验通过，**本轮删除授权0**；无工作树、文件、提交、分支或绑定回收。

此文件接续并限制 reclamation-plan.md 的后续执行段，原计划原字节和 watcher 绑定 SHA 保留：**不允许全局 sweep --apply --limit 4**。未来补证后另冻结具体 name/HEAD/owner/材料及非零清单，经核对后只能走已有定点 `sweep --workspace <name> --apply`；每批至多4项，行动前仍过原锁/宿主进程/要求/发布与归档门禁。原计划不能覆盖复核后才合格的新树或中断恢复项。

72份绑定来自相同受跟踪历史文件，仅证明继承关系，不证明运行实例或空闲；watcher建议的身份判定修正仍待Roy决定，未修改代码或移除文件。56项待原owner补证：未注册/证据投影21、显式验收20、scratch/report归属6、ingestion/settled6、ops complete3。dirty大现场须分类保存/读回，不能以全未跟踪为可删理由。

本轮没有重跑盘点、准入、完整测试、清理模型或生产刷新。#18保持开放、blocked/needs:roy；实际回收仍为0。

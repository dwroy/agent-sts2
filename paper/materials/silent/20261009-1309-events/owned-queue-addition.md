
## 2026-10-09 13:18 — RMNXHZKV716Y复盘新增非阻塞纯bug（回合末挡诊断来源漏项）

- [ ] **silent-0338**：仅转录学习者回报，静默A10/F49女王战致死差异注记漏列求解器已计入的奥利哈钢回合末挡。末试T2 d313188/d313190预测损10，却写no end-of-turn block；s321678/s321683为11血0挡对16攻击，s321684实1血；T4 sl1362末试判官明确19 incoming vs 1 HP + 0 block + 6 end-of-turn block。只读定位 `agent/src/reflex/turn-solver.ts:2975` 数值已计入、`:3083` endTurnGuards来源表遗漏，`combat-plan.ts:2010`因此错误解释攻击差。首证本局/prior unknown/observed保持；对局正常结束，诊断问题非阻塞，不将阵亡归因此项。
- 沿已注册 `silent-proposal-8d88108e5417f650` 自动strategy-proposal链，由学习者核验来源表与解释一致性、固定帧/其他角色等价，自测实际合入后登记；数值与动作保持等价，不重复派发或标implemented/shipped。护栏执行链51ea234b4f032110、双boss资源接续5153135cd2aab723沿原自动链；缺整场配对与反事实不替改SL、药价或终局参数。运维只登记纯bug，原草稿修正、未记录范围及失败历史见 `paper/materials/silent/20261009-1309-events/pm-originals/report.md` 与 `intermediate-history.md`。

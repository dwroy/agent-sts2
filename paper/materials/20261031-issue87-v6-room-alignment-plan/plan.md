# #87：r2前的V6房间两叶对齐提案（待主管批准）

授权：[77/6544081245第4条](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6544081245)。本提交只有核查、固定探针和拟议patch，没有应用patch，没有改main/LIVE/配置或方法票；r2后排，原70040a92及其固定分支引用保持不动。

## 明确回答

**会调用`prepareV6RoomDecision`；不会调用`buildV6RoomDecision`。** 前者在普通非fallback主循环路径被调用，但面对没有`v6Room`标记的brain决策立即原样返回。不能把“没有进入V6房间计算”说成“prepare函数从未被调用”。`admission=interfaces_only`是固定记录字段，实际门控是`mode=on && decider=jev`。

当前取样部署源：main `159cfa750cd94dbafbf84d26b1e2f79afdd0a2cb`，LIVE `3a3eba6a6eb35abc82d06c325dec340b23cc0d70`。最近已保存run-config为`EBF9A9ASTK56`、2026-10-31T13:16:59.961Z，`mode=on`、四项decider均brain、admission=interfaces_only、delivered=false；原日志offset/length/SHA见[run-config-evidence.json](run-config-evidence.json)，仅投影允许的配置字段，没有读取.env或凭据。

## 调用链证据

1. [LIVE loop.ts:L970](call-chain-evidence.json)普通路径执行`await prepareV6RoomDecision(...)`；`v6BrainFallback`路径会直接绕过。当前card也为brain，房间题不会被V6 card pick替代。
2. [v6RoomActive:L18](call-chain-evidence.json)要求mode=on且该项decider=jev。shop/rest=brain时为false，两个options入口直接返回null，且尚未读库存/知识。
3. [shop:L95](call-chain-evidence.json)、[rest:L34](call-chain-evidence.json)仅在options非null时调用build。其余生产build调用只在prepare的V6分支内；`v6Room`标记的生产构造点只有build自身。
4. [LIVE prepare:L142](call-chain-evidence.json)首行`!isV6RoomDecision(decision) || !provider`即返回；判定要求`kind=ask && "v6Room" in decision`。当前brain决策无此标记，故不进入provider、build及P×W题面。
5. [config:L34](call-chain-evidence.json)只是返回admission常量。固定正对照mode=on/decider=jev时，即使admission仍interfaces_only，gate也为true，所以不能拿该字段当禁用门。

main和LIVE各跑off/shadow/on×shop/rest共6个固定直接调用用例：options全null、无v6Room、prepare返回同一对象、provider调用0；两边输出SHA相同。正对照gate为true。[probe-summary.json](probe-summary.json)与[probe.mts](probe.mts)可复核。这是固定探针，不冒充生产运行trace；生产调用结论由上述部署源码及run-config支持。首次从仓库根运行因tsx仅装于agent/而解析失败，原stderr留本地；改用已有agent工作目录重试通过，未安装依赖。

## 待批的具体恢复方案

按[proposed-two-leaf-revert.patch](proposed-two-leaf-revert.patch)将main两生产叶**逐字节恢复到已冻结LIVE blobs**：

| 生产叶 | 当前main blob | 恢复目标LIVE blob |
| --- | --- | --- |
| agent/src/hand/screens/v6-room.ts | d43af13d5f70b5f56b5bf809f1a7191ac66b7449 | 4c3675475c3c0e6d8418a367ae50359463014002 |
| agent/src/hand/screens/v6-room-projection.ts | 1b8427f60b340534f8d46a38901b8a695c115e53 | 6b0c9c9d6878fff69f07b086169b7e54d3b6f2a8 |

完整SHA256及工作副本与提交一致性见[source-snapshot.json](source-snapshot.json)。恢复移除best_by_target注入和P/W/P×W优先提示；unknown计数及投影过期检查也精确回LIVE原合同，不只选择性删一段文字。当前brain房间分支不执行这些差异；LIVE两叶本来就是目标字节。

**超时不另夹补丁。** LIVE的`withinDecisionBudget`本身已有`Promise.race`、到期定时器/abort和收尾；投影wrapper也有`signal.aborted || remaining()<=0`拒绝过期结果。主方案恢复这套现有保护。main额外的`ms+min(100,ms/10)`清理宽限属于另一种超时实现；若要保留，应单独给挂起/忽略abort的provider、部分结果、父预算恢复和定时器清理的固定对照，并审批新的ROOT/LIVE blob，不混在本次精确对齐中。

获批后：

1. 在届时最新main的新代码分支实施，保护原r1固定引用和#87/#77并行差量；先鲜核这两叶前像及LIVE目标SHA。默认直接恢复上表两blob。
2. 同步工程声明`ops/fixed-producer-dependencies.json`中受影响源码SHA、opaque sites与静态边；当前声明命中v6-history及silent-boss-calibration。按实际父版本重算闭包和方法身份，不复用旧方法票，不覆盖其他单的声明。
3. 在固定数据验证brain门控/prepare空操作、无best_by_target/P×W提示、合法选项/unknown/资源和预算取消合同；相应旧断言按批准的LIVE合同调整，保留无关断言。生产tsc、相关Vitest单worker/nice19；最终精确组合全量交原合并队列，不在此方案阶段另起full。
4. 独立固定提交/保留分支/请求，走review和原队列；由集成员/ops核实际ROOT/LIVE两叶逐字节及方法门完整回执后，报主管撤77/6544081245第2条的窄例外。仅“当前分支没执行”不能代替这一步。LIVE已经是目标字节，本项不顺手部署main原差异。

预计获批并确认适用main基线后30分钟交工程候选（相关定向/tsc/声明核验），队列完整检查与上线时间另计。r2仍在本步骤之后。**当前只交方案，等待主管批准再修改代码。**

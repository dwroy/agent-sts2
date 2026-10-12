# 本批策略学习报告

记录时间：2026-10-13T00:12:06+08:00。

本批十个已领取原提案全部逐项处置为 **waiting**。六局证据支持局部资源成本与阶段分账；尚不足以修改探索准入、持有药价或巨兽参考排序。已有诊断子项不重复实现。逐项证据局号/层/回合、账本 id、反例、预期行为及验证方法均已保存到本目录 proposal.md。

基线 `c17a78b6c28f5b844d88f960a1b790e515f02fe7`，开工工作树干净、普通 main 合并检查 Already up to date。根 learn.json 的本批 task/character/worktree/十个 proposal_ids 相符，reason=proposal，无专题或实现请求；deck-size 请求绑定另一批，未转入专题或扩大队列。

根 runs.jsonl 中六局均唯一、SILENT/A10。原日志重新读取并核偏移/SHA：4071 决策、4167 状态、43 SL，合 8281 条，逐局计数符合 runs；原提案十份 SHA 均符合队列。十二组资源端点、六组同指纹、七次耗药和 KEN 六次75/86空药入口已核，原字节/定位清单保存。751 T7未决弃牌、KV删毒后续问、KEN技能药选牌/发光后续问均保留，未把部分派发当整线兑现。

已有八个不同源码提交对应十条路径均为base及实际live `f2df18b3c1b27fd72b5fd19b0e5261c490a7b855` 的祖先；17份相关源码原字节快照及live工作文件与提交一致性已核。共享 combat-plan.ts、hand/loop.ts、sl/explore.ts 的三个历史 base/live 差异保持。本轮没有源码提交，不将这些子项等同完整父提案 implemented/duplicate。

历史六份离线消费者输入/输出共12份按原artifact-manifest的SHA复核，六份输入与本轮重新抽取的输入逐字节相同；历史输出仍明确 full_candidate_result 未知。本轮没有重跑消费者，不将历史退出0当本轮软件测试，也不宣称在线采用、真实反事实或胜率改善。当前源码明确把候选预测、派发、相邻观测及完整结果分开，保留null和缺证范围。

反例和结论限制：751 T13少失6血同时少6净扣；KEN T10多失6血只多2净扣，T5省2血却将步法建立T5延至T9；不能以单个最小损血或最大输出固定探索准入。YQL残壳饮毒2→8未改变26血/13挡/41来袭；PU巨兽末试获胜伴随后轮动作及结束时点变化，不能充当新排序或单药对照。无新结论与旧知识冲突；原提案的相反取舍继续保留，不把“未知”写成已验证规则。

本批没有生产源码或知识改动，未运行tsc/vitest；tests三项均null，撤源码失败/恢复通过不适用。没有提交、合入、eval版本或shipped登记，无其他角色行为变化。纯报告没有合入动作可执行，不空合live、不运行play、不推送。

首轮scratch核验已读完六局原字节并核资源、祖先，但读取旧回执的integration_paths字段时KeyError；该回执实际将路径保存于独立integration-comparison.json。初次失败日志保留，仅修正scratch读取位置后重跑核验退出0，原日志/回执不改。这个失败不冒称策略测试失败或成功；本轮还保留早期按猜测文件名查看不存在源码的定位错误，未据此作缺实现判断。

只经根ledger.py给16个既有silent账本补本批提案/报告链接，保留原claim/evidence/status/version及已有子项上线范围，不重置shipped、不新建提案id。不以本批完成关闭学习入库/量化/牌表父要求，经验实际入库、消费者在线读回与自然效果仍按原后续任务核验。

|提案|处置|具体缺数据条件|
|---|---|---|
|silent-proposal-366288801d9150d9|waiting|751 F17 T2/T7/T13同指纹资源差已核；T7生存者pending后才选牌，缺确定弃牌后的完整收益归属、相同随机输入整战及独立局验证。|
|silent-proposal-85929bdfc8a3fc1b|waiting|751 F13 T3整战无药仅有模型8/8样本，实际已饮用；缺实际不喝/留药后继及持牌、毒、荆棘和药价的联合执行验证。|
|silent-proposal-efd9f83ee9e1a6dc|waiting|SL预测、派发及区间子项已有live祖先；缺确定弃牌后全轮分账与更差B2线的受控后继，六次相关SL不能作独立局。|
|silent-proposal-131042659448ae74|waiting|持牌拆项和未知药价参考已有；缺敏捷、毒、荆棘、持牌与药水的联合收益归属及实际无药整战。|
|silent-proposal-990f054036609447|waiting|KV F33 T5删毒后净扣36→29而两线均零损，续问阻止补毒、后轮也变；缺跨问毒/回血归属及相同后继整战。|
|silent-proposal-e18d3f18e6cac2a0|waiting|巨兽阶段/资源展示已有；当前anchorRank仍保留同轮占位HP比较，缺新参考排序的完整后继及独立验证，PU末试胜不能归为改序效果。|
|silent-proposal-9733bb80f445aeae|waiting|YQL F17 T10毒药仅使毒2→8，血26/挡13/自爆41不变；缺提前喝、不喝、留药及改序的受控整战收益。|
|silent-proposal-c51468c5e8ba6668|waiting|KEN七次槽位耗药已核，发光后续问及技能药pending后选牌截断原方案；缺完整候选收益和不喝/留到boss的对照。|
|silent-proposal-86a7db08d1a31976|waiting|KEN F17 T10多付6血仅多2实伤；T5省2血却把步法建立从T5延到T9且续问追加小刀，缺完整能力收益、受控后继及独立验证。|
|silent-proposal-e282a9131b99129a|waiting|KEN持牌预测和局部观测已有，换线/能力延迟整战因果仍未知；六次相关SL不足拟合统一门槛，缺同后继及独立后期局。|

运维入口：本目录 proposal.md、report.json；根ledger.py输入/回执、密钥扫描及HEAD/base/clean证明另保存在本目录。无可标shipped的新源码提交或发布编号。

收尾时间：2026-10-13T00:15:07+08:00。根ledger.py实际追加16条本批报告链接，原前缀及claim/evidence/status/version均保持；账本check退出0/0问题。密钥扫描退出0。最终HEAD/base、tracked diff与派发身份验证见no-change.json、delivery-validation.json，材料SHA见artifact-manifest.json。

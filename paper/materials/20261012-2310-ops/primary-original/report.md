# 本批策略学习报告

记录时间：2026-10-12T22:54:28+08:00。

已逐项处理本批领取的十个原提案，完整父项均 **waiting**。依据六局原始证据，当前不足以修改探索准入、药水持有价值或巨兽参考排序；已有诊断子项已在live，未重复实现。逐项局号、层、回合、账本、反例、预期行为及验证方法均在 [proposal.md](proposal.md)。

基线 `f3c56c8b424a5b11cf37e4da2902458f223cf475`。普通批次身份符合，开工工作树干净，main合并检查Already up to date；未绑定专题或实现请求。六局均在原runs.jsonl唯一且SILENT/A10；本批没有读取其他角色知识。核验8281条原始记录、12组资源端点、6组同指纹及7次耗药，保留来源偏移/SHA与原字节。原提案十份SHA均符合登记值。

六份冻结输入分别调用已有离线消费者成功，共861片段、4065观测区间；6条无decision_id的历史行仅从消费者输入排除，原件保持。完整候选收益均保留null；相邻端点的实测差额和未知归属分开，不将这些结果充作未执行分支的整战反事实或新策略胜率。

已核8个不同源码提交对应的10条路径均为base及实际live祖先，15份相关源码原字节快照保留；核验live为c6ac75226dc8222a980bcf2f7db8ce39db338eee。combat-plan.ts、hand/loop.ts、sl/explore.ts的base/live历史差异保留。本批没有提交、合入、eval版本或shipped登记；铁甲及其他角色行为没有变化。

未改生产源码或知识，tsc/vitest未运行，撤源码失败/恢复通过不适用，tests全部为null。补充材料抽取曾因旧explore/target为null触发AttributeError；原失败另存supplemental-initial-failure.txt，修正仅在scratch抽取器，原日志不变，后续核验通过。这不是策略或软件测试失败，也不覆盖原失败。

仅经根ledger.py给16个既有silent账本追加本轮报告链接，不改claim/evidence/status/version，不新建提案id。对应CLI输入/回执、密钥扫描和零改动证明在本目录交付回执中；报告完成不等于经验入库、消费者在线使用或量化/牌表父要求完成。没有新增与旧知识冲突的结论；旧提案中的相反取舍与未知继续明确保留。

本批完整处置如下。

|提案|处置|具体等待条件|
|---|---|---|
|silent-proposal-366288801d9150d9|waiting|751 F17 T2/T7/T13局部差额已核；T7有未确认弃牌回执，缺完整候选收益归属、同随机输入整战及独立局验证。|
|silent-proposal-85929bdfc8a3fc1b|waiting|751 F13 T3无药整战仅有模型8/8样本，未执行无药或留药整战；缺持牌、毒/荆棘和药价的完整联合收益。|
|silent-proposal-efd9f83ee9e1a6dc|waiting|共享预测、派发和区间子项已在live；缺确定弃牌后完整分账与更差B2线的受控后继，六次SL不能视作独立局。|
|silent-proposal-131042659448ae74|waiting|持牌拆项及未知药价提示已有；缺敏捷、毒、荆棘、持牌和药水的联合执行验证及实际无药整战。|
|silent-proposal-990f054036609447|waiting|KV F33 T5原替实扣36/29且均零损，删毒后重问、后轮不同；缺跨问毒/回血归属及相同后继整战。|
|silent-proposal-e18d3f18e6cac2a0|waiting|巨兽阶段和资源展示已有live祖先，旧同轮占位HP排序仍保留；缺改变参考排序的完整后继和独立验证。|
|silent-proposal-9733bb80f445aeae|waiting|YQL F17 T10毒2→8但血26/挡13/自爆41不变；缺提前喝、不喝、留药和改序的受控整战收益。|
|silent-proposal-c51468c5e8ba6668|waiting|KEN七次耗药已核，发光水后重问、技能药pending并选牌；缺完整方案收益及不喝或留到boss的对照。|
|silent-proposal-86a7db08d1a31976|waiting|KEN T10多付6血仅多2实伤，T5省2血却延迟步法T5→T9；缺能力收益完整归属、受控后继和独立验证。|
|silent-proposal-e282a9131b99129a|waiting|KEN持牌预测及局部观测已有，换线与能力延迟的整战因果仍未知；相关六次SL不足拟合统一探索门槛。|

运维材料入口：本目录 proposal.md / report.json。工作树保持HEAD=base；无合入提交或版本可登记，不标shipped。

收尾时间：2026-10-12T22:57:36+08:00。根ledger.py实际追加16条报告链接，原前缀SHA保持；gitleaks退出0，无泄漏。最终核HEAD=base、git status干净、tracked diff为空、本批身份和十id不变。详见ledger-receipt.json、gitleaks.log、no-change.json与artifact-manifest.json。

# 策略批次回报：十项waiting，源码无改动

角色silent；batch=20261013-193626-strategy-proposal。本批是十项已领取提案的普通消费任务，不是手动研究或已授权冻结实现请求。合main前HEAD=fa557ebdce596d28b43f82a60c1e435f7e34a5d0；仅快进两份运维记录，最终base/HEAD=**bcb871548bf806107f0697bad842baf0b7d3dc29**。

完整逐项证据、账本、反例、预期行为及验证方法见同目录[proposal.md](proposal.md)；逐项机器处置见[final.json](final.json)。十项均waiting，没有足以核验的整项live实现证明或足够支持新策略参数的受控证据。本批无源码/知识修改、fixes=[]、merged=null，没有提交、发布号或shipped；没有改变任何角色行为。相关父要求及原任务继续保留。

## 六局来源与冻结口径

|局号|实际身份/进阶|运行记录|结束层|
|---|---|---|---|
|VLZ6CCT8AQ0A|SILENT/A10|ac321b1f+dirty|45|
|8JRE1C4H4Z2W|SILENT/A10|b0f41f03+dirty|33|
|CA5KE8GFJ9X2|SILENT/A10|33f02a6f+dirty|13|
|5PM6JAQG6FNQ|SILENT/A10|f56da22b+dirty|39|
|61E2QS63Y9WU|SILENT/A10|03d50f0b+dirty|28|
|DUZUBAJ3A8GP|SILENT/A10|93298980+dirty|30|

只分析本批六局及其既有原提案、静默经验/账本和复盘。所有六局都原败；SL尝试不作为独立样本，首试won/判死/真正阵亡分开。历史运行的dirty完整源码和全部知识调用依赖未冻结，提交前缀不能充当该运行树。

冻结/逐字读回7,574条：runs6、states3432、decisions3306、jev-prompts579、brain183、run-config6、run-plans33、sl-attempts29；fight-plans对应run_id条目0。7,568口径不含六条runs，二者不混用。决策数逐局与runs一致。每条在[evidence-manifest.json](evidence-manifest.json)记录物理行号、偏移、长度与SHA；原字节在selected-*.jsonl。六份既有复盘按原段字节保存，边界/SHA见review-manifest.json，历史复盘未重写。

十份原提案原字节SHA与根队列匹配，保存为各id.source.md；本批没有新建重复代码提案id。26个原账本保留claim、状态、已有版本、first_run、证据分母及effect，仅通过根ledger CLI补本批proposal/report与waiting处置链接。

## 处置与实现边界

|原提案id末段|证据局/层/回合|处置与未完成部分|
|---|---|---|
|89354805ee4d7e77|VLZ F35T1/F43T1/F45T1|waiting：升级子项已有，缺真实施放及中断/重置全链消费者验证|
|f2bfceddb1898dca|VLZ F45T1/T4/T5|waiting：缺同起点、同预算、相同模型覆盖的MC对照及稳定性曲线|
|283a164780d11e69|VLZ F35/F43/F45|waiting：经验同源关联有效，完整神化请求未验收，不能整项duplicate|
|ebbfe3b97548756d|VLZ F43/F45及休息|waiting：缺十五机制各状态期限/持续资源的逐项完整消费者对照|
|e5b87be50f28f311|8JRE F33首/三试T2、二试T5、末T11|waiting：首动作回执已有，缺跨抽牌/选择/药水/续步到末端的整方案归属|
|49632bc4878fb597|CA5 F13T1/T3/T5|waiting：没有本局步法建立，缺力量/弱/敏捷/成长四路径联动冻结调用|
|66532328a585941f|5PM F39末试T2|waiting：空放1能量零效果已核，缺完整受控启动/构筑顺序对照与收益函数|
|43a76a31ba7bdcfa|61E F17T5/T6/T7|waiting：首试本来胜，缺同资源/完整抽序的受控SL換线结果|
|5264153a4a4b0e5c|61E F23T3/T4/T5|waiting：缺A10航行/召唤/复生完整冻结调用及另一focus后继|
|bddfa690a84e03d0|DUZ F30末试T1—T6|waiting：缺醒来/眩晕接续完整依赖与同抽换序整场对照|

重要复核结论：神化升级的实见差值成立，持有不证明施放或全覆盖；F45药水707ms仅1/12样本，与后来不同盘面的12/12不能形成预算实验；沙虫同盘换线实付12血、多7伤，原0/24和替换5/24并非相同死亡数；这些观察不提供新权重的估计。冒泡旧“35血”按账本既有勘误复核为敌血：states274379/274380玩家29血不变、能量5→4，两敌35/72且无毒。没有重复添加该勘误证据。

现有源码快照与完整路径源commit在[source-manifest.json](source-manifest.json)。actual live快照为fa0a436f9b283e83a322a6821b01696f22153a62；15个相关路径均保存base/live原字节TXT及SHA，路径源均为该实际live祖先，差异仅旧Roy/Dai归属文字。只是限定路径源码核验，没有声称整个live或历史dirty运行树等价，也没有将任一局部源登记成十项完整实现。

当前`actual_cast_this_fight=null`；派发回执scope为single_action_receipt，state_effect_verified=false、whole_plan_executed/actual_turn均null。六局原决策没有后来新增selection_audit/selection_dispatch字段。原dirty历史帧不能冒充新审计的完整实盘生命周期驗收。

## 验证、记录与运维交付

[evidence-verification.json](evidence-verification.json)及原日志保存7,574行原字节/SHA读回、35项确定性事实/身份核查，退出0。没有跑策略仿真、tsc或vitest，也没有新源码可撤码/恢复；tests固定为tsc=null、vitest=null、cases=null。未调用模型、网络或游戏。

三项取证准备诊断已保留：首轮把combat=null当dict的schema查看exit1；误指定不存在known-draws.ts的路径冻结exit1，改为实际draws.ts后完成；冒泡初版只按observed_ts为空，保留observations.txt后分列ts/observed_ts确认原两帧。它们不是生产代码或测试失败。

ops应沿final.json逐项保持原十id waiting，等待对应新局/完整调用证据；本批没有需标shipped、合入或分配release_id的源码。提案路径为本工作树learner/runs/20261013-193638-strategy-proposal/proposal.md，报告绝对路径在final.json。无相关新实现，implementation_domains=[]；code_proposals包含全部十个原CLI id。不因本报告完成关闭父要求。

根ledger CLI update实际退出0，26个id回执在ledger-update-receipt.txt，stderr为空。逐项读回确认原claim/status/first_run/asc/version/effect/evidence完全保持，新增proposal/report链接都可读。completion-validation.json保存完整base、工作树干净、零源码/知识差异及本报告/提案SHA。

所有产物均在本批scratch，源码副本为TXT，保留原日志、原提案、原勘误和初版；未推送、不运行play、不改运维prompt。工作树保留干净，交启动器/ops按原验收及回收流程处理。

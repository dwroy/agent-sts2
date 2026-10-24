# 静默普通策略批次交付报告

本批完成十局整局主线及原始字节核对，保存一个局部大脑策略候选；没有源码、正式经验或正式策略/rk修改，没有合入live、发布号或shipped。候选的固定检索读回通过，不证明当局误判被纠正或未来收益。

## 身份、基线与范围

- 本批为普通自然tick，task=strategy-proposal、character=silent、工作树与十个dispatch_runs精确一致；无proposal_ids/proposal_repair/research_request/implementation_request/backfill_source/external_source。派发原行见dispatch-binding.json。旧deck-size专题仍绑定20261010另一批，不转成当前专题，也不领取旧队列。
- 开工工作树干净，原HEAD=e8dd51b732e5876b2c0774758633011d74fc87aa；按普通批次要求git merge --no-edit main，快进到本报告base=b6933c7e621aaf75b0c31a912f3178d7607ea82b。后续未提交，结束仍同一HEAD且工作树干净。source-diff.patch为空。
- runs原行明确为SILENT/A10，十局均ended且victory=false；派发进度键A11不代表本批观察过A11。原始offset/bytes/SHA在run-identity.json。首次手工断言误把SILENT大小写当失配，已保留说明并用大小写归一复核；没有改写原行。
- 无子agent、网络、模型/MC调用或游戏动作；仅本角色知识与本批原日志。没有读取其他角色知识。模型不会凭牌名或预训练资料补游戏事实。

## 原始证据、冻结切点和覆盖

先运行指定evidence_summary，再运行指定V6/Jev四流及共用全流extract_evidence。两个manifest分别保留，没有覆盖旧截点或把0行初稿当缺流。所有所选state/decision/Jev原行又按offset/bytes seek读取源文件核SHA：4,492 / 4,309 / 1,179行全部相同。另核20条run-config、519条run-plans、37条sl-attempts与220条brain原行；run-plans仅run字段，其他流仅显式身份/精确decision_id，拒收冲突及正文提及。见raw-integrity.json、additional-stream-audit.json。

|提取|流|冻结字节|源前缀SHA256|本批选中|坏行/截断（全冻结流）|
|---|---|---:|---|---:|---|
|v6-evidence|v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|0|0/0|
|v6-evidence|jev-prompts|3317411550|5f1866a74ded149e7ba9d1dac6368f4c598368f0927664c3a58dc57171e992c3|1179|1/0|
|v6-evidence|decisions|4764426001|ccda15034d3e0b3ccc9ba01eea57f9da296f7bdb968f0fb0d39e1ff66d2c6b62|4309|2/0|
|v6-evidence|run-config|3445978|9badf1e15b61f7b5de102903d9172b87841e9bd1889ca9497b67a285b4792353|20|0/0|
|evidence|states|17194286695|eb290e7bbbf131d0683c13e65bce455b1f97c905f814d7c16421d6ceadbdb07b|4492|2/0|
|evidence|decisions|4764727071|241f142395ffd92038b41cfdfc63acdfb076ce55c0fca7fa227ad3134419f456|4309|2/0|
|evidence|sl-attempts|61976074|ba2d7ecc32349db92b679c9e389ec992d94928bb739858e5232d11b1a63319e6|37|0/0|
|evidence|run-config|3445978|9badf1e15b61f7b5de102903d9172b87841e9bd1889ca9497b67a285b4792353|20|0/0|
|evidence|run-plans|14386062|58cd13286bcdf1d8d92261bc73785ac93f3d19ffb33b161b18176893bfd9eae2|519|0/0|
|evidence|brain|1609866781|80047411cd8e55939e2038cfed167341b1763684c2f14851c46ccd78199bc637|220|2/0|
|evidence|v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|0|0/0|
|evidence|jev-prompts|3317411550|5f1866a74ded149e7ba9d1dac6368f4c598368f0927664c3a58dc57171e992c3|1179|1/0|

各选中行自身仍保存source_size/line/offset/bytes/SHA。全流历史states有3746条未知身份；decisions有1934条unknown_identity、1809条unmatched_decision_id，不分给本批。历史坏行同样不算本批缺失或零值。本次冻结均无尾截断；summary与两次提取的不同源增长切点分别保留。对象存储回执的pending_host_seal/deferred_errno=18保留为宿主封存待办，未当作宿主已完成封存。

V6：20条run-config均mode=on/reflex=off/direction_replan=off/delivered=false；v6-build源存在但本批十局均no_match。entries、jev_answer、fallback、unknown的实际次数/意义无法核定，不把无匹配填成0，更不称V6正式发布或采用。run-config源码commit均未知/ENOBUFS，不能拿当前live替代当局SHA。十份游戏大脑native回执与本学习会话档位是不同对象，不冒称已核本会话原生档位。

Jev：1,179行含1,155条answers和24条error，error均human-pace budget exhausted: Jev；与v6-build的jev_answer/fallback分开。每题精确decision_id关联chosen/result/gate_reject/selection_dispatch及同局状态窗，缺字段保留null，完整逐题清单见question-coverage.json。状态自动关联只是显式同局的时间括窗，不是原子动作证明；三个精选窗口另核fingerprint、可见牌/药/能力变化。

|局号|Jev行|answers|error|完整原请求人工核读|其余机器字段/关联|
|---|---:|---:|---:|---|---:|
|QVDR4R3UWKXU|20|17|3|d07a54ab-01d4-4a24-9bf3-bb5bb4313fd4|19|
|5ZT1SKS66C1N|82|81|1|无|82|
|BKK8KAR3E83C|187|183|4|无|187|
|Q7SFDZSJLULD|160|159|1|无|160|
|EQLB6SK9W9H7|134|133|1|无|134|
|BP9C8K9NSRZ0|216|203|13|无|216|
|TB5YKELW0355|194|194|0|d6331e4c-37c6-461b-abe4-1c457f678c25|193|
|GJ81EPE4B8Z2|132|131|1|无|132|
|37U27AS6JNJ0|30|30|0|03d9b0bb-35af-4ed8-92c6-c8be6b37584c|29|
|XC9AHZH3CZVK|24|24|0|无|24|

三个完整原请求均含全部候选、外部开卷附件和限制；不是最后五题抽样。其余1176题已完整机械解析/原SHA复验，模型未全文精读，逐题未读原因已保存；不据这些未精读题推出新动作规则。外部附件仅为当时题面的原文，来源URL/版本/SHA/许可保持原行，不拿它的陈述或附带历史统计充本批实盘证据。未读取新的外部原库，也未验收完整人类赢家对照。

## 十局主线（首试、重载与赢战消耗分列）

所有变牌快照、完整已记录幕末牌组/HP/药槽、每场进退状态以及构筑选择原chosen/result，均在whole-run-audit.json；摘要表不能代替该原帧指纹。仅以终局组牌回填早期的做法没有采用。未到幕末/缺退出帧一律null，净HP变化不当敌人毛伤。

|局号|实际过渡/首次核心观察|幕末/Boss与关键赢战|最终后果|
|---|---|---|---|
|QVDR4R3UWKXU|施毒起步，F5/F9补毒雾；无触媒/步法防御签名|未到Boss；F4赢50→42，F9赢35→23，F11休至46|F12异鸟首试T4死亡，敌余10|
|5ZT1SKS66C1N|带毒刺击、投掷匕首与冲刺过渡，F15才见毒雾；未见完整P签名|F11赢58→9、F15赢44→20；F17两试50HP入场|末T10死亡，神官67HP|
|BKK8KAR3E83C|F4步法/F5蛇咬/F6触媒，三牌持有签名F6；后续双步法/蜃景不倒填早期|F17首试胜77→9；F19赢63→30、F24赢29→13；一幕末9/77及原牌组已记录|F33前三试判死重载，末T14死亡，知识恶魔152HP|
|Q7SFDZSJLULD|带毒刺击/迷雾过渡，F15蜃景，未见触媒|F6赢47→11、F8赢32→12；F17四试41HP入场，未过一幕|末T10死于巨兽本体，非自爆后场|
|EQLB6SK9W9H7|F2毒药/F3触媒，F6毒雾；F30后才见蜃景的旧P签名|F17首试胜64→30，一幕末30/70；二幕F27赢70→50、F28赢50→36、F30赢36→12|F33四试33HP入场；末T4死亡，双体118/164HP|
|BP9C8K9NSRZ0|即时攻击过渡，F12致命毒药，F28触媒/F31毒雾，F34撕咬混合；持续防御完整签名未见|F17首试胜，幕末29/70；F24前三判死、第四赢2HP；F33首试胜，幕末15/70；F46赢65→4、F47休至28|F48前三判死、末T6死亡，阶段敌150HP；F49未到|
|TB5YKELW0355|F9步法/F11毒雾，F14得触媒后完整持牌签名；能力建立与稳定循环另账|F17首试胜61→26，幕末26/70；F28赢51→17、F30赢38→18，F32休15→36|F33前三判死重载、末T7死亡，双体各80HP|
|GJ81EPE4B8Z2|F2致命毒药/F6迷雾/F8蛇咬，未见触媒与持续防御签名|F9精英赢55→23、F11赢30→10、F13赢33→14、F15赢23→12；F16休至35|F17四试，末T6死亡；神官98、两信徒9/15HP|
|37U27AS6JNJ0|F5蛇咬/F6迷雾，F8触媒；空栏腰带条件防守，未见步法签名|F7赢51→24，F8购物后仍24HP；未到营火或Boss|F9首试T3药后仍12挡，17HP对30攻死亡；两敌17/27HP|
|XC9AHZH3CZVK|蛇咬、F2刀舞、F3单步法的未定混合；完整刀/毒防核心未见|F4赢56→44、F5赢44→35、F6赢35→3；改路线后下一战仍不可绕过，未到火|F7首试T5死亡，潮湿邪教徒34HP；未到Boss|

BKK与TB在F32原计划已经主动写明启动/持续防御缺口，见existing-plans-counterevidence.json。没有证据说大脑当时把持牌误当稳定成型；新候选只是可查询表达，新增信息与实际帮助未知。过去经验里的64、281等旧分母仍是旧冻结研究，不能加成本批支持数或声称本批重验。

## 候选、既有ID与实际处置

唯一新增是brain-strategy-candidates.json#/entries/0，严格现有StrategyEntry；限定A10证据，第一/二幕、三张原ID持牌的构筑/备战场景。置信度0.35，observational，两个独立局；BKK/TB过首Boss反对“签名必败”，最终失败不能证组件或休息选择致败。完整字段、反证、来源与后继见proposal.md/candidate-source-refs.json。

experience-strategy-rk-map.json核11个原经验ID：new=1、update=0、reuse=6、waiting=4、not_applicable=1。这些是映射组数，只有一个新增策略候选，rk新条目0。原经验均保留，旧244不回刷。复用的路线/休息/同族/双蟹/恶魔/实验体入口不新建重复条目，不提升其外部分母或可信度。

不完整/晚到毒组件、XC未定混合、巨兽剧本与腰带rk保留具体缺数据。弃牌是CARD_SELECTION，不能伪装成#28 combat_line；腰带案例还属于普通蛞蝓，不冒本批Boss/精英回放机会。无原始Plan capture、同候选同种子的完整结果矩阵、预注册留出与真实回放改善区间，不开模型/MC/对局或开关。所有等待细节在映射逐项保存。

已有proposal-discard.md和proposal-conditional-poison.md已读，均属原postmortem链，当前batch未领取这些queue ID；没有冒充本批implemented/duplicate。弃后继后确实重算；毒药当步施毒和空栏敏捷不追补旧挡已是原机制，未实打的保牌/提前喝药整战收益仍未知。未新增出牌/药水/SL/终局价值或结构规则，code_proposals=[]、implementation_domains=[]。

本批缺绑定且实读的“外部统计+同流派外部完整代表+可比自有整局”三输入，只交自有局部候选；不称完整流派剧本、真人偏离已验或科学父完成。没有矛盾规则强行合并，没有新异议覆盖历史通知。

## 固定读回、账本与交接

- 根目录ledger CLI add实际返回silent-0618，show读回silent/A10/proposed/learner:strategy-proposal；check为618 item(s), 0 problem(s)。保存ledger-candidate.json、ledger-add.receipt.txt、ledger-readback.json、ledger-check.log；仅追加proposed，无shipped。
- 生产parseStrategyLibrary、retrieveStrategies、applyStrategyEntries在scratch候选上通过：两个冻结实盘持牌快照正例命中且2445字节封套可装入，三个缺组件负例不命中。candidate-validation.json完整记录5个固定输入及原帧SHA。正例是实盘牌组的离线适配，不是原生大脑请求或正式库live读回；负例终态仅用于合同检查，不当可行动题。
- 无源码/正式知识变更，无代码提交，无撤源码失败/恢复测试，tsc/vitest/cases均null；固定候选合同检查不改记为全套测试成功。无merge、发布号、自然查询/采用或收益声明。铁甲及其他角色未改。
- 候选格式/固定检索成立，与内容效果、正式发布、消费者固定读回、自然查询/采用、收益依次分账。原计划已理解缺口，新候选能否新增信息尚未证明，因此本批保留现行live行为。
- 运维入口：本目录proposal.md、report.md、experience-strategy-rk-map.json及两个evidence-manifest.json；后续沿既有去重/知识发布与消费者门处理，未发布候选撤下即可，无live回滚动作。原队列、科学父和#28均保持。
- 不推送、不运行play，不改ops prompt、不代其他角色确认。本树保持干净，过程证据交原宿主封存与retention，不自行删树。

最终对象如下；与result.json及最终回复相同。

```json
{"task":"strategy-proposal","character":"silent","batch":"20261024-164315-strategy-proposal","base":"b6933c7e621aaf75b0c31a912f3178d7607ea82b","runs":["QVDR4R3UWKXU","5ZT1SKS66C1N","BKK8KAR3E83C","Q7SFDZSJLULD","EQLB6SK9W9H7","BP9C8K9NSRZ0","TB5YKELW0355","GJ81EPE4B8Z2","37U27AS6JNJ0","XC9AHZH3CZVK"],"fixes":[],"skipped":["源码及正式知识未改：新候选未证明能增加原计划信息或改善选择。","完整流派剧本等待本批外部统计、代表完整局及可比自有整局三输入。","rk缺原Plan capture、配对完整结果及留出回放；不启开关。"],"merged":null,"tests":{"tsc":null,"vitest":null,"cases":null},"code_proposals":[],"implementation_domains":[],"proposal_results":[],"ledger_ids":["silent-0618"],"candidate_counts":{"new":1,"update":0,"reuse":6,"waiting":4,"not_applicable":1,"rk_new":0},"mapping":"/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-164315/learner/runs/20261024-164320-66fb402e-038d-49c0-9de2-a071b7b659cc-strategy-proposal/experience-strategy-rk-map.json","report":"/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-164315/learner/runs/20261024-164320-66fb402e-038d-49c0-9de2-a071b7b659cc-strategy-proposal/report.md"}
```

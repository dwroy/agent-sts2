# 静默猎手指定提案逐项核验

记录时间：2026-10-12T22:54:21+08:00（写入前已date）。batch=20261012-224301-s2-strategy-proposal；base=f3c56c8b424a5b11cf37e4da2902458f223cf475。

本批只处理派发的10个原id，全部waiting。无源码/知识变更，无新提交、合入、eval版本或shipped。已有实现仅作为相应子项的现状，不将子项完成冒充完整提案完成。

## 身份、方法与限制

开工git status干净；learn.json该行task=strategy-proposal、character=silent、reason=proposal、worktree精确一致，无research_request/implementation_request/proposal_repair。普通专题文件绑定另一批，不承接其work_spec；普通merge main为Already up to date，HEAD保持完整base。已读取README、最新STATE、decision-log末尾、学习协议及代码提案文档。没有领取别的提案、改根请求或重写历史复盘。

十份原Markdown逐SHA与队列一致，保存为各id.original.md；关联账本通过官方fold选择本角色原id，记录在ledger-snapshot.json。16条相关runs身份唯一且均SILENT，A0/A1/A7/A9/A10分开；本批10个派发锚点保持原样，另六局仅来自这些提案明确的证据/支持引用。只使用本角色日志及knowledge/characters/silent，不用预训练游戏事实。

复用旧分析脚本时保留源路径与SHA（analysis-provenance.json），本次执行重新从logs原偏移回读并验证SHA，不直接沿用旧结论。28项重点数值、108项候选/容量/开场断言通过；这些是数据核验，不是生产回归。容量9局42饮，油灯3局17窗口，六局资源消费者先按状态运行，再传入29条真实SL时间重新运行。去重7208原记录、125839078字节（3406状态/3773决策/29SL）；原偏移、长度与SHA见raw-evidence-union.json。raw身份复核不代表逐轮因果分析。

现有resource_chain保留restart_observed和unclassified，缺帧、伤害来源与完整候选执行保持未知。传入SL时间能够分开重启边界，但不是全量资源归因或反事实通关认证。原dirty运行树不可还原；当时预测据原题面，当前源码仅用于现状核查。没有全历史重新拟合；同局SL不拆独立样本，未把固定回放称为后移实战验证。

## 当前源码子项

核验live=c6ac75226dc8222a980bcf2f7db8ce39db338eee。source-ancestry.json的13个来源提交全是本base和该live祖先；13个相关文件都等于base，7个与live逐字相同，其余6个仅已有注释Roy/Dai署名不同（完整差异及逐路径规范化证明留存）。本批未运行代码测试，不借历史测试宣称本次通过。

- 狡诈确定生成/手位：6403fdcdadc803a092beb5165a068e22bf51c412。
- 普通紧勒：5c7105ff0294466da8319f2934beda05c6040794；千足虫重接清旧毒/力：0970bc0d112718d45c8ebf86ff7f84e0f36a7498。
- 限定王室猛毒新战开场：e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a。
- 七手精确切击：75a27fb2c230dc552761b2ad9da4be8a9a35dec3；限定蟹虚弱/朝向取整：ec29ea34b919344b707e57ba472ea210f9c39d62。
- 既有候选/派发/离线端点审计的来源见source-ancestry.json；candidate_comparison.actual_turn_result仍null，不能把候选数字写成实得收益。

这些是已部署子项的源码来源，不是本批implemented/duplicate的完整父id，也不是本批新增发布。其他角色及未观察进阶行为保持原状。

## 共同验证计划与回退

有证据的数值先按固定实帧验证；涉及阈值/权重时，按独立局和时间前后分训练与留出，保留反例。没有完整受控后继不写“换线就能赢”。后续实际实现须单项源码提交、撤源码红/恢复绿、原沙箱检查及live流程；实际上线再按授权双通知。当前无新实现，无撤源码对象，无需回退live或增加版本。所有原失败/初稿/本批读取错误留存。

## silent-proposal-08eaa60bcc449852 — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md；原SHA256：4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0019, silent-0020。

证据：KEN58SH9SLZ6 A10 F3T2/F4T1/F5T2/F11T1–2/F15T1。F5 states280255→280285：53→16；F15 states280347→280381：46→46、药栏2→0。F12/F16 states280336/280337/280382/280383：26→53、46→75。

旧行为、当前实现与反例：赢战仍消耗HP或药水；F15零损不能证明不喝也零损。当前resource_chain能分列实际资源变化，存档恢复不当新获药或路线回血。本次传入6条该局SL事件，5个重启边界仍独立。

未实现原因：缺同入口不饮药或留药到boss的完整后继对照；F15已饮两药零损不能校准持药价。

预期行为与验证：保留原持药价。未来验证饮用/丢弃/奖励/恢复分源、首胜出口及boss入口，使用独立局与时间留出，不据未走路线宣称可赢。

## silent-proposal-92920295a648b540 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md；原SHA256：f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf。来源任务：postmortem；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0228, silent-0255。

证据：TXZ6RVMQA09D A10 F48第二/三试T6，states281479→281484、281535→281539：实损3/0，敌净扣36/27；F48首胜至F49 states281563–281566为4/4/4/0。

旧行为、当前实现与反例：原连战目标已经存在；限定开场扣血由e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a实现。替线少损3也少扣9，后续抽牌/生成牌变化；首场胜利不是连续通关，模拟低可信0%不能直接作SL许可。

未实现原因：缺同抽序及后续动作受控的连续通关对照；少损3同时少伤9不能校准SL或终局权重。

预期行为与验证：保留连续boss目标和严格SL条件。后续同时验证首胜HP/药栏/复活、后场开场效果与可操作帧、两场最终结果；同局三试不作独立样本。

## silent-proposal-a327449c331efbc1 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md；原SHA256：e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925。来源任务：postmortem；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0079, silent-0018。

证据：WQZVENQ7DTRP A10 F33第二/三试T9同指纹，states282075→282079为损13/扣24，282144→282148为损22/扣39。T7原282066→282072损0/扣24；末282330→282336损4/扣24，动作后沙坑282071/282335为4/5。

旧行为、当前实现与反例：现有silentSlComparison/resource_comparison已分列HP、伤害、沙坑和未知抽牌，并把actual_turn_result留null。T7支付4血换一沙坑轮构成一律保血的反例；T9多付9血换15伤未证明全程改善。

未实现原因：缺完整受控后继与独立后移胜负样本；9血换15伤不能拟固定阈值，4血延长沙坑反例不支持一律保血。

预期行为与验证：保留探索门槛、原答和替换并列事实。未来用完整已执行后继核血量/沙坑两条边界、实际击杀推进和胜负，不把模拟全死当相同安全。

## silent-proposal-a099e89437e942bb — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md；原SHA256：e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0030, silent-0257, silent-0258。

证据：02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0、SADL3CGYTGSR、WQZVENQ7DTRP：42饮逐项局号/进阶/层/回合见capacity-history-observations.json。重点WQ A10 F33第五/六试T11，八手添2/0/0、五手添3/2/0。

旧行为、当前实现与反例：重新核原日志：37次添3、两次添2、三次添0；新增升级小刀基础6，耗瓶与HP/能量分账。容量与同轮出刀穿插已有live祖先6403fdcdadc803a092beb5165a068e22bf51c412；本提案还含计划妥当及跨轮完整策略。满手续喝仍耗药、无新增卡是限制证据。

未实现原因：同轮生成/容量已有实现；仍缺计划妥当跨轮保留选择、饮药复合触发和完整后继验证，不能据此关闭完整提案。

预期行为与验证：保留容量模型及未知组合路径。后续核保留选择→饮药→出刀→再饮→实际后继/恢复，不能宣称多四刀可救这局，不新增统一留药阈值。

## silent-proposal-47910f82a1fdd98f — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md；原SHA256：d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255。

证据：TXZ6RVMQA09D A10 F43/45/46/48/49的出牌前HP为70→66、52→48、62→58、60→56、4→0；opening-observations.json逐帧核cards_played_this_turn=0。WQ F33 T7/T9的双向血价见上。

旧行为、当前实现与反例：e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a仅对已见静默A10遗物伙伴与手动药水组合建模新战扣4，实盘T1和SL恢复不重扣。未知回复/自动复活组合保持未建模，旧净2组合不能拆出内部顺序。

未实现原因：限定开场子项已实现；仍缺未知回复/复活组合中间相位，以及SL血价和留药的完整后继，不能把局部资源事实等同完整策略。

预期行为与验证：保留开场边界、连战目标与现有药价。后续补实际触发顺序及消耗资源，验证能否进入可操作帧；未来毒雾/能力或空奖励不能补当前生命。

## silent-proposal-f1374df72d8e6a25 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md；原SHA256：df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0。来源任务：postmortem；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0019, silent-0020, silent-0050, silent-0253。

证据：Q6M2Y34MWKRE A10 F2T1/T3、F7/F8T1–8/F9T2：states282869/282870/282872/282912/282913/282921为36/57/57/2/2/0。1913SE84AXQF A10 F24锻造、F28休息、F29胜后与F31入口，states282706/282709/282720/282721/282723/282750/282755为40/40/40/61/61/46/46。

旧行为、当前实现与反例：Q6早饮敏捷双挡只是未完整执行的候选，不能当已赚12HP；F5/F6零损留药与F8最终已饮速度药构成不能一律早喝的约束。1913营火由预计回血改为锻造，不是同条件路线误差。当前离线消费者只输出实际端点和未分类结果。

未实现原因：缺同入口早饮/留药及相同营火条件的完整后继；当前观测不足调整高血护栏、持药价或终局权重。

预期行为与验证：保留原值；区分临时/持续药效、未执行候选与实得HP，先隔离机制误差，再按独立局时间切分验证完整资源链。

## silent-proposal-38a49e6c97f31eea — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md；原SHA256：6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262。

证据：Q6M2Y34MWKRE A10 F8T4 states282887–282892敌HP103/95/85/85/83/80；Y6GM2CHWJBEY A0 F4T1终态210437；1913SE84AXQF A10 F31T2–4弃磨蚀、反伤与中段重接。

旧行为、当前实现与反例：普通紧勒已有5c7105ff0294466da8319f2934beda05c6040794，重接清旧毒/力已有0970bc0d112718d45c8ebf86ff7f84e0f36a7498，均为live祖先。净伤被复活抵销，不等实际总伤；末帧死亡不揭示致死轮每击与反杀的内部顺序。

未实现原因：机制包仍缺致死轮逐击中间相位、复活/反伤和阈值/SL组合验证；普通紧勒与重接子项不能代表整包完成。

预期行为与验证：保留已证局部模型，后续补逐击、复活及消耗事件。固定回放须覆盖有挡/重放/升级等实际新增证据；本批不推通用触发或从全败定目标顺序。

## silent-proposal-ef0e38a5dbd3bc07 — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md；原SHA256：d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0019, silent-0020, silent-0021。

证据：Q6M2Y34MWKRE A10 F7实际回21、F8赢后2血、F9T2死；1913SE84AXQF A10 F24锻造不回血、F28回21、F29胜后46、F31入口46。具体states同行号见f137条及evidence-checks.json。

旧行为、当前实现与反例：resource_chain当前消费六局实帧与29条真实SL事件，restart_observed/未分类保持；不能把尚未抵达营火、计划取得能力或战后才可能结算的毒当已到手资源。两局没有整条替代路线实打。

未实现原因：缺同入口换线、休息/锻造及用药的完整后继对照；两条败局资源链不足校准统一路线或终局门槛。

预期行为与验证：按实际动作区分回复来源与条件变化。保留现路线/休息/终局规则；未来用相同前提及独立后移局评估连续资源与最终结局。

## silent-proposal-7f820c02d39bfaea — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md；原SHA256：bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105。来源任务：postmortem；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0079。

证据：NHA2KW0RB7VP A10 F33第1/5/6试T1，states283391→283397、283478→283483、283502→283507：损1/7/7，跨轮敌净扣8/24/24，末挡14/8/8；decisions277248/277250/277272/277274。

旧行为、当前实现与反例：两种整轮都没击杀，精确切击先被弃后重规划，抱抱先生次轮自动伤单列。现有候选比较/首次派发/端点审计不认证整套候选全部执行，已核a8b1f8be、bade647f和04921bd7实际live祖先。更多净伤和全死样本不证明更安全。

未实现原因：缺同抽序受控完整后继、可追溯击杀/存活推进及独立胜负样本；多付6血、多16净伤不足确定SL筛选门槛。

预期行为与验证：保留现探索门槛；同时保留原答/覆盖/实际执行，未来以完整后继核即时存活与击杀推进，不将第六次重放当独立成功样本。

## silent-proposal-04b6b430759815ed — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md；原SHA256：188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58。来源任务：experience-update；实现任务：strategy-proposal，本批20261012-224301-s2-strategy-proposal。

账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265。

证据：NHA2KW0RB7VP A10 F17T1七/六/五手精确切击与首毒5→10；F33T1六试普通X1萎靡实−2力/2弱，F33T2六次爪正面1→后方2。K3676LU8B0UH A1 F30T2带毒刺击4→8；SADL3CGYTGSR A7 F45T1毒5→10。lamp-observations.json已从原日志复核3局17窗口，每项均有层/回合和前后powers。

旧行为、当前实现与反例：七手精确切击已有75a27fb2c230dc552761b2ad9da4be8a9a35dec3；蟹取整已有ec29ea34b919344b707e57ba472ea210f9c39d62，均为本base/live祖先。此次更新旧waiting理由：限定取整已完成，不再说该公式待修。17窗口油灯stack前后全为null；这不等于未消费，也不能据持有遗物在每次重规划重复翻倍。能力建立不倒补已有格挡或保证活到下一轮。

未实现原因：精确切击与限定蟹取整子项已有live源码；油灯17窗口stack前后均null，缺跨重规划/SL恢复的首次消费状态验证及能力兑现组合证据，完整提案保持waiting。

预期行为与验证：保留已有子公式，不重复提交或发布。未来先验证首次可触发→已消费→重规划/恢复的可追溯状态，已观察牌/X/目标/制品逐项核；未见零X/升级/叠层和早建能力整战收益保持未知。


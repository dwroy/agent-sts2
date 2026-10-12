# 静默猎手本批十项策略提案核验

记录时间：2026-10-13T02:47:56+08:00（写入前已运行date）。
批次：20261013-023513-s2-strategy-proposal。
基线：301ec89a8dc0cb2902e09918b5fe1ba62865c89a；main合并结果Already up to date。

这是普通领取提案批次，reason=proposal，十个proposal_ids与本工作树精确匹配；没有research_request、implementation_request或proposal_repair。根目录普通专题绑定20261010-150327，与本批失配，因此按原领取范围执行，不转成专题。开工工作树干净，未派下级agent、未修改请求或调度状态。

结论：十项完整提案均保留waiting。确定机制中已经实现的子项使用真实live祖先证明；其余数据不足部分保留现行策略。不是以“必须有胜局”阻止确定算术修复：已证算术逐项核过，缺口是其余机制的时序/状态或价值和排序的完整后继。没有新源码、知识、提交、合入或版本。

本轮只分析十个派发锚点及原提案直接关联的五个静默证据局（1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH、SADL3CGYTGSR），runs.jsonl十五条唯一记录及所抽状态均核角色SILENT；A1/A7/A9/A10分开，不借别的角色规则或未观察进阶。全部SL按同局处理。最新经验只作为已有经验/出处链定位，不把未回查的新局当本轮策略证据；不将历史统计分母冒称本轮全历史复算。

## 证据及既有实现

原始只读日志抽取9815状态、9448决策、78 SL记录、15运行配置、77计划，共19433条，均保留物理行号、字节偏移、长度和原行SHA256。run-identities.json保存15个局报；extraction-summary.json保存各文件读取切点与逐局计数；reviews.selected.json保存对应复盘段落；ledger-before.json仅保存已领取提案关联条目历史。

evidence-audit.json保存药水动作前后及关键帧；lamp-audit.json对原三局17窗口逐帧回查；crab-facing-pairs.json保留六个真正相邻转向窗口，初次抽取跨尝试混入的窗口保存在initial原件并已排除，不能当额外证据。临时审计脚本只在本批scratch，不是生产改动。

已核实际live祖先源码提交：

| 子范围 | 真实live祖先源码提交 | 核验边界 |
|---|---|---|
| 狡诈生成/容量 | 6403fdcdadc803a092beb5165a068e22bf51c412；c09762601e54bfc1ef7a1a8ee50e3285a4fd1e5c | 普通同轮求解含穿插；已有固定测试含后轮生成刀，不代表计划妥当主动保留决策已证 |
| 王室猛毒连续开场、限定重接 | c09762601e54bfc1ef7a1a8ee50e3285a4fd1e5c | 现场silent A10已观察组合；未知回复/自动复活保留未建模 |
| 普通紧勒 | 5c7105ff0294466da8319f2934beda05c6040794 | 已证普通无挡和当轮逐牌分支，不外推升级/叠层 |
| 七手精确切击 | 75a27fb2c230dc552761b2ad9da4be8a9a35dec3 | NHA A10普通、零力无弱的1/3/5窗口 |
| 限定蟹虚弱/转向取整 | ec29ea34b919344b707e57ba472ea210f9c39d62；f2c7cc1a7288893bceae0f0b20304a2b1fae5f57 | −2力/弱1、同招、两侧活着的1/2端点 |
| 连续两boss目标及资源传递 | e1a467e18a0dfa8d99046a24ff4c0e1af59278c8 | 传递实际HP/药/复活；不据本轮单局调价值曲线 |

source-ancestry.json记录基线与冻结livef791ed9ea8f462723d371eda8c88fce2393c60f0及祖先返回值，十个源码文件各有原字节.txt副本和SHA。基线/live七个文件原有字节差异已保留，目标机制定位一致，未整树同步。原提案引用的15ea09ad75a421d4bd65a820c187c8ee188186c8、fc7042d1df0626e9e726f4bc912d9c6f626d908f不是冻结live祖先，因此不用它们登记duplicate/implemented；采用已实际集成的6403/c097源码。完整十个父提案仍有未完成范围，本轮不把任何一项登记为完整duplicate/implemented。

## 处置、记录与验证口径

每项细节在下文，同时保存proposal_results.json。现有代码提案id沿用原十项，不另建重复id、不改原文或队列状态。账本只经根目录learner/ledger.py update追加本批proposal/report链接与具体复核说明，不追加重复历史证据、不改claim、原status、version或shipped。没有新经验入库或消费者采用声明，父要求未因报告完成关闭。

没有生产源码修改，因此撤源码失败/恢复通过不适用；未运行tsc、vitest、沙箱套件或LLM/网络，tests三个字段均null。原有测试文件只读核实现有覆盖，不重用历史退出码充当本轮通过。资源/算术回查属于原日志审计，不能记为新游戏测试成功。没有live合入、发布编号或规则变更，双通知/上线记录不适用，铁甲及全部其他角色生产行为无变更。

预期：下一轮有新局时按下文具体缺口验证，仍保持每个id可重新派发；值的拟合使用较早独立局训练、较晚独立局验证，SL同组，不随机拆帧。未来代码变更独立提交并执行固定负对照、原沙箱测试、密钥扫描与live合入流程；回退只撤对应实现，保留此批原文、失败、审计及其他并行记录。

启动记录命令为gpt-6.1-sol/xhigh/default，本轮保留既有会话参数；该记录不冒称原生turn_context核验，实际native运行身份未从配置推断。提案研究与规则参数结论不使用模型预训练游戏知识。
## silent-proposal-08eaa60bcc449852：赢战耗药与下一战结转

处置：waiting。缺同入口未饮药、留药到boss的完整后继对照；KEN F15零损已耗两药，不能据此校准药水持有价。

证据（本轮回查）：KEN58SH9SLZ6 A10 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1共七饮；F5 53→16，F12 26/76→53/81，F16 46/81→75/86，F17六试空栏。药水、真实回复及SL恢复分列。

既有账本：silent-0019, silent-0020。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md。
原文SHA256：4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016，逐字副本为本目录 silent-proposal-08eaa60bcc449852.original.txt。

反例与限制：F15零损不等于不饮也零损；没有保药整战反事实。两次真实休息增加生命上限，不能套原70上限。

预期行为与验证：保留持药价；后续固定核候选的物理药栏、实际回复及完整后继，与本轮七个饮用前后帧对照。

## silent-proposal-92920295a648b540：SL首战改善与连续通关

处置：waiting。缺同抽序、后续动作受控的连续通关对照；TXZ F48 T6少损3同时少伤9，不能校准SL或终局权重。

证据（本轮回查）：TXZ6RVMQA09D A10 F48第2/3试T6：states 281479→281484为48→45、460→424，第3试281535→281539为48→48、460→433；F48 T10奖励剩4，281563—281566接F49开场4→0。

既有账本：silent-0228, silent-0255。
来源任务：postmortem；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md。
原文SHA256：f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf，逐字副本为本目录 silent-proposal-92920295a648b540.original.txt。

反例与限制：三试同局且后轮抽序/生成牌改变；首boss胜、第二boss败，不能用首场成功证明连战改善。第二房没有可操作后SL记录，不推断可读同4血档获救。

预期行为与验证：保持既有连续两战目标及严格判死；新样本核首战退出HP/药/复活、后战开场可操作性和完整连战结果。

## silent-proposal-a327449c331efbc1：沙坑与血价双向边界

处置：waiting。缺完整受控后继及独立后移验证；WQ同盘9血换15伤和4血换沙坑一轮均已兑现，不支持固定血价阈值或一律保血。

证据（本轮回查）：WQZVENQ7DTRP A10 F33第2/3试T9：282075→282079为26→13、184→160；282144→282148为26→4、184→145。第2试T7损0/扣24、沙坑末4；第6试282330—282336损4/扣24、沙坑末5。

既有账本：silent-0079, silent-0018。
来源任务：postmortem；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md。
原文SHA256：e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925，逐字副本为本目录 silent-proposal-a327449c331efbc1.original.txt。

反例与限制：两种T9均失败，不等于同安全；T7反向案例说明省血和延时不能压成单一门槛。末次攻击/沙坑内部先致死相位缺帧。

预期行为与验证：继续列当前损血、实伤、已结毒和沙坑，保留探索/必死规则；固定后继按局和时间隔离，不将六试当六局。

## silent-proposal-a099e89437e942bb：狡诈生成、手位与跨轮保留

处置：waiting。同轮生成、容量及穿插求解已有live实现；仍缺计划妥当跨轮主动保留选择、饮药复合触发及完整后继验证，不能关闭完整提案。

证据（本轮回查）：九局42饮：2—7手37次各添3；8手两次各添2；10手三次添0。WQZVENQ7DTRP F33第5试T11为2/0/0，第6试为3/2/0；本批十锚点中七个旧局提供生成支持，另SADL3CGYTGSR A7与WQ容量分支。

既有账本：silent-0030, silent-0257, silent-0258。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md。
原文SHA256：e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2，逐字副本为本目录 silent-proposal-a099e89437e942bb.original.txt。

反例与限制：容量不足只有WQ一局；实际满手仍耗药且HP/能量不变。现有固定测试已覆盖穿插及生成刀后轮转移，因此不把这两项误列为尚未实现；计划妥当的选择策略仍无完整对照。

预期行为与验证：不重复生成/容量补丁；后续冻结保留选择和过轮状态、饮药后触发次序、SL重接，才扩展已观察范围。

## silent-proposal-47910f82a1fdd98f：连续开场、SL及真实资源链

处置：waiting。限定王室猛毒开场子项已在live实现；缺未知回复/复活组合的中间相位，以及SL血价与留药的完整后继，完整策略仍waiting。

证据（本轮回查）：TXZ6RVMQA09D A10 F43/45/46/48/49分别70→66、52→48、62→58、60→56、4→0，均出牌前；无小血瓶。WQ T9多15伤付9血、T7付4血增沙坑1，同盘局部血价可核。

既有账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md。
原文SHA256：d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd，逐字副本为本目录 silent-proposal-47910f82a1fdd98f.original.txt。

反例与限制：旧王室猛毒+小血瓶净2只证明组合；本批不重新读取未派的旧局、不拆内部顺序。未知自动复活/回血不能从本例外推。

预期行为与验证：保留限定4血开场及下一战资源延续；不重复扣已处理现场T1或SL入口，不拟新留药/SL门槛。

## silent-proposal-f1374df72d8e6a25：药效期限、退出血量与价值

处置：waiting。缺同入口早饮/留药及相同营火条件的完整后继；当前局部药效与候选不足调整高血护栏、持药价或终局权重。

证据（本轮回查）：1913SE84AXQF A10 F24锻造不回血、F28 40→61、F29 61→46、F31 46血入战后败；Q6M2Y34MWKRE F2 56→44，F7 36→57，F8 57→2胜、F9 T2 2血10挡对12攻击耗尽。Q6 F8 T1速度药建5敏，T2层已撤。

既有账本：silent-0019, silent-0020, silent-0050, silent-0253。
来源任务：postmortem；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md。
原文SHA256：df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0，逐字副本为本目录 silent-proposal-f1374df72d8e6a25.original.txt。

反例与限制：Q6 F5/F6实际零损留药，不能推出一律早喝；1913原计划回血后来锻造，预测与实际条件不等。候选早饮线没有整战实打。

预期行为与验证：维持期限与现行价；验证临时/永久药效分源、实际营火动作、退出资源及同入口完整后继，再考虑新权重。

## silent-proposal-38a49e6c97f31eea：紧勒与多机制组合

处置：waiting。普通紧勒和限定重接已在live实现；宽机制包仍缺致死轮逐击相位、反伤/复活、阈值/SL组合验证，局部完成不代表整包完成。

证据（本轮回查）：Q6M2Y34MWKRE A10 F8 T4 states 282887—282891：敌103→95（紧勒8并建2）→85（一拳8+2）→83（生存者弃牌完成扣2），下轮80（3毒）。1913SE84AXQF F31 T4 20HP+6挡对32攻击，反伤杀前段而其余仍活，实际反伤受余血截断。

既有账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md。
原文SHA256：6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0，逐字副本为本目录 silent-proposal-38a49e6c97f31eea.original.txt。

反例与限制：紧勒无挡分支可验证，不外推升级/叠层/重放/特殊目标；当前源码限定这些分支。整战失败不是子公式反例，也不足拟击杀顺序或SL阈值。

预期行为与验证：不重复普通紧勒和重接；新证据必须覆盖逐击承伤→反伤→死亡→重接/能力阶段，否则未知分支保持。

## silent-proposal-ef0e38a5dbd3bc07：路线、营火与连续资源

处置：waiting。缺同入口换线、休息/锻造及用药的完整后继对照；两条实际败局资源链不足校准统一路线或终局门槛。

证据（本轮回查）：1913SE84AXQF A10 F24/F28/F29/F31：锻造、回21、赢损15至46、精英死，未达后火；Q6M2Y34MWKRE F3事件付8、F7回21至57、F8赢损55、F9两血入场死。关联silent-0019/0020/0021。

既有账本：silent-0019, silent-0020, silent-0021。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md。
原文SHA256：d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5，逐字副本为本目录 silent-proposal-ef0e38a5dbd3bc07.original.txt。

反例与限制：未来营火未到不能当当前HP；实际改动作的预测不视为同条件误差。没有另一整条实打路线，不写改线可赢。

预期行为与验证：保留已有实际资源传递；后续同条件路线反事实按独立局时间留出，不用败局相关性拟固定门槛。

## silent-proposal-7f820c02d39bfaea：饱和SL即时成本

处置：waiting。缺同抽序受控完整后继、击杀/存活推进及独立胜负样本；NHA多付6血、多16净伤不足确定SL筛选门槛。

证据（本轮回查）：NHA2KW0RB7VP A10 F33第2—4试T1可操作30血、敌408；14挡后29血、敌400。第5/6试states 283478→283483、283502→283507：8挡后23血、敌384；两侧均未杀，T4仍败。原/换线局部差为6血和16净扣。

既有账本：silent-0079。
来源任务：postmortem；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md。
原文SHA256：bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105，逐字副本为本目录 silent-proposal-7f820c02d39bfaea.original.txt。

反例与限制：第5/6试重放不是独立成功；首试28血转入时含小血瓶和自动开场伤，不能与稳定30血入口直接算成本；轮初自动扣4与牌伤分列。

预期行为与验证：保留饱和候选探索；有可追溯击杀/存活推进和完整后继后再验证新条件，不将全死样本当额外血价为零。

## silent-proposal-04b6b430759815ed：七手切击、蟹取整与油灯状态

处置：waiting。七手精确切击与限定蟹取整已有live源码；油灯17窗口的stack触发前后均null，缺跨重新规划/SL恢复的首次消费可识别状态及能力兑现组合，完整提案waiting。

证据（本轮回查）：NHA2KW0RB7VP A10 F17 T1 states 283142—283147：七/六/五手切击显示1/3/5，四攻262→231实31。F33 T2六次相邻稳定转向窗均爪1→2（如283398→283399），现场−2力/弱1。K3676LU8B0UH A1、SADL3CGYTGSR A7、NHA A10油灯17直接窗口逐项原帧匹配。

既有账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265。
来源任务：experience-update；实现任务：strategy-proposal；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md。
原文SHA256：188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58，逐字副本为本目录 silent-proposal-04b6b430759815ed.original.txt。

反例与限制：17窗口支持局部翻倍，不给生产快照提供“本战已消费”指示；敌已有毒也不能唯一还原触发历史。六蟹窗口同局，不外推其他力量/招式。能力持有或未来生效不当已兑现。

预期行为与验证：不重复切击/蟹补丁；须保存首次触发、后续同类不翻倍、重新规划及SL恢复的状态链并核消费者，不能将每次见遗物都翻倍。

# 静默猎手策略提案复核报告

十项均保留 waiting。已核若干 live 窄子实现；本批未建立需要新增策略的确定当前源码失配，也不足以拟合用药、SL 或资源新权重。无源码/知识修改、提交、live 合入或发布编号；原提案及学习父要求保持开放。

批次 `20261020-234301-s2-strategy-proposal`；角色 silent；完整 base `34a4d78b914a9a758b5757e30a3035aa18109314`。开工 git status 干净，普通流程 git merge --no-edit main 返回 Already up to date。dispatch.json 只保存 learn.json 对应行，task/character/worktree/十个 proposal_ids 与本任务匹配，reason=proposal，无 research_request、implementation_request、proposal_repair。本批不是专题；只读普通专题入口绑定的是旧 20261010-150327，不代入本任务、不扩大选题。

已读 README、最新 STATE-2026-10-19、decision-log 末尾、学习协议、代码提案闭环和必要的保留说明。STATE 的历史停点与较新 decision-log 分列，未据历史停点操作对局。未派下级 agent。没有可读的本批原生 turn_context/请求回执，不能独立宣称模型/普通档/high 已核生效；未改配置、账号或在途档位。

## 原文和身份

十份原提案逐一实读并核登记 SHA 相同，保存为本目录 `<提案id>.original.md`。七份失效 exp 路径的原文从基线 Git 中的定向小报告归档逐成员读取，仅保存需要的 Markdown；归档 SHA 为 52bf72417cd40a3d625a19c9200547866d96a909006a9cf824b74f34fed51688。未展开仓库/源码副本、未修改旧现场。original-proposal-sources.json 保留路径、blob、归档 member、bytes 和 SHA。仅将原报告及旧索引用作定位入口，以下原始行均重新从 logs seek 读回核 SHA/身份。

runs-identity.json 保存十条 runs 原文和 offset/bytes/SHA；identity-verification.json 确认均 character=SILENT（规范化 silent）且 ended 非空、无重复冲突。三局 A9、七局 A10；原始胜负不冒充纯 Codex 首试战绩。

| 局号 | 进阶 | 层 | 原始结果 | 结束 UTC | decisions | Jev 行 |
|---|---:|---:|---|---|---:|---:|
| RC61MFQM63Y6 | 10 | 33 | 败 | 2026-10-07T17:26:17.487Z | 674 | 147 |
| XTSV1U9JD34T | 10 | 49 | 败 | 2026-10-07T19:05:16.706Z | 775 | 219 |
| BTSRF7JL1W1Y | 10 | 31 | 败 | 2026-10-07T18:15:04.461Z | 635 | 139 |
| 9Z9H2EXKLF3T | 10 | 48 | 败 | 2026-10-07T19:59:55.152Z | 932 | 281 |
| HMVJKM56S4Q8 | 9 | 33 | 败 | 2026-10-05T19:20:10.364Z | 642 | 187 |
| F4QKG4J1AJJZ | 9 | 38 | 败 | 2026-10-05T20:04:35.380Z | 703 | 167 |
| G403VCZ3BH1B | 9 | 48 | 胜 | 2026-10-05T20:51:26.103Z | 635 | 153 |
| 25226ZFLNR1J | 10 | 48 | 败 | 2026-10-05T21:59:18.953Z | 862 | 184 |
| JLN5SK17W4FQ | 10 | 33 | 败 | 2026-10-05T22:55:20.454Z | 790 | 147 |
| JMH5C51RLN4E | 10 | 49 | 败 | 2026-10-05T23:55:07.273Z | 853 | 322 |

## 冻结切点与覆盖

指定的根 evidence_summary、工作树 V6/Jev 提取及常规提取均已实际运行并完成；两个 manifest 均实读。各行保留 source_size、offset、bytes、SHA 和 identity；仅接受显式 run_id/state.run_id/fingerprint.run 或 decisions 核同的精确 decision_id，不以正文、时间邻近、question_id 相似性认所属局。

| 提取 | 流 | 冻结 source_size | 原前缀 SHA256 | 本批行数 | 原流无效/不完整行 |
|---|---|---:|---|---:|---|
| 常规 | states | 14770296666 | 61485669ae6f523bea3de82c2962429d420a44230cd0d375192d9e2f203e36b8 | 7800 | 2/0 |
| 常规 | decisions | 3009694178 | 36dcfe49ac67f26633c6a34e02b52b004475f72e27bef42b1df62b31f41e6d62 | 7501 | 2/0 |
| 常规 | sl-attempts | 50161407 | 544eb50b8622e66d8ddaeca278dc2cdcff273a4eaf63cf4e00899fd739892f0c | 77 | 0/0 |
| 常规 | run-config | 2258666 | 2f9d3e466927b87a47fb24c65684ba64c03fa0e3bcdb7c9b6faec80f86127783 | 11 | 0/0 |
| 常规 | run-plans | 10142178 | 81761405730a4b1f5496dcea69932fdc129cc1bad5375e390605530d8e740614 | 70 | 0/0 |
| 常规 | brain | 1128142169 | aa99b30b46de4e9ff459197191d06d9cb09ccfe9977574bc467e8a62820eaf51 | 412 | 2/0 |
| 常规 | v6-build | 64650823 | 19c11de4af7001a56032839564e0c38a3efe71b1b66bdbd944af2c0e26d52a1d | 0 | 0/0 |
| 常规 | jev-prompts | 2205542104 | 3c7d2f13b3085a1c27b9e65946e0a13ec799db15c6adadd24e264a712f094598 | 1946 | 1/0 |
| 专项 | v6-build | 64650823 | 19c11de4af7001a56032839564e0c38a3efe71b1b66bdbd944af2c0e26d52a1d | 0 | 0/0 |
| 专项 | jev-prompts | 2205542104 | 3c7d2f13b3085a1c27b9e65946e0a13ec799db15c6adadd24e264a712f094598 | 1946 | 1/0 |
| 专项 | decisions | 3009694178 | 36dcfe49ac67f26633c6a34e02b52b004475f72e27bef42b1df62b31f41e6d62 | 7501 | 2/0 |
| 专项 | run-config | 2258666 | 2f9d3e466927b87a47fb24c65684ba64c03fa0e3bcdb7c9b6faec80f86127783 | 11 | 0/0 |

摘要的 last_five 只是入口，未用它代表完整覆盖。专项 V6-build 在 64650823 字节切点对十局均 no_match；不是原文件不存在。entries、jev_answer、fallback、unknown 分别没有可归属本批的原行，四者的采用/成功/收益均未知，不能各填零。11 条本批旧 run-config（JMH 含重启）无 V6 字段，历史 V6 on/off 未由这些配置证实；不从缺字段推断 off，也未借其他局 V6 行。

Jev 共 1946 行，其中有答案 1933 行，无答案且有 error 13 行（机械字段计数：12 次 503、1 次 529，均 JMH）；请求、答案、错误分列，重试不算独立决定。完整实读 7 条原 row 的完整 request/answers/error，涉及 6 个精确 decision_id；另 1939 行只机械索引，不对其题面提出新机制或因果结论。question-coverage.json 对全部 1946 行逐行保存 model_read_full_request 和未读理由，不限末五条。其余六局主要核资源端点，未逐题阅读它们的 Jev 问题，不补出牌建议。

| 原 Jev 行 | run/层/回合 | 精确 decision_id | offset / bytes / SHA256 |
|---|---|---|---|
| 19202 | JMH5C51RLN4E/F17/T5 | 141beff2-ad87-4ee8-93fb-47ee6d0095c5 | 288314082 / 5220 / 1cd123d0dbdc689939fe480a6cc2c6d6bcbc7fa045904cb49399dbafd5ae103e |
| 19203 | JMH5C51RLN4E/F17/T5 | 141beff2-ad87-4ee8-93fb-47ee6d0095c5 | 288319302 / 5474 / edfa59acc7eda2abddf19901f60511627b8c19328432b6bb62dbb219a9b4dda5 |
| 29260 | RC61MFQM63Y6/F23/T3 | 1518201d-a071-417f-988c-68b93913b4fe | 420662991 / 12352 / b2566d39a21c898d0a3010cafce1f7e56943158bad52487460173c86c998481f |
| 29480 | BTSRF7JL1W1Y/F31/T2 | 895ecd5e-3d2a-4915-8774-a7194aa3db51 | 424293672 / 18454 / 965eb7e37bc6523c0f5337d2477a4cb184ba38a6e9383960a96df4f82d689a07 |
| 29682 | XTSV1U9JD34T/F49/T1 | fd78839e-8f93-4b35-9382-69a5c1258501 | 426802142 / 10463 / aaf1eeb531068f7f7ed6f648db50550e90198573f140e7b8094c6c33d539d1aa |
| 29703 | XTSV1U9JD34T/F49/T4 | 5787f501-2c1d-4c21-88a9-6d7452297f43 | 427114353 / 7037 / ad7b7865881d17e73a63919a7691ca9afcf49e5ed19a57c0baa3a844c22d0a7c |
| 29984 | 9Z9H2EXKLF3T/F48/T10 | 96daa796-8173-4db1-b222-c81d696622cc | 431387840 / 15601 / ad6b3ddd52f8c0ad6a4934f6d74cb823012cdd540f0ba3090411147d0c21788a |

## 逐题采用、动作与后果

1. RC61 F23T3：29260 完整三候选题答 plan3（概率 .98）。decisions 278933 首打带毒刺击 completed，278934—278937 续防御/打击/小刀/结束；states 285225—285230 37HP 不变，敏捷 5→4→3→2→1，防御加9挡至21，零直伤小刀后折扇另加4至25，T4临时属性撤回。这支持已观察局部链；未全面核 F17/F29/F33 修饰组合，不新增公式或时点规则。
2. BTS F31T2：29480 完整四候选题答 plan1（.98），原题预支突然一拳杀丝虫且损4。decisions 279846—279850 实际仅镣铐/中和/防御/生存者/结束；states 286158—286163 生存者后唯一后继突然一拳离手，35→21、丝虫仍5HP、石虫下轮 STUNNED。首动作完成不等整线执行，也不证明旧整线收益。当前普通单弃已有窄修复，不重复实现。
3. XTS F49T1：29682 完整题的无药 plan1 预计损10；p1 明写 effect not simulated、药表未加载而成本记0，答 p1（.51、低置信）。decisions 280550 use_potion completed，280551 结束；states 286897→286898 增无实体1，286899 仍23HP并留10挡。原完整 state 的攻击显示变化与层建立保存在 state-windows.jsonl。药价0不代表已校准持有价；没有同条件晚喝的完整后继，不改用药时点。
4. XTS F49末T4：29703 完整复制选择题答 card2 防御（.62）。decisions 280636 夜魇仅 pending/unstable，280637 选牌 completed，280638 打防御 completed，280639 结束 completed。states 286984—286987：选择后 NIGHTMARE3，实打6挡、1HP，随后 GAME_OVER 0HP，无复制到手轮。queued、选牌成功或建立标记都不等复制收益；缺去掉夜魇能活的对照，不设禁用规则。
5. 9Z9 F48末试T10：29984 完整两候选均24样本全败，答 plan1（.85），原题50挡/损2。decisions 281568 只先打偏折，281569 已另走 least-loss 喝熔炉，281570—281573 继续出牌/结束；states 287999—288005 实挡18+9+10=37、18→3损15。T11原帧毒39、终局敌112→32而玩家死。保留历史题面失配，但首张后重规划、旧dirty树不完整、逐击毛伤事件缺失，尚不能由此判当前源码根因或整战替线收益。
6. JMH F17T5：19202/19203 完整弃牌请求相同，首次503无 answers，后次成功答 card0（.82）；同一 decision_id 关联 decisions 237943，select_deck_card0/completed/fallback=false；states 242907→242908 去掉打击、57HP不变。服务器错误不等最终选择失败，重试成功也不是两个独立决定。

以上旧 decisions 的 gate_reject、selection_dispatch 均未记录，decision-window-index.json 明确保存 recorded=false，不能补写成闸门通过或派发成功。chosen/result/fallback 的实际字段均来自原行；后果以同一 run 的 states 核对。所有关联出处和完整原题见 questions-reviewed.json、decision-windows.jsonl、state-windows.jsonl。

audit.py 从旧 locator 只取偏移后重新 seek 原日志核 SHA/身份：机械核119条 decisions、127帧 states、16对跨幕端点和11条配置；模型实读上述题目对应的决策/状态投影，不能把其余机械核行冒称全面机制审读。state-locator-source.json 保留旧定位索引的路径/SHA及14629500532字节旧截点，该旧截点不冒称本批常规全流切点。未向模型灌入整份 states。brain/run-plans/sl-attempts 完整提取留档，未逐行用于新策略结论。

十局16对同上限跨幕实际端点均符合原提案既有 floor(缺血×80%) 观察：A9五对、A10十一对；如9Z9 24/70→60/70、23/77→66/77。arrival-hp-changes.json 保留32条原始端点的 offset/bytes/SHA。只核本批端点，不冒充复算原115/116局资源统计，不能据此制定安全血线或改线/锻造策略。XTS胜后32→23再以23入F49已核，真实回复、SL恢复和未到营火不可混算；没有本批受控资源干预后继。

## 当前源码与十项处置

当前只读 live 冻结点 `75c4a1b9611b2566425e4aa14472c4d1c81673f2`。`66283dd9982bdd7f480da7a4d9bfefea0572a9ac` 实核是其祖先，承载幽灵单层、普通单弃与连战毒胜保血窄子项；三相关文件 card-model/combat-plan/turn-solver 在本树与此 live 提交逐字节 SHA 相同。live 原文单独保存为 `.txt`，没有可执行 `.ts` 副本。毒药窄补丁 `b2a30ea6ebadda351fcc345b65b0c0e870bc5d65` 仍非该 live 祖先。源码来源/祖先证明不代完整宽提案验收、本批发布、自然采用或收益。

当前代码保留角色/进阶/已有无实体层边界；普通单弃只有唯一可弃牌明确移除，多选未知留待实际选择；毒胜保血由 continuation 启用，不外推所有场景。本批未证明这些边界需要扩张。首次源码核验误用了不存在的 reflex/selection.ts 路径，已停止该次读取并改为三个实际文件重新核验；未据失败造成功结果，错误说明保存 source-live-audit.json。

| 提案 ID | 账本 | 本批结果/具体缺口 |
|---|---|---|
| silent-proposal-03754e1265894000 | silent-0006, silent-0011, silent-0013, silent-0080, silent-0088, silent-0101, silent-0232, silent-0253 | waiting：F23T3/T4逐牌敏捷、柔嫩及折扇局部实线已核；F17/F29/F33原修饰窗口及全部组合未完整核生产消费者，未建立新的当前源码失配。 |
| silent-proposal-ab055ef7dfbb44e5 | silent-0140, silent-0069, silent-0005, silent-0206 | waiting：幽灵单层已有live子实现，末T4夜魇标记建立后死亡；缺复制对象与延后饮药同条件完整后继，不拟合新时点或持有价。 |
| silent-proposal-0129c465c6f5bd79 | silent-0009, silent-0021, silent-0024, silent-0057, silent-0079, silent-0090, silent-0140, silent-0164, silent-0205, silent-0268, silent-0271 | waiting：普通单弃及连战毒胜保血已有live窄实现；B F31T2强制弃唯一后继牌后35→21，抽弃绑定、耳环接管中间动作和复制后继仍未完整核实。 |
| silent-proposal-abe9d5d0be109a9f | silent-0019, silent-0020 | waiting：X F48T8胜战32→23且F49实到23；缺原115局资源统计与路线/休息/SL/终局消费者的联合校准及受控资源干预后继。 |
| silent-proposal-f16527e59b5cc1e0 | silent-0005, silent-0006, silent-0011, silent-0013, silent-0016, silent-0027, silent-0046, silent-0069, silent-0095, silent-0128, silent-0196, silent-0241 | waiting：F31T2减力/覆甲、F49幽灵留挡局部窗口可核；全部临时期限、敌成长和多增益组合未做完整生产回放，未确立新增源码根因。 |
| silent-proposal-7a8e9ccb7e646538 | silent-0005, silent-0006, silent-0011, silent-0021, silent-0024, silent-0027, silent-0034, silent-0077, silent-0079, silent-0123, silent-0129, silent-0180, silent-0221 | waiting：9Z9 F48T10原题50挡/损2，实际37挡/损15且首张后重规划；缺逐击毛伤、原dirty输入及当前模型固定失配复现，不据旧预测差改策略。 |
| silent-proposal-cd9f76184de6e29a | silent-0019, silent-0020, silent-0243 | waiting：本批十局16对跨幕同上限端点符合既有缺血80%回复观察；缺原116局资源表的消费者联合校准与同条件路线收益对照。 |
| silent-proposal-292f6731bdb9b669 | silent-0087, silent-0020 | waiting：原支持局7X0W3U8TVA2A不在本批；本批未读取其原始药效窗口，b2a30ea6ebadda351fcc345b65b0c0e870bc5d65非已核live祖先，持有价/时点及扩展药效缺证。 |
| silent-proposal-0802f69b28d25079 | silent-0079, silent-0019, silent-0044, silent-0080, silent-0253, silent-0011, silent-0214, silent-0189, silent-0046, silent-0222, silent-0243, silent-0262 | waiting：原支持局MTQ0EUBJ3R6T不在本批；缺四次SL完整固定输入、独立A10留出与受控抽弃/饮药后继，不拟合全败探索血价权重。 |
| silent-proposal-763a4b9d9f17b815 | silent-0005, silent-0006, silent-0011, silent-0013, silent-0044, silent-0046, silent-0053, silent-0080, silent-0087, silent-0189, silent-0214, silent-0222, silent-0235, silent-0253 | waiting：原支持局7X0W3U8TVA2A与MTQ0EUBJ3R6T均不在本批；十四机制组件、昏眩合法窗口及生产联合回放未齐，不能以本批相似局部代验。 |

三项批外原支持局只读提案正文未读原对局日志，不将相似局或正文提及当支持：292f的7X0W3U8TVA2A、0802的MTQ0EUBJ3R6T、763a的这两局。cd9f原提案还列其他局，本批只覆盖派发十局，不借未派发原局补分母。全部层/回合、反例、拟议旧新行为、样本/切分、预期验证和回退仍保存在十份原提案及本批 proposal.md，不重复写历史复盘、不新建重复CLI ID。

## 限制与交付

本批旧运行均带 dirty，配置保留 commit/dirty_files，当前源码不能冒认历史完整执行源码。原题内含旧其他角色药水统计，因完整原题要求保留其字节；不将其当 Silent 事实/参数/验证分母，未读其他角色知识。SL重放不增加独立局数；局部机制有效、模型预测、整线可执行、整战胜利与自然收益分别核算。没有新异议结论或新规则变更，本批限制交原运维报告链，未代 watcher/Roy 确认。

各 manifest 保存 invalid_json、unknown_identity、unmatched_decision_id 的全流计数/有限定位；这些不是本批归属错误的已知数，不能分摊到本批，更不能以缺失当零。本批所有流的 incomplete_lines 见冻结表；截断统计按原回执保留，未补造缺行。

content 回执存在 pending_host_seal=true、deferred_errno=18（EXDEV）；本地证据文件及SHA已核可读，宿主封存待后续流程，未重写原回执或冒称封存成功。证据提取本身不证明正式发布、下一局消费或自然收益。

仅经根 learner/ledger.py update 对原46条关联账本追加本批复核 note 和 proposal/report 链接，CLI退出0；ledger-protected-verification.json 确认 claim/evidence/status/version/首证等保护字段全部不变。没有新增游戏经验或将本批标 shipped；原已发布状态保持原历史身份。code_proposals 只列十个既有CLI ID，implementation_domains=[] 表示本批无新行为实现。

无生产源码/knowledge改动，不运行tsc/vitest或撤源码红绿检查，结果均null，不伪报0；没有待提交源码，提交前gitleaks不适用。没有源码提交、合入提交、eval版本、上线记录或新规则双通知；没有运行play、在线模型、联网或修改运维prompt。最终HEAD/干净工作树及空diff见workspace-verification.json、workspace.diff.patch。无源码批次仅报告留档，waiting待对应缺口有本角色新证据或完整固定输入再派。

运维交付：本目录 proposal.md、report.md、result.json、proposal-results.json、original-proposal-sources.json、两个 evidence-manifest.json、question-coverage.json、questions-reviewed.json、原字节决策/状态窗口、跨幕端点、source-live-audit.json、账本保护核验和工作树回执。全部产物在本批scratch，无新增源码合入或成功测试声明。

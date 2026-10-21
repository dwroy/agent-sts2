# Silent 策略队列原证据复核报告

记录时间：2026-10-21T13:24:24+08:00（写前已 date）。task=strategy-proposal；character=silent；batch=20261021-131301-s2-strategy-proposal。base=`526d34e7b2fa2a02be03575bb52dde4d98a870e1`。

## 结论与交付

本批十项提案全部 waiting，没有新增策略代码、经验、提交、合入或版本。已经存在的容量、开场扣血和普通紧勒子实现有实际live祖先，但宽提案尚缺联合验收或完整反事实，不能全项登记 duplicate/implemented。逐项证据局号、层/回合、31个既有账本链接、限制与下一验证条件见同目录 proposal.md、assigned-proposals.json、linked-ledger-rows.json。

本批核实了局部血价与真实后继：TXZ第3试T6比第2试少损3同时少伤9，后续抽牌也变；首战赢后4血、第二战开场0。WQZ第3试T9比第2试多15伤也多损9血；付血延沙坑的反例保留。42次狡诈饮用的容量观测复现原提案，属于既有证据重核，不能当新增独立42局或证明整战策略收益。没有足够数据确定新SL/留药/终局阈值，保持原规则。

## 派发身份和现场

首先 git status --short 无输出；读 README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环。根learn.json对应本batch的task/character/worktree/runs匹配，reason=proposal，带十个proposal_ids，无research_request/implementation_request。专题请求notes/strategy-research-silent.json绑定旧20261010批次，与本批不匹配，故按普通队列处理；没有读取其他专题代替身份，没有领取第十一项。git merge --no-edit main 返回 Already up to date，HEAD保持原40位base。

本批未调整模型、账号、home、服务档位或权限；本任务要求high，但未读到本会话原生turn_context/请求回执，不能独立报告当前档位已核生效。日志中的旧对局大脑配置不作为本学习会话回执。

旧exp已不在原路径。先git ls-tree核原件，再按精确路径调用materialize；返回 retained / persistent runtime retained，并未恢复文件。随后仅用本基线git show读取已确认的精确Markdown blob到本scratch，六份均与原CLI proposal_sha256相同；未恢复exp工作树或扩大读取其他角色知识。四份仍在根learner/runs的原文亦核同，十份副本以各id.original.md保存。没有用当前摘要冒充原提案。

## 完局、角色与提证冻结

原runs.jsonl十条均character=SILENT且有ended，全部victory=false。SADL为A7、F4Q为A9，其余A10；没有把低阶样本混成A10参数。runs原始字节锚点由evidence-summary.json的outcomes.ref保存；首次逐条读原行，后续按ref回读校验。

| run_id | 进阶 | 结束层 | decisions | Jev原始行 |
|---|---:|---:|---:|---:|
| TXZ6RVMQA09D | 10 | 49 | 762 | 171 |
| WQZVENQ7DTRP | 10 | 33 | 766 | 328 |
| 02HB4L0C3C67 | 10 | 12 | 211 | 42 |
| 4D4J8USKCPAV | 10 | 17 | 527 | 167 |
| F4QKG4J1AJJZ | 9 | 38 | 703 | 167 |
| JLN5SK17W4FQ | 10 | 33 | 790 | 147 |
| LS8035TB32P3 | 10 | 42 | 816 | 182 |
| NB8KCF6HRGVF | 10 | 31 | 466 | 116 |
| S9UZAK0JP0C0 | 10 | 33 | 826 | 247 |
| SADL3CGYTGSR | 7 | 48 | 1115 | 271 |

已按任务原命令nice19运行摘要及两次extract_evidence：专门v6-evidence流为v6-build/jev-prompts/decisions/run-config；常规evidence保留states/decisions/sl-attempts/run-config/run-plans/brain/v6-build/jev-prompts。输出manifest已经实际读取。各入口冻结时点不同，不能把摘要截点或常规截点替换专门流截点；原stdout和两份manifest分开保存。

专门v6-evidence冻结源如下（完整SHA见其evidence-manifest.json）：

| 流 | source_size字节 | source_sha256 | 本批行数 |
|---|---:|---|---:|
| v6-build | 64678849 | f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da | 0，十局均no_match |
| jev-prompts | 2378156539 | 0b52ba4830a38e5a36f9f7aee50f835b1a49bab54ee1946acc925440f162ffc0 | 1838 |
| decisions | 3292112136 | dcc75bf3b763944f1ef27e6f260a3d632a09cc953d068d790e10be5ea7441861 | 6982 |
| run-config | 2403354 | 5ab13e0e876ea2c5b0b3a6ebc58dc6c6253453b7bc5cff04cdb0a1530c7b1d2d | 10 |

常规states截点15185627003字节，SHA256=90d8d72ae2057e072b6f2186bd90d7fee0a25949d429bb748f603edd6b9643ef，选中7277行；其余流切点、SHA、计数见evidence/evidence-manifest.json。脚本完整流式扫描，模型仅看相关窗口和结构化字段，没有整份states灌入上下文。

## V6/Jev身份、覆盖和缺失

仅认原始run_id/state.run_id/fingerprint.run等明确字段或decisions精确decision_id；1838条Jev均有精确decisions匹配并保留decision_ref。没有用正文提及、近似question_id或时间邻近来建立所属局。状态后继先核本局显式身份，饮药前帧还须同时匹配observed_ts与完整fingerprint；时间仅用于已核同局后的先后，不代身份。

v6-build文件存在且冻结前缀扫描660行，本批十局均no_match；故没有本批原始entries/jev_answer/fallback/unknown可解释，不把各项填零。十条旧run-config均没有v6字段，开关状态未知，不能报V6 off或仅凭无匹配断言历史缺流。此处没有V6正式发布、下一局消费者或自然收益证据。

Jev选中1838行，机械检查均有request和answers字段、均无error字段；这只是所选行的字段事实，不证明其他流无错误或回答全部正确。v6-build的jev_answer与Jev answers不是同一计数。本批相关流未找到可归属的V6 fallback/unknown；无法解释不存在的采用链。

完整人工读取两道原题的request全部state、全部questions/criteria、answers和error缺字段：

- TXZ F48第3试T6，jev-prompts原行28446，decision_id=15fc6d36-ed83-4cde-b5e6-cbe4dffe9f5e；完整原行副本question-28446.json。
- WQZ F33第3试T9，jev-prompts原行28663，decision_id=8c880109-456d-43b3-887f-04302c922d89；完整原行副本question-28663.json。

覆盖不是最后五条：question-coverage.jsonl逐一列明全部1838个问题的源offset/bytes/SHA、run身份、精确decision_ref、chosen/result/gate_reject/selection_dispatch的存在性和值、人工覆盖级别和未读原因。上述2条完整读回；28628和28764只部分原题/决定/状态读回，完整题面未全覆盖；其余1834条只机械建索引，未逐题人工读取，因为本批选择两道SL配对主问题及容量/首次施毒窗口，未扩成全局打法审计。其余八局主要核角色/完局及容量配对，不冒称完整复盘。全部题面与原答仍保留在提证输出中，完整提取不等于人工已读。

专门流原前缀存在Jev invalid_lines=1、decisions invalid_lines=2；无incomplete_lines。decisions全前缀还有unknown_identity=1934、unmatched_decision_id=1476，未归本角色/本批；gap refs仅最后五个，不当完整缺口清单。没有从不可解析或无身份原行推定它们不属本批，也不拿它们补知识。常规states invalid_lines=2、brain invalid_lines=2等保留原manifest。缺失和未知均不是零。

## 从原答到实际后果

TXZ原题选项有羽化unmodelled、未校准连战与低可信限制；Jev原答plan6，置信0.92。decisions原行275383记录SL覆盖为plan3“咕嘟冒泡、羽化”；275383/384/385的chosen依次打冒泡、羽化、end_turn，result均completed。没有gate_reject或selection_dispatch字段，记字段缺失，不当作二者成功/false。原答存在不等于原答被完整执行。

同局states第2试281479—281484：48→45血，敌460→424；第3试281535—281539：48→48血，敌460→433，核出少损3、少伤9。下一轮手牌已有差异，不能把后续首胜归因单次换线。281563/564首战结束4血，281565后战4血仅save_and_quit可用，281566变0血、敌仍111血、只continue_game_over；开场22意图未见执行，不能把4血死亡归为受22攻击。持有王室猛毒的已观察开场子模型来源与当前live另核，不将SL复原算回血。

WQZ第2/3试T9原指纹相同：26血、184敌血、4敏捷、同手/三药。原行275894的Jev plan2执行侧步、逃离、防御；275960同样原答plan2，却被SL换成飞镖、侧步、逃离。相应后继chosen/result保存selected-decisions.json；states282075—282079与282144—282148分别到13血/160敌血及4血/145敌血，即多付9血、多扣15。两题都含侧步未知及低可信全败模拟，不能把0%解释为等价安全。第6试T7的SL覆盖及states282330—282336作为相反边界：逃离后沙坑4→5，过敌轮再降4，26→22血、245→221敌血；不把出牌后5与下一轮4混为同一时点，也不一概禁止付血延时。未完整重读第2/3试T7全部题面，旧提案所列对照范围和这一限制分别保留。

容量：cunning-pairs.jsonl保存42个原decision+前后state，cunning-pair-index.json逐条列run/floor/turn/源行。前帧用精确observed_ts+fingerprint匹配，后帧限定已核同run；42/42已配对、未配对0。37次手位足添3，2次8手添2，3次10手添0；五个受限窗口都在WQZ F33 T11。126个三元组引用已重新seek原日志字节核SHA，见cunning-byte-verification.json。生成容量观测与已有子实现一致，但没有本批重新独立核完保留/跨弃牌/SL的全部联合状态机，不把已有子实现再报新修复。

油灯：SADL A7 F45 T1 decisions227928是毒药，result和前后原帧在lamp-decisions.json/selected-states.jsonl；states232562目标无毒、232563有10毒。这个原始窗口支持旧局部观察，不据单窗口外推跨换战/SL恢复或其他负面/零X/取整规则。相关原局NHA、K367不在本批，没有冒称重新核验。

94个选定原始行（两完整Jev题、10配置、相关decisions与states）另外seek原文件按offset/bytes/SHA核同，见raw-byte-verification.json。42次饮药的126引用另核。所有state原字节和identity保留，未仅凭有限摘要或复盘正文下结论。

## 现有实现、反证和验证边界

live只读核验HEAD=`5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532`。容量6403fdcdadc803a092beb5165a068e22bf51c412、普通紧勒5c7105ff0294466da8319f2934beda05c6040794均是其实际祖先；开场入口实际集成5b56a452bb9be14d620b368ec46974c1b57901ca及后续ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8亦为祖先。只读核当前相关源码，不以提交标题代验收。

初次核验脚本错误地断言候选fc7042d1是live祖先而中止；独立逐项核验表明fc7042d1与另一个容量来源15ea09ad并非live祖先。错误及更正保留validation-initial-failure.txt和live-ancestor-check.json，不把非祖先源码冒作部署回执。该失败是证据核验脚本断言，不是tsc/vitest测试结果。所有十份原提案SHA核同，proposal-byte-verification.json保存读回结果。

本次没有源码变更，所以不运行tsc/vitest、不做撤源码失败/恢复测试，三项均null；没有代码提交，不发生提交前扫描或live合入、eval发布、shipped、双上线通知。最终报告/提案/JSON另做gitleaks只读扫描，结果见artifact-gitleaks.log与artifact-gitleaks.json。完整检查及自然收益没有本批成功回执。无新增经验或提交，不重复写历史复盘，不新建提案/降级既有shipped账本；根专用队列状态留给宿主按proposal_results消费。

所有产物仅写本批scratch，生产源码、任务模板、知识、notes/paper、live均未改；没有play、网络、LLM/API调用、依赖安装、推送或下级agent。没有改变铁甲或其他角色。父学习要求、角色ACK、待新局事项均不关闭。

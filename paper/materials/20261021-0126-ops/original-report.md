# Silent策略提案消费报告

记录时间：2026-10-21T01:25:44+08:00。批次：20261021-011301-strategy-proposal。

本批十项均为waiting：未找到本批新可隔离且证据充分的策略修改；两项已存在的窄源码修复不关闭宽父。无源码/知识修改、无提交、无live合入、无发布编号、无shipped登记。base=0a84a8fe2d5763c8df8c280739bc9049390d7776，fixes=[]，merged=null。报告不是科学父要求完成、自然采用或收益证明。

## 身份、授权和初始材料

初始git status为空，HEAD为上述40位基线；必读README、最新STATE-2026-10-19、decision-log末尾、学习协议与代码提案协议已读。STATE旧停点与更新后的决定按时间保留，不把历史停局当本批运行状态。根learn.json本批task/character/worktree/runs匹配，reason=proposal，带精确十proposal_ids，无research_request/implementation_request/proposal_repair；根strategy-research-silent.json绑定20261010旧批，故不承接该专题、不读取其他专题代身份。本批按普通消费任务执行git merge --no-edit main，返回Already up to date，基线未变；没有扩大队列范围。

先核runs.jsonl，再运行指定evidence_summary.py和两次extract_evidence.py。五局唯一终局记录均character=SILENT、A10、ended非空、victory=false：NHA F33，P74 F23，G33 F48，RC F33，BTS F31。实际原始终局offset/bytes/SHA在evidence-summary.json的outcomes.ref。均为2026-10-07历史局，不构成本批独立时间留出。原run-config含dirty标记，不能用当前源码完整复原历史dirty树。

本模型独立完成，没有下级agent、网络、模型调用或play。宿主要求普通/high；本批未读取本会话原生turn_context，故不声称已独立验成当前请求档位。历史局brain元数据与当前学习者档位分开。

## 提证冻结、身份与缺口

完整manifest已实际读取：v6-evidence/evidence-manifest.json及evidence/evidence-manifest.json。每条提证保存source/source_size/line/offset/bytes/SHA/identity，逐字节seek读回核验选中原文，不以摘要代原文。原始选中状态保存在selected-states.evidence.jsonl、nha-sl-action-window.evidence.jsonl；模型只读所需结构化窗口，没有输出整份states或所有状态。state-window-facts.json按原power_id/enemy_id取字段，分析初稿误用id的中间输出已被修正，不以空id输出下游戏结论。

| 流 | 冻结字节 | 冻结前缀SHA256 | 本批条数（NHA/P74/G33/RC/BTS） |
|---|---:|---|---|
| states | 14807955792 | 15d82dfa611564cedf2bf8c8a50ef4f2168ed97c1b726a840d83b5a2060ebd47 | 602 / 410 / 879 / 694 / 653 |
| decisions | 3038096469 | 741ba4c11374ec0e84491f125ff0dacff74aa66d1a3d028e799ac8d781568aed | 584 / 395 / 850 / 674 / 635 |
| sl-attempts | 50351258 | d46caf29efef9ba9069f001cfbede33733e2389e78334f6c674cb9fc66636c9a | 7 / 5 / 8 / 7 / 4 |
| run-config | 2276751 | 7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb | 1 / 1 / 1 / 1 / 1 |
| run-plans | 10163432 | 87366a5d569c384690bc38c9e1c3ea51c328fbdba4d00028c185a71c10f2a6d5 | 5 / 3 / 6 / 7 / 5 |
| brain | 1135796336 | 4cd798ef9e71637b4b061d60500393ee36e31e8d63a659b9e4823de00faaaac0 | 34 / 23 / 45 / 33 / 28 |
| v6-build | 64655258 | 3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234 | 0 / 0 / 0 / 0 / 0 |
| jev-prompts | 2222895598 | dab4fc8cb2ef2255fd77b83c094f2472a31992ab49ab2aadaaf0d1602c88b3fb | 123 / 70 / 143 / 147 / 139 |

两套提证在重复流的冻结切点与前缀SHA一致。标准提证默认不含runs流，终局身份用摘要中的runs原行出处核对。run-plans接受顶层run；其余只用run_id/state.run_id/fingerprint.run并检查冲突。622条Jev均有显式run身份，并有同decision_id的decisions原行出处；未通过正文提及、时间邻近或question_id字符串相似建立所属局。全流扫描未接纳未知身份行：decisions有1934 unknown_identity、1413 unmatched_decision_id；states有3350 unknown_identity。这些是全冻结流缺口，不分配给本批或其他角色。全流坏JSON：states 2、decisions 2、brain 2、Jev 1；所有manifest incomplete_lines=0。最后五个gap_refs只是有限定位，不代表全部异常已逐条实读。

V6在本切点没有本批匹配行（no_match），而非缺流；五份旧run-config没有v6字段，不能冒称显式off已核。V6 entries/jev_answer/fallback/unknown均无可归属的本批原始记录，故不补0采用/0失败/0收益。历史Jev流则622条均有request/answers，机械字段计数error=0、显式截断标记=0；这只说明这些字段存在，不证明每题完整性、每题执行成功或获益。selected五题实读完整字段，没有截断输出；未读其余题不作完整性验收。

对象清单的pending_host_seal=true/deferred_errno=18原样保留；本批只证明本地提证和原日志读回SHA，不代宿主封存成功。

## 原始题面覆盖与动作后果

完整实读五题（每局一题），覆盖表question-coverage.json逐条列出622条中已读5/未完整读617，含精确decision_id、run、行号及原因。另预先定位十题、保存question-*.json及selected-questions.evidence.jsonl，其中五题仅定位保存，未冒称实读。选题依据为派发提案的弃牌/首牌顺序/SL换线/抽弃重算窗口，没有采用最后五条作为总体覆盖。其余617条保留原文，本轮未逐题审查，理由是仅核十项已有提案的代表性缺口，没有进行全局策略归纳或全问题验收；不能据此断言其他题无错。

| 局/层/回合 | 完整题对应decision行与id | 实核结论 |
|---|---|---|
| NHA F33 T1 第5试 | 277250 / 27c60f5d-5b5b-4072-9abf-3df07408517f | Jev答plan4斗篷，confidence .40；代码SL换为回响，chosen card_index=2、expect ECHOING_SLASH、result completed。states 283478–283483见30HP/8挡，回响后两敌各减10，下一轮23HP；首试283391–283397为14挡、损1、净扣8。全败24/24不能解释为即时等价。后续未控，不选新SL权重。 |
| G33 F48 T1 首试 | 277909 / 116fa48b-837a-4c22-9223-665a71e86aba | 完整题面同时有余像先/闪亮先（18/10挡、75/107伤）及能力药1样本/请求12降级。Jev答plan2、.68，chosen闪亮、completed。states 284162–284169实见先闪亮再余像仅1层；药后284172才2层。未执行余像先的实盘整战胜负未知。 |
| P74 F23 T3 第4试 | 278543 / bf5fbb89-6c47-4f32-bddc-cfbaf7a1a0ce | 题面明确“丢弃”，四合法选项俱在；Jev答card2精确、.52，chosen option_index2、completed。278542生存者回执pending(unstable)，不能当失败；states 284816–284820见已得16挡、弃后确无精确，代码278544已重算损7；284821实死，石眩晕但卵仍2HP并有8攻。未实打保留精确分支，不能称必胜。 |
| RC F33 T4 第3试 | 279117 / d099bee5-d92b-453c-8376-ce1a2aa3209c | Jev答plan1、.20，SL改plan3（刺击改爪）；毒雾第一动作completed。279118–279120后继completed；states285414只余生存者/打击、285415手空、7挡且激光仍57。279121 end_turn明确not dispatched，因SL预判重载；不是本次实吃57而死。 |
| BTS F31 T3 | 279854 / ec8ed7e5-50ab-45e1-a1c0-5eae18862c6d | 原279852抽弃动作pending，279853弃羽化completed；新题plan2/4并列、4样本3胜1死，Jev答plan2、.86。防御及两小刀279854–279856 completed；states286166–286170见小刀实际向石、T3损7至14。T4 286171–286174仅5牌挡+覆甲1、甲虫22攻，毒后甲虫仍13，最终死亡。取消的前线不能算完整执行；一次死亡不足校准概率。 |

五题的gate_reject、selection_dispatch字段均历史缺失（absent），不能写成false/0或倒填现代回执。动作chosen/result与后续状态共同提供有限执行证据；单一completed既不是整轮执行承诺，也不是胜利。完整原文/原始行关联见question-277250.json、question-277909.json、question-278543.json、question-279117.json、question-279854.json；每份包含Jev原始ref与其精确decision_ref。

补核机制/资源状态但未逐题读取对应Jev的窗口：P74 F17 states284626–284660，见中和后182/滑溜8、火焰后181/滑溜7，普通触媒1、两结算窗口180→178与后段44→21；不按药面值推兑现，不外推新公式。F22 284730–284761为53→9赢战，T2结算后33、T4结算后9，最后主怪15血到奖励0之间缺细帧，不能以净差补完整来源；F23入口9血，末次动作链可见死亡。G33末T7 284399–284403临时力4→−4、22→13，17挡；T8 284404–284408恢复/成长到5、31攻，12挡后死，毒和被动挡真实兑现不证明能力先后胜因。RC首/末T1 285315–285321与285491–285497，实扣敌30/23、实损4/8、同瓶格挡药但挡16/12；局内SL非独立样本。没有新同条件整战胜线。

历史题面夹带的其他角色药水统计与通用旧手写建议只当原始提示内容保存，不采作Silent事实、分母、机制或策略验证。未重算原提案中的109/110/112/113局、A10 70/72/73局或营火历史统计，保留其原来源与限制，不升级为本批新校准。

## 源码核对与逐项处置

只读live快照HEAD为4528a751f17e341a97e7ff70295ec9fba0c947e9（查询时快照，不声称后续live固定不变）。e784dd9f043bf87c29109573f48975f9903280d3（投斧首牌身份）及bf423c173d3be348a4ad714e1d26516df619ff41（普通生存者唯一余牌弃除）均由merge-base --is-ancestor核实为该live祖先。当前selection.ts、silent-discard-facts.ts、silent-selection-audit.ts、silent-selection-dispatch.ts的本树/live SHA全同，详live-source-audit.json。已实读源码说明保留手牌是snapshot，弃牌触发/后续伤害未知；selection_dispatch仅单动作回执，state_effect_verified=false、whole_plan_executed=null，不能当整线已验证。只核这些窄范围，不声称所有机制父项都已实现。

两窄提交历史红绿/tsc/vitest只见原提交说明，本批未重跑，不能挪用为本批测试通过。未将已有窄提交重复登记implemented或duplicate覆盖整项。

### silent-proposal-9952ee8e8df9a0fe：waiting

证据局：NHA2KW0RB7VP；账本：silent-0019, silent-0020, silent-0065, silent-0264, silent-0079。

NHA F33 T1实见SL把斗篷线换为回响线，即时损血1→7、净扣敌8→24；后轮抽弃/动作未控制，缺完整分支及独立A10时间留出，不能拟合新SL/终局门槛。

### silent-proposal-47be799a87af03be：waiting

证据局：P74C04AEPL1F；账本：silent-0205。

P74 F23末T3弃精确切击及死亡已核；当前live已有计划失效提示、保留手牌快照，仍缺四个合法弃牌分支动态伤害/触发/费用/剩血的联合核证，不能关闭整项。

### silent-proposal-3a5274da3c42672a：waiting

证据局：P74C04AEPL1F；账本：silent-0039, silent-0196, silent-0013, silent-0180, silent-0224, silent-0227, silent-0027, silent-0011, silent-0006。

P74 F17滑溜/普通触媒和F22赢战53→9接F23已核；F22主怪15血到奖励间缺最终归零细帧，缺当前模型逐来源差额与跨战保药受控后继。

### silent-proposal-bc4b92d590f2c4ce：waiting

证据局：G33HU22H2543, P74C04AEPL1F；账本：silent-0092, silent-0023, silent-0021, silent-0057, silent-0205, silent-0079, silent-0266。

G33投斧首牌身份子项源码e784dd9f043bf87c29109573f48975f9903280d3已核为live祖先；动态弃牌、完整实线归属和能力长期兑现尚未联合验收，父提案继续等待。

### silent-proposal-f52fbbab4dccc3b4：waiting

证据局：G33HU22H2543, P74C04AEPL1F；账本：silent-0019, silent-0020, silent-0090, silent-0069, silent-0039, silent-0064。

P74 F22赢战后9血接F23失败、G33末战资源不足属于观察；缺同条件另一条路线、保药/能力先后完整后继与消费者校准，不能改资源阈值。

### silent-proposal-10f37c0edd3d24a6：waiting

证据局：G33HU22H2543, P74C04AEPL1F；账本：silent-0006, silent-0011, silent-0027, silent-0046, silent-0013, silent-0180, silent-0196, silent-0255, silent-0198, silent-0204, silent-0069。

已复核P74滑溜/毒及G33末T7临时减力、T8恢复与实际挡；尚无当前生产模型逐样本全轨迹对照，开场/休息等其余子项未全覆盖，未隔离新确定数值失配。

### silent-proposal-3f82387e2e179703：waiting

证据局：RC61MFQM63Y6；账本：silent-0079, silent-0027, silent-0065, silent-0080, silent-0088。

RC F33首/末T1同盘实扣敌30→23、损血4→8已核；后轮不同且无受控整战胜线或独立A10留出，不据单局改SL饱和排序/固定能力权重。

### silent-proposal-aee21084c991abd3：waiting

证据局：BTSRF7JL1W1Y；账本：silent-0128。

BTS F31抽弃后实际选plan2为五轮4样本3胜1死，T4仍死亡；抽弃前后并非同一完整执行线，缺逐样本生产轨迹和确定模型失配，不能由一次失败重标概率。

### silent-proposal-df37594e9b12debf：waiting

证据局：RC61MFQM63Y6；账本：silent-0021, silent-0027, silent-0057, silent-0065, silent-0079, silent-0176, silent-0205, silent-0268。

RC F33第三试T4唯一余牌被弃、原最终转向未执行已核；窄修复bf423c173d3be348a4ad714e1d26516df619ff41已是live祖先，多选可达性、整线朝向与SL收益仍待联合核证。

### silent-proposal-42e81c83b2e1e56b：waiting

证据局：RC61MFQM63Y6；账本：silent-0019, silent-0020。

RC资源提案原文SHA已核，但本批未重算原73局/400营火统计；缺同条件路线、锻造、保药完整后继及实际消费者验证，未来营火不能作为已兑现回报。

每项更细的适用范围/旧新行为/反例/验证/回退均见proposal.md和逐份.original.md。旧提案已按保存的SHA全部核同，六份从基线paper/materials/silent/20261008-{0123-experience,0223-events,0326-experience86}逐文件Git原件取回本批scratch；未恢复其他工作树、未展开整仓归档、未覆盖旧提案。linked-ledger.evidence.jsonl保留只读账本出处，不直接编辑账本；本批没有新经验/新代码提案，故不重复CLI add，不将旧账本标shipped。code_proposals是十个原CLI id，implementation_domains仅表本批核证涉及领域，并不表示实现完成。

## 限制、验证与交接

缺完整受控后继、独立A10时间留出、当前生产逐样本轨迹；原历史dirty源码未完整冻结；V6无本批匹配原文、旧config没有显式V6开关字段；617题未完整读。以上缺失不是零，也不由其他角色/预训练补足。原提案支持与反例都保留；未找新确定bug不代表现行模型完全正确。重复调度本批五旧局不会凭空增加独立分母。

没有源码变更，撤源码失败/恢复通过不适用，tsc/vitest/cases均null（未运行）。无gitleaks提交扫描、无新commit、无合入/版本/双上线通知，原因是没有本批发布动作；不制造测试成功。不修改运维prompt、不停止对局。所有产物在本批被忽略的learner/runs scratch，工作树应维持干净、HEAD等于base，由原调度器消费逐项waiting并保留待新局，不以报告完成关闭父要求、代运维shipped、代watcher/Roy ACK或封存成功。

交运维：proposal.md、report.md、result.json和两份evidence-manifest.json均位于本目录。proposal_results十项俱全，无新增实现。

最终机械核验：274条原始行按offset/bytes重新seek，逐条SHA和JSON原文一致；十份提案原文SHA全匹配；learn本批身份仍匹配，十项处置齐全；git status --porcelain为空、HEAD仍为base。核验的是证据与现场，没有运行产品测试。

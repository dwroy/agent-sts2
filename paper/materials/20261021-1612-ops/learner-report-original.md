# Silent十项策略提案核验报告

记录时间：2026-10-21T15:29:29+08:00。本批20261021-151301-s2-strategy-proposal。

十项原提案全部保留waiting。本批证据能确认局部状态变换和资源端点，现有审计消费者也能重现部分整轮观测；尚不足以验证原提案全部职责或拟合新的SL阈值、血价系数、能力权重、固定杀序。没有源码或正式知识修改、提交、live合入、版本或shipped。铁甲与其他角色行为保持等价。

## 身份与基线

开工git status干净，HEAD=c57f78a49e3ad047bde212b0011fccd35d498d0e。只读根learn.json本批行，task=strategy-proposal、character=silent、reason=proposal、worktree精确匹配；有十proposal_ids，无research_request、implementation_request和proposal_repair。根牌组大小请求绑定另一旧批，本批不承接手动专题、不扩选队列。按普通流程git merge --no-edit main无冲突快进至0933b573092e3b5f799ced991d3f69abdc206043，记为完整base；新增为运维材料，无本批源码修改。

先读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol和learning-code-proposals。STATE早期停机与后续恢复记载同时保留，未操作STOP或对局。自己完成，没有下级agent。未改模型/账号/推理配置；本报告未取得本会话原生turn_context，不冒称已独立核实档位生效。

runs原行575/577/578/580/581/582按精确run_id筛选，六局均SILENT、A10、ended非空、victory=false。依次CA5KE8GFJ9X2 F13、5PM6JAQG6FNQ F39、DUZUBAJ3A8GP F30、8JRE1C4H4Z2W F33、YF0LXT1QSTGG F48、XP2SL33HT0D9 F33，结束于2026-10-07。运行版本均带dirty，Git源码不等于全部历史实际执行输入。独立来源局仅6，SL不扩分母。

## 原提案与证据冻结

十份原Markdown全部实读、逐份SHA匹配队列，见original-proposals/和proposal-original-verification.json。旧工作树六路径不可见；四份补链原件和578原件通过HEAD精确Git blob读取，c59从根paper/materials/silent/20261008-0151-events/strategy-source-originals/saved-silent-proposal-c59f592f1427a67e.md读到同SHA原字节，其他四份原路径仍在。没有把摘要代替原提案。worktree_storage对两个历史运维文件返回persistent runtime retained；保留限制，随后用git show只读需要的blob，未改存储策略。

先运行指定根evidence_summary入口，摘要complete_raw_evidence=false，仅事实索引；再运行指定本树extract_evidence提V6/Jev/decisions/config，并经同一入口补states、SL、plans、runs。两个manifest逐流记录完整源冻结切点、源SHA、逐行offset/bytes/SHA、identity与计数。摘要与提证decisions切点不同（3329596381与3329776587字节），未覆盖旧摘要或冒称全源同时冻结。

| 流 | source_size字节 | 本批所属原行 |
|---|---:|---:|
| v6-build | 64678849 | 0（no_match） |
| jev-prompts | 2396618620 | 811 |
| decisions | 3329776587 | 3941 |
| run-config | 2427471 | 6 |
| states | 15242124207 | 4062 |
| sl-attempts | 52558297 | 38 |
| run-plans | 10376310 | 33 |
| runs | 405092 | 6 |

audit.py逐行seek原日志，核冻结上界、字节SHA与JSON同一，共8897原行通过，raw-verification.json。机械全行核验不等模型全题精读。模型只读九个完整Jev原行和相关窗口、有限额外固定状态，未输出整份states流。fact-checks.json有16项原帧事实断言通过，不是生产tsc/vitest或策略收益试验。

V6-build源存在，在660行冻结前缀中六局均no_match；entries/jev_answer/fallback/unknown无本批可归属行，不能当它们各自零采用/零失败。六份历史run-config均无V6字段，不能补写显式off或on；这些历史局不能验证本批正式发布、下一局消费或自然收益。

Jev逐行保留request、answers、error字段是否存在，并与decisions精确decision_id对应。811条均有同局精确关联原decision引用，原SHA核同；不用正文、时间邻近或question_id相似字符串归局。run-plans按run字段归属。题面嵌入的旧药水统计只作为历史原文保留，不读其他角色源知识、不计成本角色证据。

全源无效JSON计数states2、decisions2、Jev1，无法据此归入六局；各切点incomplete_lines=0。states的3425个unknown_identity及decisions的1934个unknown_identity/1488个unmatched_decision_id保留，拒绝凭正文补归；最后五条gap_refs只是有限索引。缺失不等零。

## 完整题面覆盖与执行后果

下表九题完整request及answers均实读，原行未出现error。question-<decision_line>.json/.txt保留完整原文与引用；question-audit.json保留每题chosen/result/gate_reject/selection_dispatch的存在性和后继原帧，window-*.txt/state-facts.json是按原帧字段投影的事实窗口。

| 局号/窗口 | decision原行 | 精确decision_id | Jev原行 |
|---|---:|---|---:|
| CA5 F13 T4 | 267377 | e2beebbf-99bf-4612-8da3-844a88b3d7ad | 26719 |
| 5PM F38 T3 | 268385 | f7b88b58-d579-4565-83b2-f1b142beb160 | 26868 |
| 5PM F39 T4 | 268427 | 561d69e3-cd22-4860-8d81-d4630037051a | 26875 |
| DUZU F27 T5 | 268893 | ebee5225-f98c-417f-8e14-cf9a94f4712c | 26930 |
| 8JRE F33 第三试T2 | 270282 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 27194 |
| YF F48 第三试T1 | 271348 | c2213f65-9079-4ac6-9705-3f2407ff1121 | 27484 |
| YF F48 末试T5选牌 | 271502 | 860b25d9-4658-4a28-b465-cce80f3a1366 | 27510 |
| XP F33 第二试T3 | 272040 | 33560091-b5f4-41b4-bcd8-06b3adf2327b | 27624 |
| XP F33 末试T1选牌 | 272198 | eb38e546-66e9-4a82-8c09-fadcac1e5935 | 27672 |

其余802个请求只机械核原字节/身份，未完整精读，原因逐题写question-coverage.json：本批十提案关键窗口之外或仅作原帧/决策端点对照，未据未读题推出选线结论。包括YF d271495、XP d272195和原线d270216/d271309/d271992，只对必要决策或状态端点核对，不冒称其完整题面已读。初始选择集合及包含两未读候选题的初稿另存*.initial；最终覆盖以question-coverage.json为准，不以生成文件存在代表已读，也不是取最后五题。

3941条decision全有result、3937条有chosen；gate_reject、selection_dispatch、selection_audit字段全未出现。这是历史schema缺字段，不是已验证未拒绝或完整候选执行。九题中DUZU首动作仅pending(unstable)，后续状态才见8挡、污染6；其余八题首回执completed，只证明单动作接口回执。

- DUZU：Jev选plan2，生存者→防御→迷雾+；274834—274839原帧污染从未列出到6/12/18，挡0→8→17，实损9，次轮污染不再列出。迷雾使实毒7→13，敌93→80；历史题面预测damage7/敌86，与此净扣13不同，不能把旧“当轮exact”文字当校准证明。当前HAZE角色限定模型已有接线，本批未由历史偏差推断当前同bug、未拟少打技能规则。
- CA5：plan3先翻越撑击、突然一拳，后重新提问d267379才打击；不能把首问的8伤当整轮最终14。273259—273269敌36→28→22，次轮4→8力、19攻，后弱14；玩家2血10挡仍死亡。覆甲现场7→6与更早9/9/8不够隔离全部减层条件。
- 5PM F38：plan10先药瓶，实际随机给三实体各3毒，冒泡使本体3→12毒，猎杀者破15挡、计算下注/开信刀后换轮61→31血。ZAPBOT在274308/274313力2→4、17→19攻，T4才退场；不是本体有毒就不再攻击。另一plan1的35伤/损3未实打，不能说本可省27救下后场。
- 5PM F39：plan1建双步法，负敏−4→−2→不再列出，5挡；失落毒死后负力字段不再列出，274358玩家5血、仅遗忘在场。T6再次−2敏。未见遗忘死亡返敏的本批原帧，不能仅从题面描述填累计抢夺模型或固定杀序。
- 8JRE：原答plan1，sl_explore替为plan2，d270282—270285实际逐步派发；原/替死亡0/24与5/24，封顶损失47不是同死率。消费者确认首/第三试T2实损3/15、敌净扣10/17，多12血只多7输出；同指纹只成立于本轮，后续未控制，不能推出新阈值。
- YF第三试T1：原答plan5，SL剪为plan4，d271354结束时仍有防御续步未执行；原/替预测损0/10、伤54/36，原帧第二/第三试实损0/9、净扣45/38。既有消费者T1开场保留unknown，没有把预测差当实际全轮差。后两试重复及末试恢复防御仍败属于原提案反例，本批未用其未读题面宣称完整覆盖。
- YF末T5：选牌原答card1，确实丢防御，随后刀舞与另一防御、四刀；277520—277528挡13→23后不随第三刀敏5→6追补，敌197→196→187→178→169→160，18血对44攻死亡。此前277512/277513为4血4毒阶段到212满血、新阶段不再列旧毒/力；277518已建触媒2，末轮无敌毒字段。未建毒雾与已建触媒分列，不以持有组件冒已结算收益，不由一局指定能力先手。
- XP第二试T3：原答plan2，SL换plan9，B2原/替0、diff0、se0；逐动作d272040—272042完成。题面分毒只落火箭；278078实际爪9毒/火箭12毒，终端两敌179/181。消费者对首/第二试确认实损9/14、敌净扣24/27；随机分配不同使“总扣相同”也不能认证全部预测。末试选牌card2确实弃进阶之灾，随后T2轮初14挡、镣铐爪−9、斗篷至20挡且零损，T3减力字段消失。另核278249—278257朝向57→38、弱后28、4敏脆弱偏折6挡及损22。这是事实，不推出固定朝向或所有付血探索错误。

## 当前源码及真实消费者验证

只读live快照5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。source-verification.json保存8路径base/live blob，全部相同，并逐个核实际live最后源码commit为该live祖先。局部来源：card-model eae56f79040d9c13c099160ec7d3f964510b0fd3；turn-solver df528ddf14da72f9973e13444f45ee7c3917a67c；rollout fffa54aac6bd31446caa026e8f90fa2d4aa5e685；候选审计9d8278702dbc581b5015ba7ec9a70dc0fb94cccb；派发fdaf787a372880b0438e73bcac7e6d2168b038ed；离线审计a32050fbce4c2863f640468c2dbf378fc9157074；整轮e75438488df159b2e8e9d3458cf219b39aadd933；终局83512ddcd2c70fd9b983dc38524ff25c8970c1d3。它们不是本批提交，不据相同blob关闭宽提案。

已读HAZE限定、VITAL_SPARK说明、HIGH_VOLTAGE增长及轮末加力路径，未从源码注释补游戏知识。silentSelectionAudit是predicted_candidates；silentSelectionDispatch是single_action_receipt，state_effect_verified=false/whole_plan_executed=null。离线工具也显式保留actual_full_candidate_result=null。这些都是当前已有子项，不是完整执行认证。

本批确实用当前生产learner/audit-selection.ts消费冻结原始输入，调用node+tsx且完全离线；不读刷新知识JSON、不调用LLM。输入保留真实_line、逐行原SHA和原sl_attempt/reloads，不根据时间猜补身份。8JRE F33为232决策/233状态、58候选、39已核整轮/11未知；YF F48为235/236、24候选、25/11；XP F33为244/245、58候选、28/17。三次退出0，输入/输出SHA在consumer-receipts.json；共140候选全部完整执行未知，92整轮端点成立、39轮未知。T1缺原前轮结束开场、判死重载缺轮终均保留unknown，跨阶段敌血比较留null。整轮净差不是单候选或单牌因果，不是完整策略校准、在线自然采用或收益。

## 逐项处置

| 原CLI提案 | 本批证据局/层/回合 | 原账本 | waiting理由 |
|---|---|---|---|
| silent-proposal-c20b5139dd0dff71 | DUZUBAJ3A8GP F27 T4—6 | silent-0168 | 棱柱火花3→6、污染逐技能6/12/18及次轮不再列出已核；HAZE有角色限定接线。缺火花增长、污染期限、毒挡收益在同一冻结生产调用中的联合校准，历史dirty输入未复原；不据9损强制少打技能。 |
| silent-proposal-ae9e692d680e3819 | 5PM6JAQG6FNQ F39 T4—6 | silent-0183、silent-0005 | 双步法消去负敏、失落死亡后负力字段不再列出及遗忘再次夺敏已核。仍缺逐实体累计抢夺来源隔离、遗忘死亡返敏和另一杀序完整后继，不能设固定击杀序。 |
| silent-proposal-52f1e1bd2e7db0ed | CA5KE8GFJ9X2 F13 T4—5 | silent-0231 | 蚌4→8力、19攻及弱后14、2血10挡死亡已核。缺实际历史A10移动表字节与覆甲减层条件隔离、冻结生产联合校准；保留第一观测起读进阶事实及房间代价五样本门槛。 |
| silent-proposal-6dd8bbff876be528 | 5PM6JAQG6FNQ F38 T3—4 | silent-0233、silent-0209 | 电击2→4力、17→19攻及T4退场已核；通用增长代码存在。缺跨召唤代际稳定身份、初始化输入和生产消费者逐步校准，未执行的35伤/损3线不能算实付收益。 |
| silent-proposal-578e415a259e6835 | 8JRE1C4H4Z2W F33 首/第三试T2，末试T11（消费者） | silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016 | 现有消费者本批核39整轮窗口，首/第三试T2确为多12血、多7敌净扣；58候选仍完整执行未知，6个T1开场与5个判死末轮未知。原要求的F17 T6、所有指定夹具及跨重规划整候选归属未联合验收，整项保持waiting。 |
| silent-proposal-c0767768bf6a7ab1 | YF0LXT1QSTGG F48 第二/第三试T1 | silent-0079 | 同指纹原帧实付0/9血、敌净扣45/38已核，第三试续挡未派发；现有消费者核25轮，但全部T1开场未认证、24候选完整执行未知。缺受控整战后继和候选持续归属，不拟血价系数或禁止探索。 |
| silent-proposal-a46bdb7fe711d79a | YF0LXT1QSTGG F48 末试T3—5 | silent-0021、silent-0027、silent-0028、silent-0085 | 阶段111→212、毒字段清理、已建触媒2而无毒、5→6敏不追补23挡已核；现有消费者保留阶段快照并拒绝跨阶段合计敌血。仍缺全部候选到重规划后整轮的联合校准与归属认证，不因已建能力宣称已覆盖生存。 |
| silent-proposal-1044224808015e5c | XP2SL33HT0D9 F33 首/第二试T3，末试T1—3 | silent-0079 | 现有消费者核28整轮窗口，首/第二试T3实损9/14、敌净扣24/27。药瓶预测只火箭加毒，实际分给两敌9/3；仍缺随机后继控制、全部夹具及独立整战留出验证。长程零胜并列不等安全，不启用新SL规则。 |
| silent-proposal-7cbc6005db712ba9 | XP2SL33HT0D9 F33 末试T2—5 | silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242 | 已核14+6=20挡、普通镣铐临时−9及恢复、57→38→28、脆弱偏折6挡。早期首证局、各机制独立分母及逐来源生产消费者尚未完整复验，不把当前局子项等同整提案duplicate。 |
| silent-proposal-c59f592f1427a67e | YF0LXT1QSTGG F48；XP2SL33HT0D9 F33 | silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242 | 本批原帧及三战消费者只补本六锚点局部核验；未覆盖原101局1499房分母、历史22次镣铐/50帧船夹板、路线休息药水完整链和全部经验消费者，整项保持waiting，不扩样本或代父要求完成。 |

proposal.md保留原拟行为与全部原文链接，result.json逐项proposal_results精确覆盖派发十id。没有新增提案，不另建重复id；code_proposals沿用原CLI id，implementation_domains=[]，因为本批无实际实现。既有partial接线和观察消费者不满足整提案implemented/duplicate。

## 限制与交付

本批不拟合新参数，不扩大角色/进阶或独立分母。原101局资源父要求、早期机制首证、未选杀序、遗忘死亡返敏、跨召唤实例身份、历史dirty输入与完整候选归属仍未验。未复原的流/题面明确列出，不能用六局锚点称全历史覆盖。已有原提案的反例与不确定性保留；无新增与旧知识相反的策略结论。DUZU历史题面数值偏差仅作为原HAZE提案的限制交运维，待定位完整历史输入，不认定当前生产错误或改知识；本报告落盘不代表ops→watcher→Roy已读或父要求关闭。

仅经根learner/ledger.py update追加本批报告/提案链接和waiting限制，by=learner:strategy-proposal；不改原claim/evidence/status/version，不把历史shipped降级，也不登记本批shipped。无新增游戏知识项。CLI输入/回执及逐行读回会保存在本目录。

本批只写ignored scratch及授权账本链接。未改生产源码，撤源码红/恢复绿不适用；tsc/vitest/cases均null，没有运行或借用历史生产测试。三次消费者退出0与16事实断言只是本批证据验证，不填生产测试成功。无需空提交、live合并/刷新、eval编号或上线双通知；未推送、未联网、未运行play、未改运维prompt。source-diff.patch为空。最终HEAD/净树与gitleaks回执另见final-verification.json/gitleaks.log。

过程限制保留：两次materialize拒绝；一次查找缺失目录的rg返回2，修正为现存精确目录后取得c59同SHA；部分工具聚合输出截断，关键题面随后单题完整读取，执行后继以紧凑字段重读。两个未读初选问题虽生成原件，最终覆盖已更正为九实读题，初稿保留，不以文件存在代覆盖。只读日志提证的内容存储回执含pending_host_seal/deferred_errno18，原行字节本批已独立核同，宿主封存完成仍不冒称。

运维交付：本目录proposal.md、report.md和result.json。记录型批次可结束；十项waiting、学习父要求、正式入库/发布/下一局消费与收益验收保持开放。

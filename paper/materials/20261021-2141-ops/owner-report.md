# 静默猎手策略学习报告

记录时间：2026-10-21T21:27:13+08:00。批次：20261021-211301-s2-strategy-proposal。

本批十项提案全部 waiting，具体理由见 proposal.md / proposal-results.json。没有新增源码或知识修改，fixes=[]、merged=null，无提交、行为版本、shipped 或收益声明。完整 base=`7d116fdfae6a3c224be1b0f4649399a58b000568`。tests={"tsc":null,"vitest":null,"cases":null}；未运行测试，撤源码失败/恢复通过不适用。原窄修复的历史测试不当本批测试。

## 派发身份和范围

已读 README、最新 STATE-2026-10-19、decision-log 末尾、学习协议、代码提案闭环及回收文档。初始 git status 为空，普通任务 git merge --no-edit main 返回 Already up to date。dispatch-identity.json 保存根 learn.json 本批对应行：task=strategy-proposal、character=silent、reason=proposal、worktree 精确匹配，含十个 proposal_ids，无 proposal_repair/research_request/implementation_request。普通专题入口 strategy-research-silent.json 绑定20261010旧批，不匹配本批；没有套用纯研究或其他实现专题。

四局 runs.jsonl 原行均已按偏移/SHA 核为 SILENT、A10、ended 非空、victory=false。终局分别为 P74 F23、G33 F48、RC F33、BTS F31；精确来源在 evidence-summary.json 的 outcomes.ref。它们全部结束于2026-10-07，同局 SL 与重复派发不增加独立局分母。

本次独立执行，无下级 agent。只用本批角色日志、原提案及 Silent 账本/源码；未查询外部数据、其他角色私有知识、游戏二进制或网络，未运行 play。旧题面自带的跨角色药水统计只保留原文，不当 Silent 的证据。用户指定普通/high；本次未取得学习会话原生 turn_context/请求回执，不冒称档位已独立核验，历史对局 run-config 的 high 不代本会话证明。

## 冻结、身份与缺失

已运行指定 evidence_summary、V6 四流 extract_evidence 和标准 extract_evidence，实际读取两份 manifest。摘要仅为入口；未把最后五条当全局覆盖。下面两次冻结时刻不同，分别保留切点与前缀 SHA；逐行 offset/bytes/SHA 和 identity 均在原提证文件。

### evidence 冻结清单

| 流 | source_size | 冻结前缀 SHA256 | P74/G33/RC/BTS行数 |
|---|---:|---|---|
| states | 15345377929 | `91128b205b7e889481f6de3b8cb447efcd1f2affc4b4f0b4d3ff19579c06a729` | 410/879/694/653 |
| decisions | 3412103522 | `af3d00f194b6e505f8d006b94790e0a42df1a0291faf6d36b14efccdd0be7a1e` | 395/850/674/635 |
| sl-attempts | 52962847 | `ba110535ed8dbaf768610e68165aa418f510604976a2016d855e230b5e279c9e` | 5/8/7/4 |
| run-config | 2457617 | `54026e92369eeb8d883ec139238b16dabdd4684475dfced53f795b3aaed6cdc2` | 1/1/1/1 |
| run-plans | 10427440 | `66b04a4a6bfe6dba2ae7f500d794ca0b2848de1fc0fe567b7b316d836dd6374b` | 3/6/7/5 |
| brain | 1236569052 | `47c9c625c92d3288a6ddead8663b7de1cb03af5c1ced62d0e12cc5bddd958aa4` | 23/45/33/28 |
| v6-build | 64707059 | `0de31475dae0df2947df0acb99209d437b296e1dc7d8700ab5700add9a552cca` | 0/0/0/0 |
| jev-prompts | 2442090027 | `3fed4c6358fddb9a97eedaddf6773253b8fc5b5712805fec675454d0518f5bd7` | 70/143/147/139 |

### v6-evidence 冻结清单

| 流 | source_size | 冻结前缀 SHA256 | P74/G33/RC/BTS行数 |
|---|---:|---|---|
| v6-build | 64707059 | `0de31475dae0df2947df0acb99209d437b296e1dc7d8700ab5700add9a552cca` | 0/0/0/0 |
| jev-prompts | 2441775213 | `72c338a8c04cefd05fc2b07d1a33ec716615e94329f3362a631f287fa8a16aa9` | 70/143/147/139 |
| decisions | 3411721313 | `7291ee57a2a77edad6b74696d86bb8e8074817cd7f03931dc4553e4b96625110` | 395/850/674/635 |
| run-config | 2457617 | `54026e92369eeb8d883ec139238b16dabdd4684475dfced53f795b3aaed6cdc2` | 1/1/1/1 |


V6 流存在且完成扫描，本批四局均 no_match；不是原流 missing，也不是零收益。四份原 run-config 均无 V6 字段，V6 显式 off 状态未被记录。没有可归属本批的 v6-build 原行，故 entries、jev_answer、fallback、unknown 均不可逐项判定；不能由题面齐全推定 V6 采用、成功执行、发布、下一局消费或自然收益。

Jev 499条均有 request/answers，机械 error 字段数0、显式截断标记数0；这只说明字段存在，不证明每题语义完整或动作成功。完整读4题、495题未完整读：question-coverage.json 逐条保存精确 decision_id、ref、identity 与未读原因；范围是本轮十提案代表性缺口，不是全局题面审计。模型仅读所需窗口和结构化投影，未输出整份 states。历史前缀内另有 states2/decisions2/brain2/Jev1 坏JSON；两次 manifest 的 incomplete_lines 均0。标准 states 全流 unknown_identity3440，decisions unknown_identity1934/unmatched_decision_id1503；这些未知身份不分配本批，有限 gap_refs 不当完整异常阅读。缺失不是零。

身份仅接受显式 run_id/state.run_id/fingerprint.run、run-plans.run 或由原 decisions 精确 decision_id 关联；不使用正文提及、时间邻近或 question_id 相似字符串。四题 Jev 与 decisions 的 decision_id、显式所属局及完整 questions 相同。原日志按原 ref 再次 seek 并核 SHA，完整行保存在 selected-raw-rows.jsonl；旧批 raw refs 只作定位入口，未将旧摘要或旧副本替代本次原日志读回。旧 ref 的 source_size 保留原值；current-reference-joins.json 另存本次新冻结关联，不重写旧切点。

两份 manifest 均标 pending_host_seal=true、deferred_errno=18。原样保留，不能把本地提证成功当宿主封存完成。

## 完整题面、答案、执行与后果

四份 question-<decision行>.json 保存原始完整请求、答案、decision 与来源。首次合并输出曾截断，随后按 state / criteria / 回执分段重读；BTS 的五项 criteria 与原 decision.questions 精确一致，重复部分已核。43个原 decisions 均核 chosen/result；全部 gate_reject 和 selection_dispatch 为字段缺席，不能记false或0。pending(unstable)不是失败，completed也只代表一个动作回执。

| 局/层/回合 | decision行与精确ID | 核读结果 |
|---|---|---|
| G33 F48首试T1 | 277909 / 116fa48b-837a-4c22-9223-665a71e86aba | 完整题面余像先/闪亮先为18/10挡、75/107伤；药水1/12样本且degraded。Jev plan2信心.68，chosen闪亮completed。277910—277918与states284162—284172确认闪亮先重放、余像只建1层，后来药水补到2层；余像先的整战没有实打。 |
| P74 F23第4试T3 | 278543 / bf5fbb89-6c47-4f32-bddc-cfbaf7a1a0ce | 题面明确丢弃、四选项完整；Jev card2精确信心.52、chosen option_index2 completed。278542原计划报零损但pending；284817已16挡，284818精确离手；278544—278546改紧勒打丝/毒雾/结束，284821实死、卵毒后仍2血。保留精确没有完整实打线，不能宣称必胜或固定永弃诅咒。 |
| RC F33第3试T4 | 279117 / d099bee5-d92b-453c-8376-ce1a2aa3209c | Jev plan1信心.20，SL替为plan3刺击打爪。279118—279120逐动作completed；285414仅生存者+打击，285415手空7挡且火箭57。279121明确not dispatched并SL重载，285416回52血T1；不是本次实吃57死亡。旧原预测余14依赖不可达末攻击，不能据它新设SL阈值。 |
| BTS F31 T3重算 | 279854 / ec8ed7e5-50ab-45e1-a1c0-5eae18862c6d | 279852投掷匕首pending、279853弃羽化completed后重新发题。新题plan2/4并列，4样本3胜1死；Jev plan2信心.86，防御/两小刀打石completed。286166—286170石退场、21→14；T4仅5牌挡+1覆甲对22，甲虫毒后仍13，286174实死。抽弃前计划已取消，单次失败不足重标75%。 |

本批198个选中原行已逐字节/SHA读回：147 states、43 decisions、4 Jev、4 config；终局4条另从摘要ref核读。selected-raw-rows.jsonl 保留原内容，reviewed-state-windows.json、reviewed-decision-receipts.json 是结构化读数，绝非完整轨迹审阅声明。

补核机制窗口：P74 F17 states284626—284660，183→182中和、182→181火焰各1实血，滑溜各减1；普通触媒1层下T2毒12而180→178、滑溜6→4，T8滑溜已清时44→21实23。T2尖啸力量0→−6、来袭14→2，次轮恢复后30攻击，临时效果不沿用。F22 states284730—284766，53→33损20、33→9损24，寄生T3归零/T4复活21，赢后9血空药接F23；主怪最终归零中间帧仍缺。未把未来F24营火当已回血。

G33末T7—T8 states284399—284408，聚合体力量4→−4、22→13，17挡零损；次轮力5/31攻，后空翻与防御各5含3牌挡+2余像，毒药补2被动挡合12，12血仍死。已建余像/毒确有兑现，不能将死亡倒推它们全无收益。

RC首/末T1 states285315—285321、285491—285497及279021—279027、279197—279203确认均同槽格挡药实喝。原线16挡、52→48、敌净扣30；换触媒线12挡、52→44、敌净扣23，少9攻击/多2毒/少4折扇挡分别核。两条T1的Jev完整题面本批未重读，不冒算完整题数；后续行为不同，不能归因整战败局或拟合固定权重。BTS睡层3→2→1→消失、醒后力量2/4与来袭20/22已核；末场未建立步法，不能预支敏捷。

反例和未知：P74首/第三试卵已较早退场的原提案反例保留，本轮未重读那些窗口；G33余像先仍仅候选；RC后轮/预算未控；BTS旧F17已建步法与F31未建条件不同，F17未在本轮重读。RC F23逐牌/F29幻影、开场遗物/各营火、原110/112/113局及72/73局统计本轮未全量重算，仅保留原提案来源，不作为新增独立支持或模型校准。

## 源码核查和逐项处置

实际live快照 `0a9dc70e3ef096e7d0d6eb1524cd20e2cbe906c6`，不声称后续不变。merge-base --is-ancestor核投斧身份源码 `e784dd9f043bf87c29109573f48975f9903280d3` 与普通生存者 `bf423c173d3be348a4ad714e1d26516df619ff41` 都是该live祖先。当前live的SURVIVOR单弃与绷带收益已解耦，唯一余牌移除，多选保持未知。selection有条件原计划提示、保留手牌快照；snapshot本身明确不推演伤害/格挡/剩血。silent-selection-dispatch明确state_effect_verified=false、whole_plan_executed=null，不将当前源码字段倒填旧日志。

live-source-audit.json保存实际叶子SHA：选择/快照/审计/派发/SL五叶与本基线相同；card-model与turn-solver整叶不同，已核差异为main上的外部静态元数据附件/类型，本批不使用外部数据。不能声称整main/live等价。首次审计误用两个旧路径，initial文件保留，已改为reflex/silent-selection-audit.ts与silent-selection-dispatch.ts；不是生产文件缺失。

十份原提案均按队列SHA找回，本地original-proposals保留；六份exp路径失效，通过同角色旧批保留的原文字节核SHA恢复到本scratch，没有重建旧exp或覆盖原文。34个关联账本的原行ref与当前折叠记录保存在ledger-refs.json、linked-ledger-before.json。已shipped的机制经验不等本次复合代码提案完成。

逐项waiting理由、局/层/回合与账本在 proposal.md；proposal-results.json 与 result.json 供调度器原链消费。原规则/新行为目标、反例、拟合切分、预期及回退均链接原文，当前无新增规则。没有新知识或新提案，不调用add制造重复CLI id；code_proposals列十个原id，implementation_domains=[]表示本批没有实际实现。

## 记录、验证和交接

只经根learner/ledger.py update追加34条关联账本的本批报告链接与waiting说明；不改旧claim/evidence/status/version/effect，不追加support/repeat或独立分母，不代ops登记shipped。原已proposed/shipped状态保留。本批没有新条目需要标proposed。

生产源码/任务模板/全部knowledge零差异，只有忽略的本批scratch产物和授权根账本追加。无源码提交，故不制造提交前测试、撤源码红绿、live合入、eval版本、上线日志或Roy双通知；未推送，也不停止/启动对局。运维交接入口为本目录proposal.md、report.md、result.json及两份evidence-manifest.json。无行为差量可交付上线，不把报告结束当父提案、科学要求或正式经验入库/消费者采用完成。

final-verification.json记录原行读回、十原文SHA、两份提证输出SHA、重复流payload一致、499题覆盖分账和HEAD/base及干净状态。以上是材料核验，非tsc/vitest、胜率评估或宿主封存证明。

过程记录：首轮材料核验脚本误将question-coverage.json列表示为题面对象，退出1；原失败说明保留verification.initial-failure.txt，改为仅匹配数字题号后重跑。scratch扫描gitleaks退出0、151.87MB无泄漏；此扫描不代表代码提交、产品测试或发布。

# Silent 本批策略提案复核报告

记录时间：2026-10-21T11:59:20+08:00。批次：20261021-114302-s2-strategy-proposal。
base=e015024a93abccffcb464700ec37ebbf265ff223；fixes=[]；merged=null。10项均waiting；本批没有新增源码、知识、规则、提交、live合入或版本。

## 派发身份与开工

初始git status为空，HEAD=49d95791812fc35ea1206c510869e9842b740ae2。已读README、最新STATE-2026-10-19、decision-log末尾、学习协议和代码提案闭环。STATE较旧的停止状态与后续decision-log恢复/发布记录均保留，不按旧停点改运维。
learn.json仅取本批对应行，task=strategy-proposal、character=silent、worktree精确匹配，reason=proposal，含十个proposal_ids，没有research_request/implementation_request/proposal_repair。普通专题文件仍绑定20261010-150327，故本批沿原十提案，不转专题。按普通任务执行git merge --no-edit main快进到e015024a93abccffcb464700ec37ebbf265ff223，无冲突。后续没有再次更新main，也没有将纯研究完成口径套入本批。
十份原Markdown全部按队列保存SHA256核同，完整保存为<id>.original.md。四份从原路径读取；六份旧exp路径不存在，先按精确Git路径调用materialize，再只读HEAD原文blob到scratch，SHA核同后使用。materialize原回执和来源均见proposal-source-checks.json；没有据缺路径断言证据丢失，没有恢复完整checkout。
规定的摘要、两次提证及核心分析脚本使用nice19；未派下级agent，未联网/调LLM/运行play/改账号、配置或权限。未读本任务原生turn_context，因此不能据任务指定值报告模型档位实际已生效。

## 原始证据与完整题面覆盖

六条runs.jsonl原始行均为SILENT（大小写归一为silent）、A10、ended非空；六局最终victory=false。原值、行字节SHA及offset见run-verification.json。第一次严格小写断言失败，随后按角色大小写归一重核六局通过；初次失败未改写源行。
已运行规定的evidence_summary.py及两次extract_evidence.py入口；摘要仅作初始事实索引，没有用最后五条当完整覆盖。实际读取两个manifest、六局配置相关原字段、八道完整原始request/所有选项/answers，以及对应decisions和后续states。

|局号|decisions|states|Jev总行|完整读题|未完整读题|
|---|---:|---:|---:|---:|---:|
|751FN9QM9MHQ|615|624|137|2|135|
|KV0JHNJCKXLS|669|686|104|2|102|
|YQL8RZ8BWN1E|571|582|253|1|252|
|L9SGRBB5R698|635|653|251|0|251|
|PU80F84P6HPN|1033|1064|172|0|172|
|KEN58SH9SLZ6|548|558|109|3|106|

共4071条决策、4167条状态、1026条Jev记录。完整题面8道，其他1018道仅做身份与结构索引，未做逐题策略/收益审核。L9SGRBB5R698与PU80F84P6HPN本批只核巨兽相关原状态/SL记录，没有完整读其Jev题面；这两局不能据本批补充问答结论。逐题已读/未读及原因、精确decision_id、request_id和两流ref见question-coverage.json。selected-questions.json另含定位候选，只有reviewed-question-selection.json中的8道计完整读题，不把落盘等同模型已读。
八题均以显式run_id并由decisions精确decision_id核对归属，再以同局observed_ts和完整fingerprint精确定位起始state，沿同局状态顺序核到下一回合或终局。没有用正文提局、question_id相似或时间邻近建立身份。question-state-chains.json保留原始行和完整chosen/result/expect/rationale；compact-chains.json只是所需窗口视图。共170条去重原行已seek回读，offset/bytes/SHA与row逐字节核同；索引见verified-raw-index.json。
各流source_size/source_sha256、身份缺口、坏JSON及不完整行全部保留在manifest，表格附于文末。两次冻结切点不同：decisions源文件继续增长，但本六局选中行逐ref相同；不覆盖早截点。所有扫描不完整行=0；源states/decisions/brain各2条坏JSON、Jev1条坏JSON保留，不强配身份，也不分摊成本六局的零值。states全源3407条unknown_identity；v6提取decisions全源1934 unknown_identity及1470 unmatched_decision_id。有限gap_refs不是全部缺口。对象视图回执pending_host_seal=true/deferred_errno=18，未冒称宿主seal完成。

## V6与Jev分账

v6-build在冻结64678849字节中660条源记录，本六局全为no_match、选中0行。这表示此切点未找到本六局的V6 row，不能据此填entries=0、把未知当fallback或证明V6 off。六局run-config的Jev为enabled=true/context=v1，历史配置没有可证明本批V6开关状态的字段，V6 off状态保留未记录。entries/jev_answer/fallback/unknown均无法由匹配V6原文评价。
Jev另一流1026条均结构上含request/answers，error字段出现0次；八道所选题均有完整答案且无error字段。这不是全部1026题的质量验收，也不排除其他执行层错误。原题夹带旧A8/A9药水统计及其他局号，只作为历史题面文字保留，不计入本六局的游戏验证分母，不搬用其他角色知识。
八道原始decisions没有gate_reject、selection_dispatch字段（历史缺字段）；不是证明没有拒绝或整方案已执行。后续chosen/expect和states用于核实具体动作，pending、completed、失败超时分别保留。完整题面存在、Jev选择、动作接受、自然采用与收益均分开。提证本身不证明本批正式发布、下一局消费或自然收益。

## 八道题与实际后果

1. 751 F17 T7第二/第四试（d272531/272652）：两题完整指纹相同，45血/敌121血；三候选全读。Jev均答plan2匕首雨/生存者/防御+，SL第四试换plan3匕首雨/生存者/打击。两次生存者均pending后进入选牌，实际各弃一呼唤；不是直接把原题19/29的保守预测当实损。s278576–278581为45→32、敌121→109；s278697–278702为45→22、敌121→103。实际多付10血换6当轮净输出成立，不能据此单独归因整战早死或设固定阈值。
2. KV F33 T5第四/第五试（d273400/273450）：两题指纹相同，30血/敌334，三候选全读；Jev均答猎杀者/致命毒药+。第四试施放两牌，敌334→298、毒14→21→20，HP仍30；第五试SL只猎杀者，并在后问d273451阻止补毒，敌334→305、毒14→13，HP仍30。删毒少7当轮输出、没有当轮保血。d273403/273452选懒惰请求超时，后续d273404/273453重试完成并进入下一轮，超时不能当成多施放成功。缺全战毛伤/回血归属及另一完整后继，不将净HP差标为全部毛伤。
3. YQL F17 T10末试（d274087）：完整play/survival题及全部候选已读。Jev答毒水，同时survival答lethal；原题明确药效未模拟，end_turn显示hp_after=-2。chosen为use_potion，s280160→280161毒2→8、药槽清空，但HP26、挡13、自爆41均未变；d274088结束，s280162实际GAME_OVER HP0。-2是结算前算术，0是死亡截断，不混写。本体结束后施毒的这次局部事实不证明提前喝必胜。
4. KEN F17 T10第四/第五试（d274505/274568）：四候选均读，Jev两次答plan4呼唤/带毒刺击/呼唤，第五试SL换第二呼唤为匕首雨。s280588–280592从37→22、敌82→80；s280651–280655从37→16、敌82→78。实际2伤/15损与4伤/21损，保留呼唤多付6血、增加2净伤成立。两次题面保留无实体、后续毒及B2/rollout差异；整场后轮动作不同，不能称该步独自导致败局。
5. KEN F15 T1技能药（d274272）：完整三候选均读。plan1本轮不喝但后续6/8样本会喝；plan2明确整战无药；p0中位示例逃脱计划只是12次MC抽样。实际use_potion为pending，s280355进入选牌，d274273选斗篷与匕首，随后实打斗篷和小刀；挡4→12、敌52→48→45，次轮HP仍46。不能把中位示例当真实选牌，也不能把当轮零损当整场不喝也零损。缺表成本0且持有价值未测，保留未知。
八道原题完整原行分别存question-d<decisions行号>.json；各自字节定位见下表。

|decisions行|Jev行|Jev offset|bytes|SHA256|
|---:|---:|---:|---:|---|
|272531|27740|398408080|13503|a939442365fd65efe504a8b23895a31aa824361b7edc4314f98bd183e45ba2a1|
|272652|27770|398747334|16452|de09b2d48996874de68bc1bc0f44560ba3c827066aa8252cbe0b420debcf3124|
|273400|27899|400525783|16475|caf5b6295b68e649a4dcf5ebaf3017b699af0f0faa1b71dae6e0ffacf5a53e30|
|273450|27907|400689626|17713|e152ebc69c9315ea695891fcaa01fcbe442eb31e1ab0579c94e9d3f75cc7c86b|
|274087|28173|404305929|13653|fb25cd458d94d92f7c9c8db4a34580967c2adfa52150a5d185c459214f243bd3|
|274505|28257|405376179|17673|cddbcc8a6dd676323d16578339e37923f643c30904c3036d4365d74a2bed3571|
|274568|28271|405594035|19251|a487fcb03ef4577e2dbcee298fa879970c0a6b72bbbec2b0e27b67e6996176a4|
|274272|28211|404771254|13500|8403d3a0a440a33db1df96ddedfcbe8dbf34913af2ae46a766894675a836cf33|

## 资源前因、反例与未核范围

KEN七个use_potion原动作及槽位后继均核：F3T2攻击、F4T1稳定、F5T2速度、F11T1虚弱/T2攻击、F15T1发光/技能。稳定后出现保留手牌2，速度后敏捷5/速度5，虚弱层1→4；各瓶真实槽位消失与HP另记，未把清槽直接等于所有收益已兑现。原始链在resource-chains.json。完整随机技能题已读；其余药水原题本批未完整重读，不对所有七瓶做收益模型验收。
KEN F12休息26/76→53/81（+27）、F14事件53→46（付7）、F16休息46/81→75/86（+29）逐帧核同；六次F17开场均75/86且空栏。没有重新计算旧105局跨节点分母、七瓶保留至boss的完整支线或全部赢战毛伤，因此不据败局给留药定价。SL恢复与自然回复分列，不把六次相关入口当六个独立局。
L9与PU的近十亿血原帧已核；特别保留PU s252077是ABOUT_TO_BLOW_MOVE并仍有STEAM_ERUPTION_POWER 62，不能仅凭max_hp=999999999就套当前EXPLODE_MOVE阶段守卫。PU后续确有EXPLODE_MOVE帧与F17第五试won记录；这是反驳“所有相关尝试全败”的原始反例，不是新排序的受控收益。L9/751/YQL/KEN F17各前五次predicted_death、末次died分列；KV F17首试won与F33六试另分账。
T2/T13等其他窗口、KEN T5步法建立时点、KV T1完整题、全战回血归属、九经验逐来源消费与旧101/102/103/104/105局统计，本批没有做完整科学复验。原提案的支持/反例保留原文身份，不能因原提案写了结论就自报本批已核。八题是历史发现窗口，不是新的独立留出集，同局SL不拆成独立样本；没有从六局失败拟合统一血价/药水/终局/探索阈值。

## 当前源码与原提案缺口

只读live快照=5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。十个相关源码叶子与本批base逐SHA相同，各自last_live_source_commit均核live祖先，见source-verification.json；不把同字节但无祖先关系的提交冒称上线。
silent-held-loss保留未决弃牌下的预测拆项和actual_held_hp_loss=null；silent-sl-comparison为candidate_forecast、actual_turn_result=null；silent-selection-audit为predicted_candidates、actual_turn=null；selection_dispatch明确single_action_receipt、state_effect_verified=false、whole_plan_executed=null。combat-plan与hand/loop确有调用。这些子项已经存在，不重复实现同字段，也不把null补成真实整线结算。
silent-potion-reference明确未知持有价值与本轮/整战无药参考；silent-giant-potion及sl/attempts按已观察形状展示本体结束、自爆仍待结算。explore.anchor仍用原先存活/敌HP排序；giant_phase及giant_final_resources不是去占位排序策略已经验证。notWorseOnly在强制路径上才限制候选，其他路径允许所有未试线更差时继续探索；符合既定规则本身不作为纯bug，实际调用模式的完整结构审计仍未闭环。
本批没有足够新证据修改该策略。需要后续独立任务将整线归属/后继核验与各原提案职责逐项完成，再按已有Roy授权实现、自测和实际live流程；不新设“人定规则必须再审批”。当前保留已有子项和未知字段，未证明增益。

|源码叶子|实际live祖先提交|
|---|---|
|agent/src/reflex/silent-held-loss.ts|9d8278702dbc581b5015ba7ec9a70dc0fb94cccb|
|agent/src/reflex/silent-sl-comparison.ts|66283dd9982bdd7f480da7a4d9bfefea0572a9ac|
|agent/src/reflex/silent-selection-audit.ts|9d8278702dbc581b5015ba7ec9a70dc0fb94cccb|
|agent/src/reflex/silent-selection-dispatch.ts|fdaf787a372880b0438e73bcac7e6d2168b038ed|
|agent/src/reflex/silent-potion-reference.ts|c4670f4f416c7d93e192e889c5080e7e4e0e733f|
|agent/src/reflex/silent-giant-potion.ts|40168f4a903ae1d8c48bd03006f8fea19fd3aa3c|
|agent/src/reflex/combat-plan.ts|3f9afe3e5547c9f518923c692b5dc63c87477068|
|agent/src/sl/explore.ts|b01edf46b4b619f217d070a196e161df9fe716a0|
|agent/src/sl/attempts.ts|b01edf46b4b619f217d070a196e161df9fe716a0|
|agent/src/hand/loop.ts|6242b3a7381944436ef6d62f1a3901c1036369e7|

## 十项逐项处置

### silent-proposal-366288801d9150d9 — waiting

来源局：751FN9QM9MHQ；既有账本：silent-0079, silent-0176。
751 F17 T7同指纹实际多损10血、多打6伤已核；现有日志仍将actual_turn留null，缺整候选实际归属、notWorseOnly调用模式结构记录及受控完整后继，不能拟合血价阈值。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-efd9f83ee9e1a6dc — waiting

来源局：751FN9QM9MHQ；既有账本：silent-0079, silent-0176。
原Markdown按SHA核同；与366288801d9150d9同源但职责还含历史资源分账。缺实际结算联合验收、独立时间留出及受控整战后继，不能仅因原文相似记duplicate。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-131042659448ae74 — waiting

来源局：751FN9QM9MHQ；既有账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。
现有持牌损血拆项与未知持药价值参考有live祖先；本批未完整复验九经验逐来源消费者及旧101局分母，且没有F13不饮/留Boss的受控完整支线，保持waiting。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-990f054036609447 — waiting

来源局：KV0JHNJCKXLS；既有账本：silent-0102, silent-0019, silent-0020。
KV F33 T5删毒使当轮净输出36→29、HP均30已核；另有选诅咒动作超时后重试。缺T1完整原题核验、全战毛伤/回血逐事件归属及受控完整后继，不把少输出说成保血收益。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-e18d3f18e6cac2a0 — waiting

来源局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；既有账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。
巨兽阶段/毒水展示已有live祖先子实现；YQL毒2→8而血26/挡13/自爆41不变已核。去占位排序、自爆覆盖及提前饮药仍缺受控整战验证，不能将展示子项当整个提案已实现。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-9733bb80f445aeae — waiting

来源局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；既有账本：silent-0017, silent-0019, silent-0020, silent-0250。
原Markdown按SHA核同；阶段展示已有子实现，SL参考仍保留原排序。阶段估值、SL排序、路线休息及提前饮药联合要求未完成，缺整战或跨节点反事实。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-c51468c5e8ba6668 — waiting

来源局：KEN58SH9SLZ6；既有账本：silent-0019。
KEN七次饮用均由明确chosen/expect及槽位后继核实；技能药真实选择斗篷与匕首，未执行题面中位示例逃脱计划。缺其余随机效果完整收益归属及不喝/晚喝/留药完整对照。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-86a7db08d1a31976 — waiting

来源局：KEN58SH9SLZ6；既有账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。
KEN F17 T10同指纹实际2伤15损与4伤21损已核；T5能力延后的完整题面与后继本批未重新全读，缺受控完整后继及独立时间留出，不拟合统一探索阈值。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-e282a9131b99129a — waiting

来源局：KEN58SH9SLZ6；既有账本：silent-0021, silent-0079, silent-0125, silent-0176。
原Markdown按SHA核同；已有预测拆项和单动作回执，其actual_turn/whole_plan_executed仍为null。缺跨重规划的整线归属、能力实际兑现及受控整战后继。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

### silent-proposal-08eaa60bcc449852 — waiting

来源局：KEN58SH9SLZ6；既有账本：silent-0019, silent-0020。
KEN两次休息补27/29、事件付7、七次用药和六次75/86空栏入口已核；旧105局跨节点统计未重验，缺不饮/提前饮/留Boss完整对照，不调整跨战资源价值。

原Markdown的旧/新行为、反例、时间切分和回退条件均保留；诊断子项与父项缺口分开，没有另建重复提案或登记implemented/duplicate/shipped。

## 验证、登记与交付

本批未改生产源码或知识，tsc/vitest/cases均为null（未运行）；未做撤源码红灯/恢复绿灯，未声称测试成功。未提交、未推送、未操作live合并/版本/运维prompt/STOP；因此没有上线记录或规则双通知。回退不适用，本批没有行为变更。
只经根目录ledger.py update给本批既有账本追加报告/提案路径和复核备注；不降级旧shipped事实、不登记新的shipped、不扩独立样本。CLI退出0，16项链接实际读回且旧状态均保持；输入/回执/读回见ledger-update-input.jsonl、ledger-update.stdout.txt、ledger-readback.json。未新建游戏经验或新代码提案，code_proposals沿用本批十个已由CLI登记的原id，implementation_domains=[]。
工作树diff为空；materialize仅恢复已有Git材料，scratch由忽略规则保存，HEAD保持上述base。未将无源码情况冒造合入/版本/测试。报告路径及proposal.md供ops原调度器接收，不能把已排队当其他角色已确认。
过程错误保留：初次小写角色断言；首次打印提案历史输出过大已改成十个add行和各自原文；首次源码路径误写core/loop.ts，改用实际hand/loop.ts后十叶核验；初次非战斗combat=None的查看脚本报错，改按combat或空对象；个别工具合并输出截断后已补读所需窗口，不把截断部分当已核原文。

## 冻结流清单

|提取|流|source_size|选中行|source SHA256|
|---|---|---:|---:|---|
|v6-evidence|v6-build|64678849|0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|v6-evidence|jev-prompts|2362421673|1026|7d02792fa58a9bb25905727be297938e5ad5b9f0becf0e70d2533e2197cb7a50|
|v6-evidence|decisions|3265465412|4071|6db919390b9be30279a13b5c7fe39a46beb1584b24953952e60f3fa0bcd47844|
|v6-evidence|run-config|2391296|6|0b9778f136c6566c280e72c19ba249595d8a52a769b0c45cd377d250ca89f03f|
|evidence|states|15146919977|4167|0143725dba09092fb8d696e104dfb6aca5d7554e64b758745a1629cbe866d9ad|
|evidence|decisions|3265968801|4071|21176948689ae13020fb11f9ad7f1cafe3042e262892c4122a268edb0f2484c5|
|evidence|sl-attempts|52012080|43|dd32250cd6233b8d807ce01882d5a3291fd3e15afddf40d8e22e9ccb7723c490|
|evidence|run-config|2391296|6|0b9778f136c6566c280e72c19ba249595d8a52a769b0c45cd377d250ca89f03f|
|evidence|run-plans|10331245|21|016a541691cba6964ac5d735380a8caaf87fa9553b5e473f97e420308b807dfb|
|evidence|brain|1195211187|130|3540d904256b5977cc0106ca58002d39835f48ff43071378d5e28ade8644f678|
|evidence|v6-build|64678849|0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|evidence|jev-prompts|2362421673|1026|7d02792fa58a9bb25905727be297938e5ad5b9f0becf0e70d2533e2197cb7a50|

最终验收：ledger CLI退出0，16项实际读回；本批scratch敏感信息扫描退出0、发现0；最终文件与工作树检查见completion-checks.json。

# 静默猎手本批策略提案复核

本批十项均保留 waiting；没有新的源码修改、提交、live 合入、版本或成功测试声明。已核的局部血价和阶段事实支持保留原限制，不能据此制定新的探索阈值、药水持有价或宣称收益。具体逐项处置见 proposal.md 和 result.json。

## 身份与基线

task=strategy-proposal，character=silent，batch=20261021-131301-strategy-proposal。根 learn.json 对应行实际 reason=proposal，绑定本树及十 proposal_ids；无 research_request、implementation_request、proposal_repair。普通专题文件属于另一批20261010-150327，不满足专题绑定，不转为专题。只处理派来的十项，未领取其他项、未派下级 agent。

初始 git status --short 为空，HEAD=526d34e7b2fa2a02be03575bb52dde4d98a870e1。按普通任务执行 git merge --no-edit main，返回 Already up to date；本报告 base 仍为此40位提交。后续 main 变化不混入本批。

六局 runs.jsonl 原文均 character=SILENT、A10、ended非空，最终整局均未获胜；根记录与逐行offset/bytes/SHA保存在 runs-verified.json。初次大小写严格断言因原字段为大写SILENT而失败，随后用角色归一化重新检查通过，不把该脚本断言当对局/代码失败。PU80 F17第五试胜余2HP另列，整局失败不抹去赢战。

本任务未联网、未运行play、未读取游戏二进制或其他角色知识库。历史本角色Jev题面中附带的旧跨角色统计仅作为原题面内容保存，未追读其来源或计成本角色证据。按任务要求使用普通/high；未核本线程原生turn_context，不报告档位已核生效。未设置仓库git身份或修改登录/权限/运维prompt。

## 提案原文与账本

十条队列原add行及本批最新状态分别保存在 proposal-originals.json、assigned-proposals.json。十份原文全部读取，并核原add登记的proposal_sha256一致，副本在 originals/，出处见 original-provenance.json。六条原exp路径已不存在，使用原114302-s2保存的精确原字节副本，未重写原文、未把旧路径缺失判成无证据。

本批链接既有16条silent账本，全部历史状态已经shipped；本批只通过根ledger.py update追加本报告/提案链接和复核note，不降级历史状态、不创建重复经验、不将十项提案标implemented或shipped。输入及CLI回执为 ledger-updates.jsonl、ledger-update-receipt.txt；旧原始行及冻结字节切点在 ledger-original-rows.json，本角色折叠值在 ledger-folded-selected.json。

## 冻结流与身份

已运行指定 evidence_summary、指定四流 v6-build/jev-prompts/decisions/run-config 提证和默认提证。摘要仅作定位。两提证各自冻结读取开始时source_size；本局历史选中原行一致，文件持续增长带来的不同切点与整源SHA分别保留，不称两次整源完全相同。

身份仅来自run_id、state.run_id、fingerprint.run或run-plans.run；Jev精确decision_id联接也由原始decisions核对，冲突拒收。没有用正文提及、时间邻近或question_id相似归局。连接同局状态时再要求fingerprint和observed_ts完全相等；时间只定位已核身份内的状态。初版窗口多带了下一局首帧，已从state-windows.json排除；它不参加任何本局结果。

默认提证manifest如下，完整invalid/gap/identity出处见 evidence/evidence-manifest.json；四流冻结点另见 v6-evidence/evidence-manifest.json。

| 流 | 冻结字节切点 | 冻结前缀SHA256 | 本批行数 |
|---|---:|---|---:|
| states | 15185749477 | 58d931994abe06151eff49e50831e27e409f1e9e8d92075da489f35bf3486001 | 4167 |
| decisions | 3292227076 | 2c3236ab1ac783ddc0f9a52c801adf0f0ec97d8a7560504e55a4d5855536e01c | 4071 |
| sl-attempts | 52316568 | f1653ecd1ec97b95c3afd3f3b93a507b717425955fec99d3d669e2d02f795e4d | 43 |
| run-config | 2403354 | 5ab13e0e876ea2c5b0b3a6ebc58dc6c6253453b7bc5cff04cdb0a1530c7b1d2d | 6 |
| run-plans | 10347607 | e871daa0e7214e9b21f0b1d2be046775f7a3f3414f6b3cb1ab3f6fe7611afddd | 21 |
| brain | 1201487463 | 48e6242af191529da470b6e75a7acfb16145d9c266e9d094654bcf390fbfb5ff | 130 |
| v6-build | 64678849 | f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da | 0 |
| jev-prompts | 2378327528 | e99ce726839c7c2fd5b26ac677056cf0a46c1de4ba24e48a94aed8d3f5a116e9 | 1026 |

本批共4071决策、4167状态、1026条Jev请求。各局的decisions/states/Jev计数按派发顺序为615/624/137、669/686/104、571/582/253、635/653/251、1033/1064/172、548/558/109。全部原始包保留每行offset/bytes/SHA和identity。

V6-build冻结64678849字节、660行，六局均no_match。entries/jev_answer/fallback/unknown不可观察，不能填成0或借其他局补齐。六条原run-config均无V6字段，不能将字段缺失称作显式off；Jev enabled=true/model=jev-latest/context=v1。原始配置相关字段在config-inspection.json，完整原行在提证包。V6是否采用、正式发布、下一局消费和自然收益本批都不作推断。

全源invalid JSON：states2、decisions2、brain2、Jev1；这些行不能建立本批身份，未修补或归局。各流incomplete_lines=0不代表题面机制已知或模拟未降级。全源unknown/unmatched计数和最后五个gap_refs保持原manifest；五个引用只是有限索引，不是完整覆盖。提证对象回执pending_host_seal=true/deferred_errno=18表示宿主共享封存待办，本地原文实际存在，不称已共享封存。

## 完整读题覆盖

实际语义读取8条Jev原始请求、9个question key：完整request.state、questions全部选项、answers/置信度、error缺失值均核。重复题先读完整基题，再读取逐叶精确差异原值，相同部分由精确相等校验复用，未把摘要当原题。原decisions另核chosen/result/gate_reject/selection_dispatch、SL原答与替换。表中均为原始Jev行引用，完整decision_id与identity出处在selected/及question-coverage.json。

| 决策行 | Jev行 | 局/层/回合 | offset | bytes | SHA256 |
|---:|---:|---|---:|---:|---|
| 272531 | 27740 | 751FN9QM9MHQ F17 T7 | 398408080 | 13503 | a939442365fd65efe504a8b23895a31aa824361b7edc4314f98bd183e45ba2a1 |
| 272652 | 27770 | 751FN9QM9MHQ F17 T7 | 398747334 | 16452 | de09b2d48996874de68bc1bc0f44560ba3c827066aa8252cbe0b420debcf3124 |
| 273480 | 27913 | KV0JHNJCKXLS F33 T1 | 400805600 | 17960 | d06026daaa83ae0b82d9aeb537ee83a2077691099dafef2c68417ba409e7308a |
| 274087 | 28173 | YQL8RZ8BWN1E F17 T10 | 404305929 | 13653 | fb25cd458d94d92f7c9c8db4a34580967c2adfa52150a5d185c459214f243bd3 |
| 274267 | 28209 | KEN58SH9SLZ6 F15 T1 | 404727232 | 21091 | 8bd1e0d9e70bda430479a48f9f91a40714dad1090d750c0790cb761c546c48f6 |
| 274272 | 28211 | KEN58SH9SLZ6 F15 T1 | 404771254 | 13500 | 8403d3a0a440a33db1df96ddedfcbe8dbf34913af2ae46a766894675a836cf33 |
| 274505 | 28257 | KEN58SH9SLZ6 F17 T10 | 405376179 | 17673 | cddbcc8a6dd676323d16578339e37923f643c30904c3036d4365d74a2bed3571 |
| 274568 | 28271 | KEN58SH9SLZ6 F17 T10 | 405594035 | 19251 | a487fcb03ef4577e2dbcee298fa879970c0a6b72bbbec2b0e27b67e6996176a4 |

剩余1018条请求未完整语义读取，每行引用和未读原因全部在question-coverage.json，不能以最后五条代表全部题。包括751 T2/T13与F13用药完整题、KV T5及首试T1、L9/PU完整战斗题、KEN T5能力对照和T2护栏、前五瓶药的原始选线/随机选牌题、F15抽牌后的完整重问题。本批不把前批读题数移作本批覆盖。selected/273474虽已定位保存，本批未完整读，coverage仍false；不冒充已核。

相关窗口只将原始字段按路径投影供人工读取，完整原row仍保存。8组状态/后续决策窗口见state-windows.json；七次药水动作和14帧前后状态见potion-actions.json、potion-raw-states.json；L9/PU三个SL原件见phase-sl-originals.json。113个唯一原始行已按原source/offset/bytes实际seek读回，SHA和JSON值均相等，详见raw-readback.json。未把整份states输出给模型。

## 已核局部事实、执行与反例

1. 751FN9QM9MHQ F17 T7（silent-0079/0176）：272531/272652指纹与questions相同，Jev均plan2，第二条SL以打击替防御+，B2 .103→.013、配对差−.09/SE .0088。states278576—278581为45→32、敌121→109；278697—278702为45→22、敌121→103。多6实际伤害付10血；两轮各比题面保守19/29少6损。272532/272653生存者动作pending后进入弃牌，272533/272654均弃呼唤，再由272534/272655分别执行防御与打击。不能只看第一步匕首雨相同就说整线相同，未决弃牌上界也不是多损血的增量。六次同局重试不是六个独立验证样本。
2. KV0JHNJCKXLS F33末试T1（silent-0102/0019/0020）：273480完整原题两线损血均0，究极打击28伤与结束14伤，整战模型均0/1200且并列。Jev选plan1 (.96概率/.92信心)，SL avoid最终chosen=end_turn、result=completed。states279542→279543/279545见敌399→385、玩家46不变。随后273481诅咒选择超时，273482同选项重试completed；错误保留，不能据timeout断言状态未改变。本批没有重验T5两线、全战206毛伤/176净伤及路线资源分母，不将旧数字当本批复算。
3. YQL8RZ8BWN1E F17末试T10（silent-0017/0250等）：274087对应Jev同时有play/survival，药水明确simulated=no，答p0->e0且lethal；chosen毒水、completed，274088结束回合。states280160→280161槽0清空、毒2→8，HP26/挡13/自爆41均未变；280162真实GAME_OVER/HP0。26+13−41=−2是当时缺口，死亡截断0不是只有26实际需伤；新增6毒不能算减伤6或本体进度。更早喝或留药的整场反事实未知。
4. L9SGRBB5R698 F17 SL681（silent-0250）：本行末态T13本体28/250；999999999来自target.anchor对首试T14的引用，不混成该行末态。PU80F84P6HPN F17 SL717引用同T17两条占位血999999981/999999989；SL719第五试result=won/end_hp=2，保留胜例。后续动作变化、未做受控重放，不把该胜例归因新排序或提前饮药。
5. KEN58SH9SLZ6 F15 T1（silent-0019/0020）：274267原题p1为发光水后重算，中位示例不是实打；Jev p1、chosen槽1、completed，states280348→280349槽1清空。后续274268—274271实际中和/打击/步法/刺击，与示例分账。274272技能药原题p0是12次随机中位参考，Jev p0，chosen槽0但result=pending (unstable)；states280354→280355槽0清空并进入选择，实际选项是斗篷与匕首/墨之刃/萎靡，不是中位示例逃脱计划。274273选斗篷、274274打出、274275小刀、274276结束；到280359仍46HP。旧题成本0明确no_table，不能推出持有价值已测为0，也不能把已喝零损说成不喝零损。
6. KEN F3T2/F4T1/F5T2/F11T1–2/F15T1七次use_potion，discard_potion为0次已记录动作。三次随机药result=pending，其余completed；14帧对应槽位均清空，稳定血清后RETAIN_HAND=2、速度药后DEXTERITY=5/SPEED_POTION_POWER=5为原状态值。本批未全量审阅前五瓶随机收益、留Boss支线和旧105局分母；槽位耗用不证明七瓶各自的完整收益。
7. KEN F17 T10（silent-0021/0079/0125/0176）：274505/274568指纹与questions相同，Jev均plan4；后者SL改第二呼唤为匕首雨，B2 .385→.127，差−.2583/SE .0132。states280588—280592为37→22、敌82→80；280651—280655为37→16、敌82→78。实际2伤/15损与4伤/21损，符合局部多2伤花6血。后继不同，不单归整战时点或通关胜因；T5省血却延迟能力的旧反例保留为待复验，不用“只保血总更好”补规则。

上述窗口原decisions没有gate_reject与selection_dispatch字段；只记字段缺失，不能当已通过闸或已完成现代selection_dispatch审计。Jev error缺失也不等于动作成功；模型低信心、no_table、预算降为3回合4样本、随机中位值与真实选择均独立保留。

## 现有源码与实际live祖先

只读live HEAD=5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532，7条相关路径与本树字节一致，所列来源提交均核为live祖先，详live-source-check.json。候选资源比较0e4fe4df89a06682468e0e4716c12126e76369d5、候选快照66283dd9982bdd7f480da7a4d9bfefea0572a9ac、持有价未知/无药参考c4670f4f416c7d93e192e889c5080e7e4e0e733f、残壳药水事实40168f4a903ae1d8c48bd03006f8fea19fd3aa3c、阶段资源展示b01edf46b4b619f217d070a196e161df9fe716a0均是既有子实现，不是本批新提交。

当前候选比较明确scope=current_turn_prediction/candidate_forecast、execution=unverified/actual_turn_result=null，不能替实际整线结算；resource_comparison没有独立手持呼唤/未决弃牌血价及notWorseOnly值。explore.ts在强制notWorseOnly之外仍允许从全部更差的未试线选择，巨兽参考仍先按存活回合和原残血排序。本批未完成剩余结构拆项的原答/护栏/弃牌/重规划联合回放；这类诊断本身无需等收益证明，但已有部分覆盖不等于全部职责完成，未验证的剩余工作不能冒称duplicate。

策略部分则缺保持其余后轮不变的整战对照和独立留出，不能仅凭局部血价关闭探索或定留药参数。十项原提案是诊断、实际归属及策略/统计复验的复合要求，逐项waiting理由如下。

- `silent-proposal-366288801d9150d9`（silent-0079, silent-0176）：已有候选资源诊断，但缺原答/护栏/SL/重规划后的完整整线归属、notWorseOnly结构值及未决弃牌损血拆项联合验收；本批只核T7局部差额，不能拟固定血价。
- `silent-proposal-efd9f83ee9e1a6dc`（silent-0079, silent-0176）：已有候选配对差和资源字段，不代表真实整战结算；缺完整后继受控复验及独立时间留出，不能将六试当独立胜率样本。
- `silent-proposal-131042659448ae74`（silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176）：缺表持有价未知与无药参考已有子实现；九经验全部消费者和旧101局分母本批未重验，缺同盘不喝/留到Boss的完整分支，保留原药水与弃牌边界。
- `silent-proposal-990f054036609447`（silent-0102, silent-0019, silent-0020）：本批补核末试T1原题、SL结束回合及385血后态；未重建T5两线与全战回血/毛伤事件的完整归属，缺保持后续一致的整战比较。
- `silent-proposal-e18d3f18e6cac2a0`（silent-0017, silent-0250, silent-0011, silent-0027, silent-0046）：本体/残壳与当前自爆资源展示已有live子实现；SL排序仍沿既有规则，缺新排序、提前用药的受控整战结果，PU80第五试获胜不可归单步。
- `silent-proposal-9733bb80f445aeae`（silent-0017, silent-0019, silent-0020, silent-0250）：阶段展示已有子实现；阶段价值、SL参考排序、路线休息和提前饮药的联合验证未完成，缺提前喝/留药完整对照。
- `silent-proposal-c51468c5e8ba6668`（silent-0019）：已核七次槽位耗药及F15实际随机选牌续步；F15不饮、延后饮和留Boss完整分支缺失，不能从已饮零损推出不饮也零损或校准持有价。
- `silent-proposal-86a7db08d1a31976`（silent-0079, silent-0021, silent-0125, silent-0005, silent-0176）：本批核T10同盘真实2伤15损与4伤21损；T5能力建立窗口、T2护栏及完整后继本批未重验，缺独立留出，不据此关闭更差线探索。
- `silent-proposal-e282a9131b99129a`（silent-0021, silent-0079, silent-0125, silent-0176）：资源及候选比较已有子实现；跨重规划的完整整线归属、能力建立时点与受控整战后继未联合完成，不能把原题选择当完整执行。
- `silent-proposal-08eaa60bcc449852`（silent-0019, silent-0020）：已核七次实际饮药，但旧105局统计、两次休息至入口资源链本批未完整重验；缺不饮/提前饮/留Boss整战对照，不新增固定留药阈值。

## 交付与未执行项

本批只保存报告、提案原字节、证据及CLI链接；正式知识、运行代码、数值、日志和开关不变。code_proposals填十个原CLI ID，无新ID；implementation_domains=[]表示没有本批新实现。没有源码变更，tsc/vitest/cases均null，未运行撤源码红灯/恢复绿灯、不借历史成功充本批测试。未进入live合并锁、未新建eval版本、未登记shipped或发实际上线双通知；merged=null。证据提取和脚本断言通过不等同生产测试或科学验收。

交运维proposal.md/report.md/result.json；工作树最终干净与基线、完整原文/产物指纹、安全扫描及身份重核见final-verification.json、artifact-manifest.json及gitleaks回执。父学习要求、异议ACK、提案等待和自然收益继续开放，不因本次报告结束关闭。

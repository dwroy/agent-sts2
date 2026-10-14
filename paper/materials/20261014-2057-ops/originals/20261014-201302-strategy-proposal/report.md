# 静默猎手策略提案回报

记录时间：2026-10-14 20:26:02 CST（写前已执行date）。本批20261014-201302-strategy-proposal，silent；base 3db099b16eb2477c6ee5c839b0c8bf7f1c5c91da；锚点：MTQ0EUBJ3R6T,7X0W3U8TVA2A,KFRDELW2TH2P,GXNKW8X1XYJP。

只消费本批十原proposal_ids，无proposal_repair、research_request或implementation_request。旧牌组大小专题在另一批，不匹配，未改根请求/旧父请求或领取其他ID。开工树干净，git merge --no-edit main实际返回Already up to date。首轮沙箱封装因其他工作树回收的失效路径失败，原日志保留，重试成功，未发生Git冲突。

十原Markdown均已读取且SHA匹配专用队列；31关联账本均silent。本批不覆盖原文、不重复登记提案ID、不重复历史复盘。已有窄模型和审计消费者都核现状；没有把缺整战反事实当作阻止已证机械修复的理由：相关已证子项当前已有，未核完整范围不冒称交付。本批不新增源码或策略参数。

## 冻结证据与消费者

4,489条原记录全部按source offset/bytes/SHA256读回，与冻结JSON相等。日志只读，各流抽取开始时冻结截点；不把正文提及当所属局、不重编号原行、不以0行断言缺日志。

| 局号 | states | decisions | SL | config | plans | brain | runs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| MTQ0EUBJ3R6T | 440 | 424 | 5 | 1 | 4 | 23 | 1 |
| 7X0W3U8TVA2A | 461 | 445 | 1 | 1 | 4 | 31 | 1 |
| KFRDELW2TH2P | 620 | 587 | 8 | 1 | 6 | 35 | 1 |
| GXNKW8X1XYJP | 673 | 649 | 7 | 1 | 10 | 48 | 1 |

四局runs均SILENT/A10、失败，原code依派发顺序为ceb74207+dirty、047c809e+dirty、a73ce7cc+dirty、b1714285+dirty。run-config记录的开工源码commit可定位，dirty_files只列生成知识JSON；没有冻结当时全套知识和后续变更，不冒称整个旧运行树已重建，也不把+dirty直接断言成策略源码修改。

离线消费者排除4条无decision_id或observed_ts的原元数据：KFR282561；GXN283515/283525/283581。原行/SHA及内容保存audit-input-exclusions.json；完整抽取仍含这些行。全流解析失败为states2/decisions2/brain1，是源文件扫描计数，不据此断言这四局缺了相应行。

| 局号 | 审计动作 | 题段 | 可见区间 | 可核整轮 | 未核整轮 | 同题可比预测 |
|---|---:|---:|---:|---:|---:|---:|
| MTQ0EUBJ3R6T | 424 | 68 | 156 | 25 | 50 | 57 |
| 7X0W3U8TVA2A | 445 | 119 | 36 | 7 | 64 | 93 |
| KFRDELW2TH2P | 586 | 180 | 224 | 18 | 85 | 174 |
| GXNKW8X1XYJP | 646 | 116 | 178 | 20 | 83 | 98 |

2,101动作记录全部唯一匹配原timestamp+fingerprint状态；共483题段、594可见相邻区间、70可核整轮端点、282未核整轮、422同题可比预测。原行不连续可能来自其他局交错，unknown不等于对局不存在。工具按合同始终把actual_full_candidate_result/actual_rollout_best留null；0个已认证候选不等于0次实际完成，不因保守合同诊断新游戏bug。

六个KFR真实奇巧选牌帧调用handTrickSlothFacts均给2剩余手动名额上界/能量，continuation_verified=false；42个T7同修饰组合帧调用observedDemonPoison均给6，含饮药后帧，不是42饮。该既有函数对旧固定数据读回不等于新增自然采用或策略收益。本批没模拟整战、不调LLM/网络/play。

## 已有实际live子项

核查live切点HEAD d886d3a9bf9996ef178dbd83e6bbff5b30b3303f。16路径均核实际祖先、对应当前blob、live该路径无未提交修改；13路径base/live blob相同。card-model、rollout-live、run-journal只差Roy/Dai注释字样；SHA仍分别保存，不把不同blob说成逐字节相同，不认证整仓库等价。精确源码差分保存在source-differences.patch。

| 路径 | 实际live源码祖先 |
|---|---|
| learner/audit-selection.ts | 6f3f783941270ac182237c46068097ff67e85907 |
| learner/lib/selection-execution.ts | cf72bd21148059f111f760cc98a727369e34a47e |
| learner/lib/selection-observation.ts | cf72bd21148059f111f760cc98a727369e34a47e |
| learner/lib/selection-turn.ts | 9b87d54f097d84521152e6cca8d6072af8140394 |
| learner/lib/selection-terminal.ts | 04921bd785ac6838066522f91ea0bb6ab95cb6a1 |
| agent/src/reflex/silent-selection-audit.ts | 05cd292c6f01bb31e406473d3a9843e659d62b93 |
| agent/src/reflex/silent-selection-dispatch.ts | bade647f9fe4c9103b40e2f26b26296692ad24b7 |
| agent/src/reflex/silent-hp-guard-audit.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b |
| agent/src/reflex/silent-sl-resource-comparison.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b |
| agent/src/hand/screens/silent-hand-trick-facts.ts | 8bb53d6342b7e9a2adf96de231b53c36eaa943de |
| agent/src/reflex/silent-demon-potion.ts | 8bb53d6342b7e9a2adf96de231b53c36eaa943de |
| agent/src/reflex/card-model.ts | 46d5fb8397edb84d9495ff61a21bed22b6bed7f1 |
| agent/src/reflex/rollout-live.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b |
| agent/src/memory/run-journal.ts | 52d7f343f5f183670dc9d0c0d847bf6a15420aae |
| agent/src/reflex/combat-plan.ts | a9fcf33ca4c204d03cfc310c7f7ced61f196f964 |
| agent/src/hand/loop.ts | a9fcf33ca4c204d03cfc310c7f7ced61f196f964 |

源码提交、Git blob与SHA详source-audit.json。已有祖先都是子项证据，不是本批新提交；没有把整个宽提案登记implemented/duplicate。旧回执曾有live冲突保留历史，本批没有合入尝试/冲突，不沿用历史冲突为当前waiting理由。普通蛇咬8毒、恶魔毒药6层和候选审计等已存在，后续不要重复实现相同子项。

## 十项逐项处置

- **silent-proposal-f54e8de2381c1250：waiting。** 已有候选/派发/离线断点审计已读回；F11选牌后重问使原plan1未完整执行。缺完整候选执行绑定及同窗口实线排名，宽提案保留waiting。 证据：MTQ0EUBJ3R6T F11T1，decisions282138—282140、states288592—288597；F23末试T3，decision282434。 账本：silent-0125。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-763a4b9d9f17b815：waiting。** 蛇咬8毒及磨蚀窄子项已有live源码，旧缺模理由已纠正；十四项临时属性、持牌伤、能力/药水时点的联合消费者校准仍不完整，不能整包duplicate或扩未见修饰条件。 证据：7X0W3U8TVA2A F30T3、F31T1/T2/T5/T13；MTQ0EUBJ3R6T F17T4—T8、F20T3、F23T3。 账本：silent-0005, silent-0006, silent-0011, silent-0013, silent-0044, silent-0046, silent-0053, silent-0080, silent-0087, silent-0189, silent-0214, silent-0222, silent-0235, silent-0253。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-19a5cff2094e2d8f：waiting。** 暂死重接输入子项已在live；仍缺生命周期输入到完整实际终局的联合校准、冻结知识下整战对照。24/24死亡不证明实盘必死或替线更安全，宽终局项waiting。 证据：7X0W3U8TVA2A F31T5/T6/T13；MTQ0EUBJ3R6T F23末试T3，decision282434。 账本：silent-0021, silent-0064, silent-0079, silent-0133, silent-0125。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-3540bf4360bf80af：waiting。** HP增加边界子项已有live；F19/F20赢战耗血及未到F24已核。缺逐源资源事实进入路线/休息消费者的完整固定读回，不能整项duplicate或拟合安全血线。 证据：MTQ0EUBJ3R6T F19T1—T3、F20T1—T7、F23；7X0W3U8TVA2A F30—F31。 账本：silent-0019, silent-0020, silent-0243。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-0ea5c0b9c030fdd6：waiting。** 奇巧名额/能量及恶魔窄毒药6层已在live并读回；完整合法后继和对象收益兑现仍未认证，缺提前饮药/换对象整战对照，宽提案waiting。 证据：KFRDELW2TH2P F33六试T7，decisions282864/282899/282933/282968/283001/283035；末states289533—289538；反例F28T2。 账本：silent-0274, silent-0247, silent-0027, silent-0016。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-f915ec544ab94b6e：waiting。** 已核同盘多10伤/多损6及F12生成牌后的重问断点；缺完整执行绑定与同输入整战校准。两条实线均失败，不据此调SL权重，保持waiting。 证据：KFRDELW2TH2P F12T1，decisions282578/282579；F33首/第三试T6，states289339/289414→289345/289420，decision282929。 账本：silent-0079, silent-0125。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-8fb51933639faf90：waiting。** 恶魔毒药6层窄消费者已读回，旧仅双boss理由已失效；七项药效/能力的联合多轮校准和覆甲完整减层条件仍缺，不整包duplicate、不改药水时点或持有价。 证据：KFRDELW2TH2P F28T2；F33六试T2/T4/T5/T6/T7，账本0276/0277/0278。 账本：silent-0005, silent-0006, silent-0027, silent-0189, silent-0276, silent-0277, silent-0278。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-b3bc0eb09211af6c：waiting。** 奇巧名额、毒药输入与阶段审计子项已有；缺可执行后继到实际终结全链、换对象/提前饮毒的整战对照，不能拟合终局权重或关闭宽提案。 证据：KFRDELW2TH2P F33六试T7、首/第三试T6；F12T1反例，末states289533—289538。 账本：silent-0021, silent-0079, silent-0102, silent-0247, silent-0274。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-fdc3a505fe5e1a55：waiting。** 已核赢战血价及实际入口，HP边界记录已有；缺分源事实到路线/休息题面的固定消费者对照，以及替路线/休息锻造完整结果，保持waiting、不改阈值。 证据：KFRDELW2TH2P F28T1—T5、F30T1—T6、F32休息、F33开场。 账本：silent-0019, silent-0020, silent-0243。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

- **silent-proposal-5a95725089f53cd8：waiting。** 已读回复活后3/13HP、0/7挡及逐槽观测，两个整轮端点仍有重问且两线均败。缺逐击复活帧、完整候选归属和逐源资源消费链，宽审计提案waiting。 证据：GXNKW8X1XYJP F35/F38/F40/F42/F44；F45第2/4试T2—T3，decisions283641/283680/283690/283691，states290160/290165/290201/290206/290212—290214。 账本：silent-0019, silent-0079, silent-0005, silent-0016, silent-0087, silent-0027, silent-0030。原文SHA、反例、旧/新边界、预期行为与验证见proposal.md对应段。

## 验证、记录与交接

33项固定事实断言相符、4,489原行逐字节读回、十原MarkdownSHA与16源码叶/祖先均已核。无源码改动，未进行撤源码/恢复测试、未运行tsc/vitest，tests三个字段均null。没有新提交、合入、eval版本、上线记录或shipped，不制造成功测试/行为发布。

学习账本只经根目录ledger.py update追加本批proposal/report链接与复核备注，保留旧claim/status/evidence/first_run/version，未改原shipped状态，不新造提案ID。CLI输入、输出与回读验收另存本目录。队列状态交启动器消费report.json的十个proposal_results，不手改队列或learn.json。

交运维提案：/home/dw/Projects/agent-sts2/learner/runs/20261014-201305-strategy-proposal/proposal.md
报告：/home/dw/Projects/agent-sts2/learner/runs/20261014-201305-strategy-proposal/report.md
JSON：/home/dw/Projects/agent-sts2/learner/runs/20261014-201305-strategy-proposal/report.json

保留十原ID的waiting及未完成学习父要求；既有窄子项均有真实live祖先，本批未宣全部入库或大脑已采用。没有实际新规则上线，不新写Roy双通知。不读其他角色知识、key/.env或游戏二进制、不联网、不运行play、不另派agent；未改知识、任务模板、prompt、其他角色行为。

限制：完整候选连续执行/逐击复活及未截断入伤未认证；旧运行知识未全冻结；同局读档相关；替路线、奇巧换对象/顺序、提前饮药缺整战受控对照；十四/七项组合未完整联合消费者校准。少扣血、多保10血、422预测排名或70整轮端点均不当真实最优率/勝率收益。工具保守留空本身不是缺帧证明。

收尾验收：31条本批账本链接已由根ledger.py update追加并读回，旧claim/status/evidence/first_run/version全部保持；全账本476项、0问题。指定材料目录gitleaks --redact扫描退出0、发现为空；不冒称源码回归测试。派发身份仍相同、HEAD仍3db099b16eb2477c6ee5c839b0c8bf7f1c5c91da、工作树git status为空。报告JSON十原ID各有非空waiting原因；无新源码/提交/live合入/行为号。工具编排曾有一次写盘前语法错误，未改文件；修正后生成与JSON校验完成，原会话失败日志保留。

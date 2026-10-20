# 静默猎手策略提案补证报告

记录时间：2026-10-21T00:51:08+08:00。本批 `20261021-003744-s2-strategy-proposal`，基线 `cc87015b78fa3f430e7a344d2edb01bc59e148dd`。

结论：十项已领取提案均保留 waiting。没有新的源码/知识修改、提交或 live 合入，fixes=[]、merged=null。已存在的窄实现不能代替宽提案的完整科学验收；本批没有可据以改变药价、SL资格/探索排序或终局权重的受控后继证据。

## 派发与身份

开工 git status --short 为空；git merge --no-edit main 返回 Already up to date，HEAD 未变。dispatch.json 保存根 learn.json 本批行：task=strategy-proposal、character=silent、reason=proposal、工作树及十项 proposal_ids 匹配，无 research_request/implementation_request/proposal_repair。普通专题入口 notes/strategy-research-silent.json 绑定旧批 20261010-150327，与本批不匹配，因此只处理本批十项，不读另一专题或扩展整条队列。

README、最新 STATE-2026-10-19、decision-log 末尾及学习协议/代码提案协议已读。STATE 中停局是历史检查点，decision-log 后续已有恢复与R406记录；本批不接管运维。不运行 play、不联网、不派下级 agent。运行强度未修改账号、共用配置或在途会话；没有取得本线程原生 turn_context 回执，不自报档位已生效。

runs-verified.json 保存 runs.jsonl 原始字节引用：十局都有 ended，原值 character=SILENT，规范化为 silent。F4QKG4J1AJJZ 为A9，其余九局A10，均原始 victory=false；这不说明每次SL尝试都实际死亡。最初按小写直接比较的本地断言失败，改为规范化核验后10/10通过，未改原日志。

## 冻结证据与覆盖

先按要求运行根 evidence_summary.py，再运行本树 extract_evidence.py 两次；三个扫描均自然结束0。摘要只作索引，初始材料仅摘要/派发提案/账本。未用摘要最后五条代完整覆盖。冻结源的原行 offset/bytes/SHA256、identity 与 source_size 均在两个 evidence-manifest.json 及逐行 evidence 中。

|提证目录|流|冻结字节切点|冻结前缀 SHA256|
|---|---|---:|---|
|v6-evidence|v6-build|64655258|3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234|
|v6-evidence|jev-prompts|2211469149|c1f56d232cf382d17e636be7e6d137131085290fab56f3951ef60143a74134a7|
|v6-evidence|decisions|3024099005|cef41797b2a3c019e1fea7f98a36304583ef7ad3ef8c9bcb509c3b04e2265ee1|
|v6-evidence|run-config|2276751|7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb|
|evidence|states|14787985215|b509e4457250154c41d97257e1997a001ae117c55db8bf1915a9e00741a6ce21|
|evidence|decisions|3024232333|101b9407d43d7f36c93a2670ee11b978c1724a1b9b004aa5c500da631b4602a3|
|evidence|sl-attempts|50187049|e6dd3f528787fa03b936f9f3367baacc1410c9fb889cf5fa99f44d56df655b49|
|evidence|run-config|2276751|7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb|
|evidence|run-plans|10154299|dbc7b5b96e590ff126d1d83dfdcd735b3ec00648022c6433da88184e888a7b77|
|evidence|brain|1133049277|ebfbaf8cecdbd0e7c5a47d488448f7827327d00519dcdf470e8152c00f2064ac|

两次 decisions 切点因日志追加而不同；本批匹配计数均为6415行，未把后截点替换早截点。v6-build源存在且扫描623行，但十局每局均no_match；不能写成源不存在、entries=0、jev_answer=0、fallback=0或unknown=0。十局run-config原文均无v6字段，属历史字段缺失，不能推出显式off。本批无V6 entries/jev_answer/fallback/unknown可逐项解释的匹配行，这些量记未知/不适用，不能据此证明发布、消费或收益。

Jev精确关联1676行，均explicit_run；逐行identity同时保留decision_ref。本文从原始decisions精确decision_id定位七题，完整request含state、instructions和全部候选及answers/error均核验。TXZ两题、WQZ T9两题的questions完全相同；分别实读首次完整题面及第二题全部变化字段，未省略不同字段。完整原件在question-<decisions原行号>.json与jev-prompts-reviewed.raw.jsonl。

question-coverage.json逐题列出全部1676题的run、decision_id、原始行引用、问题键、answer/error、是否全文读过及未读原因。全文读7题，其余1669题仅机械索引，原因是非本次七个关键窗口；没有声称整批逐题或全机制覆盖。其他局只对本项容量 transitions 做原始状态核验，没有完整读所有相关Jev题面，也不据此关闭生成后的最终派发/保留联合提案。

冻结前缀中jev-prompts有1条invalid_json，decisions有2条，states有2条，brain有2条；各流无截断行。它们的原始gap引用保留在manifest，无法将不可解析行归本批或当零。本批选中Jev行无记录error，但不能据此宣称全局无错误。decisions全源另有1934 unknown_identity、1413 unmatched_decision_id，未借正文、时间相近或question_id相似字符串补所属局；identity_gap_refs只是最后五个例子，不是完整未知清单。

raw-recheck.json记录199条已按原源seek读回、逐条核offset/bytes/SHA及冻结切点的引用（另有后续补读见supplemental-recheck.json）；只抽取相关窗口原字节，不把全份states送入模型。原始副本*-reviewed.raw.jsonl保留，结构投影在reviewed-windows/cunning-transitions/resource-endpoints.json。源拥有身份先核定，时间仅用于同局内定位；不由时间建立所属局。

## 七题：题面、原答、派发与后果

所有七题gate_reject与selection_dispatch在原行均无字段，不能把字段缺失写成确定未拒绝/全序列成功。除技能药水返回pending外，所读对应首个动作result为completed；整轮执行靠后继状态核验，而非将首步completed当作全计划成功。Jev request、answers、error与decisions/SL覆盖分开保存。

|decisions行|局/层/回合|原始Jev行|原答与实际路径|后果及限制|
|---:|---|---:|---|---|
|274267|KEN58SH9SLZ6 F15 T1|28209|原答p1发光水，chosen use_potion slot1，completed；原手7张变10张、HP46/能量3未变。|见下文，不把模型数字当收益|
|274272|KEN58SH9SLZ6 F15 T1|28211|原答p0技能药水，chosen slot0，pending；后继CARD_SELECTION、实际斗篷与匕首0费建立12挡，T2仍46。|见下文，不把模型数字当收益|
|275342|TXZ6RVMQA09D F48 T6|28424|原答plan6咕嘟冒泡+带毒刺击，首步completed；T6 HP48→45，敌460→424。|见下文，不把模型数字当收益|
|275383|TXZ6RVMQA09D F48 T6|28446|原答同plan6，被SL替为咕嘟冒泡+羽化；T6 HP48→48，敌460→433。|见下文，不把模型数字当收益|
|275894|WQZVENQ7DTRP F33 T9|28628|原答plan2侧步/逃离/防御，completed；26→13，敌184→160。|见下文，不把模型数字当收益|
|275960|WQZVENQ7DTRP F33 T9|28663|原答plan2，被SL改飞镖/侧步/逃离；26→4，敌184→145。|见下文，不把模型数字当收益|
|276139|WQZVENQ7DTRP F33 T7|28764|原答plan4双防御，被SL改逃离/防御/小刀/生存者；26→22，敌245→221，沙坑先4→5、次轮4。|见下文，不把模型数字当收益|

KEN（silent-0019/0020）：F15T1完整题面含不饮线、两随机药选项与抽样退化限制。原题药价表未加载、两药记0，不等同真实持有价值为0。发光水12样本并未与技能药联合抽样；随后技能药实际取斗篷与匕首，与题面中位例子的逃脱计划不同。states280348—280359核实真实续步；F15胜后46、F16休息46→75、F17空药75进场，states280377/280382/280383/280385。不能说未喝药、丢弃两瓶，不能说提前饮/留药本可赢；缺整战反事实，因此不修改持药价。

TXZ（silent-0228/0255）：states281480—281484与281536—281539核同盘48HP/敌460HP；新线少损3也少伤9，后续抽牌已改变，不能视为固定全程对照。原题六候选都有低可信F48→F49，全部连续通关0%，不是仅看首Boss，也不是SL必死证明。第三试F48实际获胜剩4、空药，经REWARD/MAP进入F49 4→0（281563—281566），在玩家可操作前已GAME_OVER，不能归为敌攻击或擅判未SL违规。SL原记录972/973预测死后回读、974首战赢，与原始run最终败分开。恢复8/11到56属于SL，不当真实回复；本轮不把三次同局尝试计成三个独立样本。

WQZ（silent-0018/0079/0257/0258）：T9题面五牌线及三瓶未建模选项完整保留；所有牌线24/24抽样死、1200整战无胜，侧步标未建模。原答不是飞镖线，是SL覆盖后才变线。states282075—282079与282144—282148，损13/伤24对损22/伤39，多付9血换15伤；之后原/替线T11分别12/3血判死，没有独立胜线证明哪条排序优。T7反例（原2/3/5试与末试）：同26血/敌245，保血线后26血、沙坑3；末试22血、沙坑4，同扣24敌血。即时逃离令4→5，结算后为4，不能把结算前5与结算后3直接相减。该反例阻止“一律少付血”结论；全败模拟也不能抹掉即时血价。

狡诈容量：八局41次已饮用动作，逐条before/after状态及decision result已读。36次添3刀、2次八手添2刀、3次满10手添0；独立局分母为8，所有同局SL仍是一局。42次/9局的旧账本口径另含SADL，本轮未提取该局，因此不把41/8改报42/9。空手位是局部机制证据，不能据此证明保留/穿插用药的整战胜率。ordinary当前模型已具备三张生成及手位处理，保留其已观察A7/A9/A10范围，不外扩角色/进阶。

历史Jev题面包含A8/A9药水统计与旧建议文本，本次只把它当“历史请求确实发过的字段”。未核该部分角色，绝不计Silent统计/分母、游戏事实或新知识；未读取或搬用其他角色知识库。

## 逐项处置与既有实现

source-audit.json核当时live4528a751f17e341a97e7ff70295ec9fba0c947e9，四个源码提交均为其祖先；六个相关生产源码叶子本树/live SHA逐字节一致。该证明只限这四个窄实现及六叶，不把main已有、测试通过或类似名称当宽父已实现，也不把当前发布倒记到10月初原局。未改铁甲或其他角色。

|提案|关联账本|原正文|本批处置与缺口|
|---|---|---|---|
|silent-proposal-08eaa60bcc449852|silent-0019, silent-0020|未恢复；保留队列摘要身份，不能代替正文|waiting：KEN F15两瓶实饮、46血胜后F16至75且空药进F17已核；缺不饮/提前饮/留药至Boss的完整配对，原正文未恢复。|
|silent-proposal-92920295a648b540|silent-0228, silent-0255|存在且SHA一致|waiting：TXZ F48T6少损3亦少伤9、胜首战余4血及F49可操作前归零已核；缺同后继条件的两战替线和独立校准，低可信0%不能放宽SL。|
|silent-proposal-a327449c331efbc1|silent-0079, silent-0018|存在且SHA一致|waiting：WQZ F33T9多15伤付9血、T7付4血延长沙坑已核；差额审计已有live祖先1698adc96ba434a46942321e0237b70657e625b2，缺完整受控后继支持改变探索排序。|
|silent-proposal-a099e89437e942bb|silent-0030, silent-0257, silent-0258|未恢复；保留队列摘要身份，不能代替正文|waiting：八局41饮容量已复核，生成手位已有live祖先6403fdcdadc803a092beb5165a068e22bf51c412；原正文未恢复，SADL及保留/跨动作重读/SL恢复到最终派发未联合验收。|
|silent-proposal-47910f82a1fdd98f|silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255|未恢复；保留队列摘要身份，不能代替正文|waiting：TXZ续战开场与WQZ血价已核，开场模型扩展ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8为live祖先；缺原正文及连战替线、持药价值联合校准。|
|silent-proposal-f1374df72d8e6a25|silent-0019, silent-0020, silent-0050, silent-0253|存在且SHA一致|waiting：原正文SHA核同；1913SE84AXQF/Q6M2Y34MWKRE原资源链本轮未追加完整提取，缺早喝/留药后继及退出价值独立验证。|
|silent-proposal-38a49e6c97f31eea|silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262|未恢复；保留队列摘要身份，不能代替正文|waiting：普通紧勒子实现5c7105ff0294466da8319f2934beda05c6040794为live祖先；原正文未恢复，1913/Q6增益、再生、临时药、复活及SL联合窗口未验收。|
|silent-proposal-ef0e38a5dbd3bc07|silent-0019, silent-0020, silent-0021|未恢复；保留队列摘要身份，不能代替正文|waiting：原正文未恢复；1913/Q6资源链及历史统计分母未重核，缺事件/路线/休息替线的条件配对，不以本批十局补成因果对照。|
|silent-proposal-7f820c02d39bfaea|silent-0079|存在且SHA一致|waiting：原正文SHA核同；NHA2KW0RB7VP跨弃牌完整计划、同预算排序及独立后继本轮未重核，不以WQZ相似问题代证。|
|silent-proposal-04b6b430759815ed|silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265|未恢复；保留队列摘要身份，不能代替正文|waiting：原正文未恢复；NHA/K367/SADL油灯首次消费的跨动作、新战、SL恢复及其余子公式缺联合验收。|

六份缺失原正文已核原路径、相对精确路径git ls-tree HEAD为空、原批次约定retention archive路径不存在，见missing-markdown-check.json。此检查不证明全历史无副本；没有用摘要重造原文/SHA。四份可读正文原字节复制到本批*.original.md，并核注册SHA相同。原队列add/latest、31个原账本add及折叠内容分开保留，不把最近update行当完整条目。

1913SE84AXQF/Q6M2Y34MWKRE/NHA2KW0RB7VP/K3676LU8B0UH/SADL3CGYTGSR在相关提案中出现，是各自后续需核的精确来源局；本轮未补充其完整原始窗口，不能以本批相似局代替或宣称这些局已验收。未来仅这些提案的原证据窗口补齐，按同角色/进阶/时间与run隔离，不从相关帧和rollout样本拟合独立胜率。旧原文提出的低可信0%/留药/油灯首次消费等未完成范围保持原owner链，不新增重复id。

## 验证、回退与交接

没有源码/正式知识改动，因此没有新增策略提交、撤源码失败/恢复通过实验、tsc、vitest、cases或gitleaks提交扫描；tests三项null，不记0。199条原始读回校验是提证完整性检查，不是代码测试。没有live合入、版本分配、shipped登记或规则变更双通知，不启动刷新/全套检查。

31个既有账本只经根learner/ledger.py update附本批proposal/report链接及waiting限制，保留原shipped/proposed状态，不把旧已发布经验降级、不新标shipped；没有新的游戏知识要登记为proposed。原提案CLI id沿用十个，不创建新id，不修改原提案原文或队列。本批最终proposal_results由调用方机械消费，waiting仍待新证据重派。

预期行为保持现状；如果后续证据足以改药价/终局权重/SL探索，必须固定输入比对、源码撤掉失败再恢复通过、按run后移验证且说明角色/进阶边界。本批无新源码可回退；回退不涉及删除证据、旧实现或历史失败。

交运维：本目录proposal.md（十项汇总）、report.md与result.json。没有声称自然采用、收益、正式发布、下一局消费或关闭父学习要求；相关历史异议由已有ops→watcher→Roy链接续，本批没有代其他角色确认。

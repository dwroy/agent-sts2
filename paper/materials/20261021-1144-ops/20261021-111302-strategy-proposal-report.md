# 静默策略提案复核报告

记录时间：2026-10-21T11:31:43+08:00；batch=20261021-111302-strategy-proposal。

十项原提案均保留waiting。没有新确认且尚未实现的独立源码缺陷足以在本批直接修复，也没有新的受控证据支持调整策略权重。fixes=[]、merged=null；不新增提案id、正式经验、源码提交或发布号，不标shipped。不以缺获胜反事实阻止已证纯bug修复；本次剩余缺口具体在身份归属、生产校准及受控比较，不能猜测补值。

## 身份、基线与范围

开工工作树干净，dispatch HEAD=af8cf2adaba3e1320752a977b88d93f7e29bd21f。已读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals。根learn.json本批task/character/worktree与十个proposal_ids匹配，reason=proposal，没有research_request、implementation_request或proposal_repair；只处理这十项。普通专题请求绑定20261010旧batch，未读取其work_spec或借其扩题。依普通流程merge main快进至base=fc18ef37d6f1b4887e5007a81a0ca0d278e795fd；仅记录/论文数据变化，agent/learner/ops/eval/knowledge与dispatch零差异。没有源码提交。最终报告base采用实际merge后的HEAD，dispatch_base另存，未声称纯研究绑定。

六局runs.jsonl原行均SILENT（规范化silent）、A10且已结束，均为历史失败局，终层分别VLZ45、8JRE33、CA5 13、5PM39、61E28、DUZU30。独立局数6；SL重试不扩分母。原行offset/bytes/SHA与冻结切点见runs-verified.json。本批只核这六局，不使用其他角色私有知识；本角色旧题面内原有的跨角色统计文字仅保存为题面历史，不作为本批机制/牌值/参数证据。

全程独立、未派下级agent、未联网或调用LLM、未play。没有修改模型/账号/共用配置；本批未核原生turn_context，因此不自行报告high档位已生效。

## 摘要和原始提证

指定evidence_summary.py已退出0，摘要SHA=4956e3013534453f07fc71d734ecacf7bc8dbf43d88a98de464d4216297d8479。指定专项extract_evidence.py（v6-build/jev-prompts/decisions/run-config）与默认八流提取均退出0。已实际读取两个manifest，全部所选行逐行从原日志seek回读并核offset/bytes/SHA及原JSON相等，见raw-verification.json；机械读回不等于模型完整分析。

| 默认提证流 | 冻结source_size字节 | 本批原行 |
|---|---:|---:|
| states |15133535854|3432|
| decisions |3256112701|3306|
| sl-attempts |51950574|29|
| run-config |2385267|6|
| run-plans |10324678|33|
| brain |1192581064|183|
| v6-build |64678849|0|
| jev-prompts |2357755737|579|

默认八流共7568行，加独立核实runs6行；专项四流重复读回3891行不增加独立分母。每流完整冻结前缀SHA、逐行引用和identity出处在manifest/evidence中保留。原源存在states2、decisions2、brain2、jev1条invalid JSON；这些不可归属行不冒算本六局缺损或补所属。冻结切点均无不完整尾行。全源未知身份计数与末五条入口仍保留，不把有限末五索引当完整覆盖。本批所选原行未发现身份冲突。

V6-build在该切点对六局均no_match，不是该流缺失，也不表示六局entries=0。六份run-config均没有V6字段，保留“历史配置缺字段”，不能声称显式V6 off/on。无所属V6原row可读，entries/jev_answer/fallback/unknown全部无本批可归属观测，不能从缺行补零或推断采用。提证与历史运行版本不证明本批正式发布、下一局消费或自然收益。

Jev有579行，角色分母136/139/58/92/70/84（按任务runs顺序），全部机械核request/answers字段存在、未见error字段；无错误字段只描述已记录集合，不证明所有外部调用均成功。Jev请求/answers与decisions.chosen/result分开记录；题面存在不代表执行或收益。所属只用显式run_id/fingerprint.run或经decisions原行核对的精确decision_id；本次九题均有显式run身份和精确decision_id对照。不用正文、时间邻近或question_id近似建局身份。

## 实际完整读取的九题及后果

模型完整读了九份原始request（含题面上下文与全部选项）、answers/error及对应决策回执。原文展开保存在questions/<decision原行号>.txt，原行及精确SHA/offset/bytes/source_size/identity对照见question-inventory.json。questions中另外五份只提取定位、未完整分析，不能当覆盖。完整579题索引及每题未读原因在all-question-index.json，570题未完整读，原因是本批十项范围之外或同类窗口未展开；不声称完整六局题面验收。

| 局 | 完整读取的decision原行号 | 完整/未完整题数 | 实际核对结论 |
|---|---|---|---|
| VLZ |269707、269748|2/134|F43升级后选plan1，先派突然一拳+，后状态90→77、敌254→203；F45首题选无神化plan4，先派勒紧，MC1/12/707ms与horizon1/best=null是退化估计。|
| 8JRE |270216、270282|2/137|同指纹首/第三试T2均答plan1；第三试SL改成打击线。即时血价与样本口径分列。|
| CA5 |267375|1/57|F13T3是生存者后的弃牌题，Jev选card0/打击，select_deck_card completed；不冒作T5战斗题。T5本身没有可匹配Jev题面。|
| 5PM |268455|1/91|末试F39T2答plan7，派无毒目标冒泡；29血/敌35血不变、能量5→4、毒仍0，局部零效果。|
| 61E |267612、267696|2/68|F17T6答plan4双防御/尖啸；F23T4答plan3本体线，另一目标39伤零损仅候选。|
| DUZU |269068|1/83|末试F30T5答plan1，派防御completed；题内1/24胜只是模拟，不能覆盖最终失败事实。T6没有匹配Jev题面。|

上述九条decisions均有chosen与completed结果，gate_reject/selection_dispatch均缺字段；缺字段不补false或整线执行成功。Jev error未记录。按观测时间+指纹与明确局号连原状态，question-state-links保留前帧与后续定位，后续近邻本身不认证因果或整候选。

重点原状态25帧：VLZ F35神化施放能7→5，防御5→8、打击7→10、匕首雨逐段5→7、工具1费→0；F43两打击/一拳/勒紧/尖啸升级与后抽毒雾+分别核，F45药水1→2能、抽工具/生存者且HP67不变，后弃神化而不是已施放。F45末轮32血20挡对59攻击、覆甲0。CA5蚌力量0/4/8，显示攻击11/15/19，弱后11/14；本局没有正敏捷建立。61E族母负敏捷防御各3、毒17+16端点；胧光T4后幻象仍2血，力量3→6，端点总净扣47/损15。DUZU首试T5/T6力量2→−4→4、攻击20→14→22；不能把首试数值窗口混成末试题面的同一尝试。所有原引用与所读结构事实见selected-state-facts.json；其余state仅机械保全，未全灌模型。

## 本基线消费者实际读回

实际调用本基线learner/lib/selection-execution.ts，冻结输入由本次extract原行生成，带原decision_id、observed_ts、fingerprint与物理_line；输入gzip SHA清单、完整输出及错误保留在consumer-*。Node进程退出0仅说明此离线读回完成，不是tsc/vitest或生产策略验证。

VLZ/8JRE/5PM完整输入通过；CA5:267143、61E:267517、DUZU:268789/268818/268864五条旧行缺decision_id，完整输入明确拒收。仅在剔除这五行的有界子集上继续，原行仍保留，不将子集冒成完整局验收。

| 局 | 输入范围 | 动作 | 候选片段 | 已观测整轮端点 | 未知轮 |
|---|---|---:|---:|---:|---:|
| CA5 |仅有ID子集|264|41|0|46|
| 61E |仅有ID子集|442|63|14|59|
| 5PM |完整|638|83|25|76|
| DUZU |仅有ID子集|599|77|28|68|
| VLZ |完整|699|99|10|97|
| 8JRE |完整|659|113|44|67|

合计3301个有ID动作、476候选片段、121已观测整轮端点、413未知轮；完整候选认证均0（工具契约actual_full_candidate_result=null，不代表没有实际动作）。8JRE首/第三试T2原动作串分别270216—270219、270282—270285，状态276208→276212与276274→276278，净损3/15、敌净扣10/17，确认多12血多7净扣。首试题面只有8样本（原线1/8死亡），第三试同题原线0/24、替换5/24；不能把首试也写成0/24或两候选同死率。

61E F17T6消费者原行267612—267615与状态273504→273508核−8HP/−33敌HP。F23T4因turn_opening_unverified保留unknown；虽然原状态端点和动作可读，不能升级成工具认证整轮/候选。详consumer-turn-facts.json。

## 已有源码与live界限

只读live快照5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。所核11路径base/live blob全同，完整值见source-verification.json。神化有限转换最近基线提交a46239a29c3109ff9f69224ad77128d9929d3e9a、参考字段30ec2425012eea75f41226b31d8180b1abb837bc、选择审计9d8278702dbc581b5015ba7ec9a70dc0fb94cccb、派发回执fdaf787a372880b0438e73bcac7e6d2168b038ed和离线消费者a32050fbce4c2863f640468c2dbf378fc9157074均是该live祖先。card-model及hand/loop最新main触达提交不是该live祖先，尽管blob同，也不将其提交号报成live来源。

实际源码仍有actual_cast_this_fight=null，派发回执state_effect_verified=false/whole_plan_executed=null；选择审计仅predicted_candidates。有限牌对转换不证明未知组合、持续身份和后继消费全部成立。未把这些子项重复实现或登记整项duplicate/implemented。本批没有源码或正式知识改动，铁甲及其他角色未改。

## 逐项处置与闭环

逐项提案、证据局/层/回合、26个既有账本、反例、验证与回退见proposal.md。十项proposal_results见result.json，各保waiting并说明具体缺数据。code_proposals沿用十个原CLI id，不另建重复项；implementation_domains=[]，因为本批没有实际实现。既有账本仅通过根ledger.py update追加本批proposal/report链接与限制说明，不改claim/evidence/status/version/effect、不标shipped；无需新增重复知识条目。

无源码提交，不运行撤源码负控、tsc或vitest；tests={"tsc":null,"vitest":null,"cases":null}，不借历史绿灯。未启动live合入流程，没有eval新版本、上线decision-log或双通知；报告完成、CLI链接、离线工具读回都不表示正式学习入库/自然消费或收益，未关闭父要求。

失败现场保留：首次runs核验因原值SILENT与小写直接比较触发AssertionError，改为规范化同时保留原值后通过；一个消费者事实投影因unknown行facts=null触发AttributeError，随后按unknown保留、未重跑或更改消费者。几次工具输出被截断，不作完整覆盖；本报告明确只计九份实际完整读取题面，五份仅生成的题面不计。

产物交付前gitleaks扫描结果另存gitleaks日志/JSON；最终HEAD及git diff/status零差异回执见final-verification.json。共享内容对象在沙箱出现EXDEV（deferred_errno=18），manifest保留pending_host_seal=true；本地原字节及SHA已核，不冒称宿主封存完成。

运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-111302/learner/runs/20261021-111306-c4be0ee0-bdae-4fb4-ae96-05516e5b3cfb-strategy-proposal/proposal.md

报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-111302/learner/runs/20261021-111306-c4be0ee0-bdae-4fb4-ae96-05516e5b3cfb-strategy-proposal/report.md

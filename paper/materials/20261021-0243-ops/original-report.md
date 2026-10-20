# 本批结果

本批十项原提案全部保留 **waiting**。原文、原始题答、SL替线和实际状态可核；已有诊断属于部分实现，完整后继、逐来源收益及独立验证仍不足。本批没有新增游戏规则、源码、经验库、提交、合入或版本，不把工具提证视为策略正式发布、下一局消费或自然收益。逐项账本、证据、反例、期望行为和验证方法见同目录 `proposal.md`；机器处置见 `proposal-results.json`。

身份：task=strategy-proposal，character=silent，batch=20261021-021302-strategy-proposal。工作树为本题指定树；完整base=`f7a78458599c53e616671b7839b1adb3f931d5e9`。开工git status干净，`git merge --no-edit main`返回Already up to date。根learn.json对应行有十个proposal_ids、reason=proposal，无research_request、implementation_request或proposal_repair；根deck-size请求绑定另一批，故本批不是手动专题，不读取其他请求替代身份。派发快照存 `dispatch-row.json`。

必读README、最新STATE-2026-10-19、decision-log尾部、学习协议及代码提案闭环已读。STATE含历史停点，尾部后续更新及decision-log已记录恢复；本任务不据旧停点变更当前运行。没有派下级agent、运行play、联网、改运维prompt或其他角色知识。任务要求Sol/high；本次未核原生turn_context/请求回执，不自报档位已核生效。

## 原文与范围

十份原提案全部读取，角色、runs、既有ledger及保存Markdown逐项核对。五份根目录原文直接读取，另五份exp原路径缺失。已用git ls-tree确认精确基线路径，materialize五次均rc1、`persistent runtime retained`，未绕过保留状态；随后只读`git show HEAD:<精确路径>`，保留blob/SHA和原字节副本。十份SHA全部与原队列登记匹配，不靠同名文件猜所属。见 `proposal-original-checks.json`、`proposal-originals/manifest.json`、`dispatched-proposals.json`、`proposal-queue-refs.json`。没有以缺路径断言原文不存在，也没有重新登记id或改原文。

`run-outcomes.json`保存从runs.jsonl原offset/bytes读取并核SHA的六行。全部SILENT、A10、ended非空、victory=false：751FN9QM9MHQ/F17、KV0JHNJCKXLS/F33、YQL8RZ8BWN1E/F17、L9SGRBB5R698/F17、PU80F84P6HPN/F33、KEN58SH9SLZ6/F17。这里只统计六局，SL多试不当独立局。PU的F17局部过关与最终F33败分开。

先运行指定evidence_summary，再运行指定v6提证命令及普通extract_evidence命令，三者rc0。摘要SHA=`206e3c278a2a1a37d6b2f8c8fd87071565e80772b1cb6e4f388c256139722a13`，只是索引；没有把last_five当全量覆盖。两个完整manifest均实际读取；每条选中流原行引用在evidence文件中保留source_size、offset、bytes、SHA及identity字段。源文件只读，截点之后追加不纳入。

| 本批局 | decisions | states | Jev请求/问题key | 完整人工读Jev请求 | SL行 |
|---|---:|---:|---:|---:|---:|
| 751FN9QM9MHQ | 615 | 624 | 137/137 | 3 | 6 |
| KV0JHNJCKXLS | 669 | 686 | 104/104 | 1 | 7 |
| YQL8RZ8BWN1E | 571 | 582 | 253/256 | 1 | 6 |
| L9SGRBB5R698 | 635 | 653 | 251/251 | 0 | 6 |
| PU80F84P6HPN | 1033 | 1064 | 172/172 | 0 | 12 |
| KEN58SH9SLZ6 | 548 | 558 | 109/109 | 3 | 6 |
| 合计 | 4071 | 4167 | 1026/1029 | 8 | 43 |

摘要和两个manifest的不同冻结切点分别保留。v6-evidence中decisions切点3060168472字节，普通evidence中3060448671；两切点本批4071条原行SHA逐条一致，不把后来全局新增行归本批。Jev共同切点2236384112、v6-build共同切点64655258、run-config共同切点2288809。states切点14835212260，brain1142737942，sl-attempts50496071，run-plans10177938。完整前缀SHA见manifest，不重写成统一截点。

## V6与Jev分账、身份和缺口

v6-build源存在、冻结623行，但六局均no_match；本批entries/jev_answer/fallback/unknown分别为**无可归属行**，不是这些业务指标各自为0。六份原run-config都有本角色/进阶和历史dirty代码记录，但没有V6字段；没有显式off回执，故记录历史V6配置缺字段、开关未知，不由无匹配补写off。六局历史dirty知识状态不能由当前main/live代码倒推复原。

Jev 1026条均程序按原offset/bytes读回、SHA及JSON核对，且以显式run_id/fingerprint.run及精确decision_id链接到相同本批局的decisions。没有用正文提及、时间邻近、question_id相似字符串归局。1026条都有request和answers，error字段非空行0；这只是已选中行的字段计数。decisions有6条无decision_id，不参与Jev精确id连接。完整题面不等于采用，answers不等于动作成功；result为pending/failed与completed均保留。窗口中的gate_reject、selection_dispatch字段历史未提供，记null表示无该字段，不能据此断言闸门从未拒绝或选择已完整派发。

全局扫描保留：Jev无效JSON1行（53166），decisions无效2行（373494、373505），states无效2行（384730、384746），brain无效2行；各流冻结切点incomplete_lines=0。decisions全局unknown_identity1934、unmatched_decision_id1419，states全局unknown_identity3356，均不强配到本批；其他角色与未知归属原行不是本角色证据。各gap offset/bytes/SHA保存在manifest，不能把无效/未知记录当缺失为零。对象存储回执为pending_host_seal=true、deferred_errno=18，保留宿主后封存边界；本地原字节核验成功不冒称宿主已封存。

完整人工阅读仅8条request（包含全部state、全部questions）、answers/error及对应decisions：272361、272531、272652、273450、274087、274272、274568、274601，共9个问题key。Jev原字节副本在 `raw-questions/<decision原行号>.jev.json`。其中274087同时读play、survival。5组对照端点272434、272575、273400、274484、274505只核原decisions和状态，不冒充读过其完整Jev请求。

其余1018条请求未人工完整阅读，原因逐条在 `question-index.jsonl` 的read_status/human_full_read中保存：5条为配对端点，仅读decisions/state；另外5条虽在候选索引中提取了原行但未完整阅读；1008条不在本批十原提案的有界窗口内。L9/PU的Jev请求均未完整人工阅读，本批只补原SL阶段来源；没有用最后五条替代它们的全局覆盖，也不以未读项支持游戏结论。18个初选原行是定位候选，不等于18个完整阅读。

## 已核局部事实及反例

13个窗口以已核相同run+精确observed_ts和fingerprint链接decisions/state，时间只用于已定身份后的同轮续步定位，不建立所属局。共82条状态窗口、56条动作窗口，另有12条七次耗药的补充状态；均按原字节核SHA后保留在 `raw-windows/`，结构投影和出处见 `window-traces.json`、`resource-supplement.json`。没有向模型灌整局states。

1. **751 F13 T3**：完整题面plan2防御/肌肉药/切割/猎杀者，plan3当轮无药但7/8样本后轮喝，plan5整战无药；plan2/3/5预测均损8、8/8样本五轮结束，预测26与16扣血是模型数。Jev选plan2（信心.24），d272361先防御，d272362才喝药，之后切割/猎杀者/end_turn。s278402→278407玩家58→50；敌40→11实际净扣29，包含随后毒/荆棘，不把29全归牌伤。药水表未加载为0成本，不是留药价值为0。没有真实无药整战或留药Boss支线。
2. **751 F17 T2**：d272434/272575同指纹；s278479→278483玩家63→50、敌186→177；替线s278620→278623玩家63→45、敌186→168。多9敌净扣付5血。配对B2取d272575当次同种子两候选.195/.193、diff−.0025、SE.0135；首试d272434是600样本，不能拿其不同数字当配对差或自然收益。
3. **751 F17 T7**：完整两请求均Jev选plan2；第4试d272652的SL另改plan3。s278576→278581原45→32、敌121→109；替线s278697→278702为45→22、敌121→103。真实多6扣敌、额外损10血；题面19/29在未决弃牌下各多计6，不能把绝对误差当换线差。两次生存者pending后均出现弃呼唤选择、选中槽0后成功，不能停在首步completed认整线。原SL第2/4试都T15判死，后续动作不相同，无单步整场因果。
4. **KV F33 T5**：完整读d273450原Jev plan1猎杀者+致命毒药，SL删后者。d273400配对端点同指纹；s279460→279465零玩家损血、敌334→298、毒20；s279511→279515亦零损、敌334→305、毒13。少扣7不是已得保血；不能把B2三线全0胜视为同等真实胜率。d273403/273452选SLOTH均先timeout，d273404/273453随后completed，状态出现SLOTH_POWER3。两次T10判死。敌回血毛额的原提案，本批未完整重建全战逐源分账，保留缺口。
5. **YQL F17第6试T10**：完整play与survival，Jev选毒药并回答lethal；d274087 use_potion completed，s280160→280161残壳毒2→8，HP26、挡13、来袭41不变；d274088 end_turn，s280162实死HP0。没有把新增6毒记成减伤6、占位体扣血记成本体进度或把本体结束记胜利。SL958—963保留六试；早试predicted_death与末试died分开。L9 SL679/682有近十亿占位末血，PU715/716亦有，占位数字不能表示仍需扣本体；PU719第5试won/end_hp2是局部既有胜线，未隔离新排序效果。
6. **KEN F17第4/5试T10**：d274505/274568同指纹37血/敌82，无实体；第5试完整题面Jev选plan4，SL换plan2，后续真打匕首雨。s280588→280592玩家37→22、敌82→80；s280651→280655为37→16、敌82→78，额外6玩家血仅多2敌净扣。B2同题.385→.127、diff−.2583/SE.0132是模型配对，未证明替线造成整场早死。SL967/968终点T15/T13但后续亦变。
7. **KEN F17第4/6试T5**：同指纹66血/敌136。末试Jev原选步法线，SL以突然一拳替步法；随后生成小刀触发新题d274603，再小刀d274604。原s280567→280572损7/敌扣1，末s280684→280689损5/敌扣2；末次没有建立敏捷。少损2与能力延迟同时存在，不能把“只保当轮血”拟成恒优规则，原题damage1也不是完整重问后的damage2。步法后续完整价值尚未逐牌归属。
8. **KEN七次耗药**：d274131/274156/274185/274235/274237/274267/274272与槽位前后状态逐项对应（资源补充保留原引用）；随机药三次result=pending，槽位变化与后续选择另核。技能药d274272题面中位样本为逃脱计划；实际s280355提供斗篷与匕首/墨刃/萎靡，d274273选斗篷与匕首并打出，挡4→12、小刀扣4、毒结3后敌52→45，玩家46不变。原中位样本不是实打，零净损也不证明不喝同样零损。其余随机药完整生成/收益归属、七瓶取得链及全程路线回血不是本批完整重建范围；没有把七次耗药扩成七次独立收益验证。

原提案其他T13、末轮、路线/休息和九类机制的历史统计仍保留原文身份，本批未全部重提，不能用引用关系代本次逐项科学验证；它们正是宽父项保持waiting的原因。

## 现有源码与实现判定

核验实际live快照HEAD=`4528a751f17e341a97e7ff70295ec9fba0c947e9`。以下四个完整源码提交都是其祖先，但只覆盖窄项：

- `05cd292c6f01bb31e406473d3a9843e659d62b93`：本角色A10异鱼持牌损血/未决弃牌预测事实。
- `c4670f4f416c7d93e192e889c5080e7e4e0e733f`：缺失药水持有价值与当轮/整战无药预测参考。
- `c769739b97389fdc978b6515b83a38e3cd900f67`：SL候选预测对照，actual_turn_result仍null，不是整轮结算。
- `d5e20aa4dd44168ce30944dfcce74f8322144953`：巨兽本体/自爆与已观察毒药事实。

8个相关生产文件的本树、实际live提交blob与live磁盘SHA相同，详 `source-audit.json`，且combat-plan实际调用这些formatter；这只证明源码范围与接线，不证明当前每题一定发送、采用或收益。当前explore.enemyHpLeft仍累加原始末轮敌HP，anchorRank保留存活轮数/残血tie-break；已经有阶段标注不代表排序口径已全面修复。已有诊断保持预测/实际未知、随机中位线不做伪配对，不应重复造同功能。缺少宽项来源联合验收、完整后继与独立验证，故十项不登记implemented/duplicate，不冒shipped。

本批没有新增可证的规则方向：不能据两个局部血价写固定门槛，也不能据零持有成本一律喝/留。未以预训练知识、其他角色数据补机制/牌值。现有授权足够时可以实现；本次限制来自证据与验收范围，不新设审批。

## 验证、失败历史与交付边界

`verification.json`记录：1026/1026 Jev原字节与精确decision_id同局核对；10/10提案原文SHA匹配；五组指纹一致；两个冻结切点本批decisions字节一致。两个scratch辅助脚本的最初运行分别因历史行缺decision_id、questions为dict而rc1；仅修本批分析脚本后rc0，失败记在 `helper-failures.txt`，未改生产源码/测试，不把它们当产品回归。

本批未改生产源码/知识，故撤源码红灯与恢复绿灯未执行；tsc=null、vitest=null、cases=null，不宣称任何测试成功。没有代码提交，未占live合入锁、未合main/live、未分release_id、未写实际上线通知或shipped。仅保留本批scratch报告/提证材料和授权CLI审计链接，工作树跟踪文件保持干净。最终机器结果见 `result.json`，其中fixes=[]、merged=null、implementation_domains=[]。无新CLI代码提案id，code_proposals只列十个原已登记id；后续按原调度等待独立新局/完整证据，不关闭学习父要求或消费收益验收。

收尾：根目录ledger.py update rc0，为16个既有账本项追加本报告/提案的审计链接；逐项读回链接存在，status/version与更新前快照相同，未追加新游戏支持证据或将本批标shipped。输入、CLI回执、前后快照均在本目录。gitleaks dir对本批材料扫描rc0；这是敏感信息扫描，不是策略测试。最终git status与git diff均空，HEAD仍等于上述base。

## 完整人工阅读原行定位

每个run_id均另有原始decisions的精确decision_id核对；完整SHA与冻结切点不是题号推测。下列offset/bytes为jev-prompts.jsonl原行，decision_line为decisions.jsonl原行。

| run_id | decision_line | Jev line | offset | bytes | SHA256 | decision_id |
|---|---:|---:|---:|---:|---|---|
| 751FN9QM9MHQ | 272361 | 27699 | 398012392 | 17613 | 2e96bb662b4fdd0723eed722f13c3a01fff5c2d24841b235f1c2ef1075178cf9 | 179c20e7-efd4-44e8-8ee1-406abd398d69 |
| 751FN9QM9MHQ | 272531 | 27740 | 398408080 | 13503 | a939442365fd65efe504a8b23895a31aa824361b7edc4314f98bd183e45ba2a1 | fd52f1c7-ecb9-4c66-99ba-e1419817dc34 |
| 751FN9QM9MHQ | 272652 | 27770 | 398747334 | 16452 | de09b2d48996874de68bc1bc0f44560ba3c827066aa8252cbe0b420debcf3124 | 9836a127-543c-4e2f-adb9-e4c7bc103a3b |
| KV0JHNJCKXLS | 273450 | 27907 | 400689626 | 17713 | e152ebc69c9315ea695891fcaa01fcbe442eb31e1ab0579c94e9d3f75cc7c86b | 427b1bd7-6bb7-440e-bc15-caa96029c513 |
| YQL8RZ8BWN1E | 274087 | 28173 | 404305929 | 13653 | fb25cd458d94d92f7c9c8db4a34580967c2adfa52150a5d185c459214f243bd3 | 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef |
| KEN58SH9SLZ6 | 274272 | 28211 | 404771254 | 13500 | 8403d3a0a440a33db1df96ddedfcbe8dbf34913af2ae46a766894675a836cf33 | fed78f61-e646-42f4-b93d-84efa3e6575d |
| KEN58SH9SLZ6 | 274568 | 28271 | 405594035 | 19251 | a487fcb03ef4577e2dbcee298fa879970c0a6b72bbbec2b0e27b67e6996176a4 | a2ec4e39-f5ad-4380-ab93-f804ddbebf3f |
| KEN58SH9SLZ6 | 274601 | 28276 | 405691722 | 22689 | 6e6d5e75f9775d6c0b5eb01c78a8ff04703be89bba84af72e341858d7d44709a | 2073c41d-00b2-43a5-9ccb-946168bf512b |

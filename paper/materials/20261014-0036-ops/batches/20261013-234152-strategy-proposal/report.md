# 静默猎手策略提案批次回报

记录时间：2026-10-14T00:01:12+08:00。本批已逐项处理十个原ID，全部waiting；无源码、经验库或对局行为变更，无提交、合入、发布编号或shipped登记。

## 身份、基线与范围

批次20261013-234152-strategy-proposal，task=strategy-proposal，character=silent，reason=proposal，工作树与派发一致。proposal_ids为十个原ID；没有proposal_repair/research_request/implementation_request。普通专题请求仍绑定另一批次，故本批不承接其work_spec，不读取其他专题。

开工HEAD为b6cfca865bd7183f16f883fe073cec1ea87f9813且工作树干净。按普通提案要求git merge --no-edit main快进至完整base=1ed5e441700b5ceaa3c1f9bc9f27a3b62fe9f082，只增加运维记录与decision-log，无源码/knowledge差异、无冲突。本批不继续合并后续main。

已读README、最新STATE-2026-10-12、decision-log末尾、learning-protocol、learning-code-proposals。本批不是运维会话，未派下级agent。原生session 01a135ed-a85f-7260-9bb8-6caed431a399的turn_context核为gpt-6.1-sol/xhigh；实际启动command的service_tier=default。任务模板写high，实际宿主为xhigh，本批保留既有请求强度，未切换或降强度。原生只保存会话/模型非秘密字段，见native-session-identity.json。

## 实际证据覆盖

|局号|角色/进阶|只读状态数|只读决策数|关键范围|
|---|---|---:|---:|---|
|DUZUBAJ3A8GP|SILENT/A10|623|602|F27 T4—T6感染棱柱|
|5PM6JAQG6FNQ|SILENT/A10|660|638|F38 T3/T4；F39 T2/T4—T6|
|CA5KE8GFJ9X2|SILENT/A10|282|265|F13 T1—T5|
|8JRE1C4H4Z2W|SILENT/A10|676|659|F33首/三试T2、第二试T5|
|YF0LXT1QSTGG|SILENT/A10|1091|1065|F48 T1配对及末试T3—T5；F33 SL成功反例|
|XP2SL33HT0D9|SILENT/A10|730|712|F33 T1/T3配对及末试T2—T5|

保存4062条本角色状态、3941条决策、38条SL尝试记录、6条run-config记录；过滤后材料及其SHA见evidence-input-manifest.json。提案原文十份SHA全部匹配，30个关联账本只使用本角色当前CLI折叠状态。大日志仅筛六局，未输出整文件，未读取其他角色私有knowledge、游戏二进制、key或.env。

固定证据脚本核29组状态事实及4组同指纹实付血价，详见verified-evidence.json。以下“敌本体净扣”包含已发生的结算，不代表已按单牌/遗物/毒来源分摊。

|同盘面|尝试|实际损血|敌本体净扣|换线差|
|---|---|---|---|---|
|8JRE1C4H4Z2W F33 T2|1→3|3→15|10→17|损血+12；净扣+7|
|YF0LXT1QSTGG F48 T1|2→3|0→9|45→38|损血+9；净扣-7|
|XP2SL33HT0D9 F33 T3|1→2|9→14|24→27|损血+5；净扣+3|
|XP2SL33HT0D9 F33 T1|1→6|2→10|25→34|损血+8；净扣+9|

同指纹只控制本次开题状态，不控制随后整战抽序、随机药瓶、重规划和资源预算。三场末战的前五次是predicted_death后读档，末次才是died，不把所有六次叫实际死亡。YF F33第二次真实won、余20血，已保留SL成功反例。

## 已有源码的覆盖与限制

对实际live祖先源码逐文件核祖先、与本工作树blob相同，并核live对应文件无未提交改动，详见existing-live-source.json：

|现有子项|实际live祖先源码commit|边界|
|---|---|---|
|候选原答/护栏/SL快照|05cd292c6f01bb31e406473d3a9843e659d62b93|scope=predicted_candidates，actual_turn=null|
|首次派发回执|bade647f9fe4c9103b40e2f26b26296692ad24b7|single_action_receipt，whole_plan_executed=null，state_effect_verified=false|
|SL比较及HP护栏差值|a8b1f8be153fe4f3a34146117546c2178f2e446b|候选预测；actual_turn_result/actual_outcome=null|
|实验体本帧阶段事实|8698c581dac6c7e957f50a381586960a6d0c9b57|持有/已建/当前毒分列；poison_damage_already_dealt=null|

从本批真实raw帧调用现有阶段事实函数，读回111→212、毒4→0、触媒2/零毒、23挡及敏捷5→6；从原题记录的候选数值调用现有SL/护栏格式函数，读回YF预测0/10、54/36与guard预计省12血/少18伤。材料existing-consumer-readback.json明确只是纯事实格式函数读回：构造的数值Plan不是求解器产出的完整Plan，非当前planner/整战/线上采用验证。它不能证明完整候选执行，也没有用于给宽提案登记duplicate。

生产接线定位：combat-plan调用silentPhaseCurrentFacts、silentHpGuardAudit、silentSlComparison和silentSelectionAudit；hand/loop调用silentSelectionDispatch。现有字段已经能给出部分候选/首次派发事实，缺的完整执行与累计归源不能由null字段或本次离线格式读回替代。

怪物事实读取与房间成本分开：monsterHpAt同进阶有记录即读，moveBaseDamages读该进阶攻击；房间ROOM_COST_MIN_N=5、MEASURED_ROOM_MIN_N=5。本批没有改门槛、填写未见移动/覆甲条件或借用其他角色数据。

## 十项最终处置

|派发ID|处置|具体未完成原因|
|---|---|---|
|silent-proposal-c20b5139dd0dff71|waiting|缺该局实际使用的冻结A10移动表及污染、毒、挡联合生产回放；本批只核实实际技能线，未执行技能替线的后继未知。|
|silent-proposal-ae9e692d680e3819|waiting|缺遗忘死亡返敏的战内连续帧，以及混合来源返还后同轮继续出牌的证据；失落返力的回合端点不足证明双属性、同轮归源。|
|silent-proposal-52f1e1bd2e7db0ed|waiting|首样本HP/攻击读取已有；缺历史A10移动表及加压、虚弱、覆甲来源隔离的联合生产回放，未观察的覆甲减层条件不能补成规则。|
|silent-proposal-6dd8bbff876be528|waiting|缺同类型新旧召唤者的连续身份隔离及历史召唤模板/移动表输入；现有高电压growth路径不足验证替换实体不继承旧成长。|
|silent-proposal-578e415a259e6835|waiting|缺跨抽弃牌重规划的完整候选执行归属、逐来源累计兑现及SL恢复资源联合分账；候选/首次派发子项已有，不能据此关闭宽审计请求。|
|silent-proposal-c0767768bf6a7ab1|waiting|缺完整候选执行归属，以及相同起点、抽序和资源预算的独立完整尝试对照；候选预测与单动作回执已覆盖部分事实，不足证明整条候选已完成或新探索规则有效。|
|silent-proposal-a46bdb7fe711d79a|waiting|当前阶段与零毒触媒已有事实消费者；缺逐来源累计毒伤/格挡兑现及跨重规划候选归属，不能用本帧零毒关闭整阶段请求。|
|silent-proposal-1044224808015e5c|waiting|当轮两组血价已核；缺整线执行、成长净贡献和独立后置A10双蟹整战对照，不能从零胜/零差拟定新的排序或血价权重。|
|silent-proposal-7cbc6005db712ba9|waiting|局部机制已有模型；缺额外格挡来源隔离以及混合意图/未知条件下的联合候选消费者验收，不能把几个单项公式等同完整提案实现。|
|silent-proposal-c59f592f1427a67e|waiting|缺全部组件的联合消费者验收、跨续问整线归属、逐来源累计收益及SL恢复资源分账；局部阶段/派发/终态字段不关闭综合父项。|

每项证据局号/层/回合、全部原账本ID、反例、旧/预期行为、时间切分、验证及回退见本目录proposal.md。没有新提案ID；保留原队列与原文，由完成事件按proposal_results接续waiting，不直接改队列或旧父请求。

## 验证、失败历史与账本

本批未改生产源码，不做撤源码失败/恢复通过，不跑tsc/vitest或test-sandbox，不把现有测试文件或过去的通过记录当本批成功。tests固定为tsc=null、vitest=null、cases=null。证据脚本与纯格式读回不是生产代码测试。

首轮证据脚本把斗篷后帧写成278239，原帧该时点仍14挡；核实际手牌/已出牌数后改为278240，读回20挡。失败日志factual-verification-first.log与原脚本verify-evidence-first.py.txt保留；最终事实核验factual-verification.log完成29组事实/4配对。首轮大日志筛选把states的run_id误当顶层、得到0条，识别实际state.run_id后重新筛取4062条；未用空数据作结论。工具构建期两次bubblewrap/rg遇并行回收目录ENOENT，命令未执行，原native/tool日志保留；按原沙箱重新读/合main后成功，未提升权限。

只经根目录learner/ledger.py update追加30个本角色关联账本的by/where/note追溯，使用by=learner:strategy-proposal，不追加重复游戏证据，不改变claim/status/first_run/asc/version/effect或旧支持分母，不登记shipped。不会将旧金刚杵錯连当新证据。CLI原输入、输出与读回验收保存在本目录；落盘后用ledger.py check核整账本。

最终工作树应干净、HEAD等于以上base，全部生产源码、任务模板、知识、版本和历史复盘相对base零差异。scratch属于被忽略的任务产物，不提交。没有live操作、源提交、发布版本、Roy规则变更通知或胜率改善声称；原要求与十个waiting项继续保留。

## 实际收尾验收（2026-10-14T00:05:05+08:00）

根目录账本CLI已实际追加30条本批追溯记录并逐条读回；每条只含op/id/ts/by/where/note，没有status、claim、evidence、version或effect更新。`ledger.py check`退出0：458项、0个问题。最终批次角色/工作树/六局/十ID仍一致，十项都有具体waiting原因，报告JSON链接正确，HEAD仍为上述完整base，git status干净、git diff HEAD零差异；四个现有子项的源码均仍为实际live祖先，live对应五个源码文件与本树/已提交blob相同。详见final-acceptance.json。

任务材料额外执行gitleaks扫描约174.24MB，原退出1、命中1项，原日志与报告完整保留。已按具体文件/行核实，命中是本证据脚本自行定义的公开观测标签`crab-turn2-paid-hp`（verified-evidence.json:589），被generic-api-key规则将字段key当作凭据；不是key或.env内容。分类回执gitleaks-classification.json保存标签与脚本定义的精确匹配，没有新增allowlist、删旧材料或冒报扫描退出0。本批没有源码提交；tsc/vitest/cases仍全为null。

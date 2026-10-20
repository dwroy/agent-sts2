# 本批策略证据重核报告

本批没有新增源码、知识、参数或live合入；十个派发复合提案均waiting，已上线子项单列，不冒认整项implemented/duplicate。原始提证和逐项处置已保存；本报告不是策略学习入库、消费者读回或自然收益验收。

## 身份与基线

批次`20261021-061302-s2-strategy-proposal`，角色silent，完整base/final HEAD `8a0b99c946e8dea9d47d08f48526db2832c85194`。开工git status干净；git merge --no-edit main返回Already up to date。根learn.json对应行task/character/worktree与十个proposal_ids已核，无research_request/implementation_request。普通专题请求绑定旧20261010批次，未读取其work_spec、未当成本批研究。只读本批队列原add和最新update，未领取其他ID。

十个派发局均在runs.jsonl有SILENT且ended非空：SADL3CGYTGSR A7、F4QKG4J1AJJZ A9，其余八局A10，均未胜。精确行、offset/bytes/SHA见runs-verification.json。原提案额外五局均从默认提证runs原行核角色/结束，K367为A1，其余A10；不混入最终runs。README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环已读。STATE中的历史STOP/live不存在与后续R408不同，按时间保留，不操作服务。

未派子agent、未联网/调LLM、未运行play、未读凭据/二进制、未改账号配置/权限；未借其他角色经验。部分Silent历史Jev题自带旧A8/A9药水统计，作为原题保留，不作为本角色的证据。没有本会话原生turn_context/请求回执，未声称模型强度或服务档已核生效。

## 原文与冻结提证

十份原文按队列proposal_sha256核同；旧exp路径缺失的五份从044302-s2留存的original-proposals精确恢复，03754从051301-s2相同SHA副本恢复，不移动旧owner或工作树。两个recovery JSON保留出处。

先运行根evidence_summary.py建立索引，再运行本树extract_evidence.py的指定四流和默认证据流（后者加原提案五个来源局）。summary不是游戏结论。所有流独立冻结，不能把不同source_size拼成一个统一切点。

| 指定流 | 冻结字节 | 本批匹配行 | 冻结前缀SHA256 |
|---|---:|---:|---|
| v6-build | 64678849 | 0 | `f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da` |
| jev-prompts | 2295248693 | 1838 | `6cd4304a811c07c1bcd8c2442bfea49247fed3e9fa085ffe9e65e925a8f4d37a` |
| decisions | 3149567114 | 6982 | `fcf03e8af5f145276068f91c0003e372191ca7af2b07fce79036ee58d107009f` |
| run-config | 2331002 | 10 | `54c584e33cbfa48ca5f21fa609ac33cc12108c3ef5ba213a984bd8cb7fc8c6f7` |

默认证据清单为evidence/evidence-manifest.json：15局9951个state、9574个decision、79条SL、81条run-plan、496条brain、15条config、15条runs。states冻结14979539630字节，SHA95c879430f97dced6fa628a40b97fb883ba26b381883dac8c1ff45edce119a98；只由脚本流式投影，模型只读选中窗口。选定1003个唯一原始范围已seek回源核长度/SHA及未越冻结边界，见raw-byte-verification.json。此为材料校验，不是代码测试。

指定decisions全源有2坏行、unknown_identity1934及unmatched_decision_id1440，Jev全源有1坏行；默认states和brain各2坏行。全源缺口不能归为本批缺行或零结果；有限gap_refs仍只是入口。所选行未见冻结截断。补充Jev另冻2296239465字节/SHA0c1ca2e93594eb61f4f4bf13b4141c91e1ce85b8443e084ee31409a386afbab1，显式局号候选6034行中5509行实际属于别局，全部拒收；525行身份与decisions原行核同。正文提及只用作解析预筛，不建立归属；此有界补充不声称穷尽无显式局号的历史行。

## V6、Jev与完整题覆盖

本批10局v6-build均no_match。entries/jev_answer/fallback/unknown没有对应原行，不能称四类事件各0；无V6题面、采用或收益可验。10个历史config均无V6字段，故状态为未登记、on/off未知，不写成显式off。提证不证明正式发布、下一局消费或收益。

Jev本批1838行（request/answers字段机械索引），另有补充525行。question-coverage.json逐行给精确decision_id、两侧原引用、是否完整阅读和未读理由。本批完整核5题，补充完整核3题：

| decision原行 | 局/层/回合 | Jev答案 | 阅读及动作核验 |
|---|---|---|---|
| 275342 / 275383 | TXZ F48 T6，尝试2/3 | 均plan6 | 275383完整request/state/所有criteria/answers；与275342逐路径差异只有历史尝试和耗时，较短历史为已读历史子集；两侧答案/决策及后继分别核。 |
| 275894 / 275960 | WQ F33 T9，尝试2/3 | 均plan2 | 275960完整原题；275894同字段及全部差异核同，差异同上；SL覆盖与实际血价另核。 |
| 276139 | WQ F33 T7，尝试6 | plan4 | 完整原题/答案，SL改plan1式逃离线；选择弃牌后果核原states。 |
| 276585 | Q6 F2 T1 | plan4，confidence0.29 | 完整早饮/不饮5选项与全部题面；已执行原线完整后继。 |
| 276676 | Q6 F8 T4 | plan1 | 完整紧勒题与弃牌完成/实际失血链。 |
| 278930 | RC F23 T3 | plan1 | 完整7选项；抽牌后重规划的实际顺序与状态另核。 |

完整题保存在question-<行号>.json，保留request、answers及error缺字段。上述8题未见error字段；fallback=false，chosen仅首动作、result=completed。gate_reject与selection_dispatch未落字段，记缺字段，不能据此声称所有闸均通过。其余本批1833题、补充522题没有完整模型阅读（包括已保存的NHA跨弃牌题和其余RC题），不冒充全覆盖；原因是本次只处理十项原提案的有界窗口，未做全史/全题型研究。全量已提取不等于全部模型已读。

## 核实事实、反例和未知

1. TXZ第2/3试T6同48HP、敌460，原线3损/36伤、替线0损/27伤（states281480—281484和281536—281539）。后继手牌不同，不归因单一策略改善。第三次首战结束4血，F49首帧4血随后0，不能以第一战获胜代替连战过关。旧低可信1200连战模拟不作必死/SL证据。
2. WQ第2/3试T9同26HP、敌184，原线到13HP/敌160，替线到4HP/敌145，付9血换15伤；题面两边均全败，不代表同安全。第6试T7逃离使沙坑动作中4→5、敌方结算后4，相比原题after_enemy_turn3延1；当轮付4HP、同扣24，是相反边界。内部攻击/沙坑先致死顺序仍未知。
3. 狡诈九局42饮逐饮核，37次3、2次2、3次0。WQ尝试5 T11手数8→10→10→10；尝试6为5→8→10→10。新增均SHIV upgraded=true、Damage基础6，HP/能量当步不变。42饮不是42独立局。唯一计划妥当建立在WQ尝试5 T8，后续轮初满手并有零新增；不把该失败观察拟合成统一留药阈值。见cunning-transitions、cunning-audit-summary及retention-transitions。
4. 1913 F24锻造40→40，F28休息40→61，F29胜后46、F31实入46并死；Q6 F3付8，F7实回21至57，F8胜后2、F9死。Q6 F2完整早饮题有0损/五轮4.9候选，原答低信心选择原线，实际12损，未实打早饮整战。F5/F6留药且零损反例保留。未来营火或能力不算已兑现。原109局总体统计本轮未重算。
5. Q6 F8T4紧勒原题19，实际103→95→85→85（弃牌未完成）→83→80，共23，HP34→33；普通紧勒已在live，不重复修。其他再生封顶、荆棘反杀/复活、升级/叠层等未据普通紧勒冒称联合通过。
6. NHA第5/6试T1两次均30→23、敌合计408→384，先弃精确切击再回响/萎靡，重放不是独立成功局。这里只核完整已执行资源链，未把未完整阅读的跨弃牌原答题当完整反事实。
7. 油灯：156个限定牌型候选转换中，按原文明确类别定位17个直接窗口（11毒/6次F33萎靡），另有F19普通X1萎靡候选1。18不是对旧17的自动更正或新支持分母。K367 F30T2与F38T1毒刺4→8；SADL F45T1毒5→10、F48T2毒7→14；NHA七个毒窗与F33六试X1减力/弱各2。所有这些遗物快照触发前后完全相同，只有index/id/name/description/stack=null/is_melted，无首次消费位；后续不翻倍窗口亦保留。完整状态历史能支持研究，单快照不能凭持有、毒量或T1猜消费状态。首次跟踪、重读、换战和SL恢复的生产联合验证仍缺；原模型未覆盖效果不能仅靠遗物文字无条件翻倍。详lamp-direct-windows及lamp-transitions。F19候选仅待核，不修改经验。
8. RC F23T3先预判后现敏1、速度药到6、斗篷12挡/敏5、毒刺后敏4、防御至21挡、刺击后敏2、第三攻击小刀零直伤但折扇到25挡，37HP不变；T4临时敏捷/负力撤回为0，柔嫩与毒雾仍在。首题plan1先防御后毒刺，实线抽牌后顺序改变，不能把首题损2与最终0损当同一完整候选的误差。F17/F29/F33其余组件尚未逐项生产联合回放，保留03754等待，不把已建9层幻影等同所有首刀组合可外推。

未拟合新参数、未添加游戏机制；支持、反例、未知均保留。确定机制bug可以用局部固定帧修，不要求独立胜局；本轮缺口是复合范围/生产状态链未验证，未定位新的可安全实现并验收的源码改动。

## 已有子实现与实际live

实际live只读HEAD `150890f8bac0253f4e9216af3259784705c7550e`，7个相关生产叶与本树逐SHA相同。source-audit.json保存叶子、提交标题及实际祖先检查：狡诈`6403fdcdadc803a092beb5165a068e22bf51c412`；SL差额`0e4fe4df89a06682468e0e4716c12126e76369d5`/`1698adc96ba434a46942321e0237b70657e625b2`；开场`e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`；普通紧勒`5c7105ff0294466da8319f2934beda05c6040794`；朝向子修复`f2c7cc1a7288893bceae0f0b20304a2b1fae5f57`均是实际live祖先。相似旧提交15ea09ad…与fc7042d1…不是live祖先，不用于duplicate证明。

这只证明已有子源码，不证明父提案全部实现、本批发布、自然消费或收益。原提案不新建重复ID；最终code_proposals沿用这十个真实CLI ID，implementation_domains=[]表示本轮没有新增实现。

## 十项处置与交付

| 原CLI提案ID | 原账本ID | 核实结果与waiting原因 |
|---|---|---|
| silent-proposal-92920295a648b540 | silent-0228,silent-0255 | TXZ F48第2/3试T6少损3亦少伤9，第三试首胜4血后F49归零已核；缺保持后继抽序/生成牌的完整两战配对及独立校准，不调整SL或终局权重。 |
| silent-proposal-a327449c331efbc1 | silent-0079,silent-0018 | WQ F33 T9多付9血换15伤、T7付4血延长沙坑已核；差额审计已有live祖先，缺可分离血价/毒/沙坑的受控后继，不能据全败样本更改探索排序。 |
| silent-proposal-a099e89437e942bb | silent-0030,silent-0257,silent-0258 | 九局42饮的3/2/0容量已逐饮核回且容量子实现已在live；尚无保留选择、跨选择重规划、同瓶SL恢复至最终动作的完整联合验收，未将容量子项冒认整项duplicate。 |
| silent-proposal-47910f82a1fdd98f | silent-0018,silent-0019,silent-0020,silent-0021,silent-0025,silent-0079,silent-0198,silent-0228,silent-0255 | TXZ开场4血价及WQ双向血价已核；开场/差额子实现已有live祖先，缺连续替线和持药价值的后继配对，原资源统计总体未重算。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019,silent-0020,silent-0050,silent-0253 | 1913/Q6实际资源链与Q6早饮完整题已核；早饮候选未实打完整后继，F5/F6留药零损为相反约束，缺退出价值时间留出验证，不能拟合药价或统一早饮阈值。 |
| silent-proposal-38a49e6c97f31eea | silent-0006,silent-0011,silent-0025,silent-0044,silent-0050,silent-0064,silent-0133,silent-0253,silent-0259,silent-0261,silent-0262 | Q6普通紧勒103→95→85→83→80已核且子实现已在live；再生封顶/先后、临时药、荆棘攻击中反杀、重接及SL各分支的联合固定验收未齐，不以普通紧勒关闭整组。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019,silent-0020,silent-0021 | 1913 F24锻造不回血、F28回21、F31入口46及Q6 F8胜后2血接F9死亡已核；原109局独立分母未复算，缺事件/休息/路线替线的同条件后继。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | NHA第5/6试弃精确切击后回响实线30→23、敌净扣24已核；完整原答跨弃牌计划及同预算后继未联合验收，重放不增加独立结果，不能据此改饱和SL门槛。 |
| silent-proposal-04b6b430759815ed | silent-0005,silent-0006,silent-0021,silent-0011,silent-0065,silent-0264,silent-0079,silent-0133,silent-0169,silent-0189,silent-0013,silent-0053,silent-0162,silent-0265 | 原文明确类别17窗及额外F19候选1窗已定位，触发前后油灯快照无消费字段；缺首次/已消费/新战/SL恢复的可靠状态链及其余子公式联合验收，不能按持有或毒量猜首次。 |
| silent-proposal-03754e1265894000 | silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253 | RC F23 T3/T4预判、速度、柔嫩、折扇和属性撤回原链已核；原题有抽牌重规划，首题整线并非最终实际顺序，F17/F29/F33其余组件窗口本轮未逐项联合回放，不能关闭八组件复合提案。 |

原始证据局号、层/回合、账本、反例、下一步固定验收及回退见proposal.md及对应原文。proposal_results与result.json逐项均waiting，保留待证父项。

本轮只有ignored scratch和授权ledger CLI记录，git追踪树保持干净；无提交、无live合入、无新eval版本或shipped。没有改代码，因此未运行tsc/vitest、没有撤源码失败/恢复通过试验，tests各项为null；材料SHA核验不冒充测试。没有规则上线，不触发规则变更双通知或上线decision-log。运维可从本报告、proposal.md与result.json接续，不关闭学习父要求。

过程限制/失败：首次指定提证在沙箱构建bubblewrap时遇临时路径消失，未执行提证，随后相同任务重跑成功；runs首次验证误用大小写敏感比较SILENT/silent而断言失败，已用原行SHA与规范化角色重核，未改原日志。早期队列/候选输出超预算被截断，后续以落盘精确ID/有界投影重读，不以截断输出作验收。原wrapper/err保留，未覆盖旧提证切点或失败现场。

本批只经根learner/ledger.py add登记核验记录`silent-0549`（proposed，by=learner:strategy-proposal），CLI show已读回；原十项提案及原经验账本状态未改。此记录不等于代码实现、入库或shipped。

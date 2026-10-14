# 静默猎手策略批次报告

2026-10-14T15:59:12+08:00

十项派发提案均保留waiting。已有确定性子实现已核实际live祖先；剩余范围缺受控完整后继或联合消费者证据。本批未改生产源码/知识、未提交或合入、未发布版本、未拟合玩法参数，也未登记shipped。

## 身份与基线

batch=20261014-154303-s2-strategy-proposal；task=strategy-proposal；character=silent；reason=proposal。起始git status干净；普通任务执行git merge --no-edit main，结果Already up to date。完整base及最终HEAD均为 f8d306514e2a8afafeac591d38773b92807f2518。本批没有research_request、implementation_request或proposal_repair；只领取十个proposal_ids。根deck-size请求绑定其他批次，不满足专题身份，未读取专题正文或改根请求/learn.json。

派发十锚点及五个原提案直接关联局先核runs.jsonl，均为SILENT；A1/A7/A9/A10分开记录。没有读取其他角色私有知识、没有跨角色统计。实际native模型/推理强度未独立核验，不报告配置修改或会话切换。

## 实盘证据

| 局号 | 实际进阶 | 终态 | 最后层 | 来源 |
|---|---|---|---|---|
| K3676LU8B0UH | A1 | 胜 | 48 | 原提案关联 |
| SADL3CGYTGSR | A7 | 败 | 48 | 原提案关联 |
| F4QKG4J1AJJZ | A9 | 败 | 38 | 派发锚点 |
| JLN5SK17W4FQ | A10 | 败 | 33 | 派发锚点 |
| 4D4J8USKCPAV | A10 | 败 | 17 | 派发锚点 |
| S9UZAK0JP0C0 | A10 | 败 | 33 | 派发锚点 |
| NB8KCF6HRGVF | A10 | 败 | 31 | 派发锚点 |
| LS8035TB32P3 | A10 | 败 | 42 | 派发锚点 |
| 02HB4L0C3C67 | A10 | 败 | 12 | 派发锚点 |
| KEN58SH9SLZ6 | A10 | 败 | 17 | 派发锚点 |
| TXZ6RVMQA09D | A10 | 败 | 49 | 派发锚点 |
| WQZVENQ7DTRP | A10 | 败 | 33 | 派发锚点 |
| 1913SE84AXQF | A10 | 败 | 31 | 原提案关联 |
| Q6M2Y34MWKRE | A10 | 败 | 9 | 原提案关联 |
| NHA2KW0RB7VP | A10 | 败 | 33 | 原提案关联 |

本批从只读原日志重新rg抽取并逐条seek核原始offset/bytes/SHA256与正文，未以旧报告结论代替证据。各流在开始时冻结字节cutoff：states 9815行、decisions 9448行、sl-attempts 78行、run-config 15行、run-plans 77行、brain 481行，合计19914行；另核15条runs身份。全部9815状态核character_id与该局实际ascension，9448决策数量逐局等于runs.jsonl记数。

run-plans的局号字段为run，本次正确抽到77条；不能沿用旧抽取器的0行判断。原计划的想要/预计与实际取得/执行分开；dirty历史执行树不能由本批HEAD替代。旧105/109局汇总未重算，不冒称本批验证全历史。88项固定证据/算术检查全部通过，狡诈九局42饮及KEN七饮均有实际动作与耗瓶帧；同战SL不增加独立局数。

当前工作树既有learner/resource_chain.py实际读回这15局，共259个战斗窗口、1081次生命/药栏变化；按SL started_at区分重开。observed_exit仅表示观察到退出，不自动判胜；restart_observed保留未知退出，净损不等敌伤，敌血可见下降是下界，不填缺失致死/重接中间帧。原CLI源码SHA与完整输出保留。

## 实际live源码与消费者

实际live HEAD=4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac；没有本批合入。

| 源码提交 | 当前live祖先 | 范围 |
|---|---|---|
| e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a | 是 | Model observed Silent opening HP loss in continuous fights |
| fc7042d1df0626e9e726f4bc912d9c6f626d908f | 否，不作已实现凭据 | Model observed Silent Royal Poison opening HP in continuous fights |
| 15ea09ad75a421d4bd65a820c187c8ee188186c8 | 否，不作已实现凭据 | Model observed Silent Cunning Potion generation and hand capacity |
| 6403fdcdadc803a092beb5165a068e22bf51c412 | 是 | Model observed Silent Cunning Potion generation and hand capacity |
| 5c7105ff0294466da8319f2934beda05c6040794 | 是 | Model observed ordinary Strangle losses for Silent |
| 5604982e13890e0e2bc8bf8246272e8267321c0b | 是 | Log Silent A10 SL candidate resource comparisons |
| c769739b97389fdc978b6515b83a38e3cd900f67 | 是 | Record candidate comparisons for Silent SL replacements |
| 8b9bacbebb20eaaa1133a9945da6c7abfcda745d | 是 | Recompute observed Precise Cut damage at five and six hand cards |
| 995a345f935efd6d8ae9f67d16bd2653833344d0 | 是 | Extend Precise Cut to recorded Strength and hand pairs |
| 75a27fb2c230dc552761b2ad9da4be8a9a35dec3 | 是 | Model observed seven-card Precise Cut damage for Silent A10 |
| ec29ea34b919344b707e57ba472ea210f9c39d62 | 是 | Fix observed Silent Crusher facing rounding |
| a8b1f8be153fe4f3a34146117546c2178f2e446b | 是 | Integrate repaired legacy learning deltas and bounded continuation adapter |
| d06acd4bcbf2c64608197b7d7b2e572c621bec61 | 是 | Model observed Silent A10 Abrasive attributes |
| a5f588dfdb3fd254fded2d6cacb646672b90cc14 | 否，不作已实现凭据 | Integrate observed Silent A10 Abrasive candidate attributes |

14个源码提交中11个为当前live祖先。开场采用e8b4bb32、狡诈采用6403fdcd；同名fc7042d1/15ea09ad并非live祖先，不能报implemented。普通磨蚀实际live来源为d06acd4b，main的a5f588df不是当前live祖先。十个相关源码路径核live工作字节等于所读HEAD；六个base/live blob不同，保存实际diff，逐差异段核仅Roy/Dai注释名称变化，不称整叶SHA相同。

从当前live模块直接读回14项局部输出：紧勒23伤且保留“弃牌选择未确定”；狡诈连饮累计2/2/2与3/5/5；两组饮药→出刀→再饮的模型组合；TXZ五帧开场成本4；NHA七/六/五手精确切击1/3/5；油灯首次毒的单卡模型5与实际10及stack=null边界。11项数值断言通过，另3项仅记录局部模型组合/缺口。消费者阻止知识JSON读取，以同局已观察牌型和原状态构造固定输入；没有刷新经验表、在线大脑、网络或play。没有完整候选实果、在线派发/保留选择/SL恢复或整战反事实验收。

## 逐项处置

提案正文含每项局号/层/回合/账本、原文SHA、反例、未知、旧规则、验证、预期行为及回退。

- silent-proposal-08eaa60bcc449852：waiting；七饮和两次真实回复可复现，但没有同资源、同后续牌序的不饮用/留药至boss整战结果，不能校准持药价格或设固定保留阈值。
- silent-proposal-92920295a648b540：waiting；缺固定后轮抽序、药栏和入口资源的连续通关替线；现有连战目标已经实现，不能据本局改变SL资格或终局权重。
- silent-proposal-a327449c331efbc1：waiting；缺两种结束边界的完整受控后继、同预算随机池配对及独立胜局，不能拟固定血伤交换阈值或改全败探索门槛。
- silent-proposal-a099e89437e942bb：waiting；生成和逐步手位已有live源码6403fdcdadc803a092beb5165a068e22bf51c412；本次也可预测饮药→出刀→再饮，但缺计划妥当保留选择、完整候选实际派发及SL恢复的联合验证，整项保留waiting。
- silent-proposal-47910f82a1fdd98f：waiting；新战开场扣4与连续资源接续已有live源码e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；整项仍缺SL血价、留药与路线预算的受控完整后继，以及未知回复/复活组合的结算顺序。
- silent-proposal-f1374df72d8e6a25：waiting；缺隔离机制误差后的同预算完整后继，以及未用/早用/留药的成对整战结果；不能修改药价、护栏或终局权重。
- silent-proposal-38a49e6c97f31eea：waiting；普通紧勒5c7105ff0294466da8319f2934beda05c6040794与普通磨蚀预览d06acd4bcbf2c64608197b7d7b2e572c621bec61已为live祖先；宽项仍缺弃牌触发/增益来源分拆、重接/反伤/再生等联合完整消费者验证。
- silent-proposal-ef0e38a5dbd3bc07：waiting；缺另选营火、前序事件、早用药或换路线的完整受控结果；不能从两条失败链校准路线血价及持续能力终局权重。
- silent-proposal-7f820c02d39bfaea：waiting；预测比较已有live源码5604982e13890e0e2bc8bf8246272e8267321c0b和c769739b97389fdc978b6515b83a38e3cd900f67；缺独立成对后继、完整派发归属和同预算饱和排序校准，不能改探索门槛。
- silent-proposal-04b6b430759815ed：waiting；精确切击及蟹朝向子公式已有live；油灯仍缺可靠首次消费追踪、跨动作/新战/SL恢复及未见组合的消费者验证，能力完整后继也未证，整项waiting。

## 验证边界与失败保留

无生产源码改动，tsc/vitest/cases均null，未执行生产撤源码失败/恢复通过或完整沙箱套件。88项证据检查、11项局部消费者断言和资源链读回均是材料核验，不能当源码整套测试、独立胜局或收益证明。

一次源码比对初稿将整文件Roy全替换成Dai，连未改变的文本也替换，故boss-start.ts整文件相等断言失败；保存source-normalization-initial.json。改为只核实际差异段后，十路径中六差异均为注释名称。此为材料核验方法修正，未修改源码、输入证据或断言目标，不冒作生产红绿。首次路径探针找错solver/sim子目录，以及猜测的audit文件不存在，只是读取失败；后用rg --files定位真实reflex路径，未以缺文件当玩法缺陷。

## 账本与运维交接

只经根learner/ledger.py update为31个既有本角色条目追加by=learner:strategy-proposal的报告/提案链接与waiting范围说明；不改claim、evidence、first_run、prior、status、version或effect，不将旧shipped条目降为proposed，不代运维登记shipped。没有新游戏结论或重复代码提案ID；最终code_proposals是已领取CLI ID，implementation_domains为空。CLI输入、实际追加回执与读回分别保存，等待调度器消费proposal_results；不手改专用队列状态或已done父请求。

报告 /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-154303-s2/learner/runs/20261014-154330-strategy-proposal/report.md；提案 /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-154303-s2/learner/runs/20261014-154330-strategy-proposal/proposal.md。根ledger是本任务明确CLI记录例外，工作树保持干净、HEAD=base；所有材料在本批忽略目录。不写上线decision-log、eval版本或规则双通知，不停局、不推送、不清自身正在运行的工作树。交付报告不等同经验已入live、大脑读回或量化父要求完成。

材料索引：dispatch.json、assigned-proposals.json及十份原Markdown字节副本、linked-ledger.json、run-identities.json、evidence-manifest.json、六份*.evidence.jsonl、evidence-checks.json、fixed-frames.json、ken-drinks.json、cunning-drinks.json、card-types-provenance.json、consumer-check.json、resource-chain.json及summary、source-ancestry.json、六份base-live.diff、核验脚本/日志、ledger-updates.jsonl、ledger回执/读回、gitleaks结果与final-verification.json。

验收补记（2026-10-14T16:03:54+08:00）：账本读回初稿自写fold时将追加evidence当覆盖，漏掉CLI原生added时间与追加语义，导致silent-0005 evidence一致性断言失败。原脚本字节与失败日志保留verify_delivery.initial.txt/delivery-verification.initial.txt。使用原ledger.apply逐物理行读回，另按原ledger.fold核31条claim/status/evidence/version等字段均无变化；未再次追加账本、修改旧证据或修生产代码。这是验收工具错误修正，不作为源码红绿。

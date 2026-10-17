# G1a 知识阶段交付（revision 1）

请求 roy-20261016-global-build-g1a；冻结输入SHA 66f3ad3a272f4fe74f12d0832ea220be57f5aade9e2f89a0a1044e261166ff5b。原owner/thread/batch见 start-receipt.json。本阶段只复用旧结果和原角色日志，未运行模拟、拟合、模型/API或对局。

Roy要求：四闸、角色隔离、冻结切分和生产边界、未知保留、学习入库及读回。下表与资源端点是从Silent实证得出的限定结论；授权不提供机制事实。

## 固定对象与逐Boss缺口

R366模型 7e1193cef9467416bc10c8e344a49f4fd98390c7，结束日志截止 2026-10-15T20:20:01.537Z，107调参/460验证，B2/B3各458有效。原生产70输入差；本轮读回实际live 098fbea4b753b9786d4da84072dac574d0975a37 的210输入中71项不同，全部逐叶列于production-boundary.json。两者均不冒充当前生产重校准。

|Boss|B2/B3有效n（独立局）|B2失败|B3失败|Brier B2/B3|预测−实际 B2/B3|血比 B2/B3|数量缺口|
|---|---|---|---|---|---|---|---|
|QUEEN|29/29（29/29）|['brier', 'gap']|['brier', 'gap']|0.241/0.229|+0.309/+0.282|1.019/1.119|0；质量所需新增数未知|
|AEONGLASS|34/34（34/34）|['brier', 'gap', 'leak']|['brier', 'gap', 'leak']|0.1898/0.2029|+0.173/+0.175|3.957/4.038|0；质量所需新增数未知|
|TEST_SUBJECT|27/27（27/27）|['brier', 'gap', 'leak']|['brier', 'leak']|0.1784/0.1693|+0.166/+0.136|3.603/3.469|0；质量所需新增数未知|

数量闸≥10，Brier≤整体1.25倍（B2 0.1385/B3 0.141375），胜率偏差≤15pp，血比0.7–1.3；无降低。所有三幕/最终对象为AEONGLASS、QUEEN、TEST_SUBJECT，仍均低可信。QUEEN原30实际结局/30局中1模拟错误，n=29；不可把30写成有效验证。全12Boss附表含首试/SL、排除原因与逐源身份，见calibration-readback.json和act3-attempt-identities.json。它们保留首试/SL身份，不把predicted_death截断算死亡；独立局数不等首试成功率。

A10整体残差B2 +0.035/B3 +0.039，血比1.313/1.329；F49有效29，+0.300/+0.256、2.681/2.774，仍失败。A0–4/A5–9验证均0，各距诊断10例缺10，不能借A10发布。

## 连战资源契约与未知

continuous-resource-contract.json为机器可读端点契约；raw/保存30条实际原帧，区分刚胜利后与后继地图端点，run-and-sl-evidence.json保留原行offset/bytes/SHA。复用六局既有研究，只核原字节，没有新增整场计算。四原局分别8/60、17/84、50/83、2/70进F49；实际敌人为沙漏、女王、实验体、实验体。TDL首个可操作4HP；64V首战后3/116、F49入房28、可操作30；7S8后场64/122并新增药瓶形石头。上限/永久牌组端点相同；药槽、金钱、遗物计数及HP须分开场/奖励变化。列明实见消失能力，不能推及所有未见增益；未记录的充能/复活、牌/药/遗物开场效果均unknown。

double-boss.json原4局0胜、8192模拟仅旧价值曲线；后续7S8已有SL胜，既非证明联合模型校准，也非证明不能通关。平均HP不能代替资源分布和两场联合胜率。不修改原double-boss参数、留药/保血/费用/目标/SL阈值。通用两场接口与自然消费由watcher实现；071301/074303原策略owner输入/文件/注册/任务均未改，后继未交付内容仍未知。

## 经验、提案与验收

经验版本 2026-10-16.g1a-r1，新增4条边界经验并限定旧silent-double-boss-resource-handoff，原22证据局/n_support保持。其余条目逐值保持。原资源提案链沿用，校准边界新提案经CLI关联；实际ID与合入见deployment/readback和最终报告，不冒标shipped/通用接口implemented。

本轮仅知识/材料改动，复用原R366精确宿主488文件4915过2跳与原源/合后检查，未重跑全量套件。必须另执行当前候选和实际live经验的生产loader/render消费者探针，保存输入/输出与SHA；固定消费者仅证明可读，不证明自然采用/收益。所有原审计失败与schema草稿保留在learner/runs/20261016-global-build-g1a-r1/。

## 异议与后续

questions.json给出逐项限定/反证与旧经验ID；发布后按授权根目录双通知，交ops→watcher→Roy，不代填确认。学习者本阶段交付不关闭原校准、0332或global-build父要求。未来当前生产重校准必须另冻结对象/模型与输入，保持原切分/门槛；联合评估缺数据先unknown。现有定期refresh-silent.py入口及升阶/新增20实际boss结局触发不变，本轮不复派原周期校准。

## 实际交付读回

源码链 c5de2c42bcb944822c36dd0efecff11e541baf76 / ef6831db40cb90733bcedced3760dbe53a2f8e88 / 28161b2d2a31e95587999fc6e5028acd727cecb2，实际经验合入 b2bdb0b1dbc7ec9a39909595238b00efbb718321，读取回执源 fa48e9f1cca4c6ee030df58f842c2ce39f055acd，发布 3394e7912f2b4bec3715761858f831f3fa6040dd，固定树 de12005a2b4dde0db4adbd83c116e7e9914038cc。全部已核为实际live祖先。版本 V5.silent-g1a-knowledge1 / 经验 2026-10-16.g1a-r1，正式release_id交ops核号。

账本silent-0494只由CLI追加proposed及实际来源；shipped由ops登记。提案silent-proposal-08156445e1c13d33为结构追溯，当前生产校准/通用联合接口未标implemented。既有资源提案/普通策略owner保持。首轮锁忙未改live；第一次live探针通过但材料.log被忽略规则拒绝暂存，合入4d2a9ad已撤回，保留刷新b342d47；失败原件见failed-publication-1/。修正精确审计文件force-add后完整发布成功，未重跑全套/旧模拟。

生产消费者实际读取5条经验，输入/输出/命令均冻结；回执 /home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/paper/materials/20261016-global-build-g1a/validation/consumer-receipt.json，SHA f5e9d51ac128110bd8ce39bea9dd5beb6e5395003b0622da11c898dd801f168f。30原帧、70原行与24闸表通过；其他231条经验值不变。未证明自然采用、收益、生产模型校准或两场接口完成。

根目录双通知已实际追加并pread核SHA，见notification.json；只证明写入，未冒watcher/Roy已读或ACK。原676/原校准身份未重开或改revision。learning_result complete仅表示本轮五项知识交付入live且固定消费者通过，注册仍由ops/watcher沿awaiting_delivery闭环；不关闭原校准、0332或global-build宽父。

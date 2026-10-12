# 静默猎手十项派发提案：核验与处置

记录时间：2026-10-12T20:41:59+08:00。

本批20261012-203310-s2-strategy-proposal只处理dispatch.json列出的十个原id。task=strategy-proposal、character=silent、reason=proposal；无research_request/implementation_request，不匹配根牌量专题，不读取其他专题代替身份。
开工工作树干净，起始HEAD为5fb318eefbcd39516c28a7aefe5009663038f804；按普通任务合并main后base/HEAD为2057b04d5b1bb15fcee20dfb50f94867014a4955，仅快进7个运维记录文件，没有本任务源码提交。
六个来源局runs.jsonl均SILENT/A10。十份原Markdown按队列SHA核实并保留，不改原提案、不扩队列、不重复登记id。

本轮从原日志偏移读取1062状态/1043决策，共2105条，逐字SHA、角色、楼层通过；18个有界连续区间重新核对，15项机制端点、4组同指纹配对通过。复用上批定位表和已读离线核验脚本，所有输入重新取自只读原日志，见reused-materials.json。只覆盖相关楼层，不声称六局全程或全历史审计。
六份冻结输入调用当前learner/audit-selection.ts全部exit0：206候选段、74段被重问替代；actual_full_candidate_result全部null。该null是消费者的保守范围，既不证明方案没执行，也不是单凭字段就证明源日志绝对不可补；本次未取得可认证全部中间事件的材料。

## 逐项处置
### silent-proposal-c20b5139dd0dff71

处置：waiting。历史实际移动表及连续模型输入未冻结；当前观测端点不能验收技能收益、跨轮增长、污染清除的完整联合重放。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：DUZUBAJ3A8GP F27 T4—6。重点账本：silent-0168。
完整原账本关联：silent-0168。
原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c，本目录同id.original.md保存原字节。

支持：原状态274830—274833污染0→3→3→6，能力牌没有增加此帧污染；T5三技能0→6→12→18，末挡17，下一轮净损9、污染清除、敌本体净扣13。

反例与未知：技能同时有挡或毒收益；没有同起点完整替线实战，不能因污染而强制少打技能。

已有代码/旧规则：turn-solver.ts:2034/2819按技能累计火花与逐击污染；rollout.ts:2378接入增长。b2805be4ba44b7375c7908d873889372cc3cfe6c已为live祖先。

预期行为与验收：冻结A10手牌/抽序、移动表和逐卡状态，比较HP/挡/毒/敌HP；完整替线另按独立局后移验证。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-ae9e692d680e3819

处置：waiting。没有遗忘死亡返敏、同属性多来源抢夺及临时属性混合返还的相邻观测，不能补全来源模型。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：5PM6JAQG6FNQ F39 T2、T4—6。重点账本：silent-0183、silent-0005。
完整原账本关联：silent-0183、silent-0005。
原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5，本目录同id.original.md保存原字节。

支持：274351/274352/274354两步法使敏捷−4→−2→0；274357/274358失落退场时力量−4→0，274362敏捷又−2。冻结F39的71个遗忘观测没有零血帧。

反例与未知：末次一次步法只回−2敏，毒杀失落仍不能保住玩家；负属性公式正确不等于已验证所有来源返还。

已有代码/旧规则：selection-observation.ts按能力端点记变化，名单变化时不凭index推实体或返还；dc0e6080cb20c508d94c006648cc3edf0188d306已上线。

预期行为与验收：冻结抢夺前后、来源退场前后、临时属性到期帧；逐来源核验，击杀顺序另需完整对照。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-52f1e1bd2e7db0ed

处置：waiting。首样本读取子项已有；仍缺历史实际移动表输入与覆甲独立触发/叠加来源，不能验收完整成长模型。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：CA5KE8GFJ9X2 F13 T1—5。重点账本：silent-0231。
完整原账本关联：silent-0231。
原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376，本目录同id.original.md保存原字节。

支持：273238/273247/273252/273258/273263力量0/0/4/4/8、覆甲9/9/8/7/6；喷水11→15→19，施弱后11/14。末2HP/10挡至0HP，净损被零血截断。

反例与未知：覆甲序列未隔离全部减层触发；实际死亡净损2不等于显示14−10=4。

已有代码/旧规则：monster-db.ts当前进阶exact直接返回观测HP/攻击，源4ed3c72df30f27b881da637aebf528b97440e0bb；room-costs.ts门槛仍5，源295a90aef9eb6f5b267490294f7733806419c45a。均为live祖先。

预期行为与验收：固定数据库调用输入及T1—5轨迹，补可区分覆甲条件；保持房间代价五样本门槛。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-6dd8bbff876be528

处置：waiting。缺同种新旧召唤并存/替换的稳定实例身份及实际移动表输入，无法验收新实体不继承旧计数的全部分支。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：5PM6JAQG6FNQ F38 T3—4。重点账本：silent-0233、silent-0209。
完整原账本关联：silent-0233、silent-0209。
原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5，本目录同id.original.md保存原字节。

支持：274308/274313电击力量2→4、攻击17→19，index4→3；F38冻结帧每帧最多一个ZAPBOT，只有类型enemy_id/index等字段。

反例与未知：先杀爪牙35伤/损3只是未执行候选；index变化不能证明是新实体或稳定身份。

已有代码/旧规则：rollout.ts把HIGH_VOLTAGE_POWER纳入每个SimEnemy的growth，源b2805be4ba44b7375c7908d873889372cc3cfe6c已上线。

预期行为与验收：补进入/退场/再召唤的可区分观测与冻结模拟输入；不由单种连续帧推出固定击杀顺序。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-578e415a259e6835

处置：waiting。缺完整候选步骤/中间事件的执行证明、跨重规划资源归因及能力累计收益；当前消费者有意保留未知，不能整项关闭。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：8JRE1C4H4Z2W F17 T6；F33 T1—11。重点账本：silent-0079、silent-0021、silent-0125、silent-0018等（完整关联见下）。
完整原账本关联：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。
原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a，本目录同id.original.md保存原字节。

支持：270216/270282完整指纹相同，F33 T2实损3/15，敌净扣10/17；本局consumer66段中21段被重问替代。末T11为5HP、22挡、显示37攻击，最后净损5受零血截断。

反例与未知：F17 T6抽牌后重问，候选省血不等于整轮省血；末试延至T11仍败。原预测0/24与5/24不能称同死率。

已有代码/旧规则：候选分层9d8278702dbc581b5015ba7ec9a70dc0fb94cccb、首次派发fdaf787a372880b0438e73bcac7e6d2168b038ed、端点dc0e6080cb20c508d94c006648cc3edf0188d306、终局83512ddcd2c70fd9b983dc38524ff25c8970c1d3均已上线。

预期行为与验收：将首/三试T2、第二试T5、F17 T6及末T11逐段核对；SL恢复单列，补中间事件才归因累计收益。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-c0767768bf6a7ab1

处置：waiting。缺覆盖重放、弃牌后完整执行链与受控整战胜线，不能设置探索禁令或血价系数。

来源任务：postmortem → strategy-proposal；本角色实证范围A10。
证据局/层/回合：YF0LXT1QSTGG F48 T1、T5；F33重打。重点账本：silent-0079。
完整原账本关联：silent-0079。
原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb，本目录同id.original.md保存原字节。

支持：271309/271348同指纹，第二/三试T1实损0/9、敌净扣45/38；本局consumer52段中22段被重问替代。

反例与未知：第四试T5候选弃牌后没有完整执行，末试恢复挡续步仍败；F33重打有成功反例，不能否定所有探索。

已有代码/旧规则：66283dd9982bdd7f480da7a4d9bfefea0572a9ac已记录同题原/替线预测资源差，scope=current_turn_prediction且execution=unverified；端点/终局另列。

预期行为与验收：固定0/9和45/38，保留F33成功及未执行替换反例；按run_id切分后移验证，不能把六次SL当六局。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-a46bdb7fe711d79a

处置：waiting。缺跨阶段伤害来源的完整中间事件及完整候选执行链，不能认证累计兑现或据此改排序。

来源任务：postmortem → strategy-proposal；本角色实证范围A10。
证据局/层/回合：YF0LXT1QSTGG F48 T3—5。重点账本：silent-0021、silent-0027、silent-0028、silent-0085。
完整原账本关联：silent-0021、silent-0027、silent-0028、silent-0085。
原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6，本目录同id.original.md保存原字节。

支持：277512/277513敌4/111HP、4毒、15力→212/212HP、0毒、0力；末轮五敏先得23挡，第三小刀后六敏仍23。277527为触媒2、零毒、18HP/23挡/44攻击，最终HP0。

反例与未知：其他尝试建立毒雾/余像仍败；持有毒组件不是已经施放，零毒本身不能确定整战死因。

已有代码/旧规则：aad2700abed6dff1d66e87fb36aaa6fedb39adf3已上线；silent-phase-current.ts分列持有与当前已建/毒/阶段HP，poison_damage_already_dealt=null。

预期行为与验收：固定111→212、清旧毒、零毒触媒、23挡不倒补；完整事件可用后分别核直伤/毒/额外触发。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-1044224808015e5c

处置：waiting。缺相同资源起点的完整替线及独立后续验证，不能启用B2零胜并列时固定低损血优先。

来源任务：postmortem → strategy-proposal；本角色实证范围A10。
证据局/层/回合：XP2SL33HT0D9 F33 T1、T3—4。重点账本：silent-0079。
完整原账本关联：silent-0079。
原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5，本目录同id.original.md保存原字节。

支持：271992/272040同指纹T3实损9/14、净扣24/27；271982/272195同指纹T1实损2/10、净扣25/34，后者还建立力量。

反例与未知：两线后轮抽弃牌/选择不同且无完整胜线；末试T2零损、T3损4，不能仅按少挡牌数或存活轮数归因。

已有代码/旧规则：66283dd9982bdd7f480da7a4d9bfefea0572a9ac已把血价/伤害/力量预测分列；没有把零胜并列标为安全。

预期行为与验收：冻结9/14、24/27及2/10、25/34，保留成长差；按独立局验证，不由全败样本拟全局惩罚。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-7cbc6005db712ba9

处置：waiting。缺联合候选收益、额外触发隔离及混合意图缺值语义；不能用现有局部事实关闭全提案或修改权重。

来源任务：postmortem → strategy-proposal；本角色实证范围A10。
证据局/层/回合：XP2SL33HT0D9 F33 T2—5。重点账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。
完整原账本关联：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。
原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291，本目录同id.original.md保存原字节。

支持：278236/278237/278242爪力量0→−9→0；T2轮初14挡到20且零损。278249/278252/278253火箭57→38→28；四敏脆弱下两轮挡牌各6，末毒后敌153/125、玩家0。

反例与未知：当轮朝向与虚弱贡献可分列，但已建力敏/毒未带来减员；额外触发未全隔离，混合意图含null不能自行补0。

已有代码/旧规则：dc0e6080cb20c508d94c006648cc3edf0188d306端点与83512ddcd2c70fd9b983dc38524ff25c8970c1d3终局已上线；不认证完整候选收益。

预期行为与验收：固定57→38→28、14→20、0→−9→0、6挡和3+7毒净扣；额外分支须有本角色相邻帧，未知保持null。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

### silent-proposal-c59f592f1427a67e

处置：waiting。局部端点无法闭合宽机制包全部累计收益、跨重规划归因及完整恢复/资源链，保留原提案waiting。

来源任务：experience-update → strategy-proposal；本角色实证范围A10。
证据局/层/回合：YF0LXT1QSTGG F48 T1、T4—5；XP2SL33HT0D9 F33 T1—5。重点账本：22个原账本关联见下。
完整原账本关联：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。
原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2，本目录同id.original.md保存原字节。

支持：两局三个同指纹配对、阶段清毒、临时减力恢复、轮初14挡与死亡截断已重核。两局consumer共110段，其中44段被重问替代。

反例与未知：两局同存档相关尝试不代表原宽机制包101局的全部子机制验证；本轮没有重新审计两局所有路线、回血和药水。

已有代码/旧规则：原答/替换/派发/端点/当前阶段/终局等子项均有真实live祖先，见source-proof.json；完整候选结果仍null。

预期行为与验收：按子机制分别列支持/反例与验收分母；继续分列预测、已派发、已建立、已结算、恢复资源，不补未见事件。 当前只保留可核实事实、所有选项和既有选择规则；没有证据支持的新参数不加入。

## 共用验证与限制

当前核实live=7a76a08905556269f1cecc36916866b3ab7c19e6。source-proof.json的11个有来源路径均核真实源码commit为live祖先；另含消费者入口、JSON工具、combat-plan和SL选择，共15路径。15路径与前批base逐blob相同；当前base/live有11路径逐字相同、4路径仅Roy/Dai注释署名差异，完整差异另存source-main-live.patch。本批不将这些已有子项记成新实现，也不将完整提案误标duplicate。

统计单位是独立run，同局SL不拆到训练/验证两侧。所列帧是发现/回归证据；没有新独立受控完整胜线、没有新系数拟合、没有对其他进阶或角色外推。F39遗忘71观测没有死亡帧；F38电击每帧至多一只且无稳定实例ID，不能由索引填补身份。历史dirty运行树也不能用当前知识数据库倒填实际输入。
预期影响仅为保留可追溯处置和下一次补证条件，策略效果仍未知；经验沉淀不在本批冒报已入库。

无生产源码/知识/经验变更，撤源码失败与恢复通过不适用；未运行tsc、vitest或完整沙箱，tests三项均null。上述数据核验与消费者执行不是新实现测试、完整软件测试或胜率验证。
一次临时注释差异检查漏接受/**导致断言失败，初败诊断和修正另存source-comment-check.*.txt；修正验证器后确认仅注释差异，未改生产源码。这不影响原始证据核验。

本批没有提交、合入、eval版本或shipped。merge=live因无可合入的生产变更不执行；不是待合入代码。回退无生产对象；原日志、初稿、失败和CLI追加历史均保留。
账本仅经根ledger.py追加本报告/提案路径及每项缺证说明，不改已有claim/status/version，不重复增加支持证据。原已上线账本不降级；没有新经验需创建proposed条目。

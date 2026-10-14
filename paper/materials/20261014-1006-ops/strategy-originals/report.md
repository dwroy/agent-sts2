# 本批十个静默代码提案复核与处置

批次：20261014-094303-s2-strategy-proposal；任务：strategy-proposal；角色：silent。
基线：1375905e06a29935f1bda6021321ff10541f0196；merge main 返回 Already up to date，HEAD 未改变，初始工作树干净。
本批learn.json为reason=proposal，十个proposal_ids，与角色/工作树/六锚点相符；无research_request、implementation_request或proposal_repair。普通专题请求绑定另一个批次，本批未承接。只处理十个原CLI id，未另造id或改原文。

结论：十项均waiting。机制端点与已部署子功能分别有证据；综合归属、分源或受控后继仍缺失。没有新增源码、经验、策略参数、提交、live合入、发布版本或shipped；无关角色行为保持。

## 证据与现有消费者

仅分析六个SILENT A10局：DUZUBAJ3A8GP, 5PM6JAQG6FNQ, CA5KE8GFJ9X2, 8JRE1C4H4Z2W, YF0LXT1QSTGG, XP2SL33HT0D9。runs中六局均败，源码均带dirty，不能用当前源码冒称重建当时运行树。冻结4062状态、3941决策、38条SL记录、6 runs与6 run-config，共8053条原行。SL记录不是独立局数。原字节、原行号、offset、length与SHA保存在evidence-manifest.json，复读原字节均相等。
原提案正文逐SHA相符，保存在各 *.original.md；原队列记录、账本及本角色经验另留快照。旧支持数、其他角色及原提案提及的历史局不当本批已分析的新证据。
固定材料核验23项通过（material-verification.json），包括原字节复核、污染/增长/负属性/阶段/临时减力/朝向/同指纹净差；这是材料核验，不是生产tsc/vitest、模拟通过或撤源码红绿。

| 局号 | 消费范围 | 动作 | 题段 | 可见相邻区间 | 整轮端点/窗口 |
|---|---|---:|---:|---:|---:|
| DUZUBAJ3A8GP | bounded | 45 | 8 | 0 | 0/8 |
| 5PM6JAQG6FNQ | full | 638 | 83 | 202 | 25/101 |
| CA5KE8GFJ9X2 | bounded | 26 | 4 | 0 | 0/5 |
| 8JRE1C4H4Z2W | full | 659 | 113 | 264 | 44/111 |
| YF0LXT1QSTGG | full | 1065 | 204 | 424 | 54/160 |
| XP2SL33HT0D9 | full | 712 | 123 | 274 | 35/122 |

完整输入：5PM/8JRE/YF/XP各exit0；DUZ与CA各exit1，因原decision_id缺失（DUZ 268789/268818/268864，CA 267143）。保留拒绝stderr和完整原输入；另用DUZ F27的45条、CA F13的26条原决策各exit0，不补ID/尝试号、不跨缺行连接。无SL房间sl_attempt=null导致严格消费者不认证相邻/整轮；人工原帧端点仍能核污染与增长，不将null补成1。
消费者actual_full_candidate_result全为null是其明确不认证完整候选的设计，不证明实际从未完整执行。T1开场认证未知与上述手工同指纹端点净差并存；净HP/本体差不是未截断入伤、单牌贡献或整戦反事实。38条SL不扩独立样本数。

## 既有live源码范围

source-consumer-checks.json核13文件来源均为实际live祖先；9个预测/端点/整轮审计文件和monster-db的Git blob与本批base相同。turn-solver/rollout/passive-pieces三个blob不同，逐patch差异仅Roy/Dai注释文本（base-live-source.patch）；不笼统说整树相等，不覆盖这些并行字节。
关键祖先：e75438488df159b2e8e9d3458cf219b39aadd933（离线整轮）；dc0e6080cb20c508d94c006648cc3edf0188d306（端点）；83512ddcd2c70fd9b983dc38524ff25c8970c1d3（终态）；9d8278702dbc581b5015ba7ec9a70dc0fb94cccb（候选）；66283dd9982bdd7f480da7a4d9bfefea0572a9ac（HP护栏/SL资源）；1d57f9d0dbbb63603e9ce9768e74cb2021478464（阶段参考）。这些只说明对应子功能，均不作为十个宽提案的完整implemented_commit。
当前moveDamageAt/monsterHpAt已有当前进阶事实时直接读取；并非房间代价五样本门槛。HIGH_VOLTAGE成长、火花selfPower增量、技能新增污染、阶段清旧毒路径已存在；本批没有发现能据此直接定位的新缺陷，不为已证机制重复写规则。

## 逐项处置

### silent-proposal-c20b5139dd0dff71

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0168。
证据：DUZUBAJ3A8GP F27 T4—6；states274830—274839；decisions268893—268897。T4污染0→3→3→6，能力勒紧不新增；T5火花6、污染0→6→12→18，次轮清除；净损9、本体净扣13。
反例与限制：迷雾同时加6毒与虚弱，技能还有格挡收益；不能按技能张数单独认定亏损。轮内剩余污染已反映于当前意图，tainted=0初始化不能孤立认成漏算。
处置：waiting。火花增长、技能污染、清除与迷雾毒收益有帧证；尚缺原在线A10移动表调用输入及联合生产回放，少技能替线无完整后继，不能据净损9改出牌规则。
旧/预期行为：保持原选择与全部选项；继续原请求“冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。”的限定验证，不加入未证参数。
下一步验证：冻结同一局面手牌/毒/弱/污染/移动表，联合重放当前效果与后轮增长；比较少技能线须保留未知后继。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-ae9e692d680e3819

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0183, silent-0005。
证据：5PM6JAQG6FNQ F39 首试T4—6、末试T4；states274351—274358、274362、274391—274397。负力−4至失落退场后0；步法负敏−4→−2→0，遗忘随后再次夺2敏。
反例与限制：末试毒杀失落取消其攻击，仍8血0挡对遗忘19死亡；首试返力不等于胜利。末GAME_OVER玩家powers为空，不能当作返还敏捷。
处置：waiting。已核失落退场返4力量端点；遗忘死亡返敏未发生，属性各来源隔离及返还后同轮续牌链缺证，不能用现帧负属性公式或固定杀序关闭整项。
旧/预期行为：保持原选择与全部选项；继续原请求“提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。”的限定验证，不加入未证参数。
下一步验证：补各实体抢夺存量、属性其他来源、返还时点和返后续牌的连续输入；目标顺序需完整同资源对照。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-52f1e1bd2e7db0ed

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0231。
证据：CA5KE8GFJ9X2 F13 T1—5；states273238、273252、273254、273263、273268。喷水11/15/19，力量0/4/8；弱后11/14；覆甲9/9/8/7/6。
反例与限制：现场覆甲下降同时存在命中/回合推进，不能单凭9→8推完整触发条件；2血10挡对14攻击死亡，不是未观察替线已赢证据。
处置：waiting。当前进阶HP/攻击首样本读取路径已有；加压与弱端点充分，但原在线移动表及加压/弱/覆甲/荆棘联合回放未完成，覆甲减层条件未隔离，不能标整项duplicate。
旧/预期行为：保持原选择与全部选项；继续原请求“第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。”的限定验证，不加入未证参数。
下一步验证：核实际读取的A10表及所有修饰项，重放到死亡后荆棘；房间代价的五样本门槛不改变。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-6dd8bbff876be528

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0233, silent-0209。
证据：5PM6JAQG6FNQ F38 T3/T4；23最大血电击机器人力量2→4、攻击17→19，T3仍贡献17攻击、T4才退场。
反例与限制：先清爪牙35伤/损3只是候选，实际选本体线损30；不能把27预测差当作实际后场保血。
处置：waiting。电击17→19增长可核，现有HIGH_VOLTAGE路径存在；日志enemy_id是类型、index会重排，缺同类旧实体退出/新召唤进入的连续身份与冻结召唤输入，不能认证新实体不继承旧成长。
旧/预期行为：保持原选择与全部选项；继续原请求“复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。”的限定验证，不加入未证参数。
下一步验证：核召唤前后实体可追溯标识与成长初始化，再联合验证同实体连续增长及替代杀序。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-578e415a259e6835

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。
证据：8JRE1C4H4Z2W F33 首/三试T2 decisions270216/270282同指纹，端点损3/15、扣10/17；第二试T5 decisions270264护栏候选；末试T11为5血22挡对37、已结算24毒。
反例与限制：末次防御替线延至T11仍败；护栏后有抽牌与重问，候选差不是实际保血。前五判死末轮没有完整结算。原金刚杵→silent-0016关联有既有勘误，0016实际为覆甲，不能新补金刚杵支持。
处置：waiting。沙虫同盘损3/15、扣10/17及既有预测/派发/整轮审计已读回；缺跨重规划完整候选归属、逐来源累计能力收益与SL恢复/回血/喝药联合分账，局部实现不关闭综合要求。
旧/预期行为：保持原选择与全部选项；继续原请求“核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则”的限定验证，不加入未证参数。
下一步验证：保留每次续问/派发与能力建立/使用/结算来源，分列完整入伤、零血截断与SL资源恢复；不拟血价或用药常数。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-c0767768bf6a7ab1

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md
来源任务：postmortem；目标：strategy-proposal；账本：silent-0079。
证据：YF0LXT1QSTGG F48 第二/三试T1 decisions271309/271348完整指纹相同，端点损0/9、扣45/38；271354提前结束；F33第二次SL实际胜过。
反例与限制：第四试T5换线经弃牌后未全执行；第六试恢复挡仍死亡；本局F33的成功SL反对否定所有探索。
处置：waiting。同指纹开场观测区间净损0/9、扣45/38及资源比较已有；T1完整开场未认证，缺跨续问整候选归属和同起点/抽序/预算独立完整尝试，不能拟探索惩罚或禁止SL。
旧/预期行为：保持原选择与全部选项；继续原请求“全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。”的限定验证，不加入未证参数。
下一步验证：记录同轮原答/护栏/SL/覆盖重放和未派发后缀；按局分组后置验证且保留成功SL反例。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-a46bdb7fe711d79a

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md
来源任务：postmortem；目标：strategy-proposal；账本：silent-0021, silent-0027, silent-0028, silent-0085。
证据：YF0LXT1QSTGG F48 末試T3—5；states277512—277513为4血4毒/15力→212血零毒/零力；277518—277519触媒2但毒0；277524/277526挡23、敏5→6。
反例与限制：前五试有毒雾/余像建立仍败；第二阶段未启动毒不是唯一已证死因；无第三阶段或另一构筑完整结果。
处置：waiting。阶段清旧毒/力、零毒触媒及后得敏捷不倒补挡的端点可核；缺逐来源累计毒/挡收益、完整阶段后继与跨重规划候选归属，不能把已持有/已建组件等同完整运转。
旧/预期行为：保持原选择与全部选项；继续原请求“实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。”的限定验证，不加入未证参数。
下一步验证：按阶段分账持有/到手/建立/施放/结算，隔离旧毒清除与新毒来源，再核整个后继。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-1044224808015e5c

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md
来源任务：postmortem；目标：strategy-proposal；账本：silent-0079。
证据：XP2SL33HT0D9 F33 首/二试T3 decisions271992/272040，同指纹端点损9/14、扣24/27；首/末T1 271982/272195损2/10、扣25/34。
反例与限制：末试T1手里剑加力，舍挡线不能抹掉永久收益；末T2减力与朝向零损；六试同存档不作六独立胜率样本。
处置：waiting。双蟹T3损9/14、扣24/27及T1损2/10、扣25/34可核；缺整线执行归属、永久成长净贡献与独立后置A10双蟹同预算完整对照，不能确定并列血价权重。
旧/预期行为：保持原选择与全部选项；继续原请求“核验A10双蟹B2零胜并列的SL换线血价，分列当轮损失、输出与成长；缺独立胜线时保留原行为，不以零差宣称安全。”的限定验证，不加入未证参数。
下一步验证：保留原选线，后置同预算完整尝试比较低损线、成长、朝向及抽序，不填全局惩罚常数。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-7cbc6005db712ba9

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md
来源任务：postmortem；目标：strategy-proposal；账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。
证据：XP2SL33HT0D9 F33 末试T2—5；states278236/278240挡14→20；278236/278237/278242碾碎爪力0→−9→0；278249/278252/278253火箭攻57→38→28；末轮11血6挡对17攻击。
反例与限制：步法4敏捷且脆弱时偏折/防御仍只6挡；能力已建立、终局仍无减员。不同朝向与虚弱降低的19/10不能全算到单牌。
处置：waiting。朝向、临时减力恢复和轮初14挡局部模型已有；额外格挡来源隔离及混合意图/未知条件的联合候选消费者验收未完成，不能标整项已实现或改变能力权重。
旧/预期行为：保持原选择与全部选项；继续原请求“用本角色日志核验双蟹朝向、临时减力、船夹板T2格挡与能力实际兑现；补缺失条件参考，保留原出牌权重和未验证条件。”的限定验证，不加入未证参数。
下一步验证：冻结混合意图/格挡来源/临时恢复/朝向的联合输入，逐帧验即时与未结算量，保留未知条件。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

### silent-proposal-c59f592f1427a67e

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md
来源任务：experience-update；目标：strategy-proposal；账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。
证据：YF0LXT1QSTGG F48 T1/T4/T5与XP2SL33HT0D9 F33 T1—5；沿本批两局所有原决策/状态及上述成对材料。
反例与限制：YF触媒2/零毒、苦无后得敏不倒补；XP永久力增长仍未减员；本批相关读档和全败结果不提供整战因果或持药反事实。
处置：waiting。多个预测、端点、整轮与临时减力子功能实际在live祖先；缺全部组件联合消费者验收、跨续问完整候选归属、逐来源累计收益及SL恢复资源分账，不能以局部模型标综合提案duplicate。
旧/预期行为：保持原选择与全部选项；继续原请求“核实静默临时减力/轮初挡与已建能力兑现，分列同盘SL原答/替换/实际血价；缺完整胜线时保留规则并后移验证”的限定验证，不加入未证参数。
下一步验证：复用已有审计，补完整组件分源、后续执行及资源恢复联合链；本批不重做原历史机制全量研究。 新实现须固定夹具撤源码失败/恢复通过，再按原沙箱入口与live流程；本批未执行这两类源码测试。
样本/时间切分：本批六局为发现/回归证据，相关SL不拆为独立局；策略收益需来源之外、结束时间后置的静默A10独立完整局。
预期影响与回退：本批仅保留研究记录、可审计链接和具体缺证项，对局行为无变化；后续源码按真实提交回退，CLI历史不重写。

## 验证、失败与交付

tsc=null、vitest=null、cases=null；无新增生产代码，因此不运行代码套件、不制造撤码失败或恢复通过、不提交、不合入live、不增加eval版本。
首次冻结器只查顶层run_id，states输出为0；已保留evidence-manifest.initial.json，改为state.run_id后重新冻结4062帧。一次工具预检出现临时.codex ENOENT；一次消费者启动会话随后不可找，未生成审计工件，后按独立脚本重新运行。保留工具失败说明，不将其当代码失败或测试通过。
既有金刚杵→silent-0016误关联是早已通知并完成回执的历史问题；本批保存原文/原账本，不重复填支持、不重复通知或代填ACK。本批没有新增与旧知识冲突的游戏结论。
只经根ledger.py update追加本批复核链接与具体waiting理由；保持所有旧claim/status/version/evidence/首证/prior及已shipped子机制，不用本批waiting覆盖它们。code_proposals填原CLI id；无新提案内容不重新add造重复id。
运维交付：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-094303-s2/learner/runs/20261014-094339-strategy-proposal/proposal.md；完整报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-094303-s2/learner/runs/20261014-094339-strategy-proposal/report.md；最终JSON：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-094303-s2/learner/runs/20261014-094339-strategy-proposal/result.json。上线/入库/消费者采用的父要求继续保留，报告结束不代表关闭。

最终读回：53条根账本CLI原行逐offset/bytes/SHA保存于ledger-cli-readback.json；旧claim/status/version/evidence/first_run/asc/prior/prior_note与本批前快照全部相同。十个派发id、六局、角色/工作树绑定和代码提案链接再次核对通过。gitleaks dir退出0，扫描414.78 MB、未发现泄漏；这是材料安全扫描，不是源码测试。final-acceptance.json保留验收结果，HEAD及跟踪工作树零改动。

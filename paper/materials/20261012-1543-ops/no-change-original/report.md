# 静默猎手策略提案处置报告

时间：2026-10-12T15:25:32+08:00。本批20261012-150941-strategy-proposal。

**结论：10个原ID全部waiting。** 现有证据确认局面事实和既有审计子项，但不足以关闭原提案或启用新的出牌/SL策略。本批没有源码改动、提交、合入或游戏版本。**账本补链误覆盖2条共享条目的状态，需运维依原上线行恢复；见下文。**

完整base：`3f159fc6b04971a6b907a2401c6be3f7f3d56a6d`。开工干净，普通批按要求合main后HEAD未变；最终清洁性见final-verification.json。派发身份及全部ID见dispatch.json、assigned-proposals.json，逐项原文/证据/反例/旧新预期/验证在[proposal.md](proposal.md)。

## 实际核验

只用本批六个silent A10局；runs各唯一。选定窗口1062状态、1043决策，原始字节重新逐SHA核对，10原文指纹均一致。四组同指纹资源端点：

| 局/层/回合 | 原/替实际净损血 | 原/替敌净扣血 | 原决策行 |
|---|---:|---:|---|
| 8JRE1C4H4Z2W F33 T2 | 3 / 15 | 10 / 17 | 270216 / 270282 |
| YF0LXT1QSTGG F48 T1 | 0 / 9 | 45 / 38 | 271309 / 271348 |
| XP2SL33HT0D9 F33 T3 | 9 / 14 | 24 / 27 | 271992 / 272040 |
| XP2SL33HT0D9 F33 T1 | 2 / 10 | 25 / 34 | 271982 / 272195 |

这些是同轮观察差，不是固定未来抽序的完整反事实。SL尝试不能增加独立局数；全败样本和成长差异不足拟合更优的探索规则。

现有离线消费者对冻结输入退出0：8JRE 66段/21次重问、YF 52段/22次重问、XP 58段/22次重问；完整候选结果都未知。末轮沙虫5血净损与显示差15、实验体18与21已覆盖；双蟹净损11已覆盖，含Defend/Sleep null的总攻击参考仍未知。这些不是tsc/vitest或胜率测试。

## 逐项处置

- `silent-proposal-c20b5139dd0dff71`（账本silent-0168）：waiting；污染及火花增长的现行路径已存在；本次只有该局观察窗口，未取得历史实际招式输入与毒/弱/弃牌联合源码重放，也没有完整替线后继，不能据T5损9启用少打技能规则。

- `silent-proposal-ae9e692d680e3819`（账本silent-0183）：waiting；已确认失落退场前后力量−4到无该项及遗忘再抢敏捷，但缺返敏死亡帧、多来源同属性和临时增减混合归还证据，不能把现帧总属性充当来源账本或设固定击杀序。

- `silent-proposal-52f1e1bd2e7db0ed`（账本silent-0231）：waiting；首样本读取与五样本房间代价边界已经存在；本局只支持加压及显示攻击变化，覆甲独立触发/时序和历史调用移动表未隔离，不能扩写完整蚌模型或固定成本。

- `silent-proposal-6dd8bbff876be528`（账本silent-0233）：waiting；本局17→19增长已核，现有HIGH_VOLTAGE路径存在；原帧没有稳定实例标识和同种重复召唤对照，不能验收新旧实体隔离全范围，另一击杀序完整后继也未实打。

- `silent-proposal-578e415a259e6835`（账本silent-0079）：waiting；选择/派发/端点和最终死亡子项已在live；本次66段中21段被重问替代，完整候选兑现、跨重规划资源归因和整场后继仍未验证。末轮净损5/显示差15已由现有消费者覆盖，不能再把该子项算缺失或关闭综合提案。

- `silent-proposal-c0767768bf6a7ab1`（账本silent-0079）：waiting；已核同指纹T1实损0/9与扣敌45/38，且同局F33重打确实赢；现有端点审计不证明覆盖重放、弃牌后的整候选完成，缺受控完整胜线，不能新增探索禁令或惩罚系数。

- `silent-proposal-a46bdb7fe711d79a`（账本silent-0021）：waiting；本帧组件/已建/零毒及末轮端点子项已有live实现；仍缺分阶段累计已结算伤害、即时施毒到完整候选执行的归因和独立后继，不能由持有或单步端点调整排序或关闭整项。

- `silent-proposal-1044224808015e5c`（账本silent-0079）：waiting；两组同指纹血价9/14、2/10及输出24/27、25/34已核，但力量成长和后继同时变化，六次相关SL均非独立胜线，不足启用零胜并列时固定低损血优先。

- `silent-proposal-7cbc6005db712ba9`（账本silent-0241）：waiting；14挡、临时−9及恢复、57→38→28已核；完整候选/重规划联合验收和额外触发仍未完成。末轮现有消费者实损11已保留，但含null的Defend/Sleep使总攻击参考未知，不能擅自补零或改排序。

- `silent-proposal-c59f592f1427a67e`（账本silent-0021）：waiting；两局配对及能力时序已核，已有现场/离线审计子项不能代替完整能力收益、恢复链与候选资源归因；本次110段中44段被重问替代，缺受控独立整战对照，综合范围继续waiting。

## 实现、测试与交接

源码提交：无。撤源码失败/恢复通过：未执行，不适用。tsc、vitest、cases均null。无源码变更不运行沙箱完整套件、不做空提交或gitleaks提交门禁；最终对本批文本材料另作密钥扫描，实际结果见final-verification.json。fixes=[]；merged=null；版本无；未登记implemented/duplicate/shipped。

现有实现以source-proof.json的真实live祖先及blob为准，仅证明具体子项。两求解文件与live仅四处注释署名差异，原样保留；六局历史dirty运行源码没有被本批复原。没有把当前刷新数据库当成历史输入，没有读其他角色知识生成结论。

十项均保留原ID待新证据；不重复code_proposals add。根ledger CLI追加了10条proposed/报告链接，精确输入/输出在ledger-update-input.jsonl、ledger-update-receipt.txt。补链前只读预检因沙箱ENOENT未成功，后续CLI仍执行，使用过时快照，误将ops已于15:15登记S1.exp187 shipped的silent-0021、silent-0079当前状态覆盖为proposed。原上线行16336/16343、版本、提交及历史均保留；另经CLI追加2条无status更正说明。学习者不得登记shipped，故恢复原限定经验状态交运维，不冒称记录闭环。详见ledger-correction-required.json、ledger-correction-receipt.txt。未重写旧复盘、原提案或经验库。

交运维的提案路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-150941/learner/runs/20261012-150955-strategy-proposal/proposal.md`。完整机器结果见[report.json](report.json)。此次没有上线规则，无需制造版本、双通知或shipped。

局限：只分析明确列出的六局和房间窗口，不宣称全历史；未观察角色/进阶/机制保持原行为。未来如要实现，按proposal.md各项缺数据和固定回放验收接续，独立后移验证不得与同存档尝试混用。

## 保留的执行问题

两次只读命令在构建沙箱时遇到并行工作树.codex目录已消失的ENOENT，原权限重试成功；少数探索性文件模式没有匹配或路径拼写错误，已通过实际文件名继续读取。没有测试失败、没有提高权限或改动沙箱。原工具回执保存在本任务运行日志，材料不冒充成功测试。


记录复核曾因期待追加前均为proposed而断言失败；实际查出两个先前为shipped的条目，失败原因及原10行已保存ledger-appended-audit-initial.json。该失败不是代码测试失败。

# 本批策略学习报告

记录时间：2026-10-11 22:43:05 CST（写前已运行date）。

已核对全部10个派发ID，均保留waiting。新增局补到了实际资源对照，但没有验证新的选线规则；同时固定base/live预检出现14条文件冲突和1条目录重命名拆分冲突，按本任务第4节停止上线。事实审计可以继续做工程，不要求先有策略胜率证明；本次工程阻挡和游戏证据限制分别如下。

## 身份与基线

- 工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-223051。
- base/HEAD：`1c130a0ce6aa83b360ee7ad3bd08f767c7c87ffe`；开始与报告时git status干净，已执行git merge --no-edit main，结果Already up to date。
- learn.json仅读本批行：task=strategy-proposal、character=silent、reason=proposal、10个proposal_ids；无research_request、implementation_request或proposal_repair。普通专题文件绑定另一批20261010-150327，不匹配本批；未读别的专题代替身份，也未领取整条队列。
- 本批runs：DUZUBAJ3A8GP, 5PM6JAQG6FNQ, CA5KE8GFJ9X2, 8JRE1C4H4Z2W, YF0LXT1QSTGG, XP2SL33HT0D9。runs.jsonl逐一核为SILENT/A10；另核本次新完局SB5N8GT2Y3VW为SILENT/A10，F33失败。只作补充证据，不混入dispatch runs。
- 不派下级agent，未读取其他角色知识、未联网/运行play/修改日志或运维prompt、未推送。所有材料只在本任务scratch；根目录只通过ledger CLI追加本角色记录。

## 原始证据与新局结论

`extract.py` 从只读原日志按已确认角色/局号及相关楼层抽取：1670状态、1704决策、45条SL记录。`*-raw.jsonl`保存原行字节，`*-offsets.json`逐行保存源偏移/长度/行号/SHA，`evidence-manifest.json`保存截取时源长度及抽出原字节串SHA；它不冒称冻结了完整11GB源文件。抽取后逐段重新seek原文件核3419行全部一致。

`verify_evidence.py` 的33项日志断言全部通过；只验证记录，不是tsc/vitest、生产消费者回放、撤码红绿或胜率测试。相同指纹按完整字符串核对，起点优先observed_ts，否则用原decisions.ts连接，并额外核起点fingerprint。

1. 旧锚点四组当轮实盘重新计算：8JRE F33 T2实损3/15、敌净扣10/17；YF F48 T1为0/9、45/38；XP F33 T3为9/14、24/27；XP F33 T1为2/10、25/34。状态起止行和原决策号均在evidence-verification.json。
2. **新增SB5 F33 T3**：决策355271/355331/355391完整指纹相同，分别是第1/2/3次尝试。起点states365551/365611/365671，下一轮365557/365617/365677；实损7/7/13，敌净扣76/62/54。前两次Jev选择的攻击目标分配不同；第三次存在SL替换。第二到第三试多6血价、少8净进度；这只是当前观测至下一轮，后继抽序与整战因果未受控。首/二试同损7而进度不同，单一低损指标不能完成比较。
3. **新增SB5 F33 T2**：第5/6试决策355500/355538完整指纹相同，states365780/365818→365782/365820；实损0/6、敌净扣15/19，换目标多4净进度付6血。起点是T2中途同一观测，不能冒报整个T2从轮初的输出。
4. **不要把上述SB5归入零胜并列**：355391结构化sl_explore.b2原/替线为0.057/0.033；355538.avoid.b2为0.042/0.007，理由均为原线已失败、B2认为所有未试更差仍探索。五轮损血虽封顶55，B2并不相等；这不是原XP零胜并列窄策略的独立验证。F33六次记录为5次predicted_death/reload和1次died，不是六次真实死亡或六局。
5. **新增SB5 F25 T2棱柱**：states365469→365470手牌中的后空翻消失且新牌到手，污染0→3、格挡0→5，敌意图13→16；365471敌已清空，玩家仍38。支持本次技能污染及随后斩杀的边界，不把未结算意图记成HP损失；T2结束战斗，没有新增后续脉动证据。
6. 旧机制确认：DUZ F27火花3→6及技能污染与轮初清除；5PM6 F38召唤中間0力、可操作轮2力/17攻击、下轮4力/19攻击；5PM6 F39失落返4力、遗忘再夺2敏；CA5 F13加压0→4→8、攻击11/15/19、覆甲9/9/8/7/6；XP临时减力0→−9→0、14→20挡；YF下一阶段212HP且旧毒/力0。完整调用验收不能只由这些公式存在推定完成。

新增SB5有棱柱、双蟹，但没有失落/遗忘、蚌、电击、实验体或沙虫。它不能补这些机制的缺失帧。现有源码及原提案内更早证据只用于定位范围，不从旧注释或预训练知识补游戏结论。本批没有更新经验库或宣称大脑已采用。

## 逐项处置

每项的证据局/层/回合、全部既有账本ID、原文SHA、旧/拟行为、反例、验证及回退见本目录proposal.md：

- `silent-proposal-c20b5139dd0dff71`：waiting。已核污染及击杀前结束攻击的边界；缺固定A10移动输入下毒/挡/污染到实际消费者的联合验收，完整替线后继亦缺。窄事实验收可继续工程实现，但本基线合live预检冲突，本批停止上线。
- `silent-proposal-ae9e692d680e3819`：waiting。缺遗忘死亡返敏、多来源抢夺与临时属性混合返还的隔离帧；SB5无对应敌人，无法补齐逐实体模型或目标顺序对照。
- `silent-proposal-52f1e1bd2e7db0ed`：waiting。加压观测已核，但缺覆甲减层条件隔离及固定A10移动表的联合调用验收；新增SB5无蚌。既有首样本读取不覆盖整提案，工程合入另受冲突阻挡。
- `silent-proposal-6dd8bbff876be528`：waiting。已有召唤后0→2→4，不再声称缺初始帧；仍缺完整敌方行动时序、同种重复召唤身份隔离以及生成到消费者的固定验收。
- `silent-proposal-578e415a259e6835`：waiting。两预测审计候选尚非live祖先，实际派发、重规划和能力结算关联未完成；审计部分是工程缺口，完整替线对照是改策略的证据缺口。本基线合live冲突，停止上线。
- `silent-proposal-c0767768bf6a7ab1`：waiting。5604982e预测资源比较未入live且只标execution=unverified；覆盖重放/弃牌续步至实际完成仍缺联合验收，改探索另缺同入口完整受控后继。合入预检冲突。
- `silent-proposal-a46bdb7fe711d79a`：waiting。a83d9ab为live祖先但仅覆盖阶段结束参考；持有、建立、分阶段结算到实际派发审计未齐，缺同资源完整后继支持改排序，不能将整项标duplicate。
- `silent-proposal-1044224808015e5c`：waiting。SB5补两组实盘血价但B2不属于零胜并列；仍缺XP2同资源完整抽序/成长后继和独立整战比较，不能启用固定低损血优先。审计工程上线受冲突阻挡。
- `silent-proposal-7cbc6005db712ba9`：waiting。已有公式及范围参考只覆盖子项；缺额外触发隔离和条件参考、抽弃重规划到实际兑现的联合验收，新增SB5不能补船夹板/镣铐组合。
- `silent-proposal-c59f592f1427a67e`：waiting。新增SB5补当轮资源差，未补完整受控整战；be698559/5604982e均非live祖先且实际派发、重问、结算尚未闭环。合入预检冲突，保留原综合提案。

## 实现现状与合入障碍

只读固定预检：live=`65e3d10a9b82a03176bafe6a6e61c6ef53f12c12`，base=`1c130a0ce6aa83b360ee7ad3bd08f767c7c87ffe`，`git merge-tree --write-tree <live> <base>`返回1。14条文件冲突涉及notes/core-cycle-quantitative-learning-request.json、fix-queue、for-roy、lessons、ops/inbox-dev、paper/data的7文件、decision-log、ledger；另有目录重命名拆分冲突。路径/原输出在live-preflight.txt/json。不覆盖知识刷新或并行记录，不进入live提交刷新、实际merge或reset。因此没有“合入后失败回退”的事件。

- a83d9ab675560a177249aa638e99df40bcfb5553已是该live祖先，只实现阶段结束参考，未覆盖持有/建立/执行全链。
- fa9e33062aef3aa04e82c5413dd91d4f710a942f、9df41e7df522c8fae176766d0b924d822c541996、7a1a8f1f4dd8dbf46a9de6b1127cb869fea24065均为live祖先，提供通用污染/招式增益/成长路径，不能关闭宽提案。
- 5604982e13890e0e2bc8bf8246272e8267321c0b与be69855995737d6f381adb10bf248964832da24b仍非live祖先。源码明确分别是current_turn_prediction/execution=unverified和predicted_candidates/pending_dispatch/actual_turn=null；没有实际结算闭环，不登记implemented或duplicate。旧候选不另造重复ID或复制提交。
- 当前monster-db.ts:711的moveDamageAt优先已观察当前进阶数据，medianHp读取对应进阶HP；room-costs.ts的MEASURED_ROOM_MIN_N和monster-db.ts的ROOM_COST_MIN_N仍为5。本批未改其读取或门槛，也未以当前刷新DB冒充历史运行的精确输入。

后续可以在原链中接续：运维处理现有main/live并行记录冲突；使用原候选及固定帧完成事实审计的真实调用、派发、重规划和结算关联。机制未见条件等待对应同角色新局；若要改选线权重，另需同入口完整后继和按独立局时间后移的验证。审计实现不以缺胜局为借口永久等待，规则修改也不以框架上线当效果证明。

## 记录、验证与失败保留

- 无源码修改、提交、合入或eval版本，fixes=[]、merged=null；tests固定为tsc=null、vitest=null、cases=null。没有撤源码失败/恢复通过记录，没有运行生产沙箱入口、提交前gitleaks或git commit；不能把日志断言当生产测试成功。
- 仅对silent-0168、silent-0079保存新增SB5证据，随后用根learner/ledger.py update追加status=proposed、by=learner:strategy-proposal及本批提案/报告链接。CLI回执与核对保存在ledger-receipt.txt/ledger-appended-records.json。其他ID由本报告链接原账本；不重复写历史复盘、不修改首证、不登记shipped。原10项结果由proposal_results交调度器沿原队列处置，不直接改队列或根请求。
- 辅助查询曾假设runs.character恒为字符串，遇null报AttributeError；改用str(value or '')后成功，未改原记录。一次shell启动被沙箱临时路径扫描ENOENT阻断，原命令未执行，之后同范围只读调用成功；未放宽权限或读取错误涉及的其他项目。两个猜测文件路径查询不存在也已保留说明。原始失败说明见failures.md。
- 31项初验通过后增加两项B2非零并列断言，最终33项通过；两份输出分别verification-first-pass.log/verification.log，未重跑无关生产测试。

提案交运维：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-223051/learner/runs/20261011-223107-strategy-proposal/proposal.md`。

报告：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-223051/learner/runs/20261011-223107-strategy-proposal/report.md`。无上线、双通知或shipped事件，无需生产回退；保留原失败、提案原文及本批全部材料。

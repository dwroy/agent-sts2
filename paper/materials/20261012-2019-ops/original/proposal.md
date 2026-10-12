# 静默猎手：本批十项策略提案核验与处置

记录时间：2026-10-12T20:17:14+08:00。

批次：20261012-200522-s2-strategy-proposal；task=strategy-proposal；character=silent；reason=proposal。
本批无research_request/implementation_request，仅处理派发十个原id；未领取其他提案。根牌量专题绑定另一批，身份不匹配，按普通任务执行git merge --no-edit main，结果Already up to date。
本批基线及当前HEAD：`257c41df88157b59e520232dae1210662b08d8e6`。无源码、知识或经验修改，无新代码提案id，无提交、合入、版本或shipped。

## 证据与验证范围

六局runs.jsonl身份均为SILENT/A10。重新按原偏移读取1062状态、1043决策，SHA和角色逐项相符；另重新读取18个有界连续源区间，确认区间内所选局/层无遗漏。定位表来自前批，不直接使用其分析结果代替本批核验。
原日志偏移/长度/SHA见raw-addresses.json，区间范围与SHA见bounded-span-verification.json，身份见run-identities.json。仅分析列出的相关楼层，非六局全程资源审计，也非全历史重新研究。
15项固定机制端点核验及4组同指纹配对通过，见mechanism-checks.json、paired-observations.json。六份重新冻结输入调用当前learner/audit-selection.ts均exit0；206候选段、74次被重问替代，actual_full_candidate_result均null。null是当前审计范围，不证明所有实际方案都未执行。
没有修改生产源码，因此不执行撤源码红/恢复绿，不运行tsc/vitest/完整沙箱套件；这些结果为null。原始字节和消费者重放检查不冒充代码测试或策略效果验证。

## 逐项结论

### silent-proposal-c20b5139dd0dff71

**处置：waiting。** 缺历史实际移动表输入及同起点替线完整后继，不能验收污染、毒与跨轮成长的联合模型。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md`。
原Markdown SHA256：`bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c`；原字节另存本目录`silent-proposal-c20b5139dd0dff71.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：DUZUBAJ3A8GP / F27 / T4—6；silent-0168。
完整账本关联：silent-0168。

本批支持证据：states 274830—274833污染0→3→3→6，勒紧能力后的污染未增加；274834/274836/274837/274838为T5污染0/6/12/18、显示攻击12/17/21/26；274838挡17，274839净损9且污染消失，敌净扣13。

反例和限制：技能同时提供挡或毒，单看污染增加不能证明少打技能更好；未执行的替线不是实际胜线。

既有代码与当前行为：turn-solver按Skill累积vitalSpark并计入逐击血价；rollout接入VITAL_SPARK_POWER。真实live祖先b2805be4ba44b7375c7908d873889372cc3cfe6c；不证明历史dirty运行调用了哪份移动表。

待实现/验证行为：保留所有选项，逐步对齐火花增长、技能收益、污染清除及当前进阶攻击；不加固定少打技能规则。

验收与补数据：冻结同回合手牌/抽序、火花3→6、污染清除和实际使用的A10移动表；逐卡对照玩家HP、格挡与敌本体HP，再以独立后续局验证选择规则。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-ae9e692d680e3819

**处置：waiting。** 缺遗忘死亡返敏、同属性多来源抢夺及临时属性混合返还的相邻帧，不能闭合按来源返还模型。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md`。
原Markdown SHA256：`b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5`；原字节另存本目录`silent-proposal-ae9e692d680e3819.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：5PM6JAQG6FNQ / F39 / T2、T4—6；silent-0183、silent-0005。
完整账本关联：silent-0183、silent-0005。

本批支持证据：states 274351/274352/274354中两步法使敏捷−4→−2→0；274357/274358力量−4→0，失落已退出；274362敏捷再次为−2。本次F39有71个遗忘观测、零个遗忘零血帧。

反例和限制：末次只建一次步法仍−2敏捷，8HP/0挡的结束帧未因毒杀失落而存活；已有负属性计算不等于按抢夺来源完整返还。

既有代码与当前行为：现有观测审计保留能力端点和名单变化；dc0e6080cb20c508d94c006648cc3edf0188d306为live祖先。名单改变时不凭index归因具体返还。

待实现/验证行为：按来源实体记录已观察抢夺、负属性及返还；不凭单一死亡顺序规定固定击杀序。

验收与补数据：需要完整抢夺前后、各来源退场前后和临时属性到期帧；每类分支逐步重放，击杀序另需相同资源起点完整对照。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-52f1e1bd2e7db0ed

**处置：waiting。** 首样本读取已实现；仍缺历史调用的移动表快照及覆甲独立触发、叠加来源证据，不能验收完整成长模型。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md`。
原Markdown SHA256：`651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376`；原字节另存本目录`silent-proposal-52f1e1bd2e7db0ed.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：CA5KE8GFJ9X2 / F13 / T1—5；silent-0231。
完整账本关联：silent-0231。

本批支持证据：states 273238/273247/273252/273258/273263力量0/0/4/4/8、覆甲9/9/8/7/6；喷水11→15→19，施弱后分别11、14；273268为2HP、10挡，下一帧0HP。

反例和限制：覆甲层数序列没有隔离所有减层触发；实损2被零血截断，不等于攻击减挡的4。

既有代码与当前行为：monster-db在当前进阶exact时直接返回观测HP/攻击；4ed3c72df30f27b881da637aebf528b97440e0bb为live祖先。room-costs的MEASURED_ROOM_MIN_N仍为5，来源295a90aef9eb6f5b267490294f7733806419c45a为live祖先。

待实现/验证行为：从第一个样本读取当前进阶怪物事实；房间代价继续五样本门槛；成长与覆甲按实测条件对齐。

验收与补数据：固定A10数据库调用输入与T1—5状态轨迹，另补覆甲触发的可区分观测；不把一个死亡房间改成固定成本。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-6dd8bbff876be528

**处置：waiting。** 缺同种召唤新旧并存或替换的稳定身份及实际移动表输入，不能验收增长计数隔离全范围。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md`。
原Markdown SHA256：`48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5`；原字节另存本目录`silent-proposal-6dd8bbff876be528.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：5PM6JAQG6FNQ / F38 / T3—4；silent-0233、silent-0209。
完整账本关联：silent-0233、silent-0209。

本批支持证据：states 274308/274313电击力量2→4、攻击17→19，index由4变3；当前冻结F38每帧最多一个ZAPBOT，字段只有类型enemy_id/index，没有稳定实例ID。

反例和限制：题面先杀爪牙候选35伤/损3没有实际执行，不能将其与已执行方案差额称为实际保27血。索引变化不能证明新旧实体替换。

既有代码与当前行为：rollout中HIGH_VOLTAGE_POWER进入growth并在每个SimEnemy上增加力量，来源b2805be4ba44b7375c7908d873889372cc3cfe6c为live祖先。已有路径不等于同类型新旧召唤分支已获实证。

待实现/验证行为：逐实体增长，当前进阶攻击读DB，新召唤实体使用自己的初始计数；不加固定杀序。

验收与补数据：补召唤进入/退场/再召唤的稳定身份与状态链，冻结模型输入重放；目标顺序收益另等完整替线。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-578e415a259e6835

**处置：waiting。** 21/66段被重问替代，缺完整候选执行证明、跨重规划资源归因及能力累计收益，不能整项关闭。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md`。
原Markdown SHA256：`e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a`；原字节另存本目录`silent-proposal-578e415a259e6835.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：8JRE1C4H4Z2W / F17 T6、F33 T1—11；账本见本项完整关联列表。
完整账本关联：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。

本批支持证据：decisions 270216/270282完整fingerprint一致，F33 T2当轮实损3/15、敌净扣10/17。既有审计重放本局66段，21段被重问替代；末T11状态为5HP/22挡/显示攻击37，最终HP0、敌154→130。

反例和限制：F17 T6投掷匕首后重问，候选差不等于整轮保血；末次延至T11仍败，不支持一律防守或一律付血成长。0/24与5/24不能合并称同死率。

既有代码与当前行为：候选分层9d8278702dbc581b5015ba7ec9a70dc0fb94cccb、首次派发fdaf787a372880b0438e73bcac7e6d2168b038ed、观测端点dc0e6080cb20c508d94c006648cc3edf0188d306及终局83512ddcd2c70fd9b983dc38524ff25c8970c1d3均为live祖先。

待实现/验证行为：继续分列原答、护栏、SL、实际前缀、重问及能力出现时点；完整候选收益未证时保持未知。

验收与补数据：固定首/三试T2、第二试T5、F17 T6及末T11；补全每段实际步骤与中间状态后逐段比对，SL恢复不计回血；规则效果按独立局后移验证。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-c0767768bf6a7ab1

**处置：waiting。** 缺覆盖重放及弃牌后完整候选执行链和受控完整胜线，不能设探索禁令或血价系数。

来源任务：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md`。
原Markdown SHA256：`28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb`；原字节另存本目录`silent-proposal-c0767768bf6a7ab1.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：YF0LXT1QSTGG / F48 T1、T5；silent-0079。
完整账本关联：silent-0079。

本批支持证据：decisions 271309/271348同指纹，第二/三试T1实损0/9、敌净扣45/38。当前consumer本局52段、22段重问替代；原同题预测和实盘数值分列。

反例和限制：本局F33重打有实胜；F48第四次T5候选没有完整执行，末次恢复防御续步仍败。不能用F48全败否定所有SL。

既有代码与当前行为：同题原/替预测资源差66283dd9982bdd7f480da7a4d9bfefea0572a9ac，以及已派发/重问/终局观测均已在live；没有将预测当实际收益。

待实现/验证行为：显示全败封顶下同轮代价和未执行续步；保留探索，未知数据不拟惩罚系数。

验收与补数据：固定第二/三试T1的0/9与45/38，包含未完成替换和F33成功反例；按run_id分组后移验证，不把六尝试当六独立局。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-a46bdb7fe711d79a

**处置：waiting。** 当前阶段事实已有；缺跨阶段伤害来源的完整中间结算帧及候选执行链，不能认证累计兑现或改排序。

来源任务：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md`。
原Markdown SHA256：`eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6`；原字节另存本目录`silent-proposal-a46bdb7fe711d79a.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：YF0LXT1QSTGG / F48 T3—5；silent-0021、silent-0027、silent-0028、silent-0085。
完整账本关联：silent-0021、silent-0027、silent-0028、silent-0085。

本批支持证据：states 277512/277513为4/111HP、4毒、15力→212/212HP、0毒、0力。末轮五敏时已得23挡，第三小刀后六敏仍23；277527为触媒2、零毒、18HP/23挡/攻击44，最终HP0。

反例和限制：其他尝试建立毒雾或余像仍败；持有毒组件不证明当阶段已施放，零毒触媒不能单独确定整战死因。

既有代码与当前行为：aad2700abed6dff1d66e87fb36aaa6fedb39adf3在本帧分列阶段HP、毒、持有组件与已建能力，poison_damage_already_dealt保持null；当前文件与live逐blob相同。

待实现/验证行为：阶段切换重读现场，已建/持有/结算分账，不把未来毒或后得敏捷计入已兑现收益。

验收与补数据：固定111→212阶段端点、零毒触媒、23挡不倒补及18HP对21显示缺口；需要完整事件序列才可分配毒/直伤/其他触发来源。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-1044224808015e5c

**处置：waiting。** 缺相同资源起点的完整替线及独立后续验证，不能启用B2零胜并列时固定低损血优先。

来源任务：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md`。
原Markdown SHA256：`4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5`；原字节另存本目录`silent-proposal-1044224808015e5c.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：XP2SL33HT0D9 / F33 T1、T3—4；silent-0079。
完整账本关联：silent-0079。

本批支持证据：decisions 271992/272040同指纹T3实损9/14、敌净扣24/27；271982/272195同指纹T1实损2/10、净扣25/34，后者还建立力量。

反例和限制：同存档后轮抽弃牌与出牌不同，两线都无完整胜局；不能仅凭低当轮损血或存活回合数归因整战。

既有代码与当前行为：live已记录候选HP/伤害/力量差和预测范围，来源66283dd9982bdd7f480da7a4d9bfefea0572a9ac；该事实子项不等于零胜并列的新排序规则已验证。

待实现/验证行为：并列仍标并列，分列血价、输出与成长；低损优先只在取得完整比较证据后考虑。

验收与补数据：固定9/14、24/27与2/10、25/34，保留成长差；按独立局分组验证整战而非把同存档六试扩成六样本。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-7cbc6005db712ba9

**处置：waiting。** 缺完整联合候选收益、额外触发隔离及混合意图缺值语义，不能补零改排序或关闭完整提案。

来源任务：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md`。
原Markdown SHA256：`f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291`；原字节另存本目录`silent-proposal-7cbc6005db712ba9.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：XP2SL33HT0D9 / F33 T2—5；silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。
完整账本关联：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。

本批支持证据：states 278236/278237/278242普通镣铐使爪力量0→−9→0，轮初14挡加至20且零净损。278249/278252/278253火箭攻击57→38→28；T4/T5脆弱四敏时挡牌各6，末次11HP被耗尽。

反例和限制：末轮毒后敌仍153/125，没有减员；已建敏捷、力量与可存活HP不能合成未经验证的整候选价值。

既有代码与当前行为：观测能力变化与终局净损已有，dc0e6080cb20c508d94c006648cc3edf0188d306及83512ddcd2c70fd9b983dc38524ff25c8970c1d3为live祖先；未知意图字段保持null。

待实现/验证行为：现挡/新增挡、临时减力、朝向/弱、未结毒与已结毒分列；保留现有权重，不向额外触发泛化。

验收与补数据：固定57→38→28、14→20、0→−9→0及末轮3+7净扣；未知总入伤不以零代替，新增触发需本角色相邻帧。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

### silent-proposal-c59f592f1427a67e

**处置：waiting。** 两局局部端点不能闭合宽机制包的整候选收益、跨重规划归因及完整恢复/资源链。

来源任务：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md`。
原Markdown SHA256：`81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2`；原字节另存本目录`silent-proposal-c59f592f1427a67e.original.md`。
角色/范围：silent、实际A10；证据局/层/回合：YF0LXT1QSTGG F48 T1/T4—5；XP2SL33HT0D9 F33 T1—5；22个账本关联如下。
完整账本关联：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。

本批支持证据：重核两局的三组同指纹配对、临时减力恢复、轮初格挡、阶段毒清空与末轮零血截断。两局consumer共110段，其中44段重问替代；整候选结果仍未知。

反例和限制：当轮高输出或多挡均有最终失败；F33重打成功与未完整执行替换仍应保留。两局相关尝试不能替代原宽机制包的每个子公式独立验证。

既有代码与当前行为：上述9d827870、fdaf787a、66283dd9、aad2700a、dc0e6080、83512ddc等源码已是live祖先，完整40位见source-proof.json。没有新增发布子项。

待实现/验证行为：继续区分原答、替换、重放、实际前缀、能力建立/兑现与恢复资源；维持当前策略。

验收与补数据：逐子机制列验收证据，不将全局支持局数当相同实验分母；本批只核派发锚点相关楼层，未重新分析原提案全部101局或整局路线。

样本与时间切分：仅本角色独立run计样本，同一存档SL尝试不拆分训练/验证；本批固定帧为发现/回归材料，未来独立完成局后移验证，未观察角色/进阶不外推。
预期影响：补足该项可核验事实或比较证据；本批不改变行为、不承诺提高胜率。回退：本批无生产变更可回退，保留所有失败、原提案与CLI追加历史；后续实现必须独立红绿测试、自测、实际live合入与规则双通知。

## 已有实现与剩余缺口

固定live HEAD：`a9127cd90c1e62dd09a9325962d21bc4b11a44d3`。11路径的来源commit均通过live祖先验证；9路径base/live blob相同，rollout.ts与turn-solver.ts仅既有注释署名差异，原patch保留。详见source-proof.json和source-main-live.patch。
原提案包含更宽的联合验证、完整执行或条件策略，因此不因子项已有就标整项duplicate；没有任何本批implemented_commit。怪物当前进阶HP/伤害首样本路径与房间成本五样本门槛保留。

## 记录与失败保留

只通过根learner/ledger.py update追加本报告/提案链接和逐项说明；by=learner:strategy-proposal。已有proposed保持，已shipped经验只补链接、不降级或扩大上线范围；不重复增加已核过的支持样本。未调用add制造重复代码提案id。
只读路径猜测错误、tsx IPC受沙箱限制，以及自编汇总脚本未处理null的失败均保留于initial-errors.txt及两组failure文件。后者只修scratch汇总，不涉及生产源码；最终同一consumer六次exit0。
本批临时材料均在指定scratch，日志只读，不联网、不运行play、不修改其他角色知识或运维prompt。无新规则上线，所以不生成eval版本、合并、双通知或测试成功记录。

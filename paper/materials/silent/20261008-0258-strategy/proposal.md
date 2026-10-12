# 静默猎手策略提案与逐项处置


记录时间：2026-10-08 02:20:52 +0800。调度batch 20261008-020231-strategy-proposal，scratch 20261008-020232-strategy-proposal；完整base bdaea184aa8f46eef5859ede6b1afa4c9d83bd02。角色silent，来源六局均由原runs.jsonl核为SILENT A10。无proposal_repair；只消费batch.json的十个proposal_ids。


## 本次实现：翻滚已捕获的下回合格挡

关联派发id silent-proposal-f6d98c52fdc345b0；原经验silent-hunter-tender-card-attributes；账本silent-0232；来源experience-update/20261007-153133与补链20261007-170244，目标strategy-proposal/20261008-020231。授权Roy-2026-10-07-learning仅为权限，不提供机制事实。

证据61E2QS63Y9WU A10 F28第三/末次T2→T3：states273712→273713建立3挡/下轮3，273714临时敏捷−5、273715敏捷恢复0但仍给3挡；273725→273726在−1敏捷打翻滚+，当轮5/下轮5，273729敏捷−5、273730恢复0而仍给5。实际手牌Block的base/enchanted均6，规则模板同时引用当轮/下轮Block。原始选帧、摘要和数值SHA见states.selected.jsonl、verified-evidence.json及test-fixture-original.json；最终固定夹具agent/tests/silent-dodge-roll-state.json仅删重复agent_view、fingerprint及无关牌组，不替换combat观测。

旧行为：通用模型只模拟当轮格挡，没有传递BLOCK_NEXT_TURN_POWER，也没有从重规划状态保留这笔已建立的格挡。新行为：在已观察silent A10翻滚+（base6、原模板）、柔嫩1、无脆弱/融影/首挡翻倍、单次3或5挡条件下，先捕获打出时数值，再保留跨重规划，下一回合只兑现一次；临时敏捷恢复不重算；搜索去重包含尚欠格挡。该笔格挡不记入当轮blockGained，不新增成长常数或固定顺序。Jev保留所有选项；其后推演反映已观察的资源。

反例/未观察边界：末试虽带入5挡，后空翻/两防御最终20挡、2HP对24仍死，不声称改模就能赢。未执行先翻滚的整场结果未知。普通翻滚、其他进阶/角色、其他金额、重放/复制、多次叠加及脆弱/融影/首挡翻倍没有独立延迟结算证据；不扩公式，保留选项并明确标延迟格挡未知。Ironclad以及silent A9模型与重规划原行为等价，用同一静默帧只变角色/进阶元数据作结构验证，不读取它们的知识。

拟合/时间切分：不拟权重；3/5来自同一局的相关尝试，不算两个独立胜率样本。本局是发现和固定回归集；后续新silent A10完局另作时间后置验证，目前没有新胜率验证。

验证：冻结上述8帧，14固定例验证建模、方案中先出牌的属性变化、已建状态重规划、跨轮恢复后只给一次以及范围/未知边界。撤四份生产源码时11失败/3通过、exit1；恢复14通过、exit0，target-withdrawn.log与target-restored.log保留。沙箱入口结果另存回报，不将固定回归冒称整套或实际游戏胜率。

预期影响：后续推演不漏3/5已建立格挡，可能改变静默已观察局面参考排名；本轮即时损血、药水、SL触发、终局权重和构筑/路线/休息分工不改。回退：仅撤本项独立源码提交的4生产/2固定输入路径，保留日志与账本历史；实际上线后按协议登记唯一版本及Roy双通知，否则不造上线记录。


## 其余派发项逐项复核（waiting）


### silent-proposal-60930500313a651d

证据坐标：5PM6JAQG6FNQ F33 T1—T2，states274199—274206。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-serpent-form-per-card-damage.md，本任务保存副本silent-proposal-60930500313a651d.source.md；证据局5PM6JAQG6FNQ；账本silent-0132；领域combat。

原请求：提案：分开新建能力与后续每次出牌触发，先验证本次单敌已观测4伤，不外推随机目标分布。。本次处置waiting：单敌F33T2防御后4伤可核；建立群蛇当步敌375不变。缺新建之后同回合继续出牌的起效边界、重放/控制动作及多敌随机目标逐事件；本批不从单敌净扣扩通用模型。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-c20b5139dd0dff71

证据坐标：DUZUBAJ3A8GP F27 T4—T6，states274830—274839。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md，本任务保存副本silent-proposal-c20b5139dd0dff71.source.md；证据局DUZUBAJ3A8GP；账本silent-0168；领域combat。

原请求：冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。。本次处置waiting：F27T4/5火花3→6、污染0/6/12/18和次轮清零可核。若改技能选择，缺相同资源/抽序下迷雾与少技能完整胜负对照；实际运行dirty树和当时A10移动表未冻结，不能把现有部分污染接线认领整个增长/收益审计。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-ae9e692d680e3819

证据坐标：5PM6JAQG6FNQ F39 T2/T4—T6，states274341/274351/274358/274397。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md，本任务保存副本silent-proposal-ae9e692d680e3819.source.md；证据局5PM6JAQG6FNQ；账本silent-0183, silent-0005；领域combat。

原请求：提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。。本次处置waiting：F39两次抢夺与首试毒杀返力可核；末试玩家0血且能力清空，只能视为清场。缺同轮返力后再出牌、遗忘死亡返敏和多来源独立返还的前后帧，不设固定击杀序。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-246daedaa3021847

证据坐标：CA5KE8GFJ9X2 F9 T1/T2/T4，states273166—273172/273183—273185。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-gardener-skittish-shield.md，本任务保存副本silent-proposal-246daedaa3021847.source.md；证据局CA5KE8GFJ9X2；账本silent-0211, silent-0209；领域combat。

原请求：冻结攻击后补挡/退场；若调整胆小消费需独立多次非致死攻击证据，保留所有目标。。本次处置waiting：F9T1/2攻击后7盾、能力仍显示7；T4后两击只消7→4→0盾。缺同敌同轮第二次非致死失血的触发/消费序列，无法据持续能力显示改一次触发规则。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-52f1e1bd2e7db0ed

证据坐标：CA5KE8GFJ9X2 F13 T1—T5，states273238/273247/273252/273258/273263。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md，本任务保存副本silent-proposal-52f1e1bd2e7db0ed.source.md；证据局CA5KE8GFJ9X2；账本silent-0231；领域combat。

原请求：第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。。本次处置waiting：F13力量0/4/8和覆甲9/9/8/7/6可核；仍缺覆甲减层条件的独立触发隔离样本及当时实际A10表。当前首样本HP/伤害供给不等于完整加压/覆甲模型；房间代价五样本门槛保留。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-6dd8bbff876be528

证据坐标：5PM6JAQG6FNQ F38 T2—T4，states274307/274308/274313。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md，本任务保存副本silent-proposal-6dd8bbff876be528.source.md；证据局5PM6JAQG6FNQ；账本silent-0233, silent-0209；领域combat。

原请求：复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。。本次处置waiting：F38新电击已带高电压2、力0，随后同23上限实体力2→4可核。原在线召唤模板未冻结；现有HIGH_VOLTAGE成长接线不能证明召唤模板已正确携带该能力并在首次回合起效。缺模板输入及召唤全过程固定源码重放，不认领完整提案或规定杀序。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-578e415a259e6835

证据坐标：8JRE1C4H4Z2W F33首/三试T2、第二试T5及末试T11；decisions270216/270282/270264。

来源experience-update；原稿/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md，本任务保存副本silent-proposal-578e415a259e6835.source.md；证据局8JRE1C4H4Z2W；账本silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016；领域combat, sl, structure。

原请求：核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则。本次处置waiting：8JRE F33T2同指纹原/替实损3/15、扣10/17成立；保血延至T11仍敗是反例。原答→护栏→SL→生成/抽弃重规划→完整实际执行缺统一机器关联，完整候选多路径审计尚缺；规则调整还缺独立后置胜线，不能拟成长/路线或血价权重。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-c0767768bf6a7ab1

证据坐标：YF0LXT1QSTGG F48第二/三试T1和第四试T5；decisions271309/271348/271354；F33第二试成功反例。

来源postmortem；原稿/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md，本任务保存副本silent-proposal-c0767768bf6a7ab1.source.md；证据局YF0LXT1QSTGG；账本silent-0079；领域sl, combat。

原请求：全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。。本次处置waiting：YF F48T1同指纹、24/24全败和实损0/9、扣45/38成立；第三至第五次复用存档，第四次T5替换未完整执行，F33重打成功是反例。缺未执行续步到最终动作的统一关联及独立完整原/替线胜负，不能拟惩罚或禁止探索。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


### silent-proposal-a46bdb7fe711d79a

证据坐标：YF0LXT1QSTGG F48末试T3—T5，states277512/277513/277519/277523/277526。

来源postmortem；原稿/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md，本任务保存副本silent-proposal-a46bdb7fe711d79a.source.md；证据局YF0LXT1QSTGG；账本silent-0021, silent-0027, silent-0028, silent-0085；领域combat。

原请求：实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。。本次处置waiting：YF F48阶段新212血/毒清空、零毒触媒无收益和后取得敏捷不补23挡可核。源码已有相关子模型，但缺已建/持有/未派发能力跨抽弃重规划的分阶段统一事实记录；六试同局不足拟能力先手/终局权重，不认领完整展示提案。

验证/预期行为：冻结原局的手牌/能力/当时实际输入与逐步动作，区分当前帧事实、候选预测、实际派发和结算；补足上述缺口后再实现并做撤源码失败/恢复通过及角色等价检查。若改排序/阈值，保存按局分组反事实及后置新局；本次保留旧规则，不能用未执行线承诺胜利。回退：本项没有新增源码，不需代码回退；历史复盘及提案不重写。


## 证据与已有实现边界

本批原始提取严格以六个允许run_id过滤后再解析，知识仅silent。runs.selected.jsonl角色/进阶检查通过。四种原日志的选中条数及SHA保存在evidence-manifest.json；11组逐项数值断言全部通过，涵盖十项所用局面。初次离线核验将YF末T5格挡/敏捷帧号误写早一步，已按原帧更正为277523/277526；初稿与失败日志保留，没有生产代码或测试断言放宽。

已有首样本怪物HP/攻击供给、柔嫩当牌后减属性、高电压逐实体growth、污染技能接线及阶段/毒/敏捷子模型均不等于原大项全部完成。没有足够的真实live祖先源码证据覆盖完整项时不报duplicate/implemented。合入前核知识刷新和重叠，冲突按任务停止。

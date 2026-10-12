# 本批十项静默提案核验与未完成项

日期：2026-10-12（写前已运行date）。批次：20261012-091302-strategy-proposal。来源与实现任务沿原提案；本批仅消费指定十个id，没有新建或领取其他项。

角色为silent，六个来源局均经runs.jsonl确认A10。基线：0478a90239003f23688bf95c1988dbf922804b1c；工作树最初干净，git merge --no-edit main返回Already up to date。本批reason=proposal、有proposal_ids，无research_request/implementation_request，不承接另一个专题请求。

10份原Markdown SHA全部匹配；原始证据按既有偏移回读logs实际字节，不仅复制旧结论。3432帧状态覆盖六局；1358条完整决策仅覆盖VLZ与8JRE，其余四局本次只复核状态及原提案，不冒称全历史决策覆盖。逐帧offset/SHA与角色核验在evidence-manifest.json；7组事实断言通过，属于记录核验，不是tsc/vitest。

## 当前源码与合入边界

固定live bbdaadc8039d6684de8a0e157381fe077c3ec3e2。神化基础772b839f8ada31664cb764ea9ad3bdb03da27f64、触媒f516592fff557ef02c8ece43433706358c3f7fe6、六项升级6e233ede76e5dd849f0d40760be64e7cdacf78b1均为实际祖先。预测/护栏审计集成a8b1f8be153fe4f3a34146117546c2178f2e446b、离线动作审计6f3f783941270ac182237c46068097ff67e85907、单步派发回执fdaf787a372880b0438e73bcac7e6d2168b038ed也均已是实际live祖先，相关五文件与本基线逐字相同。不能继续沿用上一批“旧审计未上线”的原因，也不能把这些子项视作宽提案全部实现。

合入预检两侧均固定40位SHA，exit1，冲突为notes/fix-queue-v4.md、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl。没有知识数据冲突；这是基线记录分叉，不是游戏证据不足。遵守冲突即停要求，未改源码、未进入live知识刷新提交或merge流程、未覆盖冲突内容。首次live1777464f预检原件与并行推进后固定live的复验分开保存。
## silent-proposal-89354805ee4d7e77 — 神化传播与实际兑现

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。账本：silent-0237, silent-0238。

证据：VLZ6CCT8AQ0A F35T1、F43T1、F45T1；silent-0237/0238。F35能量7→5，普通防御5→8；F43神化后同后续牌序43伤/14损变51伤/13损；F45持有但未施放。

处置：waiting。神化基础、触媒及六项升级源码均已是live祖先；仍缺持有、实际施放与候选覆盖的完整审计接线和固定验收。未知升级/属性交互缺配对帧；本批合入预检三文件冲突。

反例及限制：F43施放后仍损57，F45未施放失败，不构成必打或整场转胜证明。

旧规则保持；预期行为与验证：复用已上线升级变换；剩余只记录构筑持有、本场已观察施放、候选包含与模型缺口。按F35/F43/F45冻结帧验能量、同线和后续抽牌、场外deck不变；未知保持未知。

## silent-proposal-f2bfceddb1898dca — 三骑士与药水预算

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。账本：silent-0106, silent-0019, silent-0201。

证据：VLZ6CCT8AQ0A F45T1/T4/T5；silent-0106/0019/0201。T1 MC707ms、horizon1/samples1/best=null；药水后HP67不变、能量+1。T5为32HP/20挡/59来袭，敌仍全部存活。

处置：waiting。缺模型覆盖一致、固定随机输入和同一总预算的配对实验、样本收益曲线与排名稳定性；707ms单题不足校准预算、留药价格或目标顺序。

反例及限制：T4未实打攻击候选；全败并列不等于预算退化的未知。F43胜局损57、F44回血34也不能归因预算。

旧规则保持；预期行为与验证：先冻结已覆盖同题输入，比较现有与分阶段MC的相同总预算；记录用时、有效样本和候选稳定性，不据本局增加常量。当前保持全部候选与旧规则。

## silent-proposal-283a164780d11e69 — 神化经验链

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。账本：silent-0237, silent-0238。

证据：VLZ6CCT8AQ0A F35T1、F43T1—2、F45T1；silent-0237/0238；经验silent-apotheosis-combat-upgrades。

处置：waiting。与89354805ee4d7e77同源；升级子项已有实际live源码，但实际施放/覆盖审计仍未闭环，不能将整个经验提案登记duplicate；未知组合仍无配对帧。

反例及限制：同局四次施放不是四个独立胜率样本；场外升级数保持，不能记作永久锻造。

旧规则保持；预期行为与验证：与89354805ee4d7e77共用实现及原始固定帧，不重造id或重做已有升级；保留经验链接与待验执行事实。

## silent-proposal-ebbfe3b97548756d — 攻防、持续输出与资源分账

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。

证据：VLZ6CCT8AQ0A F43T1—5、F45T3/T5、F44；原提案14个账本/15个主题。F45覆甲已0，32血/20挡对59；剩余毒未使三敌退场。

处置：waiting。十五主题的逐源贡献、状态期限、逐实体及完整执行资源链尚缺联合消费者验收；现有神化和审计子项不能覆盖整项。未选focus/休息缺同盘整场对照。

反例及限制：当轮临时减力不是持续防御；高入场血量及真实回血不保证少损或取胜。

旧规则保持；预期行为与验证：逐主题建立冻结调用矩阵，分已结算毒、未结算毒、当前覆甲、力量/敏捷来源及实际建立能力；若公式已有实现保持行为，只修已证缺口。不得用胜负拟合统一权重。

## silent-proposal-e5b87be50f28f311 — SL、HP护栏与执行审计

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。账本：silent-0079, silent-0021, silent-0125, silent-0018。

证据：8JRE1C4H4Z2W F33首/三试T2、第二试T5、末试T11及F17T6；silent-0079/0021/0125/0018。270216/270282指纹相同；末试T11玩家5→0，敌154→130，完整攻击缺口15。

处置：waiting。预测审计、离线动作分段和单步派发回执现均已有live源码，旧“审计未上线”原因已过时；仍缺能力建立时点、真实结算与重规划后执行的完整关联。此项有证据可做工程实现，本批因三文件合入冲突停止，不能统称等新局。

反例及限制：首/三试T2多12血价换7当轮伤仍都失败；F17T6抽牌后重规划，候选省血不能记实际省血；末试延长生存仍未赢。

旧规则保持；预期行为与验证：沿既有selection_audit→selection_dispatch及auditSelectionExecution扩展，而非重复建工具。用本局原帧验证能力建立、动作前后状态、重规划中断、SL恢复及死亡截断；无唯一配对时留未知。任何阈值更改另需完整受控对照。

## silent-proposal-49632bc4878fb597 — 属性、逐击、虚弱及独立成长

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。账本：silent-0005, silent-0231。

证据：CA5KE8GFJ9X2 F13T1/T3/T5；silent-0005/0231。力量0/4/8，对应无弱攻击11/15/19；末轮弱后14，玩家2HP/10挡。

处置：waiting。F13没有正敏捷配对帧，当前未核出新增公式失配；力量、逐击、敏捷、虚弱与独立成长的联合冻结调用验收未完成，不能凭一个子公式关闭宽项。

反例及限制：虚弱把19降14仍保留成长；计划中的步法未取得，不补造正敏捷。

旧规则保持；预期行为与验证：按已观察A10现场输入逐分量验证，怪物数据按进阶冻结；补足正敏捷等本角色配对后再判断联合路径，不增加统一保血/输出权重。

## silent-proposal-66532328a585941f — 持有、计划与能力建立

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。账本：silent-0021, silent-0009。

证据：5PM6JAQG6FNQ F39末试T2；silent-0021/0009。原字节8445489179→8445536391：能量5→4，冒泡离手，两敌状态未变，无毒雾。

处置：waiting。持有/计划/已建立仍缺完整执行分账；既有离线工具仅关联动作，没有实际能力兑现验收。启动或构筑权重另缺同入口、完整抽序的整场比较与可复现收益函数。

反例及限制：F33建立雾3/触媒1并胜是异场观察；组件、敌人和生存资源一起变化，不能当启动顺序因果。玩家当时29血，原历史35血表述指敌血。

旧规则保持；预期行为与验证：与e5b87be50f28f311复用状态观察分账，保留能力未建立与零效果实付能量；核对F39原帧，另线完整对照不足时不拟合启动权重。

## silent-proposal-43a76a31ba7bdcfa — 族母吸取、负属性与毒

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。账本：silent-0030, silent-0027。

证据：61E2QS63Y9WU F17T5—6；silent-0030/0027。玩家力量2→0、敏捷0→−2，敌力量0→2；两防御各3，毒17+16实扣33。

处置：waiting。吸取后负属性与毒的联合生产消费者验收未闭环；改变SL范围/偏好另缺相同入口HP、构筑和抽序下完整可救活另线。

反例及限制：本局首试获胜，不证明其他入口或重打策略可救；负敏捷不能忽略，计划中未取得的步法不能预支。

旧规则保持；预期行为与验证：冻结吸取前后、两张防御及两次毒结算，验证现场负属性传入与敌HP截断；先验已有实现是否准确，再决定有限修复，保持SL阈值。

## silent-proposal-5264153a4a4b0e5c — 召唤、成长与退场进度

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。账本：silent-0039, silent-0209。

证据：61E2QS63Y9WU F23T1—5；silent-0039/0209。本体index0→1，幻象力0→3→6；T4实扣47、损15，T5幻象仍2血。

处置：waiting。召唤、航行、逐实体成长和索引重排缺联合固定消费者验收；另一focus只有未执行候选，不能证明固定首杀收益。

反例及限制：总扣47不等于幻象退场；另一focus39伤/零损没有后继实打，本局未观察幻象再次复活。

旧规则保持；预期行为与验证：用实体信息与index重排原帧核对各自HP/力/来袭，不能把不同实体合并；保持所有目标与相同推演值并列，缺另线不定首杀。

## silent-proposal-bddfa690a84e03d0 — 甲虫睡眠、醒来与成长

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。账本：silent-0128, silent-0079。

证据：DUZUBAJ3A8GP F30T1—6；silent-0128/0079。首试睡层3/2/1，T4—6力0/2/4、攻击18/20/22；四试均败。

处置：waiting。此来源缺甲虫提前唤醒及STUNNED接续配对帧、同抽序完整另线比较；自然醒与四次失败不足校准输出血价或固定杀序。

反例及限制：本场甲虫无STUNNED配对帧，旁边盛碗虫的眩晕不能充作甲虫证据；末试多3敌血扣量伴随多2玩家损血。

旧规则保持；预期行为与验证：分别验证自然醒、提前唤醒、眩晕及成长，当前只确认实见自然醒序列；拿到缺失配对后再冻结全链，不填预训练机制。

## 拟合、验收、回退与交接

本次不拟合游戏参数，不增样本支持次数。SL多次仍按同一局计；上述帧为发现/回归材料，不能称时间外盲测。未来策略收益验证需按run_id分组、按结束时间后移，并固定模型覆盖、进阶、入口资源和随机输入；缺同盘反事实不证明原线/另线必胜。对纯日志审计，现有事实已足够支持工程工作，不应以缺胜局为借口等待新局。

下次工程顺序：运维协调三处既有记录冲突；沿现有预测/派发/离线分段审计补能力建立及状态结算关联，优先覆盖8JRE F33与5PM F39；在原真实固定帧上验唯一状态/动作匹配、重规划中断、SL恢复、死亡截断，缺帧保留未知。若有源码，须撤源码失败/恢复通过、原沙箱入口检查、gitleaks、live合后检查，再单独登记实际源码和版本。本次没有完成这些生产验收，不引用旧通过日志冒充。

预期影响只限可核验的事实与比较质量，不承诺胜率；铁甲及未观察进阶、所有当前选择规则保持原样。无本批源码可回退；未来有限实现只回退其实际源码提交，原证据/失败/提案与账本历史保留。没有新增提案id，不写经验库、不标shipped。账本只通过根ledger.py追加本报告链接，保持原first_run、历史证据及既有状态，避免将已上线知识误退回待实现。

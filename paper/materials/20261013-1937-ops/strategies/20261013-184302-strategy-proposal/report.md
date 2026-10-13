# 本批静默策略提案处置

时间：2026-10-13T19:01:34+08:00。批次：20261013-184302-strategy-proposal。角色：silent。

结论：本批十个完整提案全部waiting。没有新增生产源码、知识、源码提交、live合入、游戏版本或shipped登记；已有实现只按下列真实源码祖先记录子项，未拿局部完成关闭完整提案。

## 身份和基线

- 本批根learn.json登记task=strategy-proposal、character=silent、reason=proposal，十个proposal_ids及worktree逐项相符；没有proposal_repair、research_request或implementation_request绑定。
- 普通专题条件不成立：只读根notes/strategy-research-silent.json的身份元数据，其running/batch属于20261010-150327，本批没有接管它或读取另一个专题替代身份。
- 初始工作树干净；执行git merge --no-edit main返回Already up to date；base及HEAD保持 `7398d10436a9c64d73885370eeff1b4cba3230ad`。
- 十个原Markdown逐项已读、SHA相符并复制到本批scratch；没有修改原提案、根请求、旧done请求或领取其他队列。
- 派发锚点只有以下十局：KEN58SH9SLZ6, TXZ6RVMQA09D, WQZVENQ7DTRP, 02HB4L0C3C67, 4D4J8USKCPAV, F4QKG4J1AJJZ, JLN5SK17W4FQ, LS8035TB32P3, NB8KCF6HRGVF, S9UZAK0JP0C0。因原提案明确关联，又核了1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH、SADL3CGYTGSR；十五局runs.jsonl身份全部SILENT，K367为A1、SADL为A7，其余A10。未混用其他角色知识或将SL尝试当独立局。

## 核验口径和材料

- 从根只读logs提取实际run_id/run字段相符的决策、SL和计划；状态同时核run_id与character_id。首帧、可操作帧、结算/退出、存档恢复分别保留；未观测内部相位不自行补齐。
- 日志各条保存真实绝对源路径、字节偏移、字节长度和原行SHA256；最终逐条读回相等：states 9815、decisions 9448、sl-attempts 78、run-plans 77，合计 19418 条。
- 本批固定证据核验 137 项断言通过。见evidence-verification.json、verify-evidence.py与verify-evidence.log；它们是离线日志算术/来源核验，不能当作生产tsc、vitest、消费者运行或胜率验证。
- 初稿误用potion_index/slot_index且按observed_ts连接饮药前后，第一次识别35次；已改为option_index/index、实际决策时刻及状态指纹匹配后为42次。初稿脚本、结果和日志仍在audit.initial.*。未将初稿误计写入账本或原提案。
- 文本匹配还误收LS8035TB32P3被其他局引用的821条决策；实际run_id过滤后保留816条。原提取保留在LS8035TB32P3.decisions.initial.jsonl、过滤清单在dispatch-reference-filter.json；最终分析与字节核验仅使用精确本局记录。
- ledger-before.json只是历史行的简单字段覆盖快照，不代表账本消费语义；实际累计where/evidence的读回是ledger-folded-before.json。原历史快照和差异保留，不用简单末行覆盖遗失累计链接。
- 本批没有拟合新阈值；缺乏受控后继的局部窗口只核观察算术，不声称替代路线/留药可通关。冻结帧属于发现和回放集；以后验证按独立run和开始时间向前留出，不能拆SL或rollout样本充独立局。

## 逐项处置
## silent-proposal-08eaa60bcc449852：赢战耗药和回复结转

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md
- 原文SHA256：`4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016`；本次已核相等。
- 既有账本：silent-0019、silent-0020。
- 自核证据：KEN58SH9SLZ6 A10：F3 T2攻击药、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能，共7饮、0弃。六胜战净损0/3/0/37/6/0合46；F12回27、F16回29。F17六次失败，五次存档恢复不能算路线回复。
- 反例/限制：F15零损已经花两药；这不是不饮也零损的反事实。
- 本次处置：waiting。缺同入口、同牌组及固定后继下不饮/早饮/留至boss的整战对照，无法从七次已饮结果校准持药价值。
- 预期行为及下一步验证：保留饮用和持有价值；未来按独立局、时间向前留出，分别核实退出HP/药栏和下一战入口。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-92920295a648b540：SL首胜与连战目标

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md
- 原文SHA256：`f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf`；本次已核相等。
- 既有账本：silent-0228、silent-0255。
- 自核证据：TXZ6RVMQA09D A10 F48第二/第三次T6，均48HP、敌460HP：原线损3/净扣36，替线损0/净扣27。第三次T10首胜退出4HP；F49 T1入房4HP、尚不可操作，随后0HP。
- 反例/限制：后续抽序/生成牌改变；首boss获胜与连续通关不是同一个观测。低可信模拟0%不能成为必死依据。
- 本次处置：waiting。缺固定后继的连续通关对照，以及SL重新提问后的整线执行归属；局部省3血不能确定选线或终局权重。
- 预期行为及下一步验证：保留两战目标与SL资格；验收必须连接首战退出HP/药栏、第二战开场和真正可操作帧。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-a327449c331efbc1：沙虫双时钟的探索血价

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md
- 原文SHA256：`e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925`；本次已核相等。
- 既有账本：silent-0079、silent-0018。
- 自核证据：WQZVENQ7DTRP A10 F33第二/第三次T9，同26HP、敌184HP：原线损13/净扣24，替线损22/净扣39。第二/末次T7均净扣24，损0→4，沙坑末值4→5。末次T11敌132，攻击51及毒25后仍56，9HP最终耗尽。
- 反例/限制：多损4血确实延长沙坑一轮；不能由多损血一概禁逃离，也不能由全败模拟认为候选同安全。
- 本次处置：waiting。缺同后继整战对照及独立存活验证，不能把9血/15伤或4血/一沙坑轮拟为统一交换阈值。
- 预期行为及下一步验证：保留探索资格；比较即时损血、已兑现伤害、剩毒和沙坑，不把未结算毒当已发生伤害。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-a099e89437e942bb：狡诈容量与跨轮保留

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md
- 原文SHA256：`e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2`；本次已核相等。
- 既有账本：silent-0030、silent-0257、silent-0258。
- 自核证据：九局42饮逐一核原帧：37次添3、2次八手添2、3次满手添0；新增SHIV均升级、基础6。WQZVENQ7DTRP A10 F33第五次T11八手三饮2/0/0，末次T11五手三饮3/2/0；空位之外仍耗瓶，HP/能量/敌血不变。其余八局身份和逐饮锚点见cunning-audit.json。
- 反例/限制：满手耗药是容量边界；升级刀受现场力量/虚弱改变牌面，不是不升级反例，也没有多刀可救整局的对照。
- 本次处置：waiting。确定生成和腾位穿插已有live子项；缺计划妥当跨轮主动保留、复合触发及完整序列的消费者验证，不能关闭整项。
- 预期行为及下一步验证：保留已上线3/2/0模型；后续固定验证跨轮保留后的实际手牌身份、容量与逐动作完成，存档恢复同链核验。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-47910f82a1fdd98f：开场扣血和真实接续资源

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md
- 原文SHA256：`d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd`；本次已核相等。
- 既有账本：silent-0018、silent-0019、silent-0020、silent-0021、silent-0025、silent-0079、silent-0198、silent-0228、silent-0255。
- 自核证据：TXZ6RVMQA09D A10 F43/45/46/48/49首战斗过渡分别70→66、52→48、62→58、60→56、4→0；Royal Poison无Blood Vial组合与F49不可操作死亡保留。WQZVENQ7DTRP F33 T9/T7双向血价复核同上。
- 反例/限制：不能把旧Royal Poison加Blood Vial净值拆成单件值；现场已扣与SL恢复帧不得重复扣。
- 本次处置：waiting。开场4血和连战子项已有live；缺留药整战对照、SL重问后的完整后继，以及未知回复/复活组合的相位验证。
- 预期行为及下一步验证：保留观察范围内新战开场模型；未知组合保持未建模，不预支下一轮能力、未来回复或空奖励。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-f1374df72d8e6a25：胜战退出与持续/临时药价

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md
- 原文SHA256：`df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0`；本次已核相等。
- 既有账本：silent-0019、silent-0020、silent-0050、silent-0253。
- 自核证据：1913SE84AXQF A10：F24实际锻造，F28休息回21至61，F29胜损15至46，F31入口46。Q6M2Y34MWKRE A10：F7回21至57，F8胜损55至2，F9 T2死亡；F2敏捷药T3和F8速度药T1均实际饮用。
- 反例/限制：Q6 F5/F6零损留药，F2早饮候选未完整实打；不能从单题候选推全部场合应早饮或留药。
- 本次处置：waiting。缺同入口同后继的早饮/不饮/留药整战对照；1913路线实际动作改变，不能以两条失败链改药价或HP护栏。
- 预期行为及下一步验证：保留药价与护栏，先分离机制误差、临时药效和实际退出资源；后续按run而非状态帧切分。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-38a49e6c97f31eea：紧勒和增益分源机制包

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md
- 原文SHA256：`6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0`；本次已核相等。
- 既有账本：silent-0006、silent-0011、silent-0025、silent-0044、silent-0050、silent-0064、silent-0133、silent-0253、silent-0259、silent-0261、silent-0262。
- 自核证据：Q6M2Y34MWKRE A10 F8 T4敌HP103→95→85→83，T5入口80；普通紧勒8攻击后建2层，后续突然一拳8+2、生存者完成弃牌后2、毒3分账。1913SE84AXQF A10 F31磨蚀/荆棘/重接只按原实际资源链核验，不用净扣替代毛伤。
- 反例/限制：紧勒子公式正确不代表整战获胜；未观察升级、叠层、有挡目标与重放不从两条无挡链外推。
- 本次处置：waiting。普通紧勒限定公式已有live；其余同包再生、荆棘、重接、阈值与SL联合后继缺完整消费者验证，不能整包关闭。
- 预期行为及下一步验证：保留已上线普通紧勒及既有增益模型；后续逐段核伤害、反伤、回复封顶、复活和过轮时点。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-ef0e38a5dbd3bc07：路线实际回复与能力兑现

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md
- 原文SHA256：`d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5`；本次已核相等。
- 既有账本：silent-0019、silent-0020、silent-0021。
- 自核证据：1913SE84AXQF A10 F24锻造不回血、F28实际61HP、F29退出46HP、F31死亡，未来F32营火没有抵达；Q6M2Y34MWKRE A10 F7实际57HP、F8退出2HP、F9死亡。退出与入口原帧分别保存。
- 反例/限制：路线计划中的未来营火不是已到账HP；1913实际锻造改变原计划条件，不能全归同条件预测误差。
- 本次处置：waiting。缺受控换线/休息/用药的完整后继与能力收益归属，不能从两败或不同构筑的低血案例拟统一血价。
- 预期行为及下一步验证：只用实际完成回复和已建且来得及触发的能力；保留当前权重，未来验收完整节点动作和后继。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-7f820c02d39bfaea：死亡统计饱和的SL替换

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md
- 原文SHA256：`bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105`；本次已核相等。
- 既有账本：silent-0079。
- 自核证据：NHA2KW0RB7VP A10 F33 T1第一至四次原线14挡、损1、两侧跨轮净扣8；第五/六次替线8挡、损7、净扣24，各多损6/多扣16且未杀一侧。T4各仍判死或死亡，SL恢复与回复分列。
- 反例/限制：初题精确切击被弃牌后会重规划，计划快照不是整轮实际执行；第五/六次重放不是独立成功样本。
- 本次处置：waiting。候选诊断及首动作回执已有live；缺跨弃牌/重问完整执行归属、固定后继和独立存活验证，不改SL筛选门槛。
- 预期行为及下一步验证：保留筛选；完整链须把原答、替换、每次重规划和实际敌人HP/血价连到同一次尝试。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## silent-proposal-04b6b430759815ed：油灯首次放大与能力兑现组合

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md
- 原文SHA256：`188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58`；本次已核相等。
- 既有账本：silent-0005、silent-0006、silent-0021、silent-0011、silent-0065、silent-0264、silent-0079、silent-0133、silent-0169、silent-0189、silent-0013、silent-0053、silent-0162、silent-0265。
- 自核证据：NHA2KW0RB7VP A10 F33六次T1普通X1萎靡均实建−2力量/2虚弱，前后油灯stack均null；F17 T1毒药5→10。K3676LU8B0UH A1 F30 T2升级带毒刺击4→8；SADL3CGYTGSR A7 F45 T1毒药5→10。NHA F33 T2正面1/背面2与七手精确切击属于已有限定子项。
- 反例/限制：仅持有油灯不能说明本战仍可放大；建能力和活到下一轮兑现是两个事件，未观察零X/升级/叠层不外推。
- 本次处置：waiting。精确切击和蟹朝向子项已有live；油灯缺可靠首次消费状态及制品吸收/前序负面/重问/SL恢复的联合消费者验证，null不能当首次可翻倍。
- 预期行为及下一步验证：保留已上线限定公式和油灯未知分支；后续须有可识别消费轨迹和组合固定验证，不能从局部多4伤宣称救局。
- 本批源码提交：无；完整提案实际合入：无。已有子项不代替整项完成。

## 已有live子项及实际范围

只读核验时live HEAD为 `efe099dd297f188197c27623970cdf36d76c6bba`；下列八个提交均包含实际agent/src源码修改，且git merge-base --is-ancestor返回0。完整资料见live-source-verification.json。

- cunning：`6403fdcdadc803a092beb5165a068e22bf51c412`，修改源码 agent/src/reflex/card-model.ts、agent/src/reflex/combat-plan.ts、agent/src/reflex/rollout.ts、agent/src/reflex/turn-solver.ts、agent/src/sim/double-boss-start.ts。
- opening：`e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`，修改源码 agent/src/reflex/continuation-value.ts、agent/src/reflex/rollout.ts、agent/src/sim/boss-sim.ts、agent/src/sim/boss-start.ts、agent/src/sim/double-boss-start.ts、agent/src/sim/silent-opening.ts。
- ordinary_strangle：`5c7105ff0294466da8319f2934beda05c6040794`，修改源码 agent/src/reflex/card-model.ts、agent/src/reflex/combat-plan.ts、agent/src/reflex/rollout.ts、agent/src/reflex/turn-solver.ts。
- precise_seven：`75a27fb2c230dc552761b2ad9da4be8a9a35dec3`，修改源码 agent/src/reflex/card-model.ts、agent/src/reflex/turn-solver.ts。
- precise_five_six：`8b9bacbebb20eaaa1133a9945da6c7abfcda745d`，修改源码 agent/src/reflex/card-model.ts、agent/src/reflex/turn-solver.ts。
- crusher_facing：`ec29ea34b919344b707e57ba472ea210f9c39d62`，修改源码 agent/src/reflex/combat-plan.ts、agent/src/reflex/rollout.ts、agent/src/reflex/silent-crusher-facing.ts、agent/src/reflex/turn-solver.ts。
- selection_forecast：`be69855995737d6f381adb10bf248964832da24b`，修改源码 agent/src/memory/types.ts、agent/src/reflex/combat-plan.ts、agent/src/reflex/silent-selection-audit.ts。
- selection_dispatch：`fdaf787a372880b0438e73bcac7e6d2168b038ed`，修改源码 agent/src/eye/decision-log.ts、agent/src/hand/loop.ts、agent/src/reflex/silent-selection-dispatch.ts。

同时冻结base/live十四个相关源码文件的blob和SHA256，原字节以.txt保存。八条路径字节有差异，因此没有把main模型读回冒称live等价执行；实际live中的Cunning、Strangle、Crusher、候选诊断入口及single_action_receipt均另核。selection_dispatch仍明确state_effect_verified=false、whole_plan_executed=null、actual_turn=null；首动作回执不能替代整线执行归属。

## 记录、测试与上线

本批只经根learner/ledger.py update追加既有31个静默条目的本批报告/提案链接和waiting说明，不改claim、status、first_run、version、evidence或effect，不重写历史复盘，不新建重复提案id。原proposed/shipped状态保持；本批不登记shipped。具体输入和CLI回执见ledger-links-input.jsonl、ledger-links-cli.log，完成后的同批物理行验收见final-validation.json。

没有生产源码改动，撤源码失败/恢复通过不适用；tsc、vitest、cases均为null且未运行。没有代码提交，所以不制造gitleaks提交扫描成功；不执行live合入、刷新提交、eval发号或规则上线双通知。既有版本和已核子项源码均非本次上线。没有对局、play、模型请求、网络调用、依赖安装或子agent。

回退：本批无生产变更可回退；保留本批材料和账本追加历史，后续由运维沿原proposal_results收处置。所有waiting缺口仍开放，报告结束不关闭量化父要求、原专题或消费者验收要求。

给运维的提案材料：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-184302/learner/runs/20261013-184319-strategy-proposal/proposal.md；完整报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-184302/learner/runs/20261013-184319-strategy-proposal/report.md。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261013-184302-strategy-proposal",
  "base": "7398d10436a9c64d73885370eeff1b4cba3230ad",
  "runs": [
    "KEN58SH9SLZ6",
    "TXZ6RVMQA09D",
    "WQZVENQ7DTRP",
    "02HB4L0C3C67",
    "4D4J8USKCPAV",
    "F4QKG4J1AJJZ",
    "JLN5SK17W4FQ",
    "LS8035TB32P3",
    "NB8KCF6HRGVF",
    "S9UZAK0JP0C0"
  ],
  "fixes": [],
  "skipped": [
    "silent-proposal-08eaa60bcc449852",
    "silent-proposal-92920295a648b540",
    "silent-proposal-a327449c331efbc1",
    "silent-proposal-a099e89437e942bb",
    "silent-proposal-47910f82a1fdd98f",
    "silent-proposal-f1374df72d8e6a25",
    "silent-proposal-38a49e6c97f31eea",
    "silent-proposal-ef0e38a5dbd3bc07",
    "silent-proposal-7f820c02d39bfaea",
    "silent-proposal-04b6b430759815ed"
  ],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-08eaa60bcc449852",
    "silent-proposal-92920295a648b540",
    "silent-proposal-a327449c331efbc1",
    "silent-proposal-a099e89437e942bb",
    "silent-proposal-47910f82a1fdd98f",
    "silent-proposal-f1374df72d8e6a25",
    "silent-proposal-38a49e6c97f31eea",
    "silent-proposal-ef0e38a5dbd3bc07",
    "silent-proposal-7f820c02d39bfaea",
    "silent-proposal-04b6b430759815ed"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-08eaa60bcc449852",
      "state": "waiting",
      "reason": "缺同入口、同牌组及固定后继下不饮/早饮/留至boss的整战对照，无法从七次已饮结果校准持药价值。"
    },
    {
      "id": "silent-proposal-92920295a648b540",
      "state": "waiting",
      "reason": "缺固定后继的连续通关对照，以及SL重新提问后的整线执行归属；局部省3血不能确定选线或终局权重。"
    },
    {
      "id": "silent-proposal-a327449c331efbc1",
      "state": "waiting",
      "reason": "缺同后继整战对照及独立存活验证，不能把9血/15伤或4血/一沙坑轮拟为统一交换阈值。"
    },
    {
      "id": "silent-proposal-a099e89437e942bb",
      "state": "waiting",
      "reason": "确定生成和腾位穿插已有live子项；缺计划妥当跨轮主动保留、复合触发及完整序列的消费者验证，不能关闭整项。"
    },
    {
      "id": "silent-proposal-47910f82a1fdd98f",
      "state": "waiting",
      "reason": "开场4血和连战子项已有live；缺留药整战对照、SL重问后的完整后继，以及未知回复/复活组合的相位验证。"
    },
    {
      "id": "silent-proposal-f1374df72d8e6a25",
      "state": "waiting",
      "reason": "缺同入口同后继的早饮/不饮/留药整战对照；1913路线实际动作改变，不能以两条失败链改药价或HP护栏。"
    },
    {
      "id": "silent-proposal-38a49e6c97f31eea",
      "state": "waiting",
      "reason": "普通紧勒限定公式已有live；其余同包再生、荆棘、重接、阈值与SL联合后继缺完整消费者验证，不能整包关闭。"
    },
    {
      "id": "silent-proposal-ef0e38a5dbd3bc07",
      "state": "waiting",
      "reason": "缺受控换线/休息/用药的完整后继与能力收益归属，不能从两败或不同构筑的低血案例拟统一血价。"
    },
    {
      "id": "silent-proposal-7f820c02d39bfaea",
      "state": "waiting",
      "reason": "候选诊断及首动作回执已有live；缺跨弃牌/重问完整执行归属、固定后继和独立存活验证，不改SL筛选门槛。"
    },
    {
      "id": "silent-proposal-04b6b430759815ed",
      "state": "waiting",
      "reason": "精确切击和蟹朝向子项已有live；油灯缺可靠首次消费状态及制品吸收/前序负面/重问/SL恢复的联合消费者验证，null不能当首次可翻倍。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-184302/learner/runs/20261013-184319-strategy-proposal/report.md"
}
```

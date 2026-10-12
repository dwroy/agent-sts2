# 本批静默猎手策略提案与逐项处置

记录时间：2026-10-12 02:24:46 CST（写入前已执行 date）。

批次 `20261012-021301-strategy-proposal`；来源局 MTQ0EUBJ3R6T、7X0W3U8TVA2A、KFRDELW2TH2P。本批为普通队列任务，无 research_request / implementation_request；只处理派发的10个原id。初始树干净，合main为 Already up to date，base=`af5872cddb8c205a0d14cb7f95f1d6d18be74c69`。三局runs.jsonl均SILENT/A10；10份原Markdown的实际SHA与队列登记吻合。原提案/经验/复盘原文只读保留，不重复登记id。

## 可实现子项：奇巧名额事实与毒药窄输入

来源原提案 `silent-proposal-0ea5c0b9c030fdd6`，相关宽提案 `silent-proposal-8fb51933639faf90`、`silent-proposal-b3bc0eb09211af6c`。账本 silent-0274、silent-0278，既有交互 silent-0247/0027。来源 postmortem/experience-update；实现 strategy-proposal。授权 Roy-2026-10-07-learning 只提供权限，不提供游戏事实。

支持：KFRDELW2TH2P A10 F33六次T7选择d282864/282899/282933/282968/283001/283035，均给爆发奇巧。末s289533时手上技法已经补7挡，已打1张技能、3能量、SLOTH3；防御/刺击后s289536只剩爆发，1能量仍被SLOTH_POWER锁住。六次毒药s289350→351、388→389、425→426、463→464、499→500、536→537均增加6毒且当步敌HP不变。末37→43毒，随后43+42=85，敌159→74，9血对需损22实际死亡。选牌时的playable=true与后来剩能不能证明后继可施放。

旧：选牌只列对象牌面，缺余牌名额和完整手牌资源；本场毒药未纳入量化候选（原observedPoison仅已有双boss窗口）。
新：仅SILENT/A10、同战同轮HAND_TRICK实际动作、三牌懒惰/首张手动技能与可核副本匹配时，逐候选追加当前手牌、独立费用、余2手动名额上界和爆发仍需后继技能，完整后继明确未验证。保留候选/评分，Jev仍选择。毒药仅本局完整七遗物集合、四玩家增益及单知识恶魔的已核敌增益组合返回6；未知/缺失/重复修饰条件不补值，原双boss窗口优先级保持。只接现有modelPotion/求解器，不另造模拟器、不拟药价。

反例与限制：F28T2给防御奇巧后0能量仍未继续施放；替目标不自动等于兑现。六试相关，只算一局，不作六独立训练/验证样本。完整自动重放序列、提前饮毒的整战胜线及不同遗物/增益未知；本局不拟统一选防御、禁爆发、先喝药或SL血价门槛。毒药覆盖刻意保守，不声称只排除一个已知修饰即可泛化全部状态。铁甲及未观察进阶均走旧路径，固定阴性控制仅改角色标识，不读其知识。

验证：固定原帧投影附原行号/偏移/SHA；实际planSelection题目必须有新增字段且两选项可选择；实际planCombatTurn→solveTap必须含毒药6，手动名额0仍能重放药水；最终回合对应85净扣/需损22。撤去两处生产接线应失去这些字段/药水，恢复应通过。测试屏蔽生成知识文件，禁LLM/网络。早期原帧schema裁剪缺state_version/session的夹具失败与damage=null模型契约修正记录均保留。后续本角色可比新局作为时间留出；本批不声明自然采用或胜率收益。

预期：给选牌者可核资源边界，让本场已观察毒药进入候选评估；不把未执行收益当已发生。回退：仅撤本批独立源码提交的6文件增量，保留后续知识刷新、旧原件和原护栏/SL/终局逻辑。实际live后才登记版本/双通知，台账shipped交运维。

## 十项原提案处置

### silent-proposal-0802f69b28d25079 — waiting

证据：MTQ0EUBJ3R6T F23 四次T3、T5/T6。账本：silent-0079/0253/0214。

原线净扣13/损0，末次19/损8；26条原帧断言已复核。两条完整后继均失败或截断，尚无同资源整场胜线和独立时间留出，不能拟合饱和SL权重或保药阈值。候选资源审计5604982e/be698559在015818集成批，未实际live，不重复实现。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-sl.md`；SHA256 `79e1696de63d19810eb442ee3afa83dd5795f1693f4c9f4a48433fef014e3596`。

### silent-proposal-f54e8de2381c1250 — waiting

证据：MTQ0EUBJ3R6T F11T1，s288592—288597、d282138。账本：silent-0125。

护栏候选损14→6、伤14→16；实际后继损6/净扣20包含弃连续反弹后重问迷雾，不能把20归完整原plan1。f1542578/be698559候选审计在015818集成批且非live祖先；跨选牌/重问到最终执行的完整机器关联仍缺。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-guard.md`；SHA256 `db780eb4b443cc8fdfb17237293f186588b1b010347160b24d1d22291ae8c5ce`。

### silent-proposal-763a4b9d9f17b815 — waiting

证据：7X0W3U8TVA2A F31T2/T5/T6/T11；MTQ0EUBJ3R6T F20T3/F23T3。账本：silent-0005/0046/0053/0080/0214/0253 等原14项。

原14项机制及组合跨度大。7X0暂死两段与71HP接续、MTQ0临敏/毒素血价已核，但整包尚无统一固定消费者差分；不由已有单机制源码认定整包duplicate，未观察修饰条件与长期兑现仍缺。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-mechanisms.md`；SHA256 `989dcea2a0dd5cad05d276157131dec57fdb9d17b2bdab66cbd25f32e0e9ad39`。

### silent-proposal-19a5cff2094e2d8f — waiting

证据：7X0W3U8TVA2A F31T5→T6；MTQ0EUBJ3R6T F23T3。账本：silent-0021/0064/0079/0133/0125。

7X0暂死两段0/0仍接续到25/25/21；MTQ0两线均失败不能证明替线更安全。接续清状态0970bc0d已live，仅为局部；待复活段输入c915888d在015818集成且非live祖先。缺修正输入后完整后继与终局校准，不改必死/终局规则。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-sl.md`；SHA256 `7bf15ce1f8fd2291d52b8d24fc89de1fe613e8fd9812d31621f9cd48c8e2d57d`。

### silent-proposal-3540bf4360bf80af — waiting

证据：MTQ0EUBJ3R6T F19/F20/F23/F24；7X0W3U8TVA2A F18/F28/F30。账本：silent-0019/0020/0243。

MTQ0赢战入/出59→46、46→8且F24无帧，不能预支营火。现buildFacts仍以当前HP/计划/投影为主，尚无已到节点、入房补血、SL恢复、赢战净耗全链的固定分源验收；缺完整节点历史消费者契约与改线路径对照，不拟合路线/休息阈值。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-resources.md`；SHA256 `58181f916f63872302d0ab2342b349e5de205083aa365151b8f4bcb79c1b63ce`。

### silent-proposal-0ea5c0b9c030fdd6 — waiting

证据：KFRDELW2TH2P F33 六次T7；s289533—289538、d283035/283038。账本：silent-0274/0247/0027/0016/0278。

本批实现子项：奇巧选择显示余2手动名额上界/独立费用/手牌快照/爆发仍需后继技能；已核同遗物同增益组合的毒药6进入真实求解器。整项仍waiting：奇巧施放和自动重放的完整合法序列、不同对象/顺序或提前饮毒的整战对照未核。不得将子项源码合入当全部提案完成。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sloth-potion.md`；SHA256 `ed57d3f8b54f0d056efe2e488a4dca2c2b32a7062433c636e71a51b395663391`。

### silent-proposal-f915ec544ab94b6e — waiting

证据：KFRDELW2TH2P F12T1，F33首/第三试T6。账本：silent-0079/0125。

原T6初始36毒；原/替净扣83/93、损6/12。两线都止于T7，不能拟新血价权重。F12完整护栏0损线在生成小刀后重问未完整执行；候选日志旧源在015818，跨重问实际执行归属和全程受控后继仍缺。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sl-tradeoff-guard.md`；SHA256 `2339e1598f60a64fa1db9be3ebe3cecfe7057ff323c14f15341ccce85b15de98`。

### silent-proposal-8fb51933639faf90 — waiting

证据：KFRDELW2TH2P F28T2，F33T2/T5/T6/T7。账本：silent-0005/0006/0027/0189/0276/0277/0278。

本批毒药子项覆盖六次加6及最终85毒结算/需损22，不扩展至制品/异蛇头骨/未知遗物或增益。铁心完整减层触发仍未隔离，力量/敏捷/佩尔之肉整包尚无统一多轮消费者验证，其他药效时点或全战价值未获得本批新证据，保留waiting。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-mechanisms.md`；SHA256 `540a529f428b0c342abb969c3d040446149db3d7fb4f855b23f4b950462a64ab`。

### silent-proposal-b3bc0eb09211af6c — waiting

证据：KFRDELW2TH2P F33T4/T6/T7，F12T1。账本：silent-0021/0079/0102/0247/0274。

本批完成奇巧名额事实子项，但continuation_verified=false；未把爆发收益或敌43毒预支为胜利。末敌74仍存、玩家9对需损22死亡；完整合法后继、SL血价全链与换对象/提前喝药整战反事实仍缺，宽终局项waiting。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-sl-selection.md`；SHA256 `f3279ab3f48180d287e7ad57c0a1484e56ed48910772aac748dd6faf32185bf9`。

### silent-proposal-fdc3a505fe5e1a55 — waiting

证据：KFRDELW2TH2P F29—F33。账本：silent-0019/0020/0243。

重新提取F29营火44→65、F30赢战65→27、F31赢战27→15、F32营火15→36，入恶魔后才补2。赢战净耗50与SL恢复不是新路线收益；没有可比替路线/锻造整场结果，且完整分源事实消费者未验收，保持waiting。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-resources.md`；SHA256 `9591f8717f33da220db658aaa746a04412cd9b324bb60fbb2f9a376a0796ea75`。

## 证据制品与既有实现边界

本批直接从logs提取1521状态、1456决策、14条SL记录，原行字节SHA和偏移见states.jsonl/decisions.jsonl/sl-attempts.jsonl，提取汇总raw-extraction.json。26项日志断言与资源端点见evidence-audit.json；它们不是tsc/vitest结果。原提案、账本和批次身份分别见assigned-proposals.json、ledger-snapshot.json、dispatch.json。

source-ancestry.json核当前live4159829813ca8a20dbf3ad4c0a1f099a20111866：f1542578/be698559/5604982e/c769739b/c915888d均非祖先，且已由015818修复批承接固定17源集成，本批不重复实现。0970bc0d接续清状态、790b76d0防御重放计数确为live祖先，但都不能覆盖原宽提案全范围。消费者已有局部实现与待上线候选分开记录。

## 本批最终状态

记录时间：2026-10-12 02:32:03 CST。源码 `8043b289e8065a31799cfd1d331e0c6c933bc1d6`，沙箱tsc0/2897例通过，撤接线3失败、恢复24例通过。锁内预检17路径冲突，merged=null；六文件增量apply --check通过但未应用，交运维兜底。原10项均保持waiting，子项不冒称整项完成。完整报告：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-021301/learner/runs/20261012-021311-strategy-proposal/report.md`。

## 2026-10-12 02:33:47 CST 末次live变化与勘误

原415982981切点的候选未上线结论已被后续52d6a2e86集成更新；七个旧源码现为live祖先，详final-live-observation.json。原宽提案仍缺完整执行/合法后继/因果与消费者验收。本批8043b289e仍非live祖先。上节“叶增量apply --check通过”误写：实际退出1，两个入口已被并行集成改动，原日志和错误草稿保留；未应用补丁。最新十项处置以proposal-dispositions.json及report.md为准。

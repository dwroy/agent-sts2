# 三局静默猎手复盘报告

记录时间：2026-10-20T15:11:50+08:00（先运行date取得）。任务：postmortem；批次20261020-144306-1d7d2b90-1c3f-401a-a814-198c58828c30-postmortem。独立完成，没有派下级agent、修改源码/知识库、提交、推送、运行play或改运维prompt。本次只追加lessons、经CLI追加账本/专用提案，过程材料在本批目录；指定extract_evidence命令另按工具默认保存共享内容对象，其来源及指纹完整见工具manifest，未手工修改对象库记录。

已按README、最新STATE、decision-log末尾、学习协议、账本规范及代码提案协议执行。STATE的旧停点与后续decision-log恢复记录并存，实际角色、是否结束只由runs原始行核实；没有据旧摘要擅自关任何任务。

## 资格与产出

|局号|runs原行|角色/结束/结果|追加位置|账本主项|
|---|---|---|---|---|
|9J6T70HSYPG7|856|SILENT，ended存在，A10 F8败|notes/lessons.md:22327|0020 support、0496 repeat、0050 support|
|UWUFHGRAJJ6J|857|SILENT，ended存在，A10 F31败|notes/lessons.md:22369|0019、0314、0316 support|
|TR224PCKENSM|858|SILENT，ended存在，A10 F21败|notes/lessons.md:22449|0019、0426、0418 support|

没有跳过。开始时三个标题都不存在，追加前逐局又查重。每局只执行一次cat >> ... <<'EOF'；每局追加后才执行该局ledger.py update及find。原lessons前10180158字节SHA256=bd87e7c9b3cba4da6c5858339f71a2a5021ae4c2c46a8a02c8e3566660992ed7，追加后核同。三节实际字节均与核验稿一致。三条主经验之外的既有机制另补support；无新机制/新条目，未改任何旧claim、first_run、prior、状态或版本。

## 证据冻结与可重现定位

先运行evidence_summary.py，摘要SHA256=da889e89386854bcf11d32e7a31550123c64068896679f5f4aeb1986bf637741；它只有事实计数/有限定位，不替代原始行。再运行题定extract_evidence.py四流命令。实际读取evidence-manifest.json，并按offset/bytes seek重读所选原始行、核SHA。其他原始流由scan_raw.py完整流式扫描、只保留显式局号匹配；未整份载入大型日志。

states先有限字节窗口读取关键帧，随后全流扫描校正：1109帧offset、字节数、SHA和物理行号与窗口逐帧一致。参考身份只有显式run_id/state.run_id或提证器经decisions原行核实的精确decision_id；不使用正文、时间邻近、相似question_id归局。question_id仅作本来已有显式run_id行的定位字段，不作为新增归属证据。

|提证流|冻结切点bytes|冻结前缀SHA256|本批计数|
|---|---|---|---|
|v6-build|41650029|880a6151ab07df5fd8f953a96088edb2ab533cf29b830bb34b48ea117a12b392|{"9J6T70HSYPG7": 23, "UWUFHGRAJJ6J": 85, "TR224PCKENSM": 51}|
|jev-prompts|1964131090|4149d2db233d73d81b95e18502acaaf80ceea2ac11d53ee31e0a56738eb21c87|{"9J6T70HSYPG7": 26, "UWUFHGRAJJ6J": 163, "TR224PCKENSM": 62}|
|decisions|2856807108|28a0b4a11b24c211d9a4fe6367df65479ea4840163f396eea7135e3974bd826c|{"9J6T70HSYPG7": 140, "UWUFHGRAJJ6J": 562, "TR224PCKENSM": 365}|
|run-config|2226342|f904ebe3b9ccce8d315dfbe6b2ccd0387ef147ec185c565c478cf36a616e4992|{"9J6T70HSYPG7": 2, "UWUFHGRAJJ6J": 1, "TR224PCKENSM": 1}|

其他原始流（具体逐行offset/bytes/SHA在对应raw.jsonl的ref；下表SHA仅指工具冻结扫描结果，不取运行结束之后的新日志）：

|流|冻结bytes|扫描SHA256|本批计数|
|---|---|---|---|
|runs.jsonl|386618|68cbac6fb1b661620d17fa1e580efb6aa1e5d9fbbd085fd2ebfa7d8dceb27f90|{"9J6T70HSYPG7": 1, "UWUFHGRAJJ6J": 1, "TR224PCKENSM": 1}|
|states.jsonl|14660391343|753b0fe7a4a8f692791ab2204d18825f4a0d3b7b99ecfebd4964bd76e03cbf35|{"9J6T70HSYPG7": 147, "UWUFHGRAJJ6J": 585, "TR224PCKENSM": 377}|
|decisions.jsonl|2857559161|03e74f0e5045671156a89447ca3a5358d805e039b143ee02b2eff8bd8b07083f|{"9J6T70HSYPG7": 140, "UWUFHGRAJJ6J": 562, "TR224PCKENSM": 365}|
|run-config.jsonl|2226342|f904ebe3b9ccce8d315dfbe6b2ccd0387ef147ec185c565c478cf36a616e4992|{"9J6T70HSYPG7": 2, "UWUFHGRAJJ6J": 1, "TR224PCKENSM": 1}|
|run-plans.jsonl|9890980|b4b5a39c5014e90c40cd253ede33697ded81039c0dcbd2bd1d26d444e9204396|{"9J6T70HSYPG7": 29, "UWUFHGRAJJ6J": 100, "TR224PCKENSM": 72}|
|sl-attempts.jsonl|49580503|741d02f21854057c149b28579c8ffd5a26ebbfc15f0ee6aa49c349c4de47c348|{"UWUFHGRAJJ6J": 5, "TR224PCKENSM": 6}|
|brain.jsonl|1102592954|497bb235f86802114da8112dfe6ee41db14d3cd1e2bdcbbdbd6020f8b5afb9fa|{"9J6T70HSYPG7": 13, "UWUFHGRAJJ6J": 47, "TR224PCKENSM": 36}|
|fight-plans.jsonl|2233957|4dc030fa7152e844b5dd3bae7a3fd414dafcc604ad5eb97747f4698e4b75de97|{}|

每局指定resource_chain.py都已运行，原资源JSON保留；逐窗口与states/decisions/sl-attempts交叉核对。窗口数5/17/15包含SL尝试，不是三局各自独立战斗数；赢战也全部列入正文。REWARD确认推进，草蜢逃脱并失牌单列；工具不自动判胜。所有入口均T1，有些未就绪；前三次SL缺退出，写末观察，不填毛伤。SL恢复与营火、跨幕、药水获得分别记账。完整敌伤及各伤害来源若无法拆分均未记录；可见HP下降只作下限，重复类型/同上限身份不明保留限制，敌人消失不凭空补扣，新增身体/复归另列。

三份notes/run局报全文已读，未发现同局其他重启局报。各局run-plans匹配29/100/72、brain匹配13/47/36；brain均engine=codex，DeepSeek是任务职责/兼容计费字段。deepseek-reasoning.jsonl没有run_id，按各局首末决策窗逐行筛过都无匹配；仅时间窗检索不用来建立其他流身份，缺失不是“没思考”。fight-plans本批无匹配，不补伪记录。

## V6与Jev覆盖范围

|局号|V6匹配|完整门回退行|Jev匹配|完整题面/答案阅读|其余未完整读题|
|---|---|---|---|---|---|
|9J6T70HSYPG7|23|v168|26|j70679|25|
|UWUFHGRAJJ6J|85|v245|163|j70844|162|
|TR224PCKENSM|51|v304|62|j70906（plan2显示截断后另补完整）|61|

coverage.json逐行列全部159条V6和251条Jev的原始引用、问题/决定标识、阅读层级及未读原因。不是末五条覆盖。未完整读的题只核身份/计数/相关候选或资源字段，不作完整模型、策略、机制验收；未读原因是本任务围绕取回缺口、末药与死亡链聚焦，未把其余248题全题灌入上下文。V6非空entries大表并未全部逐项读；v302曾显示部分表被工具截断，不计完整覆盖。完整读的v168/245/304是空entries的门回退元数据，不冒充完整Codex非战斗题面。

三局run-config均mode=on/reflex=off。9J6有c351初始和f563同局重启两份，其他均f563。V6拿牌/商店/休息门回退分别7/31/15，全部known=0；jev_answer全null，方向触发的非空entries不是同义的采用/执行/收益。brain_request_failed和unknown独立保留；本批没有V6 off，不据此抹掉历史缺流、缺题或未知身份。Jev战斗请求的request/answers/error分别核，251行都有answers，没有error字段，不能由无error字段推出全部调用无故障或收益成立。

manifest记录历史decisions invalid_json两行373494/373505，Jev一行53166，均保留offset/bytes/SHA，未把历史无效行补归本批。decisions全冻结流另有unknown_identity=1934、unmatched_decision_id=1389；这不是本批缺失或零收益的分母，不以时间猜配。Jev本冻结源identity_gaps为空只是身份提证结果，不是科学结论。完整覆盖三题的原始字节已再seek核验，后继对齐如下：

|Jev原行|精确decision_id对应原行|chosen/result/gate/dispatch|实际后继|
|---|---|---|---|
|70679|d442629|带毒刺击；completed；gate_reject未记录；单步selection_dispatch returned/completed、state_effect_verified=false、whole_plan_executed=null|s458031—458036，带毒刺击/涅奥之怒实际执行、取回零张，代码补切割，整轮25扣0损，不能按原19扣预测直接算误差|
|70844|d443211|p0→e0毒药；completed；gate_reject和selection_dispatch均未记录|s458636—458638，5→11毒当步敌91不变，次帧结至80、玩家归零|
|70906|d443555|尖啸；completed；gate_reject未记录；单步dispatch completed、整线字段null|d443555—443558、s458991—458995独立核三步；扣11一致，预计损1而实损2，根因未定位|

题面完整不证明采用；原答best标记不等于完整原线执行；result completed/returned也不代实际效果。尤其F21 TR224三次least-loss候选result为not dispatched，不能计出牌。没有将上述提证当本批正式发布、下一局消费者读回或自然收益证明。

## 逐局核心结论和数字复核

9J6：56/70空药进骇鳗，T6从79至73过75眩晕；T8实际15挡对27而损12；T10攻击前s458049为12血18挡、来袭36，需损18，静态至少再7血才存活、敌余10。死亡帧清玩家易伤后意图重渲染24，不能倒用它替代攻击前36。涅奥之怒四次真实deck_card_select零选补0496 repeat；未定位新bug。旧0050较早复盘称“学过/S1.exp43”，当前fold是proposed且残留S1.exp124字段，本批明确保留冲突、按当前状态记“之前见过”，没有擅改为shipped。F7回血与巨兽67投影不等同F8精英56实到，不造跨目标误差。

UWUF：F30赢后6血进F31，末试s458637为5血12挡、来袭23，需损11，静态存活至少差7；原帧结11毒后敌80才归零。F19零净损却永久丢FOOTWORK+，与后继HP资源分列；没有重新完整核loot-cost题，不记0314旧根因repeat。F17步法实际建立，后场已缺失；F31各试首回合不同，不作能力单因对照。四试毒药只算一次领取、四次实饮，三次恢复属于SL。没有回退阈值或喝药新规则。

TR224：F19赢后25、F20赢后2、F21入2；前三次T1没有执行，末试15挡对18来袭需损3，相对2血静态存活差2；两敌64/67未受损。F20尖啸后7攻击/5挡实损2，而原同线预测1，尚待源码定位，没冒报纯bug。蜜虫力量16/攻击19与石虫16攻均有原帧，只支持现场成长/目标压力，不定固定首杀。原始草稿里的T8挡/攻、药名、遗物ID等在追加前校正，最终追加与核验稿相同；追加后重grep关键数字，未发现需追加勘误的数字矛盾。

number-checks-before.json保存终局直接原帧断言；metrics.json保存全部逐轮需清/可见扣/未见死亡退场/新增HP/玩家净耗；各局资源和药水获得/饮用/SL的行、时间、槽位已列入lessons。路径引用当前只读live f563源码，source-identity.json含3个必要源码叶的Git blob/SHA与git diff --binary（均0字节）。不复制整库/完整归档，不把开局dirty知识字节冒作重建完整对局代码。

## 未记录与限制

三局共同：独立敌人总毛伤/全部伤害来源、全局完整候选执行率、未执行替线代价/收益、Jev缓存命中、旧式boss时钟“需要/估计”、原生turn_context档位回执未记录。各题gate_reject若无字段明确未记录；UW最后毒药的selection_dispatch缺失。未到boss的实打/估值未知（9J6一幕、UWUF/TR224二幕），没有拿模拟补实盘。未能唯一对齐的同类敌或缺死亡帧由逐轮限制保留。9J6同局暂停前后身份有两个配置，不用时间最近者覆盖旧身份。没有从任何其他角色借证。

统计：低信心1/33/7，plan原答best为21/22、119/124、50/53；首combat决定由代码7/25、15/97、24/67（包含各attempt窗口，非独立局），HP guard可见替换均0，TR224另有1次dominance不计护栏。记录中的tokens由runs原行与局报逐项核对，brain独立计划已在兼容账中，不二次相加。费时用各局首末决策差，9J6不含此前停机。

## 账本、提案及最终验收

- 9J6T70HSYPG7：新增无；更新silent-0020, silent-0496, silent-0050。
- UWUFHGRAJJ6J：新增无；更新silent-0019, silent-0314, silent-0316, silent-0005, silent-0023, silent-0278。
- TR224PCKENSM：新增无；更新silent-0019, silent-0426, silent-0418, silent-0011, silent-0046, silent-0132, silent-0080。

仅silent-0496为明确同根因repeat；其余均support，没有因为死亡自动给既有规则贴老错重犯。没有新机制须add，旧claim、prior和状态保持。每局find输出及CLI回执在同名文件。

- 9J6T70HSYPG7：silent-proposal-6d2829d8fef55c5a，domains=combat,structure，文件/home/dw/Projects/agent-sts2/learner/runs/20261020-144306-1d7d2b90-1c3f-401a-a814-198c58828c30-postmortem/9J6T70HSYPG7-proposal.md；实现任务strategy-proposal；状态pending。
- UWUFHGRAJJ6J：silent-proposal-f16ecfb980cec25b，domains=combat,potion,terminal,structure，文件/home/dw/Projects/agent-sts2/learner/runs/20261020-144306-1d7d2b90-1c3f-401a-a814-198c58828c30-postmortem/UWUFHGRAJJ6J-proposal.md；实现任务strategy-proposal；状态pending。
- TR224PCKENSM：silent-proposal-f84bf045ec442052，domains=combat,sl,terminal,structure，文件/home/dw/Projects/agent-sts2/learner/runs/20261020-144306-1d7d2b90-1c3f-401a-a814-198c58828c30-postmortem/TR224PCKENSM-proposal.md；实现任务strategy-proposal；状态pending。

三份提案都关联实际本角色证据/账本/来源任务；0496建议最窄语义修复，其余先固定回放/查缺口，证据不足保留原行为。不填implemented_commit，不冒implemented/shipped。没有开实现子任务或实际改规则；调度器后续如何派发、实际合入live、消费者和自然收益不在本报告已完成范围。

本次仅记录/提案，不运行代码测试。最终ledger.py check及提案链接验收见verification.json。失败与过程限制另存process-notes.md，全部抽取文件、固定源码叶、提案、回执、初稿和数值审计留在本批目录，不清理原日志或未完成研究。

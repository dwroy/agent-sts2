# 本批提案核验与处置

本批10项：1项duplicate、9项waiting；没有新增源码、知识库修改、提交、合入或版本。既有代码可证明的窄项与宽提案未证部分分别记录，未把局部入口等同整项完成。

## 身份与输入

- batch：20261014-124302-strategy-proposal，角色silent，原派发proposal_ids逐项齐全，reason=proposal。没有research_request、implementation_request或proposal_repair。
- 初始工作树干净；按任务合main显示Already up to date，基线及结束HEAD均为40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57。普通队列不承接绑定其他批次的专题。
- 本批派发锚点为result.json的10局。仅为已领取提案补读原文关联的7X0W3U8TVA2A、9TG1RP5LFAAK、JQPT83P8KDSZ、S9UZAK0JP0C0；全部14局runs.jsonl角色为SILENT，A9三局/A10十一局，不读取其他角色私有知识。
- 原提案10份逐SHA与队列保存值相同；原文保存为<id>.original.md。assigned-input.json保留本批派发、原账本行历史与runs。没有领取新id或修改队列/原请求。
- 读取README、最新STATE-2026-10-12、decision-log末尾、learning-protocol及learning-code-proposals；没有开发play、联网、派下级agent或修改运维prompt。

## 核验材料与范围

extract.py按原run-config/结束时间 seek原日志，再逐局核身份；source-index.json记录原文件offset/bytes/SHA，不把派发锚点冒称全历史。
audit.py逐原offset读回21,404行：10,568 states、10,185 decisions、547 brain、104 SL元行。原runs所声明决策数均与冻结决策行数一致。254个关键实帧保存为evidence-audit.json.selected；16对跨幕的原前后帧全保留。此处是输入与事实核验，不是生产tsc/vitest或全候选模型认证。

resource-audit.json调用既有resource_chain生成观察窗口，只采用明确入/退出帧的净资源变动。该辅助的restart_observed包含初始T1/started_at相交的拆窗，不能当真实SL尝试数；缺exit保持null，不能按0损或胜战计。实际尝试/用药须回原sl-attempts和decisions。

## 逐项结论

### silent-proposal-03754e1265894000：waiting

原提案：牌挡敏捷/脆弱/柔嫩逐张核；折扇被动挡、触发时点与持有能力分源

证据：F17T2/T11、F23T3/T4、F29T3/T4、F33T4；silent-0006/0011/0013/0080/0088/0101/0232/0253。完整账本ID：silent-0006, silent-0011, silent-0013, silent-0080, silent-0088, silent-0101, silent-0232, silent-0253。

处置：RC61MFQM63Y6 F23T3 的敏捷1→6→5→4、斗篷12/防御9/第三攻击折扇4可核；现有模型已有临时敏捷、柔嫩与折扇入口。缺幻影首刀在其他增益/叠层下的效应对照及药水时机的同条件后继；不能将八条混合提案整体标已实现或据此拟新持有价。

反例、预期行为及验证：局部增益发生不等于整战收益。先核逐牌属性消耗、被动挡与已建能力；未见组合保留未知，不改喝药时点。

### silent-proposal-e5ea36df117ca9b7：waiting

原提案：核接管首轮与自主启动的事实边界；已有明确实现则duplicate，未记录自动过程保持未知，不由一败禁取遗物。

证据：F34取耳环、F36蘑菇、F49T1；silent-0164。完整账本ID：silent-0164。

处置：XTSV1U9JD34T F49T1 首个可行动帧只有不可打进阶之灾、3能量、16挡；自动接管中间动作缺帧。当前模拟虽列WHISPERING_EARRING为已识别遗物，但本批没有可重建的接管顺序或“自由启动”候选与实际执行对照，不能补造自动策略、禁取规则或宣称边界完全实现。

反例、预期行为及验证：F35/F39/F45/F46仍赢战，蘑菇实增加HP上限；不支持以一败禁取。应保留可操作前阶段未知，待记录完整接管边界后校验。

### silent-proposal-ab055ef7dfbb44e5：waiting

原提案：验证夜魇收益的存活兑现条件，并只建模本局已观察的幽灵一层无实体；延后饮用整场效果不足，保留旧时点与药价规则。

证据：F49T1/T3/T4；silent-0140/0069/0005/0206。完整账本ID：silent-0140, silent-0069, silent-0005, silent-0206。

处置：XTSV1U9JD34T F49 六次幽灵均T1，26→1且16挡覆盖；现有幽灵模型已接入这一层效果。末T4夜魇复制标记3而当轮死亡，没有次轮兑现；缺同抽序延后饮用整场对照及死候选复制收益造成错误排序的证据，不能以该败局改药价/时点或将整项处置duplicate。

反例、预期行为及验证：早喝现场有已兑现零损价值，T3仍损22、T4各实线均死；不能认“晚喝可赢”。收益须按存活与实际下一轮到手核验。

### silent-proposal-0129c465c6f5bd79：waiting

原提案：强制弃牌后候选重核、毒胜保血候选及夜魇/接管首轮兑现边界

证据：BTS F17/F31T2；XTS F48T8/F49T1/T4；silent-0009/0021/0024/0057/0079/0090/0140/0164/0205/0268/0271。完整账本ID：silent-0009, silent-0021, silent-0024, silent-0057, silent-0079, silent-0090, silent-0140, silent-0164, silent-0205, silent-0268, silent-0271。

处置：BTSRF7JL1W1Y F31T2 生存者强制弃唯一后继牌、35→21；XTSV1U9JD34T F48T8 凋萎32→23后接F49。当前源码已含普通单弃处理与连王毒胜保血搜索，但同提案还含夜魇兑现、自动接管及SL能力/击杀顺序：缺这些子域同条件完整后继，不将两个已修子项冒称整项完成，不放宽SL门槛。

反例、预期行为及验证：源码已有preservePoisonWinHp且visit可继续展开毒胜保血。原空胜线与可打防御的差别是候选搜索，不能反推F49通关；强制选择后须用实际手牌重核。

### silent-proposal-abe9d5d0be109a9f：waiting

原提案：赢战血价、真实回复与存档恢复接续，连王剩血按实到资源

证据：BTS F25/F28/F30/F31；XTS F47/F48T8/F49；silent-0019/0020。完整账本ID：silent-0019, silent-0020。

处置：BTSRF7JL1W1Y F30实70→42且明晰消耗、F31实42带液态记忆；XTSV1U9JD34T F48实97→23无恢复进F49。现有路线函数对未知Boss战后HP返回null、死亡不被未来火复活，资源问题已有部分边界；缺相同资源/路线的替代整战及保留药水机会成本对照，不据投影与个例差额拟合安全线或把宽资源请求整体duplicate。

反例、预期行为及验证：赢战仍耗血；本批只核实际资源接续。未来F32营火未到，SL恢复与新得药分开，不能假定另一休息/路线获胜。

### silent-proposal-f16527e59b5cc1e0：waiting

原提案：敏捷/脆弱/覆甲分源、毒与临时减力时点及留挡上限按实帧核

证据：BTS F17T5/F31T2-T4；XTS F48T8/F49T1-T4；silent-0005/0006/0011/0013/0016/0027/0046/0069/0095/0128/0196/0241。完整账本ID：silent-0005, silent-0006, silent-0011, silent-0013, silent-0016, silent-0027, silent-0046, silent-0069, silent-0095, silent-0128, silent-0196, silent-0241。

处置：BTSRF7JL1W1Y F31T2牌挡13+覆甲3后仍损14；XTSV1U9JD34T F49T4尖啸25→16、脆弱防御6而1血仍死。现有模型已有临时降力、牌挡与幽灵入口；本批没有该宽组合在全部目标/持挡/未见增益下的独立效应对照或延后饮药后继，不能把留挡上限当每轮保底、改药水门槛或整体duplicate。

反例、预期行为及验证：末次步法没有补此前5挡，F49没有继承前战毒雾/触媒/敏捷。应逐来源核实际建立、留挡及跨轮撤回，不预支增益。

### silent-proposal-7a8e9ccb7e646538：waiting

原提案：毒/倍率挡/持牌伤及荆棘按实结算，SL换线预测与整轮实差分账

证据：F35/F48三试，末T7/T8/T10/T11；silent-0005/0006/0011/0021/0024/0027/0034/0077/0079/0123/0129/0180/0221。完整账本ID：silent-0005, silent-0006, silent-0011, silent-0021, silent-0024, silent-0027, silent-0034, silent-0077, silent-0079, silent-0123, silent-0129, silent-0180, silent-0221。

处置：9Z9H2EXKLF3T F48末T10实挡18→27→37、18→3；T11敌112→32，39毒两结77与一次荆棘3相符。未完成第二击、复活与接续的中间伤害事件不齐，SL换线还改变熔炉时点与后继；缺可归因的同条件整战对照，不能把模拟差额当毛伤/真实血价或24/24全败当新增必死阈值。

反例、预期行为及验证：第一张牌的动态倍率不能沿用到后继牌；死后未执行第二击不计反伤。毒潜在伤害按实际结算/剩HP区分，不改SL及终局权重。

### silent-proposal-cd9f76184de6e29a：waiting

原提案：跨幕缺血80%回复与营火/胜战消耗/SL资源接续按实到节点分账

证据：HMVJKM56S4Q8/F4QKG4J1AJJZ/G403VCZ3BH1B/25226ZFLNR1J/JLN5SK17W4FQ/JMH5C51RLN4E/9TG1RP5LFAAK/JQPT83P8KDSZ/S9UZAK0JP0C0/9Z9H2EXKLF3T 的F17→18/F33→34；silent-0019/0020/0243。完整账本ID：silent-0019, silent-0020, silent-0243。

处置：原提案十局A9/A10共16对同上限跨幕帧全部符合floor(缺失HP×80%)，该经验已在silent经验库。未来路线/营火/胜战/SL接续仍缺同条件替代路线及未见先古/遗物跨幕交互，现有projectPath遇未知Boss战后HP保留null；不能为消费该公式臆定Boss战耗血或跨未到节点预支回复，也不能整项duplicate。

反例、预期行为及验证：9Z F35同时当前血66→30与上限77→69，不能相加成44；F38/F39/F45的11/8/24血价与两火各20分别记录。16对仅验证已有公式，非全历史/收益校准。

### silent-proposal-292f6731bdb9b669：waiting

原提案：核对静默A10头骨组合毒药水实加7毒与现有窄范围上下文，未知持有价不当已校准零值，不拟合早喝规则

证据：7X0W3U8TVA2A F31T1-T13；silent-0087/0020。完整账本ID：silent-0087, silent-0020。

处置：7X0W3U8TVA2A F31T13毒药向零毒后段实加7、HP不变，随后25→18仍死；当前observedDemonPoison拒绝千足虫、全局POISON_POTION仍未模拟。本批只见该目标/组合一次，缺向前段、已叠毒、阻挡及其他增益目标的药水效应与持有价对照；现有observedPoison标量会供给所有可选目标，不能把一目标的组合总7无条件扩成全目标或再加头骨。holdHp=null/no_table已有明确区分，不拟合零值或早喝规则。

反例、预期行为及验证：T13已喝仍失败，反驳7毒足以救场。待目标/组合边界与后继可核再扩接口；旧未模拟选项保留，药水持有价不从毒增量反推。

### silent-proposal-e09a3905a3922b95：duplicate

原提案：核对普通蛇咬base7/current8的头骨组合，扩展当前仅七毒数值边界，避免重复加遗物；不冒称旧修复覆盖全部增益

证据：7X0W3U8TVA2A F17T3控制、F30T3与F31T1/T13施放；silent-0087。完整账本ID：silent-0087。

处置：普通蛇咬base/enchanted7,current8、2费、无附魔、静默A10的已观察预览已由实际live祖先d385591f37cf2d09a032e3d3b998c4ff5ee5636e实现。三组原始前后帧SHA与既有夹具一致；本分支/live消费者都按8施毒，七毒控制不变，未观察角色/进阶回旧分支，不推导带增益的神化升级。本批无需重复源码。

反例、预期行为及验证：实际施放毒10→18、0→8、0→8，不即刻扣敌HP；T13前段12→4仍活且整局失败。duplicate只覆盖原普通8毒预览提案，不认证未知重抽/升级/完整整战。

## 源码与消费者

source-audit.json保存14个相关路径的base/live blob与live最后源码提交：7路径相同、7路径不同，不能整体假设base/live等价。card-model完整文件只差两处历史署名注释；普通8毒分支、两份既有固定夹具与live部署一致。实际live源码commit为d385591f37cf2d09a032e3d3b998c4ff5ee5636e；main集成a1f431672454eceafe7d97aceab10cd53774baac不属于live祖先，不能拿它冒报部署commit。

consumer-check.mjs在本树和实际live直接加载既有消费者，用冻结牌面和固定空知识cache核普通8毒、7毒控制、三个未观察控制、未知升级、隔离单目标结算及未知药价。两树读取8而不是9；三个隔离结算的毒伤为18/8/8、余敌HP50/42/4。隔离结算移除了其他敌人/攻击，仅验施毒接线，不是原整轮或胜率。毒药水在本局千足虫场景仍未模拟；无药表时holdHp=null、zero=no_table，显示明确的未加载原因。

第一次tsx CLI在建立本scratch IPC pipe时EPERM，日志consumer-check.log保留；没有执行生产测试。检查并改正核验脚本相对路径后改用nice node --import tsx，consumer-check-direct.log退出0、consumer-check.json保存结果。不降低沙箱、不联网，也不把沙箱限制当源码失败。

## 限制与后续

只重核原提案14局，未重跑原116局统计。来源局全带历史dirty源码，不能据当前源码反推历史完整执行树；但这不阻碍核本批实帧或验证现有live窄实现。SL同瓶重放、复活、资源恢复不是独立新药/新局；未执行候选、缺帧中间伤害、下一战反事实均保留未知。

没有新增游戏结论或源码提案，不重复登记child id。经根learner/ledger.py update仅给所属原账本追加本报告/proposal路径和逐项处置note，by=learner:strategy-proposal；原claim、status、evidence、first_run、version不改，不登记shipped。9项waiting由原调度器保留待本角色新局数据；duplicate由运维核实际祖先后按原队列消费。未关闭学习入库或量化父要求。

后续若实施，固定实帧先核当前模型差异；修改后撤源码须失败、恢复须通过，再按原sandbox与live锁流程验证，其他角色/未观察进阶等价。无新增源码的本批未做撤源码实验，tsc/vitest/cases均为null；没有合入或版本，亦不发送规则上线通知。实际上线后的回退应逆向对应独立源码提交并保留并行刷新，本批没有待回退源码。

## 交付

收尾apply_patch首次操作已更新report.md，但第二文件读取前沙箱helper构建bubblewrap失败：ripgrep unreadable glob scan failed；无关项目的.codex路径不存在。原调用exit1，未降低沙箱、未申请权限。相同沙箱下一次只读核验成功，按已授权Write用shell同步本批proposal.md。此故障不是生产源码或测试失败。

收尾实际验收：根账本CLI退出0，39个所属条目均读回本批链接；claim、status、evidence、first_run、version、asc、prior及prior_note全部与写入前相同。gitleaks退出0，438.25 MB材料扫描无泄漏。最终HEAD与base相同、git status为空、git diff为空；回执为final-verification.json。源码撤除/恢复及生产测试没有执行，不能以消费者核验退出0替代它们。

本文件和proposal.md交运维；JSON见result.json。原证据、失败日志和逐项waiting理由均留本scratch。最终工作树与基线零差异，所有产物位于已忽略的learner/runs目录，不提交或推送。

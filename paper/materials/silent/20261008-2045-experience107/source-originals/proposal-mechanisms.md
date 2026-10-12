# 静默A10实建力敏、逐牌挡、实结毒与真实随机分配分账

角色：silent；新证A10，机制有历史A0—A10支持（逐条分阶见historical-mechanism-summary）；策略仅原条目的已观察范围，不改其他角色。
来源任务：experience-update；实现任务：strategy-proposal；既有规则授权：Roy-2026-10-07-learning。
账本：silent-0005,silent-0007,silent-0012,silent-0011,silent-0013,silent-0027,silent-0030,silent-0023,silent-0046,silent-0047,silent-0071,silent-0167,silent-0276,silent-0309；经验：silent-footwork-block,silent-bouncing-flask-poison,silent-strength-weak-observation,silent-deadly-poison-application,silent-noxious-fumes-growth,silent-frail-card-block,silent-accelerant-triggers,silent-poisoned-stab-components,silent-afterimage-per-card-block,silent-piercing-wail-temporary-strength,silent-orichalcum-zero-block,silent-sparkling-rouge-turn-three,silent-infested-prism-tainted-skill-cost,silent-dexterity-potion-card-block,silent-mercury-hourglass-start-observation

## 已核证据与限制
CNKR125PFHJ5 F33 T2步法/毒雾实建，T3四敏21挡对23；T5逃离1→2；T6触媒后33毒三结96、敌217→121，27血9挡对24攻击账剩12却沙坑死。F23 T5随机药瓶三份给子体、母体67/18毒未加、结51到16，T6才胜；F29技能污染及F30脆弱牌面/额外挡分别核。F29胜后才领取水银，首行动前两场各净扣3，本角色141局历史只这一局持有。F19/21/23赢仍损60、事件消费毒药升上限，F25/28/32回血实到36/60/53；SL只有首试。
支持/反例：各条完整12位局号、n、进阶与典型数字见experience及audit/history/numbers-checked；本批无机制反例，胜败不直接作公式反例。
限制：完整dirty运行树、终结独立0血帧/部分毛伤、罐装幽灵实饮与沙坑无实体交互、替构筑/路线/休息/用药/提前触媒的受控整场均缺失；本局无重打，不从模拟8样本4胜或休息31.25%推实胜概率。

## 旧行为与新行为
旧：相关短线估值可能把尚存毒、最高HP分配或整步额外挡当确定收益；水银获取时间在原复盘写错。
新：只根据本角色核实的实建量/结算与分配计算；多敌随机毒若未穷举全部合法分配不认证确定斩杀，单牌挡与被动触发分源；初轮被动只用实帧，不拟合全敌固定净伤。已经正确的模型保持等价；单步能力判定不是强喝时点。

## 拟合、验证、影响与回退
冻结切点2026-10-08T11:38:44.123Z；新局作为发现集、历史140局作公式兼容复核，不把这同一发现局冒称留出验证。结构/机制用明确文本和逐动作帧固定夹具，非数值拟合；后续静默新局才是时间留出。所有游戏参数限本角色已验证的变体/进阶；其他角色和未观察变体保持等价。
在独立工作树先查既有提案及实际live祖先；新增代码需固定夹具验证撤源码失败/恢复通过，并跑原test-sandbox。预期提高事实一致性，不能宣称胜率提升。沙漏/音叉未隔离交互及幽灵抵截止保持waiting限制；实现后用新完局审计。
回退用独立实现源码commit revert，保留本经验/账本/提案历史；当前仅记录提案，没有源码implemented_commit，不标implemented/shipped。

# 静默猎手第87批：强制弃牌后候选重核、毒胜保血候选及夜魇/接管首轮兑现边界

账本：silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271。
经验：silent-deck-burst-observation,silent-survivor-neutralize-discard,silent-kin-poison-sl-observation,silent-queen-poison-main-target,silent-queen-poison-window-sl-observation,silent-nightmare-next-turn-copies,silent-wither-end-turn-loss,silent-whispering-earring-first-turn-control。

仅静默猎手，新增证据均A10；基础机制按各条已核实进阶，不外推未观察组合/角色。
来源任务experience-update/20261008-033315，第87次；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据BTSRF7JL1W1Y F17四试、F30/F31；XTSV1U9JD34T F33两试、F48T8/F49六试。原始日志状态/决策、字节偏移、facts/audit、before及历史复盘段保存在本scratch；完整逐条支持/反例/进阶见changes及mechanism-evidence。
拟合/切分：旧113静默完局逐局重新抽算，与前批七数组、全部血档、节点转移、回血及SL逐行一致；两局为新增验证，切点2026-10-07T19:05:16.706Z，共115静默完局。无自由参数或boss模拟池；两局原dirty完整树未知，不用当前源码冒认历史运行树。没有整场受控替代胜线，不以预训练补机制或放宽必死/SL门槛。
验证：独立实现冻结本角色已观察实帧；固定回放核实际弃牌/增益/用药/目标/持牌伤/下一轮到手。保留其他角色及未观察边界等价，跑原sandbox tsc/vitest。已实现的子项只有核真实live祖先源码commit才duplicate；证据不足waiting并保留现有策略。
回退：独立源码实现逆向恢复实际上线前规则、保留并行刷新；经验逆向本批单文件源差异。实际上线后Roy双通知旧/新规则、局号/账本/任务/影响与回退。本经验任务只登记提案pending，不改源码或冒称implemented/shipped。

旧/新行为：B F31T2原生存者后突然一拳计划13伤/损4/杀丝，实际强制弃唯一后继牌、净扣8且损14，35→21。普通单弃标记与绷带补挡耦合根因已有0268，本批只补该子项的重复数据，不新增固定保留/击杀序。
X F48T8已可毒胜，手仍有防御/触不可及/手上技法且5能量，求解器winsFight立即停止扩展、自动首胜线结束，凋萎实耗9后32→23入连战。旧0213为存活结算、0271为存活时搜索漏保血候选，不能混作同一已修根因；独立回放验证这些合法候选对当轮剩血的实际差额，不断言F49可赢，不在本任务改搜索边界。
X女王末T4夜魇建立3复制标记、次轮未到便死；第2/4次T3猎杀者31净扣与药瓶32的差额都仍损22、T4挡9与6均不足16，后续抽牌亦变。B同族四试第四胜T13、T3/T6退两信徒，但后轮路线/抽牌同变。SL重打统计与局部收益分账，缺完整同条件对照不设能力优先/击杀顺序/SL新门槛。
X耳环首题接管后只进阶之灾不可打、仍3能量，中间接管动作未知；不能让agent主动选择已被接管的启动或预支前战能力。预期：候选必须可实际执行、终局资源不能跳过持牌血价/保血候选；胜率提升未知。

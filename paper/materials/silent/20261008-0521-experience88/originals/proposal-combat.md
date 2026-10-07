# 静默猎手第88批：毒/倍率挡/持牌伤及荆棘按实结算，SL换线预测与整轮实差分账

账本：silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221
经验：silent-footwork-block,silent-strength-weak-observation,silent-deck-burst-observation,silent-noxious-fumes-growth,silent-accelerant-triggers,silent-regret-hand-loss,silent-wither-end-turn-loss,silent-aeonglass-artifact-growth-sl,silent-shadowmeld-new-block-double,silent-paels-legion-card-block-double,silent-bronze-scales-per-hit-thorns,silent-scroll-paper-cuts-unblocked

角色仅静默猎手；新增局9Z9H2EXKLF3T为A10，基础机制范围按各条已核进阶，未观察组合/其他角色保持等价。
来源experience-update/20261008-044250，第88次；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据：只读根notes/lessons.md:5627起本角色复盘与勘误、logs/runs/decisions/brain/sl-attempts；states按UTC窗口seek再核run_id/character_id。逐帧facts、audit、旧新changes、机制窗口/反例和分阶、SL重放原行、字节偏移与before保存本scratch。
拟合/切分：旧115静默完局逐局重跑，七数组、全部血档、节点转移、真实回复及SL与第87批逐行一致；新局为新增验证，共116完局，切点2026-10-07T19:59:55.152Z。无自由参数拟合、无boss模拟池，不用预训练补机制；6c3d8187+dirty完整源码未知，不把当前源码当原局树。
支持/反例：各经验完整run id与各进阶支持/反例见changes.json及mechanism-evidence.json；新局无机制反例，无胜利SL对照。局部成立与整战失败分别计，不把失败局自动当基础公式反例。
验证：独立任务冻结本角色已观察状态和动作，核逐牌倍率、临时属性、毒/持牌伤/复活/反伤与已完成资源接续；核全败推演不能代替必死判官。运行原沙箱tsc/vitest，其他角色和未观察进阶策略保持等价。只有真实live祖先源码commit才可处置已实现子项；证据不足waiting保留现有行为。
预期影响：减少预支未执行组件、忽略持牌血价、混合生命上限/当前血、重复计算SL恢复的风险；胜率影响未知。
回退：独立源码实现逆向恢复实际上线前差量；经验以三方逆向本批单文件变化并登记回退版本，保留并行刷新和全部历史。实际上线后date、Roy双通知旧/新规则及证据/账本/任务/影响/回退。本经验任务只登记pending，不改打法源码，不冒称implemented/shipped。

旧行为/待核：现有经验支持毒/敏捷/翻倍/荆棘；末次T7全败模拟换线预计多损7换16伤，实际整轮省2血、多扣22且熔炉时点T8改T10，最终仍失败。模拟代价不是实际血价，局部差额不证明整战胜因或必死。既有代码策略实现需按当前live版本先查，不能从原dirty树归因。
新行为提案：固定回放审计末试F48 T2/T4毒雾+各3共6、T3普通触媒1；T11的39毒只结39+38=77，荆棘实反3，112→32。玩家仅2敏无力量；敌T8力6双18、T11力12双24逐击成长。T8暗影/士兵首挡为(6+2)×4=32但两张9伤+攻击36仍复活20；T10首偏折18后余偏折9、防御10共37，对两张12及28攻仍损15。只翻第一张士兵挡，不能沿用所有初览；死后未执行第二击不预支反伤。
药水：F48三试技能T1/T5/T5，混沌均T7生成精灵/熔炉，熔炉T7/T8/T10；末T8和第二试T8的精灵复活各20，首试精灵未消费便读档。22饮、三自动复活、两次SL复药、0弃分账，未实打的留药反事实未知，不设新喝药/持有门槛。
F35卷轴当前血66→30但上限77→69，两种损失不能相加；F48三次T1均弃悔恨，没有该持牌失血，不把商店未删诅咒当本局致死原因。验证现有模拟/终局是否与实帧一致；差异只在复现实验中确立后修改。缺毛伤事件账、两次截断结算、同条件替代整战与原dirty树，保留必死/SL边界，不以24/24全败增设阈值。

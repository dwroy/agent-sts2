# 静默猎手第87批：敏捷/脆弱/覆甲分源、毒与临时减力时点及留挡上限按实帧核

账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241。
经验：silent-strength-weak-observation,silent-footwork-block,silent-gorget-plating,silent-noxious-fumes-growth,silent-frail-card-block,silent-accelerant-triggers,silent-piercing-wail-temporary-strength,silent-sturdy-clamp-retention-cap,silent-slumbering-beetle-wake-growth,silent-bowlbug-rock-full-block-stun,silent-dark-shackles-temporary-strength。

仅静默猎手，新增证据均A10；基础机制按各条已核实进阶，不外推未观察组合/角色。
来源任务experience-update/20261008-033315，第87次；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据BTSRF7JL1W1Y F17四试、F30/F31；XTSV1U9JD34T F33两试、F48T8/F49六试。原始日志状态/决策、字节偏移、facts/audit、before及历史复盘段保存在本scratch；完整逐条支持/反例/进阶见changes及mechanism-evidence。
拟合/切分：旧113静默完局逐局重新抽算，与前批七数组、全部血档、节点转移、回血及SL逐行一致；两局为新增验证，切点2026-10-07T19:05:16.706Z，共115静默完局。无自由参数或boss模拟池；两局原dirty完整树未知，不用当前源码冒认历史运行树。没有整场受控替代胜线，不以预训练补机制或放宽必死/SL门槛。
验证：独立实现冻结本角色已观察实帧；固定回放核实际弃牌/增益/用药/目标/持牌伤/下一轮到手。保留其他角色及未观察边界等价，跑原sandbox tsc/vitest。已实现的子项只有核真实live祖先源码commit才duplicate；证据不足waiting并保留现有策略。
回退：独立源码实现逆向恢复实际上线前规则、保留并行刷新；经验逆向本批单文件源差异。实际上线后Roy双通知旧/新规则、局号/账本/任务/影响与回退。本经验任务只登记提案pending，不改源码或冒称implemented/shipped。

旧/新行为：B同族胜试T5步法+三敏使两防御各8、16挡仍损6；F31没有继承前战敏捷。T2镣铐令石虫16→7，中和令甲虫18→13，牌13+覆甲3盖石7而其他敌仍损14、下轮石眩晕；末覆甲1+后空翻5对22攻，毒4后甲虫17→13仍存活。
X沙漏T8触媒+2、54毒三结159按132敌血截断，凋萎9先扣，不能把力量或整轮159净伤都归毒。女王未继承前场毒雾/触媒/敏捷；末T3步法后累计3敏不补旧5挡，末T4脆弱防御6；尖啸令聚合体力1→−5、25→16攻，但1血+6挡仍致死。
幽灵六试均T1喝、现场无实体1令26→1，16挡覆盖且钳子带10到T2；T2末21抵16仅留5到T3、27攻实损22。只核已饮效果、逐牌/留挡与模型，未有延后饮药胜线，不定喝药/留药门槛。旧历史卡牌机制及本批子窗口分母见mechanism-evidence，不外推全部增益组合。
预期：按实建增益与当前牌逐项兑现，临时降力和敌成长不跨轮混算、留挡上限不作每轮保底；无整场受控胜因。

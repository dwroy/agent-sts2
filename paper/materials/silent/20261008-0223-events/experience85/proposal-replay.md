# 静默猎手第85批：保留投斧首牌顺序身份、弃牌后重核计划和能力实际兑现；候选与完整实线分账

来源任务experience-update/20261008-014012，第85批；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
仅静默，新增证据A10；历史子公式只限各经验明确观察的进阶，其他角色及未观察组合保持等价。
账本：silent-0092,silent-0023,silent-0021,silent-0057,silent-0205,silent-0079,silent-0266。关联经验：silent-throwing-axe-first-card-replay,silent-afterimage-per-card-block,silent-deck-burst-observation,silent-survivor-neutralize-discard,silent-queen-poison-window-sl-observation。证据局：G33HU22H2543/P74C04AEPL1F。

时间切分/拟合：先重算旧110静默完局七数组、血档、节点转移、回血、SL，全逐行一致；这两局留作新增验证，合计112局，切点2026-10-07T16:43:50.303Z。无新自由参数或跨角色训练，不跑boss模拟池。原dirty源码树未记录，当前源码定位不冒作当时实现。
完整原始证据、字节偏移、逐帧facts与audit在本提案所在scratch；每条支持/反例局号在experience-before/changes.json。独立局分母与一局多次SL/子公式窗口分开。没有这两局替代出牌/留药/路线完整胜局，不以死亡否定已兑现机制，也不把题面候选当已执行。

验证：固定run/floor/turn夹具，按独立历史局先冻结，再回放这两局；原沙箱入口tsc/vitest通过，非静默及未观察机制回归等价。当前live已有正确实现的项目给duplicate并核真实live祖先源码commit；缺证据项目waiting；本任务只改经验，全部提案pending，不冒称implemented/shipped。
回退：独立实现commit按文件逆向恢复实现前live行为，保留新数据/其他并行功能/全部失败与学习记录；上线后沿授权双通知Roy。

旧行为/新行为：SL键按整轮牌组排序，G33HU22H2543 F48 T1首牌余像与首牌闪亮登场相同canon，但候选挡18/10、伤75/107，不能视为exact。仅在已观察silent A10、投斧首牌未消费时保留首个实际卡牌与有效顺序；同步核药水、续步、重放及宽松旧键，核当前源码是否已有修复，独立strategy-proposal实施。bug定位只在提案与silent-0266，不给DS“修后必胜”说法。
G33HU22H2543六次均闪亮先用重放，余像+只建1层，能力药再建至2。第二试药后闪亮线预测/实损8、余像先候选0但未执行；末T8两余像三牌共6被动挡、基础6，共12对31。药水补层不恢复首牌机会。旧6EV5V6PJJS9D/ENKYQMS9W4ZD计划余像重放亦未兑现。代码估值须分已建层数、支付、当前触发与存活轮；证据不支持必先能力或改通用HP护栏门槛。
P74C04AEPL1F F23末T3原计划生存者/紧勒打卵/毒雾+/精确切击报零损；得16挡后弃精确切击，重算紧勒打丝/毒雾，预计余血−7；1血对24/16挡实死、卵毒后剩2。选择题已含“丢弃”，先审计计划牌/目标/后继伤害取消是否反映在题面及重算；不能称语义未传的纯bug，不能用未执行保留线宣布必胜。旧silent-0205的repeat原样保留，首试卵已死不是同死亡对照。缺完整反事实时只修可复现身份丢失/提示和重算，不凭相关性添加弃牌强制规则。
预期影响：SL识别效果不同的实线，弃牌后让当前伤害/来袭和持续能力收益可审计；没有胜率提升估计。

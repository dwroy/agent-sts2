# 静默猎手第85批：逐来源核临时减力、双重毒结算、牌挡/被动挡/翻倍、开场遗物及实际回复

来源任务experience-update/20261008-014012，第85批；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
仅静默，新增证据A10；历史子公式只限各经验明确观察的进阶，其他角色及未观察组合保持等价。
账本：silent-0006,silent-0011,silent-0027,silent-0046,silent-0013,silent-0180,silent-0196,silent-0255,silent-0198,silent-0204,silent-0069。关联经验：silent-strength-weak-observation,silent-noxious-fumes-growth,silent-accelerant-triggers,silent-piercing-wail-temporary-strength,silent-vambrace-opening-block,silent-paels-legion-card-block-double,silent-bowlbug-rock-full-block-stun,silent-royal-poison-blood-vial-opening-net,silent-stone-humidifier-rest-growth,silent-frail-card-block。证据局：G33HU22H2543/P74C04AEPL1F。

时间切分/拟合：先重算旧110静默完局七数组、血档、节点转移、回血、SL，全逐行一致；这两局留作新增验证，合计112局，切点2026-10-07T16:43:50.303Z。无新自由参数或跨角色训练，不跑boss模拟池。原dirty源码树未记录，当前源码定位不冒作当时实现。
完整原始证据、字节偏移、逐帧facts与audit在本提案所在scratch；每条支持/反例局号在experience-before/changes.json。独立局分母与一局多次SL/子公式窗口分开。没有这两局替代出牌/留药/路线完整胜局，不以死亡否定已兑现机制，也不把题面候选当已执行。

验证：固定run/floor/turn夹具，按独立历史局先冻结，再回放这两局；原沙箱入口tsc/vitest通过，非静默及未观察机制回归等价。当前live已有正确实现的项目给duplicate并核真实live祖先源码commit；缺证据项目waiting；本任务只改经验，全部提案pending，不冒称implemented/shipped。
回退：独立实现commit按文件逆向恢复实现前live行为，保留新数据/其他并行功能/全部失败与学习记录；上线后沿授权双通知Roy。

旧机制/拟改行为：已有尖啸、毒雾/触媒、士兵/臂甲及开场遗物主题，本批补直接实帧。独立任务先核当前live模型/求解/药水/终局链，只有缺口才改，未知组合与未观察进阶保留原值。无新喝药/留药门槛。
G33HU22H2543 F48末T7尖啸+聚合体4→−4、22→13、17挡零损，T8恢复并成长5/虚弱消失、31攻穿12；99脆弱末余94，无敏捷，后空翻/防御各5→3，余像每牌2不折。NOXIOUS_FUMES+末T4建3，T8女王35/聚合22毒，毒药女王35→42，实际各扣42/22。持有1力量不当额外敏捷/被动挡。
P74C04AEPL1F F17 T2尖啸0→−6、7×2→1×2，无挡损2；T3恢复后30穿12实18。普通触媒T1建1，T2咕嘟3→12毒、滑溜6两结只2血/两层；T8清空滑溜12毒两结23、44→21，T9毒杀。F22 T4主怪10毒结10+9=19，余8，T5雾3补至11，不将施放雾当即时补毒。
P74C04AEPL1F F17首防御5→10；F23末T1臂甲/士兵防御5→20，石16全挡但卵8使9→5、下一轮石眩晕；末T3仅士兵触发生存者8→16，石再眩晕，卵3→2毒后仍杀最后1血。当前待触发与同轮后牌分账，不把全场零损作眩晕必要条件，不推统一杀卵或每轮翻倍。
G33HU22H2543新战F38/39/45/48王室猛毒无小血瓶出牌前各失4；读档恢复77不是再扣4，未知复活/回血内部顺序不推广。加湿器五实休基础回复加5、上限加5，总回复133/上限+25；四锻造不触发，满血截断未新验证。F5赠礼所建仪式只本战见、不能跨战预支。
预期影响：来源/回合与费用准确，额外结算/滑溜/临时力量/当前挡不被终局价值重复或提前计入；不承诺本批败局能转胜。旧证据独立局与新一局多SL分开，无完整去组件反事实。

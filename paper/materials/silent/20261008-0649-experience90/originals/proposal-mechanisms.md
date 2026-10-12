# 静默猎手第90批：已观察药效和能力的分时点模型覆盖核验

账本：silent-0005,silent-0006,silent-0027,silent-0189,silent-0276,silent-0277,silent-0278
经验：silent-strength-weak-observation,silent-accelerant-triggers,silent-paels-flesh-third-turn-energy,silent-dexterity-potion-card-block,silent-heart-of-iron-plating,silent-poison-potion-observed-application

角色silent；本批新策略观察限A10，机制只在已观察进阶/组合核验，其他角色与未观察条件保持等价。来源experience-update/20261008-061302-experience-update，2026-10-08.7，第90批；实现任务独立strategy-proposal，授权Roy-2026-10-07-learning。
证据局KFRDELW2TH2P：F28T2敏捷药及两防御/手上技法；F33六试T2铁心、T4回血与加3力、T5触媒、首/第三试T6同盘、六次T7奇巧/毒药。原日志587决策/620状态/35实际Codex脑/8 SL记录；DeepSeek0。勘误36毒优先。全史119静默完局截至2026-10-07T21:30:23.239Z，历史动作与层/回合保存在historical-potions.json/audit.json/facts.json，支持/反例/分阶详mechanism-evidence.json，不把读档当独立局。
拟合与切分：本次不拟合药水持有价、胜率或HP门槛，先用上述固定快照做局部差分验证，截止点后的新静默可比完局留出验证。历史29毒药局的制品阻挡/头骨加量分条件，未知组合保持旧分支。胜负相关性不能代替因果。
验证及回退：独立实现跑既定tsc+沙箱vitest，固定快照核合法动作、能力层/药槽/HP与毒结算；无关角色和未观察等级等价。实现后才按真实live祖先登记implemented、通知Roy，原记录不得冒标。各新增条件/事实入口独立撤提交即可恢复旧行为，保留账本/证据/历史及知识刷新。
旧行为：本局毒药候选一直标数值未知，已有observedPoison入口仅覆盖已观察双boss；现场37→43毒却未供恶魔候选。已有力量、敏捷、触媒、覆甲和肉的公式先与本角色实帧比对，不能凭新经验文字假定源码缺失。
拟议行为：窄范围核无加量/制品的毒药6层与触媒1两结；若已有源码/数据等价就记duplicate，否则独立实现输入已核药效和现场修饰条件。敏捷药2敏逐牌兑现、铁心建7覆甲不即补牌挡且后轮按当前层，肉T3起4能；力量逐击和触媒不倍增层数与原模拟逐项差分。历史剂量核44局64敏捷饮/16局26铁心饮/29局118毒饮；条件外不补预训练事实。
反例/缺数据：制品两局阻毒、头骨三局加量是条件分支，不是基础6反例；提前饮毒、换药时点完整胜线未执行，不设一律早喝、持有价或静态优先级。铁心减层的完整触发条件未隔离，不能由7→2推每轮固定减1。预期影响是减少已核窗口模型未知，整局胜率未知。

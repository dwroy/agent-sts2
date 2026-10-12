# 静默猎手：核对毒源、逐次触媒结算与临时减力，保证构筑统计使用实际兑现。

角色：静默猎手；本次新增证据为A10，只验证已观察等级与机制；其他角色保持等价。来源任务experience-update，来源批次20261007-203654-experience-update；实现任务strategy-proposal。授权Roy-2026-10-07-learning。只保存数据提案，本任务不改策略源码，不登记implemented或shipped。

验证资料：本批verification.json、historical-facts.json、audit.json、同指纹决策与原始状态切片。旧103局七数组、血档、节点转移、回血和SL按同口径重算一致；新局571决策/582状态/6试。六次只算一局支持。机制反例0；整战失败不作公式反例，缺未执行支线胜负不宣称必胜。

拟合与样本切分：不凭单局调阈值；先用既有静默证据固定公式/阶段定义，再将YQL8RZ8BWN1E作为增量核验。实现需要固定日志回放，历史各进阶分别复核，不以同一场六试作为六个训练/留出样本，不跑模拟池或联网。

验证及回退：只允许已核实的角色/进阶条件或共享机制纯bug范围；新旧固定状态逐动作比较，无关角色等价；运行原沙箱tsc/vitest。无法复现则waiting并保留原行为。上线后按协议通知旧/新规则、证据、账本与任务；回退独立实现commit及其版本，保留经验和所有历史。

核对毒源、逐次触媒结算与临时减力，保证构筑统计使用实际兑现。

证据：YQL8RZ8BWN1E F17 T1毒药+加7、触媒1、雾2；两次7+6结后雾补2仍7，T7药瓶7→16，T8第二普通触媒1→2结45，T9结42结束本体；末试T6尖啸令敌力0→−6、14→8，斗篷6挡损2，次轮负力消失。末无玩家力/敏，防御5、生存者8。历史支持分母见各条目，不把已持有能力当已施放。

旧行为：当前求解器已覆盖部分公式，但尚需逐帧核对叠触媒、补毒时点、阶段清毒和回合临时力；不能把已有模型冒认新修。新行为：独立实现任务先比对当前live；已等价则提供实际live祖先源码commit并处置duplicate；确有偏差只修日志可复现的公式/时点，观察性构筑不新增固定评分阈值。预期影响：施毒/攻击/生存预算与实盘一致，不能承诺提高胜率。

账本：silent-0011,silent-0027,silent-0007,silent-0046,silent-0006,silent-0021；经验：silent-noxious-fumes-growth,silent-accelerant-triggers,silent-bouncing-flask-poison,silent-deadly-poison-application,silent-piercing-wail-temporary-strength,silent-strength-weak-observation,silent-deck-burst-observation。

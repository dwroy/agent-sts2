# 静默猎手第86批：牌挡敏捷/脆弱/柔嫩逐张核；折扇被动挡、触发时点与持有能力分源

账本：silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253。
经验：silent-strength-weak-observation,silent-noxious-fumes-growth,silent-frail-card-block,silent-anticipate-temporary-dexterity,silent-ornamental-fan-attack-block,silent-phantom-blades-first-shiv,silent-hunter-tender-card-attributes,silent-speed-potion-temporary-dexterity。

仅静默；新证据A10，机制基础公式沿各条已核实进阶，不外推未知组合/其他角色。
来源experience-update/20261008-024302，第86次；实现strategy-proposal；授权Roy-2026-10-07-learning。
证据RC61MFQM63Y6 F17 T2/T11、F23 T3/T4、F29 T3/T4、F33六试T1/T4，原始状态/决策、字节偏移、facts、audit和before保存在本scratch。逐条完整支持/反例及进阶见changes.json；没有相反机制实帧，整战失败不当机制反例，缺对照不能认因果。
拟合/切分：旧112静默完局逐局重跑并与上批七数组、全部血档、节点转移、回复/SL逐行一致；本局独立验证，截止2026-10-07T17:26:17.487Z为113局。无自由参数、跨角色样本或boss模拟池；本局0d6c1a82+dirty完整源码未知，不以当前源码冒认旧树。
验证：独立实现先冻结历史局再回放本局，固定数据覆盖实际弃牌/目标/能力/用药/SL状态；运行原sandbox tsc/vitest、非静默等价回归。当前live已有实现须核真实祖先源码commit再duplicate；没有独立胜线/参数证据则waiting，保留现有规则。本经验任务不改源码，CLI提案pending、不声称implemented/shipped。
回退：独立实现逆向恢复实际实现前live行为，保留并行刷新与学习历史；实际上线后按Roy授权双通知旧/新规则。经验文字回退用本批experience-before与源commit的单文件逆向补丁。

旧/新行为：核模型是否正确消费普通/升级毒雾3、本轮预判2、速度临时5、柔嫩逐牌−1、折扇每第三攻击4、已建幻影9层等观察，不以知识文本存在宣称实现正确。F23 T3预判后柔嫩净敏1，速度药1→6，斗篷得12后敏5、刺击后敏4、防御得9；第三攻击小刀零直伤仍折扇+4共25挡。次轮临时项撤回、属性恢复0。F33 T4预判+生存者⌊10×.75⌋=7，末两防御各3；57→38转向仍杀31HP/6挡，不把取整/被动挡倒补。
F17 T2毒雾+建3时旧7毒不变，后轮才补；F29 T3幻影建立9、旧5挡不变，T4首刀在弱/易伤下实14，仅本局该首刀窗口，不外推升级/叠层/通用取整顺序；蟹末未建立幻影/毒雾，不算其持续收益。药水获得10、饮15（5次同瓶SL重放）、弃0，没有改时点的完整胜线，只核已饮效果/期限，不提出新喝药/留药规则。
预期：已观察局部效果在候选和模拟中按实建/逐牌兑现，反事实用完整实线验证，缺整战证据保留策略。正確实现项核实际祖先后duplicate，剩余等待样本。

# 静默猎手第89批：同抽重打饱和死亡率与持续敌血池的终局价值审计

账本：silent-0021,silent-0064,silent-0079,silent-0133,silent-0125
经验：silent-myte-toxic-block-sl-observation,silent-decimillipede-reattach-poison,silent-ceremonial-beast-threshold-growth-sl,silent-deck-burst-observation

角色：silent；新观察仅A10，基础公式按关联经验的已观察历史进阶，未观察组合和其他角色保持等价。
来源：experience-update/20261008-053105-experience-update，第89批，版本2026-10-08.6；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据：7X0W3U8TVA2A F31T1/T2/T5/T6/T11/T13；MTQ0EUBJ3R6T F11T1、F17T4-T8、F20T3、F23四试T2-T5。复盘和05:28勘误只读，869条决策/901帧状态/54条实际Codex脑回答；DeepSeek窗内0。runs角色逐局核SILENT。facts.json、sl-t3-comparison.json、机制全史窗口、原字节偏移、changes.json和旧版保留本scratch。
方法/切分：旧116静默完局按上一批口径重新逐局核、七数组/全部血档/节点转移/实回复/SL逐行一致；新两局作为后续观察，共118完局。支持/反例局号、按进阶分母见mechanism-evidence.json，替打法失败不当基础机制反例；同盘SL后续动作亦变化，不把局部收益当整战因果。
旧行为/待核：知识已记录部分机制，但不能据条目假定代码已完整消费；原运行均dirty、完整源码未知，只以实际日志和固定状态定位。先核当前live等价处理和真实祖先；已有实现给duplicate及真实commit，证据不足waiting。
限制：毛伤事件账、原护栏线/其他路线/留药或提前建立磨蚀的完整反事实、未知抽牌和dirty原树未记录；不填预训练机制，不制定未经验证的安全血线或喝药门槛。
验证/回退：只用本批固定原帧做最小回放，关键输出须与实际HP/挡/毒/接续/能力时点一致；无关角色/未观察进阶做等价控制。按仓库原沙箱入口tsc+vitest，自测后锁内上线；独立源码commit单独回退，经验数据可恢复本批before。实际上线再按授权双通知Roy，不冒报本提案已implemented/shipped。
拟议行为：独立任务先核SL替线的实际格挡、持牌伤和当轮严格存活；两候选均24/24死亡时，不能仅由“未更常死亡”认更安全。MTQ0 F23末T3代码插打击删防御，损0→8、净扣13→19且未击杀；末T5才实死，前三T6判死截断不补未执行毒/攻击。以实际HP/持牌伤/能否当前终结核终局比较；缺完整胜线，不能禁止一切探索或声称原线能赢。7X0 F31暂死段重接要保留身份/进度：初150+已发生175、实扣278后残47，不能以局部活段清零当整战终结；模型入口修复0268/0273由原代码提案承担。仪式兽阈值及清状态只按现场160/实毒核，不推内部瞬间。未校准模拟不替代原必死边界，未观察随机抽牌保持未知。

# 静默猎手第89批：逐牌敏捷、临时减力、持牌伤和已建立能力的时间边界

账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0044,silent-0046,silent-0053,silent-0080,silent-0087,silent-0189,silent-0214,silent-0222,silent-0235,silent-0253
经验：silent-footwork-block,silent-strength-weak-observation,silent-noxious-fumes-growth,silent-vambrace-opening-block,silent-abrasive-thorns-dexterity,silent-piercing-wail-temporary-strength,silent-malaise-x-debuff,silent-anticipate-temporary-dexterity,silent-snecko-skull-poison-application,silent-paels-flesh-third-turn-energy,silent-toxic-paid-exhaust-end-turn-loss,silent-ceremonial-beast-ringing-one-card,silent-haze-group-poison-weak,silent-speed-potion-temporary-dexterity

角色：silent；新观察仅A10，基础公式按关联经验的已观察历史进阶，未观察组合和其他角色保持等价。
来源：experience-update/20261008-053105-experience-update，第89批，版本2026-10-08.6；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据：7X0W3U8TVA2A F31T1/T2/T5/T6/T11/T13；MTQ0EUBJ3R6T F11T1、F17T4-T8、F20T3、F23四试T2-T5。复盘和05:28勘误只读，869条决策/901帧状态/54条实际Codex脑回答；DeepSeek窗内0。runs角色逐局核SILENT。facts.json、sl-t3-comparison.json、机制全史窗口、原字节偏移、changes.json和旧版保留本scratch。
方法/切分：旧116静默完局按上一批口径重新逐局核、七数组/全部血档/节点转移/实回复/SL逐行一致；新两局作为后续观察，共118完局。支持/反例局号、按进阶分母见mechanism-evidence.json，替打法失败不当基础机制反例；同盘SL后续动作亦变化，不把局部收益当整战因果。
旧行为/待核：知识已记录部分机制，但不能据条目假定代码已完整消费；原运行均dirty、完整源码未知，只以实际日志和固定状态定位。先核当前live等价处理和真实祖先；已有实现给duplicate及真实commit，证据不足waiting。
限制：毛伤事件账、原护栏线/其他路线/留药或提前建立磨蚀的完整反事实、未知抽牌和dirty原树未记录；不填预训练机制，不制定未经验证的安全血线或喝药门槛。
验证/回退：只用本批固定原帧做最小回放，关键输出须与实际HP/挡/毒/接续/能力时点一致；无关角色/未观察进阶做等价控制。按仓库原沙箱入口tsc+vitest，自测后锁内上线；独立源码commit单独回退，经验数据可恢复本批before。实际上线再按授权双通知Roy，不冒报本提案已implemented/shipped。
拟议行为：只在已核边界上检验并补齐逐牌格挡、临时敏捷/力量撤回、磨蚀反伤、迷雾施毒以及昏眩单牌限制。MTQ0 F23T3两毒素10与实际攻击17合需27挡；速度+5由两防御/妙计兑现29，少防御仅19损8。7X0 F31T2步法+不追补旧7挡、T1臂甲首张16与后继弃牌分开，蛇咬和头骨施毒不当即时本体伤。药水只认实饮/临时层，基础毒药水与头骨贡献未隔离，不设留药权重。本经验任务未修改源码；纯bug0268/0273沿复盘原提案处理，不把修复文字下发给大脑。

# 静默猎手第91批：实际能力、毒结算与现场力挡核验

账本：silent-0005,silent-0006,silent-0011,silent-0016,silent-0021,silent-0027,silent-0030,silent-0087,silent-0278
经验：silent-footwork-block,silent-gorget-plating,silent-strength-weak-observation,silent-deck-burst-observation,silent-noxious-fumes-growth,silent-accelerant-triggers,silent-lagavulin-siphon-poison-sl,silent-snecko-skull-poison-application,silent-poison-potion-observed-application

角色silent；本次策略观察只实施已观察A10；机制有本角色A5/A6/A7/A10或对应条目历史分阶证据，其他角色及未观察组合保持等价。来源experience-update/20261008-071205-experience-update，版本2026-10-08.8，第91批；目标独立strategy-proposal，授权Roy-2026-10-07-learning。
本局GXNKW8X1XYJP：649决策、673状态、48实际Codex脑、7 SL摘要；兼容ds_*不算DeepSeek调用，实际0。UTC窗口2026-10-07T21:35:52.195Z—22:15:02.084Z。全史120静默完局、旧119局七数组/血档/转移/回血/SL逐行一致；原dirty完整源码缺失，不以当前源码冒充运行树。
拟合与切分：本次不拟合牌值、药水持有价、SL或血量阈值；原日志及截止点前历史做诊断与固定夹具，之后独立新静默局留出验证，同局SL不拆独立训练/测试。相关性不当因果。支持/反例及进阶见mechanism-evidence.json，原帧见audit.json和各局states.jsonl，单局机制与同盘见facts.json/sl-paired-facts.json。
验证与回退：先查当前live是否已有等价模型/上下文，已实现须给实际live祖先源码commit才记duplicate或implemented。否则只依据已核窗口独立实现，原入口tsc+沙箱vitest及固定正反例通过才合入并双通知Roy。回退只反向撤独立实现提交，保留知识刷新、并行记录、证据与账本。不把经验数据发布当源码实现或shipped。
旧行为/观察：末战构筑有触媒而未建立；当前模型是否已完整覆盖各入口须核，不假定新文字意味着源码缺失。F33赢战已建两雾与触媒+，末三骑士虽持有触媒+但T3被抑制为普通且未打。
拟议行为：逐入口核力量每击、敏捷每张牌挡且不追补旧挡，覆甲按当前4/3/2另计；毒雾4配头骨实补5、升级毒药7实补8、药水当步加7而不扣本体。实际触媒2层使29毒结84，31毒结90；另轮初遗物7不能并入毒公式。未建立能力/未结算毒不预支到终局，末13+23+2对40需损15、hpAfter−2与实死一致。
典型证据：GXNKW8X1XYJP F33T3/5/6及F45T1—3，F17末次T9力−2/敏0由30毒收30血、2血胜；缚魂T4→T1和触媒T2→T5伴随抽牌/防御变化，不能单归药水时点。三药全史及所有旧能力动作重新核对，条件分支保留。
反例/缺数据：制品阻毒与头骨加量是条件分支，完整覆甲减层机制、提前喝毒药、先打触媒的完整胜线与dirty源码未记录。不设一律早喝/保药/先能力规则。已有模型正确处只复用，预期改善事实覆盖，不承诺胜率。

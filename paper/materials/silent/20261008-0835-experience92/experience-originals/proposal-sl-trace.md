# 静默猎手第92批：有限推演、HP护栏和SL后实际执行链分账

账本：silent-0021,silent-0133,silent-0222,silent-0228,silent-0239
经验：silent-aeonglass-artifact-growth-sl,silent-deck-burst-observation,silent-ceremonial-beast-threshold-growth-sl,silent-ceremonial-beast-ringing-one-card

角色silent；机制按对应条目本角色历史进阶核，策略只实施已观察A10，其他角色/未观察组合保持等价。
来源experience-update/20261008-075539-experience-update，版本2026-10-08.9、第92批；实现任务strategy-proposal，授权Roy-2026-10-07-learning。本任务只更新经验，不改打法源码。
证据：PD9AYQVMLQW6 A10 F49败，UTC 2026-10-07T22:20:03.359Z—23:10:58.949Z；L2TSFU62Z57Z A10 F17败，UTC 23:15:51.935Z—23:39:42.212Z。前者1017决策/1125状态/55实际Codex脑，后者442/447/17；DeepSeek均0，完整dirty源码未记录，不以当前live源码冒认原运行树。
全史122静默完局，旧120局七数组/血档/源节点转移/回血/SL重新核；依据runs.character和states.run.character_id隔离，不用其他角色、未完局或截止点后数据。
拟合/样本/切分：本次不拟合出牌值、药水价、SL、终局权重或HP阈值。截止点前历史用于诊断和固定夹具；后续新的静默局留出验证。同局SL不拆独立训练/验证，相关性不作因果。支持/反例完整run id及进阶见mechanism-evidence.json；原始逐动作前后帧见historical-power-deltas.json/historical-potions.json/facts.json及各局states.jsonl。
验证与回退：实施前核当前live各入口；已有等价用实际live祖先源码commit记duplicate，不因经验文字变化猜测bug。缺覆盖独立实现，固定正反例、原沙箱tsc/vitest通过后合入并双通知Roy。单独逆向撤实际实现净补丁，保留刷新/并行记录/账本，不把经验数据提交称代码implemented或shipped。
旧观察：PD9 F48T1饱和推演所选0/6死、0/6赢，不是全死；F49首题8/8死、末T7候选24/24死，抽牌重问后实际活到T10，原固定全线未复放，不能据此改SL必死边界。
拟议行为：按状态指纹/层/尝试/回合贯通Jev原答、支配/HP护栏、SL撤回、抽牌重问和实线出口。候选省血和真实净血分别记录，限定覆盖及样本分母，不从局部差异调药水/SL或终局权重。
同盘对照：L2 F17第2试T2护栏把预计损15/扣44改损5/扣30，实际损5/扣30；第3—6试同处被SL撤回、实损15/扣44并喝血清，不能累计五次实省10。后四次T3候选损7/扣0，后空翻后重问实际扣16/损7，候选扣敌0不等于抽牌重问后的全轮扣敌0；全场六试0赢，不由零胜样本定哪次是胜线。
阶段/出牌限额：L2第2试T5中和164→160清6力/PLOW并眩晕，末T6一拳168→159清8力/取消28攻。末T8昏眩1只打精密瞄准16后余1能，四张BlockedByHook，17血0挡受17亡；没有防御/药，不报未打防御bug。末T6Jev0.94结束放弃题面零损打击+侧步线7伤/后轮能量，但整场候选1200样本均0赢、完整替线未打，不声称补打能胜。
另保留普通生存者无绷带弃牌消费旧bug silent-0268（首证53FLQ68CETW0）：PD9末模型−1，真实弃一张后32挡对47需损15、余血算术−12。代码交已有独立修复链，不重复建bug编号、不当真实额外损11或修后必胜。缺dirty源码/前五试完整末结算/替代胜线，保持现有护栏、药水、SL必死规则；只实施缺失追踪覆盖。

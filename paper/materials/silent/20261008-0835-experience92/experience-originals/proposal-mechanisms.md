# 静默猎手第92批：现场力敏、逐牌/逐击收益和实际能力结算覆盖核验

账本：silent-0005,silent-0006,silent-0011,silent-0016,silent-0023,silent-0024,silent-0027,silent-0049,silent-0083,silent-0094,silent-0133,silent-0222,silent-0253,silent-0276,silent-0282
经验：silent-footwork-block,silent-gorget-plating,silent-strength-weak-observation,silent-noxious-fumes-growth,silent-accelerant-triggers,silent-afterimage-per-card-block,silent-vajra-opening-strength,silent-wither-end-turn-loss,silent-devoted-sculptor-ritual-growth,silent-rolling-boulder-start-growth,silent-ceremonial-beast-threshold-growth-sl,silent-ceremonial-beast-ringing-one-card,silent-speed-potion-temporary-dexterity,silent-dexterity-potion-card-block,silent-liquid-bronze-per-hit-thorns

角色silent；机制按对应条目本角色历史进阶核，策略只实施已观察A10，其他角色/未观察组合保持等价。
来源experience-update/20261008-075539-experience-update，版本2026-10-08.9、第92批；实现任务strategy-proposal，授权Roy-2026-10-07-learning。本任务只更新经验，不改打法源码。
证据：PD9AYQVMLQW6 A10 F49败，UTC 2026-10-07T22:20:03.359Z—23:10:58.949Z；L2TSFU62Z57Z A10 F17败，UTC 23:15:51.935Z—23:39:42.212Z。前者1017决策/1125状态/55实际Codex脑，后者442/447/17；DeepSeek均0，完整dirty源码未记录，不以当前live源码冒认原运行树。
全史122静默完局，旧120局七数组/血档/源节点转移/回血/SL重新核；依据runs.character和states.run.character_id隔离，不用其他角色、未完局或截止点后数据。
拟合/样本/切分：本次不拟合出牌值、药水价、SL、终局权重或HP阈值。截止点前历史用于诊断和固定夹具；后续新的静默局留出验证。同局SL不拆独立训练/验证，相关性不作因果。支持/反例完整run id及进阶见mechanism-evidence.json；原始逐动作前后帧见historical-power-deltas.json/historical-potions.json/facts.json及各局states.jsonl。
验证与回退：实施前核当前live各入口；已有等价用实际live祖先源码commit记duplicate，不因经验文字变化猜测bug。缺覆盖独立实现，固定正反例、原沙箱tsc/vitest通过后合入并双通知Roy。单独逆向撤实际实现净补丁，保留刷新/并行记录/账本，不把经验数据提交称代码implemented或shipped。
旧行为：代码可能已有等价机制，须查当前入口，不能把新条目视为新bug。原样持有能力、未来滚石或药水能力不当已兑现收益。
拟议行为：逐入口对照实际力每段/敏每牌，被动余像/覆甲与牌挡分源；换战能力重建。PD9 F49末T10四敏令防御9/生存者12，余像3及翻滚带8合32；生存者弃一张凋萎后持牌伤24，再23攻需损15、3血死亡，严格存活差13。F49T9滚石45+毒7使308→256；显示50但死亡前未再触发，不预支50。F48触媒+2/毒雾+3已建、F49末未建，不延续前战毒触发。
机制证据：PD9 F35T3—6仪式9使力量6/15/24/33，弱后15/22/29/36；T7尖啸42→36暂减，次轮恢复再长51，T8仅已有毒结束，57→10胜。L2 F14敏捷+2令斗篷8/生存者10/防御7，铜液3荆棘实反3+9+3=15且全挡三击亦反，胜仍耗20；F6T2速度+5后防御10抵9，下轮清临敏。L2 F17金刚杵1力令升级匕首雨两段各7，不变成格挡。
完整历史：铜液17局21饮均+3且敌HP当步不变；敏捷46局68饮+2，速度37局46饮+5；能力逐动作全史重新核，动作数不当条目支持局数。限制：力量对滚石、覆甲完整减层、药水时点整战因果及未见组合不补推。
拟议规则保持现有喝药/留药阈值；只核事实覆盖和终局未兑现能力输入，不设先能力/固定药水最佳时点。预期减少错误预支，不承诺胜率或修后本局能赢。

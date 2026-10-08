# 静默猎手第92批：首boss胜后的血药接续与真实路线/休息资源核算

账本：silent-0019,silent-0020,silent-0021,silent-0090,silent-0228,silent-0239,silent-0243
经验：silent-route-hp-observation,silent-rest-buffer-observation,silent-act-transition-missing-hp-heal,silent-aeonglass-artifact-growth-sl,silent-queen-poison-main-target,silent-deck-burst-observation

角色silent；机制按对应条目本角色历史进阶核，策略只实施已观察A10，其他角色/未观察组合保持等价。
来源experience-update/20261008-075539-experience-update，版本2026-10-08.9、第92批；实现任务strategy-proposal，授权Roy-2026-10-07-learning。本任务只更新经验，不改打法源码。
证据：PD9AYQVMLQW6 A10 F49败，UTC 2026-10-07T22:20:03.359Z—23:10:58.949Z；L2TSFU62Z57Z A10 F17败，UTC 23:15:51.935Z—23:39:42.212Z。前者1017决策/1125状态/55实际Codex脑，后者442/447/17；DeepSeek均0，完整dirty源码未记录，不以当前live源码冒认原运行树。
全史122静默完局，旧120局七数组/血档/源节点转移/回血/SL重新核；依据runs.character和states.run.character_id隔离，不用其他角色、未完局或截止点后数据。
拟合/样本/切分：本次不拟合出牌值、药水价、SL、终局权重或HP阈值。截止点前历史用于诊断和固定夹具；后续新的静默局留出验证。同局SL不拆独立训练/验证，相关性不作因果。支持/反例完整run id及进阶见mechanism-evidence.json；原始逐动作前后帧见historical-power-deltas.json/historical-potions.json/facts.json及各局states.jsonl。
验证与回退：实施前核当前live各入口；已有等价用实际live祖先源码commit记duplicate，不因经验文字变化猜测bug。缺覆盖独立实现，固定正反例、原沙箱tsc/vitest通过后合入并双通知Roy。单独逆向撤实际实现净补丁，保留刷新/并行记录/账本，不把经验数据提交称代码implemented或shipped。
旧行为：复盘已证明Codex知道连续boss，不能新报幕末误判bug；double-boss.json仍独立四局拟合、连续模拟未校准，本批不重拟参数。
拟议行为：保留首boss胜后同样本实际HP/药水/复活作为第二boss入口，明确跨幕回血与同幕两boss接续。实际路线节点与计划文字分别保存；未来营火/商店/能力不能当当前已得血药。
证据：PD9 F35净耗47，F37两药守住10，F39到9，F40/42/47各回21，F48以58赢但耗48、剩10空槽；F49六试均原样10空槽、无跨幕回复，末剩244/535死。F48T6聚合体16×3对18挡实耗30；首战能力齐不是续战资源齐。真正跨幕异鱼15→59补44、恶魔5→57补52，分别缺血×80%下取整。
L2 F13/16两火回42、F15事件回20，F14赢战44→24耗20且两药饮尽，boss65/70、能力0/无毒源，六试均败；阈值清8力仍8轮仅扣149，余113。F8改避第一精英后后续精英强制，F11避免文字不是无精英实线；未来步法/毒雾计划未取得，不预支成长。
全史分阶血档、REST/SHOP/EVENT源节点后战死亡率及实回血去重表仅观察：源血、房型、构筑与用药不控，不拟路线/回血对锻造因果阈值。反例/缺数据：替路线、提前用药、首战少损血的整场胜局未执行；原时钟未校准。保留现有行为，只补追踪或已核结构差异，现有等价则复用，不人工改四局数据模型。

# D1：双 Boss 后场路线血量保持未知（已有实现的独立核证）

角色 silent；实际观察 A10；来源任务 ascension-audit；实现任务 strategy-proposal；领域 structure。账本 silent-0163，保留其历史 kind/status/首次局号，不新建 bug-infra。

独立重新核证：25226ZFLNR1J F35 的 brain.jsonl L6149、offset 195801544，旧题面把 F48、F49 均列为 22/64（p75 20）。JMH5C51RLN4E F44 的 brain.jsonl L6246、offset 199438941 把两场均列为 60/60。后者实际 F48 第5次 T13 后 states.jsonl L243532 为 REWARD、8/60，L243533 为 MAP、8/60，L243534 为 F49 T1、8/60；入口 F48 states L243459 为60/60。不是60血进第二场。

旧规则：未建模 Boss 被当作零损血，数值沿用到下一场。所需行为：第一场之后的路线血量为未知；实际已结束战斗的余量可以作为下一场实测入口，不从这两局拟合固定 Boss 损失。

本次只读 live b0f41f039b136e69485027ecbf9042c23170b4ab 已符合此行为：agent/src/sim/route-projection.ts:188 的 hpAfterRoom 对 Boss 返回 null；agent/src/sim/route-map.ts:340 把 null 展示为未知。实际源码提交 3fe6251b746cebe816b9db3c0d8aa9d6090bec0a 是 live 祖先。提案登记 implemented，供后续任务判 duplicate；本任务不实现或发布，也不重标 shipped。

反例/范围：A9 G403VCZ3BH1B F48 胜利后即实际 GAME_OVER，不能把本角色所有等级都改成第二战。A10 未到F49的8局不能核证各自后场真实耗血；到F49的2局都败，F49胜利后结构仍未知。

拟合与时间切分：不拟合数值；最早25226/JMH为历史错误与实际损血证据，较晚9TG为资源连续性的复核。SL只列尝试，不增独立局数。当前源码晚于全部来源局，不能声称样本验证了上线后效果。

验证/影响：后续只需核现有 null 传播和展示的固定证据测试，避免恢复确定的后场HP。没有实际通关提升估计。缺失：后场Boss损血模型、完整两战胜局、各遗物回血反例。回退：不撤既有0163修复；若展示改动失败，可只撤新增展示，继续保留未知。授权 Roy-2026-10-07-learning 只用于提案链，不作为规则证据。

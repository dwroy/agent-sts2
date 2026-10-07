# silent / AEONGLASS B4 候选：20261007-153133-fix-batch

账本 silent-0236（根目录 CLI proposed）。既有 silent-0024 的凋萎经验/shipped 保持。本提案只补整场模拟遗漏，授权 Roy 2026-10-07 12:11/12:35，不把授权当游戏证据。

本角色 tune 原始日志：LRN0HPZ0FZS1 F48 T3→4/T6→7，力量0→3→7，凋萎持牌伤3→6→9；25226ZFLNR1J A10 F48末次T3→4/T6→7，力量0→4→9，已有凋萎统一升级且分别新增2张。全部边界的 states byte off/len/SHA256、原文和手/抽/弃/消耗堆在 tune-buff-boundary-evidence.json；tune-mechanism-summary.json 保留差额。先前 compact pile 审计错误地读取 card_id 而不是 card_ids，又忽略分组倍数；错误初稿保留，结论只依据原帧边界。

旧行为：固定 m.strength 的每次增益，statusCards 混合池每次1张，WITHER 模型持牌伤保持初值；后续生成牌仍以3伤计。候选：fullFight 模拟专用 fullFightAeonglass 字段；按已观察进阶0/1/5/6/7/10分支，力量首次3（A10为4）后逐次+1、凋萎每次+3、每次加入1（A10为2）张弃牌。按实际起始回合初始化已经完成的三回合周期，后续出牌触发生成的凋萎亦用当前伤害。未知进阶、IRONCLAD、其他boss保持等价。没有试验策略/伤害权重/药水/SL/终局规则，无参数来自val。

代码只改 agent/src/reflex/rollout.ts 和 rollout-live.ts；新增固定机制/角色边界/五回合隔离测试。字段的每个读取仅在 fullFight 条件、fullFightState 或其专用 nextAttacks；builder只附元信息，solver输入原样。基准固定 runner 的逐字节隔离将另行验收。

冻结数据178场实际结局，tune107/val71（新18场只入val）；cutoff 2026-10-06T02:46:11.648000 UTC。200样本、原始行seed=1+index*101、t1/pre；两侧整体模型只拟合tune。SL predicted_death截尾不标真实败局，当前结局条件下校准不等于初试/整局通关率。固定数据来源与结果保留，缺指标自然拒绝。

撤候选源码原始红、恢复绿和首稿失败留档。通过原 sandbox 才提交候选；再用 dispatch_base 的 acceptance.py 固定门槛，不改验收器。达标才合live；否则保留候选与根账本 rejected。回退只撤本候选两项源码，既有模型/经验/保护源码/其他角色保持。

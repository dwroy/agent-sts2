# 本批策略实现报告（收尾前草稿）

本批只承接已派10个原提案，普通队列身份已核；三局均SILENT/A10，原10提案SHA均相符。main合并返回Already up to date，基线e16f507d706cf7abbcd664a64609fe578684e329。

新增资源事实消费者代码及固定回归已完成，账本silent-0421为proposed；尚未提交或合入，不能视为上线。等待原沙箱入口单worker重跑。首跑tsc通过，vitest因导入扫描遇已删除临时目录失败：317文件/3141用例通过、1失败，退出1。该失败、初版夹具失败、撤源码5失败/1通过与恢复6通过的日志均保留。gitleaks staged退出0。

新增范围：静默A10的RunJournal，以实际相邻HP增加分列休息点、战斗开场、跨层/跨幕边界、回合回退及未隔离来源，进入既有history/this_floor。路线未来HP不作已得资源；缺HP断链；重复/过期帧不重复增加；SL snapshot/restore不把恢复当新回血。没有调整路线、营火、护栏、药水、SL、终局阈值，也不补80%回血机制。其他角色/未观察进阶不新增字段。

证据与产物：source-index.json记录根logs直接读取的偏移/字节/SHA；三局1521帧、1456决策、14条SL记录。79个测试帧投影全部通过原字段与SHA核对。observed-hp-boundaries.json按实际观察边界列MTQ0=休息57/开场14/跨层40/回合回退27，7X0=61/0/33/0，KFR=126/20/38/145；并不声明完整回血因果账。

现有实现复核：在线hp_guard/selection_audit/SL资源比较、离线执行工具、恶魔奇巧名额与毒药6层已有实际live祖先。6f3f783941270ac182237c46068097ff67e85907（原ac631877279c43842346ea921d996554e0252709）和8bb53d6342b7e9a2adf96de231b53c36eaa943de（原8043b289e8065a31799cfd1d331e0c6c933bc1d6）祖先核实为true；毒药夹具16原帧偏移/字节/SHA核对全等。

本次重新执行离线CLI：MTQ0 68、7X0 119、KFR 180，共367段；候选文字歧义6/10/2共18段仍留空可比标记。MTQ0 F11先弃RICOCHET再重问，KFR F12生成小刀后重问；KFR F33T6使用实际SL replacement而非旧journal。完整候选实测结果均null，不把预测best当实盘最优。mechanism-observation-pairs.json另保存89组本角色动作后的相邻观察，明确下一帧未必为动作全部结算，不填整战反事实。

逐项证据/账本/反例/预期行为/验证与回退见proposal.md全部10节；最终处置、提交、live预检和测试总数将在收尾时追加，当前不登记implemented/duplicate/shipped。

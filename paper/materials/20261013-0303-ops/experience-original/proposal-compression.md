# 静默经验增量的独立实现提案

压短独立单局观察的消费者等价读回；保留原数值、角色/进阶、反例和未知范围，已有未完成宽提案继续保留。

来源任务：experience-update；实现任务：strategy-proposal；授权Roy-2026-10-07-learning。只用静默已观察场景，机制范围与策略/统计范围分别沿条目asc；其他角色和未观察机制保持原行为。

旧规则/新行为：本批只改知识文字。实现任务先核实际live祖先源码和既有提案，已有等价实现以真实commit注明；确有已核缺口才限定实现。旧士兵模型无普通防御时不识别一次翻倍，敏捷只识别0/3，首牌后预览须消费；旧SL可分算盾伤/毒不足而不合计。原HP护栏/药价/SL参数与排序保持，无受控整场数据不拟新阈值。

证据：G4PQBCJQ7NP0 A10 F33首T5斗篷12+触不可及6，第三T5先步法后斗篷16；T6可22挡但沙坑1。XRCP2TKYKQBA A10 F14T3候选4损/实际7，F17首/第五T5同指纹多损6少净扣9；首T13盾上界6+毒7对敌12未执行、末69血11毒净扣17仍败。F15T6毒胜紧缠9实41→32。原日志/历史支持和反例按proof.json、history-checks.json、historical-source-verification.json追溯。

本组沿原单局证据，不新增支持或游戏公式；逐项完整旧新文字在changes.json。

样本/拟合：仅实际逐帧和同盘条件比较，无训练、阈值拟合或模型强度调整；旧全历史专题冻结输入不重跑，相关局数不相加。五轮0/24胜与受时限截断整场2%/0%分列。同抽前缀不等后序/药时一致。

限制：dirty完整运行树、未执行替线/未走路线、首试盾毒胜局、内部紧缠结算及保护/复活交互均未记录；不将支持主题分母当每个子式或单因胜率。

验证：固定原始帧及角色/进阶边界，沿原沙箱全套；对新增消费者做撤接线失败/恢复通过，生产读回与真实采用分开，禁止play/在线脑题。预期只修资源分源及确定错误，不申报通关提升。回退：仅逆实际实现源增量或本批experience.json，保留后续刷新/并行记录。

条目/账本：
- silent-paper-krane-weak-multihit → silent-0070；asc=[0, 20]；证据=ZZMYZ5UBCG72；反例=
- silent-ghost-seed-starter-ethereal → silent-0124,silent-0126；asc=[0, 20]；证据=Z6CFLDR3N4SB；反例=
- silent-diamond-diadem-opening-retention → silent-0131；asc=[0, 20]；证据=VLV17NUSFS61；反例=
- silent-fiddle-draw-lock → silent-0156,silent-0157；asc=[0, 20]；证据=25226ZFLNR1J；反例=
- silent-juggernaut-block-gain-triggers → silent-0165；asc=[0, 20]；证据=JMH5C51RLN4E；反例=
- silent-bing-bong-tooth-five-rings → silent-0187,silent-0188；asc=[0, 20]；证据=PU80F84P6HPN；反例=
- silent-panic-button-card-block-lock → silent-0210,silent-0212；asc=[0, 20]；证据=WYB0NCD6W83J；反例=
- silent-unmovable-first-card-block → silent-0321；asc=[0, 20]；证据=P2M3DFJ4DEZ3；反例=

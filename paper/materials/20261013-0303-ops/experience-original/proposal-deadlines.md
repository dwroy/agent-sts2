# 静默经验增量的独立实现提案

核沙坑/攻击双截止、结束被动与毒共同清场上界，以及紧缠在毒胜窗口的实血价；首试未执行不记已胜、末试不一律放行。

来源任务：experience-update；实现任务：strategy-proposal；授权Roy-2026-10-07-learning。只用静默已观察场景，机制范围与策略/统计范围分别沿条目asc；其他角色和未观察机制保持原行为。

旧规则/新行为：本批只改知识文字。实现任务先核实际live祖先源码和既有提案，已有等价实现以真实commit注明；确有已核缺口才限定实现。旧士兵模型无普通防御时不识别一次翻倍，敏捷只识别0/3，首牌后预览须消费；旧SL可分算盾伤/毒不足而不合计。原HP护栏/药价/SL参数与排序保持，无受控整场数据不拟新阈值。

证据：G4PQBCJQ7NP0 A10 F33首T5斗篷12+触不可及6，第三T5先步法后斗篷16；T6可22挡但沙坑1。XRCP2TKYKQBA A10 F14T3候选4损/实际7，F17首/第五T5同指纹多损6少净扣9；首T13盾上界6+毒7对敌12未执行、末69血11毒净扣17仍败。F15T6毒胜紧缠9实41→32。原日志/历史支持和反例按proof.json、history-checks.json、historical-source-verification.json追溯。

样本/拟合：仅实际逐帧和同盘条件比较，无训练、阈值拟合或模型强度调整；旧全历史专题冻结输入不重跑，相关局数不相加。五轮0/24胜与受时限截断整场2%/0%分列。同抽前缀不等后序/药时一致。

限制：dirty完整运行树、未执行替线/未走路线、首试盾毒胜局、内部紧缠结算及保护/复活交互均未记录；不将支持主题分母当每个子式或单因胜率。

验证：固定原始帧及角色/进阶边界，沿原沙箱全套；对新增消费者做撤接线失败/恢复通过，生产读回与真实采用分开，禁止play/在线脑题。预期只修资源分源及确定错误，不申报通关提升。回退：仅逆实际实现源增量或本批experience.json，保留后续刷新/并行记录。

条目/账本：
- silent-insatiable-dual-clock → silent-0018,silent-0079,silent-0117；asc=[0, 20]；证据=C48LLXBGKXQ9,R0HEV5E3QT6G,XYYQYBRM2A01,ZZMYZ5UBCG72,ENKYQMS9W4ZD,2SU6XN2AEJRD,2PVLGRBGUX9S,4ANT8D00TP72,XBD8Z9XLPCPN,HUVEPWQAHWFU,HSX4HYATB4E2,MCT1GPTL8D35,8JRE1C4H4Z2W,YF0LXT1QSTGG,WQZVENQ7DTRP,H1T1F8ML9FUE,Y5H4CFAQ2WTG,SY0WMJNNVRLM,4XLZURXMD872,CNKR125PFHJ5,R3AJCGQGGMR4,Z91JN3S3PQX2,HNX4A2WBC34W,8HW407EAUYL7,SPC7NVA5K4RL,H9ERYJLBL4UC,C7GNN3DDFUFY,47731LKMZRBJ,G4PQBCJQ7NP0；反例=
- silent-kin-poison-sl-observation → silent-0079,silent-0012；asc=[10, 20]；证据=Y6GM2CHWJBEY,4D4J8USKCPAV,TCFAHJ9K19VY,S9UZAK0JP0C0,ZVYUL2YP3518,BTSRF7JL1W1Y,ZTRGYYMLR8SC,UZ1T7AH49WMB,R3AJCGQGGMR4,LY83ZMTFVKJH,AF76L5UTPP8U,WN0HA1L6MJ99,0B2567HG3T4D,F1TP5W6GF56Q,DW8M3G2PV3N7,VT2F13ADA3M3,3R3LY2HVPPG0,XRCP2TKYKQBA；反例=
- silent-louse-progenitor-strength-growth → silent-0316,silent-0079；asc=[0, 20]；证据=T082DRCUHRRD,ZZMYZ5UBCG72,2SU6XN2AEJRD,3KME36ADUE4U,VLV17NUSFS61,LLYSRQQ35AVW,JLN5SK17W4FQ,9TG1RP5LFAAK,XBD8Z9XLPCPN,ZVYUL2YP3518,HUVEPWQAHWFU,YLYLZWHA0GKU,KFRDELW2TH2P,PD9AYQVMLQW6,K2JAGKVJAWZJ,NEWRFAYKTQHR,T0DGVABPV60U,Y5H4CFAQ2WTG,4XLZURXMD872,CNKR125PFHJ5,R3AJCGQGGMR4,LY83ZMTFVKJH,456MRNGCPD8E,0DTPVHFXJ319,DW8M3G2PV3N7,G4PQBCJQ7NP0；反例=
- silent-constrict-poison-victory-blood-price → silent-0441；asc=[0, 20]；证据=XRCP2TKYKQBA；反例=

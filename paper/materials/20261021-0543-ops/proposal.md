# 本批十项策略提案与实现记录

批次：20261021-051301-s2-strategy-proposal；角色：silent；基线：2ddf207c0fbdbde86df343661e88c8a42bdcb6c5。
本批为普通已领取队列，无research_request/implementation_request。只处理dispatch.json所列十id；不扩展其他角色、其他局或手动专题。全部原文逐字指纹见proposal-originals-manifest.json，原件另存各id.original.md。

## 有证据的窄实现：士兵翻倍预览与熔炉升级

归属原CLI提案silent-proposal-7a8e9ccb7e646538；既有账本silent-0180、相关血价silent-0079；本次当前模型缺口登记silent-0546（proposed，learner:strategy-proposal）。授权Roy-2026-10-07-learning。
证据仅9Z9H2EXKLF3T A10 F48 T10：完整Jev原行29984、精确decision_id 96daa796-8173-4db1-b222-c81d696622cc、decisions281568—281573、states287999—288006。题面plan1为偏折+→熔炉→打击+→偏折+→防御+，预测50挡、损2；Jev选plan1，实际第一张后生产重规划为least-loss喝药，再执行同剩余出牌，18+9+10=37挡，两张12凋萎与28攻后18→3。完整题面不等于原整线无重算执行。
旧行为：仅识别0/3敏普通防御的士兵翻倍预览，当前生产固定回放仍算50，熔炉差值按普通尺度+3。新行为：仅Silent A10 F48单一AEONGLASS、2敏、未消费士兵、无额外修饰、未附魔DEFLECT+/DEFLECT/DEFEND三张实际翻倍面值组合，消费一次翻倍，并使升级增量留在该预览尺度。首张后真实重规划帧不再触发该识别，恢复普通升级增量。
参数与分母：不拟合权重/时机/胜率；独立局n=1，本局与同盘重打不增加分母。回归是同一原局的修复验收，不是独立留出收益验证。原源码dirty不能重建，本次只主张当前基线可复现；其他角色、进阶、敌人、额外增益、附魔与未见牌组组合保持旧路径。
反例与限制：该轮仍损15，最终败局；修复不证明能通关。第一帧离线重建缺完整跨轮出牌计数，原帧逐轮最大值合40与首牌即新增凋萎不能完整解释，保留incomplete-fight-counter-history.json，不补猜计数、不宣称首帧整轮HP已全部校准。首张后原帧已有两凋萎，回放额外19挡、损15/余3符合实盘。原题其他预测误差和SL排序不随本补丁关闭。
验证：固定原始状态与同次药水前后已观察升级差值；不读刷新的知识JSON，不调用模型/网络。原基线回放50≠37，局部修正后两文件10项通过；规定沙箱套件8败；撤源码同8败，新回归撤源2败/恢复10过，完整结果见report.md。回退：仅撤本次独立源码提交，保留全部原始证据、旧提案与并行知识刷新。
预期影响：减少这个已观察组合的格挡高估；仍由Jev从完整候选中选择，不删选项、不增加固定喝药/留药、SL或终局阈值。自然下一局消费与收益尚未知。

## 十项处置（宽父项不按局部修复关闭）

### silent-proposal-03754e1265894000

牌挡敏捷/脆弱/柔嫩逐张核；折扇被动挡、触发时点与持有能力分源
账本：silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253。原证据局：RC61MFQM63Y6。
RC F23逐牌/临时敏捷/折扇窗口已重核；八组件原其他窗口及联合生产回放未齐，不能以本批局部窗口关闭整项。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-ab055ef7dfbb44e5

验证夜魇收益的存活兑现条件，并只建模本局已观察的幽灵一层无实体；延后饮用整场效果不足，保留旧时点与药价规则。
账本：silent-0140,silent-0069,silent-0005,silent-0206。原证据局：XTSV1U9JD34T。
幽灵本轮效果已有live祖先96f17377a331e50ea5b6a3fe8d2b605932ed1bd4；夜魇未兑现不等于禁用有收益，仍缺其他复制对象和延后饮用的同条件完整后继。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-0129c465c6f5bd79

强制弃牌后候选重核、毒胜保血候选及夜魇/接管首轮兑现边界
账本：silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271。原证据局：BTSRF7JL1W1Y,XTSV1U9JD34T。
普通单弃已有live祖先bf423c173d3be348a4ad714e1d26516df619ff41，毒胜保血已有222445a9bb6bf56cb4f3ceea2cc8b20fba54128f；抽弃绑定、接管首轮及复制后继未联合核验。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-abe9d5d0be109a9f

赢战血价、真实回复与存档恢复接续，连王剩血按实到资源
账本：silent-0019,silent-0020。原证据局：BTSRF7JL1W1Y,XTSV1U9JD34T。
本批重核X F48T8 32→23无恢复进入F49；缺原115局全资源消费者校准和同条件改线/休息/耗药对照，不能拟合阈值。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-f16527e59b5cc1e0

敏捷/脆弱/覆甲分源、毒与临时减力时点及留挡上限按实帧核
账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241。原证据局：BTSRF7JL1W1Y,XTSV1U9JD34T。
B F31减力/格挡/强制弃牌和X幽灵窗口已核；全部期限、多增益及留挡跨轮生产联合回放仍不完整。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-7a8e9ccb7e646538

毒/倍率挡/持牌伤及荆棘按实结算，SL换线预测与整轮实差分账
账本：silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221。原证据局：9Z9H2EXKLF3T。
T10士兵/熔炉子项已在当前生产输入复现50挡对实37挡并完成窄修正，规定沙箱套件8败，提交/live受阻；其余毒/倍率/持牌伤/荆棘/SL子项和原dirty输入仍未全部验证，宽提案保持waiting。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-cd9f76184de6e29a

跨幕缺血80%回复与营火/胜战消耗/SL资源接续按实到节点分账
账本：silent-0019,silent-0020,silent-0243。原证据局：HMVJKM56S4Q8,F4QKG4J1AJJZ,G403VCZ3BH1B,25226ZFLNR1J,JLN5SK17W4FQ,JMH5C51RLN4E,9TG1RP5LFAAK,JQPT83P8KDSZ,S9UZAK0JP0C0,9Z9H2EXKLF3T。
十局16对跨幕端点重核均符合原A9/A10观察；原请求另含3个非本批支持局及116局资源模型联合校准，本批没有同条件路线收益干预。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-292f6731bdb9b669

核对静默A10头骨组合毒药水实加7毒与现有窄范围上下文，未知持有价不当已校准零值，不拟合早喝规则
账本：silent-0087,silent-0020。原证据局：7X0W3U8TVA2A。
支持局7X0W3U8TVA2A不在本批冻结输入；本批其他毒窗口不能代证头骨组合总7毒或早用/持有价值。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-0802f69b28d25079

静默A10同盘SL少一防御以8血换6即时伤；固定核对速度药/毒素/资源链，验证饱和探索血价并保留缺反事实限制
账本：silent-0079,silent-0019,silent-0044,silent-0080,silent-0253,silent-0011,silent-0214,silent-0189,silent-0046,silent-0222,silent-0243,silent-0262。原证据局：MTQ0EUBJ3R6T。
支持局MTQ0EUBJ3R6T不在本批；四次SL固定输入及独立时间留出验证未补齐，不能用本批其他SL拟合即时血价。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。

### silent-proposal-763a4b9d9f17b815

逐牌敏捷、临时减力、持牌伤和已建立能力的时间边界
账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0044,silent-0046,silent-0053,silent-0080,silent-0087,silent-0189,silent-0214,silent-0222,silent-0235,silent-0253。原证据局：7X0W3U8TVA2A,MTQ0EUBJ3R6T。
两支持局7X0W3U8TVA2A、MTQ0EUBJ3R6T均不在本批；十四组件及昏眩合法窗口无本批精确支持，不能跨局代证。
完整适用范围、反例、预期行为、验证与回退保留于对应.original.md；本批范围及缺口见report.md。


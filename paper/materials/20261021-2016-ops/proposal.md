# 本批策略提案与逐项处置

角色 silent；任务 strategy-proposal；batch=20261021-194314-s2-strategy-proposal。
基线 191aefc652cd5a8304c1bc7b762f0fd9b0d02639；2026-10-21 20:05 CST 形成候选。本批不是专题或冻结实现请求，派发身份和十个领取 ID 见 dispatch.json。git merge --no-edit main 返回 Already up to date。

## 已实现候选：普通生存者面对同值凋萎的数值等价弃牌

原提案 silent-proposal-d7b8d36cf3d0303d，账本 silent-0268；不新建同根因 bug 或重复提案 ID。来源 postmortem/20261008-071302-postmortem，实施任务为本批。授权 Roy-2026-10-07-learning。

本角色 A10 实盘 PD9AYQVMLQW6 F49 第6试 T10，原始 decisions 284707—284711、states 291337—291342；Jev 完整选牌题位于 jev-prompts 30763，decision_id=fd42646b-b019-49b4-a278-3b901c8a58f9。只按显式 run_id 和精确 decision_id 关联，完整原行 offset/bytes/SHA、冻结 source_size 和身份来源保存在 evidence/、v6-evidence/ 及 question-284710.json。

实况：开场3HP/8挡、两张各12伤凋萎；防御新增一凋萎，格挡18；打击后19挡/敌250；生存者后选牌界面31挡/三张同值凋萎；任意一张均为12伤，选 card0 后32挡/两张。23攻击加24持牌伤需损15，算术余血−12，实际扣3死亡；敌毒6先结250→244。不是修后可胜。

旧行为：普通生存者已能单弃唯一余牌；多选择时保留待选边界并完整保留所有已知持牌惩罚。当前 HEAD 的 replayRun 恢复本局全部此前状态/接受决策后，35累计出牌，防御跨36门槛新增凋萎；完整三牌线报36持牌伤、当己方回合损4而死、敌250，仍未覆盖这次等价弃牌。

新行为仅限：silent A10、未升级普通生存者、单次手动出牌、无绷带分支；余像1、无未知抽牌、剩余已知非药水牌恰为2或3张 WITHER/Status，均12点持牌伤且无HP流失/虚无，新生成凋萎伤害也已知12。移除一个数值代表以算持牌伤，仍标“弃牌选择未确定”、保持 pendingSelection、不填写实际所弃实体 ID、不让后继药水或出牌跨过真实选择界面。真实选择仍由原 Jev/执行流程负责，全部选项保留。

拟合：无新参数、无阈值拟合；12、数量、余像等均来自同一局的限定窗口，其他值/混合牌/未知抽牌/自动重放/升级/其他角色或进阶保持旧分支。1局发现与固定验证，不将六次SL当六独立样本；无独立时间留出或自然收益。

固定消费者验证：新 tests/silent-survivor-wither.test.ts 用五份原始固定帧与冻结的 replayRun 历史计数；不依赖刷新的知识 JSON，不调用 LLM/网络。观察三牌线与只打生存者两入口，校验新增凋萎、余像32挡、24持牌伤、毒6/23攻击顺序、仍死亡，以及未知选择后的执行边界。反例覆盖非凋萎/不同伤害/未知抽牌/新凋萎数值不符/无余像与角色等级边界，旧测试继续覆盖原单余牌实现。

撤掉两个生产源码补丁时14项中3失败（两个现场数值断言及A10能力标志）；恢复后14/14通过，见 targeted-receipts.json 与原日志。首次测试默认Vite配置加载器因共享 node_modules 只读而 EROFS，保留 targeted-after.log；随后只加 --configLoader runner，同一原配置和套件通过，不修改工具/配置/依赖。首次诊断误以无可打牌时总会调用 solver 而退出，保留 replay-initial-failed.log；更正诊断保留该真实消费者边界，不将它报成游戏bug。

预期影响：当前已知同值弃牌参考不再提前截断为“持牌先致死”，让后续毒和攻击参与真实代价。会改变本角色限定局面的参考数值与可能的选择；其他角色等价。未证胜率改善，不改护栏8/24/0、SL准入、药水持有价或全败排序。回退仅反向撤实际源码提交，保留证据/账本/刷新数据和其他并行记录。

## 其余原提案的本批核验与待证范围

所有原文逐字副本及SHA见 proposal-source-refs.json；四份exp原路径不存在，已从保留的record-staging原件按队列SHA核回，不把路径消失当证据丢失。其余项目不新增源码或玩法规则，保留 waiting。完整题面覆盖清单在 report.md/coverage.json。

### silent-proposal-b13fda1dfeb37927

原账本：silent-0019, silent-0020, silent-0079, silent-0243；原来源局：GXNKW8X1XYJP。

GXNKW8X1XYJP F45 T2第2/4试同入口，实际后续T3为3HP/0带挡/敌218，对13HP/7带挡/敌226；两线均败。已核局部10血/8敌血取舍，但缺复活逐击、前三试真实离场与替路线/提前用药整场后继；不改权重。

### silent-proposal-c873d6543c414f92

原账本：silent-0125, silent-0005, silent-0044, silent-0253；原来源局：L2TSFU62Z57Z。

L2TSFU62Z57Z F17第2/3试T2完整题面与状态核明护栏实际执行/被SL撤回。现有源码有候选快照和单动作回执，仍缺跨重问父子、整轮实际资源归属的联合消费验收；不把单动作completed当整线执行。

### silent-proposal-dfbf51502f30c9b1

原账本：silent-0021, silent-0133, silent-0222, silent-0049, silent-0020；原来源局：L2TSFU62Z57Z。

L2TSFU62Z57Z F17末试T6完整原题：7伤打击/侧步含未建模侧步，五轮14/24死而结束11/24死，整场各1200样本均0胜并列。末T8昏眩限一牌、17HP对17攻击实死；缺同抽序完整替线/侧步兑现，不增加固定攻击优先级。

### silent-proposal-c2888032d1337388

原账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0023, silent-0024, silent-0027, silent-0049, silent-0083, silent-0094, silent-0133, silent-0222, silent-0253, silent-0276, silent-0282；原来源局：2L1BNN9ZJEFU, 2PVLGRBGUX9S, 2SU6XN2AEJRD, 5X2GHKJ89PN1, 61E2QS63Y9WU, 9TG1RP5LFAAK, DPYF2BAA3DKT, G33HU22H2543, GXNKW8X1XYJP, K3676LU8B0UH, L2TSFU62Z57Z, LLYSRQQ35AVW, PD9AYQVMLQW6, QNTW139MGECA, TDLBRNA0R05B, UACFSW4VDDLD, UMVLWER4CD98, YF0LXT1QSTGG。

原提案18个来源局与本批实际交集为10局（不是旧waiting摘要所称7局）；另8局不在派发范围。15个机制未完成全部入口、组合和当前消费者联合校准，本次只能支持0268窄修复，不能整项implemented或duplicate。

### silent-proposal-042ee2299084b528

原账本：silent-0019, silent-0020, silent-0021, silent-0090, silent-0228, silent-0239, silent-0243；原来源局：L2TSFU62Z57Z, PD9AYQVMLQW6。

PD9AYQVMLQW6 F48胜后REWARD/MAP保留10HP/空药槽，F49首帧同10HP/空药槽已原帧核实；同样本续战资源传递已有源码，但奖励、次战、路线和休息消费者尚缺全链校准及未选整场后继。

### silent-proposal-8cd3db3bad5f34f1

原账本：silent-0021, silent-0133, silent-0222, silent-0228, silent-0239；原来源局：L2TSFU62Z57Z, PD9AYQVMLQW6。

L2TSFU62Z57Z F17T2护栏与SL顺序及末T6全败并列已核；原线/替线缺同入口、同预算、同抽序完整整战后继，跨重问追踪消费者未联合验收，局部省血不支持改SL边界。

### silent-proposal-43fe170707574455

原账本：silent-0021, silent-0012, silent-0046；原来源局：ZTRGYYMLR8SC。

原证据局ZTRGYYMLR8SC不在本批十局，未读取该局原日志。敌实例稳定身份、精确退场和计划兑现全链未在本批核验，保留等待对应证据派发。

### silent-proposal-3f5a665dca133a8c

原账本：silent-0125；原来源局：ZTRGYYMLR8SC。

原证据局ZTRGYYMLR8SC不在本批十局，未读取该局原日志。其重问归属、原答/护栏/SL与整轮结果尚未核验，不能借L2/GXN不同局关闭。

### silent-proposal-0b8ef30de463f317

原账本：silent-0013, silent-0277；原来源局：ZTRGYYMLR8SC。

原证据局ZTRGYYMLR8SC不在本批十局；原药水表加载异常快照、药槽来源与饮药时点对照未提供本批验证。历史提示the potion table did not load不等于测得持有价0。


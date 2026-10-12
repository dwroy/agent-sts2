# 静默 A10：神化传播萎靡升级与已观察虚弱减力组合

批次：20261012-111301-strategy-proposal。来源及实现任务：strategy-proposal。普通队列身份已核；dispatch reason=proposal，10 个领取 id 与角色/工作树一致，无 research_request/implementation_request。基线 main 已同步，base=5f421ef71a1e0693eeb4b334ee8bf03385722367。

本项属于原 silent-proposal-89354805ee4d7e77、silent-proposal-283a164780d11e69 的神化传播范围，并关联 silent-proposal-ebbfe3b97548756d 的逐源攻防验证。它是这三项的有限实现，不另关闭父提案。其他七项逐项核实并在 report.md 回报。

## 证据与既有账本

只读来源 VLZ6CCT8AQ0A，runs.jsonl 已核 SILENT/A10、结束于 2026-10-07T07:38:37.200Z。旧代码 ac321b1f+dirty，不假定与任一干净提交逐字相同。本批有限发现账本 silent-0428（proposed）；既有账本 silent-0237、silent-0238、silent-0053；原提案 Markdown SHA 全部核对一致并保存本批副本。

- F43 T1，states 275679/275680：场外 deck 的 MALAISE 为普通 X 费、dynamic_values=[]，文字“敌人失去X点力量。给予X层虚弱。消耗。”；实际神化施放后，场外 deck 不永久升级。
- F43 T2，states 275687：后续抽到萎靡+，文字为 X+1；当前三能，敌方 WEAK_POWER=1，四段各5。真实决策269714中和、269715毒雾、269716萎靡，随后269717结束回合。
- states 275689→275690：萎靡施放前能量2、敌弱3、敌HP198；施放后能量0、敌弱6、力量−3、HP仍198；来袭由5×4=20变3×4=12。states275691下一轮玩家77→68，覆甲3缓冲后净损9。本轮中和另有5直接伤害，不能计给萎靡。
- 字节偏移、原行SHA256、牌面和前后战斗帧冻结在 agent/tests/silent-apotheosis-malaise-evidence.json；六局原始筛选与排除元数据在本目录 log-manifest.json、各局 JSON、verified-windows.json、review-evidence.json。全六局共3301条有 decision_id 的动作记录、3432状态，另有5条无decision_id元数据保留而未充动作。

## 旧行为、新行为

旧 observedApotheosisUpgrade 一律拒绝 costs_x，因而已有的升级萎靡 X+1 消费者无法从神化获得 malaiseBonus。补精确普通牌面配对：仅 silent/A10、原始 X 费、能量字段0、星费0、无附魔、空动态值、已观察原模板及消耗文字。将 malaiseBonus 与升级预览文字一起传播到剩余手牌、具名后续抽牌及 rollout 牌堆。已升级牌不重复加成；其他 X 费牌、改费、魂缚、重放、未知文字仍不认证。

首次固定验证揭示另一处同组合误差：现有计算将已含虚弱的5直接减3，得到2×4=8，并报5血损；实盘为3×4=12、9血损。为当前题面的 SOUL_NEXUS/MAELSTROM_MOVE 增加限定事实路径：silent/A10、仅已见虚弱1或3的敌方能力、同一招四段各5、本线永久力量差−3且无临时减力/额外倍率时，每段采用已观察的3。该标记不带到后续模拟回合。神化传播及此处入伤修正一起交付，避免只修减益层数却把实盘血价低报4。

仍保留全部合法选项及大脑/Jev选择权，不改药水预算、留药价格、护栏、SL范围/排序或终局权重。铁甲及未观察角色/进阶保持原路径；不改知识生成器、怪物数据库或房间代价门槛。

## 反例、未知与时间切分

同局F43施放神化后仍净损57，F45持有却未施放并失败；跨战资源与抽序不同，不能证明必打神化、改后可赢三骑士或提升胜率。只有一局配对证据；T1/T2是发现兼固定回归，不能称独立盲测。其他来源局只用于各原提案处置，不能增加本组合样本数。

X+1消费者本来已有，新增的实际升级证据只含本局X=2施放；测试中的同线“神化→萎靡”、具名抽牌及rollout X=3是确定性组合/传播验证，不冒称实盘额外样本。其他虚弱层数、力量差、敌人/招式、攻击段或倍率组合没有在本批校准。未知升级、完整执行审计及同盘整场收益仍待原父提案；本批不把框架或有限公式补齐当父项完成。

## 验证与失败保留

固定夹具不读刷新知识、不调LLM/网络；首次4失败保留 target-initial.log。其中三个暴露上述入伤缺口；另一个是夹具漏掉已观察“消耗”关键词，导致合成rollout重复打牌，补固定关键词后修正。没有改期待值掩盖游戏数值失配。

最终8例覆盖实盘完整T2牌序、单步后续实抽、同线升级、具名抽牌、未来牌堆、题面hp_lost、已升级不重复、原deck不变、后续回合标记清除，以及角色/进阶/文字/倍率边界。整份生产源码撤回到base时5失败/3通过（withdrawn.log），恢复后8通过（restored.log）。原字节副本仅用.txt，red-green.json保存退出码。完整沙箱检查与合入结果以report.md为准，不提前记成功。

## 预期影响与回退

预期是使候选对已观察的升级萎靡给出正确减益，并让本局面本轮血损从错误5修正为9；不声称自然采用或实战收益。按Roy-2026-10-07-learning执行既有授权。实际合入后记唯一版本并双通知Roy；回退本次独立源码提交，保留证据、失败日志和账本历史。运维核实实际live祖先后登记shipped，学习者仅proposed。

## 本批最终源码与十项父提案处置

源码提交 `b2805be4ba44b7375c7908d873889372cc3cfe6c`。原沙箱入口tsc0、332文件3307例通过；撤码5失败/恢复8通过，gitleaks0。live知识刷新保存后，三方预检有20个共享记录冲突，未实际合入、未运行合后测试、不新增版本或shipped。全部冲突保留live-merge-preflight.txt，本分支七路径与刷新知识交集为空。

- `silent-proposal-89354805ee4d7e77`；账本silent-0237,silent-0238；waiting：本批补齐神化→萎靡X+1及F43 T2已观察虚弱减力子组合；基础、触媒等已有live源码。父项仍缺持有/实际施放/候选覆盖的完整消费者审计及其他未知升级、属性交互配对，不能将有限传播修复当整项完成。
- `silent-proposal-f2bfceddb1898dca`；账本silent-0106,silent-0019,silent-0201；waiting：VLZ F45 T1原始记录确为药水MC707ms/1-of-12、rollout horizon1/samples1/best=null；第二问12-of-12是不同盘面。缺模型覆盖一致、固定随机输入和同总预算的成对实验、样本收益曲线与排序稳定性；未据此改预算、药价或focus。
- `silent-proposal-283a164780d11e69`；账本silent-0237,silent-0238；waiting：与89354805同源，原Markdown与SHA已核；神化萎靡子项随本批交付，父级持有/执行/覆盖审计和其他未知配对仍未齐，不把整个经验提案标duplicate。
- `silent-proposal-ebbfe3b97548756d`；账本silent-0005,silent-0016,silent-0049,silent-0071,silent-0143,silent-0046,silent-0053,silent-0027,silent-0011,silent-0021,silent-0106,silent-0204,silent-0020,silent-0019；waiting：十五主题中本批只验证并修复神化萎靡与本局既有虚弱多段减力组合；逐源贡献、其他期限/实体与完整资源链尚缺联合消费者验收，未选focus和休息仍无同盘整场对照。
- `silent-proposal-e5b87be50f28f311`；账本silent-0079,silent-0021,silent-0125,silent-0018；waiting：已有预测审计、首次派发、离线段和相邻能力/HP观测源码均已核为live祖先；旧“能力观测未上线”理由不再适用。动作回执仍不能认证完整候选收益，末试死亡截断/缺后继匹配、跨重问全部执行与未记录动作因果尚未闭环；现有单局不支持SL/护栏阈值变更。
- `silent-proposal-49632bc4878fb597`；账本silent-0005,silent-0231；waiting：CA5 F13加压4→8及弱后11/14仍成立，未获得正敏捷配对；本批Soul Nexus局部修复不是CA5力量/逐击/敏捷/弱/独立成长全联合验收。缺该完整固定调用及新增属性失配证据，保留广项。
- `silent-proposal-66532328a585941f`；账本silent-0021,silent-0009；waiting：5PM F39第二试T2未建毒雾，冒泡耗能而未增毒；F33雾3/触媒1/群蛇4成立并赢是不同局面。缺同入口/完整抽序的启动或构筑顺序整场对照和可复现收益函数；相邻观测工具不能认证完整构筑兑现。
- `silent-proposal-43a76a31ba7bdcfa`；账本silent-0030,silent-0027；waiting：61E F17 T5吸取后负属性与T6毒结算继续成立；尚缺该负敏捷、毒与吸取全链消费者验收，SL范围/偏好另缺相同入口资源与完整抽序的可救活另线，首试胜不构成阈值依据。
- `silent-proposal-5264153a4a4b0e5c`；账本silent-0039,silent-0209；waiting：61E F23 T4本体51/幻象2、T5才退场；另一focus39伤零损仍只有未执行预测。缺召唤/航行/实体重排的完整联合消费者验收和另一目标序后继实打，不强制首杀。
- `silent-proposal-bddfa690a84e03d0`；账本silent-0128,silent-0079；waiting：DUZ F30四试睡3/2/1后自然醒，末试T6恢复成长力4/攻击22已复核；来源仍缺提前唤醒/STUNNED接续配对及同抽完整获胜另线，不能从四败拟合输出血价或杀序。

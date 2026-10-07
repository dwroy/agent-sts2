# 本批策略提案与逐项处置

角色 silent；本批 20261007-203653-strategy-proposal，scratch 20261007-203654-strategy-proposal；来源 ascension-audit / postmortem / experience-update；实现 strategy-proposal。授权 Roy-2026-10-07-learning。基线 main 合并后 37e54b08304f3af5a9d664eee42049de96756551。

## 实现：F48首Boss与F49当前Boss事实（4cc200cc9747f4a8）

账本 silent-0228。已核原帧 JMH5C51RLN4E A10 F48奖励/地图 states L243532—243533→F49 T1 L243534；9TG1RP5LFAAK A10 F48奖励/地图 L244372—244373→F49 T1 L244374。两局地图都有首Boss r14c3已访问及第二Boss r15c3待访问；F49敌人分别AEONGLASS和QUEEN/TORCH_HEAD_AMALGAM，raw boss_id仍TEST_SUBJECT_BOSS。资源仍8/17HP。原提案Markdown和指纹、账本原行、六原帧均保存本目录。

旧行为：F48奖励解释成本幕结束；F49构筑/运行计划/时钟仍显示TEST_SUBJECT；floors_to_act_boss未知。新行为：只门控silent、A10、第三幕、LEVEL_10效果、F48/F49；分列first_boss_defeated、observed_remaining_boss_nodes（无地图为null）、current_boss、原boss_id及stale、act_complete。F48首战结束后F49距离1、身份未知，跳过刚结束首战模拟；F49据实际敌人确认AEONGLASS/QUEEN并读取当前进阶冻结数据库事实，未知遭遇不套首Boss。runPlanInput使用同样事实，不改原始state。F49非战斗结束状态act_complete保留未知，无F49胜局证据。

反例/边界：F48正在战斗并未击败；无LEVEL_10、其他角色、A9/A11、其他幕维持原事实；未知F49敌人不猜。较晚9TG不同Boss为时间后置验证，但两局均已用于发现，不冒称盲测。结构条件不拟合参数；怪物事实仍从当前进阶首样本读取，房间代价5样本门槛未变。

验证：从六原帧取实际被消费字段，保存固定agent/tests/silent-boss-phase-states.json；空模板和固定同进阶monster-db夹具，不依赖刷新数据、不联网/调用LLM。集成验证buildFacts、runPlanInput、bossClockJson、withBossSim跳过与原state保全；撤生产改动重现旧事实，应失败，恢复应通过，再按原入口自测。无关角色保持等价。本次只改给模型的阶段/身份事实，不改血量、药水、权重和行动选项，无胜率承诺。回退独立本项源码提交，保留0163/连战功能、原始证据与账本。

## 其余派发提案

共10项，逐项原文保存在silent-proposal-*.original.md，所有原路径sha256均核对通过。后续处置与源码/实盘核验写report.md；重复项必须有实际live源码祖先，缺数据明确waiting，不用经验提交代替源码实现。

## 实现账本与验证补充

本项子缺口单独以根目录ledger.py登记silent-0251，status=proposed、by=learner:strategy-proposal；关联已有silent-0228与派发4cc200cc9747f4a8，保留旧连战/价值子功能的shipped历史。code_proposals.py add复用原输入返回同一派发id，无新建重复提案。

最终复核版撤掉全部五个生产文件后，固定14例中9失败/5通过；恢复后14例加导入检查共15通过。phase-withdrawn-reviewed.log、phase-restored-reviewed.log与phase-red-green-reviewed.json保存两次结果。源码备份用.ts.txt保留，避免作为源码进入导入扫描。最终完整入口phase-sandbox-reviewed.log退出0：239文件2514例、paths另11例，共2525例；tsc/vitest均0。源码提交 6f2b90a311644960fcfd1e2b7a4ce96fb41d65b4，合入因知识刷新冲突停止。

三方预演（非live合入）发现刷新知识数据及历史记录冲突，按任务第4节停止合入。保留live原数据；本项证据足够，waiting只表示缺实际无冲突live祖先的上线证明，不是假称缺游戏证据。运维兜底前不登记implemented、版本或shipped。详见live-merge-blocked.json与merge-tree-preview.txt。

### silent-proposal-4cc200cc9747f4a8

原提案：[silent-proposal-4cc200cc9747f4a8.original.md](silent-proposal-4cc200cc9747f4a8.original.md)。来源任务 ascension-audit；实现任务 strategy-proposal。账本 silent-0228。已核角色SILENT；关联证据 JMH5C51RLN4E F49 T1; 9TG1RP5LFAAK F49 T1; JMH5C51RLN4E F48 T13; 9TG1RP5LFAAK F48 T16。

处置：waiting；本项固定事实已实现并通过最终完整源码自测，提交 6f2b90a311644960fcfd1e2b7a4ce96fb41d65b4；实际live合入因刷新数据冲突停止，缺实际上线祖先证明，未上线。

预期/验证/反例见前节；不从两局失败推断资源保留策略必然转胜。

### silent-proposal-89354805ee4d7e77

原提案：[silent-proposal-89354805ee4d7e77.original.md](silent-proposal-89354805ee4d7e77.original.md)。来源任务 postmortem；实现任务 strategy-proposal。账本 silent-0237, silent-0238。已核角色SILENT；关联证据 VLZ6CCT8AQ0A F43 T1; VLZ6CCT8AQ0A F45 T1; VLZ6CCT8AQ0A F35 T1。

处置：waiting；已核VLZ F35/F43手牌升级与51伤/13损差值，但729份保存state均无实际/piles快照，run.deck仍为永久未升级牌组；缺可冻结的战内各堆卡实例/升级状态、完整确定抽牌输入，以及尚未观察升级/附魔变化的差值，不能以默认空角色的共用upgradeDelta宣称同方案和后续抽牌已完整实现。保留未建模并待神化专项补齐，不新增必打规则。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-f2bfceddb1898dca

原提案：[silent-proposal-f2bfceddb1898dca.original.md](silent-proposal-f2bfceddb1898dca.original.md)。来源任务 postmortem；实现任务 strategy-proposal。账本 silent-0106, silent-0019, silent-0201。已核角色SILENT；关联证据 VLZ6CCT8AQ0A F43 T1; VLZ6CCT8AQ0A F45 T5; VLZ6CCT8AQ0A F44。

处置：waiting；事实成熟度子项已有live源码45161a51c2c6b7e4a499b13cf749c4108193bbf5；改变MC先行/最低推演预算、药价或目标规则仍缺同总预算同盘输入/随机样本的受控对照、神化覆盖修复后结果与另一focus完整实打，保留预算和护栏。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-283a164780d11e69

原提案：[silent-proposal-283a164780d11e69.original.md](silent-proposal-283a164780d11e69.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0237, silent-0238。已核角色SILENT；关联证据 VLZ6CCT8AQ0A F43 T1; VLZ6CCT8AQ0A F45 T1; VLZ6CCT8AQ0A F35 T1。

处置：waiting；与89354805ee4d7e77是同一神化缺口的经验链；缺战内牌堆/确定抽牌复合输入和未知升级差值，未实现项不能用经验91d49f82或两份相同提案冒称源码duplicate。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-ebbfe3b97548756d

原提案：[silent-proposal-ebbfe3b97548756d.original.md](silent-proposal-ebbfe3b97548756d.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。已核角色SILENT；关联证据 VLZ6CCT8AQ0A F43 T1; VLZ6CCT8AQ0A F45 T5; VLZ6CCT8AQ0A F45 T3; VLZ6CCT8AQ0A F43 T4; VLZ6CCT8AQ0A F43 T3; VLZ6CCT8AQ0A F44; VLZ6CCT8AQ0A 局级。

处置：waiting；原提案复合覆盖14账本/15经验，VLZ F43升级勒紧6等依赖尚未实现的神化/升级牌路径；缺各属性、持续毒、成长、实际资源共同冻结的完整调用输入和源码对照，路线/休息/focus的完整同盘反事实也未保存。已有子机制不等于整个提案已实现。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-7ef28c3cb0160972

原提案：[silent-proposal-7ef28c3cb0160972.original.md](silent-proposal-7ef28c3cb0160972.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0240, silent-0239。已核角色SILENT；关联证据 VLZ6CCT8AQ0A F45 T1; VLZ6CCT8AQ0A F45 T4; T082DRCUHRRD F6 T1; 10GPK5XGHCK3 F3 T2; VN7RQJMJEFMX F37 T1; VLV17NUSFS61 F39 T1; UMVLWER4CD98 F48 T2; P5HT1272P5SB F8 T1; YLYLZWHA0GKU F39 T1。

处置：duplicate；核8局14次饮用，现有CURE_ALL=+1能/抽2/不回血（源码9f0babde8915d770a4313ebcaeb22259cb024d38）；已有45161a51补静默推演覆盖、MC样本/用时和并列事实，二源码均实际live祖先。满手与预算参数/时机缺对照，本提案允许模型一致记duplicate，本轮保留原行为。

预期行为保留已实现+1能/抽2/不回血及静默推演覆盖事实。固定模型调用核+1/draw2/非heal；8局14使用前后资源逐项核实。反例边界：满手溢出未测试、不拟合药水优先级或预算参数。live祖先源码45161a51c2c6b7e4a499b13cf749c4108193bbf5，底层药水模型9f0babde8915d770a4313ebcaeb22259cb024d38。

### silent-proposal-e5b87be50f28f311

原提案：[silent-proposal-e5b87be50f28f311.original.md](silent-proposal-e5b87be50f28f311.original.md)。来源任务 postmortem；实现任务 strategy-proposal。账本 silent-0079, silent-0021, silent-0125, silent-0018。已核角色SILENT；关联证据 8JRE1C4H4Z2W F33 T2; 8JRE1C4H4Z2W F33 T11; 8JRE1C4H4Z2W F33 T5。

处置：waiting；8JRE的同指纹实打证明多12血换7伤，但原日志没有四阶段统一候选机器标识/完整原始调用输入和后续重规划整条动作关联；缺可冻结的Jev原答→HP护栏→SL替换→实际前缀/重问全链输入，不用理由文本倒造各阶段记录。另缺另一完整胜线，保持原选择规则。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-49632bc4878fb597

原提案：[silent-proposal-49632bc4878fb597.original.md](silent-proposal-49632bc4878fb597.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0005, silent-0231。已核角色SILENT；关联证据 CA5KE8GFJ9X2 F13 T5; CA5KE8GFJ9X2 局级。

处置：waiting；CA5 F13 T5能证明成长未被弱取消；缺力量、敏捷、弱与独立成长四路径同时冻结的本角色调用输入/源码对照，未取得步法不能当敏捷样本；不凭单子项源码证明复合经验全实现。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-66532328a585941f

原提案：[silent-proposal-66532328a585941f.original.md](silent-proposal-66532328a585941f.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0021, silent-0009。已核角色SILENT；关联证据 5PM6JAQG6FNQ F39 T2; 5PM6JAQG6FNQ 局级。

处置：waiting；5PM F39 T2未建立雾、对无毒目标冒泡零效果的事实保留；缺同起始HP/构筑/抽序下不同启动顺序的整场胜负对照及可复现收益函数，不能用持有组件或另一F33胜局拟合启动阈值。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

### silent-proposal-43a76a31ba7bdcfa

原提案：[silent-proposal-43a76a31ba7bdcfa.original.md](silent-proposal-43a76a31ba7bdcfa.original.md)。来源任务 experience-update；实现任务 strategy-proposal。账本 silent-0030, silent-0027。已核角色SILENT；关联证据 61E2QS63Y9WU F17 T5; 61E2QS63Y9WU F23 T5; 61E2QS63Y9WU F17 T6。

处置：waiting；61E F17 T6吸取/负敏捷/毒事实保留；缺同起始HP/构筑/完整已知抽序下可救活的另一完整SL路线，单局首试胜不支持更改SL范围、阈值或换线偏好。

本轮预期行为：保留既有策略，观察事实与整战因果分开；不以持有、相关SL或单轮收益推出完整胜负。下一次验证按原提案的固定输入/原源码对照执行，满足上述缺口才实现；原提案中的反例和未知边界原样保存。未写新历史复盘。

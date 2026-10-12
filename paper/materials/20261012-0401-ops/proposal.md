# 本批提案与逐项处置

角色 silent；批次 20261012-034302-strategy-proposal；本批来源局 MTQ0EUBJ3R6T、7X0W3U8TVA2A、KFRDELW2TH2P。三局 runs.jsonl 均为 SILENT/A10。基线 8bda0c7660712eada94d9225e2cc2e52b65631e5，普通队列，没有 research_request/implementation_request；只处理本批十个原 ID。开工树干净，git merge --no-edit main 返回 Already up to date。

## 已核证据与本次实现

重新从根 logs 只读提取三局共 1456 决策、1521 状态；原行号和每行 SHA256 保留在 decisions.jsonl/states.jsonl，runs.json、assigned-proposals.json、assigned-ledger.json 保存角色及链。十份原 Markdown 的 SHA256 全部匹配队列登记；未改原提案、旧复盘或请求。

- MTQ0 F11T1：decision282138 原 plan6 预测损14/扣14，护栏 plan1 预测损6/扣16；282139 弃连续反弹，282140 重问迷雾，282141 中和。states288592→288597 玩家67→61、敌90→70。完整轮净扣20不能归给仅执行了首步的原 plan1。
- KFR F12T1：282578 原线预测损12/扣19、护栏线损0/扣12；首步斗篷后，282579 因新手牌重问蛇咬/中和/小刀。候选完整0损不能称已兑现；实际轮损6不能直接视为同线模型误差。
- MTQ0 F23T3：首试states288806→288812为10→10、敌102→89；末试288899→288905为10→2、敌102→83。282434 的SL少防御换打击，差值多损8/多扣6。四试同局相关，原线也失败，无整战赢线反事实。
- KFR F33T6：首试289339→289345为15→9、敌228→145；第3试289414→289420为15→3、敌228→135，均起36毒。282929 原题plan1为6损83扣，SL plan2为12损93扣，而 journal 仍写原斗篷线。后者不能被原 rollout_best_chosen=true 误记为最终选中最优。
- KFR F33T7：289536→289537毒37→43、本体159不变；289538敌74、玩家0，实85毒伤不等胜利。六次饮用增6已由当前 live 的窄条件输入覆盖，完整奇巧后继仍标未验证。
- 7X0 F31T5/T6：288426前中段0、后35且保留重接25；288430前中段各25、后21。当前live已有暂死输入及中段清毒/清力修复，不能继续把旧未合入理由当现状；完整生命周期排序仍不由本次局部观察证明。

本次实现一个离线审计子项（新账本 silent-0418，承接 silent-0125/silent-0079）：learner/audit-selection.ts + learner/lib/selection-execution.ts，使用固定日志关联原回答/最终候选/单动作回执/选牌及重问边界；同题唯一可比的预测排名与原回答排名分列，缺推演、重复候选、缺帧、排队均不补成实际收益。读取说明 learner/selection-execution.md。既有专用代码提案 ID 保持，不制造新重复 ID。

### 反例、切分与边界

MTQ0护栏候选反而预测即时多2伤，不能据此支持统一放宽护栏。KFR和MTQ0的SL原线也失败；较低敌残血不证明更安全。选牌、生成与抽牌后重问意味着原完整线未兑现；pending动作回执也不等已生效。四个固定窗口用于开发与验收，同局重打不作独立样本，不拟合任何权重；未来silent A10完整可比局才能提供时间留出。工具仅保守关联，不自动认证完整执行或计算整轮伤害归因，在线每步结构化完整执行认证仍属未实现范围。

### 验证、预期影响与回退

固定夹具由上述原日志投影，保留原行SHA；不读动态知识、不调LLM/网络。8例分别覆盖两护栏反例、两SL对照、缺/重状态、同文字候选歧义/缺排名、gate拒绝及跨尝试、跨角色/进阶/局号拒绝和输入不变。撤去核心实现时8失败，恢复8通过；日志 red-without-implementation.log/green-restored.log。完整自测、提交、合入状态以 report.md 及实际回执为准。

预期只改善学习者的离线追溯；没有出牌、药水、SL、终局或构筑消费者变更，铁甲在线行为不变，无游戏版本。回退单独撤本次离线工具及固定测试提交，保留全部原日志、学习账本和本批报告。

## 十项原提案覆盖

以下“已有”仅指限定源码子范围，不把相同主题当整包完成。现有部分实现源码祖先验证见 live-ancestor-check.json：8bb53d6342b7e9a2adf96de231b53c36eaa943de（恶魔输入）、a8b1f8be153fe4f3a34146117546c2178f2e446b（候选/护栏/SL资源审计）、0970bc0d112718d45c8ebf86ff7f84e0f36a7498（中段清状态）均为实际live祖先。

### silent-proposal-0802f69b28d25079

原题：静默A10同盘SL少一防御以8血换6即时伤；固定核对速度药/毒素/资源链，验证饱和探索血价并保留缺反事实限制。

账本：silent-0079, silent-0019, silent-0044, silent-0080, silent-0253, silent-0011, silent-0214, silent-0189, silent-0046, silent-0222, silent-0243, silent-0262。来源：postmortem → strategy-proposal；证据局：MTQ0EUBJ3R6T。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-sl.md。SHA256：79e1696de63d19810eb442ee3afa83dd5795f1693f4c9f4a48433fef014e3596。

本批处置：waiting。局部0→8损和13→19扣已核，已有SL资源差值事实；缺同条件完整胜线及独立留出，不能拟合全败排序或留药门槛。审计子项本次实现不关闭饱和死亡率的宽策略结论。

### silent-proposal-f54e8de2381c1250

原题：记录Jev原选与HP护栏实际替线的候选值及可比推演结果；本局省8HP且多2候选即时伤，不改护栏参数。

账本：silent-0125。来源：postmortem → strategy-proposal；证据局：MTQ0EUBJ3R6T。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-guard.md。SHA256：db780eb4b443cc8fdfb17237293f186588b1b010347160b24d1d22291ae8c5ce。

本批处置：waiting。本次交付原回答/最终候选同题排名与重问断点的离线审计；在线连续执行认证、完整实线结果与原推演比较仍未实现。不能把预测最终best充作实际完整执行best。

### silent-proposal-763a4b9d9f17b815

原题：逐牌敏捷、临时减力、持牌伤和已建立能力的时间边界。

账本：silent-0005, silent-0006, silent-0011, silent-0013, silent-0044, silent-0046, silent-0053, silent-0080, silent-0087, silent-0189, silent-0214, silent-0222, silent-0235, silent-0253。来源：experience-update → strategy-proposal；证据局：7X0W3U8TVA2A, MTQ0EUBJ3R6T。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-mechanisms.md。SHA256：989dcea2a0dd5cad05d276157131dec57fdb9d17b2bdab66cbd25f32e0e9ad39。

本批处置：waiting。十四项机制中速度药/临时敏捷/迷雾等已有模型，固定实帧支持局部兑现；缺十四项组合完整回放、毛伤事件账及未知修饰的隔离验证，不能整包标duplicate或发新权重。

### silent-proposal-19a5cff2094e2d8f

原题：同抽重打饱和死亡率与持续敌血池的终局价值审计。

账本：silent-0021, silent-0064, silent-0079, silent-0133, silent-0125。来源：experience-update → strategy-proposal；证据局：7X0W3U8TVA2A, MTQ0EUBJ3R6T。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-sl.md。SHA256：7bf15ce1f8fd2291d52b8d24fc89de1fe613e8fd9812d31621f9cd48c8e2d57d。

本批处置：waiting。当前已非“暂死输入未合入”：暂死/清状态/候选差值均有live子实现；仍缺修正后完整生命周期与同盘执行对应的终局反事实，有限死亡样本不支持必死规则或血价排序变更。

### silent-proposal-3540bf4360bf80af

原题：连续赢战、已到回复与下一房入口分源记录。

账本：silent-0019, silent-0020, silent-0243。来源：experience-update → strategy-proposal；证据局：7X0W3U8TVA2A, MTQ0EUBJ3R6T。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-resources.md。SHA256：58181f916f63872302d0ab2342b349e5de205083aa365151b8f4bcb79c1b63ce。

本批处置：waiting。赢战与回复分源有离线resource_chain，MTQ0 F24未抵达、SL恢复须分源；在线路线/休息消费者的完整来源链及差分验收仍缺，替路线效果也未观察。工程消费者缺口不伪称只需等新局。

### silent-proposal-0ea5c0b9c030fdd6

原题：静默A10知识恶魔：补奇巧选择的懒惰剩余名额与兑现条件；在本局已观察组合中验证毒药6层的量化候选，保留其他条件与提前饮用整场效果未知。。

账本：silent-0274, silent-0247, silent-0027, silent-0016。来源：postmortem → strategy-proposal；证据局：KFRDELW2TH2P。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sloth-potion.md。SHA256：ed57d3f8b54f0d056efe2e488a4dca2c2b32a7062433c636e71a51b395663391。

本批处置：waiting。8bb53d6已覆盖KFR六个毒药+6及奇巧剩余名额/能量提示；提示明确continuation_verified=false。缺目标改变后的完整合法后继及提前饮用整战对照，部分输入上线不等原提案全部实现。

### silent-proposal-f915ec544ab94b6e

原题：追踪静默A10护栏完整候选到重问后实线的预测失效，记录SL同盘多10伤／多6损的局部血价；无新阈值或已胜反事实。。

账本：silent-0079, silent-0125。来源：postmortem → strategy-proposal；证据局：KFRDELW2TH2P。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sl-tradeoff-guard.md。SHA256：2339e1598f60a64fa1db9be3ebe3cecfe7057ff323c14f15341ccce85b15de98。

本批处置：waiting。本次离线关联了护栏后重问和SL替线/旧journal分歧；完整实际资源结果自动归因尚未实现，两条T6线均失败，缺改权重需要的整战反事实与独立留出。

### silent-proposal-8fb51933639faf90

原题：已观察药效和能力的分时点模型覆盖核验。

账本：silent-0005, silent-0006, silent-0027, silent-0189, silent-0276, silent-0277, silent-0278。来源：experience-update → strategy-proposal；证据局：KFRDELW2TH2P。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-mechanisms.md。SHA256：540a529f428b0c342abb969c3d040446149db3d7fb4f855b23f4b950462a64ab。

本批处置：waiting。毒药6/触媒1两结等窄输入已有live支持；铁心建7覆甲不能推出完整减层触发，药效/能力组合仍缺隔离验证与完整时点比较，不能把部分模型视为六项整包完成。

### silent-proposal-b3bc0eb09211af6c

原题：奇巧可执行后续、SL血价与实际终结核验。

账本：silent-0021, silent-0079, silent-0102, silent-0247, silent-0274。来源：experience-update → strategy-proposal；证据局：KFRDELW2TH2P。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-sl-selection.md。SHA256：f3279ab3f48180d287e7ad57c0a1484e56ed48910772aac748dd6faf32185bf9。

本批处置：waiting。奇巧名额提示及SL预测资源差已覆盖，离线链本次补充；仍缺奇巧完整可执行后继、换目标/顺序和提前喝毒的整战结果，敌回血/末轮毒结算不能替代已赢证据。

### silent-proposal-fdc3a505fe5e1a55

原题：赢战血价、已到回血与跨幕回复事实分源。

账本：silent-0019, silent-0020, silent-0243。来源：experience-update → strategy-proposal；证据局：KFRDELW2TH2P。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-resources.md。SHA256：9591f8717f33da220db658aaa746a04412cd9b324bb60fbb2f9a376a0796ea75。

本批处置：waiting。六回血及营火126/幕间38/小血瓶20/SL恢复145为不同来源，已有离线分源工具；在线路线/休息全链消费差分未验收，且缺替路线、休息对锻造完整可比结果，不改阈值。


## 最终交付状态

源码 `ac631877279c43842346ea921d996554e0252709`，账本silent-0418；tsc0、316文件3099例通过、撤码8失败/恢复8通过、gitleaks0。live锁内预检8个既有记录冲突，exit78，未合入；全部原ID仍waiting，逐项最新理由见report.md/report.json。没有游戏版本或shipped。

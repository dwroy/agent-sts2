# 静默猎手策略提案逐项核验

时间：2026-10-14T18:57:47+08:00。批次：20261014-184301-strategy-proposal；来源任务/实现任务：strategy-proposal。

本批仅处理已领取的十个原ID，不新增重复提案。角色silent；四局均已结束、实际A10。没有research_request或implementation_request，普通专题请求绑定其他批次，不承接专题；`git merge --no-edit main`返回Already up to date。base与HEAD保持 `a43decfe89e60877dea41d91157d4b32dbc989b8`。

结论：十项宽提案均waiting。若干窄子项已经是实际live祖先，不能重复实现，也不能因此把宽提案整体记duplicate。未发现本批证据足以支持的新策略参数；没有源码修改、提交、合入或新版本。当前没有重现新的合入冲突，旧批冲突不是本批waiting理由。

原Markdown、队列、账本及runs身份已冻结。提案保存正文SHA逐项相等；4489原日志行按offset/bytes/SHA、所属局身份和冻结source_size逐一核验。全部游戏结论只来自这四局及其既有本角色记录，不使用其他角色知识。

下列“已核live子项”只证明实际源码祖先，不表示整项implemented或账本shipped。所有领域保持原行为；没有授权范围以外的架构修改。

## 证据与消费者

| 局号 | 状态 | 决策 | SL记录 | run-plan | brain记录 | run/config |
|---|---:|---:|---:|---:|---:|---:|
| MTQ0EUBJ3R6T | 440 | 424 | 5 | 4 | 23 | 1/1 |
| 7X0W3U8TVA2A | 461 | 445 | 1 | 4 | 31 | 1/1 |
| KFRDELW2TH2P | 620 | 587 | 8 | 6 | 35 | 1/1 |
| GXNKW8X1XYJP | 673 | 649 | 7 | 10 | 48 | 1/1 |

共2194状态、2105决策、21条SL流记录、24条run-plan、137条历史brain流记录、4runs及4config，合计4489原行；fight-plan在各自冻结截点选到0行，不补造。两状态流坏行、两决策流坏行、一个brain坏行是源流扫描诊断，不算所属局证据，不修改原日志。历史模型与调用口径保持原记录，137条brain行不自动等同137次新模型请求。四局运行源码均dirty，完整当时源码未知。

`raw-byte-verification.json`记录8流原字节读回；`evidence/evidence-manifest.json`保存每流source_size、每局计数及输出SHA。run-plans按run字段正确选到，不把正文提及当所属局。

当前离线消费者：MTQ和7X0完整输入成功；KFR完整输入因282561缺decision_id拒绝，GX完整输入因283515/283525/283581缺decision_id拒绝。保留原失败stderr及0字节输出，仅排除这些map/route-change元数据后作bounded输入，保持真实原行号、原observed_ts/指纹/尝试号，不补身份、不跨缺行。两个bounded输入成功，不冒称两个完整输入成功。详consumer-summary.json与逐局input-exclusions.json。

四个成功消费者共2101动作、483候选片段、594可核相邻端点与1507未知区间；352个整轮窗口中70个可核、282未知。完整候选结果与实际排名仍未知，不能按此算执行最优率。药槽变化和请求、自动usage、净HP与完整入伤继续分列。

32项原帧/候选/断点断言通过；18项当前纯函数消费者核对通过（3蛇咬预览、磨蚀、6奇巧资源、6窄毒药等）。`findings-verification.json`与`mechanism-consumer-verification.json`逐项保存来源。它们是证据核对，不是本批生产tsc/vitest全测，也没有自然在线采用或策略胜率证据。

17个相关源码叶与冻结live `d9bfb65a4ec28cdda8706a150fc4341d28db1227`逐SHA比较：15相同，card-model/build-facts两叶仅历史Roy/Dai注释署名不同，精确补丁保存base-live-comment-differences.patch。10个相关功能commit均实际live祖先，详source-audit.json；普通蛇咬8毒已进入live的事实纠正旧待办理由，但十四机制宽项仍不关闭。

## 十项处置

- `silent-proposal-f54e8de2381c1250`：waiting；候选/派发/重问追溯已有live实现；历史选牌中断后缺完整候选执行身份及实际线可比推演，无法认证实线排名。原actual_turn=null的保守语义本身不是bug。
- `silent-proposal-763a4b9d9f17b815`：waiting；上述窄子项已有实现；原十四项跨直接施毒修饰、持续能力及临时增益边界，仍缺全部组合到实际后继/资源归属的冻结消费者校准，不能以四个窄入口核对覆盖整包，也不从dirty历史推断完整原模型。
- `silent-proposal-19a5cff2094e2d8f`：waiting；同抽失败线和有限推演没有提供受控完整胜线；暂死/恢复/终局的完整因果及修正输入到实际整战终结尚缺，不能改SL或终局权重，也不能整项duplicate。
- `silent-proposal-3540bf4360bf80af`：waiting；离线资源观测不等于路线/休息题面已逐源读回；缺入房与开场补血、营火、实饮及SL恢复到对应题面的端到端校核和可比替路线，不能改安全血线。
- `silent-proposal-0ea5c0b9c030fdd6`：waiting；名额提示和本组合毒药6已有live实现；完整合法后继/对象收益兑现仍明确未验证，缺换对象/顺序与提前饮毒整战对照，不能将宽提案整体标重复或宣称改善胜率。
- `silent-proposal-f915ec544ab94b6e`：waiting；断点与资源端点审计已有；候选重问后身份不能重建成完整执行，缺同种子整战胜负校准。多10输出且多损6、两线均败，不足以拟合新的保血权重。
- `silent-proposal-8fb51933639faf90`：waiting；本批核实的窄药效不能补出覆甲完整减层触发条件及未知修饰组合；七项药效/能力的跨回合联合消费者尚无充分隔离校准，保留原规则。
- `silent-proposal-b3bc0eb09211af6c`：waiting；缺合法后继到真实终结的完整链、替对象及提前饮毒的受控整战结果；有限模拟或敌余血更少不证明更安全，不据此拟合终局价值。
- `silent-proposal-fdc3a505fe5e1a55`：waiting；缺这些来源逐项进入当时路线/休息题面并读回的完整冻结对照，以及可比替路线/休息对锻造的整场结果，不能从六次回血仍败拟合阈值。
- `silent-proposal-5a95725089f53cd8`：waiting；药槽、相邻端点和整轮审计已有live子项；仍缺逐击复活瞬时帧/完整入伤、自动消耗的完整因果及完整候选执行归属。两实线均败，不能把局部多10HP当整战收益。

逐项层/回合、账本、反例、旧/预期行为、验证条件及真实live子项提交见同目录proposal.md，十个原提案副本保持原字节。没有遗漏派发ID，没有领取别的队列项，没有修改原经验或重复写复盘。

## 交付与限制

fixes=[]、merged=null；HEAD等于完整40位base，工作树保持干净。没有源码可撤回，撤源码失败/恢复通过不适用；生产tsc、vitest和cases均null，未运行play或网络模型请求，未新增eval版本/上线记录/shipped。只有证据核对脚本和报告位于授权scratch；经验库沉淀与自然消费者采用不冒称完成。

只经根ledger CLI为31个既有本角色账本追加本批proposal/report追溯，by=learner:strategy-proposal；不改既有claim/status/version/first_run/evidence，不把shipped旧项降成proposed，也不代运维标shipped。不新增代码提案ID；最终code_proposals沿用本批十个原CLI ID，proposal_results均保留待新局/缺完整链条件。

初始input-summary.initial.json和*.replacements.initial.json保留：首版准备脚本只查不存在于这些旧日志的结构化hp_guard/overridden字段，误报替线为0；现按原rationale的HP guard标记及显式original/replacement且不含overridden=false核4/0/4/2条记录。这是离线准备诊断修正，不是生产策略红绿测试。早期猜测路径的只读命令失败没有变成代码回归；source-audit第一次对不存在selection-potions.ts读blob失败，已按实际selection-observation.ts核，未伪造缺文件源码。

runtime-process-whitelist.json为空仅说明调度PID在本工具进程视图未取得可核原生参数；未据此证明模型、推理强度或配置切换，不修改运行模型配置。所有旧失败、原日志、初稿与未知保留。

收尾核验：根账本31条实际CLI追加已按物理原行、offset/bytes/SHA逐条读回，字段仅op/ts/id/by/where/note；十ID/派发身份仍匹配，HEAD与base一致且git status为空。交付文本与本批CLI输入gitleaks扫描退出0、无泄露，日志另存。

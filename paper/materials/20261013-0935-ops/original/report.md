# 静默猎手策略提案复核报告

记录时间：2026-10-13T09:32:53+08:00。
任务：strategy-proposal；batch=20261013-091302-strategy-proposal；character=silent；base=0c020b7cedfb9290cabe91bedb1038afdcacbd53。

本批结论：十个已领取提案全部waiting，fixes=[]、merged=null。没有源码、知识、游戏规则或版本修改，没有提交、合入、shipped或新release_id；工作树保持干净。原队列id全部保留。

## 身份与范围

开工git status干净；本批learn.json行task=strategy-proposal、character=silent、reason=proposal，worktree和六局集合匹配，带10个proposal_ids，完全没有research_request或implementation_request。普通专题检查根notes/strategy-research-silent.json仍绑定另一20261010-150327批，故不承接专题、不读取其他专题、不扩展队列。git merge --no-edit main返回Already up to date，HEAD仍为上述40位base。原批行保存dispatch.json。
六局在根logs/runs.jsonl原行575—580逐局核为SILENT、A10；完整行保存runs-identity.json。README、最新STATE-2026-10-12、decision-log末尾、learning-protocol及learning-code-proposals已读取。每个原提案Markdown及SHA、所关联26账本原行/当前选定值已保存；不重写历史复盘。

## 实盘冻结与观察

本批保存6989条原日志字节：3306决策、3432状态、6配置、29 SL条目、33计划和183 brain行；fight-plans按run字段过滤为0，不解释为缺战斗动作。所有决策逐条按observed_ts+fingerprint唯一匹配，且核floor/turn/screen一致。每条原物理行、字节偏移、长度和SHA在evidence-manifest.json，不用当前刷新模型复原历史dirty知识。

| 局号 | 决策 | 状态 | 计划 | SL记录 | 大脑日志 |
|---|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 699 | 729 | 8 | 2 | 46 |
| 8JRE1C4H4Z2W | 659 | 676 | 6 | 7 | 31 |
| CA5KE8GFJ9X2 | 265 | 282 | 2 | 0 | 11 |
| 5PM6JAQG6FNQ | 638 | 660 | 7 | 7 | 39 |
| 61E2QS63Y9WU | 443 | 462 | 4 | 7 | 27 |
| DUZUBAJ3A8GP | 602 | 623 | 6 | 6 | 29 |

183条历史大脑记录均engine=codex/model=gpt-6.1-sol/effort=high；这是来源局日志身份，不作为本学习者当前原生运行设置的证明，也不改写旧记录。SL记录含首试胜局，29条不等于29次重打。8JRE沙虫六试、DU甲虫四试都来自各自同一局。

本批逐帧核11组事实，详见verified-facts.json：神化7→5能量与43/14→51/13同序列模型差、707ms药水MC退化、三骑士32HP/20挡对59攻击、四段减力83→59和现场属性/毒、同盘SL3/15实损及10/17净扣、历史护栏16损/43伤→4损/25伤、蚌0/4/8力、零毒冒泡1能零效果、吸取负敏捷与17+16毒、幻象召唤与各实体3/6力量、甲虫睡眠醒来与0/2/4成长。没有拟合新收益常数。
需要区分的原证据细节：8JRE首试T2原题是8样本、原线1/8死；第三试同题才是原线0/24死与替换5/24死。第三试也并非所有线等死率。旧护栏只在rationale留下HP guard文字，没有hp_guard结构字段；消费者从原答和journal匹配plan4→plan6，不补写旧日志。5PM零毒冒泡前后玩家29血，35是失落敌血；此前原提案的旧物理说明保持，不重写复盘。

## 已有源码和消费者的范围

读取live固定提交c53b03527a953836317edec2829e315e9c411a40及实际17路径字节，逐项核最后源码修改提交为该live祖先。12路径与base字节相同，5路径有差异，两份材料均保存；这些live源码路径均无工作字节与该commit差异，不把局部同字节推广到整个运行树。source-provenance.json包含全40位实际源码提交和哈希。

| 有限子项 | 已核实际live源码提交 | 仍未覆盖的范围 |
|---|---|---|
| 神化已观察升级映射 | a11dd870b09f3f1b67fcb5d6c08af6573fd809e0 | 属性组合/未知升级与完整实际施放追踪 |
| 神化候选事实 | 3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17 | actual_cast_this_fight=null |
| 模拟成熟度事实 | 9952a11811a6a73f12e0f86a8b6ec49db3cae18c | 同盘同种子同预算稳定性实验 |
| 选择候选审计 | 05cd292c6f01bb31e406473d3a9843e659d62b93 | 实际完整候选结果与持续能力全链 |
| 首次派发回执 | bade647f9fe4c9103b40e2f26b26296692ad24b7 | state_effect_verified=false，whole_plan_executed=null |
| 离线观测端点 | 8698c581dac6c7e957f50a381586960a6d0c9b57 | 端点差不认证单卡因果或全候选执行 |
| 离线选择/终态审计 | 04921bd785ac6838066522f91ea0bb6ab95cb6a1 | 整线因果、缺字段/跨尝试及非唯一实体匹配仍未知 |

六个冻结切片经现有learner/audit-selection.ts直接读回，未调游戏、LLM或网络。初次tsx CLI全部exit1，原因是沙箱拒绝IPC管道listen EPERM，发生在分析逻辑前；原err及selection-consumer-results.json保留。随后在同沙箱用node --import ./agent/node_modules/tsx/dist/loader.mjs执行同一入口，六局exit0，结果另存*.selection-audit-direct.json和selection-consumer-direct-results.json。这是只读消费者核验，不是本批新源码测试或胜率验证。

| 局号 | 候选段 | 动作 | 可连接观测端点 | 完整候选实际结果非空 |
|---|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 14 | 102 | 0 | 0 |
| 8JRE1C4H4Z2W | 66 | 277 | 264 | 0 |
| CA5KE8GFJ9X2 | 4 | 26 | 0 | 0 |
| 5PM6JAQG6FNQ | 21 | 114 | 102 | 0 |
| 61E2QS63Y9WU | 12 | 60 | 27 | 0 |
| DUZUBAJ3A8GP | 22 | 117 | 112 | 0 |

8JRE原答/最终候选分别读回270216 plan1/plan1、270282 plan1/plan2、270264 plan4/plan6；能力端点可读但所有完整候选结果保持null。VLZ/CA及部分非SL走廊旧sl_attempt=null，消费者按既有保守边界拒绝端点链接；0不是没有机制变化，人工原帧事实仍单列。没有为取得更多链接而补造尝试号、填未知字段或改消费者。

## 逐项处置

| 提案id | 状态 | 具体待补项 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | A10已观察升级的有限传播与候选事实已存在；actual_cast_this_fight仍为null。缺跨抽牌/药水/选择重规划及SL重置的实际施放追踪消费者夹具，未取得原局dirty知识/移动表完整冻结；不能把有限升级源码当整项完成。 |
| silent-proposal-f2bfceddb1898dca | waiting | 原题药水MC707ms、1/12与rollout一轮一样本已核，成熟度字段已有live子项。缺同起点同种子同总预算的分阶段MC对照、样本稳定性曲线和原运行模型冻结，不能设新预算常量、留药价或杀序。 |
| silent-proposal-283a164780d11e69 | waiting | 与89354805ee4d7e77共享神化问题，但保留独立experience来源链。有限升级已有，实际施放/中断追踪尚未完整覆盖，没有整项实际live源码commit，不能仅凭语义重复登记duplicate。 |
| silent-proposal-ebbfe3b97548756d | waiting | 本批核到四段减力83→59、2力/3敏/勒紧4且覆甲耗尽、触媒2与12/16毒等现场子项。原提案覆盖15条机制/资源，缺逐路历史模型、期限/持有与未建立组件、回血/锻造反事实及完整消费者验证，不能以单个事实栏关闭整组。 |
| silent-proposal-e5b87be50f28f311 | waiting | 消费者可读原答plan1→SL plan2及原答plan4→护栏plan6，264个相邻观测区间保留。完整候选实际结果仍为null；缺中断后整线逐步核实和持续能力建立时点的完整运行消费者夹具，六试没有胜利对照，不改血价/护栏/SL阈值。 |
| silent-proposal-49632bc4878fb597 | waiting | 本局证实力0/4/8及意图11/15/19、弱后14、末轮差2血；计划步法未取得，不能补正敏捷。缺正/负敏捷、逐击弱修正及独立成长四路统一固定调用与历史模型对照，单个步法实现不足关闭复合项。 |
| silent-proposal-66532328a585941f | waiting | 末试零毒冒泡实际1能零效果已核，玩家29血而失落35血须区分；缺同起始资源、同抽序下另一完整启动或构筑线路的胜负/收益对照。实验体事实栏不覆盖失落/遗忘，不能拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 吸取后力2→0、敏0→−2、敌力0→2与17+16毒已核。缺同起始HP/牌组/完整抽序下可救活的另一SL线路及历史移动/效应模型冻结；该战首试胜不证明应改SL范围、阈值或换线偏好。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 21血幻象实召、两个实体力0/3/6及T4本体线47伤/15损已核，幻象14→2仍攻击。旧living-summon子项已有，但缺A10历史召唤/航行模型、种子与另一focus后续完整对照，不能把旧提交当成长/排序收益整项实现。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 末试睡3/2/1、T4醒来、力0/2/4与攻击18/20/22已核，四试均败。缺醒来/眩晕接续的历史移动模型及同抽不同排序的完整稳定收益线路；毒杀石虫后的攻击下界是另一限定子项，不关闭成长/换线宽项。 |

每项证据局号/层/回合、26个关联账本、原Markdown、反例、预期行为、固定验证和回退详见/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302/learner/runs/20261013-091325-strategy-proposal/proposal.md；没有新id，不把语义重复当完整live duplicate。继承的有限源码祖先仅证明该子项已存在，不是本批implemented。

## 验证、记录与限制

无生产源码改动，撤源码失败/恢复通过不适用；没有运行tsc/vitest，不复用旧批测试结果，tests固定为tsc=null、vitest=null、cases=null。verify-facts.py的固定原记录断言是证据复核；不把11事实组或六次消费者读回算成vitest用例。没有live合入，跳过发布流程、版本、上线双通知和shipped。
仅通过根learner/ledger.py update追加这26个原账本到本批proposal/report的链接和复核说明，保留claim、status、version和原证据，不新写同一历史复盘、不直接改台账、不另建提案id。CLI输入/输出与后核结果在本批材料内；派发队列逐项waiting交完成JSON，不自行更新learn.json或根请求。
限制：原运行各局均带dirty标记，原知识/移动表和全部推演随机输入未被本批完整冻结；当前源码/数据库不能当旧现场。未选focus、不同启动、留药、路线、锻造和另一SL完整线路缺受控对照；同局帧和SL尝试有关联，不能膨胀独立样本。机制范围限定本角色已观察A10，不用预训练或其他角色填未知，不关闭量化父要求。
诊断历史：首次字段查看EVENT的combat=null时误调用list(None)产生TypeError，后按合法非战斗帧处理；误查agent/test和把测试名当reflex源码路径的只读定位失败保留在diagnostic-history.txt。它们不是生产bug。最初宽账本展示被工具截断，完整选定原行保存在assigned-ledger-history.json，不把截断当数据缺失。

交运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302/learner/runs/20261013-091325-strategy-proposal/proposal.md。报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302/learner/runs/20261013-091325-strategy-proposal/report.md。本批无需回退源码；waiting沿原id待新证据续派，ops核实有限源码、链接及未完成范围。

最终核验（2026-10-13T09:34:55+08:00）：6989条原日志及副本逐字/SHA全部一致；26条根ledger CLI物理追加exit0并核实仅含链接和说明，claim/status/version/evidence均未改；gitleaks本批材料扫描exit0、发现0。HEAD仍等于base，git status干净，agent/learner/eval/ops/knowledge执行及数据路径零diff。回执verification.json、ledger-update-receipt.json、gitleaks.json。

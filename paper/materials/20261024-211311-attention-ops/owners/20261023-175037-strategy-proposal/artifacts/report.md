# 静默策略批次原始证据核查报告

记录前已运行date：2026-10-23T18:06:55+08:00（原生成工具回执）。

本批没有新的可交付源码：棱柱单步污染偏差属于已有候选，保留原ID等待原宿主检查；失落/遗忘的已核当轮预测与实盘吻合，缺少改变目标或药时的反事实。未合入、未发版本、未登记shipped。

## 身份和范围

- task=strategy-proposal；character=silent；batch=20261023-175037-strategy-proposal；learner-batch=cb7b9349-31ae-4a02-9b50-2d52dc561ad0；base=0c85d6d9a526264631461fe8cf8221ace499b695。
- 初始git status干净；普通批merge main返回Already up to date；最终HEAD保持该base、git diff --binary为空，source.diff.patch为零字节。所有新文件均在本批忽略的scratch中。
- 只读根learn.json本批行：reason=tick，无proposal_ids/proposal_repair/research_request/implementation_request。根普通专题请求仍绑定20261010历史批次，不匹配本批，不接管其work_spec、不以纯研究请求口径结案。原批行快照见dispatch-readback.json。
- 已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环与fix-queue相关待办。STATE中旧STOP停点已有同文件后续恢复说明；本任务没有操作对局、权限、账号或配置。
- 未再派agent、未联网、未读取其他角色知识、游戏二进制或凭据。当前学习会话模型/档位未在本任务另读原生turn_context核验，故不将提示要求当成档位生效回执。

十局身份均由runs.jsonl原始行确认（character规范化为silent；全部ended非空）。只有KUHYZBFFLALU记录victory=true；不从十局结果推出某策略因果。

|局号|进阶|结束层|胜利|decisions匹配|Jev匹配|V6匹配|
|---|---:|---:|---|---:|---:|---:|
|UW7X088RVVLR|10|17|False|358|78|0|
|KUHYZBFFLALU|10|49|True|685|151|7|
|QLEGQ76DJ1MN|10|9|False|120|25|0|
|6ANZJ6XRKV4P|10|39|False|623|126|0|
|Q3R929GHT14R|10|37|False|610|110|0|
|HD6BM39PYL21|10|27|False|431|100|0|
|8JNHX23GX7ET|10|33|False|588|157|0|
|PEM07PPDE9Z4|10|24|False|416|145|0|
|BDJTF3FDA8W5|10|49|False|744|182|0|
|ZF8PX27B46H5|10|33|False|735|153|0|

## 冻结、身份与完整性

摘要命令和两次共用extract_evidence命令均真实完成exit0。摘要只是有限索引，没有把最后五条当完整覆盖。V6专项与默认提证启动时间不同，原流继续追加导致切点/整流SHA不同；各自manifest独立保留，不覆盖旧截点。

|入口|流|source_size/冻结字节|source_sha256|选中行数|
|---|---|---:|---|---:|
|V6专项|v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|7|
|V6专项|jev-prompts|3028360978|617fc0bcccbebc62b4b331e300a337e3b763e7df6297ef45e64113063f5a7959|1227|
|V6专项|decisions|4332795058|bbd59f6c3e9c0de1a61f683b1cb63cbcaab092cd08ea7f8233f3347656247748|5310|
|V6专项|run-config|2992679|704a292bbe09fc20fad9528b57ef9639fe42a63fa80ced2f6a8a7839e216b3a5|20|
|默认提证|states|16602384345|bcec3229a6f498d80bb50e24ddfa5d7e4aed0192bb4254dae8902db5dede6591|5751|
|默认提证|decisions|4333253301|28f4a77141eb4912f3a921b96dac7676d9d3a4793c7c4d0a31d30f986f27f42f|5310|
|默认提证|sl-attempts|58823447|9aed2d0e52ded5e992d8cd5bee2023e4d0ce0ae6f2ea6fc04621c8c94194f087|40|
|默认提证|run-config|2992679|704a292bbe09fc20fad9528b57ef9639fe42a63fa80ced2f6a8a7839e216b3a5|20|
|默认提证|run-plans|11614931|b74d0508cf757c070870fe29c58f632b6386eeb4a0ed10d7e932a0b37839dedf|400|
|默认提证|brain|1499478444|98e051c58d441fde65c12e53ed7aeb528bbf29c254e21d6fdef961b8400f3a5a|323|
|默认提证|v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|7|
|默认提证|jev-prompts|3028907358|3033765110e64778bdbd6268ab4d7e0bd2b26db69b3ce03c21f022e4c77c47ad|1227|

- 每条证据保留source/offset/bytes/SHA/identity；Jev只按显式run_id或decisions精确decision_id接入。未用question_id相似、正文提及或时间邻近确定所属局。八道重点题的decisions原行及chosen/result/gate_reject/selection_dispatch有无和值独立保存于selected-decision-audit.json。
- audit-evidence.py逐条seek原日志核SHA并核解析内容：5310 decisions、1227 Jev、20 run-config、7 v6-build，另33条窄states；成功回执raw-integrity.json。每条索引见raw-reference-index.jsonl。没有把整个states或全部state输出给模型。
- 所选states以state.run_id再次核身份。部分窄states引用承接既有复盘的16498444893字节旧cut，旧ref原样保留；默认全流另冻16602384345字节cut。旧行SHA均实读一致，不能混报切点。
- V6专项全源Jev有1条invalid_json、decisions有2条；默认states有2条invalid_json、brain有2条。不能归到本批特定局，也不把坏行当零。各manifest均incomplete_lines=0，但不以无截断证明缺失字段存在。
- V6专项decisions全源unknown_identity=1934、unmatched_decision_id=1701；默认states全源unknown_identity=3638。均保留为全源缺口，不按时间/正文归入本批；Jev选中记录无身份冲突，不能因此否认全源缺口。
- 对象声明pending_host_seal=true/deferred_errno=18，原工具已保留本地只读产物；这不是宿主封存已完成的回执，交原收尾流程核验。

## V6与Jev分账

20条run-config均v6.mode=on、delivered=false、reflex=off；没有把reflex=off说成整套V6 off。20条code.commit/branch/dirty等为null且error=git status failed: spawnSync git ENOBUFS，运行精确源码未知；当前base/live对照不能补写开局commit。

V6原始行683–689全部逐行读过，显式run_id均为KUHYZBFFLALU，kind=card_pick、stage=projection、mode=on。每行4个方向entries全部trust/win_tier/delta_tier=unknown，unknown.count/total=4/4，target_id=act3:unknown，jev_answer=null、fallback=null。七行共28个entry不是28个独立样本或可用价值。其余九局是当前cut内no_match；两流存在，不是missing或V6 off，也不推出零效果。

这些投影没有精确decision_id；question_id不能用于推定某个决策或Jev请求采用了投影。V6仅按显式局身份保留审计，不能借通关结果认定有收益。

Jev机械分账：1227条记录中error非空46条，消息均为human-pace budget exhausted: Jev；逐局计数{'UW7X088RVVLR': 1, 'KUHYZBFFLALU': 18, '6ANZJ6XRKV4P': 2, 'Q3R929GHT14R': 5, '8JNHX23GX7ET': 1, 'PEM07PPDE9Z4': 10, 'BDJTF3FDA8W5': 7, 'ZF8PX27B46H5': 2}。错误记录仍保留request/answers是否存在，不将请求存在算回答成功或执行。八道重点题均有answers且error缺省；不把V6 jev_answer=null解释为这些战斗题无答。

## 逐题阅读覆盖

question-coverage.json逐一列1227个精确decision_id、局/层/回合、问题key、原ref、是否读决策题和未读原因；不是最后五条抽样。

本批阅读八道决策题的全部候选、指令、状态及答案/错误；重复请求字段按原始值差分读取，完整原request另存question-<完整UUID>.raw.json。外部open_book保留来源/版本/SHA/许可与冲突，不把附件当本系统实盘证据；未复读的重复附件不补机制。

|局号|层/回合|精确decision_id|读取目的|
|---|---|---|---|
|Q3R929GHT14R|F37/T6|54bb4afc-8c55-4ac6-ab28-e0d1d17d9f39|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T5|eb3556e4-6a6e-4115-8984-546b8b5d3d8d|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|d476130b-6d77-4b70-abfb-6c95e470efe2|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|ab4dd43c-ba3b-4105-a9eb-6835016b52f0|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|c06d624d-6bfe-49a1-a786-0b347b20e5bd|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|deb48a9d-6430-499f-b562-f7183e76de6f|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|356d45b4-4dd6-48b8-8fb8-decac1f89dbc|核查污染单步缺口及整轮/弃牌反例|
|HD6BM39PYL21|F27/T6|344c66ea-6db4-4713-a31f-b73f6652b817|核查污染单步缺口及整轮/弃牌反例|

另5道扩展窗口题仅保存完整原件并核身份/动作，未逐字阅读全题面；其余1214道仅作结构/元数据核验。合计1219道没有按完整决策题阅读，原因均为本批有界选题外或辅助定位，不能据其选项推断机制、胜线、牌值或效益。

## 实质结论与逐项处置

1. HD6BM39PYL21 A10/F27/T6：原题d476130b的防御后数字5与后继19攻/8挡对应11不同；ab4dd43c所选蛇咬又使当前攻击分量11→17。所选六个单步decisions结果completed，gate_reject/selection_dispatch字段缺省，不伪造保护结果。对应原states516545–516552核污染/来袭/药槽/死亡；11/17不是实际扣HP。T5 eb3556e4整轮预测损10与20→10吻合，是区分单步缺口/整轮已有模型的反例。Jev原survival已答lethal，也不能说修数字就改了其危险认识或可赢。
   原ID silent-proposal-08f9b6f1658b5d7b，账本silent-0579/0168。原154301三叶与ops冻结SHA逐项相同，见candidate-readback.json；原宿主检查未完成，source_commit=null，实际live combat.ts仍旧blob。处置为沿原owner等待宿主完整检查/窄集成，不新建提案、不重复写代码、不冒duplicate/implemented。原定向9过、撤码3败、完整45失败仅为旧批历史，不计本批测试。
2. Q3R929GHT14R A10/F37/T6：54bb4afc选plan1，原始首步selection_dispatch明确single_action_receipt/whole_plan_executed=null。生存者续步497423的回执为pending/unstable，497424弃牌与497425结束各有completed；另核states516083–516087后，15挡、39攻、27→3与预测损24相符，敌总血126→106与预测20相符。T8敌8/54存活、玩家死亡；不从采样目标顺序或全败样本推出固定先杀序。
   既有ID silent-proposal-f12f1d9548b6dff7，账本silent-0183/0418/0019。没有发现此窗口需新属性规则的偏差；缺未执行plan2及药时/换线的受控后继，不改目标、药时、SL或权重，也不凭有限窗口把整个旧提案标duplicate。

以上仅在本批两局窄窗口支持结论；其余八局只通过身份、结果及流元数据，未做机制/策略覆盖。没有新参数拟合、外部数据学习或跨角色外推。未来新自然Silent A10局及配对后继方可验证；当前派发进度A11不等于证据已覆盖A11。

## 账本、源码与验证

- 原silent-0579只经根learner/ledger.py update追加本批核查链接，by=learner:strategy-proposal、status=proposed；证据列表逐字不变，仍1条，不新增support/repeat，不标shipped。before/after、输入与CLI回执保存在ledger-0579-*.json。
- 没有新代码提案，code_proposals=[]；上述既有ID只作为原链引用，不冒称本批领取或重新登记。本批没有proposal_ids/proposal_repair，故proposal_results=[]，逐项观察处置写skipped与本报告，不消费他批领取项。
- proposal.md保存本批证据、旧/拟行为、反例、验证、后续及回退边界。原提案Markdown、旧done/根请求、旧失败均未改。
- 当前只读live=2faa7ead017b977051b317355e352aa229b1344d；本base/live的combat.ts blob均cad6686ed01fd06564e84a6a8362ceebbc29caf2，turn-solver.ts blob均f13e8884fee3e1ed6d6c79d72181d77ce5f9a833。仅这两叶相同，不宣称整树等价或运行时源码已证明。
- 本批没有生产源码/知识改动，因此tsc/vitest/cases=null；没有可撤的新补丁，撤源码失败/恢复通过均不适用。没有新提交，不分配eval版本、不进行live merge、不发实际上线通知。
- 两次辅助读取曾分别因combat=null、无decision_id事件失败，修正机械读取后核验成功；失败说明见raw-integrity.json。一次apply_patch写proposal.md返回失败，随后仅用授权shell在scratch成功保存；未改生产文件。
- 科学父要求、自然采用/收益、原候选检查及未观察范围继续开放；本报告不是正式经验入库或消费者读回验收。

交运维的提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-175037/learner/runs/20261023-175044-4d0e01b4-fea9-412f-99b6-63a04ddcd628-strategy-proposal/proposal.md
报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-175037/learner/runs/20261023-175044-4d0e01b4-fea9-412f-99b6-63a04ddcd628-strategy-proposal/report.md

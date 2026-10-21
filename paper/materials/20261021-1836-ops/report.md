# 静默猎手策略提案复核报告

记录时间：2026-10-21T18:33:28+08:00（写前date）；batch=20261021-181310-s2-strategy-proposal。

## 结论与身份

十项派发提案均为waiting。本批没有足以支持新策略规则或独立生产模型修正的完整联合证据，未改源码/知识，未提交、未合入、未增版本。不是报告型专题完成，也不关闭科学父要求或学习入库要求。

基线/最终HEAD：7c560c9afad6b08a45fd9ef65edb1ff44dbbff1c。开工Git干净；普通任务git merge --no-edit main返回Already up to date。本批learn.json task/character/worktree/runs/proposal_ids已精确核对，留dispatch-identity.json；没有research_request/implementation_request。普通专题入口notes/strategy-research-silent.json绑定另一旧批，不能套用；未读取其他专题替代身份。

十项原提案均逐项读到原文：四份仍在原路径，六份原工作树路径缺失，已在既有worktree-archives清单中按队列登记的SHA定位，仅把对应Markdown成员复制至本批scratch，逐份核内容SHA一致。proposal-history.json保留原登记和历史更新，recovered-proposals.json保留归档/成员/原路径/SHA/本批副本出处；没有整树解包或恢复其他任务状态。原文的证据、账本、反例和验证要求未省略或改写。

README、最新STATE-2026-10-19、decision-log末尾、学习协议与代码提案协议已读。STATE中的历史停点与后续decision-log不一致时保留时序，以新决定为运行背景，不据本任务启动/恢复游戏。未联网、未派下级、未运行play、未访问其他角色知识或游戏二进制；未改变模型/账号/权限。本任务没有读取原生turn_context回执，不额外宣称档位验证成功。

六局runs.jsonl原文均为SILENT、A10、ended非空、victory=false；终层分别30/39/13/33/48/33。原始运行均dirty，不将今日源码当作当日精确生产树。run-outcomes/保留runs原行及冻结出处。没有拿后续main或live部署证明这些旧局实际消费了新字段。

## 证据生成与冻结切点

按指定入口建立evidence-summary.json，再执行指定四流v6-evidence提取及默认八流evidence提取；另单独提取runs原文。初始材料仅本批摘要、原提案与本批既有复盘；后续仅在需核机制时读指定状态窗口。不是以摘要代替原始题面。

| 流 | source_size字节 | 冻结前缀SHA256 | 本批选中行 | 全流无效/截断行 |
|---|---|---|---|---|
| states | 15292705177 | 430627d3192f1ec437c453bdcb290d890a69853d7da43601354fa7400b484a0b | 4062 | 2/0 |
| decisions | 3374215098 | f77d53d189a88158fada60e4fc9730cc14ede0d564a3dfb0e5f521f2ac5aca2c | 3941 | 2/0 |
| sl-attempts | 52837976 | a8579599a212cfe5a7138342a32df7d82b58a8a67b595a1a349616b8c7c13f1f | 38 | 0/0 |
| run-config | 2439529 | 098ee236b3ede0451ab97c07fca0fd538a03c1e3f5f63932f3f67884c4f1e23b | 6 | 0/0 |
| run-plans | 10402743 | bb5959296aa479d403b004264d06c0155e624ab501f54c724439d87f7a71deb8 | 33 | 0/0 |
| brain | 1225001981 | 3d859a2023945bf617e2007fcbf4ae9ac79ee4950b3f884a05ce6cd3f827ec0e | 188 | 2/0 |
| v6-build | 64707059 | 0de31475dae0df2947df0acb99209d437b296e1dc7d8700ab5700add9a552cca | 0 | 0/0 |
| jev-prompts | 2421257989 | 719990dbb259d0bdf143e59dd264f1e39027508bcf33cf0c7d0cab0e1011dee7 | 811 | 1/0 |

两个extract manifest中共同流的冻结字节数/SHA一致；summary事实索引保持单独身份。逐行source/offset/bytes/SHA/identity均在*.evidence.jsonl，每个manifest保留全流计数、身份缺口及冻结前缀SHA。

| 局号 | states | decisions | Jev原始row |
|---|---|---|---|
| DUZUBAJ3A8GP | 623 | 602 | 84 |
| 5PM6JAQG6FNQ | 660 | 638 | 92 |
| CA5KE8GFJ9X2 | 282 | 265 | 58 |
| 8JRE1C4H4Z2W | 676 | 659 | 139 |
| YF0LXT1QSTGG | 1091 | 1065 | 269 |
| XP2SL33HT0D9 | 730 | 712 | 169 |

states全流unknown_identity=3431；decisions全流unknown_identity=1934、unmatched_decision_id=1494。全流无效JSON不分配给本批，不以正文出现局号、相似question_id或时间邻近强行归属。缺口参考的last-five只是定位尾部，绝非完整缺口或本批覆盖。

提取工具生成的content回执含pending_host_seal=true/deferred_errno=18；本地证据可读且已按原日志偏移读回，但不能宣称宿主对象封存完成。原日志未修改。

## V6与Jev的不同证据口径

v6-build全文件671行，在64707059字节切点六局全部no_match；不是缺文件。六份历史run-config没有显式V6配置字段，故V6开关状态记未知/历史未记录，不能自行写成已证off。entries/jev_answer/fallback/unknown在本批没有可归属原行，分别记不可评估，不补成四项零、不补成已采用。此缺流不阻止其余旧局证据复核。

Jev的811个原始row全部有request和answers，均未出现error字段；这是字段检查，不是服务绝无故障或完整候选成功执行的证明。811行均在本批run身份及精确decision_id上回连，question-inventory.json保留每题原ref和decision_ref。Jev答案不等于chosen；chosen完成一个动作也不等于整条计划执行；decisions中的fallback与V6 fallback分开。

## 实际阅读覆盖与未读范围

机械流式读取全部4062个本批state、3941个decision、811个Jev row，生成906行目标层状态索引；模型没有把整份states载入上下文。

完整题面语义审阅四题：XP2SL33HT0D9 F33 T3的decision_id=3f7d700b-b113-4975-a7fe-85c2422ff0f8与33560091-b5f4-41b4-bcd8-06b3adf2327b，以及YF0LXT1QSTGG F48第二/第三次T1的15e91299-fbd2-4ff6-8a93-3e4f4c126052与c2213f65-9079-4ac6-9705-3f2407ff1121。包含四份request.state、全部6/9/7/7个候选、答案和error字段检查。XP第二题首次工具输出有截断，随后单独补读完整state与被截的plan1/2/3；剩余plan4—9在原输出完整可见。YF两份questions逐字段完全相同，完整读一份7候选并核字节等价；两份state均完整读到。question-*.json保留完整原始envelope。

其余807题没有逐题完整语义审阅。question-inventory.json逐题明确full_model_review=false，其精确ID/ref列表就是未读清单；本批未用它们推新动作规则。原因：选取两组同指纹代价作有限的原始执行核验，其他原提案维持各自待证范围；机械提取和字段计数不能当作完整科学验收。特别是重规划后的Jev题面虽已取出，只有实际chosen/result链与状态核验，不算整题语义覆盖。未把各局最后五条当完整问题覆盖。

selected-decisions.json保存9个定位点的answers/chosen/result、gate_reject/selection_dispatch字段是否存在与sl_explore原对象。execution-chain-decisions.json另存两组实际执行链的完整envelope。decision-state-links.json按已经精确归属的同局row，以observed_ts精确相等和fingerprint相等核9处起点，9/9吻合；时间仅用于同局已知身份下定位状态，不建立局归属。raw-readback.json核8个Jev、27个decision、6个run-config、72个state原日志偏移字节与SHA（以实际计数为准）。其他窗口保留抽取原ref，可独立复验。

模型另读了64个目标层轮初结构化事实、reviewed-state-windows.json中的45个逐步状态投影（实际行数以文件为准），以及两组实际执行的连续状态；未声明这些等于其他题的全量题面或完整替代战斗。

## 双蟹T3：从原答到实际后果

两次fingerprint完全相同：45HP、敌194/193、相同手牌与能量。但请求不是同一模拟输入：首试五轮8样本；第二次五轮24样本，并新增13张known_draws。整战模拟分别459/600与199/1200，均因25秒预算提前停止，两次均无胜样本。这些是模拟分母，不是独立实盘局分母。

两次Jev都选plan2（防御、猎杀者→爪），confidence 0.94/0.66；无error字段。首试decision271992 chosen=防御，271993继续猎杀者，271994结束回合，均result=completed。状态278028—278031：45→36HP，敌194/193→179/184，本轮损9、净扣24。

第二次decision272040答案仍plan2，但sl_explore在B2并列0/0、diff=0、se=0下替成打击→爪、弹跳药瓶+，chosen首步是打击；272041继续药瓶，272042结束。状态278076—278079：45→31HP，敌194/193→179/181，损14、净扣27。实际药瓶后两敌毒9/12；题面替线预计敌188/172、火箭毒20，实际落点不同，所以净扣27碰巧一致也不能称逐实体模型完全准确。

两次主decision的gate_reject和selection_dispatch字段均缺失，记录为历史未提供，不当作已核“无拒绝”或新派发回执。chosen/result加上明确后继状态足以支持这两段实际动作与当轮差异，仍不推出整战胜率。

原提案“两线24/24”用于第二次题面内部原/替线比较成立；不能误读成首试请求也24样本。本报告补充分母与已知抽序限制，不改原提案，不宣称发现游戏机制反证或接口bug。不能用少5血/多3伤决定全局血价权重；未控制后续抽牌和其他回合，六次SL仍计同一局。

## 实验体T1：原答、探索与后续截断

两题完整fingerprint相同，27HP/111敌HP、3能量、覆甲4；题面7个候选逐字段相同。两次Jev都选plan5，confidence 0.89/0.88，无error字段；题面原线预计损0/伤54，替线plan4预计损10/伤36，两线均五轮24/24败、后损封顶27。低可信连战模拟0/1200且明确不可作必死/SL判据，不能把零胜样本当精确安全结论。

第二次尝试decisions271309—271318实际建立步法、刺杀、两打击、防御+、斗篷，随后271315另题重规划成防御/小刀/赠礼。题面预期的打击+续步没有在T1施放。states277327—277337显示敏捷3→苦无4、格挡12→22→31、玩家27→27、敌111→66：实际损0、净扣45，不能沿用预测54。

第三次尝试271348起SL替成步法/刺杀/两打击/防御+/赠礼；271354在用药后另一题又以avoid替成end_turn，候选斗篷/防御/打击+未执行。states277366—277373玩家27→18、敌111→73：实际损9、净扣38。两组所有列出的动作result=completed，但gate_reject/selection_dispatch仍是历史字段缺失。原题面完整不等于整线完成，当前差值+9血价/−7扣血是本轮观察，不能外推长期收益；原提案要求的全部重规划消费者验证和独立整战对照仍未齐。

## 其余提案的已核窗口与限制

- DUZUBAJ3A8GP F27 T4/T5：states274830—274839，火花3→6；T4污染0→3→6，能力建立时仍3；T5污染6/12/18，攻击12→17→21→26，挡17、46→37HP，同时毒7→13→结算余12。支持把技能收益/污染血价分列，不能推所有技能亏损。账本silent-0168。
- CA5KE8GFJ9X2 F13 T5：states273263—273268，力量8、攻19→弱14、10挡/2HP；覆甲6仅为观测，不补减层条件。账本silent-0231。
- 5PM6JAQG6FNQ F38 T3/T4：states274308—274314，23上限电击力量2→4、17→19攻，敌死亡后index4→3。可观察连续性不等于跨召唤代际稳定ID。F39 T4/T5 states274351—274358：两步法−4敏→0，失落死亡后−4力消失；未见遗忘死亡返敏，不强制杀序。账本silent-0233/0209、0183/0005。
- 8JRE1C4H4Z2W F33：轮初47HP的T2在首/第三试出现，后继T5分别25/13HP；这些只支持原提案需区分预测/实际与成长建立时间。未完整核本批F17 T6题面、全部指定执行夹具及跨重规划链。账本silent-0079等，不把原提案历史95局、99局分母计入本次独立验证。
- YF0LXT1QSTGG F48 T3→T4：states277512/277513，4HP/4毒旧阶段到212HP新阶段，旧毒/力清空；277513—277519两尖啸33→15→0，后续触媒2已建但T5无毒，攻击44。只读定位271495的Jev原答与SL替线后经过重抽，不能把致命毒药续步算实打。账本silent-0021/0027/0028/0085/0079。
- XP2SL33HT0D9 F33末试T4：states278249—278254，火箭57→转向38→弱28，随后第二步法才到4敏。早期船夹板/普通镣铐首证不在六局中，未跨批读取代替本批证据。原综合提案101局/1499房、22次减力/50帧船夹板尚未在本任务复验。账本见逐项表。

反例保留原文：技能有毒/挡收益；未试杀序无胜局保证；防御替换也有延后死亡的样本；已建能力仍可能败；药瓶随机落点与抽弃重规划会改变后继。原提案提及的其他局只是原文中的历史主张，未作为本批新验证或借用角色证据。

## 已有源码子项：不重新实现或冒充整个提案duplicate

已核live上下文0a9dc70e3ef096e7d0d6eb1524cd20e2cbe906c6。源码祖先66283dd9982bdd7f480da7a4d9bfefea0572a9ac、1698adc96ba434a46942321e0237b70657e625b2、0e4fe4df89a06682468e0e4716c12126e76369d5均为该live祖先。existing-source-proof.json保存命令结果；silent-sl-resource-comparison.ts、silent-sl-comparison.ts、silent-selection-dispatch.ts在本基线与live的SHA均相同。

resource_comparison已有同题hp_loss/damage/block/strength/污染/毒/沙坑分账，随机中位数不作成对差，execution=unverified。candidate_comparison已有原/替线、推演horizon/samples/deaths及actual_turn_result=null；selection_dispatch只证单动作，whole_plan_executed=null。combat-plan.ts将资源比较接在回放和探索两路径，hand/loop.ts保留拒绝字段。已有代码不能为2026-10-07旧局补造当时缺失字段，更不证明全部原提案的固定消费者/策略效果。当前未发现必须新增同义字段的源码缺口。

## 逐项处置与后续验证

| 原提案 | 既有账本 | 来源局 | 本次证据及未实现原因 |
|---|---|---|---|
| silent-proposal-c20b5139dd0dff71 | silent-0168 | DUZUBAJ3A8GP | 已核F27 T4/T5污染、毒与血价；缺冻结生产输入下火花增长、污染期限和迷雾收益的联合逐步校准，不据单局强制少打技能。 |
| silent-proposal-ae9e692d680e3819 | silent-0183, silent-0005 | 5PM6JAQG6FNQ | 已核F39 T4负力敏与失落死亡后力量恢复；遗忘死亡返敏、逐实体抢夺归属及另一杀序完整后继未验证，不设置固定杀序。 |
| silent-proposal-52f1e1bd2e7db0ed | silent-0231 | CA5KE8GFJ9X2 | 已核F13 T5力量8、19攻虚弱后14；缺历史A10实际移动表字节及覆甲条件隔离的生产联合重放，不把现场值拟成房间成本。 |
| silent-proposal-6dd8bbff876be528 | silent-0233, silent-0209 | 5PM6JAQG6FNQ | 已核F38 T3/T4电击力量2→4、17→19攻；index随死亡重排，缺跨召唤代际稳定身份与冻结初始化输入的消费者校准。 |
| silent-proposal-578e415a259e6835 | silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016 | 8JRE1C4H4Z2W | 已有live候选审计仅为子项；F17 T6等指定完整夹具、跨抽弃牌重规划执行归属和独立后移整战验证未齐，不重复实现字段或改变探索。 |
| silent-proposal-c0767768bf6a7ab1 | silent-0079 | YF0LXT1QSTGG | 已完整核F48两道T1题面及续步，实损0→9、扣血45→38；资源/候选比较已有live子项，缺跨重规划整候选验证及独立整战对照。 |
| silent-proposal-a46bdb7fe711d79a | silent-0021, silent-0027, silent-0028, silent-0085 | YF0LXT1QSTGG | 已核F48 T3→T4阶段重置及T5已建触媒2但零毒；缺所有候选经重抽后实际执行的联合验证，不能从持有能力推保证收益或调整排序。 |
| silent-proposal-1044224808015e5c | silent-0079 | XP2SL33HT0D9 | 已完整核F33两道T3题面、原答、SL替换及实损9→14/扣血24→27；预测与实际分毒不同，缺受控随机后继及独立整战验证。 |
| silent-proposal-7cbc6005db712ba9 | silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242 | XP2SL33HT0D9 | 已核F33末次T4朝向57→38→弱28；六局未覆盖原提案早期A1/A6首证及全部来源的固定消费者校准，不冒称整体duplicate。 |
| silent-proposal-c59f592f1427a67e | silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242 | YF0LXT1QSTGG, XP2SL33HT0D9 | 已核本批局部机制及SL血价；未复核原101局1499房资源分母、22次减力/50帧船夹板及全部经验消费者，不能以六局关闭整提案。 |


沿原ID等待具体缺证，不新建重复ID、不直接改专用队列/learn.json/根请求。没有新策略知识或参数提案，所以没有新增账本/代码提案，也不降级已shipped的silent-0079；仅复用原账本ID作为出处。code_proposals保留十个真实CLI原ID，implementation_domains=[]表示本批无代码实现，审阅范围不冒充实现范围。

下一步只补各原提案缺失的固定输入和真实消费者校准；新策略参数须以独立后移静默A10完整局验证，按run分组，不按SL尝试扩大分母。固定预测回放、源码合入、正式经验入库、下一局自然消费和自然收益分别验收。此次提证不证明本批正式发布或任何收益。

## 验证与现场

没有生产源码变更，tsc/vitest/cases均null；未做撤源码红/恢复绿，不制造测试通过、提交、merged或eval版本。只运行机械索引、原字节SHA读回及Git祖先/同字节核验。开工和收尾Git保持干净，报告/脚本/证据都在忽略的本批scratch中。

audit_evidence.py初稿遇无decision_id的合法审计行而KeyError，修为只对有显式ID的decision建索引，重跑exit0；初稿保留audit_evidence.initial.txt，原失败输出保留宿主会话工具事件。另一次shell调用在执行前遇沙箱glob ENOENT，原命令重试成功；不视作代码失败、不扩大权限。未执行清理或删除工作树。无提交所以不虚报提交前gitleaks或合入检查完成。

交运维proposal路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-181310-s2/learner/runs/20261021-181321-4edd54da-6830-4325-bcf4-85f96f0936f0-strategy-proposal/proposal.md。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261021-181310-s2-strategy-proposal",
  "base": "7c560c9afad6b08a45fd9ef65edb1ff44dbbff1c",
  "runs": [
    "DUZUBAJ3A8GP",
    "5PM6JAQG6FNQ",
    "CA5KE8GFJ9X2",
    "8JRE1C4H4Z2W",
    "YF0LXT1QSTGG",
    "XP2SL33HT0D9"
  ],
  "fixes": [],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-c20b5139dd0dff71",
    "silent-proposal-ae9e692d680e3819",
    "silent-proposal-52f1e1bd2e7db0ed",
    "silent-proposal-6dd8bbff876be528",
    "silent-proposal-578e415a259e6835",
    "silent-proposal-c0767768bf6a7ab1",
    "silent-proposal-a46bdb7fe711d79a",
    "silent-proposal-1044224808015e5c",
    "silent-proposal-7cbc6005db712ba9",
    "silent-proposal-c59f592f1427a67e"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-c20b5139dd0dff71",
      "state": "waiting",
      "reason": "已核F27 T4/T5污染、毒与血价；缺冻结生产输入下火花增长、污染期限和迷雾收益的联合逐步校准，不据单局强制少打技能。"
    },
    {
      "id": "silent-proposal-ae9e692d680e3819",
      "state": "waiting",
      "reason": "已核F39 T4负力敏与失落死亡后力量恢复；遗忘死亡返敏、逐实体抢夺归属及另一杀序完整后继未验证，不设置固定杀序。"
    },
    {
      "id": "silent-proposal-52f1e1bd2e7db0ed",
      "state": "waiting",
      "reason": "已核F13 T5力量8、19攻虚弱后14；缺历史A10实际移动表字节及覆甲条件隔离的生产联合重放，不把现场值拟成房间成本。"
    },
    {
      "id": "silent-proposal-6dd8bbff876be528",
      "state": "waiting",
      "reason": "已核F38 T3/T4电击力量2→4、17→19攻；index随死亡重排，缺跨召唤代际稳定身份与冻结初始化输入的消费者校准。"
    },
    {
      "id": "silent-proposal-578e415a259e6835",
      "state": "waiting",
      "reason": "已有live候选审计仅为子项；F17 T6等指定完整夹具、跨抽弃牌重规划执行归属和独立后移整战验证未齐，不重复实现字段或改变探索。"
    },
    {
      "id": "silent-proposal-c0767768bf6a7ab1",
      "state": "waiting",
      "reason": "已完整核F48两道T1题面及续步，实损0→9、扣血45→38；资源/候选比较已有live子项，缺跨重规划整候选验证及独立整战对照。"
    },
    {
      "id": "silent-proposal-a46bdb7fe711d79a",
      "state": "waiting",
      "reason": "已核F48 T3→T4阶段重置及T5已建触媒2但零毒；缺所有候选经重抽后实际执行的联合验证，不能从持有能力推保证收益或调整排序。"
    },
    {
      "id": "silent-proposal-1044224808015e5c",
      "state": "waiting",
      "reason": "已完整核F33两道T3题面、原答、SL替换及实损9→14/扣血24→27；预测与实际分毒不同，缺受控随机后继及独立整战验证。"
    },
    {
      "id": "silent-proposal-7cbc6005db712ba9",
      "state": "waiting",
      "reason": "已核F33末次T4朝向57→38→弱28；六局未覆盖原提案早期A1/A6首证及全部来源的固定消费者校准，不冒称整体duplicate。"
    },
    {
      "id": "silent-proposal-c59f592f1427a67e",
      "state": "waiting",
      "reason": "已核本批局部机制及SL血价；未复核原101局1499房资源分母、22次减力/50帧船夹板及全部经验消费者，不能以六局关闭整提案。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-181310-s2/learner/runs/20261021-181321-4edd54da-6830-4325-bcf4-85f96f0936f0-strategy-proposal/report.md"
}
```

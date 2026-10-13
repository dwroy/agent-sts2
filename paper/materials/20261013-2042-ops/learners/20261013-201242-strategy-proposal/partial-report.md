# 静默猎手策略队列复核报告

记录时间：2026-10-13T20:31:05+08:00（写记录前已运行date）。

十项均waiting；已核六局原始对局证据、原提案SHA、账本及现有live源码。没有新增策略源码、提交、合入或发布版本，没有登记implemented、duplicate或shipped。经验沉淀和消费者实盘采用不在本次报告中冒称完成。

## 身份和边界

- task=strategy-proposal；character=silent；batch=20261013-201242-strategy-proposal；reason=proposal；worktree与派发完全一致，proposal_ids恰为十项。无proposal_repair、research_request、implementation_request。
- 普通批按条件只读根notes/strategy-research-silent.json；其batch为20261010-150327、dispatch_runs/工作树不同，不承接专题，不读取其他专题或扩展选题。
- 开工git status干净，HEAD及合main之后base均`927db5594f57b1895aa5a47b0118a0c5490ad0f1`；普通合main输出Already up to date。
- logs只读；所有过程材料只保存本批learner/runs内。只读取指定六局的实盘正文、本角色账本/经验和通用实现源码。未派下级agent、未联网、未运行play、未读key/.env或游戏二进制。

## 六局冻结证据

| 局号 | 进阶 | 决策行 | 状态行 | SL行 | 历史源码标识 |
|---|---:|---:|---:|---:|---|
| 751FN9QM9MHQ | 10 | 615 | 624 | 6 | 79bee0fc+dirty |
| KV0JHNJCKXLS | 10 | 669 | 686 | 7 | 70c8352b+dirty |
| YQL8RZ8BWN1E | 10 | 571 | 582 | 6 | b0b0e679+dirty |
| L9SGRBB5R698 | 10 | 635 | 653 | 6 | 4fb81b17+dirty |
| PU80F84P6HPN | 10 | 1033 | 1064 | 12 | 0581ecb3+dirty |
| KEN58SH9SLZ6 | 10 | 548 | 558 | 6 | f9db52c1+dirty |

合计4071决策、4167状态、43 SL记录。43记录涉及不同战斗和相关尝试，不作为43个独立局。原始编号字节切片保存raw-decisions.jsonl、raw-states.jsonl、raw-sl-attempts.jsonl；完整SHA和抽取时源文件长度见evidence-manifest.json。逐局决策数与runs.jsonl一致，角色均为SILENT、实际A10。

## 同指纹差分及反例

| 局号／层／回合 | 原试→换试 | 实损HP | 敌净扣血 | B2原→换 |
|---|---|---|---|---|
| 751FN9QM9MHQ F17 T2 | 1→3 | 13→18 | 9→18 | 0.195→0.193 |
| 751FN9QM9MHQ F17 T7 | 2→4 | 13→23 | 12→18 | 0.103→0.013 |
| 751FN9QM9MHQ F17 T13 | 1→6 | 8→2 | 17→11 | 0.256→0.203 |
| KEN58SH9SLZ6 F17 T10 | 4→5 | 15→21 | 2→4 | 0.385→0.127 |
| KEN58SH9SLZ6 F17 T5 | 4→6 | 7→5 | 1→2 | 0.042→0.033 |
| KV0JHNJCKXLS F33 T5 | 4→5 | 0→0 | 36→29 | 0→0 |

六组指纹逐字相同，原／换实际动作和SL编号在audit-evidence.json中分列。751 F17 T2用272434/272575、T7用272531/272652、T13用272483/272820；KEN T10用274505/274568、T5用274484/274601；KV0 F33 T5用273400/273450。

- 751 T7双方预测未决弃牌都保守多计6血；实损差10仍一致，不把绝对上界误差当新pure bug。T13处理呼唤省6血也少6实际输出。账本silent-0079/0176。
- KEN T10无实体下多6持牌自损仅多2实伤；T5省2血却使步法从T5延到T9，后续防御兑现窗口不同。两组均反对只按即时血价作整战结论。账本silent-0079/0005/0176；原HP护栏T2迷雾4毒机会成本沿silent-0125保留。
- KV0 T5删致命毒药+后的当轮零损没有改变，净伤少7；后继补毒曾再次被SL改为结束（273451），不能只以第一步回执认完整方案。账本silent-0102。

KV0末试原始states279535—279577：敌399→223，净扣176。逐帧可见下降191、上升15；T4末327/15毒→T5 342发生毒与回血在同帧相抵。沿已观察毒结算分解才得到毛伤206、回血30，不能将191/15的可见净变动冒称206/30的直接逐帧读数。死亡帧279577虽in_combat=false仍保留敌223，必须纳入净伤；SL截断轮不补未来毒。audit-evidence.json同时保留两种口径和限制。

## 药水与巨兽阶段

KEN七次实际use_potion及逐槽前后占用已核：F3 T2攻击(274131;280206→280207)、F4 T1稳定血清(274156;280232→280233)、F5 T2速度(274185;280262→280263)、F11 T1虚弱(274235;280313→280314)、F11 T2攻击(274237;280315→280316)、F15 T1发光水(274267;280348→280349)、F15 T1技能(274272;280354→280355)。有动作的日志中饮药7、弃药0；274207是map/route-change元记录，没有chosen，不是缺失饮药。槽位消失证明耗用，不证明抽弃重问后的完整候选收益。账本silent-0019。

751 F13 T3 decisions272361：五轮抽样8个样本，无药整战参考plan5与有药plan2/3进入并列；选项原criteria及rollout保存在audit-evidence.json。其原缺表成本0不等于持有价0，未实打无药或留药boss分支。账本silent-0019/0021/0005/0007/0129/0176。

YQL F17 T10 states280160→280161：残壳毒2→8，玩家26血／13挡、自爆41均不变；不能将6新增毒当即时减伤6或本体进度。六试都清体后仍败。L9 F17 T14与PU80 F17 T17的SL末态也保留近十亿占位血；PU80第5试F17 T15胜余2是既有胜线，其他后继不同，不能证明新排序或提前喝药有效。原提案明确将阶段诊断、参考路径规则与真实胜利分开。账本silent-0017/0250/0011/0027/0046。

## 实际live源码与缺口

只读核实时live HEAD=`83ef7ec4a635529b626bb8ea95e51871384457da`。以下commit均经merge-base --is-ancestor核为实际live祖先，且相应模块blob与当前live一致（阶段最早源除外，后续源另核）；只作已实现子项的证据，不作为十项整体验收：

- 候选SL资源比较：5604982e13890e0e2bc8bf8246272e8267321c0b；silent-sl-resource-comparison.ts仍execution=unverified。
- 持牌损失与未决弃牌：05cd292c6f01bb31e406473d3a9843e659d62b93；silent-held-loss.ts保留actual_held_hp_loss=null。
- 单动作派发回执：fdaf787a372880b0438e73bcac7e6d2168b038ed；silent-selection-dispatch.ts保留state_effect_verified=false、whole_plan_executed/actual_turn=null。silent-selection-audit.ts仅scope=predicted_candidates。
- 持有价值未知和无药参考：c4670f4f416c7d93e192e889c5080e7e4e0e733f（亦含于04921bd785ac6838066522f91ea0bb6ab95cb6a1）；silent-potion-reference.ts不是实盘无药/留药反事实。
- 巨兽当前阶段/残壳用毒：b14880d1b1780d03e4c1c87b5afdc2a1e08fd456（live重放源d5e20aa4dd44168ce30944dfcce74f8322144953）。
- 巨兽最终资源受限诊断：ebf3d8f54a895d542de4308b5239f668ed9cd5e5/0d092f6b928a6221eabf3516abad25c48ceaac9c；不等于对本批所有增益组合均校准。早期阶段源a83d9ab675560a177249aa638e99df40bcfb5553为祖先，但当前文件已有后续扩充，未把旧blob冒称现状。

live combat-plan实际接入上述事实和selection_audit，hand/loop接入selection_dispatch；live explore.ts enemyHpLeft仍求和原始占位HP、anchorRank仍以其破同存活轮平局，阶段展示不改变该排序。主树与live三个接入文件blob有差异，逐字核实仅Roy/Dai历史注释差异；本次分别保存实际live副本，不笼统声称全文件相同。源码审计原字节副本均以.source.txt/.live-source.txt保存。

本工作树silent experience版本2026-10-13.8中12个被原提案引用的经验均存在；只冻结对应条目到experience-input.json，没有借聚合支持数制造本批的新独立验证局。

## 十项处置

- silent-proposal-366288801d9150d9：waiting。账本silent-0079, silent-0176；证据751FN9QM9MHQ。已存在候选资源比较与单步派发回执；缺跨抽牌、弃牌和续问的完整执行归属及其余后继一致的整战对照，不能由T2/T7/T13差额拟定SL血价门槛。
- silent-proposal-85929bdfc8a3fc1b：waiting。账本silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176；证据751FN9QM9MHQ。持有价值未知与未决弃牌的保守持牌损失已有诊断；F13无药完整实盘、留药至F17支线及后继兑现未记录，8/8抽样与成本0不证明留药价值。
- silent-proposal-efd9f83ee9e1a6dc：waiting。账本silent-0079, silent-0176；证据751FN9QM9MHQ。原SL成本经验及预测诊断已有；同局六试后继一起改变，缺原线/换线受控整战和后期独立验证，不设5或10血的探索门槛。
- silent-proposal-131042659448ae74：waiting。账本silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176；证据751FN9QM9MHQ。保守持牌损失、无药参考及毒/荆棘等已有局部事实；缺跨续问整线执行、能力逐轮实际兑现与无药/留药完整支线的联合验收，不能以局部源码关闭整项。
- silent-proposal-990f054036609447：waiting。账本silent-0102, silent-0019, silent-0020；证据KV0JHNJCKXLS。KV0 F33 T5删毒后净伤36→29、两线均零损，次轮毒20→13；毛伤/回血有同帧相抵，缺其余后继一致的整战和未走路线/休息反事实，不能称已证保血收益。
- silent-proposal-e18d3f18e6cac2a0：waiting。账本silent-0017, silent-0250, silent-0011, silent-0027, silent-0046；证据YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。巨兽本体/自爆与残壳饮毒事实已展示，SL仍沿用原始占位血破同轮平局；缺改序后的完整受控后继及最终资源校准，统一置零可能换到更大自爆缺口。
- silent-proposal-9733bb80f445aeae：waiting。账本silent-0017, silent-0019, silent-0020, silent-0250；证据YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。巨兽阶段诊断已有；PU80既有胜线后继也改变，不能证明新参考排序或提前用药有效，缺改序及提前喝/留药完整对照和独立验证。
- silent-proposal-c51468c5e8ba6668：waiting。账本silent-0019；证据KEN58SH9SLZ6。KEN七次饮药动作及槽位耗用已核；发光水重问、随机选牌后的完整候选收益归属和不饮用/留至boss的受控支线未记录，不能由空药栏倒推出持有价值。
- silent-proposal-86a7db08d1a31976：waiting。账本silent-0079, silent-0021, silent-0125, silent-0005, silent-0176；证据KEN58SH9SLZ6。KEN T10多损6血仅多2实伤，T5省2血却将步法T5延到T9；后继抽序/动作同变，缺固定其余后继的整战回放及独立验证，不据此设统一阈值或关闭探索。
- silent-proposal-e282a9131b99129a：waiting。账本silent-0021, silent-0079, silent-0125, silent-0176；证据KEN58SH9SLZ6。原呼唤/无实体/步法经验及预测比较已有；六试属于一局，实际完整后继与独立后期样本未齐，T5与T10的相反取舍不支持通用只保血或只输出规则。

提案原文及各项预期行为、拟合/时间切分、反例、验证和回退详见proposal.md及十份原文副本。后续只在新增完整证据时沿原ID接续，不新增重复提案或关闭量化父要求。既有账本状态、经验和历史claim保持；本次只经root learner/ledger.py update补where提案/报告链接与处置限制，不改shipped为proposed。没有新知识claim需要add，没有新提案需要code_proposals add。

## 验证、失败历史与交付

- audit-evidence.py第3版固定数据审计实际exit0：核6角色局、6同指纹对照、7次饮药、巨兽毒2→8，以及恶魔毛/净分账。stdout/stderr原件保留。这是数据审计，不是生产tsc/vitest或撤源码负对照。
- 第1版因map/route-change元记录没有chosen失败；第2版误将同帧相抵的净血差当毛伤且未纳死亡帧失败。两份完整trace分别保留audit-evidence-first-failure.txt、audit-evidence-second-failure.txt，修正后第3版通过；没有改源日志或游戏代码。
- 一次早期抽取因全文件字符串检索匹配到其他局引用的本批局号而遇到历史畸形JSON（Expecting comma delimiter，column2840）；部分输出evidence-decisions.jsonl保留。改为先筛实际run_id、后解析，外局引用过滤4993条，目标六局均无缺行。另有bubblewrap预检rg历史路径ENOENT失败，重试后同权限执行；无权限变更。
- 无生产源码或知识改动：撤源码失败／恢复通过不适用；tests固定tsc=null、vitest=null、cases=null。未运行生产测试，不冒称通过，也不借其他批次测试回执。
- 没有代码提交，不运行提交前gitleaks／git commit／live合并及行为版本流程。fixes=[]、merged=null；保持原游戏行为。未通知任何规则已上线，未造发布号或shipped。
- 提案绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-201242/learner/runs/20261013-201258-strategy-proposal/proposal.md。报告绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-201242/learner/runs/20261013-201258-strategy-proposal/report.md。结构化回报：report.json；来源清单、日志SHA、源码祖先、审计失败与成功均在本目录。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261013-201242-strategy-proposal",
  "base": "927db5594f57b1895aa5a47b0118a0c5490ad0f1",
  "runs": [
    "751FN9QM9MHQ",
    "KV0JHNJCKXLS",
    "YQL8RZ8BWN1E",
    "L9SGRBB5R698",
    "PU80F84P6HPN",
    "KEN58SH9SLZ6"
  ],
  "fixes": [],
  "skipped": [
    "silent-proposal-366288801d9150d9",
    "silent-proposal-85929bdfc8a3fc1b",
    "silent-proposal-efd9f83ee9e1a6dc",
    "silent-proposal-131042659448ae74",
    "silent-proposal-990f054036609447",
    "silent-proposal-e18d3f18e6cac2a0",
    "silent-proposal-9733bb80f445aeae",
    "silent-proposal-c51468c5e8ba6668",
    "silent-proposal-86a7db08d1a31976",
    "silent-proposal-e282a9131b99129a"
  ],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-366288801d9150d9",
    "silent-proposal-85929bdfc8a3fc1b",
    "silent-proposal-efd9f83ee9e1a6dc",
    "silent-proposal-131042659448ae74",
    "silent-proposal-990f054036609447",
    "silent-proposal-e18d3f18e6cac2a0",
    "silent-proposal-9733bb80f445aeae",
    "silent-proposal-c51468c5e8ba6668",
    "silent-proposal-86a7db08d1a31976",
    "silent-proposal-e282a9131b99129a"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-366288801d9150d9",
      "state": "waiting",
      "reason": "已存在候选资源比较与单步派发回执；缺跨抽牌、弃牌和续问的完整执行归属及其余后继一致的整战对照，不能由T2/T7/T13差额拟定SL血价门槛。"
    },
    {
      "id": "silent-proposal-85929bdfc8a3fc1b",
      "state": "waiting",
      "reason": "持有价值未知与未决弃牌的保守持牌损失已有诊断；F13无药完整实盘、留药至F17支线及后继兑现未记录，8/8抽样与成本0不证明留药价值。"
    },
    {
      "id": "silent-proposal-efd9f83ee9e1a6dc",
      "state": "waiting",
      "reason": "原SL成本经验及预测诊断已有；同局六试后继一起改变，缺原线/换线受控整战和后期独立验证，不设5或10血的探索门槛。"
    },
    {
      "id": "silent-proposal-131042659448ae74",
      "state": "waiting",
      "reason": "保守持牌损失、无药参考及毒/荆棘等已有局部事实；缺跨续问整线执行、能力逐轮实际兑现与无药/留药完整支线的联合验收，不能以局部源码关闭整项。"
    },
    {
      "id": "silent-proposal-990f054036609447",
      "state": "waiting",
      "reason": "KV0 F33 T5删毒后净伤36→29、两线均零损，次轮毒20→13；毛伤/回血有同帧相抵，缺其余后继一致的整战和未走路线/休息反事实，不能称已证保血收益。"
    },
    {
      "id": "silent-proposal-e18d3f18e6cac2a0",
      "state": "waiting",
      "reason": "巨兽本体/自爆与残壳饮毒事实已展示，SL仍沿用原始占位血破同轮平局；缺改序后的完整受控后继及最终资源校准，统一置零可能换到更大自爆缺口。"
    },
    {
      "id": "silent-proposal-9733bb80f445aeae",
      "state": "waiting",
      "reason": "巨兽阶段诊断已有；PU80既有胜线后继也改变，不能证明新参考排序或提前用药有效，缺改序及提前喝/留药完整对照和独立验证。"
    },
    {
      "id": "silent-proposal-c51468c5e8ba6668",
      "state": "waiting",
      "reason": "KEN七次饮药动作及槽位耗用已核；发光水重问、随机选牌后的完整候选收益归属和不饮用/留至boss的受控支线未记录，不能由空药栏倒推出持有价值。"
    },
    {
      "id": "silent-proposal-86a7db08d1a31976",
      "state": "waiting",
      "reason": "KEN T10多损6血仅多2实伤，T5省2血却将步法T5延到T9；后继抽序/动作同变，缺固定其余后继的整战回放及独立验证，不据此设统一阈值或关闭探索。"
    },
    {
      "id": "silent-proposal-e282a9131b99129a",
      "state": "waiting",
      "reason": "原呼唤/无实体/步法经验及预测比较已有；六试属于一局，实际完整后继与独立后期样本未齐，T5与T10的相反取舍不支持通用只保血或只输出规则。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-201242/learner/runs/20261013-201258-strategy-proposal/report.md"
}
```

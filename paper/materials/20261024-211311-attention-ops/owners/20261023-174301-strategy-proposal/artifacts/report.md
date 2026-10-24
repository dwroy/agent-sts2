# 本批普通策略核验报告

记录时间：2026-10-23T18:00:27+08:00（写入前已执行date）。结论：原silent-0579/代码提案silent-proposal-08f9b6f1658b5d7b证据成立，保持waiting，由已有154301候选原owner完成宿主检查与发布；本批无新实现，不称duplicate/implemented/shipped，不新增同题ID。

## 身份、基线和范围

本批20261023-174301-strategy-proposal，learner-batch:c4c03399-a890-493b-b218-a06d706abad1，角色silent。实际learn.json行task/character/worktree/runs核同，reason=tick，无proposal_ids、proposal_repair、research_request、implementation_request。旧deck-size请求绑定另一批，不进入专题；未读其他专题代替身份。本批不声称专题research_complete。

开工git status干净；普通流程git merge --no-edit main返回Already up to date。base/HEAD=0c85d6d9a526264631461fe8cf8221ace499b695。最终保持该HEAD和零tracked diff，scratch为忽略的任务产物。dispatch-readback.json保存本批原行及读取时文件SHA。README、最新STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals已读；STATE的旧STOP停点按其后续更新及最新决定保留历史关系。

仅选fix-queue-v4.md第1574/1576行的原0579核验，未领取其他批次队列或扩展实现。既有五局复盘报告与保存Markdown仅作为定位入口，结论独立seek原logs核SHA；未读取其他角色经验。无网络、LLM、play或游戏二进制调用；未派下级agent。没有可据以核实本会话原生turn_context/档位回执的本批材料，因此不自行宣称档位实测生效。

## 十局核对与机械覆盖

以下每条runs原行均独立读取并核SHA，character=SILENT、ended非空、ascension=10。摘要是事实索引，5,154条决策与5,606条状态的提取不是模型逐条完整阅读。

|局号|终层|胜利|decisions|Jev原row|V6原row|本次完整Jev题|
|---|---:|---|---:|---:|---:|---:|
|4XZHJFMUKDJW|5|否|95|18|0|0|
|XU3M3P5CU3X7|24|否|426|105|0|0|
|C7LERZPCRFZ1|49|否|1062|249|0|0|
|VX6RJ608LR5F|49|否|744|176|0|0|
|UW7X088RVVLR|17|否|358|78|0|0|
|KUHYZBFFLALU|49|是|685|151|7|0|
|QLEGQ76DJ1MN|9|否|120|25|0|0|
|6ANZJ6XRKV4P|39|否|623|126|0|0|
|Q3R929GHT14R|37|否|610|110|0|0|
|HD6BM39PYL21|27|否|431|100|0|2|

完整题面核读仅HD6BM39PYL21的d476130b-6d77-4b70-abfb-6c95e470efe2与ab4dd43c-ba3b-4105-a9eb-6835016b52f0。完整request包括全部选项、survival题、共有开卷对象，answers包括原概率/置信度，error字段未记录。首次工具输出出现展示截断，随后分别读取非开卷完整对象和两题相同的完整开卷对象，未以截断展示充当完整核验。

question-coverage.json逐条列出1,138个原row及身份/原字节引用，其中2条完整阅读，1,136条只做机械索引；具体原因均为本次聚焦0579原已有实现候选，不用于新游戏结论。其他九局Jev完整题面均未读；HD其余98条未完整读。本报告不把最后五条当完整覆盖。其他层/回合的states、brain、run-plans、SL流只提取保留，不宣称全部阅读或从中新增策略。十二条关键states、二十条配置、七条V6、两条Jev、两条decisions及十条runs，共53条原行独立seek核SHA，详verified-refs.json。

## 原问题与可支持的结论

HD/A10/F27/T6，两题chosen与完整decision_id精确相连，均显式run_id=HD6BM39PYL21且fingerprint.run核同，不按正文、时近或question_id相似字符串归局。两条decisions result均completed，gate_reject、selection_dispatch均未记录；不补成整线成功回执。原state指纹、同回合手牌/能量变化分别与两个单动作对应。

|原题/决策|原候选数字|后继原state|已知当前攻击分量|可支持的结论|
|---|---:|---|---:|---|
|d476130b / d497860，选防御c5，confidence .87|5|s516545→516546：挡0→8，污染0→6，意图13→19，HP仍10|19−8=11|少计6；不是实际损血11|
|ab4dd43c / d497861，选蛇咬c0->e0，confidence .12|11|s516546→516547：挡8不变，污染6→12，意图19→25，HP仍10|25−8=17|再少计6；不是实际损血17|

当前live读取源码仍为incomingAfter=max(0, incoming-heldPenalty-blockGain)+hpCost，未计技能新污染；实际live及源码SHA见source-readback.json和live-combat-source.txt。该读取不证明开局源码：十局run-config.code.commit均null，error为spawnSync git ENOBUFS，runs.code=current，不补造开局提交。

原提案期望修正限定Silent A10的单行动当前攻击分量，不删选项、不给药水/SL/终局设新阈值，未知交互保留未知，铁甲及未观察A11保持等价。具体证据、旧/新行为、验证与回退详proposal.md。本批两个技能是一个自然对局的连续观察，不重计独立support或repeat分母；无参数拟合和独立泛化验证。

直接反证：防御题survival原答仍为lethal（confidence .91、probability .93），数字修正不必改变其危险判断。s516552显示本局最终HP0而敌HP22，未证明任何替线可赢。本任务未完整核读提前喝药或改线的其他题，不提出这类规则。

KUHY胜局仅用作禁止泛化的反例：s514521/F49T1以43/73、空药进入女王/聚合体；s514557/T8仍19/73，s514558奖励19/73，s514560的game_over.is_victory=true。摘要终局run.current_hp=0与奖励19分别保存，不能把摘要HP0解释为死亡。未完整核该胜局Jev题，不把其牌值/杀序或终局净伤归为因果；单个胜局不能建立通用安全HP线。

## V6和Jev原始流分别解释

二十条run-config原字段均mode=on、reflex=off、direction_replan=off、admission=interfaces_only、delivered=false。V6七条完整原row全为KUHY F49的projection/card_pick，只有skip的P/D/S/R四entry，target=act3:unknown；win、paired/joint指标等null、trust=unknown、unknown=4/4，jev_answer=null、fallback=null。七条row只有三种question_id，多条不是独立自然样本。没有decision_id可直接证明执行，未凭时间或question_id为其补消费链。

Jev两条原request/answers与V6 entries/jev_answer分别核读，不将V6的null当Jev未答，也不将题面存在当采用或收益。其余九局V6为冻结切点no_match，不能称off、效果为0或历史永久缺流。配置记录on也不能抹去delivered=false与接口准入的限制。construction-log在摘要为missing，而非零效应。其他流本批均有匹配，但不能从此推断未完整读的题面质量。

全源缺口保留：decisions历史invalid_lines=2，identity unknown_identity=1934/unmatched_decision_id=1701；states invalid_lines=2、unknown_identity=3638；brain invalid_lines=2；Jev invalid_lines=1。本批已接收行只用显式run或精确decision链；未归属历史行不按正文猜局，也不把无匹配/未知身份补成零。各manifest incomplete_lines=0，仍不代表历史源没有未记录事项。完整数目/原gap refs保留manifest。

## 冻结切点

摘要、专用V6提证、默认提证分别启动，原日志持续增长；各自source_size/source_sha256保持独立，不把较晚切点写回较早记录。十局所选counts一致。每个evidence原row有offset/bytes/SHA及identity来源，输出SHA和对象存储引用在manifest；只按范围读取，没有整份states灌入上下文。

|提证入口/流|source_size|冻结源SHA256|
|---|---:|---|
|v6-evidence/v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|
|v6-evidence/jev-prompts|3025616498|0fbcf8697868f794d556bf77f11f4eab6b24c5523e30dee5f3069ef4b92784df|
|v6-evidence/decisions|4329586286|f90cb5e4d6d78b6038174b7d7b78cb7b31318fa32bca6144c6b88eda46624793|
|v6-evidence/run-config|2992679|704a292bbe09fc20fad9528b57ef9639fe42a63fa80ced2f6a8a7839e216b3a5|
|evidence/states|16596982536|6a63578ff5f9b1e407eb8eab017e2e312bb0fbef64e94395d9757fc78b02049d|
|evidence/decisions|4329800276|ea602a2a7e31423ac546433b7c70ed2882903f3f51a66e07b11f21535853c24e|
|evidence/sl-attempts|58799596|34315f8f12721243803f06bd5d17fcd3ac0b40234a63b3683329693f31889481|
|evidence/run-config|2992679|704a292bbe09fc20fad9528b57ef9639fe42a63fa80ced2f6a8a7839e216b3a5|
|evidence/run-plans|11613432|96a8d1f2277b06376e12183e0497ee200cbc7204549529e333f3040ca4fec212|
|evidence/brain|1498674654|3b12e9d6afadfc2596274b3fab0eeffa831b79995d825f3267c690347bb5d0dd|
|evidence/v6-build|64753212|1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3|
|evidence/jev-prompts|3026060500|7b526e9e153947e3ed40479c04163c947d0542793d501e01772aeecbe8d40380|

关键引用（完整引用及其source_size见verified-refs.json）：

|源/行|offset|bytes|SHA256|
|---|---:|---:|---|
|jev-prompts/82939|2973939550|19551|c6d5ecf2d8d0c341b53b5bb6952ca7570560429adcdf02ec537b51f376f4cd05|
|jev-prompts/82940|2973959101|19281|7f5b59b4e9f6c1818d3a3c4b633d3fdad6d9efe37729e3de9826dff09db7904f|
|decisions/497860|4248174878|5238|9511055b06333283ef8fd316a8be1d44379ed8d30eb6088c88c830f0ad4137d4|
|decisions/497861|4248180116|5041|3dfef925a6d041d38935c7081c45530877450fd044265a9487ca83812d482895|
|states/516545|16491182306|36720|19ca63a90a3833a74b5363d3fdd508e3fdbe053864fa3fa9080934b6a202f0b7|
|states/516546|16491219026|35814|591bf5067d6fc00bcb00abcb2f4a607ed890a23397d52d5bb1b01387e585fca3|
|states/516547|16491254840|35113|337a1992c5a7b417aba7a6c63cdcaee46d9f01eb7cf279c9c74ebbe7cf1a6aaa|
|states/516552|16491430720|31414|1af0c5ec1b09f5e93445176866c7de61beae93dba79acfe0fe18c935f9fc7ca7|
|states/514521|16433170190|40441|c1bd18ce8b5469d084d7268b2ef94cbbb4647dbcd2eae9c177c24a53418dda60|
|states/514558|16434909578|33403|007be143f8eefb77a322b5068819e01a12f88f95d363e2c4e0c49be20a92ae14|
|states/514560|16434974218|31221|364576e9a56f66fc43e80bb3c5047f65f8828d12ac8d0f2e1c972c36c0ee3cd6|

## 原候选处置与测试

原交接paper/materials/20261023-1637-ops/host-check-handoff.json已实读并保存其SHA；原candidate staged tree=1794ba1c37aadd6fc14a8c2d7de359fe8e3695de。三个实际文件均存在且与交接SHA一致，详existing-candidate-readback.json。原交接要求原ops/集成员协调现有完整检查窗口，不能重复实现/学习；本次不修改原候选树、原Markdown、原提案ID或原领取状态。

0579原154301三叶候选已冻结且实际SHA核同；原完整沙箱45失败无终局回执、source_commit=null、尚未live，缺原宿主精确组合完整检查exit0与实际发布祖先提交。沿原owner接续，未重复开发，不能标duplicate/implemented。

原source tsc0、定向9过、撤码3败/恢复9过是原批历史，原完整45失败无终局同样保留，绝不改写为本批通过。当前live=2faa7ead017b977051b317355e352aa229b1344d仍有旧算式，未发现可据以登记implemented的实际修复祖先。最终proposal_results只给waiting，不提供虚构commit。

本批未改生产源码/知识/模板，无撤码试验、tsc、vitest、源码提交、live合入或eval版本；tests固定null。无需触发代码提交/合后测试，也未重跑完整套件或修改排除名单。scratch内audit.py/finalize.py是可复算材料，不是生产提交。没有新规则上线，因此不制造decision-log上线行、shipped或Roy规则变更通知。账本只经根目录ledger.py给原silent-0579追加本批追溯，status=proposed、by=learner:strategy-proposal，不重复登记同一局为新证据。CLI输入/回执/读回见ledger-*文件；既有原代码提案作为code_proposals链接，不另add同题。

原owner完成完整检查、真实提交、live精确发布及自然消费者验证后才能改变处置；本报告、提证和已存在候选不证明正式发布/下一局消费/胜率收益。科学父要求不关闭，无新游戏知识入库或大脑自然采用声明。

## 交付

proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-174301/learner/runs/20261023-174307-1c30415f-d53c-4c68-ac9e-67228d7f82c1-strategy-proposal/proposal.md

report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-174301/learner/runs/20261023-174307-1c30415f-d53c-4c68-ac9e-67228d7f82c1-strategy-proposal/report.md

结果JSON：result.json。冻结清单：evidence-summary.json、两套evidence-manifest.json；逐题覆盖question-coverage.json；完整关键原row/53条seek核验selected-*.json及verified-refs.json。无tracked差异证据为input-source.diff（0字节）及source-readback.json，最终现场验收与脱敏扫描回执在completion-check.json和gitleaks.log。工作树不自删，交原调度器按保留门处理。

# 静默猎手指定十项策略提案复核

记录时间：2026-10-20T22:55:44+08:00（写入前已运行date）。

结论：十项均保留waiting。本批完成身份、原提案、V6/Jev机械提证及有界原题/执行/后继复核，没有新策略常量、源码、知识发布、提交或live合入。旧实现与剩余宽项分开；没有把缺反事实视为已证明另一选择更好。

## 身份与基线

- 本批 `20261020-224301-strategy-proposal`，task=strategy-proposal、character=silent、reason=proposal，工作树与派发精确匹配；proposal_ids十个、无proposal_repair/research_request/implementation_request。保存原对应行dispatch.json，不读取其他批次任务。
- 普通批次只读根notes/strategy-research-silent.json；它绑定20261010-150327而非本批，因此保持普通已领取任务，没有借其他研究请求选题。
- 开工git status --short为空，HEAD=ed8bb3aca8376bd196b3e878418b37280ee92de6；git merge --no-edit main返回Already up to date。没有更新为后续main。
- 已读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol和learning-code-proposals。STATE的旧停用记录由其后续追加及decision-log保留时间边界；本批没有操作对局/STOP。
- 六条runs原始结局均为SILENT/A10、ended非空、victory=false；不将多次SL当独立局，不借正文提及/相似question_id/时间邻近建立身份。
- 三份仍在原路径的提案已核原SHA；另七份从retention归档按已登记SHA恢复到本批scratch，归档整体SHA和成员SHA均验证。proposal-recovery.json保存63条重复归档定位，proposal-recovery-unique.json按七个原id去重；不是63个新提案或样本。没有恢复整工作树/源码副本或改原提案。

## 原始证据冻结与身份

先运行根learner/evidence_summary.py生成evidence-summary.json，再用本树extract_evidence.py运行指定v6-build/jev-prompts/decisions/run-config；另提取states/runs/sl-attempts/run-plans。耗时提证入口用nice -n 19，最多三个独立分析进程，无游戏/网络/LLM/二进制读取。摘要SHA为21bc2badc7e2c73c6e94f6a875a263ba02d9c366dce89d3779fcf7a34419f779。

|流|冻结字节数|冻结前缀SHA256|本批选中数|无效/截断行（全冻结流）|
|---|---:|---|---:|---|
|v6-build|64641643|ced63480823f99d8b69ff61b29ff95b1b3bfa1223d2fb329face70cebee30d54|0|0/0|
|jev-prompts|2196374067|ad8b1dcd6fa9f60cc2653b046eac5c11ca3013c8c8a9860600a379d2e0d9d1b5|579|1/0|
|decisions|2992220221|921b86c32426a7fa4c22c2ea71cc1a4ac15d618511ec8858bd20f50127557b5d|3306|2/0|
|run-config|2252639|00c18b4795335c71de7e3faa4a06d24163515c440acc6e7e85ecf9836ccf4c33|6|0/0|
|states|14751061197|873753a8bf393e1824848b4e4882659406c1c5be76887605057d435ad6cd80f1|3432|2/0|
|runs|391047|3d7bbfe4f2c06453f3aacf9aad0e535279877f1a01454609a2c9b68826d1cbed|6|0/0|
|sl-attempts|50074235|d3c81132b9f28958e0696f6e9b8a6a19f818a76b6aa541369f46e1a6225ee858|29|0/0|
|run-plans|10132773|c3077d12d652dbbf79893616c416328af39f45ebfb87c858c58aea6da906bad4|33|0/0|

两次入口切点独立保存：摘要decisions=2992141644、Jev=2196207757；v6-evidence的decisions=2992220221、Jev=2196374067。日志继续追加造成切点不同，不拼接成同一SHA；本批匹配计数相同。runs摘要切点390561、后续提取391047，六条原结局offset/bytes/SHA均有各自出处。

v6-build在64641643切点有599条全流原始行，六局各0匹配，属于no_match历史缺流；本角色/本批没有相关V6原始row可读。六份run-config均无V6字段，因此开关是unknown，不能以无字段报V6 off。entries/jev_answer/fallback/unknown四类本批语义均不可测，不能将0匹配当0计算/0采纳/0错误。

Jev共579条，逐行通过显式run_id及decisions的精确decision_id交叉核对；本批均含request、answers，原row无error字段。机器字段存在不证明全部执行成功。全流一个无效Jev行保留在manifest，不归入本批，也不抹成零。decisions全流1934 unknown_identity、1401 unmatched_decision_id；states全流3338 unknown_identity均不收作本批事实；全流无效decisions两行、states两行保留，不从末五个缺口索引外推身份。

manifest中的content.pending_host_seal=true、deferred_errno=18保留：本地证据文件与逐行原字节SHA已经核对，共享对象宿主seal仍待原调度器完成；本批不冒称宿主封存完成。

## 问题覆盖和原始链

13题完整题面（含state、所有合法候选、unknown/rollout/预算限制）及answers已读；selected-raw保留原字节。为节省重复读取，*-request-factored.json仅把每个选项共同的完全相同字段移到criteria_common_fields；*-incremental.json按明确base_decision_line列state移除键和完整替换值，均为可逆表示，未删候选/题面字段。被截断的工具显示另以有界窗口续读，未将截断当完整覆盖。

audit.py对所选题和decision从原日志seek(offset)/read(bytes)核SHA及JSON完全相等；state_windows.py从run_id+精确observed_ts+相同fingerprint定位唯一原状态，再按实际后继截到下轮，未靠时间邻近归局。核13个题首、51个去重动作、63个去重后继状态；77为重叠窗口累计数，不能当77个独立状态实验。

|局号|decision原行|Jev原行|完整题数/匹配数|未读题数|
|---|---|---|---:|---:|
|VLZ6CCT8AQ0A|269706,269707,269748,269754,269770|27083,27084,27093,27094,27100|5/136|131|
|8JRE1C4H4Z2W|270216,270264,270282|27175,27191,27194|3/139|136|
|CA5KE8GFJ9X2|267379|26720|1/58|57|
|5PM6JAQG6FNQ|268455|26880|1/92|91|
|61E2QS63Y9WU|267612,267696|26756,26771|2/70|68|
|DUZUBAJ3A8GP|269068|26966|1/84|83|

其余566条只机器索引/身份核验，没有完整题面/后果阅读；不把它们或摘要末五条当全面覆盖。CA5 F13 T5、DUZ F30 T6没有本次所需的Jev原题，以T4/T5原题及代码/状态后继核结局，缺题不造题。十五子项未逐一完成当前生产调用校准，历史原文的其他支持局不计本批新验证。逐题identity、offset、bytes、SHA与decision_ref见selected-question-refs.json；所有579条（包括未读项）见question-index.json，逐局覆盖见coverage.json。

|decision原行|Jev offset/bytes/SHA256|decision offset/bytes/SHA256|状态原行窗口|
|---|---|---|---|
|267379|385441212/8869/df5c7ab4a5610d09edf0efd76dc8cb7ebc4827a07c94458533211be8dd1b2014|672922396/5539/554b9f7bd6ac2762c7bf7b6aea835d9542ad9b317f2dfac39266c30d17202534|273261→273263|
|267612|385829705/11501/b9ff2be68c133443e5547b941dcdf8e9a9a3448a56dcdda63bd58210b0455ae2|673648964/7874/3fe4f337250c4c9166b60bb42e076f42226bef87a06db3aeb2e0e7c26f1ca9cd|273504→273508|
|267696|386041565/19778/25a6205522e0453bd5e1c93c4b18f3da5ca2ad6226433a00ab0014906587f823|673937692/15293/71de3eb698805fe62603f6152de4891217957eb0540847271c75fb0ba08b8c08|273593→273596|
|268455|387606289/22461/909c3a15e3c2fddfcbc5e261ac2c004c5d9cb577cb8b4f9d596dec1076fd8c71|676536486/15134/923863cea64a0ee51b98521063af1fa88ab21cf5d04fc7000067996a29c001e9|274379→274384|
|269068|388821681/13407/7000a27884c87dcba06d4fcecf1b87ac66ed1786f6eb11f823fd499569987fb3|678453754/5757/43674f9b4424e6db0663a89c6104f2a168bc49961060f5aa2917d78ed758483e|275013→275018|
|269706|390165294/25726/1f362c8fa55bfc679529011601e5a315a1c92b63998782692cd72e2a9c593421|680675964/21597/9838ff71466dc84384d713dc1796a442ce83cd5c3d5e138bcfd18960bc838f85|275679→275687|
|269707|390191020/13409/452f8156db235d64762ef92c619eac5ed5350e5b61d67463261658dca6b513a5|680697561/9310/7647c72c7057fb5c4a4c467769fa817f2befb07a9fc583f7f925b612ac8b855a|275680→275687|
|269748|390280157/22106/3f0b05a04d3eabc7476a0f94abec7c604cbc4999ab1cda0da7d9df11b853e0bd|680857156/18087/1afeb12e4372c954f4767aaa09b48f86f4707dd7bb8a69bda4a8f5abaf7ad1ed|275722→275733|
|269754|390302263/14559/a68e165725cedadb2dd49ecd2ba4327e1041ef59dc2208221753a91db411531b|680883427/10307/cc4ffbe6dfa57a182fc9134ceef2a15c3dc898a357e0ea354e965787cf392193|275728→275733|
|269770|390382440/16559/b38bfc557589cea24a7a8ee586d8b75b772169879728588dfa18640541bd6d38|680952535/12015/baedc62762afc25738c4246e55e6f44f22dda7a17e3649d794784bcde3dc26d2|275745→275748|
|270216|391259703/13269/d912a7b169c133b1816513190ca11bc4c110db2efc88e10f99aec2c76ab3ae17|682520036/9787/0082da04fe05a5d3b8bfbb3e590dc2288fe41c8e6f70e4be643b95aa082d582e|276208→276212|
|270264|391466909/18888/ffb5ec7923c0cc153bfc271290bdfa9387138dccb5810974087bad8e1ded1902|682699923/13471/0513fd38df201008cb4e67a6b85dce3fe53563885a49c1720a44f517751f92be|276256→276259|
|270282|391510246/18141/94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09|682749244/12686/721f1ef7b80a307741e97b8cf9ab47d6ef03330053a3d1e9051127cc2108f5df|276274→276278|

所选13条decision的result均为completed: Action completed.，gate_reject、selection_dispatch字段均缺省，逐条以<absent>保留，不填false或空成功派发。chosen只是首个动作；后续51个动作的expect/chosen/result/缺省字段及状态逐步另存state-windows.json。没有把Jev选择整线等同于整线完成。

## 从原链核到的事实、反例与未知

1. **VLZ F43 T1，silent-0237/0238**：d269706原题plan1含神化，预报43伤/损14且神化unmodelled；原答plan1，chosen实际神化成功。s275679→275680能7→5，手牌升级；d269707完整重问同后续序列51伤/损13，原答plan1后动作269707—269713完整，s275687为77血/敌203（开90血/敌254），实际兑现。两问同一战同一局，非独立样本；F43仍是失57血胜局，不能据这8伤/1血差宣称整局转胜。
2. **VLZ F45 T1，silent-0106/0019/0201及0237/0238**：d269748原答plan4（不含神化）；MC1/12、707ms，rollout horizon1/samples1/best=null；题面明确fallback不是forecast，不能说所有候选确定死亡。d269754后题MC12/12、11ms，原答p0、chosen真喝CURE_ALL；s275728→275729能1→2、HP67不变，抽到TOOLS_OF_THE_TRADE/SURVIVOR后重规划，d269755/756实际打出，神化未实打。s275733仍67血、敌88/97/89；不能把第一题65血预测当实际结果，亦不能把药水中位样本当实抽。
3. **VLZ F45 T4/T5，silent-0106/0005/0046等**：d269770有四候选；三攻击线32伤/31损并列，原答plan1为24伤/13损；实际d269770—772后s275748为32血，敌24/80/77，吻合所选这轮。未执行攻击线不能当少8伤败因。附加状态s275748→275754：四攻击段总83→59，减力各6；覆甲已无，32血20挡仍缺7，末敌均未被实际减员。后续毒/敌方结算不预支。
4. **8JRE F33，silent-0079/0021/0125/0018**：d270216首试T2与d270282第三试T2原fingerprint相同。第三试Jev仍答plan1（3损10伤、rollout死亡0/24），SL明确改plan2（15损17伤、5/24），不能称死亡率相同。实际s276208→276212损3/扣10，s276274→276278损15/扣17，多12血换7伤，原答/替换/实际分列。第二试d270264原答plan4，HP guard改plan6，候选省12血少18伤；实s276256→276259损4/扣25。两类替换不同，均不能推导取消护栏/禁止SL。
5. **CA5 F13，silent-0005/0231**：d267379 T4选打击、两个候选rollout并列；实28→22、HP2不变。额外原状态T1/T3/T5力0/4/8、攻击11/15/19，弱后T3/T5为11/14；T5仍增长，不将临时虚弱当取消成长。本局没有正敏捷建立，计划要步法不等已获得，不能补正敏捷路径。
6. **5PM F39第二试T2，silent-0021/0009**：d268455原答plan7后首派BUBBLE_BUBBLE；s274379→274380能5→4、两敌HP35/72与零毒均不变。后续双防御/打击等同时变化，整轮s274384为8血、敌24/68，题面6伤并非全轮实扣（另有被动/敌方结算）；不把整轮差单归冒泡。缺相同资源、已知完整抽序和另一启动顺序的整战因果对照。
7. **61E F17 T6，silent-0030/0027**：d267612原答plan4（双防御+尖啸），s273504→273508挡0→3→6、敌67→34（毒17+16），玩家56→48，负敏捷−2在原题及原状态一致；另一攻击方案未实打，本局首试胜不验证别局SL范围。
8. **61E F23 T4，silent-0039/0209**：d267696原答plan3、本体线猎杀者+/杀灭成功，s273593→273596玩家25→10，本体76→41、幻象14→2，合净扣47；幻象未被杀且继续攻击。原题有39伤零损的幻象线但未执行，不能以它证明整战应强制首杀；召唤、航行、复现全链校准仍开放。
9. **DUZ F30，silent-0128/0079**：原状态睡3→2→1，T4醒后攻18，T5力2攻20，T6恢复/成长力4攻22。d269068第四试T5原答plan1、实际防御/毒药/尖啸/蜃景，s275013→275018保持HP1、敌甲虫71→59；题面17挡但实际s275017为22挡，预测11伤与状态净扣14（含丝虫退场）也不相同，保留误差，不抹成完全一致。旧dirty输入与当前源码未构成一组固定生产重放，不能直接标当前bug；另目标/同抽换序全链收益未知。四试只是一局。

没有使用请求中嵌入的历史其他角色药水统计作为Silent证据；它们仅原样保留在完整原题。旧题面的知识前缀不是本批独立验证，也不据其牌值/目标建议新增经验。所有结论限所列Silent A10窗口；未知进阶和无关角色保持原行为。

## 逐项处置与已有源码边界

只读live快照：048a9713bd4be09ad5f6d3f6131e8b729f51aece。六个相关源码叶与本树字节相同，SHA见source-readback.json。神化普通传播源码772b839f8ada31664cb764ea9ad3bdb03da27f64、候选事实30ec2425012eea75f41226b31d8180b1abb837bc、升级神化a46239a29c3109ff9f69224ad77128d9929d3e9a均经merge-base核为该实际live祖先。它们仅是已存在子项，不是本批提交。silent-apotheosis-reference.ts仍明确actual_cast_this_fight:null，rollout/turn-solver的apotheosisApplied是候选模拟状态，不证明真实本战施放身份或所有未知交互。没有用局部祖先替整项登记duplicate。

|原提案id|证据局/账本|处置及缺口|
|---|---|---|
|silent-proposal-89354805ee4d7e77|VLZ6CCT8AQ0A；silent-0237,silent-0238|waiting：神化同线/后抽升级已有live祖先实现，但当前actual_cast_this_fight仍为null；缺跨重问、抽弃和SL的持续实际施放身份与完整未知升级交互读回，不能把局部实现登记整项完成。|
|silent-proposal-f2bfceddb1898dca|VLZ6CCT8AQ0A；silent-0106,silent-0019,silent-0201|waiting：已核首题MC 1/12耗707ms及后题12/12耗11ms；缺同起点、冻结随机池、同总预算的分配配对和成熟度曲线，不能用旧dirty树两次不同局面拟合预算或药价。|
|silent-proposal-283a164780d11e69|VLZ6CCT8AQ0A；silent-0237,silent-0238|waiting：与89354805为同源神化要求，原经验/账本链已核；已有升级实现未覆盖本战实际施放身份的完整消费者验收，保留同一缺口，不能仅因同源而报duplicate。|
|silent-proposal-ebbfe3b97548756d|VLZ6CCT8AQ0A；silent-0005,silent-0016,silent-0049,silent-0071,silent-0143,silent-0046,silent-0053,silent-0027,silent-0011,silent-0021,silent-0106,silent-0204,silent-0020,silent-0019|waiting：十五机制/资源子项的原文已恢复；本批只核指定F43/F45窗口，未完成每子项升级、期限及战斗/路线/休息调用的联合固定校准，无整项live实现证明。|
|silent-proposal-e5b87be50f28f311|8JRE1C4H4Z2W；silent-0079,silent-0021,silent-0125,silent-0018|waiting：已核Jev原答→HP护栏/SL替换→51个去重派发动作及63个去重状态窗口中的相关动作；缺跨抽弃、重问、选择、药水、SL全过程的完整候选归属/生产消费者校准，单局不能改阈值。|
|silent-proposal-49632bc4878fb597|CA5KE8GFJ9X2；silent-0005,silent-0231|waiting：CA5 F13当前力量/虚弱/成长可核，但本局没有实际建立的正敏捷；缺四路径同一冻结调用输入及当前源码对照，不能由一个步法实现证明整个复合要求。|
|silent-proposal-66532328a585941f|5PM6JAQG6FNQ；silent-0021,silent-0009|waiting：已核5PM F39第二试T2对无毒目标冒泡消耗1能、敌血毒均未变；缺同资源和完整抽序的启动顺序整战对照及可复现收益函数，不拟合启动权重。|
|silent-proposal-43a76a31ba7bdcfa|61E2QS63Y9WU；silent-0030,silent-0027|waiting：已核61E F17 T6负敏捷下双防御各3与毒17+16；缺同起始HP/构筑/抽序的另一条完整SL对照和当前生产联合校准，本局首试胜不能推出SL偏好。|
|silent-proposal-5264153a4a4b0e5c|61E2QS63Y9WU；silent-0039,silent-0209|waiting：已核61E F23 T4实际本体线47伤/损15、幻象余2继续攻击；另一39伤/零损目标序未执行，缺召唤/航行/复现/退场全过程当前生产校准，不规定首杀。|
|silent-proposal-bddfa690a84e03d0|DUZUBAJ3A8GP；silent-0128,silent-0079|waiting：已核DUZ F30睡眠/醒来/恢复成长及第四试T5→T6；历史预测17挡实得22的偏差保留，未证为当前源码同一缺陷；缺同抽换序完整后继与失血唤醒/眩晕接续联合校准，四次相关失败不拟合血价。|

神化两个同源id保留各自来源/经验链，不新建id或重复实现；本批没有实现/duplicate的完整源码证据，proposal_results均不带伪造commit。对于机制子项，缺另一赢局不等于不能修纯模型bug；本批的限制是尚未证明当前完整调用在已知固定输入下仍有哪一项可定位偏差，不能把旧版错误、缺消费者和收益未知混为已完成。

## 验证、账本与交付

- 新源码提交：无。fixes=[]，merged=null；本批无release_id、无shipped、无新规则通知，不执行live合入步骤。
- 没有生产源码变更，tsc/vitest/cases均null；撤源码失败/恢复通过不适用，没有借历史测试报本批通过。运行的Python是机械原字节核验，不是策略收益测试。
- 原学习条目通过根learner/ledger.py update追加本批报告/提案链接和复核限制，不重复计同局支持数；proposed条目保持proposed，已shipped历史不降级。请求及CLI回执保存ledger-updates.jsonl、ledger-receipt.txt；CLI失败如有原样保留，不冒称登记。
- 原代码提案已实际CLI登记，本批code_proposals列十个原id；没有创建新提案，implementation_domains=[]表示没有新增领域实现。父经验/策略要求保留，后续待新增本角色证据及当前生产固定消费者校准。
- 报告和所有过程材料都在本批scratch；不提交过程副本、不修改源码/知识/任务模板/原请求/其他角色/运维prompt，不推送、不运行play、不新增代理。
- 临时核验曾因decision无decision_id触发KeyError；随后过滤缺省id并成功重跑audit.py，失败原工具记录保留。未将失败输出当已提取或已验证。

最终机械复核见completion-check.json：26条账本追加已从实际根账本读回，7条proposed保持proposed、19条shipped保持原状态；八个提证产物的输出SHA全部复核，六条结局和六份run-config原字节再次核同。HEAD仍等于完整base，git status --porcelain为空。此验收是本批有界复核交付，不关闭十个waiting父项。

运维交付：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-224301/learner/runs/20261020-224306-69bf1840-bab9-40d8-8509-f7753fea9d84-strategy-proposal/proposal.md；最终机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-224301/learner/runs/20261020-224306-69bf1840-bab9-40d8-8509-f7753fea9d84-strategy-proposal/report.json。实际入库、消费者读回、自然收益及共享对象宿主seal均不由本报告代验。

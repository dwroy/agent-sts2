# Silent 策略提案批次报告

记录日期：2026-10-20（本次写入前已运行date）。

结论：十个派发id全部waiting；fixes=[]，merged=null，无源码/知识修改、无提交、无新eval发布、无实际上线或自然收益。本批补齐机械提证和有界原文核验，保留科学父要求。

## 身份与范围

本批为普通队列消费：learn.json对应task=strategy-proposal、character=silent、reason=proposal，工作树精确匹配；领取十项proposal_ids，无research_request、implementation_request或proposal_repair。不借用另批state=running的旧专题；notes/strategy-research-silent.json的batch为20261010-150327，条件不匹配。dispatch-identity.json保存本次对应行。未派子agent。

开始git status严格干净；git merge --no-edit main返回Already up to date。完整base/最终HEAD均为`ed8bb3aca8376bd196b3e878418b37280ee92de6`。遵守未联网、不play、不读游戏二进制、只读logs。模型自身原生turn_context/请求回执未在允许输入中取得，不把对局run-config中的brain high当本学习会话档位生效证明。

README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案协议已读。STATE的历史停点与10-20后续日志并存，以后续原记录核现状；本批不操作STOP/对局。

六局runs.jsonl均显式run_id、SILENT、A10、ended非空，胜利均false。原始outcome逐offset/bytes/SHA读回，见runs-verified.json。源原始runs截点390561、SHA a959b3ee92b9d0504f4dfc45289b7d24bf20584c550cf39ee5cd403c5127212a；不把六锚点当全历史。

## 原提案恢复

十项已读专用队列折叠记录及完整原Markdown。四份原路径存在且SHA一致；另外六份原路径缺失、HEAD精确路径未跟踪、共享内容对象未命中。继续查retention manifest，找到20261017-201301-s2归档中的逐文件登记，先核归档SHA 7d587aa3d277696e2e7ebbc110f7bd998e1a3be861148bde85bc9363a5dbade7，再只读指定tar member，向本scratch保存六份精确字节副本，逐SHA与队列一致。没有展开仓库或恢复/修改旧工作树、任务、线程、账号。原件恢复来源及member在originals-verification.json，检索结果archive-original-search.json。不能把初始路径缺失继续当证据不存在。

## 提证冻结切点与缺失

先执行指定根evidence_summary.py，产物evidence-summary.json，SHA ee7a6f62141d1d5437e307392b49e5f2162a42078960fdd936c4abbc2ed974fb。该文件仅事实定位；未将last_five当覆盖。之后按任务原命令完成v6-evidence四流及evidence默认八流提取。两次提取在相同实际冻结切点；摘要更早，decisions摘要2992204332、Jev摘要2196338088、V6摘要64641643，与后来提取的增长分别保留，未覆盖旧截点报告。未声称重核某个未提供的历史run-plans旧截点。

|流|冻结字节|本批行数|源SHA256|
|---|---:|---:|---|
|states|14750496279|4062|9dd0e02c6eac39dcd547e093b5bd21e1c3f040e7ff2b80bd812981003d98191e|
|decisions|2992314407|3941|41101b29c0e42d602a495a1ec5a8dda8d733bee43a9a16bfdb4e5400eaea4b3d|
|sl-attempts|50070563|38|81e15f49a52b215d435001159536191df0b057639d7aa34c46c5908df8124ecb|
|run-config|2252639|6|00c18b4795335c71de7e3faa4a06d24163515c440acc6e7e85ecf9836ccf4c33|
|run-plans|10132584|33|cf7db89009df7d3dc26efd0e92353aeb796dd0246185d6ab7ebf8d2da00c0a46|
|brain|1123585710|188|9df7b2710dc9440a2f0c1bf778d8051ec86c54267ddc564cdbea391e12beb079|
|v6-build|64642183|0|fdb721514085f453eadb242f5cf44416640dad0b7f7e6bbc75ca790460e973a1|
|jev-prompts|2196530388|811|714514a782bde99d729466abb20e0cc47828e2f649a5265bf7ce0dac7eb89f38|

每条产物保留source_size、原始line/offset/bytes/SHA256及identity来源；完整manifest已实读并在报告生成时逐字段使用。源全局invalid：states=2、decisions=2、brain=2、Jev=1，截断行均0；具体gap refs保留在manifest。decisions全局unknown_identity=1934、unmatched_decision_id=1401，states全局unknown_identity=3338；有限gap_refs最后五条不能代表未知身份全集，这些行没有被分给本批。所有选中Jev811条均explicit_run，另以精确decision_id核原decisions；不采用正文提及、相似question_id或时间邻近建所属局。

V6-build文件存在且600原始行已按冻结前缀机械扫描，本批各局均no_match，不是整个源缺失。六份10-07 run-config没有V6字段；这是历史无匹配/缺字段，不能声称存在明确V6=off配置，也不能倒填现在的on/off。无本批V6原row可精读，entries/jev_answer/fallback/unknown各状态均不可判定，而非0条机制/收益。历史缺流与无匹配分别解释。Jev独立811条均answers存在、error字段未见（机械字段检查）；仅精读九题，不能据此推811条执行成功。

提取器content回执均pending_host_seal=true、deferred_errno=18（跨文件系统hardlink递延）；本地.evidence只读视图存在且SHA可复核，不冒宿主已完成对象封存。此限制不影响本次直接按源字节核验的九题与65帧。

## 原文覆盖与实际后果

九题完整读取了request模型、state、全部questions.instructions/criteria、answers及错误字段；部分长题分两次读state与全部criteria，无缺项。question-coverage.json逐题列全811条身份与原始ref，full_read=true仅9条，另外802条完整题面未读、原因均保存；它们只用于机械计数/身份核对，不支撑机制/收益结论。对应9个decision与窗口64条decision均按原字节SHA读回，65帧state按精确observed_ts+完整fingerprint定位起点并核原字节；窗口至首次换轮/层或战斗退出，末帧只作边界，若含下一轮decision其动作不归于前一轮。全部chosen/result/gate_reject/selection_dispatch存在性逐项保留：窗口64条result均completed，gate_reject/selection_dispatch字段均未记录，不能把缺字段当明确未拒绝或已完成新式审计。

原始精确字节九题位于selected-raw/jev-*.json；关联decision原文为decision-*.json；每窗完整状态/decision对象另存window-*-states/decisions.jsonl。question-audit.json保留结构化原字段及所有ref，audit_evidence.py可重跑核原日志SHA。

|Jev原行 / decision原行|角色局/层/回合|实际观测与限制|
|---|---|---|
|26719 / 267377|CA5KE8GFJ9X2 F13T4|答plan3（模型8伤、0损）；先翻越/一拳，267379另题加打击后实敌36→22。下一轮力4→8、19攻，不能把14净扣全记原plan3。|
|26869 / 268390|5PM6JAQG6FNQ F38T4|答plan2并切割/步法/防御/匕首雨，敏2→4、挡9、HP31→27。爪牙退场、组装师index1→0；敌净扣含后续结算，不直接等于题面37伤。|
|26880 / 268455|5PM6JAQG6FNQ F39T2第2试|答plan7，咕嘟/两防御/打遗忘，负敏−2下逐次3挡，HP29→8；之后力敏抢夺与返还未全复核。|
|26926 / 268881|DUZUBAJ3A8GP F27T2|答plan6，两打击中和后268884新题加防御；污染3、弱后攻击9→12、挡5，65→58，实损7而原线预测9。|
|27175 / 270216|8JRE1C4H4Z2W F33T2首试|答plan1，逃离加沙坑、刺击施3毒、尖啸临减6力，18→6攻击、3挡、47→44、敌326→316。不是其他尝试的0/24与5/24题。|
|27478 / 271309|YF0LXT1QSTGG F48T1第2试|答plan5；重规划后实际建3/4敏、三技能敌力9，31挡、27→27、敌111→66，实际净扣45而原候选54。|
|27484 / 271348|同局同层同轮第3试|与上题fingerprint完整相同，也答plan5；sl_explore换为少挡线，记录候选0→10损/54→36伤。271354新题end_turn，实27→18、敌111→73：多9血价少7净扣。同存档只算一个相关配对，不是独立胜率样本。|
|27510 / 271502|YF同局F48末试T5弃牌|答card1弃防御，chosen/result完成；本来13挡，后防御到23；刀舞耗1、四小刀各净9，197→160；第三击敏5→6不倒补挡，触媒2但零毒；44攻击需损21而仅18血，终局死亡截断，不能把实际18当完整需损。|
|27678 / 272213|XP2SL33HT0D9 F33末试T4|答plan3先肾上腺素后272214新题重规划；实两步法、打击转向57→38、中和弱38→28、偏折6挡、匕首雨及毒，33→11；不等于原plan3整线完成。|

九题的完整原始offset/bytes/SHA与明确身份出处如下（表中J/D/S分别为Jev/decision/起始state）：

- 26719 / e2beebbf-99bf-4612-8da3-844a88b3d7ad：J offset=385432356, bytes=8856, SHA=5de14255fbb805067c6d702e8c1d31f61bbcc5043a1a59988135e1f2197f4f84; D offset=672915234, bytes=5614, SHA=83919781b4c7a5147d74df95bc7a34ae0d3a598e2a560dc7a264e55ee9e2cd7d; S offset=8410351734, bytes=29732, SHA=cf4318c8f2758384d21cf16a9b7be98af886a3bae4cd55571f904cff3b0e1014。后续全部state ref见question-audit.json。
- 26869 / a108eb5e-509f-48db-9028-c4a9bc386797：J offset=387403992, bytes=15822, SHA=ec96a723a18f9cedbcf8fd5a3976fee2e8fc309cac2abef93e20becf2cf36297; D offset=676307151, bytes=11082, SHA=5851e8e426c9353d4bdb9e5c99d5c274931d34ace703fa936200bb97e08157fb; S offset=8442455235, bytes=48733, SHA=f3c2d98c803192988440a592954339a70ec98e1f1b31850d8126f85f3d4a0e08。后续全部state ref见question-audit.json。
- 26880 / 397711ec-b2e8-4554-a868-d1db0bf143b8：J offset=387606289, bytes=22461, SHA=909c3a15e3c2fddfcbc5e261ac2c004c5d9cb577cb8b4f9d596dec1076fd8c71; D offset=676536486, bytes=15134, SHA=923863cea64a0ee51b98521063af1fa88ab21cf5d04fc7000067996a29c001e9; S offset=8445489179, bytes=47212, SHA=339930f8e12551606adebfd1276a363770defb524bbb995add9792d897fccd99。后续全部state ref见question-audit.json。
- 26926 / 06c4b027-ce0e-4253-9796-a0313ec1a79d：J offset=388201781, bytes=13382, SHA=4fd066a3d5476cd1c56abb7b62222ec80167e2da6127cf37315ef32ba8a2d625; D offset=677763618, bytes=9704, SHA=45267a48919e67098adf744673922117c5e39ff05a6a99036d3a3ff270757455; S offset=8458944284, bytes=43503, SHA=c4c81a8c67ad1450cf3c04c8443418a4fda06ee1d4b0a51aca909c64254d5d04。后续全部state ref见question-audit.json。
- 27175 / bc75ba70-96d4-46c3-b83a-5b2a240adab3：J offset=391259703, bytes=13269, SHA=d912a7b169c133b1816513190ca11bc4c110db2efc88e10f99aec2c76ab3ae17; D offset=682520036, bytes=9787, SHA=0082da04fe05a5d3b8bfbb3e590dc2288fe41c8e6f70e4be643b95aa082d582e; S offset=8506061478, bytes=45041, SHA=01b59ee58a8c711859a1eac3e1442fc5237fc568dfe7000d5d583fd401852498。后续全部state ref见question-audit.json。
- 27478 / 15e91299-fbd2-4ff6-8a93-3e4f4c126052：J offset=394892319, bytes=24840, SHA=bf69b92a5c83021cc2d73e6f511041241f69ccc74bf9f3ea52d59d1fdfacc85b; D offset=686513820, bytes=18839, SHA=10ddc3c21bfcd43194a4d40fb8be58c89abe1aab08c8d62dc955893962f404a3; S offset=8547528472, bytes=50456, SHA=4bed570928243cc2d464cb7244d22faef6b09d11bf8bcaa8199552e56e96491b。后续全部state ref见question-audit.json。
- 27484 / c2213f65-9079-4ac6-9705-3f2407ff1121：J offset=394988203, bytes=25893, SHA=1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52; D offset=686624749, bytes=20711, SHA=d8a8d897eee8763b37e68e586461b5ed0abbbc946943a812c7b5ed92fdfd9b7e; S offset=8549362858, bytes=50456, SHA=6ae7cc9a88afd8f25e6cf3f2d9f0816000fbcd923034152d97fc14530ac1354d。后续全部state ref见question-audit.json。
- 27510 / 860b25d9-4658-4a28-b465-cce80f3a1366：J offset=395442426, bytes=7714, SHA=3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95; D offset=687088578, bytes=2342, SHA=78d0745e47e7b57899fc3d580fa4c24f95aaf53ae47d5855d82bc309656bdc04; S offset=8556715477, bytes=49186, SHA=d8411655d98dbe721ff408801b3a4e909616044632c21725cb4ce8f6488fa7cf。后续全部state ref见question-audit.json。
- 27678 / 71de6dca-cdaf-4df7-880a-510e2fdb1eee：J offset=397791676, bytes=26249, SHA=f3e08097b00ae2a007bd8114ab25d14bb690c6a12c5a818d0ae49e6d881089a8; D offset=689767792, bytes=15146, SHA=4d1aa2d8fb966e37ab228649231c7aa76560a820afe9c3ae35990b74d666b907; S offset=8581786401, bytes=44445, SHA=e70aae196358d944154ab29c6ce0ad28b593e2fdc72f0918dfa7fc9362213879。后续全部state ref见question-audit.json。

## 当前源码部分覆盖

只读核当前base与实际live `048a9713bd4be09ad5f6d3f6131e8b729f51aece` 的六相关源码逐SHA相同（source-proof.json）。`fdaf787a372880b0438e73bcac7e6d2168b038ed`确为该live祖先，职责仅单动作派发回执；selection_audit保存answer/before_sl/after_sl候选，silent-sl-comparison记录候选差，selection_dispatch明确single_action_receipt、state_effect_verified=false、whole_plan_executed=null、actual_turn=null。这些是已有窄覆盖，未认证整轮或整战。HIGH_VOLTAGE增长入口及SL不更差门已在代码，但入口存在不等原提案的联合校准完成。

没有发现由本轮证据隔离并可固定验证的新纯bug；部分现成字段不足把十个宽提案整体标duplicate/implemented。也不把当前代码当10-07 dirty知识的完整复原。原规则保留，不增加惩罚、强制杀序、能力优先级或药水/路线阈值。

## 每项处置

|id|原账本|state及缺口|
|---|---|---|
|silent-proposal-c20b5139dd0dff71|silent-0168|waiting：已核F27T2污染与追加防御，但原提案的T4/T5污染、虚弱、成长、格挡和迷雾联合重放未完成，原运行dirty知识/移动表未冻结；不能以局部血价设少技能规则。|
|silent-proposal-ae9e692d680e3819|silent-0183, silent-0005|waiting：已核F39T2负力/负敏及实际21血价；缺各实体抢夺累计来源与遗忘死亡返敏的连续证据、联合消费者重放，不能用失落返力代验返敏或固定击杀序。|
|silent-proposal-52f1e1bd2e7db0ed|silent-0231|waiting：已核F13T4→T5加压4→8力/19攻及覆甲7→6；缺原运行A10移动表输入、覆甲全部减层条件与加压/弱联合重放，不能把现场值推广为完整机制或房间代价。|
|silent-proposal-6dd8bbff876be528|silent-0233, silent-0209|waiting：已核F38T4电击4力19攻与本轮退场，现有HIGH_VOLTAGE增长路径存在；仍缺跨召唤代际持久身份、原移动表及联合校准，索引重排不能当同一实体证明。|
|silent-proposal-578e415a259e6835|silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016|waiting：原文要求跨抽弃、生成、药水及重规划直到整轮终止的执行归属。现有候选分段审计和单动作回执仅部分覆盖，actual_turn/whole_plan_executed仍未知；本批九窗人工回连不能冒整项实现。|
|silent-proposal-c0767768bf6a7ab1|silent-0079|waiting：已逐原题核YF同指纹两次开局及0/9实际血价、45/38敌净扣；现有SL比较仅候选预测，缺覆盖重放至终止的机器归属及同后继整战对照，不改并列探索或拟惩罚系数。|
|silent-proposal-a46bdb7fe711d79a|silent-0021, silent-0027, silent-0028, silent-0085|waiting：已核YF末T5弃牌、零毒触媒2、既有23挡与后升敏及37净扣；缺逐候选施毒/结毒/消耗附伤/能力时序/重规划联合校准，未完整复核阶段切换题，不能由末帧推策略优先级。|
|silent-proposal-1044224808015e5c|silent-0079|waiting：双蟹零胜并列仍无同抽序、随机药瓶落点和等预算完整后继及独立后移验证；本次末T4在肾上腺素后重规划，不能用其局部血价替代T1/T3换线整战因果。|
|silent-proposal-7cbc6005db712ba9|silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242|waiting：已核XP末T4朝向57→38、弱38→28、4敏脆弱6挡及实损22；本次未重验T2镣铐/船夹板、历史机制全分母和逐来源联合消费者，局部公式与审计覆盖不能记整项duplicate。|
|silent-proposal-c59f592f1427a67e|silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242|waiting：原联合提案包含101局机制、路线/休息/用药及SL实际资源归属。本批仅六锚点九题，不能代全101局复核；完整分源归属及多消费者验收未齐，父要求继续开放。|

具体反例、旧/新预期、拟合/时间切分、固定验证及回退逐项见proposal.md和原SHA副本。code_proposals为十个现有CLI id；本次无新提案id、无源码实现，implementation_domains=[]。

## 记录、验证及未完成

只经根learner/ledger.py update为silent-0168/0183/0231/0233/0079/0027/0241七旧条目追加本批证据复核note与proposal/report链接，回执ledger-update-receipt.txt。未重复添加同局证据行/分母、未更改原claim、status或经验。原有shipped状态只保留其历史含义，不降回proposed、不代ops新标shipped；本次没有新策略提案需要另建proposed条目。其余账本原关联保留，未复核内容不追加已验证说明。

无生产源码或知识变更，git status应保持严格干净；source.diff.patch为空。未提交、未合入live/main，未更新eval版本、decision-log或双通知（没有规则实际上线）。tsc/vitest/cases均null，未运行生产测试；撤源码红/恢复绿不适用，不能借历史测试冒报本批成功。本scratch分析脚本只做固定原始证据投影，未进入生产目录。gitleaks仅对本批材料只读扫描，实际退出0，未发现泄漏；结果另存gitleaks.log与gitleaks-exit.json，不当源码测试。

限制：仅六个10-07来源局，九题/65帧人工复核；未精读其余802题、未全重演全部SL、未重开101局联合审计，未取得原dirty运行知识/移动表完整快照，未完成候选整轮机器归属或独立时间后移验证。历史题面中potion_experience的A8/A9统计和CRAB_RAGE文字中的旧杀序经验，来源未在本批按Silent核实，只保留作为当时输入原文；不将其计入Silent事实/分母或按这些文字改规则。

本轮对已有证据的重复核验没有消除这些缺口。提证、报告和既有源码上线都不证明本批正式发布、下一局消费或自然收益；十项waiting继续原队列，量化/学习入库父要求继续开放。没有消息发送或角色ACK代填。

运维交接：proposal.md、report.md、result.json均位于本批scratch。调度器可按逐项proposal_results保存处置，后续须有新增匹配数据/明确联合验收才能推进；本批没有待兜底的新源码合入。

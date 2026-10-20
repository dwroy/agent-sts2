# 本批策略提案复核

记录时间：2026-10-20T09:54:28+0800（写入前运行date，原回执见record-time.txt）。任务 strategy-proposal，角色 silent，batch=20261020-094301-strategy-proposal。

结论：十项领取提案逐项 waiting。本批未修改策略源码或知识，没有新提交、合入、发布号、shipped或消费者自然收益。本报告补足部分原始执行事实，不把已有预测诊断冒称整个提案实现。

基线 `eb6b71c143865769d8ae9840f587d2b6f2197905`；启动工作树干净，`git merge --no-edit main` 回执为 Already up to date，HEAD未变。本批learn行reason=proposal、含明确的十个proposal_ids，不带research_request、implementation_request或proposal_repair；根普通专题请求绑定另一批，不匹配本批，不读取其他专题代替身份，不扩领队列。batch-identity.json保存对应行；本批没有纯研究或量化实现请求的完成声明。未改变账号、配置或在途会话；没有原生turn_context回执可供本任务证明实际推理档位，因此不宣称档位已经核实生效。

## 来源与冻结边界

runs-identity.json保存runs.jsonl原始六行及offset/bytes/SHA。六局均明确SILENT、A10且ended非空：L9SGRBB5R698 F17、PU80F84P6HPN F33、751FN9QM9MHQ F17、KV0JHNJCKXLS F33、YQL8RZ8BWN1E F17、KEN58SH9SLZ6 F17，最终victory均false；PU中途巨兽胜利单列，不能把最终败局称每场都败。六局不是六条独立SL胜线，同局多次尝试不作独立分母。

先运行指定evidence_summary.py，摘要SHA `cd6718fb97187e334594d347a767a260b655bb8c214e4cf0ef6b28d7f8a33619`，仅用于定位。之后按原命令运行两次extract_evidence.py；二者均退出0。完整manifest正文已读取，保留其冻结切点和每条原始行身份出处。日志继续追加，摘要、专门提证和常规提证的冻结点不相同，均保留，不覆盖旧切点；同一原始row可因包装source_size不同有不同导出SHA。未据零行反推原流不存在。

| 流/提证 | source_size | 原源冻结SHA256 | 本批选中行数 |
|---|---:|---|---:|
| v6-evidence/v6-build | 21268056 | 8fd51fe03c89226543cda111612891ba557c7a5dda2de5bb99bfe279e3da008d | 0 |
| v6-evidence/jev-prompts | 1834126838 | 4c8f036966c0352fa9ba766d5dae7ee7b0ce64285a6bc0130916af6712592ee8 | 1026 |
| v6-evidence/decisions | 2781489631 | dfc1588ce2b1401cdce915656c8ea8be4684655655b79a7c892eba584454b2a3 | 4071 |
| v6-evidence/run-config | 2192876 | 5e50379b4c54207d9a2fff165bea3b4cdc99016ace44fea2003c5ae2ca3741f4 | 6 |
| evidence/states | 14623866600 | 45cf1de48e9ab919ff21d8597191900419f21a3a3862b386beeb9c672152bf9e | 4167 |
| evidence/decisions | 2781492351 | 8c6c8aec2f0435cf3b5d37e62c7ccb64e76d457f7669dbc9b5829b2b21b364a5 | 4071 |
| evidence/sl-attempts | 49391038 | b9aaebf30c7735e531d9a32690380a49cf2efbbddfea20eafc71b8d75f8d8407 | 43 |
| evidence/run-config | 2192876 | 5e50379b4c54207d9a2fff165bea3b4cdc99016ace44fea2003c5ae2ca3741f4 | 6 |
| evidence/run-plans | 9715199 | 1dd0c00642f11e5bf11779b4ce1f94f104194ae7e7f063d21cb7cf17640a2e8d | 21 |
| evidence/brain | 1092765414 | 44f75523cd2de3bedfed53dfd56cfb111c80fd10d187f1e9c2ad2332aeb04aee | 130 |
| evidence/v6-build | 21517998 | 660a7b164b08cfceee3fa367277f0ebb39a40c5048cd3dc1566f486cbdcd3c31 | 0 |
| evidence/jev-prompts | 1834126838 | 4c8f036966c0352fa9ba766d5dae7ee7b0ce64285a6bc0130916af6712592ee8 | 1026 |

每局decisions依派发顺序为615/669/571/635/1033/548，共4071；states为624/686/582/653/1064/558，共4167；Jev为137/104/253/251/172/109，共1026。其他常规提证43条SL、6条配置、21条run-plans、130条brain只是机械保存，不等于模型全读。run-plans沿其run字段、其他流沿run_id/state.run_id/fingerprint.run，显式冲突拒收；Jev引用的精确decision_id已对原decisions行核对。正文提及、近似question_id、时间邻近均不用于所属局。

两个manifest的v6-build都存在全局源但本批六局均no_match；历史run-config没有V6字段，缺字段不证明显式off，状态为历史未记录/无法确认开关。entries、jev_answer、fallback、unknown均为本批未观察/不可评估，不填写为0次成功或收益；也没有本角色本批可完整阅读的V6原始row。Jev为另一个流，实际选中1026条，不能拿它补V6缺口。

全局原流保留坏行和身份缺口：decisions有2条invalid_json，unknown_identity=1934、unmatched_decision_id=1377；states有2条invalid_json、unknown_identity=3314；Jev有1条invalid_json；brain有2条invalid_json。无法确定身份的坏行没有分配给本批，也不能断言与本批无关。manifest的有限gap_refs只是最近五条入口，不代表所有未知行。原请求里的历史经验/建议只作为题面内容保留，尤其嵌入旧其他角色统计不采作本角色证据。输出content标pending_host_seal/deferred_errno=18，保存的本地提证及哈希已核，但不冒称宿主封存已完成。

## 题面覆盖与原始执行核验

模型完整读取7份原始Jev请求的所有题目、选项、上下文及answers/error字段；其余4份目标原请求只机械提取，读取了对应执行链，不计完整题面阅读。全局未完整读1019/1026条，其中4条为这些选中未全读，1015条未选中；原因是本次只处置十个领取提案的有界证据，不扩展到全局玩法审计。L9/PU的Jev请求本批未完整读，巨兽历史只核SL原行作指标/反例；原提案所引完整历史101局等未重做。没有把每局最后五条当完整覆盖。

| decisions原行 | 局 | 层/回合/SL尝试 | 精确decision_id | 阅读范围 |
|---:|---|---|---|---|
| 272361 | 751FN9QM9MHQ | F13 T3 / None | 179c20e7-efd4-44e8-8ee1-406abd398d69 | 完整阅读 |
| 272531 | 751FN9QM9MHQ | F17 T7 / 2 | fd52f1c7-ecb9-4c66-99ba-e1419817dc34 | 仅机械提取，执行链已读 |
| 272652 | 751FN9QM9MHQ | F17 T7 / 4 | 9836a127-543c-4e2f-adb9-e4c7bc103a3b | 完整阅读 |
| 273400 | KV0JHNJCKXLS | F33 T5 / 4 | 610bfa55-18de-410d-ac05-cf5c43772962 | 完整阅读 |
| 273450 | KV0JHNJCKXLS | F33 T5 / 5 | 427b1bd7-6bb7-440e-bc15-caa96029c513 | 完整阅读 |
| 273451 | KV0JHNJCKXLS | F33 T5 / 5 | 0cd00ba9-4994-4bc1-8d15-25d241031d40 | 仅机械提取，执行链已读 |
| 274087 | YQL8RZ8BWN1E | F17 T10 / 6 | 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef | 完整阅读 |
| 274267 | KEN58SH9SLZ6 | F15 T1 / None | f459d9ea-34bc-4054-91d8-3b6094462289 | 仅机械提取，执行链已读 |
| 274272 | KEN58SH9SLZ6 | F15 T1 / None | fed78f61-e646-42f4-b93d-84efa3e6575d | 完整阅读 |
| 274505 | KEN58SH9SLZ6 | F17 T10 / 4 | 4b79d414-135c-400c-a965-9446f0cab72a | 仅机械提取，执行链已读 |
| 274568 | KEN58SH9SLZ6 | F17 T10 / 5 | a2ec4e39-f5ad-4380-ab93-f804ddbebf3f | 完整阅读 |

question-coverage.json给出每题两流的offset/bytes/SHA及decision_ref，question-<原行>.json保留完整原row，.read.json仅展开字符串JSON而不删选项。jev-question-inventory.jsonl列出1026条完整所属索引。已对11条目标题及11条decisions原字节重读校验，不只信提证序列化。selected-states.evidence.jsonl保留87条限定状态并逐条回原日志核SHA；state-windows.json只输出相关窗口。用相同run、精确fingerprint及observed_ts匹配前态，再沿本局有界状态序列核后果；时间邻近本身不构成所属身份或单动作因果。

1. **751 F13 T3，账本0019/0021/0005/0007/0129/0176。** 原decisions272361、Jev27699选plan2（信心0.24），先防御，272362饮肌肉，续切割、猎杀者，均有completed回执。states278402–278407：58血、0挡→7挡；药槽FLEX_POTION→空、力量5与临时力量状态出现；下一轮50血。plan2模型损8/伤26；plan5明确整场不饮，模型损8、8/8胜、终结约2.9轮；plan3虽当前不喝，未来7/8样本喝药，不能充作完整无药对照。实际只有饮药分支；敌血40→11还含毒与荆棘，不能把净差29直接当攻击伤害或药水边际收益。缺表0是代码缺表标签，不是持有价值已测为0。
2. **751 F17 T2/T7，账本0079/0176。** T2原272434/换272575同指纹，states278479–278483与278620–278623实损13/18，敌净扣9/18；后续抽牌和动作也变化。T7原272531/换272652同指纹，Jev都选匕首雨/生存者/防御+，第四次SL换打击。原始sl_explore记B2 .103→.013，配对差−.09、SE .0088；预测损19/29，弃一呼唤后实际states278576–278581与278697–278702损13/23，敌净扣12/18，额外10血换6净扣。两次生存者派发先pending(unstable)，随后的selection选择呼唤及后继状态才支持完成；不能以pending认定失败，也不能只凭首个completed认整线已执行。选项对未决弃牌的绝对保守多计6与换线实际10血差分列。
3. **KV F33第4/5试T5，账本0102/0019/0020。** 273400与273450指纹相同，Jev均选猎杀者+致命毒药+；第五次SL改只打猎杀者，随后273451再次收到Jev选毒药却改end_turn。states279460–279465和279511–279515证实两者均30血不变，敌334→298/305，毒14→21→20与14→13。不是仅题面存在；续问的最终动作也核到了。两次诅咒选择分别有一次接口超时（273403/273452），随后重试完成（273404/273453），失败原件保留。此轮没有节血收益，后轮动作不一致，不能把全部整战失败归给删毒，亦不能据全0模拟断言并列输出无价值。完整毛伤/敌回血/成长与路线受控验证未完成。
4. **YQL F17第6试T10，账本0017/0250。** 274087/Jev28173完整题面有play和survival两题，答毒水、lethal；chosen实际用槽0，completed。states280160→280161毒2→8，血26、挡13、占位血999999999、自爆41均不变；274088 end_turn后280162死亡血0。41−13=28大于26，缺2；截断死亡0与算术−2分列，不把6毒当减自爆6。缺提前饮药的受控整场结果。giant-attempts.evidence.jsonl另核L9六次、PU五次、YQL六次SL原行：旧占位残血存在；PU第5次F17 T15以2血过关，是最终败局中的胜战反例。不能把三局多试当新排序独立胜率。
5. **KEN七次实际耗药，账本0019。** seven-potion-actions.json逐一核274131(F3T2槽0攻击)、274156(F4T1槽0稳定)、274185(F5T2槽0速度)、274235(F11T1槽1虚弱)、274237(F11T2槽0攻击)、274267(F15T1槽1发光)、274272(F15T1槽0技能)，与原states280206/207、280232/233、280262/263、280313/314、280315/316、280348/349、280354/355相连。三个pending回执均不冒称当时已settled，后态确认槽位移除。F15发光后274268重问，出中和/打击/步法/刺击；技能药的实际274273选择斗篷，274274打出，274275小刀，274276结束；states280354–280359由4挡增至12、敌52→48→45，HP46保持，实际生成牌不是MC中位示例逃脱计划。此链现已补齐，不能继续笼统写“所有随机后续均缺失”；其余随机药候选及任一瓶不喝/留Boss整战对照仍缺，不据空栏倒推误饮。
6. **KEN F17 T10/T5，账本0079/0021/0125/0005/0176。** T10第4/5次274505/274568同指纹，Jev原答相同，SL改第二呼唤为匕首雨；原B2 .385→.127，配对差−.2583、SE .0132。states280588–280592与280651–280655实际损15/21、敌净扣2/4，留下呼唤且多6血换2净扣。不能只按未试过当较安全线。T5第4/6次274484/274601同指纹，限定states280567–280572与280684–280689实损7/5、敌净扣1/2，后者没有建立敏捷；这是“只看当轮省血”的反例。本批未完整读T5 Jev题面，未重新核全程能力延迟到T9的所有中间帧；该部分只保留原提案历史结论，不升级验证覆盖。

所读执行链均明确区分answers、chosen、result、sl_explore。相关原行未带gate_reject或selection_dispatch字段，登记“历史字段缺失”，不是0次闸门拒绝或已验证派发；sl_explore.gate=b2也不是gate_reject。完整题面/answers存在不证明最终采用，completed首动作不证明整线或整场收益，后续抽牌/选牌会产生新问题。

## 现有源码覆盖与不能关闭的边界

source-audit.json核了实际live源码祖先及本树/当前live逐文件SHA相同：持牌候选事实、选择预测审计提交`9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`；巨兽药水事实`40168f4a903ae1d8c48bd03006f8fea19fd3aa3c`。这两项为已有部分实现，不是本批提交。silentSelectionAudit.scope=predicted_candidates、execution_status=pending_dispatch、actual_turn=null；silentHeldLossFacts.actual_held_hp_loss=null，尚未提供所有续问的实际成本/能力归属；lasting_value是模型分值，不是已兑现格挡。巨兽已有当前血挡/自爆及本次单饮事实，仍不改参考排序。

explore.ts的enemyHpLeft保留raw displayed HP作为legacy tie-break，anchorRank先存活轮、再残血；replacementAmong在未强制notWorseOnly且没有不差候选时仍可探索更差线。前者不能将占位血叫本体进度，但直接统一为0会重排原平局，YQL同T13不同血挡缺口30/34/25等不等价；本批没有其余后继固定的验证，不改排序。potion-cost保留缺表/持有未知区分，不能凭局部字段算十项全部duplicate。

没有修改铁甲或其他角色行为，没有跨角色知识、固定数值门槛、未观察进阶外推、LLM调用、网络或play。现有部分实现不等于消费者真实读回、自然采用或收益；本批未做这些验收，未关闭学习父要求。

## 十项处置

| 提案id | 已有账本id（silent前缀） | 来源局 | 处置与待补 |
|---|---|---|---|
| silent-proposal-366288801d9150d9 | silent-0079,silent-0176 | 751FN9QM9MHQ | waiting：751 F17 T2/T7的实际血价已复核，当前源码已有候选预测审计；仍缺跨抽弃牌续问的运行期完整成本归属、受控整战及独立新局验证，不能确定SL血价门槛或将整项记为已实现。 |
| silent-proposal-85929bdfc8a3fc1b | silent-0019,silent-0021,silent-0005,silent-0007,silent-0129,silent-0176 | 751FN9QM9MHQ | waiting：751 F13 T3饮药执行链及同题无药plan5已核；无药8/8仅为模拟，未实际执行留药到Boss分支；异鱼弃牌的保守预测与实际结算已有差别，缺联合消费者验收及受控整战。 |
| silent-proposal-efd9f83ee9e1a6dc | silent-0079,silent-0176 | 751FN9QM9MHQ | waiting：与366同源，原提案SHA已核；已有预测审计不包含完整实际持牌成本、能力兑现与续问归属，也没有完整受控后继/独立验证，保留原规则。 |
| silent-proposal-131042659448ae74 | silent-0019,silent-0020,silent-0021,silent-0005,silent-0006,silent-0007,silent-0046,silent-0129,silent-0176 | 751FN9QM9MHQ | waiting：九类关联经验未做全部联合消费者读回与逐来源实际结算验收；本批六局和局部窗口不能替代原101局历史审计，跨战留药反事实仍缺。 |
| silent-proposal-990f054036609447 | silent-0102,silent-0019,silent-0020 | KV0JHNJCKXLS | waiting：KV F33第4/5试T5同指纹删毒的实际差额及续问再次阻止毒药已核：损血均0、净扣36/29、后继毒20/13。仍缺毛伤/回血/成长的完整联合归属及其余后轮不变的整战验证，不能据此更改探索或路线门槛。 |
| silent-proposal-e18d3f18e6cac2a0 | silent-0017,silent-0250,silent-0011,silent-0027,silent-0046 | YQL8RZ8BWN1E,L9SGRBB5R698,PU80F84P6HPN | waiting：巨兽阶段/毒水局部事实说明已有，旧同轮SL排序仍读取占位血；直接归零会改变平局次序。缺改序受控整战、完整末资源及提前用药对照，当前不改排序或必死规则。 |
| silent-proposal-9733bb80f445aeae | silent-0017,silent-0019,silent-0020,silent-0250 | YQL8RZ8BWN1E,L9SGRBB5R698,PU80F84P6HPN | waiting：与e18同源，包含路线/休息与终局估值；阶段说明不覆盖整项。缺改序、完整末资源、提前饮药及未走路线/休息后继的受控验证。 |
| silent-proposal-c51468c5e8ba6668 | silent-0019 | KEN58SH9SLZ6 | waiting：七次槽位移除已逐动作核实，F15发光水重问及技能药实际选斗篷、出牌、小刀和下一轮零损链已补齐；其余随机药完整候选收益归属未全覆盖，且没有任一瓶不喝/留到Boss的受控整场分支，不能拟持有价值。 |
| silent-proposal-86a7db08d1a31976 | silent-0079,silent-0021,silent-0125,silent-0005,silent-0176 | KEN58SH9SLZ6 | waiting：KEN F17 T10多6血仅多2实际输出、T5省2血却未建步法的局部对照已核。仍缺运行期逐来源实际成本/能力兑现、完整相同后继整战及独立新局验证，不能设统一准入阈值。 |
| silent-proposal-e282a9131b99129a | silent-0021,silent-0079,silent-0125,silent-0176 | KEN58SH9SLZ6 | waiting：与86同源，六次SL只计一个独立局。缺其余后轮保持一致的整战和后期新局验证；预测诊断/局部差额不等于整项实际成本与能力窗口已实现。 |

十份原Markdown的SHA均与队列登记一致，本目录保留`<id>.original.md`。其中五份旧exp工作树路径已不存在，但由本树HEAD内精确归档路径materialize恢复，回执见materialization-receipts.json；不是缺证，不冒重建旧工作树或修改原提案。assigned-proposals.json保存本次只读队列行。未创建重复代码提案id。

## 验证、拟合与交付

本次只做原始字节/身份/事实核验，不拟合数值权重，不报告训练或泛化胜率；固定局面记录保留完整支持与上述反向取舍。同局SL不分训练/验证，未来如改门槛必须用更早独立Silent局调参、按时间留后期独立局，并保留同随机数受控整战和误差。当前缺这些数据，保留现行规则。

没有生产源码、测试或知识数据改动；撤源码失败/恢复通过不适用。tsc、vitest、cases均null（未运行），不拿提证脚本校验当生产测试成功。fixes=[]、merged=null，无新commit、release_id、版本修改或上线双通知。工作树保持干净，scratch为忽略产物；不自清理运行中工作树。

只经根ledger.py update追加本批复核链接和waiting说明，不新建经验/证据断言、不改已有shipped状态或历史。旧账本16项均已shipped，该身份只属既有经验；本次十个代码提案仍waiting，不能由旧经验shipped推成提案implemented。运行前后输入及CLI回执留在本目录。提案汇总交付路径为`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-094301/learner/runs/20261020-094306-341b3b0d-2abc-497f-80de-d117507ada4b-strategy-proposal/proposal.md`，正式机器回报为`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-094301/learner/runs/20261020-094306-341b3b0d-2abc-497f-80de-d117507ada4b-strategy-proposal/report.json`；运维按此逐项保留待新局，不冒造本批上线。

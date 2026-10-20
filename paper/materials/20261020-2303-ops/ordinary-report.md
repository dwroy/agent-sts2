# Silent 本批策略核验报告

记录时间：2026-10-20T22:25:28+08:00。batch=20261020-221302-strategy-proposal。

结论：十项均保留waiting，没有新的策略源码修改、提交、live合入或版本。本批只核指定三局与十个已领取ID，不把372→380等队列计数当作本批新游戏证据。提案交接文件为本目录 proposal.md；逐项机器处置在 result.json。

## 身份与边界

开工 git status --short 为空。实际HEAD及report.base=260ad020f83b7cb49eda94ec80f942fbe20f354b，git merge --no-edit main 返回Already up to date。learn.json本批task=strategy-proposal、character=silent、reason=proposal，worktree精确匹配；带十个proposal_ids，无research_request/implementation_request。普通专题文件绑定其他旧batch，不适用，不进入纯研究，也不读取其他专题代替身份。

runs.jsonl 原行613/614/615均为SILENT、A10、ended非空且victory=false：AD3QSC3P41JU F49、9DAS5L8YM1CN F23、BJLTVSYXCSGS F42。三行offset/bytes/SHA保存在evidence-summary.json的outcomes.ref，已读原文。独立分母三局；同局多SL不是多局。

README、最新STATE-2026-10-19、decision-log末尾、学习协议及代码提案协议已读。STATE历史停点与10-20后续决策分开，未自行变更STOP/调度/对局。没有运行play、网络、模型调用、游戏二进制，也未读取其他角色私有知识。任务要求普通模式/high；本轮未改模型或配置，未取得原生turn_context强度回执，不冒称档位已经独立验收。

## 原文与账本

十份原提案全部按code-proposals.jsonl原登记SHA找回并读取；四份在原路径、五份从20261015-144302校验归档精确提取、588eef从011302-s2保留副本按SHA找回。所有新副本只写本批scratch。recovered-proposals.json保留归档SHA/成员与来源路径；dispatched-proposals.json保留初始缺文件状态与完整原add/最近update，不用找回动作改写旧缺失现场。

原提案关联的全部账本已只读核对，官方ledger.fold结果保存在referenced-ledger-rows.json。原shipped状态不回写proposed；本轮仅追加核验记录，不把已有窄实现再登记新增实现。

## 提证冻结与完整性

按指定入口先生成evidence-summary.json，再运行extract_evidence.py的v6-build/jev-prompts/decisions/run-config专项和默认全部流。两份实际manifest均已读；每行保存原source/source_size/line/offset/bytes/SHA及identity。摘要和提证开始时日志仍追加，不能假装所有流或三个任务共用一个时钟切点。

| 流 | AD3QSC3P41JU | 9DAS5L8YM1CN | BJLTVSYXCSGS |
| --- | --- | --- | --- |
| states | 728 | 396 | 628 |
| decisions | 708 | 387 | 594 |
| sl-attempts | 9 | 6 | 8 |
| run-config | 1 | 1 | 1 |
| run-plans | 9 | 6 | 9 |
| brain | 43 | 22 | 43 |
| v6-build | 0 | 0 | 0 |
| jev-prompts | 117 | 120 | 111 |

正式本次提证截点：states=14739056835，decisions=2983439710，jev-prompts=2190268130，v6-build=64635703，run-config=2246610，run-plans=10128883。逐流整前缀SHA见两个manifest和evidence-audit.json。摘要较早截点decisions=2983265605、Jev=2189934692；选中本批数量相同，截点和SHA各自保留。

全局冻结流质量：states两条invalid、3335条unknown_identity；decisions两条invalid、1934条unknown_identity及1398条无匹配decision_id；Jev一条invalid；其余选取流无invalid。未完整行计数均0。上述是机械全流扫描质量，不将未知行分配成本批，也不将其视为零。原始gap_refs/计数保留在manifest；有限五条索引不代表全覆盖。对象存储发布显示pending_host_seal=true、deferred_errno=18，scratch证据可读且已复核原行SHA；不冒称宿主已完成seal。

V6构筑流实际存在，三个run均no_match，选中0行。三份历史run-config无V6字段，无法由此验明显式off；应记“历史无匹配，开关未记录”。entries、jev_answer、fallback、unknown均无可归本批原行，状态是不可评估，不是零采用或零收益。没有取他局V6原文补本批。

Jev原始行全部348条有显式run_id且fingerprint.run一致；精确decision_id亦与对应decisions匹配。没有用正文、相似question_id或时间邻近建立局归属。机器索引未见error字段；这仅表示选中原行字段状况，不证明所有请求执行或收益。

## 问题覆盖与执行后果

完整阅读4/348题，分别覆盖AD的F48T6蜃景、F49T1全败候选、9DAS的F22T2血价、BJL的F42T2第三试SL替换。原题请求/答案/错误、精确decision及补读后继原件在questions/<原行号>.json、.followup.json；所用行均再次seek原日志offset，校验bytes、SHA和解析内容相等。其余344题只建立逐题索引，未逐题完整阅读；具体run/floor/turn/decision_id/原始定位及未读原因逐条见question-coverage.json。额外保存的四个题目文件是准备材料，不计完整阅读。

| Jev原行 | 局 | 精确decision_id | offset/bytes | SHA256 |
| --- | --- | --- | --- | --- |
| 32420 | AD3QSC3P41JU | 382b7671-2c67-4a11-ac3f-3e865caee025 | 466651548/14293 | 939b1a5def2f366ead463bb3a200c0c3872317c4e243fa83d978b4817e06d797 |
| 32426 | AD3QSC3P41JU | 99b97721-7370-4725-aa04-d838bc2b592a | 466745448/11014 | 18b7eaa8ead4e6b66dd731ad1c9b9d7563cd3c2ced132ff42ab42e05325b14da |
| 32544 | 9DAS5L8YM1CN | f5cdd126-2af9-4b00-ad24-2b3d1ba4e0e8 | 468097352/26149 | 2430c5f115de3cbf7b57fa18c121f36a971838596dcf818eac0d75a5638220bc |
| 32662 | BJLTVSYXCSGS | b9331692-b38c-41d7-b288-ea9576e370ad | 469743939/16166 | 3c09fa82abe6dec3c1945148ebb480e99d17f6900b1fdb922694375a7a0077f9 |

1. AD F48T6：完整题有两候选，Jev选plan2，d292274实打蜃景、d292275实打向聚合体的打击，d292276结束回合；全部result completed。s299473→299474实见毒32+41、脆弱96，格挡0→54，随后攻击扣聚合体4。s299476后T7仍28HP；F48最终s299493以15血赢。证实局部挡与动作兑现，不代表蜃景单卡造成整战胜利。原题plan1抽牌后需重算，没有实打对照。

2. AD F49T1：完整题plan1为21伤/28挡/零损，plan2为30伤/10挡/损8，8样本均死；Jev选plan2，d292296—292301实际执行该前缀并结束回合。s299496首手11血，s299501敌72/10挡，s299502下轮3血。第二试d292307原答仍plan2，sl_explore明确改plan1；s299512为11血，T2到T3仍11，SL原行1141到T3判死。首试到T2即判死截断，不能比较为两场实际死亡或保血必胜。末试s299559—299565四技能敌力3→15、意图19→31，突然一拳后23对18挡、3HP；毒结6使敌64→58后实死。d292364的(-2)是预计剩血：3−(23−18)=-2，不是漏算3伤的证据。

3. 9DAS F22T2：完整题包含八条出牌候选与未模拟药水选项；已显示horizon3/samples4降级，不把尾估胜52%当实测概率。Jev选plan6，d292694蛇咬、d292695突然一拳，重问d292696答结束回合。s299901—299904敌49→43→36、毒7结算减为6，HP24→2；plan1少损5但未执行。F22T3后实喝狡诈并生成/出刀，s299908毒6→15，s299909第三技能两敌各损5；不能把刀伤、施毒和已结毒都归开信刀。F22T5磨蚀真实支付3能，T6防御6挡住两段3；从末14HP/7毒到REWARD的中间末击缺帧，毒/反伤精确分摊未知。F23同瓶速度药恢复后各建5临敏、柔嫩逐牌减属性，末12挡对14攻，2血实死。F19→F21→F22实际入口/出口是61→38、38→25、25→2，F24营火未抵达，没有另一候选的整段反事实。

4. BJL F42T2第三试：完整题Jev答plan1、置信1、模型24/24赢；d293342 chosen却是蜃景，sl_explore明确替换plan3并标原答已失败。d293343—293344继续前缀，d293345再次Jev问答后打击，d293346结束回合。s300583同12血起点、s300589为22挡仍三体存活、s300590下轮2血；首试s300543→300549→300550为15挡、方柱退场后余5血，换线实付3血。首试后续T3也判死，不据24/24模拟胜推“保原答可赢”。末试d293351(-6)与2−(12−4)=-6一致；s300594末拳击7毒7、方柱7毒9可先退场，但余方柱12攻仍使玩家死，s300595剩51血方柱与GAME_OVER；不用字段误读发新漏算提案。

四题及所核后继均无gate_reject和selection_dispatch字段，记录为“字段缺失”，不伪造null成功回执。chosen和completed只证明对应动作；抽牌、重问、SL替换、pending状态与真实后帧分别验收。未读F17等机制题面明确保留，不能据本轮对整组机制或整个流作完整校准结论。

## 当前实现与历史源码来源更正

实际live观察提交048a9713bd4be09ad5f6d3f6131e8b729f51aece；git merge-base独立确认ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8（AD完整开场组合）和5c7105ff0294466da8319f2934beda05c6040794（普通紧勒）均为其祖先。证据在narrow-live-ancestors.json；已读两源码提交stat、当前silent-opening.ts与continuationInput，15→11接续已有窄路径，不重复实现/发号。当前turn-solver.ts逐Skill增加现场enrage已存在，combat-plan.ts护栏最小容差8仍存在；源码存在不代完整校准。

重要来源更正：三个原run-config有真实完整提交a340c1ec3825bf5e7048b5ec700539c2b98602c6、7f0c04dd5114d2f8152da1fb8cb6c5f45e1c478e、722518cdb9edfe808864da176f7e512bd820e170，Git对象均可用。原dirty_files仅列八个知识JSON，没有列执行源码。因此旧提案笼统写“dirty完整源码未保存”不能充当本轮唯一阻塞；已保存historical-code-provenance.json。精确历史动态知识值尚未重建，候选未执行的后继也不存在，完整受控再现仍缺输入与政策配对。原提案字节不改写；请ops沿既有链保留此来源更正，区别于新游戏规则或已送达Roy的回执。

## 十项逐项处置

| 原ID | 原账本 | waiting理由 |
| --- | --- | --- |
| silent-proposal-015f25123c45671c | silent-0228, silent-0255, silent-0030, silent-0069 | F48退出15→F49入房15→可操作11、空药可核；开场组合窄项已有实际live祖先ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8。宽项缺从F48开始留药与实喝两路的完整同样本后继及独立联合校准。 |
| silent-proposal-01d7495835a3eb19 | silent-0079, silent-0028, silent-0011, silent-0048 | F49两条T1线多9伤付8血，保血线是SL替换且仅推迟到T3判死；缺相同后续抽序和策略的完整配对结果及独立验证，不能从此局改HP护栏8或SL阈值。(-2)是预计剩血，3−5=-2。 |
| silent-proposal-1f34e9d37b21ba71 | silent-0255, silent-0228, silent-0243, silent-0020, silent-0019, silent-0021 | 开场扣4窄项已有实际live祖先ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8；留药、休息与路线直到两场联合通关的完整对照及独立校准仍缺，不能关闭资源宽父。 |
| silent-proposal-438a0eb4516e7975 | silent-0261, silent-0055, silent-0009, silent-0220, silent-0260 | 普通紧勒窄项已有实际live祖先5c7105ff0294466da8319f2934beda05c6040794；本轮核到F22T3第三技能各敌扣5、施毒与刀伤分源，但原紧勒/弃牌题面及整组当前配对回放未完成，不能整体duplicate。 |
| silent-proposal-53ed69feeb9898fe | silent-0028, silent-0079 | 现场激怒3使四技能增加12敌力，当前逐技能代码已存在；缺所有抽牌重规划候选到最终派发及整场受控后继。原损2/损5说法误读预计剩血，不是新漏算证据。 |
| silent-proposal-588eefdf87e34f32 | silent-0243, silent-0020, silent-0019, silent-0021 | 原提案已按SHA找回；实际资源链为38→25→2，F23持速度药2血入场而败。缺替路线/留药到F24营火的完整受控后继和时间留出，不能预支未来回复或未建能力。 |
| silent-proposal-a86e7753ca2a347c | silent-0012, silent-0044, silent-0046, silent-0232, silent-0253, silent-0286, silent-0133 | 磨蚀实付3能建1敏/4荆棘、速度药与柔嫩的现场链可核；缺丝虫毒/反伤末击中间帧，F3感染及F17阈值的完整题面本轮未读，整组固定回放和异线完整结局不足。 |
| silent-proposal-b49c2e6f5d25e8ba | silent-0079, silent-0021, silent-0030, silent-0011, silent-0005, silent-0006, silent-0025, silent-0027, silent-0208, silent-0037, silent-0162, silent-0122 | F42T2 Jev答plan1，SL改走plan3，后经重问完成；末试损10对首试损7，多付3血。原题24/24模拟赢没有实盘完整胜线，仍缺后继策略校准；(-6)为预计剩血，2−8=-6。 |
| silent-proposal-cb23be067a5f04c1 | silent-0012, silent-0010, silent-0011, silent-0013, silent-0030, silent-0046, silent-0115, silent-0048, silent-0069, silent-0276 | F48T6蜃景54挡及F49激怒逐技能已核；F17、F21、F48T10等其余原题和整组修饰条件的当前固定整线回放未在本轮闭合，缺敏捷药留药的受控完整结局，不能以局部机制代整体实现。 |
| silent-proposal-fc6618e0844f2007 | silent-0019, silent-0232, silent-0044 | F22T2实际执行蛇咬/突然一拳，13伤与损22兑现；少损5的防御候选未执行，缺两路直到F23和F24营火的配对后继，不能拟普通战终局血药权重。 |

以上宽项不能由局部源码祖先升格duplicate/implemented；本轮没有新增代码提案ID，code_proposals列原CLI真实ID供闭环续派。

## 验证、未实现原因与交接

本轮只执行原始行SHA/身份/计数/提案SHA/既有源码祖先核验和材料一致性检查，没有撤源码负控、恢复通过、tsc或vitest；tests三字段均null。audit_evidence.py初次因历史decision行缺decision_id报KeyError，修正临时索引后通过，失败保存在evidence-audit.json，不把分析脚本运行当产品测试。无策略源码或知识改动，没有可提交代码；不运行无关全套测试、不制造合入、eval版本、shipped或成功测试。无需回滚。源码与知识保持基线，scratch为忽略材料。

后续所需是：留药/路线/完整后继的受控样本，未读机制窗口的完整题面与当前固定整线回放，历史动态输入来源和按独立整局的时间留出。当前三局只能重新核验这些有限候选，不补参数、不借其他角色分母、不把SL次数或题面存在视为自然收益。提证不证明本批正式发布、下一局消费或自然收益。

本批核验已通过根目录ledger.py add追加为silent-0536（proposed），并经CLI show读回；原游戏经验账本状态未改，回执见ledger-receipt.json；运维交接文件：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-221302/learner/runs/20261020-221334-8bed911c-ab96-4915-8995-3aba181d60e3-strategy-proposal/proposal.md。本批父要求与十项waiting继续原队列，实际shipped只由ops核上线后登记。

# Silent策略提案复核报告

时间：2026-10-21 00:30:40 CST（写前date）。batch=20261021-001302-s2-strategy-proposal；base=2fb9ef1f26df9adfb04d68a409a8060bab7038c3。

## 结果与身份

十项均waiting，fixes=[]、merged=null。无源码/知识修改、提交、live合入或新发布号；tsc/vitest/cases均null，未执行撤源码红/恢复绿或gitleaks提交扫描，不借历史检查宣称成功。

开工git status为空，HEAD为上述40位基线；按普通提案要求git merge --no-edit main返回Already up to date。learn.json仅只读本批行：task=strategy-proposal、character=silent、reason=proposal、工作树精确一致，带十个proposal_ids，无proposal_repair/research_request/implementation_request。只读根notes/strategy-research-silent.json核普通批次专题不匹配，未转纯研究或领取别的队列。dispatch-binding.json保存本批行；十原CLI条目及原账本历史已保存，不覆盖原记录。

先读README、STATE-2026-10-19、decision-log末尾及两份学习协议。STATE的停局叙述与后续decision-log恢复R404/R406叙述按时间并存，不据旧STATE操作对局。未启动play、模型、网络、其他agent或运维prompt。任务要求普通/high；本会话未取得原生turn_context/请求回执，不自报档位已核生效。

六局runs.jsonl明确SILENT、A10、ended非空，均victory=false，终层依次30/39/13/33/48/33；原行及offset/bytes/SHA在runs-identity-proof.json。run-config各1行，明确Jev开启、context=v1；V6字段缺省，不能声称显式off。六局运行commit及dirty_files/知识前缀全部保留于run-config-proof.json，源码参考不等复原历史dirty树。

## 提证与完整覆盖边界

实际运行指定evidence_summary入口和两次共用extract_evidence入口，均正常退出；输出分别为evidence-summary.json、v6-evidence/和evidence/。摘要SHA为fb55bba9fc49e599af6434c1d335ddab66bad49434d71dc116a9df18b5256435，仅定位事实，不作游戏结论。未将全states或最后五条当完整科学覆盖。

| 局号 | decisions提取 | states提取 | Jev匹配 | 完整题面实读 | 未逐题实读 |
|---|---:|---:|---:|---:|---:|
| DUZUBAJ3A8GP | 602 | 623 | 84 | 1 | 83 |
| 5PM6JAQG6FNQ | 638 | 660 | 92 | 2 | 90 |
| CA5KE8GFJ9X2 | 265 | 282 | 58 | 1 | 57 |
| 8JRE1C4H4Z2W | 659 | 676 | 139 | 1 | 138 |
| YF0LXT1QSTGG | 1065 | 1091 | 269 | 2 | 267 |
| XP2SL33HT0D9 | 712 | 730 | 169 | 1 | 168 |

完整题面实际实读8题，剩余803条匹配Jev行没有逐题实读。九个对照决策入口及其状态窗口另读，不计完整Jev题面覆盖；同轮后续新问题只核答案/动作时也不冒计完整题面。未读清单逐局逐decision_id见question-coverage.json；原因是只围绕十已领取提案做有界回归，未实施全局重规划、路线/资源和原101局的全量联合研究。未读不是无错误、无反例或零收益。

V6-build整个冻结前缀623行，六局均no_match；不是物理缺文件，也不是有证据的entries=0/jev_answer=0/fallback=0/unknown=0。历史无可归属V6行，上述四类没有本批观察值；没有伪造V6题面。Jev request/answers/error单独核：八题均有完整request和answers，error字段缺省，不能外推811条全部无错。正文提及、question_id相似及时间邻近不建立局归属。

| D原行 | decision_id | J原行 | Jev offset/bytes/SHA256 | 答案 |
|---|---|---|---|---|
| 267379 | fa69876c-94f5-4915-a951-1d462efb0537 | 26720 | 385441212/8869/df5c7ab4a5610d09edf0efd76dc8cb7ebc4827a07c94458533211be8dd1b2014 | plan1；error字段缺省 |
| 268390 | a108eb5e-509f-48db-9028-c4a9bc386797 | 26869 | 387403992/15822/ec96a723a18f9cedbcf8fd5a3976fee2e8fc309cac2abef93e20becf2cf36297 | plan2；error字段缺省 |
| 268427 | 561d69e3-cd22-4860-8d81-d4630037051a | 26875 | 387513383/11608/ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb | plan1；error字段缺省 |
| 268893 | ebee5225-f98c-417f-8e14-cf9a94f4712c | 26930 | 388248392/9934/3fec66ad2462edc468b0883c7021b3b165e2fd93bc2115c3d4d8e8609d27cbd6 | plan2；error字段缺省 |
| 270282 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 27194 | 391510246/18141/94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09 | plan1；error字段缺省 |
| 271348 | c2213f65-9079-4ac6-9705-3f2407ff1121 | 27484 | 394988203/25893/1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52 | plan5；error字段缺省 |
| 271495 | 9918f4de-a34f-42a8-abd0-d7f2f1fa4419 | 27508 | 395393660/30567/7e3a74d8bcb32264ec6e80f657bfd1f7628308cb60ecd415f5733a2ab2958c14 | plan9；error字段缺省 |
| 272040 | 33560091-b5f4-41b4-bcd8-06b3adf2327b | 27624 | 396759387/29521/48d155c7dac4742223afb0a55203278f78ed555cc726725b82391ff511f94055 | plan2；error字段缺省 |

各完整原row保存question-<D原行>.json；selected-questions-index.json同时保存decisions原行offset/bytes/SHA及身份来源。该八题均显式run_id和fingerprint.run一致，并通过原decisions精确decision_id复核。后果连接先用明确run再用observed_ts和fingerprint精确相等找到起始state，后续按原流序列追到下一turn，方法记录于state-windows.json，不以时间相近替代身份。

audit.py从logs原offset/bytes重新读取并逐SHA校验182行，原JSON与提取row完全相等；另核6条runs和6条run-config原字节，共194个不同原始行。decision-flows.json保留17个入口的当轮动作链，state-windows.json保留对应17个完整原state窗口；state-projection.json仅为便于读回的结构化视图。只有这组有界窗口得到逐项分析，不称全部4062个state均由模型实读。

## 原题、原答、执行及后果

1. CA5KE8GFJ9X2 F13T4：Jev选plan1（打击），D267379 completed，下一D267380结束。states273261→273263敌28→22，玩家2不变；下轮力量4→8、覆甲7→6、弱消失、攻击19。该题不是T5策略决策；T5由代码least-loss执行（D267381），未假造T5 Jev题。完整加压/减层/移动表联合验证仍未完成。
2. 5PM6JAQG6FNQ F38T4：Jev选plan2，D268390–268394顺序切割、步法、防御、匕首雨、结束均completed。states274313–274318：电击15/23、力4/19攻，切割至9、群伤后退场，玩家31→27。下一帧组装师30血，不把候选33血照抄成实际；爪牙退出后index重排不当实体ID连续。该窗口支持局部增长/退场事实，未验跨召唤代际。
3. 同局F39T4：Jev选plan1，D268427–268433完成，刀舞生成后转代码重规划。states274351–274358敏捷−4→−2→0、防御5，失落9→7→2后退场，下轮玩家19→5、力量−4消失，遗忘64血。遗忘返敏分支未由此观察；预测敌后67与下一玩家轮64受后续轮初毒状态影响，不混成同一切点。
4. DUZUBAJ3A8GP F27T5：Jev选plan2。D268893生存者回执pending unstable，不写首次完成；D268894选择弃牌completed，其后防御/迷雾/结束completed，状态确认实际效果。states274834–274839：污染0→6→12→18、挡0→8→17、弱1→3，毒7→13→12，敌93→80，玩家46→37。原候选预计扣敌7、实际13差6，源代码当前Haze接线已独立实现，不能拿旧题称新bug。实际血价9成立，另一候选未完整实打，不推出少技能更好。
5. 8JRE1C4H4Z2W F33T2：D270216/270282指纹相同。第三试Jev仍答plan1，SL改plan2；gate=rollout，0/24改5/24，都是后损封顶47但不是同死亡比例。D270282–270285实际逃离/毒刺/打击/结束；states276274–276278实损15、净扣17，对照276208–276212实损3、净扣10。多12血换7净扣，不能从一对相关尝试拟合全局血价系数。
6. YF0LXT1QSTGG F48T1：D271309/271348指纹相同，第三试Jev答plan5，SL换plan4，预测0/10血价、54/36输出，均24/24死；D271354又将续步改end_turn。states277327–277337和277366–277373实际损0/9、扣45/38。完整候选有待抽/用药后继，预测不等实际；不能把Jev原答未执行续步当执行成功。
7. 同局末试T4：D271495 Jev答plan9，SL改plan2，rollout23/24→24/24而非并列；D271498计算下注之后重新选择，D271499实际触媒+，原替线致命毒药未执行。states277513–277519：敌212→197，两尖啸令攻击33→15→0，能力触媒2建立但仍无毒；下一轮攻击44、玩家18不变。D271499新Jev题只核其答案/派发，不计第九个完整题面。不能说原替线的17伤/4余毒已兑现。
8. XP2SL33HT0D9 F33T3：D271992/272040指纹相同，Jev答plan2，SL改plan9，gate=b2且原/替零胜diff=0、se=0；整战模拟仅199/1200样本时间截停，不是请求截断。D272040–272042打击/药瓶/结束completed。states278028–278031对278076–278079实际损9/14、净扣24/27，但两敌分配不同（原候选预测替线188/172，实际179/181），随机落点不能当确定配对后继。

上述八条对应执行链中的gate_reject/selection_dispatch字段均缺省，逐字段保留为absent，不能推断闸门从未拒绝或调度必成功。选择动作的chosen/result与状态另外保留。八题同轮其他问答没有全部实读完整request，覆盖表已排除。

附加对照：XP末T1（D271982/272195）实际47→45与47→37、净扣25/34且替线获得1力量；不是纯坏事或完整胜线。末T2 states278236–278242轮初14挡、普通镣铐0→−9力/4→0攻、施毒转向火箭30→20、斗篷14→20挡，下轮力量恢复，零损。末T4 states278249–278257朝向57→38、弱再38→28，两步法敏捷4、偏折6挡、玩家33→11。已读这些state和对照decisions，但未全读其Jev原题或早期A1/A6历史，不冒称22次/50帧全分母验收。

## 十项处置

| 提案 id | 证据局/层/回合及入口 | 原账本 | 本次处置与缺口 |
|---|---|---|---|
| silent-proposal-c20b5139dd0dff71 | DUZUBAJ3A8GP F27 T5；D268893 / J26930 | silent-0168 | waiting：已核F27T5污染0→6→12→18、实损9及迷雾实际施毒；Haze子项已有live祖先20b04517393708c73912326bb35d8448d1b3f77e。整项尚未完成火花增长、污染撤销、虚弱、挡、迷雾联合的冻结消费者重放；原运行知识有dirty，不能借当前表复原。 |
| silent-proposal-ae9e692d680e3819 | 5PM6JAQG6FNQ F39 T4；D268427 / J26875 | silent-0183、silent-0005 | waiting：已核F39T4负敏−4→−2→0、5挡及失落退场后力量恢复；尚无逐实体抢夺累计来源的完整固定消费者重放，遗忘死亡返敏分支本批未核，无受控完整目标序胜局。 |
| silent-proposal-52f1e1bd2e7db0ed | CA5KE8GFJ9X2 F13 T4→T5；D267379 / J26720 | silent-0231 | waiting：已核F13T4→T5力量4→8、覆甲7→6和T5意图19；原运行A10移动表及加压/弱/覆甲联合消费者重放未齐，完整减层条件未验证，不能推出固定房间成本。 |
| silent-proposal-6dd8bbff876be528 | 5PM6JAQG6FNQ F38 T4；D268390 / J26869 | silent-0233、silent-0209 | waiting：已核F38T4电击机器人15/23、力量4、19攻击及实际退场；跨召唤代际缺持久实体身份与原移动表联合重放，index和相同上限不作实体连续证明；未选杀序无完整实盘后继。 |
| silent-proposal-578e415a259e6835 | 8JRE1C4H4Z2W F33 T2；D270216/270282 / J27194 | silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016 | waiting：已核沙虫同指纹T2两条实际线3/15血价、10/17净扣及0/24对5/24；现有资源对照仍标execution=unverified，缺抽弃/生成/药水/重规划直到整轮终止的机器归属和联合消费者验收。 |
| silent-proposal-c0767768bf6a7ab1 | YF0LXT1QSTGG F48 T1；D271309/271348 / J27484 | silent-0079 | waiting：已核实验体T1原/替换实损0/9、净扣45/38及后续结束回合；既有live资源对照只覆盖当前候选预测，覆盖重放到终止的归属及同后继完整对照未齐，不由24/24全败拟惩罚系数。 |
| silent-proposal-a46bdb7fe711d79a | YF0LXT1QSTGG F48 T4；D271495 / J27508 | silent-0021、silent-0027、silent-0028、silent-0085 | waiting：已核末次F48T4双尖啸、计算下注后实际建立触媒2且无毒，T5攻击44；原替线的致命毒药未执行。阶段/施毒/结毒/消耗附伤/敏捷时序的逐候选联合消费者校准未完成，无完整替代胜线。 |
| silent-proposal-1044224808015e5c | XP2SL33HT0D9 F33 T3；D271992/272040 / J27624 | silent-0079 | waiting：已核双蟹同指纹T3原答/替换与9/14实损、24/27净扣；药瓶实际落点与候选敌血分配不同。缺同抽序、随机落点、等预算完整后继和独立时间后移验证，保留原SL规则。 |
| silent-proposal-7cbc6005db712ba9 | XP2SL33HT0D9 F33 T2/T4；D272200/272213 | silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242 | waiting：本次已补核末试T2轮初14、镣铐−9及次轮恢复、斗篷加6，并核T4朝向57→38和虚弱38→28；原A1/A6及历史22次/50帧分母未复核，逐来源联合消费者验收未完成，不将局部模型已有视作整项duplicate。 |
| silent-proposal-c59f592f1427a67e | YF0LXT1QSTGG F48、XP2SL33HT0D9 F33；本批八题 | silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242 | waiting：六锚点八个完整问题及局部状态窗口不覆盖原101局1499房审计；历史普通/升级机制分母、完整路线/休息/药水资源归属和消费者联合验收本批未完成，保留父提案等待有界补证，不重写旧复盘。 |

完整提案、旧/拟行为、反例、验证与回退见proposal.md和十份同SHA原文。既有子项：20b04517393708c73912326bb35d8448d1b3f77e为Haze施毒，0e4fe4df89a06682468e0e4716c12126e76369d5为Silent SL资源对照；均已核为实际live4528a751f17e341a97e7ff70295ec9fba0c947e9祖先，当前两文件SHA与live相等，证据见existing-source-proof.json。没有把这两个子项或历史测试升级成十项完整implemented/duplicate。SL对照源码scope=current_turn_prediction且execution=unverified，明确不提供整轮机器归属。

只经根ledger.py add登记本次有界复核silent-0538（proposed），原账本既有shipped/proposed状态不改；没有新游戏知识、经验或代码提案id，因此不执行code_proposals add重复建项。最终code_proposals列十个原CLI id，implementation_domains=[]。未直接写队列或调度learn.json；proposal_results交原启动器追加处置，不代标shipped。

## 冻结切点、异常和限制

| 原流 | 冻结字节切点 | 原前缀SHA256 | 无效行/截断行 |
|---|---:|---|---|
| states | 14779792526 | 8702d4e3b92c0d5158bd3e1822850addefaaa889f4d72d1e9d3511b29f311f9e | 2/0 |
| decisions | 3014585841 | e853a73fcf190bca721f0c4f0aa098b8b35803f21c680819e227ff0e64a535e1 | 2/0 |
| sl-attempts | 50161407 | 544eb50b8622e66d8ddaeca278dc2cdcff273a4eaf63cf4e00899fd739892f0c | 0/0 |
| run-config | 2276751 | 7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb | 0/0 |
| run-plans | 10145552 | b49e3d3b28f26f29bbb5ad8e83e1f82b137a90a2251b27dbb48e5128c70a3244 | 0/0 |
| brain | 1129621410 | 66035f7cf05861c100378f2064c31d8a9ddeeb0db4db66935c428edcdf314ed3 | 2/0 |
| v6-build | 64655258 | 3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234 | 0/0 |
| jev-prompts | 2209044221 | 6725b0490064057a034dd03a502511bbf0ba4f26c9b318e1199c48a185ee28f1 | 1/0 |

原decisions全前缀有unknown_identity=1934、unmatched_decision_id=1413；states有unknown_identity=3350，均不强配本批。manifest内identity_gap_refs_limit=5只是有限定位入口，不是全部缺口。Jev全前缀另有invalid JSON 1行，decisions2、states2、brain2；原offset/bytes/SHA留manifest，不将无效/身份未知行记本批零。所选八题原行均校验完整，无请求字节截断；未读803条未作该结论。

两个提取manifest的共同流切点/SHA一致。输出content.pending_host_seal=true、deferred_errno=18已保留，表示共享对象封存待宿主，不影响本地原行SHA复核，不冒称宿主已seal。未覆盖/改写旧提证零行报告，没有用当前run-plans截点否定旧截点；本批run-plans各有精确run身份匹配但仅机械提取，未逐题分析。

原题面内嵌A8/A9历史药水统计和英文指导词，以及其他本角色旧局摘要，只作为题面原文；不作为Silent本批分母、预训练事实或收益证据。不读取其他角色知识库、不跨角色补证。不把知识前缀/完整问题存在当采用、动作完成或收益。六局是历史发现锚点，未引入独立时间后移新局；同存档重试按一局计，不拟新阈值，不从死亡推出其他选择必胜。

本批无自然下一局消费/正式发布验收；源码与knowledge保持零差异，铁甲行为等价，live/发布/对局未修改。等待缺证的原科学父要求继续开放。

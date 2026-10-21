# 静默策略提案逐项复核

记录时间：2026-10-21T10:26:46+08:00。任务strategy-proposal；角色silent；批次20261021-101302-strategy-proposal。
base=ae8355fdc563007cac6a729b6a137c4d1ea80ed6；fixes=[]；merged=null；本批没有源码、知识、游戏规则、版本或live变更。

本批十个已领取id均保留waiting。已实现子项有实际live祖先和逐文件SHA核验，但不覆盖原提案的复合职责，不能把整项登记implemented/duplicate；也不宣称shipped、下一局采用或自然收益。

## 派发与范围

开工git status为空，HEAD为上述完整40位提交；普通任务执行git merge --no-edit main返回Already up to date。对应learn.json精确行task=strategy-proposal、character=silent、worktree匹配，reason=proposal，含这十个proposal_ids；无research_request、implementation_request和proposal_repair。普通专题请求文件绑定旧批次20261010-150327，不匹配本批；没有改请求或learn.json，没有套用纯研究完成口径，也没有扩大队列。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议和代码提案闭环。STATE是历史检查点，decision-log后续有恢复运行及R409记录；本批不据旧STOP停点改运维。只使用本六局和各原提案的静默证据，没有调用模型、网络、游戏或下级agent。没有修改账号/模型配置；未读取本任务原生turn_context，不能据任务文字自报档位已生效。

十份原提案逐字核SHA，全部与专用队列proposal_sha256一致，保存为本目录<id>.original.md；来源/字节数/blob/SHA见original-proposals-verification.json。部分旧路径已不存在；按要求尝试materialize返回retained/persistent runtime retained，没有展开文件，随后只读HEAD中精确原文blob到scratch，未全仓归档或恢复其他checkout。一次读取脚本因未判断该回执产生FileNotFoundError，原失败保留于本次工具记录，本次SHA核验采用已存在Git原件；没有据此断言证据丢失。初次learn查询误匹配父容器导致输出截断，已改为只取本batch精确键，派发判断不依赖截断输出。

## 身份、冻结与原文覆盖

六个runs.jsonl原始行均为SILENT/A10，ended非空、victory=false。摘要仅作入口；下面关键结论另核原行，13道题的完整request、所有选项、answers均已读，未用最后五条代完整覆盖。

|局号|结束时间UTC|终层|decisions|states|Jev总数/完整读题数|
|---|---|---:|---:|---:|---:|
|VLZ6CCT8AQ0A|2026-10-07T07:38:37.200Z|45|699|729|136/5|
|8JRE1C4H4Z2W|2026-10-07T08:17:09.498Z|33|659|676|139/3|
|CA5KE8GFJ9X2|2026-10-07T05:17:57.587Z|13|265|282|58/1|
|5PM6JAQG6FNQ|2026-10-07T06:21:09.408Z|39|638|660|92/1|
|61E2QS63Y9WU|2026-10-07T05:43:43.383Z|28|443|462|70/2|
|DUZUBAJ3A8GP|2026-10-07T06:57:27.794Z|30|602|623|84/1|

共3306条本批decisions、3432条states、579条Jev原始行。完整读题13，未完整读题566；每一道已读/未读及具体定位见question-coverage.json（含精确decision_id/request_id、两流原始offset/bytes/SHA和identity出处）。未读问题是本批十提案关键窗口之外，本批没有以这些行推导新策略或收益；它们仅作身份和结构索引，后续研究需要读原文。其余模型/资源/十五机制范围未完成全量科学验收，明确保留waiting。不是579题策略全覆盖，也不是全历史研究。

完整读题原始决策行：267379、267612、267696、268455、269065、269706、269707、269748、269754、269770、270216、270264、270282。每份question-<决策原行号>.json保存整份原始Jev row，不截题面。question-state-chains.json逐题保留chosen/result/expect/rationale、rollout/SL等原字段及后继状态；compact-chains.json只是该原帧的有界视图。精确observed_ts与fingerprint共同定位起始state；后继仅沿同一run状态顺序读到下一回合，不用时间邻近建立所属局。实际执行另外核expect身份、后续chosen和state差值；单completed回执本身不等于整方案执行。13题及相关状态/动作共123条去重原行已seek回读并比SHA，另有resource-checks.json的休息/事件原帧校验。

本批所有Jev行按显式run_id归属，并由原始decisions精确decision_id核对，完整题的fingerprint/observed_ts也一致。没有用正文提局、question_id相似或时间邻近补身份。未知身份行排除且未强配：普通冻结states有3398未知身份，decisions有1934未知身份及1461无匹配decision_id。它们是整个源流的缺口计数，不能分摊到本六局。两条states坏JSON、两条decisions坏JSON、一条Jev坏JSON及brain两条坏JSON均在各manifest保留，不当零值；冻结扫描无不完整行。没有将最后五个gap_refs当全部缺口。

evidence-summary.json、v6-evidence/evidence-manifest.json与evidence/evidence-manifest.json均保留。两次提取冻结时点不同，持续日志的源文件SHA/size可以不同；本批decisions/Jev/run-config/v6行逐个offset/bytes/SHA和原始row完全相同，已机械核对，未覆盖早切点。对象库回执pending_host_seal=true/deferred_errno=18，仅本地视图完成，未冒称宿主seal完成。

|提取|流|冻结source_size|本批行数|冻结源SHA256|
|---|---|---:|---:|---|
|v6-evidence|v6-build|64678849|0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|v6-evidence|jev-prompts|2348470741|579|6772ccbf1b30aeda40630d5532f492e2ae15214821b1375f3940cfdbd659c175|
|v6-evidence|decisions|3237547901|3306|6260026192ebdf0a5a3202b7184563e84817e224707729e4d55a47745097c35f|
|v6-evidence|run-config|2373205|6|807f62e68bc5b6a06afa9e4fb4c9391e53a936199e91dcf4cc1d82907492e3bc|
|evidence|states|15107130797|3432|bbc7d0e787713b936662a41ab8e8b532187a143c2a190012d526ec221bd03cd7|
|evidence|decisions|3238204122|3306|6552d78caa3a9da52e609f6e09307ecb58cde4070fc1b52618179be0b95790b5|
|evidence|sl-attempts|51848089|29|46bc718d90ee53f803fb8a787164134668f54426ab2d252c21ab27d0f959a564|
|evidence|run-config|2373205|6|807f62e68bc5b6a06afa9e4fb4c9391e53a936199e91dcf4cc1d82907492e3bc|
|evidence|run-plans|10312716|33|e1e06d2e5cecb0e2120e6a5e258ff03e0d5c7a85f095219bd17695b4ccaee05e|
|evidence|brain|1187191943|183|00957262669aecaca6c94b210035eb772b9394c44f210aad0ecf16eaa992ecfb|
|evidence|v6-build|64678849|0|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|evidence|jev-prompts|2348674477|579|f21c1c0f69d63a573d43f137ee33b330a581baf968a062bc7bc1e7f421ceccb9|

## V6与Jev分别解释

v6-build扫描的660条源记录中本六局无匹配，输出0行的含义是no_match；不是原日志整个不存在，也不能说本六局生成了零个有效entries。六局run-config是历史v1 Jev配置，没有v6开关字段；因此“V6 off”不是可从这些配置直接证明的结论，保留历史缺流/无匹配边界。entries、jev_answer、fallback、unknown均为不可评价，不能用缺流补经验。

Jev这579条是另一条原始流；13道所选原题均有request和answers且无error字段，所选问题没有可据以解释的Jev error；未选566题没有做完整问答质量审核。Jev的answers只表示答题；采用和执行须核decisions chosen/result/gate_reject/selection_dispatch及states。13道decisions均无gate_reject、selection_dispatch字段（历史缺字段），不是本批证明“守卫从未拒绝”。当前源码后来新增的单动作回执不能倒填历史。

原题中的experience/deepseek_plan/history_estimate/potion_experience均是当时题面内容，不是本批重新验证的事实；尤其题面夹带旧A8/A9药水统计及其他局号，不计成本角色本批支持局，不读取它们对应角色库来补证。严格不把完整题面存在、接口接受、候选被选、动作completed或局内胜利混成收益证明。

## 逐问题原文核验与后果

|decisions原行|局/层/回合|精确decision_id|Jev原行/offset/bytes|Jev SHA256|
|---|---|---|---|---|
|267379|CA5KE8GFJ9X2/F13/T4|fa69876c-94f5-4915-a951-1d462efb0537|26720/385441212/8869|df5c7ab4a5610d09edf0efd76dc8cb7ebc4827a07c94458533211be8dd1b2014|
|267612|61E2QS63Y9WU/F17/T6|843bd895-a24b-4a17-837e-b818e1857689|26756/385829705/11501|b9ff2be68c133443e5547b941dcdf8e9a9a3448a56dcdda63bd58210b0455ae2|
|267696|61E2QS63Y9WU/F23/T4|bd5b1482-9eea-493f-b159-aa1eb3bc5a1a|26771/386041565/19778|25a6205522e0453bd5e1c93c4b18f3da5ca2ad6226433a00ab0014906587f823|
|268455|5PM6JAQG6FNQ/F39/T2|397711ec-b2e8-4554-a868-d1db0bf143b8|26880/387606289/22461|909c3a15e3c2fddfcbc5e261ac2c004c5d9cb577cb8b4f9d596dec1076fd8c71|
|269065|DUZUBAJ3A8GP/F30/T4|4ef39d99-ff8b-4432-82d6-6501f4f7d86b|26965/388806357/15324|af4986cc1ce006e4d4201e0b35b91f809fc4de42c01499f99e825dcc0846544f|
|269706|VLZ6CCT8AQ0A/F43/T1|f1233b3d-ee2c-4c00-ab16-d6aafe1dcb68|27083/390165294/25726|1f362c8fa55bfc679529011601e5a315a1c92b63998782692cd72e2a9c593421|
|269707|VLZ6CCT8AQ0A/F43/T1|1255c12e-9a86-457f-8d27-77861f95b4d6|27084/390191020/13409|452f8156db235d64762ef92c619eac5ed5350e5b61d67463261658dca6b513a5|
|269748|VLZ6CCT8AQ0A/F45/T1|04b5c1fd-fc69-4e01-9c6b-c2417cd16d31|27093/390280157/22106|3f0b05a04d3eabc7476a0f94abec7c604cbc4999ab1cda0da7d9df11b853e0bd|
|269754|VLZ6CCT8AQ0A/F45/T1|1bb372a9-4fce-4c82-b60f-70d23e4be75d|27094/390302263/14559|a68e165725cedadb2dd49ecd2ba4327e1041ef59dc2208221753a91db411531b|
|269770|VLZ6CCT8AQ0A/F45/T4|b058661c-0e8d-49f0-873a-057b31ed4fde|27100/390382440/16559|b38bfc557589cea24a7a8ee586d8b75b772169879728588dfa18640541bd6d38|
|270216|8JRE1C4H4Z2W/F33/T2|bc75ba70-96d4-46c3-b83a-5b2a240adab3|27175/391259703/13269|d912a7b169c133b1816513190ca11bc4c110db2efc88e10f99aec2c76ab3ae17|
|270264|8JRE1C4H4Z2W/F33/T5|27125175-ab43-41fe-98a5-6a28c59c6299|27191/391466909/18888|ffb5ec7923c0cc153bfc271290bdfa9387138dccb5810974087bad8e1ded1902|
|270282|8JRE1C4H4Z2W/F33/T2|a0a63fc0-828b-477c-9705-72c7e45ee4c3|27194/391510246/18141|94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09|

1. CA5 F13T4（267379）：完整题面仅两选项，长程指标相同且均本轮0损，Jev答plan1打击。chosen精确打击、completed，s273261→273262敌28→22；下一轮s273263敌力4→8、意图19。T5正敏捷路径没有实证，不能用“计划要步法”补敏捷。267381后续无Jev题，纯代码末轮不补成问答。
2. 61E F17T6（267612）：完整四选项，Jev答plan4防御/尖啸/防御。d267612–267615、s273504–273508逐步对应；双防御各3，玩家56→48、毒17→15使敌67→34，敌临时力量−4恢复2。原题模型的8损/33伤在此当轮兑现；这不是改变SL范围的证据。本局该战首试七轮胜，原sl-attempts行898另证。
3. 61E F23T4（267696）：七选项完整读取，原答plan3猎杀者+/杀灭；两动作实打，玩家25→10，敌合血90→43，净扣47，幻象余2仍活、双方力量3→6（s273593–273596）。另一个plan1为39伤0损的预测，未实打，不能代整战反事实或指定目标优先级。
4. 5PM F39T2末试（268455）：七候选均保留，Jev答plan7。冒泡动作d268455、s274379→274380实际耗1能，目标35血与毒状态不变；后续两防御、打击、结束也分别有回执。最终8血不等于单牌的反事实收益；同轮有开信刀/荆棘等来源，伤害须分源。原题写已知后抽19张，不能据此称整局随机池和完整抽序已冻结或得到不同启动顺序的受控胜线。
5. DUZ F30T4末试（269065）：三选项完整读取，答plan3、SL记录为played as answered；实打带毒刺击与小刀均指甲虫，s275010–275013玩家5→1、24挡仍需损4，甲虫86→71、丝虫13→2，下一轮甲虫2力/20攻。题面17伤与两敌本体合计净扣26是不同口径，现场还有3层反伤，未做逐段全链校准前不把差9直接报新bug或策略收益。原始睡眠/唤醒/成长全链仍待生产校准，四试不可当四个独立局。
6. VLZ F43T1施放前后（269706/269707）：前题10候选、后题3候选均完整读取，分别答plan1。神化实际花2能（7→5）；s275679→275680突然一拳9/1弱变11/2弱、两打击7→10、勒紧4→6、尖啸6→8，场外deck升级数均4。随后重问并逐步实打升级序列和火药，s275687敌254→203、玩家90→77，对应51伤/13损；前题预测43伤/14损不是实际执行数。已有源码有限映射与这组差值一致，不另造必打神化规则，也不认作后续所有升级已覆盖。
7. VLZ F45T1首问（269748）：九普通候选加药水选项完整读取，答plan4不含神化。题面明确MC 1/12、707ms、no rollout/fallback not a forecast，decisions也记录成熟度。d269748–269753分别实际施放勒紧/两防御/毒药/打击/触媒；没有施放神化。不能因全损上限67说已经确定死亡，也不能由一题硬设新预算。
8. VLZ F45T1后问（269754）：完整两普通候选与p0，答p0。题面MC12样本的“灵动步法/尖啸+”中位样本不是实际抽牌。chosen use_potion且completed，s275728→275729能量1→2、HP仍67，实际新增必备工具/生存者；d269755/269756代码重规划施放这两牌，至s275732有26挡；神化仍未施放。故两次MC结果不同不能当同起点预算A/B。
9. VLZ F45T4（269770）：四候选完整读取，plan2/3/4在模型上并列，Jev答plan1猎杀者/尖啸，d269770–269772与s275745–275748兑现13损/净扣24；31损32伤攻击候选未执行。下一轮三敌24/80/77，临时减力已恢复，意图26+17+40。不能把少8当轮伤直接认作败因，也不指定另一个focus胜线。
10. 8JRE F33T2首/三试（270216/270282）：两题全部五候选均读；原观测fingerprint相同，Jev均答逃离/毒刺/尖啸。首试实际按原答；第三试SL原行明确替换成打击且保留0/24与5/24死亡数差（首试原题自身是8样本，不能抹成24）。分别以d270216–219/s276208–212与d270282–285/s276274–278核整轮，47→44/32、敌326→316/309：多12血换7当轮伤成立。第三试换线符合当时探索规则，不等于纯接口bug；未取得原线完整胜利反事实。
11. 8JRE F33第二试T5（270264）：完整七选项及低可信整战模拟、24样本rollout均读；Jev原答plan4逃离/冒泡，rationale明确HP guard换plan6尖啸/逃离（16→4损、43→25伤）。实际d270264–266，s276256–259由25→21、敌249→224，冒泡未施放。candidate差值不能先记已兑现收益；此处之所以能确认当轮，是后续原动作和状态齐全。六次尝试是一局，前五次predicted_death读档、末次died分列，不报六个实死独立样本。

资源前因另核VLZ：F39两次事件33→30→26（d269691/269692），F40休息26/89→57/94、F42休息57/94→90/99，F43实战胜后33/99，F44休息33/99→67/104，再入F45。休息增加血上限和实际HP与神化构筑理由分开；药水使用另记，不把CURE_ALL按名字当回血。resource-checks.json保存精确原帧。此前其他胜场完整资源核验仍保留原提案，本批未重做全部20场的因果比较，故不调整休息或资源价格。SL恢复不计回复，投影/题面预计也不计实付血价。

## 源码现状与未关闭范围

只读live快照为cf4aff4ceebd958ad70b1512cc886c45bd8092aa，九个相关源码叶子与base逐SHA相同。source-verification.json保存每叶SHA、来源提交、实际live沿该文件的祖先提交；HEAD的last-source提交并非总是live祖先，因此没有用同字节就假认该HEAD提交已上线。

有限神化映射/传播已有a46239a29c3109ff9f69224ad77128d9929d3e9a及相关live祖先；事实参考30ec2425012eea75f41226b31d8180b1abb837bc明确actual_cast_this_fight=null，未知后抽保持unknown。候选审计live祖先9d8278702dbc581b5015ba7ec9a70dc0fb94cccb与单动作派发fdaf787a372880b0438e73bcac7e6d2168b038ed明确actual_turn=null、whole_plan_executed=null、state_effect_verified=false。这些保守字段没有虚假收益，但不能据其存在关闭原整链提案。没有改其日志契约，也未把可见原始state输入说成根本不存在；缺的是逐子项生产调用/后继校准或真正未走线路，不是所有日志缺失。

本批不拟合护栏、药水持有价、终局价值、SL阈值、启动阈值、固定杀序。13题都是已用于发现的历史帧，不是独立盲测；同局SL相关，跨角色不扩分母。后续若实现，须保留固定原帧/版本/进阶输入、撤源码红与恢复绿，并按原沙箱和live流程发布；本批无源码，不能声称做过这些验证。

## 十项逐项处置

### silent-proposal-89354805ee4d7e77 — waiting

账本：silent-0237, silent-0238；来源局：VLZ6CCT8AQ0A。

已核有限神化升级与事实展示在live；actual_cast_this_fight仍为null，未知后抽、重规划与SL的持续施放身份及联合消费者验收未完成，不能按整项duplicate关闭。

### silent-proposal-f2bfceddb1898dca — waiting

账本：silent-0106, silent-0019, silent-0201；来源局：VLZ6CCT8AQ0A。

原题证实707ms药水MC与1/12抽样退化，后问起点已变化；仍缺同起点、同随机池、同总预算的分配实验与成熟度曲线，不从这两个问题拟合预算常数或留药规则。

### silent-proposal-283a164780d11e69 — waiting

账本：silent-0237, silent-0238；来源局：VLZ6CCT8AQ0A。

原Markdown与保存SHA一致；与89354805同源，但已有窄升级不能证明本战真实施放及全后继覆盖，保留两原id并关联，未另建重复提案。

### silent-proposal-ebbfe3b97548756d — waiting

账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019；来源局：VLZ6CCT8AQ0A。

十五机制及资源复合范围仅完成本批若干原帧复核；逐源生产调用、效果期限、战斗/路线/休息的联合校准尚未完成，不以单公式或单局局胜替整项验收。

### silent-proposal-e5b87be50f28f311 — waiting

账本：silent-0079, silent-0021, silent-0125, silent-0018；来源局：8JRE1C4H4Z2W。

同盘换线多损12血增7当轮伤已由实际动作和状态核实；现有候选审计/单动作回执仍将actual_turn和whole_plan_executed留null，缺跨抽牌、重规划及SL的整候选持续归属验证。

### silent-proposal-49632bc4878fb597 — waiting

账本：silent-0005, silent-0231；来源局：CA5KE8GFJ9X2。

CA5原题及后继确认力量4到8、同招19伤；没有正敏捷施放，当前属性/逐击力量/虚弱/独立成长四路径的联合生产校准未完成，不借别局代CA5四路径验收。

### silent-proposal-66532328a585941f — waiting

账本：silent-0021, silent-0009；来源局：5PM6JAQG6FNQ。

无毒冒泡实际耗1能、目标毒和HP不变已核；仍缺同资源与完整抽序下不同启动顺序的整战配对及可复现收益函数，不拟合启动权重。

### silent-proposal-43a76a31ba7bdcfa — waiting

账本：silent-0030, silent-0027；来源局：61E2QS63Y9WU。

负敏捷双防御各3、毒17到15扣33、临时减力恢复已核；本局首试七轮赢，未提供同起始HP/构筑/完整抽序下另一完整SL线路，不改SL偏好。

### silent-proposal-5264153a4a4b0e5c — waiting

账本：silent-0039, silent-0209；来源局：61E2QS63Y9WU。

本体方案实损15、敌本体合计净扣47及幻象余2已核；39伤零损方案未执行，召唤/航行/复现/退场全链生产校准和另一目标序完整后继未验收，不强制首杀。

### silent-proposal-bddfa690a84e03d0 — waiting

账本：silent-0128, silent-0079；来源局：DUZUBAJ3A8GP。

末试T4实损4及其他T4防御后继原帧均保留；四试全败，睡眠/唤醒/眩晕/成长全链生产校准与同抽换序完整后继未验收，不拟合全死血价权重。

## 记录与验收

proposal.md交付给原调度器/运维；本批未新建重复代码提案id。既有账本只经根ledger.py update追加报告链接和本批waiting备注，proposed条目保持proposed，既有shipped条目不降级也不由本批新增shipped。既有经验发布与原代码提案待完成状态是不同对象。CLI输入/退出码/输出另存本目录；若CLI失败则保留失败，不手改账本。

没有源码提交，所以未跑tsc/vitest、未做撤源负控、未跑合后检查：tests={"tsc":null,"vitest":null,"cases":null}。不把机械提证脚本成功算作生产测试通过。没有commit、merge、release或双上线通知；没有源码需回滚，原行为和所有父要求保持。报告/提案是scratch产物，不进入Git；最终检查HEAD仍为base且工作树干净。精确最终验证和gitleaks见final-verification.json及扫描日志；不推送、不运行play、不停对局、不修改运维prompt。

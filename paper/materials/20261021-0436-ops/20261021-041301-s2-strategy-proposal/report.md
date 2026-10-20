# 静默猎手策略提案证据复核报告

本批十项原提案均保留 waiting。六局原始证据确认了局部机制和三组同指纹资源差额，但没有新证据支持修改出牌、用药、SL或终局参数；未复现一个需要新增生产补丁的当前缺陷。已有窄实现不能替代整项验收。

记录时间：2026-10-21T04:26:29+08:00，写前已运行 date。无生产源码或知识修改，无新提交、live合入、版本或 shipped；fixes=[]、merged=null，tsc/vitest/cases均null。

## 身份与基线

- batch=20261021-041301-s2-strategy-proposal；task=strategy-proposal；character=silent；reason=proposal；精确工作树与本批六局/十个proposal_ids已核，原行保存在dispatch.json。没有research_request、implementation_request或proposal_repair，不领取其他提案。
- 普通专题入口仍绑定20261010-150327，与本批不匹配；没有承接专题或读取其他专题替代身份。
- 初始git status --short为空；原HEAD为8dd8c40530197a8b34ff73a42cf633d4a495fdcd。按普通任务要求执行git merge --no-edit main，快进至下列base，仅decision-log追加两行，源码和knowledge没有差异。
- report.base/结束HEAD=572bf468bae3e248fbb6778e6b922f15baa5cc75。没有自行提交或再次同步后续main；scratch属忽略材料，最终工作树应保持干净，见verification.json。
- 已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环及现场保留说明；STATE旧停点与后续恢复各保留时间，不接管运维。独立完成，无子agent、网络、play或账号/config更改。任务指定普通/high，本轮未取得本线程原生turn_context，不冒报档位已核生效。

## 六局与机械提证

runs.jsonl原结果逐offset/bytes/SHA重新读回，character原值SILENT、规范化silent，均A10、ended非空、victory=false。历史脑调用统计与dirty执行身份保留，不据此重算纯Codex战绩或SL独立样本。

| 局号 | 结束UTC | 终层 | 决策 | Jev请求 | 完整读题 |
|---|---|---:|---:|---:|---:|
| DUZUBAJ3A8GP | 2026-10-07T06:57:27.794Z | 30 | 602 | 84 | 2 |
| 5PM6JAQG6FNQ | 2026-10-07T06:21:09.408Z | 39 | 638 | 92 | 2 |
| CA5KE8GFJ9X2 | 2026-10-07T05:17:57.587Z | 13 | 265 | 58 | 1 |
| 8JRE1C4H4Z2W | 2026-10-07T08:17:09.498Z | 33 | 659 | 139 | 1 |
| YF0LXT1QSTGG | 2026-10-07T09:15:57.174Z | 48 | 1065 | 269 | 4 |
| XP2SL33HT0D9 | 2026-10-07T10:10:37.387Z | 33 | 712 | 169 | 1 |

先运行指定根evidence_summary.py，再运行本树extract_evidence.py四流专项和默认八流；三命令均退出0。摘要只作初始事实入口；两份manifest均已实际读取，输出逐SHA校验，两次扫描的选中decisions/run-config/Jev原字节逐条相等。日志仍追加，两个冻结前缀不同，均独立保留，不覆盖旧截点或初稿。

| 目录/流 | 冻结source_size | 冻结前缀SHA256 | 选中行 | 全源invalid/incomplete |
|---|---:|---|---:|---|
| v6-evidence/v6-build | 64677581 | `49aa3d126db27a4a14889a3d81a0b1fafa79ec05813b595f14f24bb09b73bf71` | 0 | 0/0 |
| v6-evidence/jev-prompts | 2265497666 | `4a7ae6029980b1b0695a3afdb53fbb7cc2ec70faf16b8291c3e9b45564744c36` | 811 | 1/0 |
| v6-evidence/decisions | 3096924486 | `ae83d695adea87fd815592d5f4d09b37b4217904372308d468a458e6b28f25a9` | 3941 | 2/0 |
| v6-evidence/run-config | 2318944 | `1b971978903c24e08c72e20061c50c85469ae655d679eb44f0fc4bcd0e3df3e6` | 6 | 0/0 |
| evidence/states | 14907399350 | `1ed0d767f2126f14dfb8366cfc8e9cc8ec120b893e3c3e2f7dd04bfd0d1aac75` | 4062 | 2/0 |
| evidence/decisions | 3097524585 | `b09e77f33dd01d15954a810b105481b3294d17c49c0e511b146fe406c99a8c75` | 3941 | 2/0 |
| evidence/sl-attempts | 50842522 | `67fa88e0cfbe530907611878a3e9c86225dd3c5047e177ed2d3e2f19f4b03571` | 38 | 0/0 |
| evidence/run-config | 2318944 | `1b971978903c24e08c72e20061c50c85469ae655d679eb44f0fc4bcd0e3df3e6` | 6 | 0/0 |
| evidence/run-plans | 10223467 | `d6a94353653bbf96d3c90ade4afa2bbbc24263447fa9bd5618f38f58d80d25fa` | 33 | 0/0 |
| evidence/brain | 1150116286 | `f11c922e0c447e65285c745ad60ecf7a66948d6914bd864fc0f6a9a33ce871b9` | 188 | 2/0 |
| evidence/v6-build | 64677581 | `49aa3d126db27a4a14889a3d81a0b1fafa79ec05813b595f14f24bb09b73bf71` | 0 | 0/0 |
| evidence/jev-prompts | 2265599758 | `b758e8f18815311bf5d548f840ce6f31dc565993feb919bc97805e07ff698567` | 811 | 1/0 |

逐行evidence保留source/source_size/line/offset/bytes/SHA及identity出处。只接受显式run_id/state.run_id/fingerprint.run等一致身份，或经原decisions核对的精确decision_id；run-plans以run字段入选。811条Jev逐原源seek核SHA，全部连接本角色精确decision_id原行；不以正文、时间邻近或question_id字符串相似认局。时间只用于已核同局内的动作窗口。

v6-build源存在、冻结658行，六局全部no_match；六条历史run-config没有V6字段，所以开关未知，不能写成显式off。没有本批entries/jev_answer/fallback/unknown原行可解释，四项分别不可观测，不填业务零。Jev独立统计811条有效请求/811题槽，均有request/answers，选中有效行未见非空error；全源invalid与历史可能漏写不当零错误。完整题面存在不证明采用、完整派发、胜率或收益。

全源缺口：states有3371 unknown_identity和2 invalid；专项及默认decisions均1934 unknown_identity、1434 unmatched_decision_id和2 invalid；brain有2 invalid；Jev有1 invalid。各流冻结末行incomplete=0。未知不能按正文/时间补成本批，manifest最后五条gap_refs只是有限例子。历史是否缺流仍未知；这些缺口不并入已确定角色的成功/失败分母。

内容回执pending_host_seal=true、deferred_errno=18原样保存，本轮不冒称宿主封存完成。六局原运行源码含dirty知识/移动表，run-config-audit.json保留code.commit、dirty_files与原字段；当前知识JSON不能替代当时实际移动表。

## 原始题面覆盖及实际后果

完整读11条原始Jev row：state、完整题面/全部候选、答案和元信息均覆盖，原字节在question-<原行号>.json；selected-questions.json保留当前冻结引用。其他800条只机械索引/身份及原字节核验，没有逐题阅读全文或核全部后果。question-coverage.json逐题列model_read与未读原因：本轮限定十项提案关键窗口，其他题不支撑本轮结论；不是最后五条或全局完整覆盖。

| Jev行/局层回合 | 精确decision_id | Jev offset/bytes/SHA | decision行/offset/bytes/SHA |
|---|---|---|---|
| 26719 / CA5KE8GFJ9X2 F13 T4 | `e2beebbf-99bf-4612-8da3-844a88b3d7ad` | 385432356/8856/`5de14255fbb805067c6d702e8c1d31f61bbcc5043a1a59988135e1f2197f4f84` | 267377/672915234/5614/`83919781b4c7a5147d74df95bc7a34ae0d3a598e2a560dc7a264e55ee9e2cd7d` |
| 26868 / 5PM6JAQG6FNQ F38 T3 | `f7b88b58-d579-4565-83b2-f1b142beb160` | 387373662/30330/`a6fe0affad0399c3812b2e40db673913c10749868b14bbb5356944f683ad71ef` | 268385/676274640/25851/`c8b43669ce5906e86c8595621939144bdd402889a57c7d1c88bb049a9e9c53d1` |
| 26875 / 5PM6JAQG6FNQ F39 T4 | `561d69e3-cd22-4860-8d81-d4630037051a` | 387513383/11608/`ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb` | 268427/676439445/5951/`86a11b7115fcb55b33028452581869c7f1ec496a9f6467015197c7f54beddf51` |
| 26930 / DUZUBAJ3A8GP F27 T5 | `ebee5225-f98c-417f-8e14-cf9a94f4712c` | 388248392/9934/`3fec66ad2462edc468b0883c7021b3b165e2fd93bc2115c3d4d8e8609d27cbd6` | 268893/677806084/5866/`9f7af98e72cccdf4a0d97240df91dc22ef3cf2c22a09596b2b6923e59fd48532` |
| 26931 / DUZUBAJ3A8GP F27 T5 | `e8834900-a9ad-4f43-b256-351e5ed6c274` | 388258326/6515/`5c49e7aafbada732e368ee433eb8f232f5ffdc16ba2976dba40459d9898ee992` | 268894/677811950/2405/`04948bf0cc2b10d4ebec7afb4249f0713501f3bbc6597d87777ba2411aba532b` |
| 27194 / 8JRE1C4H4Z2W F33 T2 | `a0a63fc0-828b-477c-9705-72c7e45ee4c3` | 391510246/18141/`94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09` | 270282/682749244/12686/`721f1ef7b80a307741e97b8cf9ab47d6ef03330053a3d1e9051127cc2108f5df` |
| 27484 / YF0LXT1QSTGG F48 T1 | `c2213f65-9079-4ac6-9705-3f2407ff1121` | 394988203/25893/`1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52` | 271348/686624749/20711/`d8a8d897eee8763b37e68e586461b5ed0abbbc946943a812c7b5ed92fdfd9b7e` |
| 27508 / YF0LXT1QSTGG F48 T4 | `9918f4de-a34f-42a8-abd0-d7f2f1fa4419` | 395393660/30567/`7e3a74d8bcb32264ec6e80f657bfd1f7628308cb60ecd415f5733a2ab2958c14` | 271495/687052252/21604/`33d3c730ad73362bca5e09f77381b64419212d6a4c62ffe7fc151ce77b0c1910` |
| 27509 / YF0LXT1QSTGG F48 T4 | `aa816d31-b78f-40ee-9103-e71ba7d80173` | 395424227/18199/`daea5abb3675e4a24ba7e2467bcf1fe8e84e9fe56203da9df6de645c441258c9` | 271499/687078651/7062/`829804e36fc169c51b63b0da51e2812fe1b1960f9fa1792ad958de022384b304` |
| 27510 / YF0LXT1QSTGG F48 T5 | `860b25d9-4658-4a28-b465-cce80f3a1366` | 395442426/7714/`3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95` | 271502/687088578/2342/`78d0745e47e7b57899fc3d580fa4c24f95aaf53ae47d5855d82bc309656bdc04` |
| 27624 / XP2SL33HT0D9 F33 T3 | `33560091-b5f4-41b4-bcd8-06b3adf2327b` | 396759387/29521/`48d155c7dac4742223afb0a55203278f78ed555cc726725b82391ff511f94055` | 272040/688946628/24634/`32332518c91cd9c3333dbf733fa65bda521eb7187edbad1a6ae95ae99908521b` |

共重新读回118条相关decisions和120条states原字节；reviewed-*.evidence.jsonl保留完整row与offset/SHA，state-windows.json仅投影所需原字段，不整份灌states。原031314-s2索引先定位47决策/119状态，随后从logs原源重读SHA并与本轮冻结输出比对；没有以旧报告代原文。本轮补到电击完整题、实验体后阶段和XP死亡终帧。

11题对应首动作中DUZ生存者为pending (unstable)，另10条completed；后续YF生存者及XP投掷匕首也有pending，均由选择/后继状态继续核。全部118条相关原决策的gate_reject、selection_dispatch专门字段缺失，保留missing，不填false、不称全系统零拒绝；单动作completed不证明整方案完成。

1. CA F13T4（silent-0231）：26719原答plan3，267377/378打翻越、突然一拳，267379重新问答后补打击；273259—273262敌36加7挡→28→22。T5力4→8、覆甲7→6、攻击19；双防御10挡、中和后14攻，2血面对需损4，273269终帧死亡/敌16。覆甲跨轮变化未隔离全部触发条件；没有原dirty移动表，不硬编码新房间成本。
2. 5PM F38T3（silent-0233/0209）：完整26868含10个候选，原答plan10（.58/.53），268385—389实际药瓶、冒泡、猎杀者、下注、结束。274308—313玩家61→31，电击力2→4、攻击17→19且index4→3，当前源增长接线存在。药瓶实际三敌各3毒，组装师12毒；下注开信刀后组装师56，再毒至44，题面预测38不是实际结算。plan1预测损3/伤35、先杀戳刺和电击未执行，不能声称这条本可省27血并救F39；跨召唤代际持久身份/原移动表仍缺。本轮补全文读题，不继续沿用上轮“该题未读”的缺口。
3. 5PM F39T4（silent-0183/0005）：26875答plan1，268427步法、268428刀舞后生成触发重算，268429起code续步法/防御/切割/下注。274351—358负敏−4→−2→0、防御5挡，切割实扣2、开信刀后失落2血3毒；失落下轮退场、负力量消失，遗忘64血5毒、玩家19→5。现帧不证明此前各次抢夺累计都归属同一实体；遗忘死亡返敏和另一杀序完整后继未覆盖。
4. DUZ F27T5（silent-0168）：26930答plan2，生存者pending，26931答card0并实际弃精密瞄准；274834—839污染在选择后0→6→12→18、挡0→8→17、敌攻12→17→21→26。迷雾+实加6毒（7→13）和2弱（1→3），下一轮37HP、敌80、毒12，实际损9/净扣13。旧题面只预测扣7不含迷雾施毒；当前Haze已有live子实现，不能再把历史题面当当前遗漏。
5. 8JRE F33T2（silent-0079/0018/0021）：27194原答plan1，270282的SL改plan2，270283—285续毒刺/打击/结束。270216与270282完整fingerprint相同；276208—212原47→44/敌326→316，276274—278替47→32/敌326→309，即多损12、多扣7，两线结算沙坑均4。五轮死0/24与5/24不能写同死亡率；1200整场样本均0胜且明确低可信。原线已失败、替线局部多损血都保留，不推出禁止探索。
6. YF F48T1（silent-0079）：27484原答plan5，271348 SL替成步法/刺杀/两打击/防御+/赠礼，271354又由SL选择结束，未打斗篷/防御等续步。271309/348同fingerprint；277327—337原27→27、敌111→66；277366—373替27→18、敌111→73，即多损9、少扣7。54/36是预测，45/38才是实际净扣，两线24/24死不等动作等价或安全。
7. YF末次F48T4→T5（silent-0021/0027/0028/0085）：277512第一阶段4血4毒；277513新阶段212，旧敌毒/力清空、玩家能力保留。27508原答plan9含毒雾，但271495先被SL改plan2（两尖啸/打击/下注/致命毒药）；271498下注重抽，27509重新答plan1，271499实际只建触媒2，故不能把未施放毒雾或毒药归为原Jev整线已执行。两尖啸33→15→0，消耗附伤使212→197；下一轮仍零毒。27510弃防御实际completed，271503起code least-loss刀舞/防御/四刀；277520—527两挡13+10=23，第三刀才敏5→6、不倒补挡，消耗1加四刀各9共37，197→160。18血对44−23需21，差3死亡；277528攻击55是终帧更新后的意图，不拿55回算当轮伤。缺另一完整后继，不能强制毒雾优先。
8. XP F33T3（silent-0079）：27624原答plan2，272040 SL改打击/药瓶+；271992/272040同fingerprint。278028—031原45→36、两敌387→363；278076—079替45→31、387→360，即多损5、多扣3。候选药瓶毒全落火箭，实际爪9毒/火箭12毒；总净扣相近不表示后续等价。199/1200限时样本、B2零差不证明安全。
9. XP末试F33（silent-0241/0242/0065及原账本）：278236 T2轮初14挡，镣铐爪0→−9且攻击4→0；毒药转向火箭30→20、斗篷另6合20，T3仍37HP且减力撤回。T4两步法4敏、转向57→38、中和后28，偏折6挡；278257实33→11。T5防御6挡、毒刺改面向爪17攻，278261实死、敌153/125，含末结算3+7毒，不能把25或终帧别的意图混用。早期A1/A6原证及22次/50帧历史分母未重新提取，不冒称这120帧覆盖原101局。

以上三组当轮成对断言见paired-outcomes.json：同存档SL不增加独立局数；当轮同起点不控制后续抽弃、随机药瓶、整个战斗或路线。原提案保留SL成功、防御替换延长回合、已建能力仍败等反例，本轮未重提者只作为原文限制，不计新核实样本。历史题面中的其他局号和旧跨角色药水统计仅是原发出文字，不计本角色机制/药价证据，也未搬入知识库。

## 当前实现与逐项处置

只读冻结实际live HEAD=a7d07949efb03278a62050ca39447941309b4b7e。source-audit.json逐SHA核本树与live八个相关源码叶相同，以下源码均为该live实际祖先；这是现状核验，不是六局历史dirty源码重建，也不是本批发布/测试。

- `20b04517393708c73912326bb35d8448d1b3f77e`：live_ancestor=True，核验退出码0。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：live_ancestor=True，核验退出码0。
- `0e4fe4df89a06682468e0e4716c12126e76369d5`：live_ancestor=True，核验退出码0。
- `1698adc96ba434a46942321e0237b70657e625b2`：live_ancestor=True，核验退出码0。
- `1d57f9d0dbbb63603e9ce9768e74cb2021478464`：live_ancestor=True，核验退出码0。

20b045是Haze子实现；66283是answer/before_sl/after_sl、护栏与pending_dispatch；0e4fe4/1698是资源/沙坑候选差额；1d57是阶段结束参考。现源码明确candidate_forecast/current_turn_prediction、execution=unverified、actual_turn=null，不把候选预测冒充已执行整轮。高电压现接线按现场powers逐实体取增长，不因历史现象另加重复增长补丁。

没有新受控胜局不妨碍做事实记录；本轮已完成有界事实核验。仍待的生产执行归属须覆盖pending选择、抽弃/生成、用药、SL恢复、护栏与回合终止的共同来源，不能只用一段completed把后续都归到原候选。现有窄记录不能整项duplicate；本轮没有证成一个可新增而不臆造未知的机制/排序修复。参数调整另需独立后移完整后继，不能把缺数据变成已验证规则。

| 原CLI提案id | 原账本id | 本批处置 |
|---|---|---|
| silent-proposal-c20b5139dd0dff71 | silent-0168 | waiting：DUZ F27T5污染6/12/18、迷雾施毒及实损9已核，Haze已有live子实现；缺原dirty移动表和污染撤销/虚弱/挡联合生产重放，未选线完整后继未知。 |
| silent-proposal-ae9e692d680e3819 | silent-0183,silent-0005 | waiting：5PM F39T4负敏恢复与失落退场返力已核；缺逐实体抢夺累计来源、遗忘死亡返敏分支及同条件目标顺序完整后继。 |
| silent-proposal-52f1e1bd2e7db0ed | silent-0231 | waiting：CA F13T4至T5加压力4至8、覆甲7至6和攻击19至弱14已核；缺原A10移动表冻结、覆甲触发条件隔离及联合消费者重放。 |
| silent-proposal-6dd8bbff876be528 | silent-0233,silent-0209 | waiting：5PM F38T3完整Jev原答plan10与实损30已核，plan1损3未执行；已有高电压增长接线，但缺跨召唤代际持久身份、原移动表联合重放与另一杀序完整后继。 |
| silent-proposal-578e415a259e6835 | silent-0005,silent-0006,silent-0018,silent-0079,silent-0019,silent-0020,silent-0021,silent-0125,silent-0023,silent-0027,silent-0046,silent-0016 | waiting：8JRE F33T2同指纹SL替线多损12血、多扣7血已核；已有候选审计，抽弃/生成/用药/护栏后至回合终止的统一执行归属和联合验收仍未齐。 |
| silent-proposal-c0767768bf6a7ab1 | silent-0079 | waiting：YF F48T1同指纹SL替线多损9血、少扣7血已核；已有live候选比较，覆盖重放、未执行续步归属及独立受控后继仍缺，不拟探索血价参数。 |
| silent-proposal-a46bdb7fe711d79a | silent-0021,silent-0027,silent-0028,silent-0085 | waiting：YF末次T4完整原答plan9被SL替成plan2，下注后重新问答仅建触媒已核；阶段结束参考已有live子项，完整阶段/毒/能力/抽弃/消耗附伤联合校准未齐。 |
| silent-proposal-1044224808015e5c | silent-0079 | waiting：XP F33T3同指纹SL替线多损5血、多扣3血已核；药瓶实际毒分布异于候选，缺同抽序/随机落点控制的两线完整后继及独立时间留出。 |
| silent-proposal-7cbc6005db712ba9 | silent-0021,silent-0005,silent-0007,silent-0063,silent-0065,silent-0241,silent-0242 | waiting：XP末次轮初14挡、减力恢复、朝向57至38至28及278261死亡终帧已核；原A1/A6先证和历史分母未重提，各来源能力与完整派发消费者联合验收仍缺。 |
| silent-proposal-c59f592f1427a67e | silent-0005,silent-0006,silent-0019,silent-0020,silent-0021,silent-0028,silent-0027,silent-0079,silent-0046,silent-0085,silent-0060,silent-0063,silent-0065,silent-0062,silent-0039,silent-0013,silent-0011,silent-0023,silent-0018,silent-0087,silent-0241,silent-0242 | waiting：十份原文SHA核同；六局11题和局部原帧不足覆盖原101局、22次减力/50帧船夹板及路线/休息/药水的完整资源归属与消费者联合验收。 |

十份原Markdown全部实读且与专用队列登记proposal_sha256相等，proposal-readback.json记录原路径、实际读取路径及SHA。四份仍在原路径，六份从原031314-s2已保留的同SHA原文字节读取，未重写原件或展开完整checkout。原30个ledger id的相关原行只读保存在assigned-ledger-rows.json，保留其原claim/status/证据/提交/版本；不改旧shipped、不复写复盘、不增历史支持分母。

本轮没有新的独立游戏结论，不重复登记经验、代码提案或新机制账本，沿用上述十个真实CLI提案id与原账本链接；本报告不关闭原父学习要求。后续最小缺口逐项在表内，不能用排队/报告完成代实际学习入库、下一局消费或自然收益。

## 验证、限制与交付

- 无生产源码/知识改动，未运行撤源码红/恢复绿或tsc/vitest，三测试字段均null；旧测试/旧发布不算本批通过。没有commit、merge、release_id、上线双通知或shipped。无需进入live刷新/合入流程；其他角色行为保持。
- 所有提证退出码0，原行SHA与三组差额为离线证据核验；不计为生产测试。gitleaks原材料扫描退出0，新增交付材料扫描及最终HEAD/diff/status见verification.json。
- 若干较大工具输出被展示预算裁切，所有11题缺段以独立调用补读；完整覆盖只认这11题。原源码定位时一个猜测路径monster-moves.ts不存在，随后rg --files找到knowledge/monster-db.ts；不以猜测路径缺失推代码缺失。一次只读命令被sandbox准备期的并行临时目录消失阻断，原命令未执行，随后同命令成功；未改沙箱或权限。
- 本轮没有核完原历史101局分母、跨召唤代际身份、其他目标顺序/用药时点/路线休息的受控反事实；未观察不能补零，不能跨角色借证或用预训练知识补齐。
- 交运维：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-041301-s2/learner/runs/20261021-041319-89a68ef1-aba8-4786-a652-8a39fe195a8a-strategy-proposal/proposal.md、/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-041301-s2/learner/runs/20261021-041319-89a68ef1-aba8-4786-a652-8a39fe195a8a-strategy-proposal/report.md和result.json。逐项proposal_results全为waiting；实际上线仍须未来实现者自测合live后由ops核实登记，不发送外部消息、不代其他角色确认。

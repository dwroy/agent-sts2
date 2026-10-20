# Silent 策略任务：十提案逐项核验与等待原因

记录时间：2026-10-20T17:57:18+08:00（写入前已运行 date）。

本批 `20261020-174301-strategy-proposal` 的十个派发 id 全部完成本轮处置，均为 waiting。没有新增生产源码、经验库或账本记录，没有 commit、live merge、eval 版本或 shipped 声明。此轮提证及报告不证明正式发布、下一局消费或自然收益。

## 身份与范围

开工 git status 干净，HEAD/base 为 `d9ec75c0af106003dc48807f705bbd98a7e46b27`；普通任务合 `main` 返回 Already up to date。只读根 learn.json 对应行核 task=strategy-proposal、character=silent、reason=proposal、本工作树、六局和十 proposal_ids；没有 research_request、implementation_request 或 proposal_repair。普通专题请求绑定其他旧批次，本批不承接、不读取其 work_spec，不扩展队列。原调度行保存在 dispatch.json，折叠后的十项专用队列在 assigned-proposals.json。

六局 runs 原行均显式 SILENT、A10 且有 ended：CA5KE8GFJ9X2 F13、5PM6JAQG6FNQ F39、DUZUBAJ3A8GP F30、8JRE1C4H4Z2W F33、YF0LXT1QSTGG F48、XP2SL33HT0D9 F33，均为本局最终失败。逐行原文、offset/bytes/SHA 和当次 runs.jsonl 冻结切点在 run-verification.json。SL相关尝试属于这些局，不能增加独立局分母。

已读 README、最新 STATE-2026-10-19、decision-log 末尾、学习协议和代码提案闭环；状态总表早期停点与后续更新分别保留。没有运行游戏或网络调用，没有派下级 agent，没有修改模型、账号、prompt 或公共配置。本批任务请求 high，但现有项目转录未提供原生 turn_context，未独立证明运行档位已生效。

## 冻结证据与原始身份

按要求先生成 evidence-summary.json，再执行专用 V6/Jev 提取与通用 extract_evidence.py。两个完整 manifest 分别是 v6-evidence/evidence-manifest.json、evidence/evidence-manifest.json；执行输出分别留 v6-extraction.log、extraction.log。摘要与后续提取是各自冻结切点，日志追加引起的切点差异保留，未拿后一次覆盖前一次。

下表是通用提取实际读取的 manifest：

| 流 | 冻结字节 | 冻结前缀 SHA256 | 本批行数 | 无效/截断行 |
|---|---:|---|---:|---|
| states | 14702967086 | `a66607d5c3e9cdca04d62205964368a59c40d38ed749cf64d9a27d361989f249` | 4062 | 2/0 |
| decisions | 2940272734 | `6327890fc7191b643f019e7c7c7d88d2f6344f04df623f1e51cfbd93ec7c75d0` | 3941 | 2/0 |
| sl-attempts | 49788117 | `b0c7ffb9f4c2dbf43d4bedb404bf6f7dc695efdc9ce9c4a844b8389a240ae8a3` | 38 | 0/0 |
| run-config | 2240582 | `80ac2f7d9030022fa59a5f5861eccfea3a9423e873bb3ddac6d9d7c921406d40` | 6 | 0/0 |
| run-plans | 10059085 | `ea2398996657837b5208ca6700e4a7e2b98c661c7e316a35ada798736b15e8e4` | 33 | 0/0 |
| brain | 1112810231 | `71f97b899114a3c32aa23d7f4353e4af249e82f48b5ad619d2c7e501e430fcf9` | 188 | 2/0 |
| v6-build | 59678728 | `0e724b08c45e268598cee91999d7f92e16383ee0bc170488e2ce4f3f9155ab1f` | 0 | 0/0 |
| jev-prompts | 2138395315 | `f808aa748dc14b863cde10cf45bcbd8694c36887642f2334a224adec1880a510` | 811 | 1/0 |

所有逐行引用仍带 source_size、offset、bytes、sha256 和 identity。显式 run_id/state.run_id/fingerprint.run 必须一致；Jev 再用精确 decision_id 回连已核 decisions 原行。未用正文提及、时间邻近或 question_id 字符串推归属。18 个重点决定的观测还按同局、完全相同 observed_ts 与 fingerprint 连到原状态，18/18有精确关联，见 decision-state-joins.json。时间仅用于已确立局身份后的事件定位。

全流无效行：states 2、decisions 2、brain 2、Jev 1；其原字节位置及 SHA 留 manifest，不能强行分配给本批。decisions 的 unknown_identity=1934、unmatched_decision_id=1395，states 的 unknown_identity=3332，均是冻结全流身份缺口，不能当本批失败次数或不存在的证据。这里没有截断行，不意味着未读取窗口没有其他缺失。

## V6 与 Jev 分层解释

V6 流存在且已扫描，六局各0匹配，selection_status 全为 no_match。六份旧 run-config 没有 V6 字段，不能把字段缺失当显式 off。本批没有可读的 V6 entries、jev_answer、fallback、unknown 事件，它们均是历史未匹配/未知，不能填成六局每种事件都发生0次。不能从现代 V6 流的存在推本批历史已启用。

Jev 精确匹配分局为 DUZ 84、5PM 92、CA5 58、8JRE 139、YF0 269、XP2 169，共811行，均包含 request/answers；所选811行没有 error 字段。此计数不是“所有历史调用必无错误”，无效原行的身份未知保留。问题、答案和动作分开：完整题面或 answers 存在只证明请求/答复留档，不能证明原答采用、整线执行成功或收益。

全3941 decisions中3937有 chosen、3941有 result；gate_reject与selection_dispatch字段均未出现，记字段缺失，不能据此补写 dispatch 成功或完整执行。重点18条原行的 result 均为 completed: Action completed.；这只回执单动作。SL替换原答的64条事件在全批 decisions 中存在，未把它们说成 Jev 改选。历史 selection_dispatch 缺失也不能当现代字段出错。

## 模型实际完整阅读的问题与未读范围

以下六个问题读取了完整 request.state、全部 questions/criteria、answers 及原始身份；已复核其 chosen/result、gate_reject/selection_dispatch的字段缺失和后续状态。完整原行副本在 raw-review/jev-<行号>.json，直接原日志按 offset/bytes 回读再核 SHA。不能用摘要替代这些原文。

| Jev原行 | 局/层/回合 | 精确decision原行 | 原行 offset / bytes / SHA256 |
|---|---|---:|---|
| 26718 | CA5KE8GFJ9X2 F13 T3 | 267375 | 385427376 / 4980 / `c9e82ea5f42c68908d8b86dc8fbcf4a67116a5179d16ee87121b1cc6f7ce0598` |
| 26875 | 5PM6JAQG6FNQ F39 T4 | 268427 | 387513383 / 11608 / `ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb` |
| 26931 | DUZUBAJ3A8GP F27 T5 | 268894 | 388258326 / 6515 / `5c49e7aafbada732e368ee433eb8f232f5ffdc16ba2976dba40459d9898ee992` |
| 27175 | 8JRE1C4H4Z2W F33 T2 | 270216 | 391259703 / 13269 / `d912a7b169c133b1816513190ca11bc4c110db2efc88e10f99aec2c76ab3ae17` |
| 27510 | YF0LXT1QSTGG F48 T5 | 271502 | 395442426 / 7714 / `3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95` |
| 27603 | XP2SL33HT0D9 F33 T3 | 271992 | 396458993 / 20749 / `30d15694bf4faf5184e3e526d77788977757fcbd4d32655dfc67f9f26d69ed15` |

811个问题逐项身份、原行引用、完整阅读/仅索引状态及原因存 question-coverage.json。其余805个问题仅做精确身份和事实索引，未全部阅读全文：本轮以十个原提案的有界机制窗口和四组同指纹配对为范围，不声称全局/末五条/所有题面覆盖。特别是5PM F38整轮候选、8JRE第三试T2、YF两次T1完整候选、XP第二试T3的完整题面不在六题全文覆盖中；对应重点 decisions 原文和状态已另核，不能据此宣称这些未读全题的所有候选都完成验证。没有使用未读题目的优劣或题面里的历史异角色统计来补策略结论。

review_evidence.py 对本批日志流式定位，在上述有限窗口中重新从原始字节核289条状态、18条重点决定与六条完整Jev原行，不把4062条 states.evidence 全量灌入模型。verified-state-refs.json保存实际回读字节引用，verified-states.jsonl保留对应原文，state-projections.json仅用于观察窗口导航；重要结论以回读原行及 paired-observations.json为据。

## 本轮核回的事实与反例

- DUZUBAJ3A8GP F27 T4—T6，states274830—274839：火花3、污染0→3→6，勒紧能力不加污染；T5火花6，污染0→6→12→18，虚弱意图12→17→21→26，17挡后46→37。迷雾同时有施毒/弱收益，不能把污染血价换成一律禁技能规则。完整弃牌题26931选精密瞄准，decision268894执行option0并completed，后续仍实际打出防御/迷雾。原运行dirty知识输入及联合源码重放未补齐。
- 5PM6JAQG6FNQ F39 T4—T6，states274351—274362：−4力/−4敏，两步法使敏捷回0；失落2血3毒后退场，下一轮力量回0；遗忘下一次再使敏捷−2。末试并没有完成遗忘死亡返敏验证。F38 states274308—274317中电击23上限、力2/攻击17→力4/攻击19，T3损30，T4才退场；另一个先杀爪牙候选未实打，不记“必保27血”。没有跨召唤代际持久ID时不以index当实体终身身份。
- CA5KE8GFJ9X2 F13，states273237—273269：加压后力0→4→8，同喷水11→15→19；末轮中和后14攻击，10挡2血实际死亡，完整需损4、短2，实际损血截断2不能当完整攻击缺口。覆甲9/9/8/7/6只是现场观测，不推完整减层算法。完整弃牌题26718只证明选择打击并完成一次选择，不证明后面所有候选结果正确。
- 8JRE1C4H4Z2W F33 T2，decisions270216/270282完整指纹相同，states276208→276212与276274→276278核实原/替线实损3/15、扣敌10/17。第三次原答仍plan1，sl_explore将尖啸换打击，预测死亡0/24与5/24不能说并列；实际首题只派发共同前缀逃离。后续两次T3均损19，但抽牌与全战后继并非受控单变量。延长沙坑、保挡、输出各有取舍，不能从本局拟一条禁止探索规则。
- YF0LXT1QSTGG F48 T1，decisions271309/271348同指纹，两次原答均plan5；第三次有SL剪掉挡续步，271354实际end_turn。states277327→277337与277366→277373实损0/9、敌净扣45/38。全败/封顶预测不能抹掉血价。F48末次states277512→277513由4血4毒转212血新阶段，旧毒/力清空；T4重规划后只建触媒2，T5仍零毒。末T5在5敏下先获得13+10=23挡，第三小刀升6敏不倒补；197→160包括刀舞消耗附伤1及四小刀36，18血对44攻击完整需损21、短3，实际死亡截断18。未建立能力、未派发续步、将来毒都不算已兑现。原文中“已建毒雾仍失败”和F33成功SL作为需要保留的反例线索，本轮没有把对应完整战斗重新验收为新样本。
- XP2SL33HT0D9 F33首/末T1与首/次T3分别同指纹。T1 states278018→278023与278231→278236核损2/10、敌净扣25/34，末次同时取得1力量；T3 states278028→278031与278076→278079核损9/14、净扣24/27，随机药瓶实际落点后的状态与模型一条假定落点不能混同。末T2镣铐使爪−9力后下轮恢复，轮初14挡+斗篷6挡成20，零损；T4火箭57→转向38→弱后28，4敏脆弱下偏折6挡；末T5毒3+7后双敌仍存活。保挡、减力、朝向、能力成长均需分账，不能按少挡牌数或零胜并列直接拟全局系数。

这四组配对只确认当轮观测差，不是四个独立策略实验；同一局SL不拆作独立样本。末轮净扣、攻击毛伤、死亡截断与SL恢复分别记录，不将原HP重置计作回血。不存在“另一线本可赢”的本轮结论。

## 已有源码与提案剩余范围

核查时实际live HEAD为 `64c218a04ebe029fdda0b5f25025302ebf2a4124`。以下提交均用git merge-base --is-ancestor核返回0，保存 existing-live-sources.json：

- `aad2700abed6dff1d66e87fb36aaa6fedb39adf3`：silent-phase-current.ts列当前毒、已建能力、持有组件，代码主动保留 poison_damage_already_dealt=null；不能代逐候选毒/消耗/能力顺序联合校准。
- `9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`：silent-selection-audit.ts原答/SL前后候选与请求动作，execution_status=pending_dispatch、actual_turn=null。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：现有silent-sl-comparison.ts候选比较；scope=candidate_forecast、actual_turn_result=null。
- `0e4fe4df89a06682468e0e4716c12126e76369d5`：silent-sl-resource-comparison.ts的预测血价/毒/沙坑分账；execution=unverified。另读silent-selection-dispatch.ts与hand/loop.ts的接线，返回的是single_action_receipt，whole_plan_executed/actual_turn仍null。

另见 card-model.ts 的 HAZE已观察数值接线、turn-solver.ts 的 vitalSpark与当前值、rollout.ts 的HIGH_VOLTAGE增长集合、monster-db.ts的观测接口。它们证明局部源码存在，不证明冻结旧dirty输入已恢复或整提案已在实盘验收。因此没有把十项任一整项标duplicate/implemented；源码引用仅是部分覆盖，没有登记shipped。

## 十项处置

逐项证据局/层/回合、账本、原提案SHA和验证要求见 proposal.md及十份同名原文副本；每项最终处置如下：

- `silent-proposal-c20b5139dd0dff71`（账本silent-0168）：waiting。已核F27 T4—T6火花3→6、污染0→6→12→18与实际损9；缺原dirty运行知识输入、污染/弱/成长/挡/迷雾共同固定的源码重放，不能据局部血价修改技能选择。
- `silent-proposal-ae9e692d680e3819`（账本silent-0183,silent-0005）：waiting。已核F39抢夺后−4力/−4敏、两步法回0敏及失落毒死返力；缺逐实体累计来源、遗忘死亡返敏实盘与相应联合模型重放，不能由负属性公式宣称整项实现。
- `silent-proposal-52f1e1bd2e7db0ed`（账本silent-0231）：waiting。已核F13加压力0→4→8、喷水11→15→19与弱后14；缺原运行实际A10移动表及加压/覆甲/弱联合重放，覆甲完整减层条件仍未证。
- `silent-proposal-6dd8bbff876be528`（账本silent-0233,silent-0209）：waiting。已核F38 T3/T4电击力量2→4、攻击17→19及T4退场；缺跨召唤代际持久实体身份、原移动表和完整联合重放，单一HIGH_VOLTAGE接线不等全部验收。
- `silent-proposal-578e415a259e6835`（账本silent-0005,silent-0006,silent-0018,silent-0079,silent-0019,silent-0020,silent-0021,silent-0125,silent-0023,silent-0027,silent-0046,silent-0016）：waiting。已核同指纹沙虫T2实损3→15、实扣10→17；已有候选/护栏/单动作审计，但跨抽弃、生成、药水、重规划至整轮终止的执行归属仍缺，不能以预测字段代实际收益。
- `silent-proposal-c0767768bf6a7ab1`（账本silent-0079）：waiting。已核实验体同指纹T1实损0→9、实扣45→38与271354实际结束回合；缺覆盖重放到终止的完整归属及同后继整战对照，旧候选审计仅部分覆盖。
- `silent-proposal-a46bdb7fe711d79a`（账本silent-0021,silent-0027,silent-0028,silent-0085）：waiting。已核换阶段清毒、零毒触媒、23挡不追补及197→160分账；已有当前阶段字段，缺逐候选施毒/消耗附伤/能力顺序与抽弃重规划联合校准。
- `silent-proposal-1044224808015e5c`（账本silent-0079）：waiting。已核双蟹T1多8血换9伤和1力、T3多5血换3伤；缺同抽序、随机药瓶落点、等预算完整后继与独立后移验证，不从全败并列拟惩罚常数。
- `silent-proposal-7cbc6005db712ba9`（账本silent-0021,silent-0005,silent-0007,silent-0063,silent-0065,silent-0241,silent-0242）：waiting。已核双蟹镣铐−9后恢复、轮初14挡、转向57→38及弱后28；局部模型不能代完整候选联合传播和逐来源实际收益消费验收。
- `silent-proposal-c59f592f1427a67e`（账本silent-0005,silent-0006,silent-0019,silent-0020,silent-0021,silent-0028,silent-0027,silent-0079,silent-0046,silent-0085,silent-0060,silent-0063,silent-0065,silent-0062,silent-0039,silent-0013,silent-0011,silent-0023,silent-0018,silent-0087,silent-0241,silent-0242）：waiting。本批仅重核六锚点与上述局部机制/血价，未复做原101局审计；缺整线归属、路线/休息/用药消费者验收及受控整战收益，不把原历史分母搬作本批验证。

## 验证、限制和交付

无生产改动，不运行 tsc/vitest，不造撤源码红/恢复绿；三项测试固定null。证据SHA、精确身份/指纹和四组观测差值检查成功属于数据一致性核验，不冒充源码测试或策略效果验收。没有提交，因此无提交前gitleaks/Co-Authored-By步骤；没有行为版本、上线decision-log或双通知动作。原账本只读核既有来源，未新建经验、降级已有shipped账本或改写提案原文。后续仍由原队列保留waiting，新增本角色证据时续派。

限制包括：六局均为旧A10锚点；没有独立新局/完整受控后继；六题以外未做全文题面验收；原运行代码均dirty且实际知识输入未恢复；召唤代际实体身份、完整返敏与覆甲条件未证；现代日志字段不补写历史；原101局/跨进阶/路线休息和药水自然收益没有在本轮重新验收。无足够证据的部分保持未知，缺失不是0，当前源码存在也不是收益或学习父要求完成。

交运维：本目录 proposal.md、report.md、result.json；十个 proposal_results均waiting。base保持开工40位SHA，fixes=[]、merged=null。最终git状态与二进制diff另存 final-verification.json、working-tree.diff，scratch均为忽略材料，不提交报告去伪造无改动基线。

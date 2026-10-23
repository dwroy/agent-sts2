# 本批提案复核报告

时间：2026-10-23T14:46:00+08:00。角色silent；任务strategy-proposal；batch=20261023-110001-s2-strategy-proposal。

十项派发提案全部保留waiting。本批未修改生产源码、经验库或策略，没有源码提交、合入、发布号或实际收益声明。`fixes=[]`、`merged=null`，tsc/vitest/cases均null表示未运行；没有撤源码红/恢复绿实验，不填成功。报告型交付在忽略的本批scratch，工作树保持干净。

## 身份与基线

开工HEAD为4d27513beba43b10e147a066d288e3ddf1bf05ad，git status为空。普通批次按要求git merge --no-edit main，干净快进到完整base `f0906b2c5fc1d909e4c19d97ce47140356c8e389`，此后不继续追并行main。派发绑定实读根ops/codex-ops/learn.json对应行：task/character/worktree一致、reason=proposal、十个proposal_ids；无research_request、implementation_request和proposal_repair。旧deck-size请求绑定另一批，不套用纯研究身份。最终再次核绑定，见dispatch-binding.json。

六局runs.jsonl原文均character=SILENT、ascension=10且有ended，终层30/39/13/33/48/33，均败；见run-verification.json及run-outcomes原行。本批局号是原发现样本，不能称新独立后置验证局。启动时第一次检查错误地按小写字面比较，遇SILENT后中止；已改用大小写规范化并重新核全部六局，不隐去首次断言失败。

十份原提案全部读回并与队列proposal_sha256逐份一致，见proposal-provenance.json。六个原路径缺文件，已从旧114052-s2批次保存的同SHA原字节副本读取并复制到本scratch；不是用旧报告摘要替代原文。原账本30项折叠状态全部proposed，快照ledger-before.json。本轮不新建重复提案、不修改旧复盘/父请求/learn.json，也不标shipped。

本任务没有派下级agent、调用网络/LLM/游戏、访问二进制或其他角色知识库。原题内历史嵌入统计仅作为题面原文保留，未借作本角色机制、收益或独立分母。要求high保持；本轮没有独立可读的原生turn_context回执，不额外宣称档位生效已核。

## 冻结提证与缺失

已按指定入口运行根evidence_summary及本树extract_evidence（v6-build/jev-prompts/decisions/run-config），并按普通入口提states/sl-attempts/run-plans/brain，另提runs。提证与分析的后台进程均nice19，同时不超过4个。摘要实际SHA256：`ab89fc8f63e8db6ffa7c87e7bb3aacd75518d21a2e913529703ba19c771c6398`。摘要仅事实索引，未把最后五条当全量覆盖。

| 提证流 | 冻结source_size | 冻结前缀SHA256 |
|---|---:|---|
| v6-evidence/v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` |
| v6-evidence/jev-prompts | 2973080858 | `c852a9edeeec813ab0f007bdb501aeedfc37ec066d5f64b9b99c8225bd797214` |
| v6-evidence/decisions | 4247043856 | `6a05e0ca9ac709a04bc9e1cee4f35c0b7a6ad0e58df6b7f0db8561f683767aef` |
| v6-evidence/run-config | 2929627 | `b5aba07cb33d270304d8c501361eae34c85a6a09ed75aed0cb6728f3f27ca251` |
| evidence/states | 16490268355 | `8e3206684c867f4ba7a315a87af5ccd4e8e874916ac3e77aa569a0968d38ce02` |
| evidence/decisions | 4247853325 | `79e2b0acc19141e2568bfb34ff010a117f39d9d9daa3d5da4cda8665e6c550ae` |
| evidence/sl-attempts | 58325197 | `1310fb58f2e638a68ee9e134e2c1b30a7ed49ef9def41bb4b2c9bbaf90889746` |
| evidence/run-config | 2929627 | `b5aba07cb33d270304d8c501361eae34c85a6a09ed75aed0cb6728f3f27ca251` |
| evidence/run-plans | 11557136 | `2adccdf7e67b1d9d76d27d7ce7e3865064c0db6bbe2e95959c2c9ae55f441cc0` |
| evidence/brain | 1479411651 | `4ed3daefe628e7fb2e48b337f0fd66375800c9aa70e8e37a940549d2eb679fbb` |
| evidence/v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` |
| evidence/jev-prompts | 2973080858 | `c852a9edeeec813ab0f007bdb501aeedfc37ec066d5f64b9b99c8225bd797214` |
| run-outcomes/runs | 439348 | `bca1b770d54da0ba169452e89cecb6a01da7c52cfca6b11624f1bf13e7be33cd` |

两个提证入口的decisions切点不同，分别保留；本报告关联以v6-evidence原始decisions为准，states使用evidence冻结切点。每条原文的offset/bytes/SHA、identity字段和精确decision_ref均在对应evidence.jsonl与exact-state-chains.json，不覆盖旧截点或以时间邻近认局。run-plans按run字段核身份，未复核另一个旧切点，因此没有零行旧截点推断。

六局Jev计84/92/58/139/269/169，共811行；decisions3941行、states4062行。811条全部机械清点为call=ask，未见truthy error字段；这不证明答案正确或执行成功。V6-build扫描689行后本批全no_match：entries/jev_answer/fallback/unknown均无本批匹配原行，不能填成零或用Jev.answers代替V6.jev_answer。六份run-config没有V6字段，只能记历史开关未记录/未知，不能称显式off。construction-log缺流，不补零。

源Jev有1条invalid_json、decisions及states各2条invalid_json；身份不明的decisions全源unknown_identity1934/unmatched_decision_id1686、states全源unknown_identity3623，均不强归本批。各流冻结末行incomplete=0也不证明历史完整。manifest保存完整计数和有限缺口入口。对象视图可读，content回执pending_host_seal=true/deferred_errno=18，不能把宿主seal排队称已完成。

## 原题与执行链覆盖

本轮8题完整读全题面/全部候选/答案；另13题只读候选、答案、decisions与状态字段，仍记partial；其余790题未逐题阅读，原因是仅围绕十项原提案的有界复核，不扩为811题全史研究。question-coverage.json逐题列状态与原因，raw-questions保留所选完整原JSON。部分工具批量输出截断后，所称完整题已单独读全；未补读的题不计完整。

| Jev原行 | 窗口 | 全题阅读 | decisions原行 | states窗口 |
|---:|---|---|---:|---|
| 26719 | CA5KE8GFJ9X2 F13 T4 | 完整 | 267377 | 273259—273263 |
| 26868 | 5PM6JAQG6FNQ F38 T3 | 部分 | 268385 | 274308—274313 |
| 26869 | 5PM6JAQG6FNQ F38 T4 | 部分 | 268390 | 274313—274318 |
| 26875 | 5PM6JAQG6FNQ F39 T4 | 完整 | 268427 | 274351—274358 |
| 26876 | 5PM6JAQG6FNQ F39 T5 | 部分 | 268434 | 274358—274362 |
| 26929 | DUZUBAJ3A8GP F27 T4 | 部分 | 268889 | 274830—274834 |
| 26930 | DUZUBAJ3A8GP F27 T5 | 完整 | 268893 | 274834—274839 |
| 27133 | 8JRE1C4H4Z2W F17 T6 | 完整 | 269977 | 275960—275965 |
| 27134 | 8JRE1C4H4Z2W F17 T6 | 完整 | 269978 | 275961—275965 |
| 27135 | 8JRE1C4H4Z2W F17 T6 | 完整 | 269979 | 275962—275965 |
| 27175 | 8JRE1C4H4Z2W F33 T2 | 部分 | 270216 | 276208—276212 |
| 27191 | 8JRE1C4H4Z2W F33 T5 | 部分 | 270264 | 276256—276259 |
| 27194 | 8JRE1C4H4Z2W F33 T2 | 部分 | 270282 | 276274—276278 |
| 27478 | YF0LXT1QSTGG F48 T1 | 部分 | 271309 | 277327—277337 |
| 27484 | YF0LXT1QSTGG F48 T1 | 部分 | 271348 | 277366—277373 |
| 27508 | YF0LXT1QSTGG F48 T4 | 完整 | 271495 | 277513—277519 |
| 27603 | XP2SL33HT0D9 F33 T3 | 部分 | 271992 | 278028—278031 |
| 27624 | XP2SL33HT0D9 F33 T3 | 部分 | 272040 | 278076—278079 |
| 27634 | XP2SL33HT0D9 F33 T4 | 部分 | 272076 | 278112—278120 |
| 27671 | XP2SL33HT0D9 F33 T1 | 部分 | 272195 | 278231—278236 |
| 27679 | XP2SL33HT0D9 F33 T4 | 完整 | 272214 | 278250—278257 |

所选21题均能按身份核实后的observed_ts找到唯一输入state，核241个去重原始行SHA；不是用时间建立run身份。exact-state-chains保存各题chosen/result/gate_reject/selection_dispatch及后续全部窗口状态。历史gate_reject和selection_dispatch字段缺省明确记absent，不当作未拒绝或已完整派发。pending/unstable需要后续state确认：例如感染棱柱生存者和F17投掷匕首均有后续选择/状态，不能仅凭pending判失败。

本轮确定的局部事实及限制：

- 感染棱柱F27 T4迷雾实加6毒、能力勒紧不加污染；T5三技能污染6/12/18、攻击17/21/26，17挡实损9。原候选伤7而实扣13（93→80），不能把技能未来价值或旧模型题面数字当实际毒伤；没有固定替代整战对照。
- 下水道蚌T4首选翻越/突然一拳，后又选打击，敌36→22；下轮加压力4→8、喷水19。不能把plan3预测伤8当本轮最终输出。覆甲观察不自动识别全部减层条件。
- 抢夺窗口两步法使敏捷−4→−2→0；失落死后负4力量消失，下轮遗忘再夺2敏。电击窗口显示力2→4、攻17→19，死敌移除令index变化；这些只验证观察链，不证明当前模拟所有实体初始化/死亡返还分支。
- F17 T6完整三题（27133/34/35）原答损10伤37，护栏改损5伤33；首派投掷匕首、弃牌选生存者，再选防御/突然一拳，实际45→38、敌77→35（损7/扣42）。因此候选“省5血”不是实际保血收益。此处补足了旧报告未完整阅读的窗口。
- 沙虫F33首/三试T2同fingerprint，原SL字段为0/24与5/24死亡，不能说同死率；实际损3/15、扣10/17。第二试T5原答逃离/冒泡预测损16伤43，护栏改尖啸/逃离，实际损4扣25。末T11为5HP/22挡对37，需损15但实际死亡只扣余5，敌154→130为24毒后仍存活；本轮补核该终局原states及decisions。
- 实验体F48二/三试T1同fingerprint，实际损0/9、扣45/38；第三试271354明确end_turn，候选续步不能沿用。反例：本局F33第一次判死/成功reload，第二次won/end_hp20，原SL行928/929及states277089—277091的REWARD/MAP、HP20已核。不能用F48失败禁止全部SL；第四试T5未执行反例仍未整链验收。
- 实验体末T4完整题选plan9（23/24死亡），SL改为另一候选（24/24），计算下注后重规划实际只建触媒2、零毒，HP仍18、敌212→197；次轮44攻。不能称原答已采用毒雾或触媒已兑现毒收益。当前阶段事实不代逐候选分源伤害。
- 双蟹首/二试T3同fingerprint，实际损9→14、扣24→27，五轮样本8/24、整场459/199不同；末T1还得到1永久力，不能抹掉成长。末T4完整题及状态核57→38→28、两步法4敏/偏折6挡、33→11HP，实际扣34，与候选吻合；只证局部，不证全局优先级。

supplemental-raw-checks.json保留末T11、F33成功反例的原字节引用和SHA。上述补核没有新增独立局分母，同SL六次仍各计一局；后抽、药瓶、其他出牌和后续轮次未全部控制，不能由整战死亡时间拟合最优HP系数。

## 现有live源码及逐项处置

实读live上下文为b49984b7d716e02d8a2f3e324f66ebf68fa1b5a7。live-source-check.json核四个事实模块的本树/live blob相同且源码commit均为该live祖先：resource-comparison=0e4fe4df89a06682468e0e4716c12126e76369d5，sl-comparison=66283dd9982bdd7f480da7a4d9bfefea0572a9ac，selection-dispatch=fdaf787a372880b0438e73bcac7e6d2168b038ed，phase-current=aad2700abed6dff1d66e87fb36aaa6fedb39adf3。它们提供预测/单动作回执/现场阶段；actual/unverified语义不能被当成整回合实际资源账。没有将部分已实现升级成整项duplicate。

run-config的dirty_files包括当时monster-db/move-model等输入，原字节未取得完整冻结；当前数据库不是历史输入。该限制不否定原状态观察，也不是事实展示必须有胜局的条件：事实展示子项已有实现，本轮未找到经固定消费者验收的新增实现差量；规则变更另缺受控后置证据。没有据dirty本身报告代码bug，没有改变房间五样本门槛或其他角色行为。

| 派发提案 | 原账本 | 窗口 | 本批处置及具体缺口 |
|---|---|---|---|
| `silent-proposal-c20b5139dd0dff71` | silent-0168 | DUZUBAJ3A8GP F27 T4—6 | waiting：已核火花3→6、污染0→6→12→18及次轮消失；T5预测损9/伤7，实际损9/扣敌13。原dirty移动输入尚未取得字节冻结，迷雾施毒与污染的当前消费者联合固定重放未建立；不能只据候选差异改技能权重。 |
| `silent-proposal-ae9e692d680e3819` | silent-0183, silent-0005 | 5PM6JAQG6FNQ F39 T4—6 | waiting：已核两步法令敏捷−4→−2→0、失落毒死后力量−4→0、T6遗忘再夺2敏。缺逐实体累计抢夺来源账和遗忘死亡返敏分支的固定消费者校准，不能由当前负属性或单次返力推出完整实现及固定击杀序。 |
| `silent-proposal-52f1e1bd2e7db0ed` | silent-0231 | CA5KE8GFJ9X2 F13 T4—5 | waiting：已核加压后力4→8、喷水19、覆甲7→6；原题plan3续步后又重新选打击，不能把原候选当完整执行。缺运行时dirty A10移动表冻结及覆甲条件的联合消费者重放；不将单局攻击事实写成房间成本。 |
| `silent-proposal-6dd8bbff876be528` | silent-0233, silent-0209 | 5PM6JAQG6FNQ F38 T3—4 | waiting：已核电击力量2→4、攻击17→19及其他敌死亡后索引4→3，T4才退场。HIGH_VOLTAGE接线存在；缺新召唤实体初始化、连续增长和A10移动表的联合固定验收，不能把接线当整项duplicate。 |
| `silent-proposal-578e415a259e6835` | silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016 | 8JRE1C4H4Z2W F17 T6；F33 T2/T5/T11 | waiting：补核F17三题完整链：护栏后抽弃/重规划，实际损7扣敌42；补核末T11为5HP/22挡对37，实际只扣剩余5HP。仍缺所有窗口的固定消费者联合验收、原历史资源链及覆盖重放归因；保留原探索和HP护栏规则。 |
| `silent-proposal-c0767768bf6a7ab1` | silent-0079 | YF0LXT1QSTGG F48 二/三试T1；F33成功SL | waiting：同指纹T1实际损0/9、扣敌45/38及结束回合已核；F33第二试胜、余20HP有原SL行及REWARD状态佐证。已有live候选代价/派发审计子项；第四试T5未执行续步和完整覆盖重放消费者仍未联合验收，不能关闭整提案或禁止全部SL。 |
| `silent-proposal-a46bdb7fe711d79a` | silent-0021, silent-0027, silent-0028, silent-0085 | YF0LXT1QSTGG F48 末试T4—5 | waiting：完整题面选plan9，SL改线后重抽，实际只建触媒2、未建毒雾、次轮敌零毒；HP18不变、敌212→197。live已有当前阶段快照；逐候选分源伤害、阶段切换及后得敏捷不倒补挡的联合消费者验收仍缺。 |
| `silent-proposal-1044224808015e5c` | silent-0079 | XP2SL33HT0D9 F33 首/二试T3、末试T1 | waiting：已核同指纹T3实际损9→14、扣敌24→27；首/重试五轮样本8/24、整场459/199不同，B2零差不等安全。药瓶落点、后抽及独立后置胜线未控制；现有预测审计不能证明保血策略优于付血探索，不拟惩罚系数。 |
| `silent-proposal-7cbc6005db712ba9` | silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242 | XP2SL33HT0D9 F33 末试T4 | waiting：完整题面及实际57→38→28、两步法4敏、偏折6挡、33→11HP已核。原A1船夹板/A6镣铐来源及全部条件消费者未在本轮重核，不以A10单窗关闭跨条件提案，不新增出牌权重。 |
| `silent-proposal-c59f592f1427a67e` | silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242 | YF0LXT1QSTGG F48；XP2SL33HT0D9 F33 | waiting：原提案要求101局资源链、22次镣铐和50帧船夹板等独立分母的联合验收；本轮仅复核本批局部血价、阶段、朝向与成功SL反例，未重核完整历史及全部资源消费者。各分母不能互换，父要求保持开放。 |

每项原Markdown的旧/新行为、验证、拟合/时间切分和回退均按同SHA原件保留；本批处置构成补充，不重写它们。后续若补实现，先以所列固定窗口核真实消费者、撤源码失败/恢复通过及原测试入口，再按live发布流程登记；改变选线须另外保留独立后置整战对照与成功反例。未观察分支不补公式。

## 交付与账本

proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-110001-s2/learner/runs/20261023-142725-fcdb51d3-0bda-47fa-ab5d-74fe752eeff6-strategy-proposal/proposal.md

report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-110001-s2/learner/runs/20261023-142725-fcdb51d3-0bda-47fa-ab5d-74fe752eeff6-strategy-proposal/report.md

最终机器结果report.json逐项proposal_results=waiting；code_proposals沿原CLI十个ID，未新建ID。implementation_domains=[]表示本轮未实现生产改动，复核涉及combat/sl/structure不冒称实现。原ledger CLI将30项保持proposed并追加本批proposal/report及具体缺口链接；原失败、历史支持/反例、原提案和父要求不关闭。

没有源码改动，因此无需生产tsc/vitest、撤源码红绿、git commit/live合入、eval新版本或实际上线双通知。gitleaks与账本读回结果另见final-verification.json；若未通过会保留失败，不伪报完成。交付不证明经验正式入库、下一局消费、自然采用或胜率收益。

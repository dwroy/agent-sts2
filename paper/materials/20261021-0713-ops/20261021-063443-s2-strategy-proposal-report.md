# 本批十项提案复核

记录时间：2026-10-21T06:44:00+08:00（写入前已执行date）。批次20261021-063443-s2-strategy-proposal，角色silent，来源/实现任务strategy-proposal。base=984232f21e7ab608a488142c88a9982028d808ef。

结论：十原提案均waiting。没有修改生产源码、知识、规则或参数，没有提交、合入、发布版本或新shipped。保留原选择行为。旧局重读不增加support/repeat、独立样本或可信度。

## 身份、基线和原提案

开工git status为空；只读learn.json本批原行，task/character/worktree/六runs匹配，proposal_ids恰十项，无research_request/implementation_request。普通专题入口属于另一批次20261010-150327，不匹配，未借其work_spec代本批任务。git merge --no-edit main返回Already up to date，HEAD保持base。没有原生turn_context档位回执，故不另称high设置已核生效；没有改模型配置、账号或权限。

README、最新STATE-2026-10-19、decision-log末尾、学习协议和代码提案协议已读。STATE旧停点及后续恢复分列，不擅动运维。仅处理本批十ID。派发原行见dispatch.json，十提案折叠行见assigned-proposals.json，账本原件见ledger-originals.json。

六份Markdown登记路径消失；materialize入口返回persistent runtime retained。四个小型Git原件通过git show核SHA，其后一个候选Git文件SHA不等，未当原文，余下两份改从留存归档定位。随后只从已核整包SHA的Silent旧树留存归档读十个精确Markdown成员，逐件SHA与队列proposal_sha256一致，保存为<ID>.original.md。归档/成员/SHA在original-provenance.json；没有恢复整棵树或覆盖旧请求。原提案均已实际读取。

## 冻结证据与缺失

六局runs.jsonl均为SILENT、A10、ended非空、victory=false，无重复身份。逐原行offset/bytes/SHA在runs-identity.json。先运行指定摘要入口，摘要仅为索引，随后运行指定V6四流和默认八流提证，均退出0；manifest原件分别在v6-evidence/和evidence/。

| 局号 | 结束层 | decisions | states | Jev |
|---|---:|---:|---:|---:|
| DUZUBAJ3A8GP | 30 | 602 | 623 | 84 |
| 5PM6JAQG6FNQ | 39 | 638 | 660 | 92 |
| CA5KE8GFJ9X2 | 13 | 265 | 282 | 58 |
| 8JRE1C4H4Z2W | 33 | 659 | 676 | 139 |
| YF0LXT1QSTGG | 48 | 1065 | 1091 | 269 |
| XP2SL33HT0D9 | 33 | 712 | 730 | 169 |

默认八流共9,079条；专项四流4,758条；verify.py逐一seek回logs核offset/bytes/SHA和JSON原row，共13,837次引用校验，重叠包不当独立行/样本。verify.py退出0见verification.log。全流机械校验不等于语义阅读全部问题。

| 包/流 | 冻结字节 | 本批行数 | 全原流坏JSON/截断行 | 全原流身份缺口 |
|---|---:|---:|---|---|
| evidence/states | 14989323361 | 4062 | 2/0 | {"unknown_identity": 3380} |
| evidence/decisions | 3157279426 | 3941 | 2/0 | {"unknown_identity": 1934, "unmatched_decision_id": 1443} |
| evidence/sl-attempts | 51188447 | 38 | 0/0 | {} |
| evidence/run-config | 2337031 | 6 | 0/0 | {} |
| evidence/run-plans | 10259580 | 33 | 0/0 | {} |
| evidence/brain | 1165425799 | 188 | 2/0 | {} |
| evidence/v6-build | 64678849 | 0 | 0/0 | {} |
| evidence/jev-prompts | 2299947429 | 811 | 1/0 | {} |
| v6-evidence/v6-build | 64678849 | 0 | 0/0 | {} |
| v6-evidence/jev-prompts | 2299724447 | 811 | 1/0 | {} |
| v6-evidence/decisions | 3157138216 | 3941 | 2/0 | {"unknown_identity": 1934, "unmatched_decision_id": 1443} |
| v6-evidence/run-config | 2337031 | 6 | 0/0 | {} |

两次提证切点不同，保留各自source_size/source_sha256；逐行row相同，不把封套SHA随切点变化当原文变化。没有重用旧零行初稿或重写旧冻结切点。有限gap_refs最多五条不是完整缺口清单；全原流unknown身份和坏JSON不能自动分配给本批。run-plans按run，states按state.run_id/fingerprint.run，Jev按显式run_id/fingerprint.run及精确decision_id关联，冲突拒收；不从正文、相似question_id或邻近时间建run归属。

V6-build六局均no_match，无可读本批原row。entries/jev_answer/fallback/unknown均为本批缺记录、无法评价，不能填零成功/零降级。六份旧run-config都没有V6开关字段：历史缺流保留unknown，不能声称V6=off已获原配置证明。不借其他角色或其他批次补齐。

Jev本批811条均call=ask、有answers，无error/fallback键；这只是已归属行字段统计，不代表全局无错误或自然采用。历史题面中的经验/统计是输入文字，不当本次机制证据；不借其中其他角色统计建立Silent知识。提证不证明本批发布、下一局消费或自然收益。

## 问题覆盖和实际执行

完整语义读取四题request.state、instructions、全部criteria、answers/错误字段和身份，见下表及question-<行号>.json。其余807题未完整语义读取：任务限十原提案，选择四种换线窗口而非最后五条；全部811行仍逐字节机械核验。selected-questions.json保存12个定位入口，其中额外八题不冒称完整阅读。原配对的四个decisions已读原答案和实际执行，但原request所有字段未完整读，不算完整题面覆盖。question-coverage.json逐条列所有811题的覆盖状态及理由。

| 原decisions行/精确decision_id | 局/层/轮/尝试 | 原答→SL替线 | 原题边界 |
|---|---|---|---|
| 270282 / a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 8J F33 T2 第3次 | plan1→plan2 | 五候选；原0/24死、替5/24死；低可信B2全0不排名；SL明确未试更差仍探索。 |
| 271348 / c2213f65-9079-4ac6-9705-3f2407ff1121 | YF F48 T1 第3次 | plan5→plan4 | 七候选；均24/24死、预计总损27；单轮原/替损0/10、伤54/36；271354再覆盖为end_turn。 |
| 272040 / 33560091-b5f4-41b4-bcd8-06b3adf2327b | XP F33 T3 第2次 | plan2→plan9 | 九候选；B2时间截断199/1200、全0胜，差/SE为0；单轮损9/14、伤24/27。 |
| 272195 / dd020c3d-f675-45e0-98ae-5f09481898b4 | XP F33 T1 第6次 | plan4→plan2 | 五候选；B2时间截断150/1200、全0胜；五轮均24/24死；单轮损2/10、伤25/34，替线另得1力量。 |

四题答案与decisions.answers一致，fallback=false、reused_answer=false、无error。chosen只是首次动作，SL会覆盖原答。四对共41条decision的chosen/result/gate_reject/selection_dispatch已读并保存action-chains.jsonl；后二键在该有限链均absent，不填false。XP T1原/替的生存者/投掷result为pending(unstable)，后接selection/choose和end_turn、states新轮，不能把queued自身当完成。

四对起点完整fingerprint逐字相同，并与states的fingerprint和observed_ts精确对应；时间只排序同一显式run中的动作。下表为状态净差，不能当整战因果或完整未选候选的实际收益。

| 原/替decisions | 原states首→次轮首 | 替states首→次轮首 | HP损原→替 | 敌净扣原→替 |
|---|---|---|---:|---:|
| 270216/270282 | 276208→276212 | 276274→276278 | 3→15 | 10→17 |
| 271309/271348 | 277327→277337 | 277366→277373 | 0→9 | 45→38 |
| 271992/272040 | 278028→278031 | 278076→278079 | 9→14 | 24→27 |
| 271982/272195 | 278018→278023 | 278231→278236 | 2→10 | 25→34 |

脚本抽取324帧的有界原字段投影（state-projections.jsonl），完整原row在selected-states.jsonl；模型读取以下机制窗口的关键变化及四对端点，没有逐帧语义审阅全部324帧。关键四对端点另外由最终全包重建。全部4,062帧机械核原字节，未整份灌入模型。机制窗口：

- DUZ F27 T4—T6，states274830—274843：迷雾后污染3、勒紧不加、防御后6；T5火花6，污染0→6→12→18、挡17、攻击26、46→37血，次轮污染清空。技能也施毒/挡，不推出技能一概亏。
- CA F13 T1—T5，273237—273269：喷水11/15/19，力量0/4/8；弱后15→11、19→14。末轮2血10挡不足14，死亡截断净损2而完整缺2；死亡后荆棘扣敌19→16。覆甲9/9/8/7/6仅现场层数，不补未知减层条件。
- 5PM F38，274308/274313：23上限电击力2→4、攻击17→19，敌index因退场改变，不把index当稳定实体ID。F39，274341/274351—274358/274391—274397：玩家力敏−2/−2后−4/−4；首试两步法回0敏、失落毒死后返力，末试仅回−2敏且仍死。未观察遗忘死亡返敏。
- YF F48末试T3—T5，277512—277528：4血4毒跨至212新阶段，敌旧力毒清空；两尖啸33→15→0，次轮44；零毒且触媒2无额外毒伤。五敏下13+10=23挡，第三小刀使敏捷6未倒补；197→160含消耗附伤，18血对44−23需21、差3，实际死亡净损18。能力已建不证明能活，不将毒未启动当唯一死因。
- XP F33末试T2—T5，278236—278260：轮初14挡、镣铐使爪0→−9力/4→0攻击，斗篷后20挡且37血不变；T3减力恢复。T4火箭57→38→28，偏折在4敏脆弱下6挡；末轮11血/6挡对17。原先A1/A6历史先证与101局资源审计未重新全做，不能冒称覆盖。

同存档六次不是六个独立样本；没有控制完整后继抽序、生成和重规划。保持本批为发现/固定复核集，未来新Silent A10完局按时间后移作独立验证。没有拟合HP惩罚、能力优先、固定击杀序、持药价值或终局权重。

## 既有源码与逐项处置

只读实际live=150890f8bac0253f4e9216af3259784705c7550e。source-audit.json核七个相关源码叶与base/live字节相同，并核以下是真实live祖先：20b04517393708c73912326bb35d8448d1b3f77e（Haze接线），1698adc96ba434a46942321e0237b70657e625b2（SL预测审计），0e4fe4df89a06682468e0e4716c12126e76369d5（沙坑审计）。这些是已有子项，不是本批提交或整项duplicate。当前resource_comparison明确current_turn_prediction、execution=unverified；随机药水中位/缺线差值为空。通用HIGH_VOLTAGE增长、船夹板T2常量及毒/阶段处理已有，不据此声称全部联合消费者已验收。

原运行六份config均dirty知识数据，当前源/当前刷新知识不等于复原原dirty移动表。事实审计已经部分存在；宽提案缺的统一执行归属/逐来源联合认证没有由本次局部原帧解决。本批不扩做新的运行时状态机或参数提案。没有足够证据支持新的策略规则变更，现状保持。逐项所需补证和限制如下。

### silent-proposal-c20b5139dd0dff71：waiting

账本：silent-0168；来源局：DUZUBAJ3A8GP。

DUZ F27 T4—T6污染、火花增长及毒挡收益已核；Haze已有live子实现。缺运行dirty知识移动表和污染/弱/挡逐步联合生产校准，不能将Haze接线认作整项实现或据9损强制少打技能。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-ae9e692d680e3819：waiting

账本：silent-0183, silent-0005；来源局：5PM6JAQG6FNQ。

5PM F39两次抢夺和失落死亡后返力已核；缺遗忘死亡返敏分支、逐实体抢夺累计来源账及完整目标顺序对照，不能填返敏规则或指定击杀序。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-52f1e1bd2e7db0ed：waiting

账本：silent-0231；来源局：CA5KE8GFJ9X2。

CA F13的11/15/19攻击、两次+4力、弱后11/14和末轮差2血已核；缺原调用dirty A10移动表、覆甲减层条件隔离和联合消费者校准。当前刷新DB不能冒充原表。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-6dd8bbff876be528：waiting

账本：silent-0233, silent-0209；来源局：5PM6JAQG6FNQ。

5PM F38同23上限电击2→4力、17→19攻击已核，通用HIGH_VOLTAGE增长路径已有；缺跨召唤代际稳定身份、原移动表及连续联合回放，另一杀序未执行，不登记整项duplicate。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-578e415a259e6835：waiting

账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016；来源局：8JRE1C4H4Z2W。

8J F33同指纹T2实损3→15、扣10→17已核，原0/24与替5/24并非同死率；缺跨抽弃、生成、用药、护栏和SL恢复至终止的统一候选执行归属，预测审计不证明全线执行。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-c0767768bf6a7ab1：waiting

账本：silent-0079；来源局：YF0LXT1QSTGG。

YF F48同指纹T1实损0→9、扣45→38及271354覆盖结束已核；现有资源比较仍标execution=unverified。缺覆盖重放/未执行续步完整归属及独立受控后继，不禁止全部付血探索。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-a46bdb7fe711d79a：waiting

账本：silent-0021, silent-0027, silent-0028, silent-0085；来源局：YF0LXT1QSTGG。

YF F48阶段清毒/力、零毒触媒、23挡不倒补及197→160已核；缺阶段、能力、抽弃与附伤的完整候选联合校准和后移验证，不从持牌或已建能力推必胜或强制能力优先。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-1044224808015e5c：waiting

账本：silent-0079；来源局：XP2SL33HT0D9。

XP F33同指纹T3实损9→14、扣24→27及T1实损2→10、扣25→34已核；药瓶实际毒落点异于候选投影，缺保持完整后继的配对与独立留出，B2零差不足以设保血排序。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-7cbc6005db712ba9：waiting

账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242；来源局：XP2SL33HT0D9。

XP F33末次14+6挡、临时−9力恢复、57→38→28及脆弱6挡已核；缺抽弃后完整候选传播和逐来源消费者认证。原A1/A6先证和普通/升级完整分母本批未复验，局部实现不代整项。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

### silent-proposal-c59f592f1427a67e：waiting

账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242；来源局：YF0LXT1QSTGG, XP2SL33HT0D9。

本批六局及四组局部资源差不能替代原101局分母重算及路线/休息/实际用药/SL恢复逐来源资源账；缺整线执行归属与受控后继，不关闭宽父项或量化学习。

预期行为及验证：沿已保存原提案，不新设参数；补齐所列冻结输入和消费者重放后，按独立run/时间切分验证。若新增源码，应撤源码失败/恢复通过并跑原沙箱入口；现阶段不报已完成。回退：本批无生产改动；未来独立实现提交回退，不覆盖历史。

## 冲突、验证与交接

原578e提案把金刚杵链接到silent-0016，但该账本claim为护喉甲覆甲。冲突保留，不强行把本轮力量证据计入此claim、不改旧claim/首证/状态；既有异议链b07c96b10b1facb9f887a710继续开放，本批不代ops/watcher/Roy确认送达。原提案中的历史支持数及[0,20]范围不当本批跨进阶验证。

没有生产源码修改，故tsc/vitest/cases均null，撤源码失败/恢复通过不适用，没有伪造成功测试或新版本。证据脚本核验退出0仅为提证验算，不是生产套件。没有提交，所以提交前gitleaks门禁不适用；不推送、不运行play、不动live/知识/运维prompt。只有ledger CLI追加本批where/note追溯，不把旧shipped/observed改成proposed，也不新增support/repeat。

首次learn.json递归定位误中含批次key的顶层，造成过量输出；已改为只取精确本批行，不据其他行扩展任务。首次账本展示也输出过量，后改为限定claim和本批evidence字段。报告生成首个apply_patch因结束标记错误未写入，修正后重做；materialize retained、候选Git SHA不符及原日志缺口均保留，不当代码失败。没有运行模型档位切换或虚报生效。

交运维：本目录proposal.md、report.md、proposal-results.json、result.json。十项waiting保留待新数据；无merged、无源码commit、无新release，不关闭学习父要求。无需本批live合入或上线双通知。

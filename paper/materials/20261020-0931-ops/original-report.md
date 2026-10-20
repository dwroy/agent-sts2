# 静默策略提案批次证据与处置报告

记录时间：2026-10-20T09:21:25+08:00。task=strategy-proposal；character=silent；batch=20261020-091302-strategy-proposal。

十个已领取提案均保留waiting。本次没有足够证据确定新的可独立实施策略或数值缺口；已存在的神化窄实现与端点审计不代完整父项。fixes=[]、merged=null，没有源码提交、版本或shipped。逐项局号/层/回合、账本、反例、预期行为、验证及精确原字节引用见proposal.md。

## 身份与基线

开工git status干净，HEAD为32f0201faf019d61e379368596eafda3f715d7c2。已读README、最新STATE-2026-10-19、decision-log末尾、学习协议及代码提案闭环。根learn.json只读本批：task/character/worktree及六局集合匹配，reason=proposal，十个proposal_ids，无proposal_repair/research_request/implementation_request。普通专题请求绑定另一旧batch，不读取其work_spec或冒认专题。按普通流程git merge --no-edit main返回Already up to date，base保持上述完整40位；不再追随之后main刷新。

本次独立完成，无下级agent。未更改账号、模型、配置或服务；没有取得本线程原生turn_context/请求回执，不自行声称实际档位已经验证。六局runs.jsonl原行均SILENT/A10且有ended，结束于2026-10-07，都是历史败局；各SL尝试不扩独立局分母。run-identities.json及摘要outcomes保存角色、版本和逐行出处。

## 原文、冻结切点与机械校验

先执行指定evidence_summary.py；摘要SHA=46b8addc4292e98bbe7d58986c33b05252422082d75815d03faea5cc56876d5a。摘要仅索引。指定V6/Jev四流提取和其余五流提取都退出0，manifest已实际读取。全部7574个所属封套逐条按原source_size内offset/bytes回读，核SHA与JSON原行相等；同时核角色及状态身份。没有读取整份states到模型上下文，脚本流式处理后只核所需窗口。无效行是全源计数，不自动归本六局；各流冻结范围内无截断尾行。原始身份冲突/未知计数保留在manifest，未拿正文提及、时间邻近或相似question_id补所属局。

| 流 | source_size/字节 | 本批原行数 | 全源invalid/incomplete |
|---|---:|---:|---:|
| v6-build | 4513358 | 0 | 0/0 |
| jev-prompts | 1828766383 | 579 | 1/0 |
| decisions | 2776381218 | 3306 | 2/0 |
| run-config | 2185753 | 6 | 0/0 |
| states | 14618144737 | 3432 | 2/0 |
| sl-attempts | 49391038 | 29 | 0/0 |
| run-plans | 9670963 | 33 | 0/0 |
| brain | 1090991875 | 183 | 2/0 |
| runs | 382754 | 6 | 0/0 |

两个manifest独立保存各自冻结切点、全前缀SHA和逐行SHA；Jev identity中的decision_ref精确回连本次decisions原行。摘要与四流提取相同四流切点；其余五流是另一明确切点，不包装成原子跨流快照。content store回执为pending_host_seal/deferred_errno=18，文件已本地逐行核同，不称宿主封存完成。

十份原提案SHA全部等于队列add保存值。三份原路径存在；其余七份从上一批保留的original.md原字节读取并核同SHA，original-proposal-readback.json记原路径、真实读回路径和字节。没有用摘要替代提案正文，也没有因旧工作树路径缺失认定证据不存在。

## V6与Jev分别验收

v6-build源存在且该冻结前缀29行可扫描，本六局均0匹配。只据此结论为no_match；没有本批entries/jev_answer/fallback/unknown记录可解释，这些值为未知/不可适用而不是各为0。旧run-config六行均无v6字段，不能断言显式off，也不认定本历史局消费了V6。未借当前新V6局的正文提及建立本六局归属。

Jev原流579行：136/139/58/92/70/84，顺序对应派发六局。全部显式run_id且精确decision_id回连，fingerprint/observed_ts/floor/turn逐字段核同；579均有request及answers，原行error字段均未出现。这里“错误字段未出现”不等于579动作全部执行成功；也不是V6 jev_answer计数。chosen/result是动作派发，gate_reject和selection_dispatch在所核历史链缺字段，保持null，不能写成通过或0拒绝。

完整语义读取13道题，所有request.state/questions/criteria及answers完整读取，未截选项；另2道schema探查题完整读过但不计策略结论；其余564题只机械核身份/字节，未语义阅读。question-coverage.json对579题逐条保存decision_id、源引用、已读标记和未读原因，不用摘要最后五条冒充完整覆盖。额外初始schema探查完整读取了CA5 F2两个原行（d267125/d267128）；它们不属提案目标窗口、不计13题的结论覆盖，未扩学习分母。

| 局 | 窗口 | decisions原行 | Jev原行 | 精确decision_id |
|---|---|---:|---:|---|
| CA5KE8GFJ9X2 | F13 T4 | 267377 | 26719 | e2beebbf-99bf-4612-8da3-844a88b3d7ad |
| 61E2QS63Y9WU | F17 T6 | 267612 | 26756 | 843bd895-a24b-4a17-837e-b818e1857689 |
| 61E2QS63Y9WU | F23 T4 | 267696 | 26771 | bd5b1482-9eea-493f-b159-aa1eb3bc5a1a |
| 5PM6JAQG6FNQ | F39 T2 | 268455 | 26880 | 397711ec-b2e8-4554-a868-d1db0bf143b8 |
| DUZUBAJ3A8GP | F30 T5 | 269068 | 26966 | 48174eb3-a1e5-4db0-ac76-35377a0fd18e |
| VLZ6CCT8AQ0A | F43 T1 | 269706 | 27083 | f1233b3d-ee2c-4c00-ab16-d6aafe1dcb68 |
| VLZ6CCT8AQ0A | F43 T1 | 269707 | 27084 | 1255c12e-9a86-457f-8d27-77861f95b4d6 |
| VLZ6CCT8AQ0A | F45 T1 | 269748 | 27093 | 04b5c1fd-fc69-4e01-9c6b-c2417cd16d31 |
| VLZ6CCT8AQ0A | F45 T1 | 269754 | 27094 | 1bb372a9-4fce-4c82-b60f-70d23e4be75d |
| VLZ6CCT8AQ0A | F45 T4 | 269770 | 27100 | b058661c-0e8d-49f0-873a-057b31ed4fde |
| 8JRE1C4H4Z2W | F33 T2 | 270216 | 27175 | bc75ba70-96d4-46c3-b83a-5b2a240adab3 |
| 8JRE1C4H4Z2W | F33 T5 | 270264 | 27191 | 27125175-ab43-41fe-98a5-6a28c59c6299 |
| 8JRE1C4H4Z2W | F33 T2 | 270282 | 27194 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 |

每题完整原封套保存在questions/d<行号>.json；全部题也在jev-prompts.evidence.jsonl。question-chains.json核同题起点到本轮末的真实chosen/result、后继state引用及SL字段。F13T5和F30T6无对应Jev请求，相关代码路径决策仍在；这里读F13T4及F30末试T5各自真实ID，不冒充下一轮题。

本角色历史题面内携带的旧potion_experience跨角色统计与其他局提示，只作为“当时模型看到了什么”的原文留档，不当本角色新证据、不搬入经验库、不计分母。题面存在不代表已采用；answers、动作回执、后继观测、完整候选执行、整战收益分开。

## 关键原题到动作及后果

VLZ F43 T1 d269706原答plan1先神化；动作0完成后s275679→275680能量7→5、升级真实发生。d269707是新题，原答plan1且带火药；s275687为次轮77HP/敌203，局部对应51伤13损。原43伤14损预测不能代实线，不能把重问题面当原候选已整线执行。

VLZ F45 d269748原答plan4不打神化，药水MC仅1/12样本/707ms、rollout horizon1/samples1/best=null，题面明示fallback非forecast；不是确定死亡。d269754才选p0并实际use_potion完成；s275728→275729能量1→2、HP67不变、实抽工具/生存者，与中位样本步法/尖啸不同；d269755/756实际打工具/生存者，神化未兑现。T4 d269770原答少损线13损24伤并执行，攻击候选31损32伤仅推演。s275754为32血20挡对59，完整需损39、差7，不能把净掉到0的32当完整入伤；三敌未减员不反证未打候选必胜。F43胜后33/99，F44实际回34至67/104；火药消耗、奖励带入痊愈与实际喝药分别留vlz-resource-window.json，不把SL恢复当回血。

8JRE F33 首/第三试T2原指纹相同，两个Jev答案都是plan1；第三试sl_explore将尖啸换打击，0/24与5/24死亡样本不能写并列。s276208→276212与s276274→276278分别HP47→44/32、敌326→316/309，多12血只多7净扣；都没有另一条完整获胜反事实。第二试T5 d270264原答plan4，rationale护栏换plan6，25→21、敌249→224；结构hp_guard缺字段不是没有护栏。原journal仍写原答的历史现象已存在，使用sl_explore及实际续步校对，不重复修同一旧问题。

CA5 F13蚌0/4/8力、11/15/19攻击及弱后11/14已核；正敏捷未实见。61E F17 T6双防御各3与毒17+16后敌67→34、玩家56→48已核；F23 T4本体76→41/幻象14→2、双方力3→6、玩家25→10，未打另一目标线仍未知。5PM F39 T2实际无毒冒泡能量5→4、目标HP35不变，后续整轮结果不归单卡因果。DUZU F30首试临减2→−4→次轮4/22攻，末试T5原答plan1已派发、T6仍1HP且敌59；前三判死恢复与末次死亡保留区别。所有状态数值来源及反例在proposal.md，不外推其他角色/进阶。

## 实际离线消费者与源码核对

本基线既有selection-execution消费者已用本次回源数据实际调用；输入manifest记录原行号/指纹/SHA，输出gzip及日志留本目录。tsx CLI首次因listen EPERM启动IPC失败，消费者未执行；保留command-failures.json。用同输入和源码改为node --import tsx后退出0，此为调用方式恢复，不是改源码或重跑对局。

| 局 | 实际接受范围 | 动作 | 候选片段 | 整轮观测端点 | 未知轮 |
|---|---|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | full | 699 | 99 | 10 | 97 |
| 8JRE1C4H4Z2W | full | 659 | 113 | 44 | 67 |
| CA5KE8GFJ9X2 | existing_decision_ids_only | 264 | 41 | 0 | 46 |
| 5PM6JAQG6FNQ | full | 638 | 83 | 25 | 76 |
| 61E2QS63Y9WU | existing_decision_ids_only | 442 | 63 | 14 | 59 |
| DUZUBAJ3A8GP | existing_decision_ids_only | 599 | 77 | 28 | 68 |

CA5:267143、61E:267517、DUZU:268789/268818/268864原决策缺decision_id，完整输入被消费者拒收，错误保留；只在明确剔除此五行的有界子集读回，不叫完整局验证。合计3301有ID动作、476片段、121整轮端点，完整候选认证为0，原因是消费者明确保留actual_full_candidate_result=null，不能把0认证当0实行动作或0收益。

live只读快照=c351dbe7b5603bbb591e0f63d88be32fa60df56f，所核13个精确源码路径与base全部同blob；路径、完整源码commit及live祖先核验见source-verification.json。a46239a29c3109ff9f69224ad77128d9929d3e9a、ba23ca693151fa8c6f7fe035e640dc30f05ccd75均为实际live祖先，仅代表已存在的神化窄项。本次不借另一局升级证据学习新数值，不重复修改原owner已实现部分，不把实际施放字段仍null的宽项记duplicate。离线读回证明工具边界，不证明自然局消费者已经采纳、正式知识入库或收益。

## 逐项最终处置

| 原CLI提案ID | state | 具体缺数据/覆盖理由 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | 已核神化窄升级为live祖先；仍缺跨抽牌、选择、药水、SL及换战的实际施放持续归属/生产读回，未知属性组合升级未校准，不能把子项实现登记为整项完成。 |
| silent-proposal-f2bfceddb1898dca | waiting | 原题707ms/1个药水样本及horizon1退化已核；缺旧dirty模型/知识/随机池的完整冻结输入与同起点、同总预算的MC配对和成熟度曲线，不据单题改预算、血价或留药规则。 |
| silent-proposal-283a164780d11e69 | waiting | 与89354805同源但保留独立原ID；实际施放持续归属与未验证升级交互仍未覆盖，不能仅凭题意相近登记duplicate。 |
| silent-proposal-ebbfe3b97548756d | waiting | 原十五子项仅有局部原帧与现有实现；缺属性/升级/状态期限及战斗、路线、休息全部消费者的联合固定校准，当前端点审计不能证明整项完成。 |
| silent-proposal-e5b87be50f28f311 | waiting | 已核Jev原答、护栏及SL替换和实际端点；缺跨抽牌、选择、重问、药水及SL的完整候选持续归属，现有消费者明确不认证完整候选执行或成长因果。 |
| silent-proposal-49632bc4878fb597 | waiting | 本蚌窗口没有正敏捷实测，缺力量、正负敏捷、虚弱及独立成长四路径在同一冻结生产调用中的联合校准；不引入统一保血/输出权重。 |
| silent-proposal-66532328a585941f | waiting | 无毒冒泡花1能且局部零效果已核；缺同HP、牌组、药水、完整抽序下不同启动顺序的受控整战比较和收益函数，不能由局部无效拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 族母负敏捷/防御3及毒端点已核；缺相同起始HP、构筑和完整抽序下另一条完整SL线路及生产整战配对，不以本局首试胜利更改SL阈值。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 已核航行成长与幻象残2血仍在场；缺A10召唤代际、成长、复现、退场全链生产校准及另一目标序完整后继，不强制首杀。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 已核临减恢复后成长至4力/22攻击；缺失血唤醒、眩晕接续、成长全链生产校准及同抽换序完整后继，同局四次相关尝试不能拟合血价或固定杀序。 |

未新建提案ID、不改原提案。最终code_proposals沿这十个既有CLI链接；implementation_domains=[]，本批没有实际实现。原十份提案涉及领域仍保存在queue-snapshot.json。本批13题是发现/复核材料，不是时间后置盲测；相关SL与多机制帧不加独立分母。旧运行版本dirty，不能由提交号单独还原整套旧知识/随机池。没有足够证据就保留当前策略，不能用预训练补未知。

## 记录与验证口径

固定原帧37项事实断言通过，原字节/精确身份核验通过，消费者有界读回通过；这些是证据与既有工具核验，不是新增源码的生产测试。无源码修改，撤源码失败/恢复通过不适用，tests={"tsc":null,"vitest":null,"cases":null}；未运行tsc/vitest、不借历史绿灯、不填0。未进入live合入流程、未加eval版本/上线记录/规则双通知，也未标shipped。

只经根learner/ledger.py update给原26个账本追加本批proposal/report路径与处置note，by=learner:strategy-proposal；不改原claim/status/version/evidence/first_run/prior/effect，不重复增加支持/反证分母，不将既有shipped降成proposed。没有新条目需要新增proposed。proposal_results交调度器沿原ID登记，根请求/队列不手改。CLI原行及读回保存在ledger-update材料；最终工作树/HEAD与gitleaks结果另见final-verification.json和gitleaks日志。

本批未开局、未请求LLM/网络、不推送、不动live或其他角色私有知识。不关闭学习父要求；提证、报告、源码已存在与下一局采用/收益分别验收。

运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-091302/learner/runs/20261020-091306-6675574d-1c04-4e81-a61f-de0d6cb95b2d-strategy-proposal/proposal.md

报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-091302/learner/runs/20261020-091306-6675574d-1c04-4e81-a61f-de0d6cb95b2d-strategy-proposal/report.md

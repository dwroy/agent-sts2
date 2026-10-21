# 本批策略实现与证据交接

2026-10-21 20:14 CST；silent；strategy-proposal；batch=20261021-194314-s2-strategy-proposal。

## 结论及真实交付状态

已依据 PD9AYQVMLQW6 F49末T10准备一个普通生存者/同值凋萎的窄修复，固定原帧消费者复现支持该数值更正，未得到通关收益证据。14项定向通过；撤源码3项失败、恢复14项通过；生产tsc通过，gitleaks通过。完整沙箱入口仍有4个既有测试文件6项环境限制失败，撤补丁后同样失败。遵守“每次代码提交前原沙箱入口退出0”的条件，本批没有源码提交、没有合入、没有版本、没有上线通知或shipped登记。补丁完整保留，交ops原环境补跑并为提交/live兜底。全部十个父提案保持waiting，不冒称已实现或duplicate。

base/最终HEAD均为 `191aefc652cd5a8304c1bc7b762f0fd9b0d02639`；git merge --no-edit main 开工时已核 Already up to date。普通队列派发的task/character/worktree/十个proposal_ids完全匹配；没有research_request或implementation_request。普通专题文件绑定的是另一20261010批，不适用于本批；没有领取其他提案、读取其他角色知识或另派agent。只核启动命令指定gpt-6.1-sol/high/default；未核原生turn_context，不宣称运行档位已生效。

工作树有4个本批文件修改/新增且已暂存，尚未commit；不是“无源码改动且干净”的报告型结案。`prepared.patch` 是 git diff HEAD --binary 的四文件完整补丁。没有因沙箱限制声称源码失败，也没有绕过提交条件。报告为 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-194314-s2/learner/runs/20261021-194319-51102f43-f0a6-472c-897f-0d0be81e5922-strategy-proposal/report.md`；提案为 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-194314-s2/learner/runs/20261021-194319-51102f43-f0a6-472c-897f-0d0be81e5922-strategy-proposal/proposal.md`。

## 实盘依据与修复边界

原提案 silent-proposal-d7b8d36cf3d0303d，原账本silent-0268；同根因旧窄实现bf423c173d3be348a4ad714e1d26516df619ff41是读取时live祖先，当前源码已有唯一余牌单弃，不能因此把完整父提案登记duplicate。本次不新增重复根因ID；只经根ledger.py update追加本次候选/证据/报告链接，保留原0268已shipped历史身份，不将本批候选当已发布。回执见ledger-proposal-receipt.log。

PD9原帧291337—291342：3HP/8挡，两张12伤凋萎；防御后18挡并新增第三张；打击后19挡/敌250；生存者进入选牌界面31挡/三同值凋萎，Jev选card0，返回32挡/两张。原判官SL1067明确23攻击+24持牌伤；算术需损15/余HP−12，实扣3死；敌先结毒250→244。代码先前在选择未定时保留36持牌伤、报己方回合先死/HP−1，未走到后面的毒与攻击。

当前生产replayRun恢复全部此前本局原状态和决策，累计35牌；首张防御跨36门槛，新增凋萎1，末生存者前累计37。完整三牌模型旧为36持牌伤/损4/敌250；单独生存者入口也为36/损4。空战斗记忆的第一版诊断恰报24/损15，但同时漏算新增凋萎，这是错误抵消，不能当已正确。两版诊断和初次无可打牌却要求solver输入的失败均保留。

本次只在已观察silent A10普通生存者、单次手动、余像1、无未知抽牌、已知2或3张全为12伤WITHER/Status、无HP流失/虚无、新生成凋萎数值也是12、且未走绷带分支时计算一个数值代表的弃牌。仍保存真实选择边界和“弃牌选择未确定”，不登记已选实体，不让后继动作跨边界。角色/进阶/升级/其他抽弃牌、混合牌、不同伤害、未知抽牌和自动重放保留旧分支。修后完整线仍损15、余HP−12、死亡，并正确计算毒6；无固定攻击/喝药/SL优先级改动。

测试使用五份原始固定帧、冻结历史计数、固定知识字典和空monster fixture；无网络/LLM/刷新的知识JSON。9项新测试+5项旧单弃回归，覆盖两入口的独立现场数字及限制，非只镜像实现。未来整场模型、同抽序替线、自然下一局读回与胜率没有验收，本批不能关闭父要求的学习/收益范围。

## V6与Jev原证据覆盖

十局均由runs原始行显式run_id核定为SILENT且ended非空，A6/A7/A10分开保存；原结局和统计不改写。evidence-summary.json只作初始事实入口；已实际读取两个manifest，按原offset/bytes/SHA读回五道关键Jev原请求及其精确decision_id关联决策。题面、原答、chosen、result、SL后处理与后续状态分账；65个选定原状态行按SHA核回，仅模型阅读所需字段和有界窗口，未把整份states或全局状态注入上下文。

| 局号 | 提取Jev题 | 完整审阅 | 未完整审阅 |
|---|---:|---:|---:|
| GXNKW8X1XYJP | 158 | 1 | 157 |
| PD9AYQVMLQW6 | 182 | 1 | 181 |
| L2TSFU62Z57Z | 102 | 3 | 99 |
| 2L1BNN9ZJEFU | 240 | 0 | 240 |
| 2PVLGRBGUX9S | 255 | 0 | 255 |
| 2SU6XN2AEJRD | 208 | 0 | 208 |
| 5X2GHKJ89PN1 | 332 | 0 | 332 |
| 61E2QS63Y9WU | 70 | 0 | 70 |
| 9TG1RP5LFAAK | 286 | 0 | 286 |
| DPYF2BAA3DKT | 209 | 0 | 209 |

合计2042题，完整审阅5题，2037题未完整审阅。完整逐题未读清单与原因在question-coverage.json；均只机械建立精确身份索引，不计科学验收。额外question-283641.json、question-285130.json未读完整题面，只作对应局面定位，不计完整覆盖。不是把摘要最后五条当全覆盖。

| 局号 | 层/回合/尝试 | Jev原行 | decision原行 | Jev offset / bytes |
|---|---|---:|---:|---|
| GXNKW8X1XYJP | F45/T2/试4 | 30573 | 283680 | 439358430 / 28086 |
| PD9AYQVMLQW6 | F49/T10/试6 | 30763 | 284710 | 442084769 / 7314 |
| L2TSFU62Z57Z | F17/T2/试2 | 30795 | 284918 | 442602690 / 15963 |
| L2TSFU62Z57Z | F17/T2/试3 | 30809 | 284967 | 442865491 / 17213 |
| L2TSFU62Z57Z | F17/T6/试6 | 30864 | 285148 | 443916881 / 18640 |

每条完整SHA、source_size、identity字段及精确关联位于coverage.json。Jev五题都有显式run_id、匹配decision_id、request_id在决策原行request_ids中；284918/284967的questions逐字段相同，分别完整读取不同的state和答案/决策。其余局只完成身份、流提取和机械索引，不能冒充机制/所有提案消费者已经逐局验证。

V6构筑流在64707059字节冻结切点十局均no_match，输出空文件SHA为空字节SHA；没有读取别局构筑流来补证。entries/jev_answer/fallback/unknown均未知/无本批匹配，不能解释成采用0或收益0。十份历史run-config没有V6显式字段，因此无法由本批核实off/on；保留“历史无字段/构筑流无匹配”，不冒称已见V6 off。Jev独立request/answers有2042条，完整审阅五题中没有error字段；不能推断完整调用从无错误或将其answers充当v6-build.jev_answer。

本批8464条已归属decisions都没有gate_reject/selection_dispatch/selection_audit/hp_guard字段；这是历史字段缺失，非零拒绝次数/成功执行全线。现行源码已有候选快照和single_action_receipt，明确state_effect_verified=false/whole_plan_executed=null，不能将该子接口当全链实现。全部decisions流还有1934 unknown_identity和1497 unmatched_decision_id条，全states还有3434 unknown_identity条，保持未归属，不用正文提及/时间邻近/question_id相似补身份。坏行见下表及各manifest；不把后期坏行随意归本批，也不补成零。冻结处均无半行，但模型输出曾截断的大段已用有界字段读回补齐相关五题，不将未读内容冒充审阅。

| 原流 | 冻结字节切点 | 冻结prefix SHA256 | 坏行 / 半行 |
|---|---:|---|---:|
| v6-build | 64707059 | `0de31475dae0df2947df0acb99209d437b296e1dc7d8700ab5700add9a552cca` | 0 / 0 |
| jev-prompts | 2425968029 | `d777e79446087e35886c683892170c541415dd73647d9168c06c4935d7563aed` | 1 / 0 |
| decisions | 3382869784 | `f75b94b269a539e715ac934746597c6f3cbf15c49d58d779212c3c0db855727c` | 2 / 0 |
| run-config | 2445561 | `f780c571f5687625168e34835475fe8a72e5c90a682e10d4b3d0f152444959ef` | 0 / 0 |
| states | 15304351723 | `ce8206352606be7500d438ddb610ac444a2420826dbb55ecb82d6a8ca16bda0b` | 2 / 0 |
| sl-attempts | 52880223 | `834b0c00d244a1081d1a6afaa953b2407dfd459bb48c9ed89bb825e14655ef1a` | 0 / 0 |
| run-plans | 10408121 | `0f696aaf1f5a0423e1657fff7aac2e5f7e6144870118cc5dbc02543b2bb562ab` | 0 / 0 |
| runs | 406615 | `7a35a50ad47f89e0581cae274bb7328d58173bbc94006f2d2ac63ac38e270b40` | 0 / 0 |
| fight-plans | 2233957 | `4dc030fa7152e844b5dd3bae7a3fd414dafcc604ad5eb97747f4698e4b75de97` | 0 / 0 |

fight-plans亦十局no_match；run-plans已按run身份读取，不把0行当原日志不存在。原始大流持续追加不影响上述切点；提取文件全部保留逐行来源。提取器对象存储回执pending_host_seal=true/deferred_errno=18，保留待宿主原流程封存，不称本沙箱已完成硬链接封存。audit.py本批复核五题/65状态/十个结局原字节，通过。

## 关键反例与未关闭范围

L2 F17第2试T2：Jev plan3/0.27，支配撤药后HP护栏选择plan2；states291553—291558实65→60、249→219，省血线执行。第3试T2：Jev plan3/0.33，护栏仍提出plan2，随后SL改回含血清线；states291602—291606实65→50、249→205、药槽消耗。二者都后续失败，不能把护栏文字累计成全局实省10。其余七条护栏只机械列索引，不称完整题面与整轮消费全部验收。

L2末T6：Jev plan3/0.94结束、chosen=end_turn/completed；plan1打击/侧步7伤但有未建模侧步，五轮14/24死亡而结束11/24死亡，三条整场各1200样本均0胜并列。states291780—291792显示168→159跨阈值清力量，再到145；末T8昏眩1打精密瞄准后四牌blocked_by_hook，17HP/0挡受17实死、敌113。缺完整替线，不据即时7伤改排序；同局SL不是独立局数。

GXN F45第4试T2原题plan4/0.99与journal原线，不等于最终选择；原决策sl_explore已换成翻滚线。原状态290201—290214证实执行翻滚，T3为13HP/7带挡/敌总226；第二试290160—290165双毒后T3为3HP/0带挡/敌总218。局部多保10血少扣8，均失败；精灵消耗和HP=0过渡帧不能代逐击复活过程，前三试predicted_death不补成实际离场。题面夹带的历史药水统计/其他来源仅记为当时输入，不用于本角色验证。

PD9 F48胜后原状态291019/291020为10HP/空药，F49 291021/291022仍同10HP/空药，没有跨幕回复；当前续战源码存在不代替路线、休息、奖励与自然消费者联合校准。十五机制提案原18来源与本批交集实际10，不是旧摘要7，另8局不在派发范围；此处明确保留原历史说法并纠正本批分母，不读取那8局。另三个ZTRGYYMLR8SC提案原局不在本批，均保留waiting，不借本批其他局关闭。

## 验证结果及未发布原因

1. targeted-after.log保留首次默认Vite loader的EROFS，因共享node_modules/.vite-temp不可写。只改调用增加--configLoader runner，原测试配置/脚本不改；定向14项通过。
2. targeted-source-removed.log：撤掉两个生产源码补丁，3失败/11通过，两个核心失败均为持牌伤36对24；targeted-source-restored.log：恢复同字节补丁后14/14通过。它不是完整套件绿。
3. nice -n 19 bash tools/test-sandbox.sh --configLoader runner：tsc阶段0，Vitest 594文件/5256项，590文件/5250项通过、4文件/6项失败，退出1；脚本set-e因而未到末尾paths单fork步骤。
4. brain-card-distill与brain-decision-dataset的Python execFileSync出现EPERM；temp-lifecycle三项为node子进程EPERM/预期路径与stderr不一致；content-store的宿主模拟封存得到retained而非sealed。撤补丁后四文件仍相同6失败/4通过；换单fork也相同。保留三个原日志；没有为凑0排除文件或修改测试工具，没有把受限环境报成策略回归。
5. gitleaks git --staged --redact：0，扫描562043字节、无泄漏；git diff --check通过。未npm install、未推送、未运行play、未停对局、未改prompt/权限/账号/key。

提交前沙箱入口不满足0，所以没有git commit，Co-Authored-By尚无实际提交可写；未进入live发布锁/刷新提交/合并/回退/版本分配。读取时live HEAD=0a9dc70e3ef096e7d0d6eb1524cd20e2cbe906c6，仅作当前上下文，不能当本批合入提交。ops须先沿原宿主检查流程验证本补丁及失败限制，再按原提交、锁内合入live/合后检查、版本核号和双通知流程处理。没有请求新权限或把等待时间当批准。

## 十个派发ID的最终处置

- **silent-proposal-b13fda1dfeb37927 — waiting**；账本 silent-0019, silent-0020, silent-0079, silent-0243。GXNKW8X1XYJP F45 T2第2/4试同入口，实际后续T3为3HP/0带挡/敌218，对13HP/7带挡/敌226；两线均败。已核局部10血/8敌血取舍，但缺复活逐击、前三试真实离场与替路线/提前用药整场后继；不改权重。
- **silent-proposal-d7b8d36cf3d0303d — waiting**；账本 silent-0268。已准备同值凋萎窄修复，固定14项/撤源码反证通过；提交前原沙箱入口4个既有文件6项受限失败，撤补丁后同样失败，未满足退出0条件，故无提交/live祖先，保留waiting交ops补跑与兜底。
- **silent-proposal-c873d6543c414f92 — waiting**；账本 silent-0125, silent-0005, silent-0044, silent-0253。L2TSFU62Z57Z F17第2/3试T2完整题面与状态核明护栏实际执行/被SL撤回。现有源码有候选快照和单动作回执，仍缺跨重问父子、整轮实际资源归属的联合消费验收；不把单动作completed当整线执行。
- **silent-proposal-dfbf51502f30c9b1 — waiting**；账本 silent-0021, silent-0133, silent-0222, silent-0049, silent-0020。L2TSFU62Z57Z F17末试T6完整原题：7伤打击/侧步含未建模侧步，五轮14/24死而结束11/24死，整场各1200样本均0胜并列。末T8昏眩限一牌、17HP对17攻击实死；缺同抽序完整替线/侧步兑现，不增加固定攻击优先级。
- **silent-proposal-c2888032d1337388 — waiting**；账本 silent-0005, silent-0006, silent-0011, silent-0016, silent-0023, silent-0024, silent-0027, silent-0049, silent-0083, silent-0094, silent-0133, silent-0222, silent-0253, silent-0276, silent-0282。原提案18个来源局与本批实际交集为10局（不是旧waiting摘要所称7局）；另8局不在派发范围。15个机制未完成全部入口、组合和当前消费者联合校准，本次只能支持0268窄修复，不能整项implemented或duplicate。
- **silent-proposal-042ee2299084b528 — waiting**；账本 silent-0019, silent-0020, silent-0021, silent-0090, silent-0228, silent-0239, silent-0243。PD9AYQVMLQW6 F48胜后REWARD/MAP保留10HP/空药槽，F49首帧同10HP/空药槽已原帧核实；同样本续战资源传递已有源码，但奖励、次战、路线和休息消费者尚缺全链校准及未选整场后继。
- **silent-proposal-8cd3db3bad5f34f1 — waiting**；账本 silent-0021, silent-0133, silent-0222, silent-0228, silent-0239。L2TSFU62Z57Z F17T2护栏与SL顺序及末T6全败并列已核；原线/替线缺同入口、同预算、同抽序完整整战后继，跨重问追踪消费者未联合验收，局部省血不支持改SL边界。
- **silent-proposal-43fe170707574455 — waiting**；账本 silent-0021, silent-0012, silent-0046。原证据局ZTRGYYMLR8SC不在本批十局，未读取该局原日志。敌实例稳定身份、精确退场和计划兑现全链未在本批核验，保留等待对应证据派发。
- **silent-proposal-3f5a665dca133a8c — waiting**；账本 silent-0125。原证据局ZTRGYYMLR8SC不在本批十局，未读取该局原日志。其重问归属、原答/护栏/SL与整轮结果尚未核验，不能借L2/GXN不同局关闭。
- **silent-proposal-0b8ef30de463f317 — waiting**；账本 silent-0013, silent-0277。原证据局ZTRGYYMLR8SC不在本批十局；原药水表加载异常快照、药槽来源与饮药时点对照未提供本批验证。历史提示the potion table did not load不等于测得持有价0。

逐项机器回执见result.json；code_proposals沿十个既有CLI ID，无新重复ID，implementation_domains仅combat。父要求未关闭，现有经验/原提案/失败历史均保留。

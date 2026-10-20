# 静默猎手策略提案核验报告

记录时间：2026-10-21T06:48:34+08:00。task=strategy-proposal；character=silent；batch=20261021-063443-strategy-proposal。

本批10项全部waiting，无新源码、规则或正式知识变动，fixes=[]、merged=null。没有提交、发布号、shipped、撤源码负控或tsc/vitest成功回执。逐项提案、局号/层/回合、原账本、反例、预期行为及验证见proposal.md；完整结构回报见result.json。

## 身份与基线

开工git status干净，完整HEAD/base=984232f21e7ab608a488142c88a9982028d808ef。已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环和证据保留规则。根learn.json本批task/character/worktree/runs及10个proposal_ids精确匹配，reason=proposal，没有proposal_repair/research_request/implementation_request，故按普通消费队列执行git merge --no-edit main，返回Already up to date。普通专题根请求属于另一旧batch，未借此承接专题或读取其他专题正文。派发快照见dispatch-identity.json。

全程独立、未派下级agent，未改账号、模型、配置或强度；未取得本线程原生turn_context/请求回执，因此不自报模型/档位已核生效。没有运行play、调用在线模型或访问网络。

10份原Markdown均保存原字节并与专用队列add行SHA一致。原路径缺失的7份从同角色历史批20261019-224304已保留原文副本取得，再逐份SHA核对；不把旧摘要当原文，不恢复或修改其他工作树。旧队列只保存本批10项的初始行与最新处置，不领取其余条目。26个既有账本的claim/status/证据范围见ledger-scope.json；不把旧claim当本批重新验证全历史。

## 原始提证、冻结切点和身份

先运行指定根evidence_summary.py，摘要SHA=5a4826a082704f08d7b3db0982776929aebaea869a5a3c5e2063b5b4e11e0940。它仅用于定位。六局runs.jsonl原行逐行核SILENT/A10、ended非空；结束于2026-10-07，均败，终层依派发顺序45/33/13/39/28/30，独立局数6，SL不扩分母。runs原行offset/bytes/SHA见evidence/runs.evidence.jsonl。

按指定nice19共用入口完成v6-build/jev-prompts/decisions/run-config，另以同入口提states/runs/run-plans/brain/sl-attempts。逐行按原offset读回、核bytes/SHA/JSON/身份，合计7574条。清单保留每流source_size/source_sha256、无效行、截断、身份缺口及逐局计数。运行脚本audit-evidence.py和fixed-evidence-checks.json保存21项固定事实核验；退出0只表示数据核验，不是策略自测或收益。

| 流 | source_size字节 | 本批所属行 | 全源无效行/未完行 |
|---|---:|---:|---:|
| states | 14991126040 | 3432 | 2/0 |
| runs | 397425 | 6 | 0/0 |
| run-plans | 10259580 | 33 | 0/0 |
| brain | 1165425799 | 183 | 2/0 |
| sl-attempts | 51222048 | 29 | 0/0 |
| v6-build | 64678849 | 0 | 0/0 |
| jev-prompts | 2300022098 | 579 | 1/0 |
| decisions | 3157332385 | 3306 | 2/0 |
| run-config | 2337031 | 6 | 0/0 |

摘要与正式提取各自冻结，因在线日志追加，decisions/jev的切点不同，两个原清单均保留，不混成同一次冻结。各本批原行SHA读回一致。全源无效行不冒认为本批坏行；最后五条gap refs只是有限索引。decisions全源unknown_identity/unmatched_decision_id保留，不按题面字符串或时间邻近接入本批；本批Jev均有明确run_id并由精确decision_id关联原decision_ref，未用question_id相似文本认局。run-plans的run字段按共用身份逻辑读取。

V6-build全源存在且扫描完成，本六局均no_match；不是流缺失，也不能据此认作六局V6开关明确off。六份历史run-config均没有v6字段，相关状态为历史未登记/unknown，不能用后来配置倒填。对应entries/jev_answer/fallback/unknown均是无匹配/不可评估，不写为“0次失败/0条未知”；历史Jev request/answers/error独立解释。

## 逐题阅读范围与后果

579条Jev均作机械提取、身份与原字节读回；8道问题完整阅读原request.state、questions全部选项及原answers：

| 局/位置 | decision物理行 | Jev物理行 | 原答与实际限制 |
|---|---:|---:|---|
| CA5 F13 T4 | 267377 | 26719 | plan3；首步完成，后续本轮HP2不变，敌36→22；到T5仍死亡，不能把8伤预测当整战收益 |
| 61E F17 T6 | 267612 | 26756 | plan4；双防御/尖啸，端点56→48、敌67→34；负敏捷防御各3与实际毒端点分列 |
| DUZU F30 T5 首试 | 268984 | 26948 | plan1；端点玩家3不变、丝虫退场、甲虫74→62；模型11与实际净扣非自动同义 |
| VLZ F43 T1 神化前 | 269706 | 27083 | plan1含神化，题面标未建模；chosen仅首步，实际升级后另题重规划 |
| VLZ F43 T1 神化后 | 269707 | 27084 | plan1；43伤/14损更新为51伤/13损，后继90→77、敌254→203；不推出整战必胜 |
| VLZ F45 T1 | 269748 | 27093 | plan4不含神化；MC1/12占707ms，题面明确fallback非死亡预测；后续另题喝药抽牌，不能认证原候选全执行 |
| 8JRE F33 T2 第三试 | 270282 | 27194 | 原答plan1；SL替换plan2，0/24与5/24分开；实端点47→32、敌326→309 |
| 5PM F39 T2 第二试 | 268455 | 26880 | plan7首步无毒冒泡；能量5→4、目标35血与0毒不变，整轮端点另核 |

完整原request和引用保存在request-<decision物理行>.json。一次输出269706选项处发生展示截断，已单独完整补读plan7/plan8；原始文件从未截断。

其余571条未逐题完整阅读：其中额外保留6个相关请求（269598、267696、269754、269770、270216、270264），仅核原决策、答案/理由及必要状态；其余565条超出本批所选问题范围，仅做机械身份和字节核验。每条run/decision_id/题目key/offset/bytes/SHA/未读原因都列jev-question-coverage.json。不存在“最后五条=全覆盖”的口径；也不把机械扫描说成模型阅读全文。特别是61E F23 T4原请求未完整阅读，不能凭保存原题认证另一目标方案。

8个完整问题均有answers，无error字段；此为字段观察，不是采用/执行/收益成功。579行机械检查也未见error非空，但未逐题审阅其余571行，不能给整批Jev质量或自然收益结论。CA5 T5与DUZU T6是代码线，无该动作自己的Jev问答；不拿T4/T5的问题冒称T5/T6已被Jev选择。

29个相关decisions的chosen/result/gate_reject/selection_dispatch逐项读回。所选历史行后两个结构字段均缺失，记“字段缺失”，不是gate通过或完整执行。8JRE270264在rationale明确HP guard，结构hp_guard缺失不代表未护栏；270282原答与SL替换有真实区别。DUZU268989/269017/269045虽有chosen，但result明确not dispatched，下一观测恢复到新T1；不得算作实打或治疗。末次269073—269078才有动作及终页。

模型只阅读60个必要状态窗口的结构字段及关键牌面，没有灌入整份states。完整原行保留selected-states.evidence.jsonl，字段投影见selected-state-projection.json；每个窗口有原offset/bytes/SHA和身份。decision-state-links.json按observed_ts+fingerprint唯一原观测关联；相邻帧只是端点，不证明整个候选或单动作因果。turn-endpoints.json另外保留相邻轮端点。

## 本角色结论和反证

神化：F35能量7→5，防御5→8、打击7→10、匕首雨5→7、必备工具1→0；F43勒紧4→6、尖啸6→8，后抽毒雾已升级。F43同后续牌序与实际51伤/13损支持窄状态变换；不是持有即施放，也不是不同敌人/资源下胜负的因果证据。

预算/药水：F45最初题面已说明无rollout、上限67不区分死亡；原决策MC1/12、707ms、horizon1/samples1/best=null。后来269754才喝痊愈药水，原状态275728→275729为HP67不变、能量1→2、实际抽必备工具/生存者；不按中文名记回血或样本中位牌为真实抽牌。未取得同模型、同随机池、同总预算对照，不拟合新常量。

SL与护栏：8JRE首/三试T2原fingerprint逐字相同，实端点分别损3/15、扣10/17，支持多12血仅多7本轮净扣；没有另一完整胜线，且不是0/24与5/24完全相同。T5护栏实际端点25→21、敌249→224；不把候选差额自动当整场保血收益。

属性/成长：CA5蚌0/4/8力、同招11/15/19、弱后11/14，末2血10挡对14，证明该窗口虚弱未取消成长；不能补该局未取得的步法。61E负2敏捷双防御各3，毒端点17→15并扣33，分源保留。61E F23原决策选本体、观测本体76→41/幻象14→2，下一轮仍有幻象；未执行另一目标，不能定强制首杀。DUZU临时减力2→−4→4及20→14→22，和SL恢复分列，不据四次相关失败改血价。

启动：5PM无毒冒泡相邻帧消耗1能、目标HP/毒不变；整轮两敌35/72→24/68、玩家29→8，存在其他牌和被动，不能把净扣15全归冒泡，也不能从该端点认定原题6伤的单机制根因。缺同资源/完整抽序/不同启动的受控整战对照，不写统一权重。

这些均为本角色冻结六局的有限复核；原题自带的历史经验/大脑建议只是当时输入，不作为本批游戏真理或本批样本。原题保留了2026-09-29历史药水统计引用，未沿其读取其他角色知识，也未把该统计计入静默验证。

## 当前源码与live

实际只读live快照=150890f8bac0253f4e9216af3259784705c7550e。9条关键源码路径与本基线逐blob相同，见source-verification.json。

turn-solver已有神化手牌/held/locked/已知后抽的窄升级，未验证重放、weak/frail等交互继续unknown；silent-apotheosis-reference的actual_cast_this_fight仍null。silent-selection-audit分候选，silent-selection-dispatch仅single_action_receipt，whole_plan_executed仍null。现有离线selection-execution消费者也没有认证整候选；本批只核源码，未重跑其离线消费者，不冒称生产消费者新通过。

9条路径最近base来源中7条为实际live祖先，card-model与hand/loop最近来源不是live祖先但blob相同；逐一保留，不用相同源码叶子伪造祖先提交或implemented。原待办可以有已完成子项；没有核实完整提案的实际live祖先实现，故全部waiting，不登记duplicate或implemented，不拿经验发布/历史测试关闭整项。

## 逐项处置

| id | 状态 | 具体原因 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | 神化已有窄升级传播及参考字段；实际施放持续身份仍为unknown，未覆盖属性/升级交互与消费者联合校准不足，不能关闭整项。 |
| silent-proposal-f2bfceddb1898dca | waiting | 缺模型覆盖一致条件下同起点、同随机池、同总预算的MC配对和成熟度曲线；707毫秒、1/12样本不足以设预算、药价或集火规则。 |
| silent-proposal-283a164780d11e69 | waiting | 与89354805同源的经验补链原文SHA已核；实际施放追踪、未知升级交互及完整消费者验收仍缺，题意重复不等于源码duplicate。 |
| silent-proposal-ebbfe3b97548756d | waiting | 十五子项中仅核了本批有限窗口；逐源属性/升级/期限与战斗、路线、休息消费者联合校准未完成，局部源码不证明整项实现。 |
| silent-proposal-e5b87be50f28f311 | waiting | 原答、SL替换、首次动作和观测端点可分列；跨抽牌、选择、药水、重规划、SL的整候选持续执行归属仍未验证，不据单局改阈值。 |
| silent-proposal-49632bc4878fb597 | waiting | CA5本局没有正敏捷实测；本批其他静默局的敏捷不能补成该局同条件对照，力量/敏捷/虚弱/独立成长的联合生产校准仍不足。 |
| silent-proposal-66532328a585941f | waiting | 无毒冒泡消耗1能且相邻帧无施毒已核；缺同HP、牌组、药水和完整抽序的启动顺序整战配对及收益函数，不拟合统一启动权重。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 负敏捷牌面与17+16毒端点已核；缺同起始HP、构筑、完整抽序的另一完整SL线路与配对校准，首试获胜不足以改范围或阈值。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 本体线的实际净扣与幻象残血已核，但完整原Jev请求未逐字复核；另缺A10召唤代际、航行、复现、退场全链校准及另一目标后继。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 临时减力恢复与成长已核，前三次T6明确未派发；缺睡眠、失血唤醒、眩晕接续与成长的全链校准、同抽换序后继，不从四次相关失败拟合规则。 |

没有“必须先找到赢线才修纯bug”的新门槛。已观察的窄修复已有实现或明确unknown边界；本次未从所核原帧得到可直接新增、且边界充分的新窄源码缺陷。取舍类规则仍缺受控/后置验证。waiting保留原任务和反证，不关闭父要求，不把增加完局总数视为这些六个历史锚点出现新事实。

## 台账、检查和交付

只经根learner/ledger.py update向26个既有本角色账本追加本批proposal/report链接及waiting说明，by=learner:strategy-proposal；不直接编辑账本，不新增重复代码提案id。更新不携带status/claim/evidence/version/effect，既有shipped不降级，既有proposed不提升；没有新经验需新增status=proposed。CLI请求、回执及读回分别保存ledger-updates.jsonl、ledger-update.log、ledger-update-readback.json。proposal_results交原调度器消费；本批不自行改专用队列或标shipped。

没有生产代码或正式数据改动，tsc/vitest/cases固定null；撤源码失败/恢复通过不适用，未借用历史绿灯。不进入live锁、知识刷新/合入、eval版本、上线决定或规则双通知流程。gitleaks与最终干净检查见独立原件，扫描结果只按实际回执补记。

本批不证明正式知识发布、下一局消费、自然采用或收益；六局旧code均dirty，不能从旧Git提交恢复其全部运行知识与随机池。所有缺失、原始字段和失败/展示截断补读记录保留。

运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-063443/learner/runs/20261021-063448-3fa0f779-7c54-4944-9ee6-120c3110c792-strategy-proposal/proposal.md

报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-063443/learner/runs/20261021-063448-3fa0f779-7c54-4944-9ee6-120c3110c792-strategy-proposal/report.md

最终核验：gitleaks 8.30.1 对本批scratch执行dir --redact=100，退出0、报告[]，未发现secret；该扫描在最终追加扫描结论前完成。Git status为空、HEAD保持base；source-diff.patch为0字节。最终回报10/10 waiting、原CLI id集合一致，tests三个字段均null。新增记录仅为本批材料和根账本CLI追加；未提交、未推送。

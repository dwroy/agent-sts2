# 本批策略提案证据报告

生成时间：2026-10-21T04:29:03+08:00

结论：六局身份和终局已核，十份原提案Markdown全部按队列SHA核同；579条Jev与3306条decisions逐行回原日志核字节/SHA，14题完整题面/原答及后继动作/状态精读。十项均waiting，没有新增源码、正式知识、提交、live合入或版本。

## 身份、基线和边界

- 本批只领取learn.json的十个proposal_ids；reason=proposal（普通队列），不满足专题reason=ops/无proposal字段的绑定条件。research_request/implementation_request均不存在。普通专题入口绑定20261010旧批，未读取其work_spec替代本任务。
- 开始git status干净，初始HEAD为8dd8c40530197a8b34ff73a42cf633d4a495fdcd。按普通流程git merge --no-edit main，快进仅带decision-log两行记录。
- report.base/当前HEAD：572bf468bae3e248fbb6778e6b922f15baa5cc75。没有提交，再无main合入。十原项之外不领取队列，不读其他角色知识。
- 模型/档位未取得本次原生turn_context回执，不据任务文本声称实际档位生效；未改共用配置、账号或在途会话。
- logs只读；没有模型/API/网络调用、play、数据集/MC重跑、全量仓库副本或下级agent。提证工具按原入口以nice19运行；scratch内脚本是证据核验工具，不是生产源码。

| 局号 | A | 结束UTC | 终层 | Jev | decisions | states |
|---|---:|---|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 10 | 2026-10-07T07:38:37.200Z | 45 | 136 | 699 | 729 |
| 8JRE1C4H4Z2W | 10 | 2026-10-07T08:17:09.498Z | 33 | 139 | 659 | 676 |
| CA5KE8GFJ9X2 | 10 | 2026-10-07T05:17:57.587Z | 13 | 58 | 265 | 282 |
| 5PM6JAQG6FNQ | 10 | 2026-10-07T06:21:09.408Z | 39 | 92 | 638 | 660 |
| 61E2QS63Y9WU | 10 | 2026-10-07T05:43:43.383Z | 28 | 70 | 443 | 462 |
| DUZUBAJ3A8GP | 10 | 2026-10-07T06:57:27.794Z | 30 | 84 | 602 | 623 |

全部victory=false；SL尝试按局内窗口处理，不扩大六个独立来源局的分母。

## 冻结切点与原始流

evidence-summary.json仅索引。两份evidence-manifest.json均已实际读取；每条evidence行保存原source/source_size/line/offset/bytes/sha256/identity/row。源文件持续追加，因此摘要、V6提证和其余流提证分别冻结，不能用较晚文件长度改写旧切点。

| 流 | 冻结字节 | 冻结前缀SHA256 | 本批匹配数 | 全源坏JSON/截断 |
|---|---:|---|---:|---|
| v6-build | 64677581 | `49aa3d126db27a4a14889a3d81a0b1fafa79ec05813b595f14f24bb09b73bf71` | 0 | 0/0 |
| jev-prompts | 2265497666 | `4a7ae6029980b1b0695a3afdb53fbb7cc2ec70faf16b8291c3e9b45564744c36` | 579 | 1/0 |
| decisions | 3096839799 | `3588e3d7cb2208fdebafcb90dd7e75f5f7c8d77969d9694f9df75ba622cf2ff0` | 3306 | 2/0 |
| run-config | 2318944 | `1b971978903c24e08c72e20061c50c85469ae655d679eb44f0fc4bcd0e3df3e6` | 6 | 0/0 |
| states | 14907126713 | `1e8dbeef8bad8d2fb204653406a0f2d333276680fe3a2e31188e4ef457768fc5` | 3432 | 2/0 |
| sl-attempts | 50842522 | `67fa88e0cfbe530907611878a3e9c86225dd3c5047e177ed2d3e2f19f4b03571` | 29 | 0/0 |
| run-plans | 10223329 | `2e1973a2f925ec18c5fdbca6e3431dce3c742668ff0e863a088030223fe66e21` | 33 | 0/0 |
| brain | 1150040192 | `4c3fdd0e067dfa9c2564ff58c9a32c6edaa30a0f1b18263de0ca6d0d6a7a719b` | 183 | 2/0 |
| fight-plans | 2233957 | `4dc030fa7152e844b5dd3bae7a3fd414dafcc604ad5eb97747f4698e4b75de97` | 0 | 0/0 |
| runs | 395955 | `8faf1c51bab8e9da0ae4cb704719c35fcc7ea714fa3f98b61e2a76f5ab23f274` | 6 | 0/0 |

- V6-build六局均no_match；当前冻结流存在，但不是这六局的V6记录。entries/jev_answer/fallback/unknown在本批均未观察，不能填零或推已采用。六份历史run-config的v6字段都缺失，因此不能补报V6 off；本批无V6发布/下一局消费证据。
- Jev请求579条、answers非空579条、显式error非空0条，均只指匹配且有效的行。全源另有1坏JSON，无法给它补run身份或当成功；decisions另有2坏JSON、states另有2、brain另有2，均在各manifest保留原offset/SHA。
- 3306条decisions的fallback字段均false，但与V6 fallback、Jev error、预算降级不是同一语义。五条缺chosen的历史决策保留缺失；全部3306条都有result，均没有gate_reject/selection_dispatch字段。字段不存在不证明没有拒绝或整候选执行成功。
- 身份仅用显式run_id/state.run_id/fingerprint.run或精确decision_id联回原decisions。579条全部精确联回，且14道精读题的request.questions与decisions.questions完全一致。没有使用正文提及、question_id相似或时间邻近来定所属局。
- 其余全源unknown_identity/unmatched_decision_id及坏行保留于manifest；有限gap_refs仅最后五条定位入口，未当完整覆盖。fight-plans六局no_match；run-plans以run字段识别共33行，已保留切点，不据零匹配否定历史存在。
- 共用提证输出的content.pending_host_seal=true/deferred_errno=18表示宿主封存尚待完成；本轮逐原行SHA读回已完成，未冒称宿主封存通过。

## 精读覆盖与逐题执行链

question-inventory.json逐条列出全部579题：14题full_read=true，其余565题只有身份/字节/问题一致性机械核验，逐题写明未读原因（不在本轮原提案选定关键窗口），不计题面精读或收益验证。questions/*.txt保存原行JSON完整可读文本；selected-questions.json保留原row与精确决策出处。

question-state-chains.json把每题原答、chosen/result/gate_reject/selection_dispatch字段是否存在、同轮后续动作及起点/首动作后/轮末/后继状态分列；起点用observed_ts且fingerprint逐字同核，局内行序只用于核后果，不建立run身份。turn-start-windows.json是74个有界轮初状态投影，未把整份states交给模型。

| Jev原行 | 局/层/轮 | decisions原行 | 状态窗口原行 |
|---:|---|---:|---|
| 26719 | CA5KE8GFJ9X2 F13 T4 | 267377 | 273259, 273260, 273262, 273263 |
| 26756 | 61E2QS63Y9WU F17 T6 | 267612 | 273504, 273505, 273507, 273508 |
| 26771 | 61E2QS63Y9WU F23 T4 | 267696 | 273593, 273594, 273595, 273596 |
| 26880 | 5PM6JAQG6FNQ F39 T2 | 268455 | 274379, 274380, 274383, 274384 |
| 26948 | DUZUBAJ3A8GP F30 T5 | 268984 | 274929, 274930, 274933, 274934 |
| 27063 | VLZ6CCT8AQ0A F35 T1 | 269598 | 275564, 275565, 275571, 275572 |
| 27083 | VLZ6CCT8AQ0A F43 T1 | 269706 | 275679, 275680, 275686, 275687 |
| 27084 | VLZ6CCT8AQ0A F43 T1 | 269707 | 275680, 275681, 275686, 275687 |
| 27093 | VLZ6CCT8AQ0A F45 T1 | 269748 | 275722, 275723, 275732, 275733 |
| 27094 | VLZ6CCT8AQ0A F45 T1 | 269754 | 275728, 275729, 275732, 275733 |
| 27100 | VLZ6CCT8AQ0A F45 T4 | 269770 | 275745, 275746, 275747, 275748 |
| 27175 | 8JRE1C4H4Z2W F33 T2 | 270216 | 276208, 276209, 276211, 276212 |
| 27191 | 8JRE1C4H4Z2W F33 T5 | 270264 | 276256, 276257, 276258, 276259 |
| 27194 | 8JRE1C4H4Z2W F33 T2 | 270282 | 276274, 276275, 276277, 276278 |

逐问题结论与反例：

- VLZ F35 T1（J27063）：选plan11，首次实际施放神化，states275564→275565能量7→5，防御5→8、打击7→10、匕首雨每段5→7、工具1→0。随后代码重规划且打击目标#2→#1，原预测37与实打52不能全归升级；83/95→67/89还含上限变化。
- VLZ F43 T1（J27083/27084）：原神化线预测43伤/损14，施放后重问题面51/13；后继敌254→203、玩家90→77支持该即时差异。神化后的同线确实重新选择，持有、实际施放和模型覆盖不同。F43全战仍90→33，不能从局部修正推出低损胜局。
- VLZ F45 T1（J27093）：plan4原答不施放神化，首次勒紧并续打防御/毒药/防御/打击/触媒。首题明确707ms药水MC、1/12样本、没有可比较后续rollout；~67是封顶粗估，不是确定死亡。
- 同轮第二题（J27094）：原答p0后chosen=use_potion，states275728→275729能量1→2、HP67不变、实抽工具和生存者；12/12药水局部优于参考不表示整战获益。接下来代码打工具/生存者，没有执行中位示例步法/尖啸，神化未施放。
- VLZ F45 T4（J27100）：plan1实际猎杀者/尖啸，45→32、敌合205→181，兑现24伤/损13；另三条32伤/损31攻击线全未实打，8样本全败不证明那条会赢。F45 T5轮初32血、三敌24/80/77，攻击83，临时减力后59与20挡仍缺7血；未来毒不当已减员。
- 8JRE F33首/第三试T2（J27175/27194）：指纹完全相同，Jev都选尖啸线。首题实际8样本、原线1/8死亡，不能写成24样本；第三试原线0/24、替换线5/24，SL理由明确未试线推演更差但原线已知失败。实际首试损3/伤10、第三试损15/伤17，差12血换7伤；两者后续仍败，未证明一律保血或禁止探索。原提案所说第三次题面0/24与5/24仅适用第三次，不能套给首题。
- 8JRE第二试T5（J27191）：Jev选plan4，decisions理由记录HP护栏改plan6；后续实际尖啸/逃离，25→21、敌249→224。候选43伤/损16并未执行，不能记作实际加毒或实际省血反事实。
- CA F13 T4（J26719）：选plan3后先翻越/突然一拳，又有第二次Jev选择打击，轮末实际敌36→22，而第一候选仅预测8伤；这是后续重新规划，不是凭完整题面断定原候选完整执行。轮初T1/T3/T5喷水11/15/19、力量0/4/8；T5 2血不能泛化正敏捷路径或新输出权重。
- 5PM F39第二试T2（J26880）：选plan7，首次冒泡对无毒失落，states274379→274380能量5→4，双方HP/毒均未变；随后负敏双防御合6。T3剩8血，构筑计划中的毒雾未在该窗口建立。F33已有成长且获胜只作反例背景，不是同资源启动顺序对照。
- 61E F17 T6（J26756）：原答双防御/尖啸，实挡逐张3、合6，负敏−2；敌毒17→15、67→34，玩家56→48。T5→T6吸取后玩家力量2→0/敏0→−2、敌力0→2；该实盘不提供另一SL胜线。
- 61E F23 T4（J26771）：原答猎杀者打本体/杀灭，后继玩家25→10、本体76→41、幻象14→2且下一轮仍在，两者力量3→6。plan1的39伤零损没有执行，题面要求打本体不是固定先杀的因果证据。
- DU F30首试T5（J26948）：实际防御/毒药/尖啸/蜃景，T6甲虫力量恢复并成长至4、意图22，睡3/2/1至T4消失。原候选17挡/11伤与轮末22挡、甲虫74→62/丝虫退场不是相同口径；保留差异，不把旧模型当本批当前模型已校准，也未定位成现行纯bug。四试均败没有另一换序胜线。

资源背景：vlz-resource-chain.json保留20场首末状态和出处，含胜场；F35—37为83/95→67/89→56/89→33/89，F43为90/99→33/99，F45为67/104→0。F43后获药、F44休息至F45的原有资源复盘入口仍见SHA核同的预算原提案；本轮未重新精读每个火堆/每次得药题面，不能宣称新完成全局药水经济审计。SL恢复不算回血。

历史完整题面含旧跨角色药水统计与其他Silent局的知识摘录：它们仅按原日志保留，不据此借证、混分母或新增游戏结论。本轮结论只取本批六局自己的状态/动作。

## 逐项处置

| id | 证据锚点 | 账本 | 状态/具体缺口 |
|---|---|---|---|
| silent-proposal-89354805ee4d7e77 | VLZ6CCT8AQ0A F35 T1、F43 T1、F45 T1 | silent-0237, silent-0238 | waiting：同线及后抽升级已有局部实现，actual_cast_this_fight仍明确为null；缺持续实际施放身份、未覆盖升级交互与完整生产校准，不能关闭整项。 |
| silent-proposal-f2bfceddb1898dca | VLZ6CCT8AQ0A F45 T1/T4；F35/F43及20场资源链作背景 | silent-0106, silent-0019, silent-0201 | waiting：成熟度、药水样本与降级展示已有实现；缺同起点、同随机池、同总预算的MC先行/分阶段配对实验及成熟度曲线，不改预算常量或药水价值。 |
| silent-proposal-283a164780d11e69 | VLZ6CCT8AQ0A F35 T1、F43 T1、F45 T1 | silent-0237, silent-0238 | waiting：原文SHA证实是第一项的同源经验补链；缺完整施放追踪和消费者联合验收，局部实现不能将本项登记duplicate或implemented。 |
| silent-proposal-ebbfe3b97548756d | VLZ6CCT8AQ0A F43 T1—T5、F45 T1—T5；十五子项原文保留 | silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019 | waiting：十五子项中多项已有模型；本轮未完成各子项的来源属性、升级、期限及战斗/路线/休息消费者联合校准，不能由单个神化或步法实现关闭宽项。 |
| silent-proposal-e5b87be50f28f311 | 8JRE1C4H4Z2W F33 首/第三试T2、第二试T5 | silent-0079, silent-0021, silent-0125, silent-0018 | waiting：Jev原答、护栏、SL替换和首次派发已有窄审计；历史行缺selection_dispatch，现行字段也明确whole_plan_executed/actual_turn为null，缺跨重规划、药水、SL的完整执行归属验证。 |
| silent-proposal-49632bc4878fb597 | CA5KE8GFJ9X2 F13 T1—T5；完整Jev题T4 | silent-0005, silent-0231 | waiting：本局核实力量0→4→8及喷水11→15→19；没有本局正敏捷实测，缺力量/敏捷/虚弱/独立成长四路径的联合生产输入对照，不加统一权重。 |
| silent-proposal-66532328a585941f | 5PM6JAQG6FNQ F39 第二试T2；F33胜场仅状态背景 | silent-0021, silent-0009 | waiting：无毒冒泡耗1能且目标未变已核；缺同资源、同完整抽序下另一启动顺序的整战对照与可复现收益函数，不从持有组件拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | 61E2QS63Y9WU F17 T5—T7 | silent-0030, silent-0027 | waiting：吸取、负敏捷双防御各3与17+16毒结算已核；本局首试胜不提供另一完整SL线路，缺同HP/构筑/抽序的救活对照，不改SL范围或阈值。 |
| silent-proposal-5264153a4a4b0e5c | 61E2QS63Y9WU F23 T1—T5，完整Jev题T4 | silent-0039, silent-0209 | waiting：航行增力、当前本体攻击线及后继状态已核；另一目标线没有执行，缺A10召唤/成长/复活/退场全链的联合模型校准，不能推出固定先杀规则。 |
| silent-proposal-bddfa690a84e03d0 | DUZUBAJ3A8GP F30 四试T1—T6，完整Jev题首试T5 | silent-0128, silent-0079 | waiting：睡层、醒来、临时减力恢复及成长已核；缺同抽换序后继与睡眠/眩晕/成长全链校准。四试均败不是输出血价权重的拟合数据。 |

原提案的反例、既有实验限制、验证/回退要求全部保留在十份original.md中；proposal.md为本轮合并索引。没有重写历史复盘或修改原提案。第1/3项同源去重处理，但完整工作未结束，不能用duplicate冒关。

## 已有源码与验证边界

只读冻结实际live HEAD `a7d07949efb03278a62050ca39447941309b4b7e`。source-audit.json逐叶保存本树SHA、live字节相等、原分支最近提交与实际live祖先提交。十叶字节相同，若原分支提交不在live祖先上仍保留false，另列实际live源码commit，不借同像伪造祖先。

- 神化观察对/传播已有a46239a29c3109ff9f69224ad77128d9929d3e9a等窄实现；reference 30ec2425012eea75f41226b31d8180b1abb837bc明确actual_cast_this_fight=null。
- 模拟成熟度0fa15f5e06d60a6caa95b8f49675ee6222b4b276；候选比较66283dd9982bdd7f480da7a4d9bfefea0572a9ac；首次派发fdaf787a372880b0438e73bcac7e6d2168b038ed。它们只证明对应源码存在，不是十项完整验收或自然收益。
- 未改源码/正式知识。tsc/vitest/cases均null；撤源码失败/恢复通过不适用，未运行或借用旧测试结果。不为合法waiting编造失败用例/成功测试/新版本。铁甲及其他角色没有行为变化。
- 机械核验包括原文10/10 SHA、全部579原始Jev/3306 decisions原字节SHA、14题问题原文与决策一致、14条精确起点及后继状态链、十叶live字节/祖先核实。它们是证据完整性检查，不是策略效益测试。
- 执行初稿索引曾在历史缺decision_id的行触发KeyError，随后改用有字段行建立索引，完整重跑通过；原提证未被覆盖。两次只读命令启动遭bubblewrap临时缓存路径消失错误，原命令重试成功；不是代码/策略失败。

## 交付

proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-041301/learner/runs/20261021-041319-0ab2125a-42cb-4468-8b30-1ace3f50f1e6-strategy-proposal/proposal.md
report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-041301/learner/runs/20261021-041319-0ab2125a-42cb-4468-8b30-1ace3f50f1e6-strategy-proposal/report.md
本批账本只由根ledger.py CLI追加本轮报告/提案链接与具体waiting限制，不加重复support或改变原证据分母；已有shipped经验状态不回退，其余proposed保持。code_proposals沿用十原ID。调度器据proposal_results继续等待后续本角色新证据，不关闭学习父要求。
没有源码上线，所以不取live发布锁、不写decision-log/eval新版本、不发规则变更双通知，不登记implemented/shipped。宿主完整检查和封存如有后续应单列，不能本轮代报。

最终机械验收（2026-10-21T04:30:48+08:00）：根ledger.py CLI追加26条链接成功，逐ID回执核同；全账本544项、0问题。gitleaks以redact扫描本批153.49MB、退出0且无泄漏。最终HEAD与report.base同，git status --porcelain --untracked-files=all为空；tsc/vitest/撤源测试仍未运行，非成功测试。最终回执初次被误按JSON解析而失败，核实CLI实际为26个空格分隔ID后验收通过；未重复追加账本，保留此失败说明。

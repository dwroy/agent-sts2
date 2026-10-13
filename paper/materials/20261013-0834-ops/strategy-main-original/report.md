# 静默策略队列本批证据核查与处置

记录时间：2026-10-13T08:20:12+08:00。任务strategy-proposal；batch=20261013-080221-strategy-proposal；角色silent，六个来源局均A10。
工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-080221。基线：800bc5eba27cffe6643e79642c3d2698eec10f27。独立完成，未派下级agent。

本批身份为普通队列，reason=proposal；只处理派发的10个proposal_ids。没有research_request/implementation_request/proposal_repair。
根notes/strategy-research-silent.json的旧batch与本批不符，不接管专题或其父请求。初始工作树干净；按任务git merge --no-edit main返回Already up to date，HEAD未变。
先读README、最新顶层STATE-2026-10-12、decision-log末尾、learning-protocol和learning-code-proposals。未读其他角色知识，不补预训练机制。

结论：10项均waiting，未发现本批足以新增、校准并完整验证的策略源码改动。多项有限实现真实存在，宽提案的实际执行、原模型回放或受控收益验证尚未闭环。
这不是十项完全未实现；也不把原题已有诊断、已上线经验或限定子项当作整项implemented/duplicate。没有新的代码提案id、源码提交、合入、版本或shipped登记。

## 证据及原始身份

冻结六类原始日志6,989条，另保存runs.jsonl六条原局记录，共6,995条来源记录。
每条原始日志保存原文件、行号、字节偏移、长度与SHA；采集时逐字比较，收尾又逐范围回读核SHA。
evidence-manifest.json和各*.index.json给出完整位置，未改logs。原Markdown10份、原复盘六段与本批26个账本fold均保存。
只筛实际run_id/state.run_id/run字段，不将正文引用局号混作本局。

| 局号 | 决策 | 状态 | 大脑 | 计划 | SL记录 | 配置 |
|---|---:|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 699 | 729 | 46 | 8 | 2 | 1 |
| 8JRE1C4H4Z2W | 659 | 676 | 31 | 6 | 7 | 1 |
| CA5KE8GFJ9X2 | 265 | 282 | 11 | 2 | 0 | 1 |
| 5PM6JAQG6FNQ | 638 | 660 | 39 | 7 | 7 | 1 |
| 61E2QS63Y9WU | 443 | 462 | 27 | 4 | 7 | 1 |
| DUZUBAJ3A8GP | 602 | 623 | 29 | 6 | 6 | 1 |

SL记录包含其他战斗：不能用记录数代替重打次数。F33沙虫是5次predicted_death和1次died；F30甲虫3次predicted_death和1次died。
六局均运行于2026-10-07的历史dirty代码，经验版本为.17/.18/.19；本次冻结当前源码不等于复原原运行树、完整移动模型或随机种子。
run-config显示实际大脑为codex，旧deepseek_*统计字段不当作DeepSeek实际作答。未从启动默认或配置推定本学习会话的原生模型，未切换账号、模型设置或权限。

turn-facts.json是每轮最早观测帧，不自动等于开场回复/药水后可操作盘面：例如族母F17 T1先见58、随后60，失落F39先见27、随后29。
机制与实付差值均用指定原帧/相同fingerprint，不混用该最早帧的进场HP；SL恢复不计路线回血。

## 逐项结果

- silent-proposal-89354805ee4d7e77：waiting。账本silent-0237, silent-0238。VLZ6CCT8AQ0A F35 T1 states275564→275565；F43 T1→T2 states275679→275687、decisions269706→269707；F45 T1 decisions269748/269754/269755、states275722/275730/275732。 已覆盖A10限定升级传播与候选事实；本战实际施放字段仍为null，缺SL重置、抽牌/药水/选择中断后的施放追踪和完整执行消费者验证；原dirty运行树及抽序种子未冻结，不把局部覆盖当整项完成。
- silent-proposal-f2bfceddb1898dca：waiting。账本silent-0106, silent-0019, silent-0201。VLZ6CCT8AQ0A F43→F44→F45资源链；F45 T1 decisions269748/269754/269755、states275730；T4 decisions269770；T5 states275752及原终态。 原题已确认707ms药水MC、1/12样本和预算退化；缺同起点、同种子、同总预算的分阶段MC对照及重复稳定性曲线，且原运行知识/移动模型未冻结，不能由不同重问或一个耗时样本设预算常量、药水持有价格或杀序。
- silent-proposal-283a164780d11e69：waiting。账本silent-0237, silent-0238。VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1；同上述原始states/decisions。 与89354805ee4d7e77同一神化问题、另有experience来源链；有限升级子项已存在，但实际施放/中断追踪和消费者完整验证未闭环。没有完整live实现commit，不能仅凭语义重复或经验上线登记duplicate。
- silent-proposal-ebbfe3b97548756d：waiting。账本silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。VLZ6CCT8AQ0A F43 T1—T5、F45 T1—T5；F35—37胜场与F43→44→45血量/药水链。 这是一组15条机制与资源分账的宽提案；本批可核即时属性/毒/四段减力和资源观察，但缺逐条原运行移动模型、未执行能力/另一focus/回血与锻造的受控全链及完整消费者验证。已有机制和单个事实栏不能代替整组完成。
- silent-proposal-e5b87be50f28f311：waiting。账本silent-0079, silent-0021, silent-0125, silent-0018。8JRE1C4H4Z2W F33首/三试T2 decisions270216/270282及states276208→276212、276274→276278；第二试T5 decisions270264；末试T11 states276429/276433及终态。 原答→护栏→SL候选与单动作派发回执已有局部审计；actual_turn/whole_plan_executed/state_effect_verified仍未知，缺中断后逐步核实与持续能力建立时点的完整追踪消费者夹具；六试均无胜利对照，不改血价、护栏或SL阈值。
- silent-proposal-49632bc4878fb597：waiting。账本silent-0005, silent-0231。CA5KE8GFJ9X2 F13 T1/T3/T5 states273237/273252/273263及T5结束帧。 CA5KE8GFJ9X2只足够核敌力量0/4/8及弱后意图、末轮缺2血；本局没有实际取得计划步法，不能补正敏捷。缺正/负敏捷与每击弱修正、独立成长四路统一固定调用/原移动模型回放，不凭单个步法实现关闭复合项。
- silent-proposal-66532328a585941f：waiting。账本silent-0021, silent-0009。5PM6JAQG6FNQ F39末试T2 states274379→274380；F33已建立能力的胜场状态。 已证末试F39 T2向零毒失落空打冒泡花1能，但没有同起始资源/同抽序下另一完整启动或构筑线路的胜负/收益对照；实验体限定事实栏也不覆盖失落/遗忘，不能拟合启动阈值或称宽提案已实现。
- silent-proposal-43a76a31ba7bdcfa：waiting。账本silent-0030, silent-0027。61E2QS63Y9WU F17 T5→T6 states273502→273504；T6双防御states273504/273505/273506；T7 states273508；sl-attempts F17 won。 已冻结族母吸取与负敏捷、17+16毒分项事实；缺同起始血量、构筑、完整已知抽序下可救活的另一SL线路及原移动/效应模型快照。本局首试胜不证明应改变SL范围、阈值或换线偏好。
- silent-proposal-5264153a4a4b0e5c：waiting。账本silent-0039, silent-0209。61E2QS63Y9WU F23 T2/T3/T4/T5 states273583/273589/273593/273596。 已有 living summon 限定实现；本批A10两次航行成长与T4另一focus未实打，缺原召唤/航行移动模型、种子及另一目标序后续完整对照，不能把旧召唤提交当A10成长和目标排序收益的整项验证。
- silent-proposal-bddfa690a84e03d0：waiting。账本silent-0128, silent-0079。DUZUBAJ3A8GP F30末试T1—T6 states274991/274998/275003/275007/275013/275018及终态；四次sl-attempts。 已核睡3/2/1、醒来、力2/4、末轮22攻击且四试无胜；缺醒来/眩晕接续的原移动模型及同抽不同排序完整获胜或稳定收益线路。现有毒杀石虫后甲虫来袭下界是另一限定子项，不能关闭成长/换线宽项。

完整反例、旧/新行为、验证、独立样本与回退见同目录proposal.md。神化两个id语义重叠但完整实现仍缺，保留两条来源链，不新建重复id。
代码队列不由学习者手改waiting状态；最终proposal_results交调度器正常消费，保留待新局重派。

## 现有代码与消费者的实际边界

只读核查时live HEAD为4192688e8f9edc9eaa3c37a7928ec951216ccc6e。source-manifest.json冻结15个相关路径的base/live blob、源码SHA与live工作文件SHA；全部选定live工作文件和该提交相同。
其中8个base/live源码路径的SHA不同，完整差异存code-base-vs-live.patch；不据字节差异声称行为不同或整树等价，且这些都不是本批改动。
source-manifest.json的祖先核查只证明限定源码在实际live历史里，不证明所有宽提案已验收。原行为发布号不另分配。

已核明确边界：神化actual_cast_this_fight=null；护栏actual_outcome=null；selection_audit.actual_turn=null；single_action_receipt中state_effect_verified=false、whole_plan_executed/actual_turn=null。
这些字段正确保留未知，不能把预测、派发返回或候选差值登记为实际收益。实验体当前事实栏只在A10 F48门槛下出现，不把它当本批F39/F45完整消费者。
既有测试文件仅作源码范围核读，本批没有运行或借用历史测试结果、没有声称自然大脑采用或胜率提升。

## 核验、台账与未执行事项

verify_evidence.py执行成功，evidence-checks.json记录38项原始字节/证据算术核验，日志evidence-checks.log。
包含神化配对、F43实付51伤/13损、同指纹SL多12血/7伤、护栏候选省12血/少18伤、0/24与5/24不同、负敏捷双防御各3、17+16毒、零毒冒泡消耗、召唤退场与甲虫成长。
这些是研究核验，不计tsc/vitest/cases；没有源码变更，因此三项均null。未做源码撤除/恢复实验、未跑沙箱生产全套，也没有冒报红绿或通过。
没有提交，所以提交前gitleaks不适用；不造提交、Co-Authored-By、merge或eval版本。未运行play、联网、推送、安装依赖、读取key/.env/游戏二进制或改运维prompt。

仅经根learner/ledger.py update给26个既有silent账本补proposal.md/report.md及本批核查说明，不更改claim/status/version，不将已shipped经验降回proposed、不登记策略shipped。
ledger-updates.jsonl保存精确CLI输入，ledger-update.stdout.txt/stderr.txt与ledger-check.log保存实际结果；记录的追加是获准例外，工作树源码/知识/记录保持干净。
没有新机制发现或真实新实现请求，因此复用10个已领取code_proposals，不调用add产生重复id。量化/专题父要求保持原状态。

取证命令的几次路径猜测失败（不存在的队列或loop/audit文件）和临时摘要KeyError('questions')说明保存在diagnostics.md；均为研究命令错误，不记生产bug，随后按实际schema、rg定位完成。大文件从未整份输出。

交运维：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-080221/learner/runs/20261013-080246-strategy-proposal/proposal.md；最终机器回报/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-080221/learner/runs/20261013-080246-strategy-proposal/final.json。本批无实际合入，merged=null；不套用“待调用方合入”到没有待合代码的任务。

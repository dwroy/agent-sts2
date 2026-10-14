# 静默猎手策略提案批次报告

时间：2026-10-14 15:25:58 CST（写时间前已运行date，原输出保存report-date.txt）。

本批十个原提案均为waiting；没有新生产源码、知识或规则变更，没有新提交、live合入或行为版本。提交/上线/tsc/vitest/撤源码红绿均不适用，不能借已有测试记录冒报本批通过。提案交运维路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-151302/learner/runs/20261014-151326-strategy-proposal/proposal.md。

本批是普通队列，根learn.json确认task=strategy-proposal、character=silent、reason=proposal、工作树匹配、proposal_ids十项；不存在research_request、implementation_request或proposal_repair。普通牌组规模请求绑定另一个batch，不切换专题，不读取另一专题代替本批身份。启动时工作树干净、HEAD=928515aecf34a92baaf322f71b660cd217660f47；按任务合入main，仅快进记录24叶。实际分析基线/report.base=719b33c780cf3219c185f5524d86c211e6cb20b0。原身份快照、十原提案与账本链接已保存；没有领取其他队列。

## 原始证据与边界

六个runs.jsonl原行逐一核character=SILENT、ascension=10。旧索引只用来定位，实际从只读根logs重新读取完整连续范围，核SHA256、行数、每行run身份、状态角色和进阶；本次保存29份原字节快照，共6779行，再从run-plans原日志按真实run字段提取33行，共6812行。计划原件存在，不能用run_id误取零行宣称日志缺失。

| 局号 | 状态 | 决策 | 计划 | 有ID动作 | 候选片段 | 完整回合端点 |
|---|---:|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 729 | 699 | 8 | 699 | 99 | 10 |
| 8JRE1C4H4Z2W | 676 | 659 | 6 | 659 | 113 | 44 |
| CA5KE8GFJ9X2 | 282 | 265 | 2 | 264 | 41 | 0 |
| 5PM6JAQG6FNQ | 660 | 638 | 7 | 638 | 83 | 25 |
| 61E2QS63Y9WU | 462 | 443 | 4 | 442 | 63 | 14 |
| DUZUBAJ3A8GP | 623 | 602 | 6 | 599 | 77 | 28 |

原字节快照、source-index.jsonl、plan-index.jsonl、evidence-manifest.json完整留在本批scratch。17项关键事实核验通过，来源原行号/偏移/字节数/SHA及取值在verified-observations.json；verify-observations.py只调整旧核验器的输入入口，断言保持，原脚本原字节以original-observation-verifier.txt保存，指纹见verifier-provenance.json。这是实盘事实核验，不能称生产模型数值已完整校准。

本批现有离线消费者读回：原3306决策，5条map/route-change元数据缺decision_id，原件保留并在每处切断输入。VLZ、8JRE、5PM完整输入可接受；CA5、61E、DUZU完整输入按原消费者拒绝，再仅对有界连续片段读回。动作3301、候选片段476、观测区间3301中859有后端点、2442未知；完整回合121，413个回合分组未知。消费者没有认证任何完整候选收益。记录见consumer-summary.json、consumer.log/consumer.err，消费者运行退出0；三个full拒绝是已保存的数据边界，未修改生产源码或放宽消费者条件。不同回合、SL恢复、未选线、换目标与缺行不拼成因果。

8JRE F33首/三试T2同盘完整回合分别玩家47→44/32、敌326→316/309，替换多损12血、只多7本轮伤。二试T5完整端点玩家净−4、敌−25；末试T11整轮敌166→130净−36，结算前末段154→130净−24，不能混合两个范围。玩家实际5→0是零血截断，显示37攻击−22挡=15为参考，未截断实际入伤未知。两条T2线都没有完整获胜后继，不能拟合SL阈值；末次防御改线延至T11仍败，也不证明应一律撤防。

## 真实源码与已有局部实现

只读核live=4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac。18个有关源码叶的实际live字节均与所读HEAD blob相同；13叶与本批基线同字节，card-model/turn-solver/rollout/rollout-live/combat-plan五叶保留Roy/Dai注释文字差异，未同步或覆盖live。source-audit.json保存完整blob/SHA、当前修改源码祖先及九个相关局部提交的真实live祖先结果，九项均为true。

神化普通升级子实现772b839f8ada31664cb764ea9ad3bdb03da27f64、触媒传播f516592fff557ef02c8ece43433706358c3f7fe6、萎靡传播b2805be4ba44b7375c7908d873889372cc3cfe6c只覆盖各自已见条件。actual_cast_this_fight仍null；弱/脆弱/缩小/暗影等条件仍明示未验证。这些事实不足以登记两项宽神化提案duplicate。模拟范围45161a51c2c6b7e4a499b13cf749c4108193bbf5不等于同预算配对。离线片段/区间/整轮/终局审计e75438488df159b2e8e9d3458cf219b39aadd933、dc0e6080cb20c508d94c006648cc3edf0188d306、83512ddcd2c70fd9b983dc38524ff25c8970c1d3不认证整候选因果。

怪物与房间消费者源码只读核：怪物事实继续按当前进阶取值，房间MEASURED_ROOM_MIN_N=5；本批没有估算新代价或改门槛，没有加载其他角色知识，没有混用统计。THE_OBSCURA、睡甲虫与吸取的原帧观察不等于冻结生产全链模拟验收。

## 十项处置与后续验证

完整逐项提案、局号/层/回合、账本ID、反例、预期行为与验证/回退见proposal.md。每项理由均来自本角色实盘和实际源码边界，不将旧waiting文字单独充作证据。本批仍按一个来源局计每项证据；六局不变成各项六个独立样本，重打不扩大分母。

- silent-proposal-89354805ee4d7e77：waiting；缺跨抽牌、选牌、药水、SL和换战的实际施放持续身份，以及虚弱/脆弱/缩小/暗影等未覆盖组合的生产校准；不能把已支持牌表或无unknown标记视作整项完成。
- silent-proposal-f2bfceddb1898dca：waiting；缺同起点完整模型、同总预算和随机池的分配配对，缺候选稳定性及样本成熟度曲线；707ms单题不足以设新预算常数、留药价或集火顺序。
- silent-proposal-283a164780d11e69：waiting；共享第一项的持续施放身份及未覆盖升级交互缺口；第一项未完整实现，不能仅因题意重复将本项登记duplicate。
- silent-proposal-ebbfe3b97548756d：waiting；缺原十五条全部属性组合、升级联动、状态期限及战斗/路线/休息消费者的完整冻结联合校准；已有事实和源码子项不提供路线或留药反事实。
- silent-proposal-e5b87be50f28f311：waiting；113个候选片段均未认证完整收益；缺重规划后持续候选归属、未选原线完整后继及成长施放与长期结果的完整联系；回合端点不能代替候选因果结果。
- silent-proposal-49632bc4878fb597：waiting；缺逐击力量、正负敏捷、虚弱和独立成长四路径的完整固定生产调用对照；本局没有正敏捷，不用计划步法补事实。
- silent-proposal-66532328a585941f：waiting；缺同HP、构筑、药水与完整抽序下不同启动顺序的整场受控对照及可复现收益函数；不能拟合启动阈值或构筑固定权重。
- silent-proposal-43a76a31ba7bdcfa：waiting；缺当前A10冻结生产整战配对及同起始HP/构筑/完整抽序的另一完整SL线；本局首试胜利不能改变SL范围或阈值。
- silent-proposal-5264153a4a4b0e5c：waiting；缺本次A10召唤/航行/复现/退场完整生产调用校准及另一focus的完整实打后继；旧召唤子项不能证明新增成长或目标排序收益。
- silent-proposal-bddfa690a84e03d0：waiting；缺伤害唤醒、眩晕接续和当前进阶成长的完整生产校准，缺同抽换序的完整获胜后继；四次均败不能拟合血价或固定杀序。

后续应沿各原ID补固定生产调用与同盘完整后继，按run_id和时间划开发/验证；没有新数据时保留原行为。不另建重复代码ID，不把已存在的局部源码、模板、日志审计或原经验shipped状态当本批整项已实现。没有新增游戏结论、异议或反证需要重报；已有范围限制明确保留。

## 验证、记录与限制

生产代码、知识和任务模板零修改；固定原帧检查退出0、现有离线消费者读回退出0，二者不替代tsc/vitest或撤源码红绿。本次tests固定为tsc=null、vitest=null、cases=null，fixes=[]、merged=null、implementation_domains=[]。实际已有source提交只作局部证据，不填implemented_commit、不标shipped，不创建eval版本或上线双通知。

只经根learner/ledger.py update追加26个既有账本的by=learner:strategy-proposal、where.proposal和note链；不改claim/status/version/evidence/first_run/prior，尤其不覆盖历史shipped。专用代码队列和根请求不手写；十个原ID已存在，不重登记。CLI输入、实际输出与前后保留字段核验在本目录保存。CLI一次追加成功；首次校验器误取fold的原始by/note而断言失败，失败原件link-ledger.py、ledger-link.err完整保留。第二次初始账本快照与当前折叠值不等，核实为15:16:15并行postmortem追加了evidence，先于本批15:27:16链接行；该初稿和失败日志另存.initial.txt。最终按账本物理顺序核每条本批CLI行前后protected字段，26行全部不变，history/notes/链接逐项匹配，保留并行更新，未重复追加。

首次两个只读命令因bubblewrap准备时临时路径ENOENT未执行，原错误记为执行环境边界，后续同权限重读成功；不是源码/游戏失败，不申请扩权。进程命名空间只见sandbox/bash/python且无模型标志，当前平台未提供实际原生会话/请求核查接口；不能自行声称已核运行模型/推理档位。交宿主沿原线程和原回执核实；本批没有更改模型、权限或账号。

安全边界保持：临时材料只在指定scratch；日志只读；不读.env/key/游戏二进制、不联网、不启动play、不推送、不派下级agent、不改其他角色、运维prompt或根请求。本次没有需要提交的生产变更；工作树保持干净。gitleaks与收尾核验结果见final-verification.json及扫描日志；失败材料完整保留。

最终机器回报原件：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-151302/learner/runs/20261014-151326-strategy-proposal/result.json。

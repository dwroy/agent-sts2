# 静默策略提案回报：候选审计已提交，live既有冲突阻挡合入

批次20261011-002829-s2-strategy-proposal；角色silent；base `d331043c67c7bb9bebfb58a173e912f3416ce7e4`；源提交 `c769739b97389fdc978b6515b83a38e3cd900f67`。

本批十项原提案全部逐项读取并核SHA、角色、证据局及账本。完成一项可复查的审计子项：SL新换线、同轮避重与覆盖重放保存护栏后原线/替线的结构化候选预测，含当轮血价、伤害、格挡、力量增长、敌HP/挡/剩毒、抽牌及推演样本；明确候选不等于实际执行。只作用于静默A10决策日志，不进入题面、不改选择规则、游戏机制或权重。实现主项c0767768bf6a7ab1/silent-0079；详细证据、反例、范围、预期影响与回退见同目录proposal.md。

## 证据与限制

- YF0LXT1QSTGG F48二/三试T1：同指纹预测损0/10、伤54/36，五轮24/24死；原状态实损0/9、实扣45/38。两组数值分开，不把预测差10写成实际差10。
- 8JRE1C4H4Z2W F33首/三试T2：同指纹实损3/15、实扣10/17，候选死亡0/24与5/24不同，不能仅因后损都封顶就称死亡比例相同。
- XP2SL33HT0D9 F33首/二试T3：同指纹实损9/14、实扣24/27；首/六试T1实损2/10、实扣25/34，力量成长另计。
- 新局U1QYLX1AE1WX F33首试58HP入、T8以9HP实际清场；T1毒雾3/T3触媒1/T4步法3敏捷。它是独立双蟹胜战，但与旧XP资源/抽序不同，不是低损血SL策略受控验证。A5HKP18P4Q0T F8 T6再次观察同敌第二次非致死扣血后不补挡，消除了旧“缺该边界”的理由；上一批后续回合胆小源码仍未入live。

六锚点及UV/BHS/U1/A5共十局均核为SILENT/A10，只分析选定层和新增两局。冻结2076状态行、2033决策行，全部从根logs原字节按offset重读，核run/角色/长度/SHA；没有只引用旧报告充原始验证。new-run-encounters.json列新增两局22战斗层；17项原始证据断言通过。完整复核在raw-byte-manifest.json、evidence-verification.json、selected-mechanism-frames.json、turns.json。

本次没有受控同资源整战胜线，也没有新阈值拟合。六次SL仍算一个独立局；旧dirty/current版本不能用现树冒称复原。原答→护栏→SL→跨重规划实际执行、能力建立的全自动审计尚未完成，actual_turn_result固定null；不声称新字段已经被线上采用或提高胜率。

## 验证

- 撤回combat-plan.ts新增生产接线后，固定专项5项中1项集成断言失败、4项独立格式化测试通过；恢复后5/5通过。失败是缺candidate_comparison字段，不是导入失败。真实沙虫状态的SL重放/新换线与关闭记录相比，intent、rationale、slPoint和apply后承诺全等。
- 既定`bash tools/test-sandbox.sh`退出0，含tsc与沙箱固定套件。汇总：Test Files  265 passed (265)；Tests  2675 passed (2675)；Test Files  1 passed (1)；Tests  11 passed (11)。未更改固定排除名单；宿主完整套件和合后检查未执行，不冒报通过。
- gitleaks扫描四个待提交文件原字节副本，退出0、无泄漏；git diff --check通过。备份使用.txt，固定夹具不依赖刷新知识、不调LLM/网络。
- 首次专项失败是历史0死亡文字省略dead-within导致夹具解析不兼容；改从原sl.numbers读取后才做正式红绿。初始日志保留。扫描暂存副本一度沿用.ts后缀，已立即改名为.ts.txt，原字节保留；未把这些临时副本提交或用作生产源码。

## 合入与交接

在`ops/live-merge.lock`内确认live HEAD `56268f61928e0330d91293e585efab075839bb4a`已有19项未解决冲突。preflight退出3，发生在提交知识刷新和merge之前；没有改live、abort/reset、覆盖并行源码/知识或运行play。源提交尚非live祖先，`merged=null`，无eval版本、无shipped、无“已生效”双通知。上一胆小源13b2f0bea891f8fcfccc2ae1dcbafbec3fe61302亦非live祖先。

运维需先处理原live冲突，再沿锁内知识刷新/重叠检查/合入/合后测试流程接续本源。此提交只加日志、不改对局行为；实际上线后记真实上线记录，不制造游戏版本。回退仅撤本源提交并保留日志；当前生产尚无本字段可回退。

25个相关旧账本已仅经根ledger.py追加本proposal/report链接，status=proposed、by=learner:strategy-proposal；0211补本批独立A5证据，0079关联实现源。code_proposals复用十个真实CLI ID，没有新造或手改队列。未重写历史复盘/经验，源工作树最终提交后干净。

## 十项处置

所有项保留waiting；已有候选审计子项不代替实际live合入或整项完成。

| 原提案ID | 原因 |
|---|---|
| `silent-proposal-c20b5139dd0dff71` | 已重核首次火花3→6与技能污染，仍缺第二脉动、不同起始层及完整冻结移动输入/同资源技能取舍后继；不设禁技能规则。 |
| `silent-proposal-ae9e692d680e3819` | 原局返力和再次夺敏已核；新两局未遇该组，仍缺遗忘死亡返敏、多来源及临时属性混合返还的连续帧。 |
| `silent-proposal-246daedaa3021847` | UV及新增A5 F8 T6已支持同轮一次，旧缺第二次非致死扣血理由已消除；上一源13b2f0bea891f8fcfccc2ae1dcbafbec3fe61302未入live，仍缺同轮重新建盘消费状态和其他触发边界。 |
| `silent-proposal-52f1e1bd2e7db0ed` | 加压力0/0/4/4/8及覆甲9/9/8/7/6已核；仍缺原在线A10移动输入、无攻击无毒与其他伤害的隔离边界，不能穷尽减层条件。 |
| `silent-proposal-6dd8bbff876be528` | 同max23电击力2→4、攻17→19已核；新两局无电击，缺旧/新同类交替召唤的实体身份及成长计数隔离固定输入。 |
| `silent-proposal-578e415a259e6835` | 完成SL候选数值审计子项但未入live；仍缺原答/护栏/SL/最终执行与能力建立的全链机器账，以及同资源完整胜线。 |
| `silent-proposal-c0767768bf6a7ab1` | 已提交新换线/覆盖重放结构化候选审计但live既有冲突阻止合入；跨重规划实际执行归属仍待实现，缺同资源整战胜线以拟探索策略。 |
| `silent-proposal-a46bdb7fe711d79a` | 原相清毒、零毒触媒和23挡不倒补已核；候选剩毒字段不等于完整阶段审计，仍缺持有/建立/阶段切换到执行的联合验证和同抽序启动对照。 |
| `silent-proposal-1044224808015e5c` | 旧双蟹成对血价已核；新增U1 F33以58→9首试胜，但构筑/抽序不同。缺同资源完整替线及成长后移对照，不启用低损血优先规则；候选审计尚未入live。 |
| `silent-proposal-7cbc6005db712ba9` | 原14初挡、临时减力恢复、朝向/弱分步及毒已核；仍缺额外触发隔离和条件参考/抽弃后最终执行的完整联合验收，SL候选块不能替代。 |

机器回报final-report.json；提案交接路径 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-002829-s2/learner/runs/20261011-002841-strategy-proposal/proposal.md`。原提案原字节/SHA、CLI操作、红绿、全套日志、gitleaks及冲突现场全部保留。

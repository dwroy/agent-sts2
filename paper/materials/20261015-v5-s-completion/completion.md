# V5-S 限定目标完成验收（2026-10-15）

原父 `roy-20261014-s-decision`、原 owner `01a139d6-cfec-78e1-8739-e21ac426a354` 保留；跨号接续 watcher 为 `01a13dcd-83d4-7c63-b233-f93cf878ecf4`。本次完成计划第11–18节对应的 C1/C2、P0/P1/P2/P3 与评估交付，P4/P5 不在范围。宽 R2/R3、学习入库父项、当前生产模型校准及 silent-0332 修复链保持原 owner 和未完成状态。

## 准入与发布

- 离线最终排序固定集8/8一致；两局完整自然 shadow 为 WJ0LTVSSDY61 和 DUB5VQQ6D6D1，C2 最终 P2/P3 首组分别27/27、30/30，适用题面与 P2 实际选择完整。WJ 沿原 owner 已验收的迁移前账号身份；DUB 全23次请求原生 Sol6.1/xhigh、codex1 的联合账号/模型/覆盖门槛另验收。HLAW 混合账号整局排除，未充数。
- 用户授权的 main 合并已于 `56ee0a3bc9c15c274e505f5769ec47677cb2ce37` 完成，组合沙箱431文件4058项+路径11、tsc0、health3、gitleaks0。并行 dirty 原字节保留，未 push。
- 原 ops 串行发布 P2 **V5-R359**（行为 `a013ee61b8fb3a581608962c7c28a97ae7f1d3c5`，中间 live `0992ed193a94ac360ed6f34ff90110aeeef8117d` / tree `571bd2d0d480646831d968eaa27f9c51b791533c`，C2仍shadow）及 C2 **V5-R360**（行为 `18fba4f25e07e6c289818352e446191a01def56a`，最终 live `fad271855a515e229c7022f5049cc870f95a8d69` / tree `24de68ae5d7c329dc445f48451fff885ce1c43c2`）。行为编号、源码祖先、精确叶子/函数块、知识刷新、历史注释与根双通知均有原回执及 watcher 读回。
- 最终组合24de的唯一原宿主通道 full 为 tsc0/vitest0、483文件4891过2跳、697.69秒；没有给中间571单独借绿或重测。

准入证据：[第二自然局验收](natural-DUB5VQQ6D6D1/complete-shadow-owner-receipt.json)、[账号联合门槛](natural-DUB5VQQ6D6D1/codex1-admission.json)、[发布读回](resume-1615/watcher-publication-readback.json)、[最终宿主读回](resume-1615/watcher-host-completion-readback.json)。C1/P1/P3 的原发布分别为 R351/R352/R353，原消费者回执仍保持。

## 下一自然 on/on 整局

`RQCHNN0W72KF` 于17:30:49自然启动，19:05:32于F49败给实验体 TEST_SUBJECT；此前F48女王+火炬头聚合体实际胜，剩4HP进入F49。772条连续决策、53个大脑请求、207条 Jev 调用、唯一原配置/终局，全部按原偏移/字节/SHA冻结。原PID2047994/birth94859754、native `3d066a583631b85acb208813c31510864007adac`，P1/P3/P2/C2均on、admission accepted。逐53次原生 request/thread/turn 与当时存活进程的 codex1 home、认证链接及文件元数据对齐，均 `gpt-6.1-sol/xhigh`；无备用模型、未知片段或新账号配置操作，未读凭据。

原生基底tree `bc98332b3e0580d5d76517204768e9592ac2ce9f` 的独立实际宿主 tsc0/vitest0、484文件4897过2跳、617.40秒，与R359/R360的24de及R361旧6a55失败分列。启动时9个 dirty 知识/notes 叶明确记入原配置，不称这个未提交运行快照已获精确 full。R362正式编号树仅registry变化，未借给它独立全套绿。

- **P2**：42/42产出/实际选择，38道有候选的排序事实真实 delivered/accepted；逐题将原 accepted answer 交给未修改的已部署纯验证函数，选择映射全部等于实际 selection。8次偏离均有理由，分词数21/21/15/21/18/20/20/14，均≤25，补问0。其余4题（F15/21/36/45）原模式仍on，但候选空、仅baseline完整1000样本，故没有送排序事实，deviated=null；不计为排序服从或偏离，实际动作均completed。商店只证明首个购买/删牌动作，不冒整套购物计划模拟。
- **C2**：89个实际 `complete_adaptive` 尝试（B2 51、B3 38），对应84个独立 `input_key`（82个一次、1个两次、1个五次）。部署 health 按独立输入计84/84、errors/unknown0、alert=false。成功尝试、独立输入和失败尝试分母各自保持；on未执行完整反事实，agreement保留null，不能报告on一致率95%。候选样本工作节省分位p50=0.517745、p90=0.691879，只是工作量，不能当耗时节省或收益。
- **C1真实故障出口**：3组 nonpositive-hp 资源保护失败（F40 rest、F48 combat两组），每组同key两次pending且不派发，第三次degraded；样本数42/159/0均不足300，不暴露不可用的整场模拟数字，之后真实首动作completed。原错误、种子、截断资源和9次尝试全保留，不能称模拟资源契约已修。F40对应原 ops 18:40已处理的 silent-0332/5aa2672 链；不重复派单，不新做模拟/机制推导。
- **其余health**：P1 42/42、合格送脑31/31、11低可信/符号拒绝、最大5.398ms；P3 51/51，S使用30、回退21（1符号/20低可信），缺失0。无P2/C2缺失告警不代表上述C1真实故障不存在。

证据：[53次账号联合读回](on-RQCHNN0W72KF/whole-run-account-admission.json)、[P2全部实际消费者](on-RQCHNN0W72KF/p2-complete-consumer-validated.json)、[C1自然故障出口](on-RQCHNN0W72KF/c1-natural-failure-consumer.json)、[整局health](on-RQCHNN0W72KF/whole-run-health.json)、[原生基底与校准来源](on-RQCHNN0W72KF/calibration-provenance.json)。观察器仅用有限只读 inotify，在终局正常退出；无分钟轮询、重启或热改。

## 实测耗时与部署评估

| 通道 | 实际尝试 | p50 ms | p90 ms | 最大 ms | 累计 ms |
|---|---:|---:|---:|---:|---:|
| B2 | 57 | 2274 | 39454.6 | 97585 | 663742 |
| B3 | 45 | 13734 | 43166.2 | 140100 | 1050824 |

102个实际必需计算身份全部纳入，包含6次pending重试、3次degraded、4次baseline-only完整计算及89次adaptive完成，未知耗时0，累计观察计算等待1,714,566ms（28分34.566秒）。这是原决策中计算ms的和，不能替代整局wall time或相对旧版节省。部署评估器结果与独立线性分位算式一致。F39最长140100ms的60/120秒进展由原 ops 18:40材料保留，11秒原性能目标没有被改成硬超时。

部署的 `eval/s_decision.py` SHA `aa4d589cc51d2baac581d24c187742682a9e2826ed9db555a76cb55bf173d54a` 未改，CLI实际rc0，输出 [report-r2/runtime-report.md](on-RQCHNN0W72KF/report-r2/runtime-report.md) 与 [evaluation.json](on-RQCHNN0W72KF/report-r2/evaluation.json)。首稿freezer曾按成功时才有的available字段错分6个失败B2为B3，已依据原combat题面修正元数据，原脚本/失败核验/首稿/report及其SHA保留，修正目录另存，不重跑游戏或计算。

新on窗口207条Jev完整token记录共1,819,070，延迟p50/p90为534/678.2ms；保持原模式，不作费用账单或架构因果推断。38个实际排序选择按Boss/进阶分组，4个空候选题明确排除；KAISER_CRAB参考题与实际F33 CRUSHER+ROCKET不符，15题结局未知，不强配。新5个条件模型T1预测只有2个能明确绑定本局实际Boss首试（Matriarch预测.955实际胜，Queen预测0实际胜），其余3个未知；旧SL预测另组，不以胜局倒填首试。Queen反例保持可见，不以本报告宣布生产概率准确。

P0原32题Jev/64份SHA与缺失S/成对SE/整计划执行边界沿原冻结报告；旧700行baseline仍partial，与新RQ完整整局分列，不构成配对实验。R362固定校准表仅107调参、验证415→438、固定模型/Platt/切点不变；原 ops 已核当前生产有70输入不同，所以本报告不声称生产模型重校准通过、不关闭自然采用或原校准父。败局、资源故障、低可信、未知结果、首稿错误和旧6a55全套失败均保留。

本次验收闭合架构功能、实际自然消费、描述性运行评估与文档交付；不要求或声称通关、胜率提升、完整游戏模型正确或宽学习父项完成。最终验收清单见 [complete-on-owner-receipt.json](on-RQCHNN0W72KF/complete-on-owner-receipt.json)，计划完成章节见 [docs/v5-s-decision-plan.md](../../../docs/v5-s-decision-plan.md) 第19节。

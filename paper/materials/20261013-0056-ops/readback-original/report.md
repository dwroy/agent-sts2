# 静默具体牌表学习入库：revision 2 的正式live读回交付

2026-10-13，写入时间前已运行date。request_id=roy-20261012-concrete-core-decklists，revision=2，输入SHA `c8be27b1c67f5e319127325b5729e792302b0c8518e99e154ad6508ee5eb49e5`；原batch20261012-140741-strategy-proposal，原owner/thread `01a12eba-13a8-7550-ac47-692d3d19bed1`，角色silent。

**本子要求的限定经验入库与固定消费者读回完成。** 原学习者五条经验数据源`dca4d3e13e066ebcba7f5d48fde9e24f824e856f`已由ops精确集成，实际行为提交`730db1e7b0bf2b313a4cb7193d9568f402cba503`，正式发布`V4-R313 / S1.exp195`，经验`2026-10-12.14`；新账本silent-0440已由ops标shipped。真实live消费者三题均读到五条新限定，15/15，正式回执为 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-140741/learner/runs/20261013-core-decklists-live-readback/consumer-receipt.json`。这次没有新增游戏结论、修改知识或重做原计算。

## 运行身份与恢复核验

本工作树启动HEAD/main=`e886085ad98ad48a06a76ab2a32ed21bd30a6f49`，干净。根请求的id/revision/character/worktree/thread/input与本题逐字核对，原日志SHA不变。原r1全部50份、r2全部79份产物SHA核实，旧报告、512模型样本、作废首轮、16/7共享记录冲突及EPERM等失败原件未改。
当前原生会话turn_context（`native-turn-context.jsonl`）实际model=`gpt-6.1-sol`、effort=`xhigh`、cwd为原工作树、sandbox=workspace-write；核验来自原生记录，不是配置默认值。普通服务档/原权限沿宿主原绑定保持，未改变运行配置、帐号或线程。
ops恢复与精确上线证据见binding.json中的deployment.json/behavior-deployment.json/original-owner-recovery.json；实际source与behavior两提交均由git merge-base核为当前live祖先。live经验字节SHA=`337756e8ad7e5159f9c398f04c8fe97621675bffb2ae526cb0a612eeff1b939e`，与独立源提交及本次冻结消费者输入完全相同。

## 逐项经验与适用边界

| 验收ID | 实际live经验ID |
|---|---|
| candidate-templates | silent-core-poison-defense-observation |
| upgrade-effects | silent-bouncing-flask-poison, silent-accelerant-triggers |
| core-ablation | silent-deck-burst-observation |
| effective-dpr | silent-aeonglass-artifact-growth-sl |
| boss-readiness | silent-aeonglass-artifact-growth-sl, silent-core-poison-defense-observation |
| choice-consumption | silent-deck-burst-observation |

逐条canonical SHA在live-content-verification.json和最终JSON；计算方式严格为Python json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()的SHA256。所有引用条目active且有本角色证据，五条内容保持原学习者源对象。共227条，其他222条保持，正文55638字符；只增加KF9至核心主题n64，旧181局/59签名冻结分母不变。

candidate-templates：复用原5套历史/5套待验目标/25展开臂，以及选定KF9 A10药瓶—触媒—实际防御分支的36张真实牌表、10张功能包候选及F2/F6/F22/F34/F44/F46实际过渡。每张数量、永久升级、附魔、复制与临时状态在原candidate-templates-increment.json；KF9末王未施步法/铠甲仍胜，特定防御签名不作为必要施放证明。B及理想10张只为待验候选，最小性和自然可达性未知，这一限定已入库。

upgrade-effects：同局药瓶普通3×3、升级3×4，重放1的无制品单敌条件算术差6毒；镜复制第二实例、普通触媒重放实建2、普通扫腿两次11挡加头盔8=30均有原帧。升级必要性/营火机会成本未知，不把附魔和持久能力写成永久升级。

core-ablation：原8臂×64配对已完成并复用。A36/B10/C恢复6防御/C恢复3输出在原固定模型中胜16/64、64/64、53/64、62/64；四D独立降级或去指定重放；同起点、种子、策略、预算与窗口。没有实际26次删牌机会/金币/过渡存活证据；原模型头盔格挡与触媒持久层数存在偏差，不能将方向性模拟当实际胜率。既有反例与未知已进入经验，无新强制删牌规则。

effective-dpr：逐样本先算实际有效伤/经历玩家轮再汇总，胜/死/截断/未知分列，早赢不补回合。KF9末王从T1起六轮，逐帧可见528/6=88下界；末7HP直接退场缺归零帧，535/6=89.17仅血池代理，T3—5毒441/3=147仅启动后窗口。模型曲线、3/6/12固定窗口、启动前后效率、击杀轮/漏血/剩HP均在原per-sample-metrics/paired-analysis，未重算或冒称精确实战总伤。

boss-readiness：KF9前王出口31/86空药真实接末王且重建能力；7S末王重试耗复活，两局整局首试均败。B仅做单王条件模型，未取得连续boss/自然构筑资格，不将独立王胜率相乘。这一未达标结论本身已经入库；量化父项与未来JEV构筑准入仍独立。

choice-consumption：新限定经生产全量知识前缀进入奖励、升级、商店题面，提示先核现有组件、费用及可活后继，再考虑取/跳/删。源端旧经验负对照的15条新增文本全部缺失，原材料复用；本次补实际live固定读回，不把固定可读等同自然采纳、模型改进或真实胜率提升。

## 正式消费者回执

复用KF9原始三帧：s369292/F2 reward/card、s369329/F6 selection/upgrade、s369523/F22 shop/plan。每帧原offset/长度/SHA与单局及全局原字节核验材料保存，未新开对局或重新提取全历史。
实际源码=`2e14889f13c1d257b5f1babc5cea97c58e994b90`（live检出），调用parseGameState→RunJournal.render→KnowledgePrompt.apply；CHARACTER=silent先于知识模块加载。冻结实际common和silent知识输入，保存实际输入/输出/运行参数/断言；共享live锁保护读回时源码及经验稳定，前后字节一致。案例标题装饰省略，实际经验加载与生产前缀格式器保持。没有模型调用/网络/动作执行。
`live/verification.json`与实际进程exit0证明三题全部mode=full，每题5条ID及新增限定原文出现，15/15；完整输入输出及脚本SHA在consumer-receipt.json，kind=fixed-consumer/status=passed/experience_version完全匹配live。自然采用/理由引用/选择执行/胜率改善没有被本回执证明。

## 发布、记录、台账与通知

ops已分配V4-R313/S1.exp195并标silent-0440 shipped，未重复编号或把五个宽机制提案标implemented。代码提案仍沿ecf0dd74ac09ccad、9e81dc5f9a4c3bd5、f5f84ef2b801ccec、5329ffa5661d6ad4、2f939cab26967b90；本批没有领取其它队列ID，proposal_results为空，P1/P2继续由原owner处理。
本次仅补消费者和记录，源工作树代码/知识零差异；tests的tsc/vitest/cases为null，不制造新源码测试。已有ops集成tsc与experience/jev-experience/brain-knowledge检查退出0，回执integration-checks.json只读复用，未重跑已过测试。撤源码失败/恢复通过不适用；原数据负对照原件保留。
读回记录实际提交`33f42aee34175987601615b14fc4f08f52dd3c8d`只改live的paper/materials/decision-log.md，提交前gitleaks扫描3.02KB退出0/no leaks；此为文档记录，不分配新行为编号。根notes/for-roy.md和ops/inbox-dev.md已按授权同时追加五项旧/新内容、来源/账本、预期影响、回退和真实读回路径，offset/长度/原字节SHA见delivery-notification-receipts.json；不代写通知ACK或声称这些新追加已被Roy阅读。
原r1/r2四项异议及技术阻塞的39042…、4672…、1b696…、d362…四通知，ops_forwarded/watcher_received/roy_notified共12份实际回执逐SHA核过（prior-notice-verification.json）；已由原watcher告知Roy的事实仅限这些已核历史回执。

实际元数据问题：eval原source文字引用的paper/materials/20261013-0018-ops/release-changes.json未见文件。本轮在自己的scratch保存真实五条前后原件release-changes.json并在双通知引用，未覆盖eval历史source字段或运维目录。正式部署/条目/读回证明均来自已存在原件，不依赖该缺失路径。

## 交付口径与剩余独立工作

learning_result.outcome=complete仅指本request的六项支持/限定/反证已入live经验并有固定消费者读回；注册最后的awaiting_delivery/completed、后续通知确认仍由ops/watcher管理，学习者没有编辑notes/learning-requests、learn.json或ACK。
完整核心实例回返/支付归属、原模型重放修正后的定量验证、连续boss精简牌组、自然取得/执行/胜率和未来JEV准入仍沿量化父项及原任务。未知和正确反证已形成限定学习成果，未硬证最小核心或稳定通关。本次无新game-code提交、无push/play/重启对局/子agent。

原提案路径保留 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-140741/learner/runs/20261012-core-decklists-learning-v2/proposal.md`；本次续办交接文件 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-140741/learner/runs/20261013-core-decklists-live-readback/proposal.md`，原报告不改。

# 静默猎手策略实现与交接报告

记录时间：2026-10-12 19:13:47 CST（写入前执行date）。批次：20261012-183755-s2-strategy-proposal。原10个CLI id全部处理；一个限定修复已提交，其余九项未改策略。尚未实际上线，最终十项队列结果均waiting，其中取整项因合入冲突待运维，其余逐项缺证原因见下。没有伪造新提案id、游戏版本或shipped。

## 结果与身份

- base：`5131744f62198cf2469da2734e4a0da2b751c84e`；开工干净，普通批次git merge --no-edit main为Already up to date。
- 源提交：`ec29ea34b919344b707e57ba472ea210f9c39d62`，仅六个源码/固定验证路径；未推送。
- 本批reason=proposal、角色silent、worktree匹配，派发含10个proposal_ids，无research_request/implementation_request。不承接其他专题、不扩领其他队列。
- 每份原提案Markdown按登记SHA保存原字节，25条账本使用官方fold语义。本批不修改原提案原文或队列，新增实现/证据链接仅经根ledger.py追加。
- proposal：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-183755-s2/learner/runs/20261012-183811-strategy-proposal/proposal.md`；机器回报：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-183755-s2/learner/runs/20261012-183811-strategy-proposal/report.json`。

## 本次改动及为何有足够证据

原NHA2KW0RB7VP A10 F33 T2六次，碾碎爪同招、力量−2/虚弱1，转向后1→2，火箭30→20；旧源码将已取整1再乘1.5并floor，仍得1。15挡实际损7、16挡损6，旧预测分别6/5。旧提案因缺可追溯未取整底值而waiting。

本批在已派发锚点补核JLN5SK17W4FQ/S9UZAK0JP0C0：F33 T2无减益正背面4/6，力量3后7/10；S9 T7同力量3且虚弱1时5/7。26个分支观测、52条原始状态和决策按偏移及SHA回原logs验证，证据只来自静默。当前进阶数据库base4与这些原帧相符；不借数据库混合统计单独提供游戏结论。LS8035TB32P3 F33 T2缩小2→4是排除约束，不能泛化floor(shown×1.5)或全局改ceil。

新路径限定silent/A10、CRUSHER/ENLARGING_STRIKE_MOVE、力量−2或3/虚弱1、已观察power集合、两部件存活、单击和已知朝向；数据库该进阶须非估计base4（固定测试n=1亦可启用）。保留弱后分数，到朝向变换结束再取整。初始显示值必须匹配，否则回原路径；当轮新弱/减力/力量变动、未知增益/阶段、单部件、缺库/估计等级保持原行为。后续模拟轮清标记，不将本招分数带到别的招式。没有更改SL资格、探索排序阈值、持药价、终局权重或选项集合；铁甲与未观察等级不进入新分支。

证据没有支持整局胜率改善。本批是数值一致性修复：NHA六试作为一局，JLN/S9为更早独立底值/控制证据，不冒作后移胜率验证。未来自然局另验；未知组合仍保留，不从这几局拟合价值参数。

## 验证与失败历史

- 原始证据：16局runs记录唯一且角色silent；六局3352状态/3746决策旧索引逐原字节SHA复核，另Y6已包含在状态索引里；关键28项断言及候选/容量/开场108项断言通过。这是日志检查，不是136项生产测试或136局。
- 狡诈补核：9局42次饮用，37次添3、2次添2、3次添0；新增刀升级且基础6、耗瓶与HP/能量分账。125条原始记录核验，完整局号/层/回合见capacity-history-observations.json；与7098索引存在重叠，不重复计为独立样本。
- 六局当前resource_chain消费者重算资源变化，保留重启、缺出口和unclassified，不冒作胜负认证；未另输入SL事件时间，不声称所有SL事件完整。
- 固定接线：planCombatTurn→enemySims→replaySteps/describePlan，原帧六次转向总攻22，15/16挡实际出口吻合；缺库、其他角色/等级、缩小等反例及后续轮清标记验证。
- 首次新测试：9通过/1失败，原因是测试把simulateFight位置参数误写对象；修正测试调用后10通过，初败日志保留，未改超时阈值。
- 撤掉全部四个实现路径后9失败/1通过；恢复原字节后10通过。red-green.json与facing-red.log/facing-restored.log保留。
- 原沙箱全套首轮：tsc0，340文件3394通过/1失败；唯一失败为既有silent-apotheosis-reference的15000ms超时，初次日志和exit1保留。
- 同源码不改阈值/输入，SANDBOX_WORKERS=1重跑原脚本且仅指定失败文件：第一阶段5通过，第二阶段paths+同文件16通过，script exit0。去重覆盖341文件3406项；不将原失败改写为全套首轮成功。test-result.json给出精确口径。
- gitleaks扫描候选六路径副本及本批材料exit0、约49.34MB无发现；提交前六路径逐SHA确认仍为已扫字节。live刷新提交另经gitleaks检查。
- 只读定位曾遇不存在路径和两次bubblewrap glob scan ENOENT，同权限重试后读到实际文件；详情read-errors.txt。这些不是生产测试失败。早期账本扁平摘要不适于合并列表，已保留为initial-flat-summary.txt并改用官方fold，不据早期摘要记证据。

## 既有实现核对

核验live参考`1d3b8508d4b58b2dc24815c8b740d95e7c54a48b`。狡诈`6403fdcdadc803a092beb5165a068e22bf51c412`、紧勒`5c7105ff0294466da8319f2934beda05c6040794`、王室猛毒`e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`、重接`0970bc0d112718d45c8ebf86ff7f84e0f36a7498`及另四条已核来源，均核为本base及该live祖先。九个相关路径有四个逐字相同，其余只有Roy/Dai注释署名差异；逐行差异保存。较前批combat-plan增加的巨兽题面与本批取整修改分别识别，不覆盖并行变更。不将旧子项冒作本批新实现或关闭父项。

## 合入受阻与后续动作

持`ops/live-merge.lock`先等待builder退出；live九个自动知识文件已按要求另提交为`6d069d273ca5c6d431a87df086877c02d052c2ed`。合前检查该刷新与incoming重叠，并执行merge-tree预检，发现29个冲突；完整路径在live-merge-preflight.txt/live-merge.json。冲突包括eval版本、九个刷新知识、共享notes/ops台账及paper记录；没有本次六个源码/固定验证文件的内容冲突。

按任务要求停止，未执行实际git merge，未产生MERGE_HEAD或源祖先关系，未跑合后测试。live保持合前刷新提交；notes/fight-value-backtest-silent.md、notes/monster-db-check.md两处原脏记录逐SHA不变。merged=null、version=null，无游戏版本、规则上线通知或shipped。请运维沿原提案处理这六路径源码提交的集成冲突，核实际live祖先与合后检查，再登记版本/双通知及shipped；本报告不提前宣布完成上线。

回退：本次尚未改变在线策略，无需回退live；若后续部署，再只revert源提交的限定代码，保留原始证据、初败、知识刷新和并行记录。刷新数据提交不是本策略上线提交。

## 逐项处置

### silent-proposal-08eaa60bcc449852 — waiting

账本：silent-0019, silent-0020。

证据：KEN58SH9SLZ6 A10 F3T2/F4T1/F5T2/F11T1–2/F15T1；states280255→280285：53→16；280347→280381：46→46、药栏2→0；F12/F16真实回复26→53、46→75。

核对/反例：零损胜战仍耗药；当前resource_chain复算F5损37、F15损0，SL重启不当正常回血。

处置与验证缺口：缺同入口不饮、留药到boss的完整后继；零损已饮分支不能证明不饮也零损，保留持药价。

### silent-proposal-92920295a648b540 — waiting

账本：silent-0228, silent-0255。

证据：TXZ6RVMQA09D A10 F48第二/三次T6，states281479→281484与281535→281539；F49入口281563–281566。

核对/反例：原线损3/扣36，替线损0/扣27；首胜4血，后战出牌前4→0。后轮抽牌/生成不同，三试不拆独立局。

处置与验证缺口：缺同抽序、后续动作受控的连续通关对照，不能由少损3校准SL或终局值。

### silent-proposal-a327449c331efbc1 — waiting

账本：silent-0079, silent-0018。

证据：WQZVENQ7DTRP A10 F33第二/三次T9，states282075→282079与282144→282148；T7原282066→282072、末试282330→282336。

核对/反例：同盘原线损13/扣24、替线损22/扣39；T7原线损0/扣24、替线损4/扣24。T7动作后沙坑4/5，T8轮初3/4，反例阻止一律保血或一律输出。

处置与验证缺口：缺完整受控后继和独立后移胜负样本；现候选比较已记录血价/沙坑，不拟固定交换门槛。

### silent-proposal-a099e89437e942bb — waiting

账本：silent-0030, silent-0257, silent-0258。

证据：02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0、SADL3CGYTGSR、WQZVENQ7DTRP；逐项层/回合见capacity-history-observations.json。

核对/反例：本批回原日志核9局42饮：37次添3、2次添2、3次满手添0；升级刀基础6，耗瓶、HP/能量不变。125条原始状态/决策逐偏移SHA保存；不是只复用旧统计。容量及同轮穿插已有live子项。

处置与验证缺口：缺计划妥当跨轮保留选择、饮药复合触发及完整后继验证；42饮支持容量机制，不证明穿插能救整战。

### silent-proposal-47910f82a1fdd98f — waiting

账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255。

证据：TXZ6RVMQA09D A10 F43/45/46/48/49：出牌前70→66、52→48、62→58、60→56、4→0；WQ F33T9/T7同上。

核对/反例：现限定开场模型已在live；首胜、下一战入场与开场后可操作资源分列。不将未知小血瓶/复活顺序补成事实。

处置与验证缺口：无未知回复/复活组合的中间相位及留药完整后继，无法关闭宽资源/SL提案。

### silent-proposal-f1374df72d8e6a25 — waiting

账本：silent-0019, silent-0020, silent-0050, silent-0253。

证据：Q6M2Y34MWKRE A10 F2T1/T3、F7/F8T1–8/F9T2；1913SE84AXQF A10 F24/F28/F29/F31。

核对/反例：Q6实际休息36→57、精英胜57→2、走廊死；F2早饮候选未完整执行。1913 F24锻造不回血、F28加21、F29损15、F31入46，路线条件已变化。

处置与验证缺口：缺同入口早饮/留药与同营火条件的完整后继，保持护栏、药价和终局权重。

### silent-proposal-38a49e6c97f31eea — waiting

账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262。

证据：Q6M2Y34MWKRE A10 F8T4 states282887–282892：敌103/95/85/85/83/80；Y6GM2CHWJBEY A0 F4T1；1913SE84AXQF A10 F31T2–4。

核对/反例：普通紧勒及重接清旧毒/力有实际live源；反伤、复活、净伤与毛伤不互换。死亡端点不补造内部逐击顺序。

处置与验证缺口：宽机制包仍缺致死轮逐击中间相位及复活/反伤/阈值/SL组合验证；已有局部公式不关闭整包。

### silent-proposal-ef0e38a5dbd3bc07 — waiting

账本：silent-0019, silent-0020, silent-0021。

证据：Q6M2Y34MWKRE F7回血、F8胜后2血、F9T2死；1913SE84AXQF F24锻造、F28回血、F29胜后46、F31入口46。

核对/反例：当前资源链输出真实观测变化、重启、缺出口与未分类结果；未来营火和未触发能力不计已得资源。

处置与验证缺口：缺同入口换线、休息/锻造、用药的完整后继；两败路线与不同动作条件不能拟统一门槛。

### silent-proposal-cfecb5580938873d — waiting

账本：silent-0263, silent-0264, silent-0265。

证据：NHA2KW0RB7VP A10 F33T2六对1→2原帧，15挡29→22、16挡29→23；新增核JLN5SK17W4FQ/S9UZAK0JP0C0 F33T2无减益4/6与T7力量3下7/10，S9T7弱1下5/7；LS8035TB32P3 F33T2缩小2/4作排除反例。

核对/反例：改变原“底值未证”的结论：本批派发锚点已提供同角色A10底值4原帧，并与当前进阶数据库一致。限定当前招式、力量−2或3、虚弱1、已观察增益、两体存活和已知朝向；读库非估计base4，保留弱后未取整值到朝向变换结束。未知组合、当轮新减益/力量变化及后续模拟轮保持原路径。

处置与验证缺口：本批已补足底值并实现限定取整修复，源码ec29ea34b919344b707e57ba472ea210f9c39d62已通过固定红绿及沙箱覆盖；live预检29处记录/知识冲突，未实际合入，不能登记implemented。未观察增益/阶段仍保留旧行为。

### silent-proposal-7f820c02d39bfaea — waiting

账本：silent-0079。

证据：NHA2KW0RB7VP A10 F33第1/5/6次T1：states283391→283397、283478→283483、283502→283507；decisions277248/277250/277272/277274。

核对/反例：原线14挡/损1/跨轮净扣8，替线8挡/损7/净扣24，两边均未击杀。精确切击被弃后重规划，候选不等实际整轮；抱抱先生后轮扣血另列。

处置与验证缺口：缺同抽序完整后继、可追溯击杀/存活推进和独立胜负样本，保持探索门槛；本批取整修复不等于SL选择得到验证。

## 最终交接核验

2026-10-12 19:15:57 CST：25条账本更新全部经根ledger.py完成，原账本前缀逐字保留；仅0263新增两条本批核实的底值/控制证据，其余不重复support，原claim/status/version不改。0263保持proposed，0264原shipped状态未降级；源码尚未合live，不新增shipped。最终本工作树干净、HEAD为源提交ec29ea34b919344b707e57ba472ea210f9c39d62；六个提交路径与密钥扫描原字节相符，源仍不是live祖先。final-verification.json和artifact-manifest.json保存交接核验。

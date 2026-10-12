# 静默猎手本批十项策略提案：未知药价的有限展示实现与逐项复核

批次：20261012-131301-s2-strategy-proposal。角色 silent；基线 c425b7b7b36f4a7ca1532ca62a6b8dd7d1da2216。开工工作树干净，普通派发只有本批十个proposal_ids，没有research_request、implementation_request或proposal_repair；根专题请求绑定其他批次，因此不承接专题。git merge --no-edit main 返回 Already up to date。

## 本批有限实现

承接 silent-proposal-85929bdfc8a3fc1b 与 silent-proposal-131042659448ae74。来源任务分别为20261007-191301-postmortem、20261007-193251-experience-update；实现任务为本批strategy-proposal。原账本silent-0019，限定子项经根ledger CLI登记silent-0431，状态proposed。原队列ID和Markdown均保留；没有另造重复代码提案。

证据：751FN9QM9MHQ，silent A10，F13 T3，decisions272361/272362及states278402—278407。原题plan2饮药预测损8/伤26，plan3当轮无药预测损8/伤16但后续7/8样本饮用；plan5才是无药整战参考，同为8/8样本在5轮内结束。预计结束轮数分别2.3、2、2.9，不能称输出和时点全部相同。实际先防御再饮用槽0肌肉药水，药栏清空、力量增5；下一轮HP58→50。无药分支未实打，不能用饮用结果替代无药反事实。

旧行为：现有potion-cost保留holdHp=null、charge=0和no_table原因，题面文本写药水表未加载，但没有结构化“持有价值未知”及同题当轮无药/整场无药对照。新行为：仅静默A10且成本策略开启、至少一项holdHp为null时，在potion_context追加potion_value_reference。保留真实null和zero原因；逐项链接现有选项键、当轮HP/伤害/抽牌/未建模标记、已有rollout样本胜负、预测损血与存活样本平均终结轮。明确列出本轮无药及模型整场无药参考，不新增模拟，不替换或删除选项、不改评分、排序、护栏、SL或实际动作。

单回合时钟估计、缺推演、降级和不存在的无药参考均不伪造抽样胜负/整场无药；已知0与已知正持有值不触发未知说明。随机药水仍看原药水候选，表格只覆盖已展示牌线。模型说明中文，源码注释英文。铁甲和未观察进阶题面经固定输入等价检查。

反例：本题plan3本轮不喝不代表保留整瓶；plan2与plan5的模型损血同为8但终结时点不同。KEN F17 T5省血而延迟能力亦反驳单一当轮指标恒优；YQL残壳毒增加不代表自爆变小。授权不提供药价或胜因。

拟合与时间切分：本批不拟合任何游戏数值；使用2026-10-07已经结束的751作为固定消费核验，不把其六次SL作为独立验证，不称泛化胜率改善。后续药价和SL准入需要更早独立局训练、后期独立局验证及受控后继；本批派发的六局不足填补这些因果数据。

验证：固定原始帧进入真实planCombatTurn，两种Jev题面都取得新字段；关闭新消费者时原候选、排名和其余题面逐项一致。撤回combat-plan消费入口后12项中2项真实消费者测试失败、10项通过；恢复后12项通过。完整沙箱检查结果及提交/上线状态以report.md为准，不提前登记成功。

预期影响：让Jev区分计费回退与未知持有价，正确识别同题无药对照范围；没有已验证实盘收益，不强制喝药或留药。回退：撤回本独立源码提交（新helper、两行消费入口与固定测试/夹具），原药价算法完全保留；保留全部日志、原提案与本批材料。实际合入后才登记版本、双通知Roy和交运维核实shipped。

## 六局证据核验与限制

已从只读原始日志按本批局号抽取4071决策、4167状态、43条SL记录及6条runs，均silent/A10；每行保留原始行号、字节偏移、长度和SHA256。详见evidence-manifest.json，实际run计数与runs.jsonl decisions一致。五组同指纹对照：751 T2净损13→18/扣敌9→18；751 T7净损13→23/扣敌12→18；KV T5净损0→0/扣敌36→29；KEN T10净损15→21/扣敌2→4；KEN T5净损7→5/扣敌1→2。差额只是观测区间，包含续问/续步，不自动归因完整原候选。

八次饮用分别为751一瓶与KEN七瓶；potion-use-audit.json保留槽位与增益前后。YQL末次T10 states280160→280161：HP26、挡13、自爆41不变，毒2→8；17个巨兽尝试及引用保存phase-audit.json，不把占位血当本体进度。

现有预测比较5604982e13890e0e2bc8bf8246272e8267321c0b、单步派发fdaf787a372880b0438e73bcac7e6d2168b038ed、离线观测5a3f44c4261d47f4f6150b83c8bb285dc032afa4、阶段参考1d57f9d0dbbb63603e9ce9768e74cb2021478464均核为实际live祖先；这些只是已实现子项，不能用来关闭更宽父项。

离线auditSelectionExecution首次完整输入拒绝旧map/route-change注记缺decision_id；失败原件保留。后续仅剔除没有chosen的六条非动作路线注记，保留原始行号、缺口和全部原始文件；消费者仍不能跨缺口认证执行。各局消费者结果见consumer-summary.json与consumer-*.json，actual_full_candidate_result保持null不伪造整轮收益。

## 本批派发ID逐项处置

### silent-proposal-366288801d9150d9

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md

SHA256：0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524

证据局：751FN9QM9MHQ；原账本：silent-0079, silent-0176。

处置：waiting。751 F17 T2多9伤付5血、T7多6伤付10血已逐帧复核；已有预测/派发源码为live祖先，但未决弃牌、续步及整轮候选收益仍未认证。缺同随机输入完整后继与独立局验证，不拟SL准入门槛。

### silent-proposal-85929bdfc8a3fc1b

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md

SHA256：d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68

证据局：751FN9QM9MHQ；原账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。

处置：waiting。本批实现缺失持有价值及同题无药参考的展示子项；父项还缺未决弃呼唤的确定/保守损血联合拆项及无药或留药完整后继，不能据F13饮用分支确定跨战价值。

### silent-proposal-efd9f83ee9e1a6dc

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md

SHA256：0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006

证据局：751FN9QM9MHQ；原账本：silent-0079, silent-0176。

处置：waiting。与366共享的5/10血配对成立，原同源提案SHA一致；已有局部审计不覆盖完整执行归属和受控胜率，保留父项，不能整体标duplicate。

### silent-proposal-131042659448ae74

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md

SHA256：b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951

证据局：751FN9QM9MHQ；原账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。

处置：waiting。本批实现未知持有价子项；逐张敏捷、毒/荆棘限伤、呼唤及药价的联合消费者认证仍未齐，缺同题不饮用整战结果，未更改护栏或药价。

### silent-proposal-990f054036609447

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md

SHA256：c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053

证据局：KV0JHNJCKXLS；原账本：silent-0102, silent-0019, silent-0020。

处置：waiting。KV F33第4/5试T5同指纹，实测净扣36/29且当轮均零损；后续毒量及敌回血不能由候选分数认证完整执行。缺保毒/删毒同抽序受控后继，不设探索或路线门槛。

### silent-proposal-e18d3f18e6cac2a0

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md

SHA256：3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821

证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；原账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。

处置：waiting。YQL六试占位阶段/50、50、47、50、50、41自爆与L9/PU历史引用已核。阶段日志部分已上线，末T10毒2→8而HP26/挡13/自爆41不变；缺阶段药水展示的联合验证及改变SL排序的完整受控结果。

### silent-proposal-9733bb80f445aeae

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md

SHA256：c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382

证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；原账本：silent-0017, silent-0019, silent-0020, silent-0250。

处置：waiting。与e18同源但父范围仍含巨兽阶段药水和参考排序；通用未知持有价说明不证明本体/残壳药效或跨阶段收益，缺提前用/不喝/保留完整对照，不能整体关闭。

### silent-proposal-c51468c5e8ba6668

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md

SHA256：168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469

证据局：KEN58SH9SLZ6；原账本：silent-0019。

处置：waiting。KEN七次实际饮用与F17空栏入口已核；发光水重问、技能药选择后完整方案归属仍未认证。缺F15不饮用或保留至boss的完整后继，不能拟持有价。

### silent-proposal-86a7db08d1a31976

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md

SHA256：10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6

证据局：KEN58SH9SLZ6；原账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。

处置：waiting。KEN第4/5试T10同指纹，多2实伤付6血；第4/6试T5省2血但步法延后，追加小刀单列。缺能力窗口与完整后继联合认证，不以当轮血差重写SL/HP护栏阈值。

### silent-proposal-e282a9131b99129a

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md

SHA256：a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872

证据局：KEN58SH9SLZ6；原账本：silent-0021, silent-0079, silent-0125, silent-0176。

处置：waiting。与86共享反例与资源差已核；预测、派发、离线观测为不同证据层，尚无完整候选收益或独立局受控胜线，不把六次相关SL当六局拟合。


## 本批最终验证与合入状态

源码c4670f4f416c7d93e192e889c5080e7e4e0e733f；tsc0/335文件3348项通过；红2失败/绿12通过；gitleaks0。live三方预检9处共享记录/位置冲突，未实际merge、merged=null、无版本或shipped。详见report.md、verification.json。

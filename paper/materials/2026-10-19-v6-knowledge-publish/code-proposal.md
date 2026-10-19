# V6 知识发布结构审计提案

实际来源任务 v6-knowledge-publish，request roy-20261019-v6，batch v6-knowledge-publish-20261019-223156；账本 silent-0529，角色 Silent，仅冻结372个已结束局。此提案不更改游戏规则、经验正文、模型或统计口径，也不请求启动新批次。

旧状态：冻结核心R1的14组合使用旧版进阶/代码分层统计，现行build-core格式要求first/including_sl两份池化指标、来源原计数、A10 simulation/regression及收缩、可执行前提。原草稿当前校验123项失败。冻结reflex R2有85条标签、零可发布数值；核心关联指向尚未发布方向，部分原观察缺可匹配的来源见证。共享词表的silent-r2-explicit-legality含MEXYTC0Z2MQQ/F17/T1，该原观察当前无法在冻结见证表中匹配。

证据例：C48LLXBGKXQ9/F31/T1原帧（SHOCKWAVE方案标签）及其余1978原字节段已逐项核SHA、局号、层、回合；完整路径/offset/SHA在raw-evidence-verification.json。负例、删失、原n/误差和未知保持原稿，19个可发布标签的metrics明示design=observational。未运行拟合、训练/测试拆分、模拟或线上调用；不能从缺见证推断原游戏经验错误。

建议新行为：原owner接手时，只对已冻结验收版本执行现行加载器/固定消费者探针；完整保留草稿上下文与244经验覆盖。核心卡需原学习者提供并验收现行口径版本，不能让发布者重新拟合或取在途R2。缺原件、不可执行条件和依赖缺证枚举继续pending。若源任务名不被提案CLI接受，应由原开发owner处理任务注册兼容，禁止用虚假source_task绕过。

本批实现边界：仅从已核原稿无损抽取19个按动作匹配且无未发布核心依赖的标签和7枚举；其余均列pending。experience.json全部原字节不变。没有出牌阈值、药水、SL或终局规则变更。验证：原reflex草稿固定入口通过；正式loadV6Knowledge和实际combatEntryAudit→projectCombatDecision的正/负/未知固定题逐项核回，数值后继保持未知。其他角色不读取Silent文件，未观察进阶不得匹配。

预期影响：消费者在条件成立时读到已有描述标签，未知不误挂；不声称因果收益或自然采用。回退：撤回本次两个新增正式文件的知识提交；不回滚并行刷新，不改原证据与经验正文。实际live仍由ops核实，未填写implemented_commit，账本保持proposed。

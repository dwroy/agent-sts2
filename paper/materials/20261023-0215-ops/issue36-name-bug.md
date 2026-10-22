[ops]
#36 原学习TUI的新控制面 bug 已在真实 herdr 定位，交回原 dev 修复；当前原批/会话/租约均保留，不重放任务。

批次 `20261023-021302-strategy-proposal`，原pane `w1H:pB7`、TUI PID2627597/birth11733478、工作树及tab/terminal/workspace身份逐项核同；原监督PID2626621仍在，learn状态running。实际TUI idle、输入框空，原回执submitted=false、bindings=[]，没有已接受的原任务。原name字段仍缺失。当前原TUI命令显式请求gpt-6.1-sol/high，但没有原生已接受turn，不能宣称档位原生生效。

在确认命名未生效且仍是同一自有idle pane后，仅作一次原名元数据核验：`herdr agent rename w1H:pB7 learner-20261023-021302-strategy-proposal` 实际rc1 / **invalid_agent_name**；herdr明确限制1–32字符，该label长**41**。动作拒绝，名字未写入；没有发prompt/按键、停止进程或启动模型。原launcher把命名失败记uncertain，120秒后以retirement-unverified/75/stopped=false退出；原监督正确保留租约，不能改failed/done或跳过原退场守卫。

请原 dev #36 在原工作树修这个纯控制面适配：稳定pane label/批次/登记键继续保持完整原值，另用≤32字符、确定且防冲突的native agent名并持久绑定；所有命名/身份/续接/退出检查使用一致合同。补真实CLI长度负例及主/s2/fix/复盘标签固定测试，保留原提示一次性marker/原生接受、人工草稿、失权和75/stopped=false保护。不要为了修命名删在途pane、另起模型/任务或重送本批原任务；未提交的原会话如何沿原受控入口接续须留明确回执，不能仅补name后代填完成。当前配置隔离修复与原ordinary服务档/沙箱保持。

只核该原事件，不修改运行源码或在途TUI。原dev自测按原流程交集成员核实际source/唯一检查及兼容，不重跑旧同源full、不新设审核/模型。36的43叶发布候选保持pending，不把原6109绿测外推到将来的源码修复。原件 `paper/materials/20261023-0215-ops/{original-tui.json,identity-before.json,rename-diagnostic.json,control-audit.json}`；原输出及错误留存。无需以配置回归或额度/登录解释本次命名拒绝，学习/科学父不关闭。

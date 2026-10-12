# 静默核心量化续办回报

源码与条件经验已提交并通过自测，尚未合入live。只读合入预检发现12处冲突，包含本批生产路径combat-plan.ts和turn-solver.ts；依任务“冲突就停下回报”与“发生路径冲突交ops协调”停止，没有暂存/合并/回退live。父四成果未整体完成，原三提案全部waiting，不能登记implemented或shipped。中间进度曾按日志尾部报11项，完整清单复核为12项，保留原日志。

## 身份、证据和基线

- 角色silent，批次20261012-024317-strategy-proposal；父请求roy-20261011-silent-core-cycle-quantitative-learning；continuation_id=ops-20261012-quantitative-continuation。
- base：`d39eb1db3101bc480271fe31c9dcc5b7129cca54`。开工工作树干净，主线合入Already up to date；本任务是已授权实现续办，不是纯研究。当前HEAD为经验提交`51e0c1f475f842b355172f1f2a6f320cae9fb58d`，工作树干净，scratch被忽略但全部保留。
- 绑定核验66项SHA全部相符：父task、manifest、授权、ACK、9输入、宿主两回执内容、原三Markdown、5框架补充、42旧产物、职责补充等。实际manifest SHA `54bd743de00cc1c5146546f06859a59016afba85a39c52aa73359860359c845f`；task SHA `3c9355afd6ee7c98ff7cfc9c2e9a45d20fdf025ae701fccd482b1b73aea6079b`；职责补充SHA `e2f593c68d1d00ca1c33aac7d4971603ce349a22a93eaafe0e6d6cd1e6d1efa5`。详binding-verification.json。
- 只处理三原ID。15个旧证据局在runs.jsonl逐项确认为已结束Silent，含本批10锚点与5个原有反例；按旧索引重核300条原始字节SHA，复用四有限窗口106端点及53转移。没有重开195/201/204全历史，也不相加重叠样本。

## 候选实现、经验与证据

源码提交：`2a62f327d508201d9982983ec2c930789065ece5`。经验提交：`51e0c1f475f842b355172f1f2a6f320cae9fb58d`。两个提交均不是当前live祖先。三原提案的共同机制/消费者作为一组重叠实现，避免另造模型；原Markdown和CLI ID不变。

| 改动 | 原帧/账本 | 可用范围和限制 |
| --- | --- | --- |
| traceSteps复用原play/resolveEffects，分列实付、手动、重放、实际入手与抽牌预算、已建/拟建和池离场 | L704TLETMZBM A10 F48第3试T3；silent-0194/0376 | 杂技付1结算两次、实抽3+2、挡6；下注九弃补27不是九套。未知抽入身份/选择/后缀保留unknown/null。 |
| 显式弃牌视图按同一手牌key移除 | 同上 | 新追踪发现旧回放保留了复制对象对应的原杂技，错误占一个手位，模型4张对原帧5张；修复后3+2相符。只在已有绷带弃牌模型分支启用，未改通用伤挡权重或其他角色规则。 |
| 战斗事实进入原brain/Jev criteria，单次规划缓存 | KV0JHNJCKXLS A10 F33第6试T1；silent-0248/0249。54G5683J0E5S A10 F33第1试T6/T7；silent-0141/0385 | 封抽保留5挡/+1能；54G T6三步法未施仍4敏、T7实付后7敏。未知夜魇后继不预支。 |
| rollout所选线→boss-sim→build比较→compact，成对样本保留身份 | 0376/0385/0021；KV0固定状态及原L704窗口 | 提供费用分布、各牌施放和首施放、有限具名组合计数；不是最早可达/无限/整局收益。跨两boss合并组合窗口保持未知。 |
| 首动作预测/实际自动提取与校准 | 原74决策审计及固定日志消费者 | 核来源/连续范围/角色/进阶/SL/指纹/实际采用；只抽首个完成出牌的能量/HP/挡，缺证排除。整场/药水/改线后缀尚未支持。 |
| 原general:deck条件指导 | silent-0021/0376/0385，三原提案链接 | experience 2026-10-11.16→2026-10-12.1，active数量/证据分母不增；只追加A10何时读什么量、如何识别不可用。check-experience退出0、missing=[]。详experience-diff.json。 |

原四签名保留。仅杂技/下注各一次实际弃牌且已建3绷带的具名分支可量化；一次重放不等多次手动，两个构件均须实付/合法兑现。其余三完整核心、其他弃牌分支、夜魇目标→副本归属和跨场重启仍缺完整后继，保持null。这是有限实现边界，不能以一个容易的两牌计数宣布原四核心消化完成。原4Y A7复制毒药新增21毒不能归领总54伤，未外推A10。

## 计算与验证

- 原抽象计算12方案×10000样本重新复现；294组同手枚举、6144组资源界穷举、6144个变化参数样本通过，math-verification.json与旧结果逐值相等。闭合见证和N−G反例保留于57项coverage；只有抽象模型含义，不写最佳牌数/无限打法。
- 固定真实帧：L704下注、KV0后空翻/肾上腺素、54G中和/步法，共5个动作端点；每个的能量/挡/HP均与原帧相符，共15量。另L704杂技3+2与6挡校验通过。源与输出见core-realization-observations.json、fixed-frame-replay.json。
- 在KV0实际封抽回合，保留/跳/从抽堆删除中和/增加同一已观察中和，每方案8个固定seed配对、相同策略预算，模型首轮伤均28，sd=0、meanSe=0、p10=p90=28，全部8 capped，0胜/0死。只支持本窗口无法区分；不证明下一轮或整战增删无收益，也未模拟金币价格。详fixed-paired-window.json。
- 撤掉combat接线、撤掉build capture、撤掉显式弃牌同key移除，三次固定消费者/原帧测试均退出1；恢复后通过。每次失败日志和回退材料均保留为.txt/.log。此前测试误用paired字段、真实4对5差异和tsx IPC沙箱失败也留档；Node --import tsx离线入口成功，不将环境限制当代码失败。
- 最终原`bash tools/test-sandbox.sh`退出0：生产tsc通过，threads 312文件3024例＋fork路径1文件11例，共3035例通过。`tests.cases=0`表示固定用例退出码，3035另列test_counts。没有扩大成沙箱外完整套件成功。
- 源码和经验两次提交前gitleaks staged扫描均退出0，无泄漏。没有新增依赖。

消费者调用覆盖详consumer-coverage.md；方法/契约在docs/core-realization.md，完整57项公式/表/反例/前提/精度/去向/触发条件在coverage.json和coverage.md。第一次合法施放按公开策略统计，不是全策略最早启动；结果分布与均值SE分开，胜局/截断/缺轨迹分母独立。

历史74条选择记录属于索引片段/旧dirty源码且早于新接口，extract-calibration返回0有效、74排除。固定历史回放不能改称当前版本前瞻校准；不发布bias/MAE/实际经验区间覆盖率。自然读取、采用与收益均未发生，effect-followup.json交原ops链等待发布后的新自然局，不启动play/额外模型题/新定时器。

## 合入阻塞与运维接续

预检live固定切点：`8b886744b23f59454d58c6bde7dc88d422041a03`。`git merge-tree --write-tree`退出1，完整原件merge-preflight.log；只写Git对象，没有改变任何live工作区、索引或HEAD。两源码候选的祖先检查均为false。知识经验文件预检前与live起点SHA一致；主要为main/live历史分歧和生产路径并行修改，不把工程冲突归为“缺新局”。

- CONFLICT (content): Merge conflict in agent/src/reflex/combat-plan.ts
- CONFLICT (content): Merge conflict in agent/src/reflex/turn-solver.ts
- CONFLICT (content): Merge conflict in eval/versions.json
- CONFLICT (modify/delete): notes/codex1-drain-ops-handoff.md deleted in 8b886744b23f59454d58c6bde7dc88d422041a03 and modified in HEAD.  Version HEAD of notes/codex1-drain-ops-handoff.md left in tree.
- CONFLICT (modify/delete): notes/core-cycle-quantitative-continuation-request.json deleted in 8b886744b23f59454d58c6bde7dc88d422041a03 and modified in HEAD.  Version HEAD of notes/core-cycle-quantitative-continuation-request.json left in tree.
- CONFLICT (modify/delete): notes/core-cycle-quantitative-learning-request.json deleted in 8b886744b23f59454d58c6bde7dc88d422041a03 and modified in HEAD.  Version HEAD of notes/core-cycle-quantitative-learning-request.json left in tree.
- CONFLICT (content): Merge conflict in notes/fix-queue-v4.md
- CONFLICT (content): Merge conflict in notes/for-roy.md
- CONFLICT (modify/delete): notes/legacy-integration-tests-request.json deleted in 8b886744b23f59454d58c6bde7dc88d422041a03 and modified in HEAD.  Version HEAD of notes/legacy-integration-tests-request.json left in tree.
- CONFLICT (content): Merge conflict in ops/inbox-dev.md
- CONFLICT (content): Merge conflict in paper/materials/decision-log.md
- CONFLICT (content): Merge conflict in paper/materials/learning/ledger.jsonl

请ops沿既有兜底流程协调这两个叶提交，保留live并行源码、刷新数据、原请求/旧done/失败和记录；实际集成后核精确源码、自测/宿主补验、唯一版本和双通知，再按范围登记提案/账本。不能直接把本分支携带的main历史覆盖到live。当前`merged=null`、没有eval版本、没有合后测试/双通知/shipped。本批未制造合入或发布成功。

四条账本0021/0376/0385/0194仅通过根ledger CLI追加候选/证据/提交位置，by=learner:strategy-proposal；本次增量proposed，保留旧已上线知识的历史shipped状态，不降级或冒称本次已shipped。原三提案处置逐项见result.json；全部waiting，先解决工程集成，剩余完整组合/校准/自然效果缺口分别保留。父请求parent_complete=false。

提案交运维：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-024317/learner/runs/20261012-024330-strategy-proposal/proposal.md。全部失败、初稿、输入、SHA、反例与中间材料留本scratch；当前分支HEAD=51e0c1f475f842b355172f1f2a6f320cae9fb58d，tracked/untracked工作树干净。

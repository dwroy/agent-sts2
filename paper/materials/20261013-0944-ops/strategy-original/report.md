# 本批策略提案处置报告

记录时间：2026-10-13T09:28:38+08:00（写入前已运行 date）。

本批十项全部 waiting：有证据确认局部机制与同轮血价，但尚不能证明完整生产消费者链或据此拟新选线参数。没有修改生产源码／知识，没有提交、合入live、发布版本或登记shipped。撤源码失败／恢复通过、tsc、vitest均未运行，报告 tests 为 null；证据算术不是生产测试。

## 身份、基线及范围

- task=strategy-proposal，character=silent，batch=20261013-091302-s2-strategy-proposal。
- 工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302-s2。
- 开工git status干净；HEAD及main均0c020b7cedfb9290cabe91bedb1038afdcacbd53；按普通批执行git merge --no-edit main，结果Already up to date。
- 根learn.json对应行reason=proposal、state=running，工作树／角色相符，proposal_ids精确为本报告十项；无research_request／implementation_request／proposal_repair。因此没有读取其他专题请求，也没有切换成纯研究或扩展到其他队列。
- 已读README、最新STATE-2026-10-12、decision-log末尾、learning-protocol和learning-code-proposals。没有派下级agent，没有调用LLM／网络／play，没有读取其他角色知识。
- 原提案十份Markdown均验原SHA，保存原件；限定30条本角色账本按ledger原生fold读取。当前静默经验版本2026-10-13.7只提取相关25项，不修改；其中原金刚杵→silent-0016映射与当前覆甲claim不一致，明确保留未知，不改原文或强行支持。

## 原始证据覆盖

| 局号 | 角色／进阶 | decisions | states | SL记录 | run-plans | 当前报告重点 |
|---|---|---:|---:|---:|---:|---|
| DUZUBAJ3A8GP | SILENT A10 | 602 | 623 | 6 | 6 | F27 T4—6火花／污染／技能收益 |
| 5PM6JAQG6FNQ | SILENT A10 | 638 | 660 | 7 | 7 | F38 T3—4电击；F39 T2／4—6抢夺返还 |
| CA5KE8GFJ9X2 | SILENT A10 | 265 | 282 | 0 | 2 | F13 T1—5加压、弱、覆甲与死亡 |
| 8JRE1C4H4Z2W | SILENT A10 | 659 | 676 | 7 | 6 | F33首／三试T2、第二试T5、末T11 |
| YF0LXT1QSTGG | SILENT A10 | 1065 | 1091 | 11 | 7 | F48第二／三试T1、末T3—5阶段与兑现 |
| XP2SL33HT0D9 | SILENT A10 | 712 | 730 | 7 | 5 | F33 T1／3同盘及末试T2—5 |

合计3941决策、4062状态、38SL记录、6配置、33计划＝8080原日志行，加runs.jsonl六行＝8086。每局所有决策observed_ts均匹配原状态observed_ts，未匹配0。SL记录数不是重打次数；整局均败且历史code带dirty，不能用当前源文件替代当局未知运行树。六局原复盘分段保存，没有追加／重写历史复盘。

`*-index.jsonl`保存原日志绝对偏移、原行长度／SHA；`evidence-manifest.json`保存采集边界及回连检查；`runs-confirmed.json`保存六局原角色／进阶／结束记录。状态从最早原复盘字节锚点前2MB开始，止于末局结束后10:14窗口；决策全部回连检查证明本批观测未因该边界遗漏。其他角色和其他局不纳入本批分析。

## 已核实结论及限制

- 四组同指纹当轮配对：沙虫首／三试T2实损3→15、净扣10→17；实验体第二／三试T1为0→9、45→38；双蟹首／第二试T3为9→14、24→27；首／末试T1为2→10、25→34。换线的实际血价不能被全败／封顶预测抹掉，仍无受控完整胜线证明新权重。
- 棱柱火花3→6、T5污染0／6／12／18及下一轮撤去；蚌力量0／4／8与喷水11／15／19、末弱14；电击2→4力／17→19攻且index4→3；失落退场后的−4→0力，敏捷同时有步法来源；实验体末零毒触媒2、23挡、实扣37；双蟹T2轮初14且零损、末敌153／125，均由固定原帧核对。
- 遗忘死亡返敏、混合属性来源返还、新旧同型召唤实例、原移动表冻结、跨抽弃牌完整执行、逐来源累计收益及资源恢复消费者链仍未被本批完整验证。阶段／召唤造成敌HP合计变化不能记伤害；死亡需损与剩余HP截断分列。
- 16项证据算术检查通过，记录在evidence-verification.json／.log；没有运行生产源码或借用旧测试成功。

## live源码核对

捕获live HEAD为3d83115fd3f74dc7a580c3f28cf7ecbb10283f03。16条相关源码路径的base／live原字节和SHA均保存：8份完全相同，8份仅Roy／Dai注释署名差异。该结论只覆盖这16路径，不表示整个工作树相同，也不改写旧dirty运行来源。

以下是现有子项的实际live祖先，merge-base已核；没有把任一提交作为本批新实现或将整包提案标duplicate：

- a8b1f8be153fe4f3a34146117546c2178f2e446b：候选选择／护栏／SL资源比较路径。
- bade647f9fe4c9103b40e2f26b26296692ad24b7：单动作selection_dispatch回执及loop调用。
- 05cd292c6f01bb31e406473d3a9843e659d62b93：候选持有失血参考，仍非实际全轮结果。
- 8698c581dac6c7e957f50a381586960a6d0c9b57：实验体当前帧组件／已建能力快照。
- 1d57f9d0dbbb63603e9ce9768e74cb2021478464：阶段结束参考。

selection_dispatch明确state_effect_verified=false、whole_plan_executed=null、actual_turn=null；selection_audit和SL comparison仍是候选预测；phase-current的已结算毒伤明确null。现有模型／字段是有限覆盖，不能认定完整执行、自然采用或策略收益。详见source-manifest.json及各.base.txt／.live.txt／.diff.txt。

## 十项最终处置

| 提案id后缀 | 证据／账本 | 状态与具体缺口 |
|---|---|---|
| c20b5139dd0dff71 | DUZU F27 T4—6；0168 | waiting：实际移动表冻结与火花成长／撤污染／弱毒挡联合消费者回放 |
| ae9e692d680e3819 | 5PM F39 T2／4—6；0183、0005 | waiting：遗忘死亡返敏、混合来源与稳定实例身份 |
| 52f1e1bd2e7db0ed | CA5 F13 T1—5；0231 | waiting：加压／弱／覆甲来源隔离回放，首样本／五门槛仅已有子项 |
| 6dd8bbff876be528 | 5PM F38 T3—4；0233、0209 | waiting：新旧同型召唤连续实例及计数／实际移动表验证 |
| 578e415a259e6835 | 8JRE F33 T2／5／11；原12账本 | waiting：跨重规划执行／逐来源能力／恢复链；原0016映射不一致 |
| c0767768bf6a7ab1 | YF F48 T1／5；0079 | waiting：完整执行归属／消费回读与独立受控后置验证 |
| a46bdb7fe711d79a | YF F48末T3—5；0021、0027、0028、0085 | waiting：分阶段持有／候选／施放／结算链和独立整战对照 |
| 1044224808015e5c | XP F33 T1／3；0079 | waiting：完整实际收益、成长净贡献与独立A10双蟹验证 |
| 7cbc6005db712ba9 | XP F33末T2—5；原7账本 | waiting：额外挡来源隔离／混合意图未知语义／联合消费者验证 |
| c59f592f1427a67e | YF F48／XP F33；原22账本 | waiting：二十经验逐项消费者、累计收益和SL资源恢复全链 |

完整旧行为／请求行为、反例、样本边界、验证和回退见proposal.md。code_proposals填这十个原CLI id，未另建id。implementation_domains沿本批涉及的combat／sl／structure；没有药水或终局规则实现。等待项保留待新局重派，量化／经验父要求不关闭。

## 保存的诊断与本批记录

初次仓库扫描与一次摘要启动遇bubblewrap构建期并行临时路径ENOENT；同权限重试成功，没有转为代码失败。初稿把状态ts用于observed_ts回连，误报大量缺观测；正式改按states.observed_ts，全部匹配0缺失，evidence-manifest.initial.json保留。首次结构查看对EVENT的combat=null取keys报错，后按真实combat对象查看；不称日志缺失。初轮轮次摘要以energy>0选入未就绪先手帧并遗漏GAME_OVER末轮，随后改为action_readiness和终态；原summary／script保留为.initial.txt，末轮未结算与阶段变化明确标记。首次注释分类遗漏/**前缀断言失败，正式逐字／逐变更行核对后为8份仅注释差异。详见diagnostics.md。

账本只经 `/home/dw/Projects/agent-sts2/learner/ledger.py update` 追加30条限定原账本的本批proposal／report链接及处置说明，by=learner:strategy-proposal；不修改claim／status／version，不倒记proposed／shipped，不直接改队列。CLI回执、追加核对和材料密钥扫描记录均保存在本目录。

实际原CLI物理行19394—19423逐项核为30条只链接更新，完整字段与原输入一致；没有因核验器失败再追加。前后fold另有silent-0020／0021／0046／0062／0065的并行evidence追加，原样保留，不算本批新证据或撤回它们。8080原日志行的绝对偏移／SHA及保存字节已逐项回读核对，全部一致，详见raw-byte-verification.json。

## 提交、测试、合入和交接

源码改动：无；fixes=[]；提交：无；merged=null；版本：无；shipped：未登记。撤源码失败／恢复通过：未运行；tsc／vitest／cases：均null。无需live合入／刷新／测试／发布锁，不运行play，不通知虚构上线。

报告绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302-s2/learner/runs/20261013-091321-strategy-proposal/report.md。
交运维的提案绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-091302-s2/learner/runs/20261013-091321-strategy-proposal/proposal.md。
最终逐项proposal_results和正常任务字段保存result.json，与最终JSON回报一致。工作树保持基线且git status干净；原日志只读，材料目录为原git忽略的learner/runs。

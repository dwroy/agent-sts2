# 静默策略批次核证回报

时间：2026-10-14T14:27:06+08:00。批次：20261014-141302-s2-strategy-proposal。基线：`4796b995789a09193b9b0bae8d3a0b03128210eb`。起始/结束HEAD相同，普通任务按要求merge main返回Already up to date，未承接research/implementation请求。根专题绑定另一批次，未读取其work_spec或输入。只消费本批十个proposal_ids，无proposal_repair，不扩领。

## 结论与交付

十项均waiting。已有首牌身份、普通生存者单弃、弃牌计划/快照、候选及单动作回执等源码子实现，均核为实际live祖先；本次未定位可由五局隔离的新模型缺陷。局部血价与输出有差异，但缺完整采用线、联合机制回放或受控后战证据，不拟新SL、药水、终局、路线或出牌权重。无源码/知识更改、提交、live合入、发布号、shipped或收益声明。

提案总稿：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-141302-s2/learner/runs/20261014-141326-strategy-proposal/proposal.md`。逐项账本、层/回合、证据、反例、验证和未实现原因见该稿；原十Markdown及其SHA映射见dispatch-and-proposals.json。以下结论只由本次五个已核silent A10局得出，不重算原提案中的全历史统计，不读取其他角色知识。

## 冻结证据

| 局号 | 状态 | 决策 | 终层 |
|---|---:|---:|---:|
| NHA2KW0RB7VP | 602 | 584 | 33 |
| P74C04AEPL1F | 410 | 395 | 23 |
| G33HU22H2543 | 879 | 850 | 48 |
| RC61MFQM63Y6 | 694 | 674 | 33 |
| BTSRF7JL1W1Y | 653 | 635 | 31 |

共3238状态、3138决策、31 SL、5 runs、5 run-config、26 run-plans行，合6443条。每条保存原行号、offset、字节数和SHA，并逐原日志位置读回相符；所有run行确认为SILENT/A10。历史code字段均为短提交+dirty，原值保留，当前源码不冒作原dirty执行树。SL与采样不是独立局，五局均失败也不是策略效果的因果结论。

原始副本为每局`*-states/decisions/sl-attempts/run-config/runs/run-plans.jsonl`；索引为`*-index.json`。raw-manifest.json保留初始抽取；run-plans-correction.json为追加纠正：初稿只按run_id取行，漏掉真实run字段，已重取26行并保留原零行index，不能称原计划日志缺失。

33项固定原帧/算术核验通过，详evidence-verification.json。显示攻击减挡、未来毒、实扣零血截断分别记录，不把算术参考当实际毛伤。初稿把精确切击ID写为SLICE，真实原帧为PRECISE_CUT；首次1项失败与脚本/输出完整保留为*.initial.txt，仅更正校验器标识，未改原帧、生产断言或游戏规则。

## 已有消费者读回

使用当前既有learner/audit-selection.ts，固定JSON输入，不读刷新知识、不接网络/LLM/游戏。四局完整输入返回0；P74完整输入返回1，因为原decision 278271是F11路线元记录、无decision_id。原失败stderr及全输入保留。随后仅排除该一行生成bounded_valid_ids输入，394动作仍保留原始行号，跨缺行区间不连接，返回0；这不是P74全量输入通过，也不是生产测试失败/修复。

| 局号 | 输入范围 | 动作 | 候选段 | 可见相邻端点 | 整轮端点 |
|---|---|---:|---:|---:|---:|
| NHA2KW0RB7VP | full | 584 | 105 | 160 | 20 |
| P74C04AEPL1F | bounded_valid_ids | 394 | 58 | 82 | 13 |
| G33HU22H2543 | full | 850 | 107 | 310 | 50 |
| RC61MFQM63Y6 | full | 674 | 135 | 242 | 29 |
| BTSRF7JL1W1Y | full | 635 | 98 | 238 | 36 |

合3137动作、503候选段、1032可见相邻端点和148整轮端点；其余2105相邻区间及364整轮窗口保持unknown。actual_full_candidate_result均null是消费者未认证完整方案，不代表已证没有方案完整执行。原候选、抽弃后重问、整轮净HP、实际动作回执不能拼成同一候选收益。consumer-results.json、consumer-summary.json及各输入/输出/stderr保留。

关键复核：NHA F33首末轮损1/7、净扣8/24以开场遗物之后起算；P74弃PRECISE_CUT后1血16挡仍死、卵剩2；RC两实际首轮线均喝格挡药、损4/8、扣敌30/23，其sl_explore.original是另一题面候选，不当首试实喝药分支；BTS抽弃前3轮与后5轮推演分开，末14血/5牌挡/1覆甲对22攻击，毒后甲虫13。没有用这些差额拟新通用参数。

## 已有live源码

核查时live HEAD：`4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac`。以下均为该实际HEAD祖先，source-audit.json保存完整身份与14叶base/live blob及物理SHA：

- 投斧首牌身份：e784dd9f043bf87c29109573f48975f9903280d3。
- 普通生存者单弃：bf423c173d3be348a4ad714e1d26516df619ff41。
- 弃牌计划事实：97efc0618936c6d7783fbf36e79b056b90d65589。
- 弃后手牌/单卡能量快照：4b0823f519f1b724d6cff2b1cd50b74146dc4a9d；源码明确不模拟后继伤/挡/血/胜负。
- 候选预测审计：be69855995737d6f381adb10bf248964832da24b；原/替线差额不等实际整轮。
- 离线执行审计：ac631877279c43842346ea921d996554e0252709（live集成6f3f783941270ac182237c46068097ff67e85907）。

14叶中9叶逐字节相同；5叶不同，差异patch保留，核其全部字节差异可由Roy/Dai名称替换解释，不修改这两树。祖先与局部字段不足以把十个综合提案标duplicate，亦不把上述旧提交计作本批fixes或新合入。

## 记录、验证与限制

本批只通过根ledger.py update追加既有账本的by/where/note追溯；不新建重复提案、不改变旧claim、status、证据、首证、prior、version，不标shipped。ledger-update-input.jsonl及CLI回执保留。既有ID列在result.json.code_proposals，不代表本次新增ID；implementation_domains=[]表示本次没有实现领域变更。

未改生产源码，所以未运行tsc、vitest、test-sandbox或撤源码红绿验证，三tests字段均null。33项固定材料检查及离线消费者返回值只作本批证据验证，不冒充这些生产检查。未提交/不推送；无需live锁、刷新知识提交、eval版本或实际上线双通知。结案不关闭学习父要求，也不声称经验已入库或大脑已采用。工作树scratch为忽略路径，结束时跟踪工作树应保持干净。

工具过程中两次bubblewrap扫描遭遇其他消失路径ENOENT及少量路径定位失败，后续在原沙箱同权限重试/定位成功；没有改凭据、权限、依赖或运行模型配置。平台未提供运行模型/推理强度切换及原生请求核验接口，本批不声称已切换到用户指定配置。

本次没有新机制反证或相反规则结论；已有提案本来保留的限制继续保留。后续等待新的静默独立完整战斗/同入口分支，以及逐候选执行与累计收益证据。回退无需操作生产；所有失败、初稿、日志和原Markdown保留，交原调度器处理。

逐项处置：

- `silent-proposal-9952ee8e8df9a0fe`：waiting；缺跨重问的完整采用线、累计能力收益及同条件后战/改路对照；局部多16输出多6血价不足校准SL门槛或终局血价。
- `silent-proposal-47be799a87af03be`：waiting；缺四个合法弃牌分支在弃后动态牌面、紧勒、失衡、毒和剩血的联合生产验收；快照不模拟这些结果，保留精确分支未实打，不能关闭整项。
- `silent-proposal-3a5274da3c42672a`：waiting；缺召唤/复活、一次翻倍、普通触媒及连续用药在同一冻结生产链的联合回放；主怪末次零血中间帧未获，不能据净差拟新药价或杀序。
- `silent-proposal-bc4b92d590f2c4ce`：waiting；首牌身份、弃牌计划提示与快照已有live子实现；缺完整候选执行归属、累计余像收益和动态弃牌分支验收，不能将综合提案标duplicate。
- `silent-proposal-f52fbbab4dccc3b4`：waiting；缺分源毛伤、复活增血与同条件路线/休息/SL/保药整战支线；赢战净耗和后战入口不确定新的血价或统一击杀顺序。
- `silent-proposal-10f37c0edd3d24a6`：waiting；既有局部机制不能代替所有来源在同一冻结生产链的联合回放；未知叠加与开场/回复/重载完整分账仍缺，不外推新公式。
- `silent-proposal-3f82387e2e179703`：waiting；缺累计毒/挡收益、完整执行身份及同抽序同预算整战对照；死亡饱和不能证明即时等价，也不足以改SL排序。
- `silent-proposal-aee21084c991abd3`：waiting；原选最优与后续重规划不是同条完整线；缺旧dirty执行树、逐样本抽序/移动模型和完整实际线联合回放，一条3/4线的一次死亡不足校准概率或权重。
- `silent-proposal-df37594e9b12debf`：waiting；唯一单弃只是子实现；缺跨重规划完整线、实际转向、累计能力与呼唤自损的联合消费者验证，不能关闭宽项或规定能力优先级。
- `silent-proposal-42e81c83b2e1e56b`：waiting；缺独立回复/药槽/存档事件账及同条件后战反事实；连续赢战、休息与boss入口不能确定路线或终局HP新参数。

机器回报保存为result.json；最终仍须校验实际HEAD、跟踪差异与全部原提案SHA。

最终验收（2026-10-14T14:28:56+08:00）：根ledger.py check退出0；本批32条CLI物理回执逐行SHA保存，旧账本前缀及关联条目的claim/status/evidence/first_run/prior/version均保持。gitleaks 8.30.1对本批scratch目录扫描退出0、无发现。全部十原Markdown SHA再次相符，HEAD仍为4796b995789a09193b9b0bae8d3a0b03128210eb、git status --porcelain为空。详final-verification.json、ledger-cli-physical-receipts.json、gitleaks.log/json及ledger-check.log。

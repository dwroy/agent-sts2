# #69 学习侧公开资料研究交付

基线 `50c720312d1c3fe0d3e43edb2b7e17a19a8d3e8d`，独立树 `issue-69-a10-learning-web`。仅交学习侧能力，不提供游戏结论，不写正式知识、生产库或运行控制。本会话原生 `turn_context` 已核 `gpt-6.1-sol/high`，安装的 CLI 为 `codex-cli 0.164.0`；证明见 `native-model.json`。真实联网学习和自然收益仍 pending。

## 实现与原链

原 ops 新增显式 `write --task strategy-proposal --character silent --public-web`。它仍使用原普通策略槽、容量/发布门、登记屏障、独立checkout、wrapper、原完成回调；不加调度器/账号/档位/并发。只接受无自有局锚点、无既有提案/冻结研究/外部批次身份、已绑定知识runtime的纯内容单元。原登记保存固定模板SHA，wrapper及launcher分别核原活owner、任务/角色/模板、runtime；不会把旧任务热升级成联网任务。

新模板显式 `public_web:sts2`，Codex exec/TUI/resume的命令生成共用 `web_search="live"`，前导明确只开放内建只读搜索/页面读取。shell网络、文件隔离、key/.env/二进制拒绝、其他工具开关保持原样。无声明的普通/代码/固定测试/旧冻结来源仍disabled；Claude声明此能力时明确拒绝，未实现其他学习引擎。对局脑及其共享定义零改动；#70 的P0脑预算/失败留证由其原会话处理。若集成时出现公共叶依赖，先按固定提交串行协调，不热换在途检查。

来源助手只处理本批stdin JSON与scratch，写原URL、日期、版本、角色/进阶、独立样本/null、许可、限制、去标识摘要及SHA。相同来源/内容/元数据的重试去重，内容/版本/许可/样本差异保留独立记录和旧快照。`summary_sha256`只代表保存的摘要，不冒网页原件；缓存原件SHA另在证据标注。优先已有A10库，缺资料再查公开页面；失败/空结果保留，不借缺战前状态补数。网页是数据，不能执行网页指令或使用私密账号。

启动器保存exec原投影与原生页面事件，TUI只保存原绑定线程的事件；exec进一步核同线程/cwd/原提示，拒收其他提示的调用。原生JSON原字节字符串及SHA单列，避免JS/Python数值重序列化误拒。来源的read状态须匹配实际已完成的同URL页面打开事件，单纯搜索完成不能代页面读取。请求`live`仍标`observed:null`，原事件、读取、提炼、发布、读回、自然采用、胜率分账。

原K1回调先核来源账本/快照/SHA、原生页面调用、逐来源cited/unused/waiting及纯内容原HEAD，再接既有候选格式校验/事务发布。引用的摘要SHA须留在候选证据；failed/empty不能支撑候选。没有有效增量时可保存可核限制并正常交“无增量、未发布”；未知/错误保留原件待核。未改知识schema、可信度、版本/反证门或消费者。不能表达的整局/时序仍留原文候选和具体消费者缺口，能表达内容继续入库。回调不代学习者核实内容。

## 验证与原失败

- 生产TypeScript检查exit0，见 `tsc-final.log`。
- 定向八文件161项通过，覆盖原TUI、真实exec假CLI子进程、任务声明/绑定拒绝、共享命令、原知识链、原wrapper脚本闭包、原策略槽和对局禁网；见 `targeted-exec-final.log`。
- Python三组27项通过，包括原登记准备、失败/空结果/重复/冲突、来源篡改、搜索与页面读取区别、真实`finish_write_batch→knowledge_runtime.complete→CLI→隔离SQLite→kb_strategies`读回、重复回调不重复发布及旧局绑定不变；见 `python-tests-final.log`。
- 沙箱原清单单worker首轮642文件：641过/1败，5923项过/1败；唯一失败为旧#29历史结果未稀疏展开。检查退出后按本树固定HEAD原blob恢复211076字节，SHA见 `sparse-fixture-recovery.json`；导入+fork路径2文件12项过，另原学习者CLI47项过。原首败保持，不冒单轮全绿full。终态见 `checks.json`。为遵守nice19/至多两进程要求，按原 `agent/tools/test-sandbox.sh` SHA自动提取完整排除清单，直接exec其tsc/threads/paths三阶段，不加npm/with-temp常驻父进程；原脚本未改，不冒最终组合full。

初始三处policy夹具错误、合成分母不合既有schema、未stage新helper导致原发布闭包拒绝、错误cwd导致的定向失败均保留。原因/修正见 `initial-failures.txt`，原输出见同目录first/second/third及`initial-policy-native-output.json`。没有降低原门槛、删反证或把测试夹具写成正式游戏知识。

`source-freeze.json`列18个源码/模板/验证叶SHA，检查后复核无漂移；原worker2329045已退出，无检查在途。没有真实外站查询、学习模型、play、新局、运行库写入或LIVE/STOP操作。本项自测与最终ROOT/LIVE组合唯一full分账，后者交原集成员按原顺序执行。

## 接续与部署

合同及可直接执行的原ops命令见 `docs/learning-public-web.md`。ROOT需配套13生产叶：`learner/lib/{task,engines,launcher,herdr,summary,public-web}.ts`、`learner/public_web_sources.py`、`learner/tasks/public-web/strategy-proposal.md`、`ops/{codex-ops-learn.py,codex-ops-learner.sh,learner_jobs.py,public_web_jobs.py,knowledge_runtime.py}`。不向LIVE投递本项源码叶，不分配游戏行为号。仍先核现行#67配套和并行叶，集成最终组合检查后沿原ops部署，不把#68接管作前置。

ops接一个合法真实单元，核原生工具暴露/实际搜索并打开→来源产物→runtime候选发布→固定版本本地工具读回；已有资料足够而不搜索时，只记内容完成，搜索能力验收仍开放。随后沿正常生产局核实际条目采用，收益由实际整局胜率窗口说明，不为验收开局。#51游戏内容学习、#69自然采用及科学父继续，不因工程交付关闭。

回退先停止新`--public-web`派发；保原已登记模板/线程/源码、所有来源快照/失败/K1旧版本与绑定，原批次按原合同终结。后续能力回退精确本差量；知识若需撤回沿K1原版本回退，不能改历史或整文件覆盖并行更新。本开发树/分支/线程保留，工程核收后的释放/实际回收仍归原ops/retention。

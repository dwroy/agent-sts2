# #76 回收积压工程交付

基线 `3f72590d1943914a254188b1763362bf1692d320`，独立树/分支 `issue-76-reclaim-backlog`。来源为 #76 正文及原 owner 对消费者用量日志事故的引用。只改过程存储，不改游戏知识、对局行为、学习权限或账号；不分配游戏发布号。实际安装、历史清理与 24h 效果由原集成/ops 接续。

## 实现及边界

- `learner_retention.storage_admission` 将成功 done 的可恢复 scratch 压缩与原验收分开。源码/经验/提案/父要求不被存储动作结算，checkout 仍沿原 `admission` 发布/owner 门；原 failed 回退批仍须原验收。done 报告没有 scratch 路径时，从原 out/err 引用的 launcher 流或原树流读取 task/cwd/params/batch 绑定；canonical 流可在 ROOT、scratch 可在原 checkout。不用时间戳猜归属。
- `retention_scratch.consumers` 先核 external/backfill 原退休证明及其他 TUI 原完成回执，枚举 batch/TUI/tab JSON 回执引用文件。用量 JSONL、日志、原生流及引用的大文件保留原路径且不进入新归档；引用 scratch 外树内文件时不删 checkout。回收预检使用原消费者新增的只读选项，不重写原 TUI 回执；默认其他调用保持原行为。消费者不兼容就整批保留、列原因与字节，不放松退休合同。
- 仍核宿主进程、cwd/程序引用、干净树、原 learner/checks 租约、learn/publication 锁；scratch 逐文件 SHA、tar 完整读回、删除前再次核文件集合/SHA。删除只针对已验证归档成员，小报告和脚本留原路径。旧 checkout-only 回执升级保留 `previous_manifest` 和原分支恢复身份；若 checkout 先被原 workspace 回收器接收，则绑定其原 manifest/SHA，并由原 workspace restore 先恢复完整现场，再恢复本批 scratch。
- 原 learning-request launcher 在输入/线程核验前按原 batch 自动 restore，并在原 learn 事务中进行；不跨账号或另起任务。restore 核归档、原分支、现存材料和容量，已恢复且未修改的副本可再次压缩；修改过的恢复材料保留。
- learner 单轮按 done 数动态扩至最多 128，至少处理一批后检查 50 秒预算，剩余项按原因计数后下轮重试。普通 ops/dev checkout 和缓存仍沿原最多四棵的门，不增 worker/计时器/模型。
- `refresh_retention` 与原 refresh/learn/publication 锁共用检查，published 和过额/过期 failed 仅留 receipt/stdout/stderr。failed 全量诊断保留最近 20 个且最长 7 天；原失败、原 receipt、步骤 stdout/stderr 不抹除。历史 published 同规则进入下一 sweep。清理只对已完成、绑定一致、无活动 owner/陌生链接的目录执行，记录 prepared/completed 文件身份及字节，不读取/重算或改写知识值。
- 汇总 `retained_summary` 按原因提供批数/字节，保留预算延期和未知字节项；同原因的共享未知范围只计一次。`backlog-trends.json` 保留连续不下降窗口，满 24h 且字节增加或磁盘可用 <150GB 时向原主管 inbox 写一行，持久去重；plan 不发告警。

## 检查与证据

最终检查结果见同目录 `validation.json`，八源码叶的基线 blob/当前 blob/SHA 见 `source-inputs.json`。生产 tsc=0；最终定向 16 文件/127 项、paths fork 1 文件/11 项、原生消费者 Python 37 项均通过。沙箱首轮 641 文件/5944 项通过、4 文件/4 项失败；三处旧存储合同断言及一处稀疏旧夹具已修正并全部定向复验，首败原件保留，不冒最终组合 full。原 stdout/stderr 保留在本树 `.log` 文件，不把沙箱排除结果称为实际生产组合 full。测试只使用临时仓库与固定数据；没有运行生产 sweep/refresh、对局或任何会话回收。

新增固定用例覆盖一轮 done 归档/恢复、原 launcher 输入恢复、实际 `retired`/`lane_owners`/`active_external` 回收前后保持空闲、回执引用大文件不归档、缺证明整批保留、旧 checkout-only 升级、超过四批吞吐、容量与 24h 原因告警、published 历史清理、failed 数量/年龄上限、活进程和软链接保留。旧源码/入库拒绝用例继续直接核原 `admission`，与新的 done 存储合同分账。

## 原集成/ops 部署与运行接管

源码闭包为八叶：`ops/learner_retention.py`、`ops/retention_scratch.py`、`ops/refresh_retention.py`、`ops/retention_metrics.py`、`ops/learning_requests.py`、`ops/learner_tui.py`、`ops/strategy_backfill_jobs.py`、`knowledge/builders/refresh-v6-history.py`。ROOT retention/learning-request 必须同组合安装。refresh 的 builders 以执行树 `__file__` 定位 ops 模块，实际 refresh 若从 LIVE 运行，须在该执行树同时安装此八叶闭包及既有依赖；不要只换 builder 或 worker。最终 ROOT/LIVE 前后像由原集成基于当时实际运行入口冻结并做适用组合检查；本开发没有写 main/live/STOP。测试和文档只进 ROOT。固定候选请求留本树 `ops/codex-ops/delivery-76-r1.json`，开发不 submit/安装或自启生产队列。

原 ops 记录实际 T/安装源码后，由下一原自然 retention tick 处理历史 published 和 done；不用手工删除或另派清理模型。首先核用量日志、TUI/退休证明及道位/worker 仍能读回，再记录新 done 和旧积压 manifest、refresh receipt/字节与磁盘采样。24h 后按 [T,T+24h) 核新 done 自然回收（安全门延期逐项解释）、refresh 中间字节停止增长和可用磁盘不再单调下降；固定绿不代这些验收。原 failed/未完成学习和科学父要求继续开放。

旧手工 `state=reclaimed` 回执保持原义，不扫描猜测/改写它们是否被旧工具局部恢复；如原 ops 确认原材料已经恢复但未登记，须沿原 batch 显式 restore 核 SHA 并登记 `restored`，之后自然重压缩。旧归档如含新消费者依赖或恢复后材料已改变，会保留并列原因，不以兼容推断删除日志。该限制与缺来源/锁忙等均应进入运行核收。

回退：关闭原 `CODEX_OPS_RETENTION` 可暂停 worker；沿原发布流程回退八叶源码差量，保留新/旧 manifest、归档、失败和趋势记录。原 batch 用 `learner_retention.py restore --batch <原ID>` 恢复，不能删归档来卸载功能；已删除的 refresh 中间文件是可重建产物，重建沿原冻结来源/正式发布记录，不回滚正式知识来卸载回收。

# #77 普通学习槽交付

基线 main `3f72590d1943914a254188b1763362bf1692d320`，独立分支/树 `issue-77-own-learning-slot`。范围按主管 [6410992461](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6410992461)：普通待审与计算分账，不扩槽、不替 #65 控制原会话。合同见 `docs/own-learning-admission.md`。

原 `own_busy` 将所有 `awaiting_review` 无条件计作占槽；新入口读取原监督/原生进程和绑定、原末回合、宿主前后台工作证据，证据齐且无在途工作才释放计算槽。状态、失败、rc、报告缺口、输入去重和原任务全部保持。自动普通准入、手工 writer、复盘和升阶审计共用判断；tick/write/status 及独立只读 CLI 列具体 blockers 和独立 pending_review。外部道位退休核验、发布/容量/工作树和审计文件锁继续有效。

五个生产叶（均为 ROOT/宿主，无 LIVE 游戏源码差量）：`ops/own_learning_slot.py`（新增）、`ops/external_learning_policy.py`、`ops/learner_jobs.py`、`ops/strategy_backfill_jobs.py`、`ops/codex-ops-learn.py`。须同组合安装，不能只换原 own_busy 调用叶漏新模块。新增固定测试 `ops/tests/test_own_learning_slot.py`；无新增依赖。集成队列适用检查应显式包含该新增模块和本项 Python 测试，源码映射/唯一 full 由原集成员冻结；开发未启队列或运行生产 tick。

## 固定与现场证据

- `own-slot-tests.log`：中间版本12项固定测试通过；最终版本另补已绑定 abort 的计算释放，失败和报告缺口不改。
- `final-python-tests.log`：最终174项通过，含新增13项占槽/宿主测试及原策略调度、学习流程、磁盘准入和发布门。覆盖固定末回合/deferral/任务去重、所有普通类型、活与复用 PID、缺证/半行/未提交/异源新 turn、在途工作、收尾崩溃重复投影、原 pane 缺席与空 shell、前后台命令/草稿/身份/独立测试，以及四外部道＋单自有槽。
- `strategy-tests.log`：原策略调度/外部/研究/实现/补链回归，111 项通过。
- `sandbox.log`：原沙箱入口，`SANDBOX_WORKERS=1`、nice19，生产 tsc0。首轮644文件中643过，5946项过/1项失败，唯一失败为稀疏检出未展开原 `paper/materials/issue29-brain-speed/results.jsonl` 导致 check-imports。`cold-fixture-recovery.json` 记录从固定 HEAD 恢复该原 blob（211076 bytes/SHA 8d83deb7…23ef），没有源码修改；`cold-fixture-recheck.log` 的导入＋脚本未及执行的 paths 两文件12项全部通过。首轮红日志不覆盖、不冒整轮重跑或宿主唯一 full。
- `validation-history.json`：首轮夹具漏 `at` 的失败与修正、误重复收集22项原 fixture 的历史保留；首轮只读投影错误地保留缺席 pane，后续修正支持已核原 pane 缺席，未改原现场。
- `read-only-admission-r2.json` 与 `read-only-admission-final.json`：第二轮及最终源码独立只读实际原件与宿主，结论一致；不是已安装或自然 tick 验收。各轮原 learn.json SHA 在结果中，前后核同；无 finish、模型、按键、seal、ACK 或生产状态写入。

七待审批全部继续保留：`20261025-024302-strategy-proposal`、`024302-s2-strategy-proposal`、`024302-fix-batch`、`031302-strategy-proposal`、`060422-strategy-proposal`、`071302`、`234303-strategy-proposal`（后六项同 `20261025-` 前缀）。本次原生末回合独核前六批通过，071302 实际原 TUI 带 `-postmortem` 后缀；不补造正式报告。

第二轮及最终只读投影中，前五个独立树批次 `occupies=false`，仍全部 `awaiting_review`。三个明确保留入口：

| 原批次 | 原因 | 后继责任 |
| --- | --- | --- |
| 20261025-234303-strategy-proposal / pFX | native PID 2498429、birth 36751471 仍相符且活；不因 UI idle 或原 supervisor 已退放行 | #65 原会话处置 owner；本项无停止动作 |
| 20261025-071302 | 原 supervisor/native 已退且末回合通过，但共享主根 cwd 的 detached 测试/写任务无法归属到本批 | 原 ops/完成回调 owner 沿原批补合法收尾；本项不忽略共享工作 |
| 20261022-031302-s2-strategy-proposal（旧终态，非七待审之一） | 旧数字 PID 1631705 当前存在，缺原 birth，不能证明当前进程仍是原 supervisor；明确身份未核 | 原 ops 沿原身份/日志核清；不杀当前 PID、不改旧 done 或捏造 birth |

因此现场投影 `busy=true`，不能报告普通新派发已恢复。部署后原 ops 沿自然入口读回 blockers、待审列表和实际新自有批次；原 external 道可独立继续，pFX 活身份和其他未知未清前仍保留普通准入。不为证明恢复另开学习或强 tick。完成/入库/科学父要求与槽位释放分账。

## 核收与回退

待原集成员按实际最新 ROOT/宿主组合完成唯一检查，原 ops 在自然事务退锁后安装五叶并核新模块导入、只读列表、原任务不重派及四道＋单普通槽实际回执。无需改 LIVE/STOP、账号、档位、学习权限或游戏发布号。回退仅反向五叶本项差量，保留原批次/失败/报告/原生日志、待审项与后继证据；不清状态或关闭科学父项。

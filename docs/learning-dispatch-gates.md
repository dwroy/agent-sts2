# 学习空派发的核查与恢复

`dispatched=null`、`write_jobs`全空且`backfill_hold=true`不能直接解释成没有任务或正在学习。先核原`ops/codex-ops/learn.out`对应tick、`learn.json`批次及原PID/birth，再核本节门禁；不调用另一个模型、清掉旧失败或绕过优先级。

1. 核`ops/STOP`及`ops/codex-ops/{PAUSE,LLM_DRAIN,ACCOUNT_DRAIN}`的真实位置、属主与来源。发布事务只能释放自己创建的门。磁盘与`/tmp`容量沿原`disk_admission`读回；大盘有余量不代表tmpfs有余量。
2. 对普通经验任务，核`learner_jobs.available_worktree(.worktrees/exp)`及原exp锁。`git status --porcelain`只要非空就不可派，包括失败合并留下的未跟踪文件。`priority_writer`会为可重试的正常任务保留优先权，即使实际因工作树不可用返回None；因此同一原exp阻塞可持续压住外部与回刷。
3. 原exp恢复必须在宿主取得原锁并确认无进程/在途批次；逐字归档失败残留，核三方合并与原经验SHA，再准备已集成基线。只处置本次已核的残留，不扩学习沙箱、不改共用账号或home。旧failed/rc0保留；基线准备不是经验入库。源码检查、知识数据漂移与固定消费者分别记账，不把非等价输入称为复用full。
4. 对外部来源，先核原启用计划、冻结输入及`strategy_external_jobs.ready`，再逐项列`priority_hold`原因。原正常复盘/修复优先、两个策略槽及真实heavy租约保持；`calibration_ready`或`ascension_audits.state=queued`只是需求标记，需另核前者专树是否存在且可用、后者是否已有该进阶结束局。缺专树或尚无证据的标记不等于实际派发。当前实现仍可能据这些标记持有外部优先门，必须交原代码owner修复可派性判定；不能手删需求或假写done来打开门。
5. 恢复后只沿原`codex-ops.sh tick learn`或下一原cron tick执行，不加轮询/新调度器。核真实batch、wrapper、pane/session/turn原生接受与输入绑定；`ready=true`或队列enabled不算已派，派出不算学习入库。

2026-10-24 #51 P1实例：exp的11个失败合并残留使available=false；宿主归档并合已测main后，原tick03:36实际派出`20261024-033643-experience-update`，原TUI为native-accepted。外部源已ready但仍未派；另发现校准专树缺失、A11审核queued但结束A11局为0，隔离的只读priority_hold探针仍返回true，不能据此关闭外部线。原件见`paper/materials/20261024-issue51-dispatch-p1-ops/`，状态变化和后续工程修复沿#51更新。

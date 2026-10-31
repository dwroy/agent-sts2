# 发布等待与候选学习（#57）

代码发布等当前对局自然结束时，使用 `ops/publication_gate.py` 的 `PUBLICATION_ADMISSION.json`，不再为这类等待新建 `LLM_DRAIN`。账号切换继续用原 `llm_handoff`；已有 PAUSE、ACCOUNT_DRAIN、旧或未知 LLM_DRAIN 不转换、不移除。此改动不自动部署或接管任何在途发布事务。

发布门绑定实际 root、owner、PID、Linux start-time、独占 token、`scope=next-game` 与 waiting/publishing 阶段。门存在即挡新局，包括损坏、软链接、死 owner 和 PID 复用；不自动删除陈旧门。`autoplay.sh` 保留 WAIT_PID 的原局等待和报告，`run.sh` 在任何游戏动作前登记原 shell PID/birth 的启动预留，broker 的 autoplay-start 也检查同一门。发布开始与启动预留在短 game-admission.lock 内串行，避免“已检查、尚未出现 play PID”的空窗。预留随原 shell exec 到控制器延续；原 PID 退出或 birth 改变才不占用。旧控制器仍由本实例进程检查保守挡写，不能靠缺少新预留推定空闲。

waiting 阶段只放行现有外部冻结候选链；普通复盘、经验、修复、专题、回刷可能写共享目录或 merge=live，保持延期。原磁盘、用量、道位、retry、原生退役与沙箱规则继续生效。publishing、死 owner、未知门及全局门阻止全部新学习。候选计算已开始的模型继续执行；不等待其退出才发布。

每个新外部批次在 learn.json 固定 `candidate_mode={schema:candidate-only-v1,merge:no,dispatch_base,worktree}`。wrapper 校验原绑定及实际 HEAD，显式传 merge=no，使用该固定工作树的 launcher 源码；launcher 拒绝覆盖成 live，把模式同时写入 learner_launch 和 external-launch 回执。原权限不变。旧外部批次缺模式时不能在发布等待中冒充候选，不补写其历史。输入仍按原 manifest/SHA 校验，输出仍在独立 worktree/scratch；报告 merged=null 不等于正式入库。

#56 注册组合依赖为冻结 `0d4a20c031b3f9663bc15d2b49a5efc019e604f9`：父事务在完整行（包括 candidate_mode）原子替换并 fsync 文件与目录后释放该 batch 屏障。ready、prepare、check-learner 和 entry 均使用同一个经路径校验的 registration_lock，不再重新等待父 learn.lock；没有批屏障的旧手动入口保持原全局屏障。新准入块不能写死全局锁，也不能通过加超时或跳过绑定校验处理。子进程读完整已发布行，原 entry/launcher 继续核原 PID/租约；后续批次的保存不改先前行。

finish 始终沿原流程保存终态、报告和来源处置；后续准入另判。waiting 的后续只可走候选 check_jobs，不派升阶、Boss 或其他 live writer；共享 ordinary_close 延至门释放后原 tick，定时 dataset snapshot 也延期。候选完成不关闭正式发布、消费者和科学父要求。open_book_refresh 会写忽略层，它独立受全局/发布门和写锁约束，不随候选豁免。

## 原 ops 发布事务如何接入

只在原运行根、由原发布 owner 执行。下列是接口示意，不能复制进开发树运行生产动作；保留原源码冻结、审查、版本编号、消费者核验和失败记录。

1. 在原发布 worker 的持久 shell 中调用 `begin --owner <事务ID> --pid <worker PID>`，保存返回的 token 和完整 marker 回执。owner 必须是存活的原 worker，不能用很快退出的 CLI 子进程。重复 begin 返回 held，保留旧门；不自动重建 owner。
2. **不持 learn/refresh/live 锁**等待原局自然终态并完成原报告。这段时间不创建 LLM_DRAIN。原 learn tick 可派新外部候选。
3. 原终态证据齐全后，通过 `write --owner <原ID> --pid <原PID> --token <原token> -- <原写入命令>` 执行已核准发布写事务。它先核本实例启动预留与旧 play，再非阻塞取得写锁。忙/未终局返回75，沿原 worker 保存阶段、稍后重试；不可持锁等待整局。
4. write 成功或失败都保留 publishing 门。失败留原错误/回滚回执；成功后核实际提交、编号、库与消费者，再 `release --owner ... --pid ... --token ...`。释放后仅原调度器自然续派/续局，不强制 tick，不用 STOP。

所有调用都带 `--root <实际运行根>`；使用自定义 runtime 时各方还须一致传 `--state-dir`。write 的命令继承原环境和权限，不能在其内部再次获取 learn.lock；它已持 refresh/live 锁，也不能再用另一个 flock 子进程重取同一锁。已有发布脚本须把原最外层 flock 拆到此入口，内部保留精确叶子检查、变更和回滚。本仓没有通用的自动代码 publisher；历史逐事务材料脚本不由开发会话改写或重跑，原 ops 在下一新事务接此入口。

交付必须包含 `publication_gate.py` 及引用它的三处开局入口、调度和 wrapper。脚本闭包自测检查 Git 索引中的待交付集合（新文件须先暂存，未跟踪文件不算），同时识别固定工作树的 launcher 路径；这不是实际已发布证明，部署仍核原提交及运行树。

写事务统一锁序为 learn.lock → game-admission.lock（需要时）→ knowledge-refresh.lock → live-merge.lock。全部非阻塞获取；获取失败释放已得锁。外部 dispatch 在原 learn 事务内取得后两锁，重读冻结来源、核 SHA 并记录不可变 main SHA；已 fsync 注册的 wrapper 在本 batch 屏障后，以 refresh→live 两锁非阻塞复核冻结输入，不再取 learn；没有持刷新/发布锁反向等 learn 的路径。实际 write/overlay I/O 前释放 learn/game 锁，只保留 refresh/live 串行锁。候选 launcher 从固定 tree 加载，发布改主检出时不混读启动代码。其他已在途 writer 继续受原专用锁与原权限约束，本门不接管它们。

## owner 异常与回退

owner 崩溃或 PID/birth 不符时，门继续挡新局和新学习。原 ops 核实原 worker、原事务及失败阶段后，以 marker 原字节的 SHA256 调用 `recover --owner <原ID> --expected-sha256 <原SHA> --pid <接续worker PID>`；仅原 owner 已退且 marker 未变才换新 PID/birth/token，阶段保留。损坏/未知 marker 不自动认领，留原件交原 owner 核实。旧 token 无法释放新 owner 的门。

回退前先由原 owner 结清/保存活动发布门，按原生产流程恢复这批源码。保留 marker、预留、批次绑定、失败与回执，不批量删除。若回退到不认识发布门的旧开局入口，必须由 ops 先建立原全局 LLM_DRAIN 保护，不能留下无人消费的门后继续发布。回退和源代码交付不代替上线后验收。

## 验收边界

固定回归包含三个开局入口、启动预留争用、候选与全局门、资源门、finish 分流、候选完成且 live 字节不变、源快照竞争/漂移、写锁互斥、learn 锁释放、open-book 延期、owner 崩溃/替换/释放。开发通过不等于生产采用。

上线后原 ops 记录 T、源码、owner/birth/token 对应回执、自然等待起止与原局号，读回等待期真实外部批次的登记、candidate_mode、原生消费及完成回执，并核发布完成前新局0、release后原调度自然续局。没有这一自然窗证据时，该项验收保持开放；不为制造验收启动模型、强制 tick 或开局。

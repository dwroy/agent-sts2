# #46 降低学习批次工作树分配量

开发基线 `2c23c7197d71d37ac5b330a0f4d844d1b14abc11`，独立 issue-46-task 工作树。交付实现与固定验证，实际发布及上线后 24 小时验收交集成员和 ops；本开发会话不操作 live、STOP、学习准入开关或其他会话。不更改游戏知识、学习提案结论、磁盘水位或回收门。

## 盘点与原因

固定窗口为北京时间 2026-10-22 07:17:29.331080 至 2026-10-23 07:17:29.331080。只读原运行根的分配回执：119 次 allocated，无无效回执，包含后来已回收的 checkout；不是当下存量或 issue 原始 128/天采样的同一窗口。原件投影 `baseline-allocations.json` 包含各回执名、时间、类别和基线；无账号或凭据。`traffic-replay.json` 保存学习状态、提案队列和 runs 原字节 SHA/长度及有界批次元数据。原日志、账本和运行记录仍保留在原实例。

| 任务 | 固定窗口分配/批次 | 实际写入及保留要求 | 本次处理 |
|---|---:|---|---|
| 复盘 | 8 批、0 新树 | 主根运行；仅复盘、账本/提案 CLI 和独立 scratch；不能把其他源码写入授权扩大 | 保持 |
| experience-update | 本窗口未新增树 | 常驻 exp，独占 writer；经验 JSON、提案链接、自测及发布 | 保持，不和其他 writer 共树 |
| 策略及二组 | 63 棵；其中 59 批派发前全部为 waiting | 每批可改源码/知识并测试发布，或无源码报告；每组独立树、learner/runs scratch、批次身份/租约 | 仅 waiting 重审聚合 |
| 普通修复 | 9 棵 | 源码/测试/发布，失败候选不能重置或跨批复用 | 保持 |
| 进阶审计、Boss/校准、专门研究 | 本窗口无新 allocator 分类；旧树/接续不算新分配 | 独立任务树或原线程绑定 cwd、冻结输入、scratch，部分允许源码发布 | 保持，不能按报告结果预判只读 |
| #27 策略学习 | 2 棵开发/冻结学习树，计入下行 issue 类 | 冻结任务仅写 strategy-entries.json、审计 sidecar 和原账本/提案 CLI，可提交/main 集成；live 由 ops 接续 | 保持，普通 waiting 门不接管 |
| 其他 issue / ops / integrator | 11 / 10 / 26 棵（issue 含上述 #27 两棵） | 开发、发布精确组合和原件保留 | 不在普通学习调度的减少范围 |

普通策略两组每批至多十项：原规则每有一局新数据便使大量 waiting 项再次 eligible，`proposal_dispatch.dispatch` 连续填两槽，wrapper 随即分配两棵树；本窗口 59 批均是已缺证提案重审。63 策略批中有 52 批记录 no_change_proposals；“52 无源码”是结果观测，不能用作下一批只读或可安全共享 cwd 的授权。

源码盘点依据：`ops/codex-ops-learn.py` 的复盘 dispatch、`ops/learner_jobs.py` 的 dispatch_write/requested_feature、`ops/proposal_dispatch.py` 的双槽领取、`ops/codex-ops-learner.sh` 的 fresh_tree/ascension 分配及 `learner/lib/launcher.ts` 的 scratch/Git 授权；任务边界核 `learner/tasks/{postmortem,experience-update,fix-batch,strategy-proposal,ascension-audit,v6-knowledge-publish}.md`。#27 独立冻结任务从基线 Git 的 `paper/materials/20261022-issue27-dispatch-ops/task-frozen.md` 读回，非普通策略模板。

## 采用方案与边界

在分配/启动之前聚合 waiting 复核：每角色每轮最多两批、各十项；上轮原 finished_count 新增 10 局或过 6 小时才能开下一轮，每项仍须原 count > seen_runs。优先新 pending，waiting 按最后处置时间从旧到新轮转。调用方原 learn.lock 串行保护水位及两组领取；原 busy、retryable、alive 与 disjoint claims 继续决定是否启动，只有实际取得启动 PID 才记轮次。第一轮最多两批，原失败候选和原批次不覆盖。时钟/计数倒退不打开门，损坏水位明确拒绝，不抹记录。进程已启动而随后失败仍占用本轮，避免失败连续制造新树。

新 pending、补链、显式 ops/研究/实现请求、原线程 continuation、复盘/经验/修复不经过此等待门。不把新提案混进 waiting 批中消耗轮次，不复用 writer 树；游戏学习和代码实现权限保持。waiting 队列可能跨日轮转，六小时不是单项最大等待时限；有紧急证据时可以沿原显式任务流程派发。部署后观测队列积压和实际自然复核，必要时由主管/ops 依据读回调整；本次不预设学习收益。

未采用“无源码任务只用 scratch / 同轮共树”：普通策略有源码修改与 live 合入授权，报告验收、无改动证明、普通收尾、通知、提案归属、retention 都绑定独立 Git cwd 与该树 scratch；事后无源码不能推定启动前只读。拆成只读筛查与另一个实现阶段需要明确的新任务合同，超出本次窄修。已结束批次的 wrapper 本来就请求原 retention；等待实际入库、检查、原 owner/进程/租约和归档读回的门继续保留，不借本次加速删除。

## 每日估算

固定窗口新结束 Silent run 行增量 31。按各原批次派发前的提案队列状态和原结束时间，重放本次门：59 个 waiting-only 分配机会保留 8、延期 51；其他流量保持，119 − 51 = **68 棵/天**（减少 42.9%）。复放入口 `nice -n 19 python3 paper/materials/20261023-issue46-allocation/replay.py`，只消费冻结元数据，不启动模型/派发/建树。按 issue 原 128/天且构成相同的比例外推约 **73 棵/天**，不是新的硬上限或实际发布读回。

此估算只重放原始派发机会，没有假装运行被延后的模型；后续补处理、pending 到达、故障恢复、每局时长及原 reviewer 并发都可能改变流量。waiting 不占槽时，原 strategy_job 的十复盘/升阶触发也可能获得此前被占用的槽位，不能把 68 当严格上线预测。减少的是缺证重审频率，代价是 waiting 的自动复核延后；不把仍待处理的 51 个分配机会算为已完成、不关闭提案或科学父要求。原 128/天与新窗口 119/天都保留，不偷换分母。

## 验证与交接

固定测试覆盖双槽独立树与互斥 ID、十局/六小时时间边界、无新证据不重跑、旧处置先轮转、pending/补链绕过、busy 不吃轮次、失败候选及活动 owner 保留、角色隔离、时钟/计数倒退及损坏水位；统计工具覆盖时区、半开窗口、失败分配、损坏/缺失原回执及只读不变。新测试 10 项、原并发 6 项、原周期无改动 4 项、原研究调度 30 项、原实现请求 11 项均通过，共 61 项 Python 定向。

生产 tsc 退出0。单 worker/nice19 的 `bash tools/test-sandbox.sh` 首轮退出1：610 文件/5471 项通过，仅 `check-imports.test.ts` 一项因稀疏基线缺少 `paper/materials/issue29-brain-speed/results.jsonl` 失败，1167.89秒；原 `sandbox-tests.log` 及其 SHA 保留，不改记整轮0。通过原 worktree_storage.py materialize 接口仅恢复基线2c23c719的原 blob `b84d95c5185941eec143cbcf2966d5770309cca5`（211076字节），HEAD/任务状态不变、没有源码修复或放宽检查。复验导入检查及新 Python 测试代理2文件/2项通过；补跑被首轮提前退出挡住的 paths 阶段1文件/11项通过。其余610文件沿首轮通过结果保留，不重复整套；`validation.json` 记录原命令、退出码、原件SHA与限制，`fixture-materialize.json` 记录实际基线和blob。两份检查 `.log` 原件本地忽略保留，交原回收器处理，不丢弃首败。

本次同源码的沙箱覆盖已逐项复验，**没有第二轮整套零失败回执**；最终精确集成树的宿主完整 tsc/vitest 仍交原集成员/ops 排队执行。原始启动时另有一次输出目录未建导致 shell 重定向失败，任何检查均未启动；修正目录后才有上面唯一首轮，未冒算失败为测试失败或成功。

集成员核本调度差量、代码/测试组合后按原发布顺序交 ops。ops 不热切在途学习者：原登记及 lease 不变，下一自然 tick 才使用新门。回退仅恢复 proposal_dispatch.py 本次调度差量，保留 proposal_rechecks 历史、提案账本、失败原件与全部源码/知识；统计工具可独立保留。纯学习调度无游戏行为发布，不登记 eval release_id。

**上线后 24 小时验收仍开放。** 由 ops 记录实际发布 SHA 与时间 T；T+24h 后在原运行根执行 worktree_allocation_report.py 的 [T,T+24h) 固定窗口，将完整 JSON 及流量/队列解释写 issue。目录缺失或损坏不能称零分配；报告不计 legacy 无回执树及 restore，单列它们。核全类别与策略类别、原对局量/新 pending/补链/专题/失败重试、等待轮次和积压，不能把暂停业务当减少分配收益。开发估算、交付或 review 不代替这项实际验收；不新增计时器、不启动模型、不关闭 #46。

# #68 第一批项目侧交付

本批依据 [68/6525568285](https://github.com/dwroy/agent-sts2/issues/68#issuecomment-6525568285) 与批准方案 665fde83，仅 K 保管/资源闭环。基线 main `39e48ce9d09248b86c0eec1bf2339c4b453ec253`，独立分支 `issue-68-k-custody-batch1`；原 665/f88 分支、历史失败及在途事务保留。

状态：项目准备，默认关闭；不是已采用。共享原 owner 的生命周期接口及完整新 pin 尚待交付：[kit#1/6525706107](https://github.com/dwroy/agent-board-kit/issues/1#issuecomment-6525706107)。本树不热补 51c，不改共享安装、原唯一入口/控制或在途事务。按 2026-10-31 [68/6539642223](https://github.com/dwroy/agent-sts2/issues/68#issuecomment-6539642223)，第一批继续接线和采用，DataSeal 暂停；随后 [86/6539967934](https://github.com/dwroy/agent-sts2/issues/86#issuecomment-6539967934) 批准 A 开工并明确现阶段不新做 CodeSeal，A 核收后再看补充。旧研究保留，旧的“一天后启动第二批”不再是自动开工依据。未夹带 CodeSeal/DataSeal 或 f88 数据例外。

## 项目实现

- K keeper 非阻塞取得原 K，SCM_RIGHTS 传同一 OFD；PID/start/boot、epoch/job/candidate、真实内核 FD 与持久回执核同后才装配/full.once。keeper 不继承三租约或 full 门。检查链高位 FD 传递 K/生命线；Node EOF 明确失败，监视器另开管道读端，原高位能力保留到 finalizer execve。
- full 实退归还计算资源，K 续持到 strict/失败。仅核到真实轻量 keeper 时不计 legacy；未知/活后继保门。
- R 登记先于机器准入/K。保管期间新请求 deferred/debt；旧未登记机器队列与 K 等待者 unknown，不能省略。仅精确普通 all/成本/漏斗、源/控制和命令未启动、无子进程/其他写锁，且 own lease/slot + wchan/内核箭头成立时自动 pidfd TERM；先记债务和意图，后核真退和租约释放。
- K 关闭/R 开放同一短 R 段；原 tick 新 ID 补 all→成本→漏斗，同覆盖范围普通请求合并，原 alias 保留。失败、未知 spawn/退出不收债；显式 cutoff/request/专题不由普通任务覆盖。
- publication 新批显式绑定 custody；原 owner/后继且真持 learn/game 才可借 K。部署子进程显式带 CPU/K/L/适用 D1 FD，记启动意图、原生身份、退出。strict 仍核受测视图、策略/工具/依赖、实际 LIVE bytes/mode/index/精确部署映射，沿原 #84 方法 CAS/持久事务/verify_release。
- 守护丢失遇原 publication 未结，清理保门。原 owner 仅可 installed-only 恢复原方法；活 keeper 借原 OFD，死 keeper 的修复 K 明记 continuous:false，批次仍失败，不重放部署 argv。原失败子回执保留；未知写体/意图不假定已退。
- 下载受管 other；integrator 优先级沿原机器协议。页对象/墓碑/游标提交后 yield（75/complete:false）；原 tick 从原 cursor 续，max-pages 仅续剩余额度，24h 无页进展去重通知原收件箱，不扩槽。

## 映射及科学边界

ROOT：新增适配/控制/strict/刷新债务/下载协作模块，原检查、publication/resource/report 窄接，以及离线 intake CLI。LIVE 逐叶映射仅 `knowledge/builders/refresh_driver.py`、`ops/refresh-costs.py`；原算法/参数/角色与统计 cadence 保持，不向游戏知识加规则。#67 运营入口不改。

队列策略保原六门、既有消费者、夹具和两个历史 skip，新增固定宿主回归。custody.enabled=false；51c 没有新生命周期能力，不可开关即用。未改主线/live、STOP、经验数据、生产队列/资源声明、账号/config 或进程/会话。

## 检查证据

真实内核测试包括：K 忙时拒绝装配/full，keeper 中断显式 failed-custody，Node EOF 退出及高位 FD→Python exec，放 K 前新等待者 TERM/先记债务/真退，未登记等待者保留；固定调度测试含新 ID/去旧 cycle、all→成本→漏斗、未知退出不收债、关闭不能绕未结 hold、页预算和 24h 通知；strict 测试含实际 Git ROOT/LIVE 映射、知识漂移/重绑拒绝；publication 子进程 K/L/CPU 真 FD 和失败 installed-only 恢复。

S1 早期 119 项适用回归通过，随后控制模块新增三项与旧五项共 8 项通过（不将重复部分相加）。离线 intake 73 项固定测试通过，包含整页/墓碑/同 cycle 游标恢复；测试全为固定夹具，无公网下载/生产 producer。

首轮旧安装夹具缺适配模块导致失败已修正；一次 publication 模块的 PYTHONPATH 入口错误保留；低位 FD 测试暴露 Node 包管道/exec 的问题，修正独立监视端并按实际高位合同复测通过。原始失败与后续通过日志逐件保留，不覆盖旧结果。

S1 固定源码检查点 `19fd9fd57`：生产 tsc 0；原单 worker 沙箱 655 文件中 652 通过/3 失败，6073 项中 6070 通过/3 失败，原日志保留。两份旧隔离夹具把当前 enabled 机器/队列配置拷进不带 pin 的极简安装，第三处是被稀疏排除的 HEAD 固定 JSONL；相关原配置/入口/夹具在 S1 与基线逐字节相同，见 s2-fixture-proof.json。现只在隔离夹具显式关闭无关 heavy/queue，仍保专门启用/缺 pin 拒绝用例；JSONL 按原 HEAD blob 物化，未改其内容。

S2 窄差量为四个项目模块及四份测试：补 K 实际路径 inode 检验、首次失败保留/EOF、终态幂等及实际采用历史保留；新作业须声明冻结 project_control_contract，旧作业不转换。短 R 忙的新请求先独占存 deferred 未获准意图，退 75，原 tick 核实未启动命令及实退后接回债务，避免同局统计同时到来丢请求。生产 tsc 0；原沙箱脚本定向 4 文件/5 项通过，随后含 paths 的 5 文件/16 项通过。最终宿主检查及源码冻结见 validation.json；S1 full 原件和 S2 差量分账，完整新 pin 组合的最终六门仍交原集成。

最终 S2 宿主 153 项全部通过；26 个改动源码/配置/测试逐 SHA 冻结并核开测后不变。S2 原沙箱脚本（含 tsc）最后一次定向检查全绿，日志 s2-targeted-final.log；前述两份旧夹具的 gate 缺 pin 与稀疏 JSONL 三红均有对应复测。最终新 pin 组合完整回归仍在联合核收待办中。

#84 的 13 个 producer、434 个输入逐字节对基线，声明亦一致，当前方法 SHA 留在 method-input-proof.json；没有方法热切或旧 D1 重算。原 installed 51c 的 14 个固定叶只读核同，见 old-kit-readonly-verification.json。新 pin/真实队列联合六门、原 tick protected/失败/重启恢复与实际采用仍须原 owner 联合核收，不能把项目自测代现场。

## 交共享原 owner / 原集成

1. 在原唯一 tick 提供受配置/源码冻结且有超时、失败关闭的 project control 钩子。新封批/分配前可 defer；full 结果后可 protected/await-adoption，三租约释放而 K 续持；custodian 丢失明记 failed-custody，活后继保 orphan cleanup，不重 full。
2. 项目原型 `board_queue_control.py --root ROOT before-seal|post-result|tick` 输出 `sts2-queue-control-v1` 决策及 epoch/job/candidate 证据。原型接口须与 owner 实交协议再绑定，不能靠 pin 元数据自称能力；新固定 manifest 显式声明 project_control_contracts，受信任 core 从冻结配置给新 job 写 project_control_contract。旧未声明作业不转换。
3. owner 接线时须逐批固定合同，校验事件与原 job/epoch/候选；采用/失败释放响应丢失须由原持久 outcome/terminal row 幂等恢复，不能二次 seal/full 或把旧 epoch 用到新批。项目接线按实交接口再冻结，当前尚不启用。
   还须接原 primary sync 的同 OFD 委托：51c 的 merge_queue.workspace_worker 现为 sync_lock(K)→mutation_lock(L) 独立 open/flock，开启 keeper 后会自等。不能仅加生命周期回调就开 custody，也不能先放 K 让 sync 再接回。请原 owner 给受冻结项目 source-lock provider/等价接口，传原 sync-job/authority 与真实 worker/resource 租约，让项目核同一批/原 writer 后借原 K，继续原 L、writer/queue 锁及原 CAS；不增第二 main writer。当前 publication 借用只覆盖原 publication owner 路线，原集成/active sync 的具体接线仍是联合待办，不能据组件自测冒完成。
4. 全模块新 pin 核同、项目 delta/精确 ROOT/LIVE 映射和适用检查齐后，沿原自然窗口核收第一批，实际运行及稳定性仍据真实回执核。第一批继续；DataSeal 按 68/6539642223 暂停，CodeSeal 按 86/6539967934 现阶段不新做，A 核收后再看，不因第一批满一天而启动。#56 优先、本批独立于 #56/#77 接续，不等可选 scanner。

原人工接力规则已在 `docs/board-merge-queue.md` 标“由自动保管取代”；新事务不保留两套并行方案，旧在途完成原合同。

2026-10-31 的 #86 原单与窄边界预核保存在 [本轮评审](../20261031-issue68-86-boundary/review.md)：迁移全闭环后代码发布的 K 职责“由入库取代”，当前在途 7ee 与原 K 保护不提前转换；#86 方案未到件时只交接口约束，不冒正式方案已审或同意实施。

随后 #86 已交固定方案 892d7768，[K 窄范围复核](../20261031-issue68-86-boundary/proposal-892d7768-review.md) 已完成：原则对齐，旧事务/补跑债务、A 期 B/C 只读闭集、两阶段 source-lock provider 三项随实施到件。主管 [86/6539967934](https://github.com/dwroy/agent-sts2/issues/86#issuecomment-6539967934) 已批 A 开工，并明确现阶段不新做 CodeSeal；DataSeal 仍暂停，A 核收后再看是否需要补充。本评审不增加审批轮，也不代第一批新 pin 接线或采用。

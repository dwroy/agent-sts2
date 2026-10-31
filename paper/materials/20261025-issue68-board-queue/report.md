# #68 项目适配工程交付

基线 `2a77c8400b9ac13e47b353b096cb3a2d3b0b44f3`。固定源码提交见本 issue 的交付评论及本树忽略产物 `ops/codex-ops/issue68-delivery.json`。本交付是待原集成核收的工程代码；未安装生产、未启真实 shadow/active、未合 main/live、未写 STOP/生产数据库/共享声明，不分配游戏发布号。

## 实现及固定安装

- 新 pin `51c289c573c59ac0c0b7ecda1d7ae035712927bd`，gitlink 独立差量 `f6ad61ec23e431d73cb507b84e458d2db936abb2`；完整10根模块/14叶指纹在 `.agents/board-kit-pin.json`。只从固定 Git 对象导出，拒绝缺叶、篡改、混装，不覆盖原安装。可选 scanner 不启用、不等待其采用，不宣称安装 native binary。
- `.agents/board.yaml` 仅新增默认关闭的 queue/heavy 配置，保原分钟入口、handoff/conversations shadow 和上限5。队列初始 shadow/integrator、单项即封批、零等待、一次尝试、不自动诊断，避免凑批和重跑。
- workspace 显式冻结 `third_party/jev-sts2=002e8739dd0f2625fc7bc859ccd4828de88416cf` 与检出前排除；不读/初始化/改第三方内容。原 K→L、容量最低预留和 Node provider 保持；大新冷快照在 materialize 前拒绝。
- 资源桥复用原 refresh_driver 钩子，补独立 statistics 的锁前准入、原 run.sh 两个最终 exec 的 game 身份声明，以及旧源码检查的锁前准入/FD继承。game不占heavy槽；已持位者核实际kernel FD/record/boot/祖先后复用，缺事实保unknown。bootstrap只由原ops在primary根显式发布本项目观察，未准备完成不初始化共享状态。
- 候选检查新入口建立隔离 W/G，冻结精确源码/实际LIVE前像、数据、依赖/工具、index stage/flags和内容树；三tsc、适用宿主/消费者和完整单worker Vitest按原合同执行。Node/fork三租约及full锁保留到同PID execve后继验证/标准回执，原非零/漂移/缺回执保留，不能把wrapper返回0当passed。
- 固定源码请求保完整head/ref、优先级、依赖和报告，不自动submit。纯数据的正式分类归#67，文件后缀只作明显错道保护。发布后主线记录另经同一authority的有界串行事务，保append历史及真实receipt绑定，不进入研发队列、不跑代码full。

使用、安装、实际shadow、旧writer撤权、active和回退的完整命令合同见 `docs/board-merge-queue.md`；交付入口补入 `docs/github-issues-workflow.md`。

## 验证及原失败

| 范围 | 实际结果 / 原件 |
| --- | --- |
| 最终生产tsc及沙箱 | tsc0；638文件/5900项全过，paths另1文件11过，exit0；`sandbox-final.log`、`sandbox-final-readback.json` |
| 运行核对 | 终态29冻结输入无漂移，原两个nice19 Node进程均实退；`selfcheck-final-inputs.json`、`final-check-processes.json` |
| 项目定向 | 53项过，含原minute及新增请求/资源/ROOT-LIVE/元数据；`project-targeted-new-pin.log` |
| 新pin差量 | 12项过，保旧拒绝、物化前排除/指针/初始化目录/中断恢复等；唯一夹具变更为读取已核旧导出，不改kit模块；`gitlink-test-derivation.json`、`gitlink-new-pin-fixed-tests.log` |
| 完整安装负例 | 14叶逐项缺失/修改及混装共29次拒绝，最后完整读回；`pin-leaf-matrix.json` |
| 真fork/FD | 子PID/start/boot与四FD inode核同、子登记完成/双方退出/四锁释放；`lease-ledger-readback.json` |
| 真exec/标准回执 | 三独立固定小作业：passed、原exit7→failed/unknown、原exit0且漂移→failed/environment；均同PID/start/boot，原full锁释放；`finalizer-readback.json` |
| 闭包补核 | 终态后仅补清单中漏列的已测 `learner_checks.py` 依赖，12个仓库顶层导入模块全部冻结；附该依赖被改后failed/environment的真实exec负例；`policy-import-closure.json`、`policy-closure-negative.json` |

沙箱有仓库原固定排除，不称无排除最终组合full。真实FD/回执探针使用合成结果，不能代STS2真实shadow、实际ROOT/LIVE组合、自然部署或收益。原集成新pin独核62项及独立002e8739小仓恢复沿 #68/6396281815 复用，不冒开发重跑62或套旧209。

首轮沙箱638文件632过6败、5900项5892过8败原件 `sandbox-first.log` 保留；其25输入未漂移。失败为启动夹具未复制新薄依赖、旧Path.open绕开原open mock、检查argv断言和稀疏缺叶；修正后9文件30项过，`repaired-suites-first.log`。冷fixture从原HEAD逐blob恢复，`import-fixture-restoration.json`。两次准备相对路径错误、一次新增测试插入位置错误及两例异步退出缺回执保留原件，未改为成功。重要原作业JSON复制到 `process-evidence/`，其余可重建夹具位于本树 `.cache/`。

最终沙箱终态之后没有执行代码修改；只有补闭包清单和交付文档/记录。主线/实际部署前仍须由原集成冻结该精确配置和届时ROOT/LIVE/67组合，按合同完成适用检查，不能把本开发沙箱套成最终组合绿。

## 精确归属与67接口

`delivery-map.json` 列源码/安装叶的旧blob、旧/新SHA和模式；本包 LIVE 安装叶为零，实际宿主/ROOT按原锁精确集成，不因路径叫ops就复制LIVE。kit安装另按14叶清单；原控制、registry、journal、uncertain、角色声明及运行pin均由原ops备份并保留。

- `learner_checks.py` 基于固定8d6e4b021的原执行体。只取首次检查argv和fallback外层source_lock/实际子检查FD的窄差量，保#67 read_report/finish/recheck的运营早返回，不整叶覆盖。fallback先准入，再进入原源码见证/pin/full/结果的完整L作用域。
- `run.sh` 两分支只加最外层 `python3 "$OPS/board_heavy.py" --root "$ROOT" game --`。与#67固定组合时，原 `"${data_launch[@]}"` 必须紧随 `game --`、再接原Node/npx argv；原game-admission/K1/D1/run和PID跨exec顺序保持。当前只核双方明确的窄接口，不冒67全包固定组合已经通过。
- #66分类先行，#60运行验收和#67运营通道不以本项为新前置。当前旧writer仍是合法入口，没有由本开发撤权或关闭任何会话。

## 原角色接续与回退

原集成接固定提交/完整pin/新增配置与53/12/29/进程原件，在66优先之后核实际组合及67窄hunk；原ops据已批三步在原tick备份并安装→实际项目shadow→原在途自然终态/实撤旧writer与重建入口/独占authority→新ID最新main重验active首批→deployed:false→原自然部署/编号/消费者独立读回。阶段条件已授权，不再次索同范围批准。

回退停本项目新提交，先核实际PID/FD/main/CAS/index/已成功receipt，再同事务撤authority/关闭队列消费/恢复唯一旧入口。保已交付main、journal和原失败，不靠回滚源码卸载调度器、不删活锁。已采用的游戏/资源声明桥继续保留，不能单方关掉它让其他参与者漏计游戏；完整资源协议迁移仍归原owner。工程及必要运行核收后按#59释放已核闲置UI，保原树/分支/线程/恢复与未完runtime父项，不在模型运行时删除本树。

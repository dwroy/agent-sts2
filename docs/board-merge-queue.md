# STS2 合并队列接入（#68）

本页是项目命令合同与切换手册。工程交付、真实 shadow、active/main 和实际部署分别验收。三步采用已经获批；满足前一步条件后，原负责人沿同一事务继续，不重复索要同范围批准。

本树 `dispatcher.merge_queue.enabled=true`、`dispatcher.heavy.enabled=true`，队列配置为 shadow、review owner=integrator；实际运行控制仍须原 owner 鲜核。新增第一批 `custody.enabled=false`，缺新固定 kit 生命周期接口时不得开启。原一分钟入口、五分钟 stall 委派、会话 handoff/conversations shadow 和 learner 生命周期保持。没有新 daemon、cron 或模型。#66 分类优先；#60/#67 纯知识、运营和固定方法的数据发布沿原 runtime 通道。

## 第一批自动 K 保管与资源闭环（2026-10-30）

批准：[68/6525568285](https://github.com/dwroy/agent-sts2/issues/68#issuecomment-6525568285)，方案 `665fde83`。第一批仅保管/排空/资源；CodeSeal/DataSeal 第二批在第一批**实际采用并跑稳一天后**才实施。本批 strict 仍逐字节拒绝任何无回执知识漂移，没有 f88 的数据例外。

旧人工接力规则 [77/6496035933](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6496035933)、[82/6511764132](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6511764132)、[82/6513930571](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6513930571) **由自动保管取代**。新合同中不保留“先放 K、ops 再追接、主管裁空窗”的并行路线；原未声明合同的在途批完成原事务，不热转换。

`board_queue_custody.py` 的 keeper 只收到握手 socket，自行非阻塞取得原 K，通过 SCM_RIGHTS 给原 worker 同一 OFD 的 K 与管道生命线。真实 PID/start/boot、fdinfo FLOCK、dev/inode、epoch/job/candidate 和 fsync 回执全部核同后，才装配及触及 full.once。K 忙/坏握手时 full=0；保管者退出的 EOF 终止实际 Node full，原 tick 读到 `failed-custody`，保 full.once、原检查结果和活后继的 cleanup 门，不能重 full。libuv 的监视器使用单独管道读端，原高位生命线 FD 保留到 finalizer execve。

新作业还必须由受信任的 kit 从冻结配置写入 `project_control_contract: sts2-queue-control-v1`，不能从 issue 自称、也不能给旧 job 补字段。开启后缺字段会在保管/full 前拒绝。K 的实际路径必须仍指向原 dev/inode；删除重建锁文件不会继承旧 FD 的证明，立即记失败并给 full EOF，原 OFD 保持到明确清理。首次失败不被后续观察改写。终态释放回执可重复读回，丢响应不再 seal/full；若实际采用已落回执而随后保管失效，旧采用事实按 SHA 留在 outcome-history，失败结算保链接，不擦除历史或复活失败。

full 后三租约与 full 门随实际计算后继退场；keeper 轻量续持 K 到 strict/失败结算。资源 probe 只对已核 worker/子账退场、真实 FD 对应且无计算租约的 keeper 免计，未知仍计 legacy。K 保管者没有 main 或数据写资格。

保管者丢失而原 publication 尚未结清时，失败清理保留 K/hold，先由原 owner 沿 `write --resume-fixed-methods` 核收已安装方法，禁止新的部署 argv。keeper 尚活时借原 OFD；keeper 已死时只允许原 learn/game/资源准入下非阻塞取得**失败修复用 K**，持久标 `continuous:false`，绝不恢复本批 passed/采用资格。原 strict 已入写体的还要核原受测/安装映射；未入写体的只结原 marker。保旧失败及子进程退出码，明确已完成的安装核收可绑定原失败子回执；未知 spawn intent、活写体、部分/漂移安装继续保原 owner。结算写 failed outcome 后才能自动排空。简单 off 不能绕过尚未结清的 hold。

刷新先经 `board_refresh_queue.py` 的 R 元数据登记，之后才机器准入和 K；所有三个新入口一起部署后才启用。保管期新请求只能记 deferred/debt，不入 heavy。放 K 前核全登记、实际内核等待者和租约实退；只对精确同 root/源 SHA/方法控制、无子进程/其他写锁、原命令未启动的普通 all/成本/漏斗自动 TERM。running 还须 own lease+slot、wchan 和原 K 等待箭头；显式 request/cutoff/专题及旧未登记等待者保留。先 fsync 意图/债务，pidfd 精确 TERM，下一原 tick 核真退和资源释放，不能把发信号当已取消。

新请求先以独占创建保存不执行的 deferred 意图，仅在 R 内获准后才转 queued。短 R 忙时返回 75，原 tick 对已实退且未启动原命令的意图收回补跑债务；自己的 request ID 不可覆盖。未获准的意图不申领 slot、不等 K；由此既不丢同局并发刷新，也不在释放屏障旁穿入计算。

K 最后关闭与 R 屏障开放在同一短 R 段，R 不包计算、网络、重任务准入或等待业务锁。采用/明确失败后，原 tick 以新 ID 依次补 all→成本→漏斗，同覆盖范围普通债务合并；原取消 alias 保留，原失败/未知回执不收债，不重放不明 spawn。显式任务仍归原 owner，不用普通补跑替代其截止线。没有另一个 timer。

排空同时只读原机器内核租约：未登记且尚未到 K 的本项目旧 other/刷新 claim 也算 unknown，不能只看 K 等待箭头。已登记 deferred 若仍握自己的 slot/lease，须等真退；原下载明确另账。保管期新登记仅写债务，不申请 slot。

strict/部署继续原 `learn → game-admission → 借本批 K → L → D1` 非阻塞顺序。publication `begin --custody-record` 显式固定原批；keeper 验原 publication owner/子进程身份与 learn/game 真锁后才委托 K，borrower 不再 open/flock K。原 #84 prepare→部署/安装核验→方法 CAS→持久事务→verify_release 保持；新写体子进程显式继承 CPU/K/L/适用 D1 FD。受测 W/G、策略/工具/依赖和实际 LIVE 前像在部署前 strict；部署后逐字节、mode、index 和精确 runtime map 核同，方法核收后记 custody-outcome，再排空并放 K。未知或部分部署保原事务，resume-fixed-methods 沿原已部署恢复，不重放部署 argv。

离线下载经受管 other 入口，机器现有 integrator>other 优先级不改容量。每页对象/墓碑/游标全部持久化后才读高优先级请求；yield 返回 75 与 complete:false，关闭原下载/CPU 租约。原 tick 从原 cursor 恢复；带 max-pages 的请求只续剩余页数，不重置预算。优先级事实未知也在页边界保留。24h 无页推进去重写原 dev 收件箱，请主管排期，不扩槽、不停对局。

共享原 owner 的接口请求见 [kit#1/6525706107](https://github.com/dwroy/agent-board-kit/issues/1#issuecomment-6525706107)。项目控制模块仅提供 `before-seal/post-result/tick` 决策原型（allow/defer/protected/failed-custody/settled）；须原 owner 用受冻结/有超时的钩子接入原唯一 tick、暂停新 seal、保 protected 终态及 orphan cleanup，并交完整新 pin 后联合核收。51c 无此能力，不能仅把 enabled 改 true。新 pin 的 `project_control_contracts` 必须显式包含 `sts2-queue-control-v1`，具体通用接口以 owner 交付核对绑定后为准；当前项目代码不是已完成现场采用。

回退先停新合同的 seal/刷新准入，核原 worker/borrower/后继和真实 FD、publication/#84、K 与债务到明确终态，再于原自然边界关闭 custody。不能直接 off 绕开未结 hold，不能删锁/回执或退回人工竞抢。默认 off 只表示尚未采用，不清旧事务或父项。

## 固定引擎与安装

旧审核来源是 agent-board-kit 实现 `13f2378c48e8798c63f752def32415714849db82` / 交付 `1437a5cfa6e9f66e881d18e55bd82bb3c0850f93`，不是通用 main。`.agents/board-kit-pin.json` 列完整根模块及文档的 SHA256。导出只读固定 Git 对象，先核全部 bytes，再创建全新的暂存目录；不会覆盖现有安装：

```bash
nice -n 19 python3 ops/board_queue_pin.py export --source "$KIT_SOURCE" --directory .cache/kit-staged
nice -n 19 python3 ops/board_queue_pin.py verify --directory .cache/kit-staged
```

本次最小绑定采用完整源码 pin `51c289c573c59ac0c0b7ecda1d7ae035712927bd`（gitlink独立差量 `f6ad61ec23e431d73cb507b84e458d2db936abb2`），共10个根Python模块；新增 scanner_adapter 按同pin保存，不启用可选scanner链、不等待其采用，也不宣称安装native扫描器。

原 ops 先保存旧安装全部文件/权限、board/control/registry、journal、uncertain、运行 pins、当前入口和原生恢复身份。在原唯一 tick 自然无在途调用的窗口停新消费、安装完整同 pin 模块，再逐文件 verify。启用队列后的每次原 `agent_board.py` 入口及 set-enabled on 都复核完整 pin，混装或缺文件保留动作。disabled 时兼容旧 kit，不要求其已有新模块。

**旧 pin 的 gitlink 阻碍原件保留**：`queue_workspace.entries()` 在容量排除之前拒绝 STS2 已有 `third_party/jev-sts2` 的 kind=commit。原固定拒绝及独立复现见 #68/6395788884、#1/6395764432；修复归共享原 owner，项目不热补。原主管已交 #1/6395858899，要求未变 gitlink 只作冻结元数据，变更/新增/移动/删除仍拒绝，不读/初始化/改第三方内容。新固定pin已交共享原owner/主管链，原集成差量独核到齐前不启动真实项目shadow。项目显式绑定 `third_party/jev-sts2=002e8739dd0f2625fc7bc859ccd4828de88416cf` 与 third_party 排除，保原初始化目录及所有第三方内容不读不改。旧209项不能冒新版或 STS2 项目验收。

## 资源桥与迁移声明

`ops/board_heavy.py` 只接原机器协议，disabled 时 exec 原命令，不创建共享状态。`queued_argv(root, role, argv)` 在原业务锁前构造薄入口；实际队列 worker/后继检查用真实 request/slot 内核 FD、record/boot/PID-start/祖先核验去重，不接受一个环境标志代替租约。新 claim 若当前任务/祖先已持 learn/game-admission/K/L 则拒绝并保留，交原无锁 source-check owner 接续，不能持锁等槽。

接线范围：

| 入口 | 顺序 |
| --- | --- |
| 原 refresh_driver.queue_command | 复用已有 queued_argv 钩子，准入后才进入刷新锁 |
| report.background_statistics | 准入 → ionice → flock -F knowledge-refresh → 原统计；不留额外 flock wrapper |
| run.sh 的 runtime/旧两个最终 exec | 原 game-admission/K/run 绑定 → game 桥 → 原 argv；与 #67 组合时保留 data_launch 前缀 |
| learner_checks 初次源码 full | 准入 → 唯一 integrator-full-check → 原 L → 原检查 |
| learner_checks fallback | source_lock 先申领/复用位，再进入原 L 核源码见证/pin/full/结果，保原完整作用域 |
| 新候选检查 | kit 已申领资源 → 原唯一 full 门 → 短 K/L 快照 → 三 tsc/宿主/消费者/完整回归；不再申领自己已有的位 |

`ops/board_resources.py --root ROOT` 是只读 probe。它只读本项目原 game-admissions、明确登记的 legacy PID/start/boot 与本项目 full/refresh 内核锁 owner；锁等待者不计执行槽，父子去重。读取失败、坏身份、缺迁移声明都是 unknown/拒绝，不能报空闲。不扫描/认领另一项目，也不把两款游戏互相当开局门；game 不占 heavy 槽，容量仍为原运行1/无游戏2。

原 ops 在自然边界鲜核后，准备忽略文件 `ops/codex-ops/board-resource-bindings.json`：

```json
{
  "schema": "sts2-board-resource-bindings-v1",
  "root": "/实际主运行根",
  "owner": "ops",
  "boot_id": "本机实际boot ID",
  "complete": true,
  "inventory_sha256": "本次已核完整盘点的SHA256",
  "legacy": [{"pid": 123, "start": "实际start ticks", "boot_id": "同boot", "role": "integrator", "task": "#N"}]
}
```

示例数字不是运行声明。原 ops 保存当前游戏、旧检查、刷新及等待者原身份，完整核本项目旧重任务入口之后才签 complete；重启/坏声明重核。选择原双方已批准的同一 machine_state，不扩容量。先发布本项目当前 game/legacy 事实，再放行未来新 claim；当前局/旧任务不重包、不重启、不重新提交。开发不写生产声明。原ops安装完整pin、在board中填入已批准的绝对machine_state且准入仍false后，先执行下述bootstrap；它验证primary根、完整事实和pin，仅读取本项目probe并发布本项目观察，不切heavy开关、不占位：

```bash
nice -n 19 python3 ops/board_resources.py --root "$ROOT"
nice -n 19 python3 ops/board_resources.py --root "$ROOT" --publish
```

原ops独核真实共享观察中的本项目game/legacy后，才放行未来新claim。未知事实不初始化共享状态。

## 固定交付与请求

纯知识/运营数据不进入研发队列。生成工具要求完整固定 SHA、保留分支仍指向该 SHA，并确认相对 main 有实际可执行源码差量；只有提案/报告/JSON 的请求拒绝交 runtime：

```bash
nice -n 19 python3 ops/board_queue_request.py --id issue-N-r1 --issue N \
  --head FULL_SHA --head-ref refs/heads/RETAINED_BRANCH --priority 1 \
  --report '固定交付及证据指针' --output ops/codex-ops/delivery-N-r1.json
nice -n 19 python3 ops/codex-ops/agent-board-kit/merge_queue.py submit \
  --root "$ROOT" --request "$ROOT/ops/codex-ops/delivery-N-r1.json"
```

`--depends` 可重复提供独立请求 ID。生成工具不 submit、不改标签/分支/main。相同文件幂等，不覆盖不同请求；同 ID 改交付须沿 kit 的显式 `--revision`，撤回沿 kit `withdraw --id ID --revision N`。重复提交、失败/撤回的旧 ID 不隐式重启。每次 head/ref、main、策略/kit/依赖/数据或 revision 变化使旧结果失效。

首批显式 `max_batch=1`、`seal_seconds=0`、`max_attempts=1`、`max_diagnostics=0`，及时处理清楚的小交付，不为凑批拖住 #66。通用依赖等待不阻独立任务。需要扩大批次或自动诊断时，原负责人先冻结新策略及资源/适用检查，不能把旧绿转用到新组合。

## 候选分配、映射和检查

`.agents/queue-workspace.json` 固定 K→L 原锁顺序，使用原项目1GiB/1024 inode最低预留。原 kit 候选先资源准入、对象级合并、no-checkout，再写自身排除 profile、首次检出；不全展开再删。项目 admission 复用 disk_capacity，并核已有 Node provider/锁。冷历史目录按 Git 元数据列为字面排除，保顶层 materials Markdown/learning；新冷材料最多4MiB，超界在首次检出前拒绝，先更新冻结排除策略。没有自动清理、npm install 或放宽容量。

`.agents/queue-checks.json` 是受信任的项目检查策略，不从 issue/body 执行命令。当前默认仅适用宿主/ROOT交付；`runtime_install_paths` 逐叶显式列出，任何未映射的游戏/CLI能力差量拒绝，不因路径叫 ops 自动装 LIVE。实际交付必须给 ROOT、宿主、LIVE、ROOT-only 的来源 blob/前后像/模式及回退映射。对新增 CLI/SQL/ToolDef 能力，原集成补齐真实消费者命令后冻结，不保留空的适用检查。

`ops/board_queue_checks.py` 读取原 `MAS_QUEUE_JOB`，验证三原租约及精确 candidate。它在本批目录建立 W/G 隔离视图，均先 no-checkout/profile 后首次检出；W源码来自 candidate，G从实际LIVE及其真实已存在文件逐SHA快照，按该候选补丁应用精确部署叶，冲突保留。当前数据基线在独立视图冻结，不改原 candidate、实际ROOT/LIVE、生产库或运行pins。必要冷夹具显式 materialize；保留隔离树和原件，不交普通 retention 自动清冷夹具。

实际Node/Python/Git可执行文件路径、inode和字节同样冻结；测试子环境清除原生产角色/LIVE/K1/D1选择，保留原资源FD。Node包和可用的原DuckDB Python环境均核锁/requirements，使用已安装依赖的验证链接，冻结实际文件/realpath/device/inode。检查前后核 W/G HEAD、内容树、index stage/flags、文件/权限及依赖输入，并核实际数据前像与策略/kit；原main或LIVE/数据推进会失效，不覆盖运行内容。

固定阶段为 ROOT生产tsc、ROOT知识runtime tsc、G生产tsc、适用宿主Python、显式消费者、W完整Vitest。真实命令沿 `project-check-contract.md`（SHA314525e7…7767）；完整回归为 forks、单worker、无文件并行、60秒testTimeout和default+JSON reporter。沙箱排除结果不冒完整回归。默认只允许原65已核的两个未初始化上游参考测试 skip，不新增跳过以过关。

预检 Python在进入宿主测试前 exec 为 W自己的检查入口；完整回归再 exec 为实际Node runner。三租约及 full 锁移到高位FD以避开IPC fd3，并经Node spawn/fork转发；实际子PID/start/boot、继承FD inode及退出写本作业子进程清单。退出时使用本机已核Node execve将同一PID/start/boot接续为校验器，保相同FD；核子进程退出、冻结和JSON后调用 kit.complete_check；缺/坏/非零/信号/漂移不发 passed。`full.once` 防止不明返回重复执行；实际Node启动才计项目 full_runs=1，通用kit的adapter调用数与实际游戏full分列。等待资源、旧失败和恢复不抹除。

## 同一 main authority 下的发布记录

active 后源码 main 只由 queue authority 推进。原 ops 仍负责实际LIVE发布/编号/纯K-D事务；main记录必须走同一 writer 的串行元数据事务，不能另留人工记录源码 writer，也不能持K/L等待队列。

`ops/board_queue_records.py` 仅接实际发布后的四类记录叶：versions、decision-log、for-roy、inbox-dev。先完成实际发布/编号并保存原receipt，释放发布锁，再用保留分支上的单一元数据提交请求；不提交到研发合并队列，不跑代码full。请求绑定epoch、expected main、固定head/ref、实际receipt路径/SHA/live_commit/release_id。只接受原历史保留的append；版本旧条目顺序/字段不改，新条目必须与实际部署绑定，源码/正式知识或其他未知路径拒绝。

原ops必须先在保留的独立记录分支准备元数据，不能沿旧入口先改脏ROOT对应叶；后继行为发布在该receipt的主线记录完成前暂缓编号，防止从尚未更新的版本表重复分号。只暂缓该源码发布续接，不持K/L等待，不阻游戏和纯K/D发布。原调用点的实际撤权/改接与这项顺序证明仍是active前置，不能据工具存在声称已迁移。

原 authority有效且source batch排空后，该工具按 K→L→common writer→原queue.lock顺序串行，复用固定kit的primary sync/CAS/intent与恢复代码。没有第二main写资格。保留部署receipt并先只读补齐已成功状态；部分同步/并发main/epoch或ref变化保留，不stash/clean/reset、不重放已完成部署。

```bash
nice -n 19 python3 ops/board_queue_records.py --root "$ROOT" \
  --request "$ROOT/ops/codex-ops/main-record-request.json"
```

这是受支持的元数据入口，不是同账号任意手敲Git的OS隔离。原集成/ops须在同一切换事务明确撤销旧人工main资格及一次性脚本/旧提醒/恢复自动入口；未实证禁用的旧写链继续列为active缺口。

## 三阶段现场核收及回退

1. 工程：原集成核固定pin、完整模块、项目差量、ROOT/LIVE/宿主映射与适用最终组合。原65旧full仅作旧闭包证据，不能覆盖本次代码；#66优先，不抢其唯一检查。
2. 真实shadow：原ops备份后在原唯一tick安装新pin和项目适配，先核可信资源声明再开shadow，保旧review/main唯一writer，不自动部署。选当时尚未合main的实际小交付，核候选真实检查、资源等候、次数/耗时、重启/重复事件不重复执行、head/main/策略失效和独立请求前进，证明实际main/index未由队列写。影子绿不是已合入。
3. active：同一事务暂停新入队，保游戏和runtime学习，让原检查/发布自然终态。保存旧writer/reminder/watchdog/重建、原生身份/日志/恢复及所有在途；实撤旧写资格、证明无双写后写与repo/root/config/基线绑定的独占authority。切active+merge-queue review owner，以新ID和最新main重新检查首真实批次；核main/index/工作区与受测candidate及保留指纹，出deployed:false。原ops沿自然边界实际部署/编号/消费者独立读回后，再按#59释放已核闲置旧入口，保树/分支/原件和未完科学父项。

回退先停新提交，核真实PID/start/boot、FD/租约、main/CAS/index及publication，补齐已成功回执；再于同一事务撤queue authority、关闭队列消费、恢复唯一旧入口。已交付main与journal保留，不回滚源码来卸载调度器，不删活锁/未知状态，不重放已入写体。项目控制off/PAUSE/LLM_DRAIN及原分钟/会话观察合同保持；旧#20科学/观察待办不因本项通过全部关闭。

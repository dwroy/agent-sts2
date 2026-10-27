# STS2 合并队列接入（#68）

本页是项目命令合同与切换手册。工程交付、真实 shadow、active/main 和实际部署分别验收。三步采用已经获批；满足前一步条件后，原负责人沿同一事务继续，不重复索要同范围批准。

本树默认 `dispatcher.merge_queue.enabled=false`、`dispatcher.heavy.enabled=false`，队列配置为 shadow、review owner=integrator。原一分钟入口、五分钟 stall 委派、会话 handoff/conversations shadow 和 learner 生命周期保持。没有新 daemon、cron 或模型。#66 分类优先；#60/#67 纯知识、运营和固定方法的数据发布沿原 runtime 通道。

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

实际Node/Python/Git可执行文件路径、inode和字节同样冻结；测试子环境清除原生产角色/LIVE/K1/D1选择，保留原资源FD。Node包和可用的原DuckDB Python环境均核锁/requirements，使用已安装依赖的验证链接，冻结实际文件/realpath/device/inode。检查前后核 W/G HEAD、内容树、index stage/flags、文件/权限及依赖输入，并核实际数据前像与策略/kit；原main、严格源码/夹具或未声明的数据推进会失效，不覆盖运行内容。LIVE自然刷新按下节的明确映射补验。

固定阶段为 ROOT生产tsc、ROOT知识runtime tsc、G生产tsc、适用宿主Python、显式消费者、W完整Vitest。真实命令沿 `project-check-contract.md`（SHA314525e7…7767）；完整回归为 forks、单worker、无文件并行、60秒testTimeout和default+JSON reporter。沙箱排除结果不冒完整回归。默认只允许原65已核的两个未初始化上游参考测试 skip，不新增跳过以过关。

预检 Python在进入宿主测试前 exec 为 W自己的检查入口；完整回归再 exec 为实际Node runner。三租约及 full 锁移到高位FD以避开IPC fd3，并经Node spawn/fork转发；实际子PID/start/boot、继承FD inode及退出写本作业子进程清单。退出时使用本机已核Node execve将同一PID/start/boot接续为校验器，保相同FD；核子进程退出、冻结和JSON后调用 kit.complete_check；缺/坏/非零/信号/漂移不发 passed。`full.once` 防止不明返回重复执行；实际Node启动才计项目 full_runs=1，通用kit的adapter调用数与实际游戏full分列。等待资源、旧失败和恢复不抹除。

### LIVE自然刷新补验（#68 / 6431568413）

`.agents/queue-checks.json` 的 `natural_refresh` 声明精确路径模式及其受影响检查ID。只有已冻结进本次assembly的声明生效；旧作业没有该声明时继续严格拒绝，不能套新策略补旧六绿。配置变更本身仍使旧policy失效。采用新字段时保留原集成针对实际候选冻结的runtime映射/fixtures/host/consumers，不能用开发树整叶覆盖当前组合合同。

源码、两视图夹具、依赖、工具、ROOT数据前像以及LIVE的HEAD/tree/index entries/flags仍严格冻结。实际LIVE只允许声明中的既存普通数据文件内容漂移，权限/类型/新增/删除仍拒绝；与全部候选目标（不只是LIVE安装叶）相交也拒绝。未声明路径、缺候选目标集合、未知或空的检查映射均写原因并拒绝。当前声明覆盖已核刷新驱动的catalog/公共统计及片段、角色统计/history与monster-db-check报告，不包含经验、手写策略或builder代码。

`verify_after` 为新数据创建本批独立的 `refresh-revalidation/<id>/validation-live`，仍沿原容量/no-checkout/排除先于检出合同。从原受测G复制精确源码/其他输入，仅覆盖已经核过的新数据；不修改原W/G、candidate或旧assembly。依声明只运行受影响的有界前台消费者或显式单worker测试文件，不调用full、tick、submit或发布。默认消费者从该隔离LIVE导入原catalog/renderer、角色monster records和适用construction/history读取器，对新字节实际读回；不根据数据猜游戏结论或提升证据等级。报告文本只核UTF-8读取，不冒业务采用。

补验前后再次核严格输入，期间再刷新或补验改写输入仍拒绝。每次留下路径前后SHA/模式、候选/基线、选定检查、实际argv/PID/start/boot/继承FD及退出/日志、严格门最终结果；`full_runs=0`明确指本次补验。原完整检查次数与结果不改写。同一实际数据和完整未变的补验视图可复用原回执；新数据另建证据，不重full。失败和旧视图保留，回收沿原owner/retention门。

发布前回调的原owner须在进入K/L前取得合法机器租约，补验只验证并继承已有FD，不在业务锁内等位。没有合法资源继承时写明原因拒绝，交无锁原owner续接；开发不自行申领生产状态。原发布锁域仍负责补验后到实际写体的稳定性/CAS，不以本函数的瞬时核验代替发布锁。#80原3e43的临时新冻结/一次full沿主管授权独立执行，不被这份永久机制追改或重放。

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

# 运维会话跑在 codex 上（调度器 + 一个可续的 codex 会话）

2026-10-12 切换复查补强：Herdr 因参数变化重建空闲 ops 时，同时核 shell 已返回和旧 agent 名称已释放；短暂 `agent_name_taken` 仅在再次确认 pane 空闲、名称明确不存在后有界重试（默认10秒）。持续占用、其他会话出现或查询异常均保留事件并返回75，不强杀或重复投递。学习者的 key 隔离预检只对“bubblewrap构建阶段、rg明确ENOENT、探针没有stdout”的瞬态失败重试一次；使用完全相同权限/文件清单和原总超时预算，首次错误写入startupRetry回执。凭据可读、权限拒绝、超时或第二次失败仍拒绝启动，不扩大沙箱权限。

2026-10-12 Roy 授权主 ops 使用宿主权限：`ops/codex-ops/execution-mode` 写 `host` 后，下一次空闲唤醒在原 pane、同一账号/session 以 `--sandbox danger-full-access` 重建 TUI；`approval_policy=never` 保持。缺省或 `sandbox` 保留原隔离。环境 `CODEX_OPS_EXECUTION` 可显式覆盖，非法值拒绝启动。只有主 ops 的 init/resume/Herdr 路径读取此设置；学习者、辅助和游戏大脑不继承权限变更。host 模式不再宣称 OS 阻止读取凭据，仍执行不读取/输出 key、仅修改本仓库的项目规则。原 broker 继续可用。

恢复被中断循环遗漏的局末报告可用 `bash ops/codex-ops-do.sh report-run <12位局号>`（host ops 也可直接运行 `nice -n 19 python3 ops/report_run.py <局号>`）。入口拒绝活跃 play/autoplay/report、不同或未结束的 mod 局、LLM_DRAIN/PAUSE；与 autoplay-start 共用锁。冻结该局原段与恢复段全部日志行，记录原文件 SHA/字节范围和 console 历史代码，再调用原 report 实现及角色刷新。成功后同局重复请求返回已有回执，不再记账、刷新或派发；中途已经登记但刷新失败时保留 partial 现场，不能盲目再跑。回执 `ops/codex-ops/report-runs/<局号>/receipt.json` 区分报告、主刷新退出码、后台参考/费用刷新与校准派发，不把后台启动写成已完成。

2026-10-10 按 main 核对：本页的初次搭建、历史探针及资源测量保留当时口径；当前以调度器代码、learn.json、租约和完成回执为准。Codex Fast 在直接启动、resume、herdr 与学习者 wrapper 中显式设置，见 [codex-fast.md](codex-fast.md)。文档同步不修改 ops-session prompt 或运行中的进程。

Roy 2026-10-04 21:00 定：Claude 只观察和与 Roy 对话，不修改或审核；codex 学习者自行实现、自测、合入，运维 codex 确认上线和提交兜底；运维会话改用 codex（gpt-6.1-sol，强度 xhigh，和学习者一样）。codex 没有会话内的定时任务（原来的 Claude 运维 prompt 靠 CronCreate），所以拆成两半：

- **调度器**（`ops/codex-ops.sh`，cron 或一个 setsid 的 bash 循环）：做所有机械的活，只在需要判断时叫醒 codex。
- **运维 codex 会话**：只建一次（第一轮 = `ops/ops-session-silent-codex-prompt.md`），以后每次叫醒都是 `codex exec resume <会话 id>`，消息是调度器攒下的事件。会话 id 在 `ops/codex-ops/session-id`。

prompt 的内容沿用 Roy 批准的 `ops/ops-session-silent-prompt.md`，只改了运行方式（定时任务 → 事件；通知开发会话 → 收件箱；沙箱外的操作 → 调度器的动作）。

## 怎么启动和停

```bash
cd ~/Projects/agent-sts2
bash ops/codex-ops.sh start          # 预检（codex 能用、ops 权限配置挡住 key 文件），装 cron 块，后台建会话
bash ops/codex-ops.sh start --loop   # 不用 crontab：同样的时间表由一个 setsid 的 bash 循环跑（PID 在 ops/codex-ops/loop.pid）
bash ops/codex-ops.sh status         # 调度器、会话大小/上下文/压缩次数、队列、正在跑的叫醒、复盘批次、日志末尾
bash ops/codex-ops.sh wake "<话>"    # 开发会话或 Roy 给运维会话留话（manual 事件），马上叫醒（后台；--fg 前台等）
bash ops/codex-ops.sh pause|unpause  # 暂停：tick 和叫醒都不做
bash ops/codex-ops.sh stop [--now]   # 去掉 cron 块 / 停循环；--now 再按 PID 停掉正在跑的叫醒。会话 id 保留，下次 start 接着用
```

**cron 还是循环**：默认 cron。cron 由系统服务跑，不依赖任何会话或终端，机器重启后自己恢复（这时 autoplay 也没了，第一次卡死检查会叫醒运维会话去重启对局，正是它该做的）；循环和 autoplay 一样是 setsid 的 bash，WSL 关掉或重启就没了，要再 `start --loop`。systemd --user 不用：这台机器没开 linger，最后一个登录会话退出时 user 服务会停。改 crontab 在 Claude 的 auto 模式里会被当成「持久化」拦下（2026-10-04 实测），所以 `start` 要由 Roy 运行或授权；不方便时用 `--loop`。

## 时间表（调度器做什么、什么时候叫醒 codex）

| 时间 | 调度器自己做 | 叫醒 codex（事件） |
|---|---|---|
| 每 5 分钟 | `ops/stall-check.sh` | 输出 STALL → `stall`（带完整输出）。同一原因（去掉数字后相同）第一次之后隔 10、20、40、80 分钟、之后每 2 小时再叫一次；OK 了就清掉 |
| 每小时 13、43 分 | `ops/codex-ops-learn.py tick`：① runs.jsonl 里静默猎手的胜局不在 ops/win-notified 里的，写进去；② 这个角色最新的 run-config 进阶比上次见到的高；③ 已结束、没有 `## <id>` 复盘、没派过的局，派一批学习者（最多 5 局，同一时间一批），`learner/run.ts --engine codex --task postmortem --character silent`；④ `experience-pending.py` 有 ≥1 局就派 experience-update（同时一批，迟到的并入下一批）；⑤ accepted 未上线提案或未关闭修复队列派 fix-batch（同时一批）；两类一律 merge=live，忙或脏的工作树不派 | ① → `victory`；② → `ascension-up`（第一次见到只记下，不叫）；③ 的批次跑完 → `learner-done`（退出码、已有/还缺的复盘、每局的学习账本条目和没有条目的局、回报文件）；④/⑤ 完成发 `experience-done` / `fix-done`，已合入的批次在沙箱外完整检查后发 `learner-checks` |
| 每天 4:07 | `ops/paper_dataset.py`（完整版，含 `paper/data/learning-curve-<角色>.csv`）；codex 记录替换 key 后复制到 paper/materials/session/codex/（运维会话的 rollout 和 wakes、学习者的 learner/runs/*.jsonl 和它们的 codex rollout；ops/codex/archive.ts，按 MANIFEST.json 只复制变了的），再用 gitleaks 扫一遍（比上次多就在收件箱写一行，不叫醒运维）；decision-log 记一行 | 失败时 `snapshot-failed` |
| 随时 | — | `ops/codex-ops.sh wake "<话>"` → `manual` |

学习者跑在调度器这边（沙箱外）：它自己的 codex 要联网，运维会话的沙箱里跑不了。失败批次 1 小时后重派，最多 3 次。经验与修复任务在各自工作树自测通过后自行合入 live，不另设审核。调度器用 learn.lock 串行更新批次状态，按内容去重；收到完成事件后，运维确认实际合入、机械同步 main 和上线账本。学习者提交或合入受阻时运维兜底。

当前学习派发还包括策略提案队列、升阶结构审计、逐角色 boss 自动批次及明确授权专题。`ops/learner_jobs.py` 的 `STRATEGY_WORKERS=2` 允许两路策略消费者，各自独立工作树和租约，提案领取按 id/key 去重；learn.lock 状态事务、live 合入及外部检查仍串行。有待并复盘即可派经验更新，自动策略复核另按升阶或新增 10 局完成复盘触发。代码提案结果、补链、waiting 与失败保留原记录；合入受阻由运维核实际产物兜底，不把 rc0 或排队当成上线。参见 [学习者](../learner/README.md)、[提案闭环](learning-code-proposals.md)。

学习者的沙箱检查用 `bash agent/tools/test-sandbox.sh`（在 agent/ 可用 `bash tools/test-sandbox.sh`）。排除名单与原因固定在脚本里；实际合入 live 后，调度器在沙箱外、live-merge.lock 内跑完整 tsc + vitest。失败写收件箱并发送 learner-checks，运维决定回滚还是派修复；调度器不自动回滚。

## 叫醒（ops/codex/main.ts wake）

- 事件是 `ops/codex-ops/queue/<纳秒时间>-<类型>.md`，一次叫醒把队列里的全部事件按时间编号成一条消息。成功后事件移到 `delivered/`；失败（退出码非 0、turn 失败、超时）事件留在队列，下一个 tick 重试；连续 3 次失败在收件箱写一行。
- 串行：`flock ops/codex-ops/wake.lock`，同一时间只有一个叫醒；叫醒期间新来的事件，这次叫醒结束后接着发（一次最多连发 5 轮）。
- 每次叫醒前：codex 启动检查（版本、登录、模型和强度）+ key 隔离自检（`codex sandbox -P ops` 打开每个 key 文件，打得开就不叫醒，exit 3）。
- 超时 120 分钟（`CODEX_OPS_WAKE_TIMEOUT_MIN`），按进程组停。登录被拒时让 codex 刷新一次令牌，事件留到下次。
- 记录：每次叫醒的完整事件流在 `ops/codex-ops/wakes/<时间>-wake.jsonl`（第一行是命令和消息），一行摘要进 `wakes.jsonl`（token、上下文大小、压缩次数、最后的回答），调度器日志 `scheduler.log`。写完都做 key 扫描替换。运行时目录 `ops/codex-ops/` 不进 git。

### 会话会长多大、会不会压缩

- 每次 resume 都把整段历史发给模型。当前默认 GPT-6.1 Sol / xhigh / normal，显式配置窗口 512000、自动压缩阈值 460800；CLI 预留空间后的有效窗口可能更低，配置不能证明服务端的最大能力。
- 实测（2026-10-04，测试会话，强度 low）：第一轮（只有测试 prompt）上下文 10.5k token；一次带 4 个动作调用的叫醒后 11.8k。正式 prompt 加 AGENTS.md 和开工要读的文档，第一轮估计在 5–8 万；一次普通叫醒（看回报、记 decision-log、提交）增加几千到两万。按每天十来次叫醒，几天到一周会碰到压缩线。
- `bash ops/codex-ops.sh status` 显示当前上下文、窗口、压缩次数和本周额度用量（从 codex 自己的会话文件读）。压缩会丢细节，所以要紧的状态都写在文件里（decision-log、fix-queue、收件箱、ops/codex-ops/learn.json），不靠会话记忆。

## 权限（codex 的权限配置 "ops"）

照学习者的写任务配置（learner/lib/engines.ts `codexPermissions`，Roy 2026-10-04 批准的做法），名字叫 `ops`（`-c default_permissions="ops"`），每次叫醒都重新传（codex 不把它存在会话里）：

- 全部可读；可写：项目根（主检出，含 .worktrees/step、live）、/tmp 和 codex 的临时目录；不联网。
- 读不到：~/.jev_api_keys、~/.deepseek_api_key、~/.sts2-jev-env*、~/.codex/auth.json、项目里所有 .env / *.env（glob + 磁盘上找到的每个的绝对路径）。
- ops 额外的（ops/codex/lib.ts `opsExtraRules`）：主检出的 `.git` 可写（codex 默认把可写根里的 .git 设成只读，git 提交会报 index.lock Read-only file system）；`.git/hooks` 和 `.git/config` 只读。Roy 2026-10-05 08:37 授权运维和学习者修改调度器及 broker 文件，main e601de00 已去掉这些文件的只读规则；key、所有 .env 和 codex 登录令牌仍不可读。

实测（2026-10-04，`tsx ops/codex/main.ts probe <脚本>` 在 ops 配置下跑 shell）：key 文件和 live 的 .env 读不到；项目根、ops/、live 工作树可写，~ 不可写；git 在工作树里提交成功（加 .git 规则之前失败）；hooks、config、调度器文件写不了；tsc、vitest、python 读日志都能跑；gitleaks 在。沙箱有自己的 PID 命名空间（看不到外面的进程，kill 不到）、不联网（127.0.0.1:8080 也连不上，curl exit 7）、调不了 Windows 程序（cmd.exe 报 UtilBindVsockAnyPort）；嵌套的 codex（学习者）因为不联网也跑不了。

所以沙箱外的事走**动作**：模型运行 `bash ops/codex-ops-do.sh <动作> [参数]`，它在 `ops/codex-ops/broker/` 放一个请求文件；叫醒进程（node，在沙箱外）里的 broker 每 0.5 秒看一次，按白名单校验（`ACTIONS`：动作名、参数个数、参数只能是 PID 或逗号分隔的局号），再运行 `ops/codex-ops-actions.sh <动作> [参数]`（每个动作自己再查一遍参数），把输出和退出码写回。broker 只在叫醒期间存在。

| 动作 | 做什么 |
|---|---|
| ops-assist <request-id> / ops-assist-status | 主 ops 显式派最多2个并发只读辅助 session，或查回执/回收死PID；固定请求/证据、Herdr托管和失败原件，结果回原事件queue，所有修改/合入仍主ops处理。见 [辅助任务模板和边界](ops-assist.md) |
| procs / stall-check / mod-state | 我们的进程（pgrep）/ ops/stall-check.sh / mod 的 GET /state |
| autoplay-start | prompt 的开工步骤：有残留的 autoplay / stop-after / 对局就拒绝；删 ops/STOP；setsid nohup ops/autoplay.sh；打印 PID 和 live 的提交号 |
| autoplay-reload <旧 autoplay PID> <当前 play PID> | 核对属主、精确脚本路径、进程身份和 autoplay.pid；有 report.py、stop-after 或重复进程时拒绝。暂时暂停旧循环，启动带 WAIT_PID 的独立新循环，确认就绪再终止旧循环；确认前失败恢复旧循环。回执给新 PID、ops/live 提交和脚本 SHA256；不停止 play、不改 STOP，不改变 hosting 配置 |
| autoplay-stop / play-stop / kill <PID> | 停 autoplay-start 起的 autoplay（先核对命令行）/ ops/stop.sh / 按 PID 停我们自己的 autoplay、stop-after、对局、report.py、学习者（核对属主和命令行） |
| launch-game | 记忆卡 launch-game-on-desktop 的做法：`cd /mnt/c`，schtasks /create … /it、/run、/delete，再等 mod 最多 3 分钟；游戏在跑时拒绝 |
| win-procs / win-kill <PID> | tasklist 里的 steam / 游戏进程和所在会话 / 只关会话 0（Services）里的 steam.exe 或游戏 |
| postmortem <ids> / learner-status / scheduler-status | 马上派一批复盘 / 批次状态 / 调度器状态 |
| experience-update <ids> / fix-batch | 手动派经验 / 修复批次，一律 merge=live；工作树占用时拒绝 |
| boss-sim-check | 用live调度器检查B4/B5触发条件并实际派发；证据、独立树、互斥租约和冷却进入learn.json，完成发fix-done |
| strategy-proposal <ids> | 手动派学习者策略提案；只接收 1–10 个本角色已结束的 12 位局号，沿用学习任务的证据要求和工作树占用保护 |
| learner-merge <branch> | 发合入兜底事件，由运维执行 live 流程；只接收 codex-dev / exp-silent |
| learner-recheck <批次 id> | 兜底合入后补跑完整 tsc + vitest；只接收 YYYYMMDD-HHMMSS-experience-update / fix-batch / strategy-proposal 格式的批次 id。锁内核实回报中所有源提交均在 live，固定检查树、去重同批次同树，保留原失败及兜底检查历史；归档日志并发送 learner-checks，失败写收件箱。broker 限时 3700 秒，请求端默认等 3760 秒 |
| eval-metrics <角色 id> <进阶> | 沙箱外运行完整评估：角色限 ironclad/silent/regent/necrobinder/defect，进阶为 0–999 的整数，不带前导零；固定传 --character、--ascension、--group-by ascension、--md，使用 data/logdb-venv/bin/python，nice 19。结果保存到 paper/materials/<角色>/a<级>-metrics-<时间>.<随机后缀>.md，打印路径；失败保留旧报告，不发布部分或空结果。broker 限时 10 分钟，请求端默认等 11 分钟，CODEX_OPS_DO_WAIT 可显式覆盖 |
| git-push-main <完整 SHA> | 仅推送当前 main 的指定完整提交到固定项目 origin，使用 Windows ssh.exe；拒绝已移动的 main、其他目的地和额外参数，不 force、不推 upstream，推送后核对远端 main SHA。仅在用户已经授权本次推送、提交通过测试和 gitleaks 后调用；白名单从下一次标准叫醒加载 |

例如 `bash ops/codex-ops-do.sh eval-metrics silent 3`。每次产生独立快照，读取返回的文件后并入升级小结；动作不接收任意路径、额外选项或外部命令。broker 的白名单在叫醒开始时加载，本轮改动从下一次叫醒起生效，不需要重启对局。历史升级评估请求可在动作生效后的事件中补跑。

学习者回报 `merged=null`，随后由运维实际兜底合入时，调用 `bash ops/codex-ops-do.sh learner-recheck <批次 id>` 触发上述完整补测。调度器执行检查并登记结果，运维根据 learner-checks 处理失败；该动作不会重写原完成回报，也不会自动回滚或重复合入。

Roy 授权的静默 boss 校准使用独立模板 `learner/tasks/silent-boss-calibration.md` 和工作树 `.worktrees/silent-boss-calibration`。运维先准备干净工作树，再在 `notes/silent-boss-calibration-dispatch.json` 记录 `state=pending`、`task=silent-boss-calibration`、`character=silent`、`authorized_by=Roy` 和唯一 `request_id`，然后调用既有 `fix-batch` broker 动作；仅此次手动请求走专用模板，普通修复和 tick 的任务不变。批次状态保存 `learner_task` 和 `feature_request`，按请求去重、拒绝忙或脏的专用工作树，失败沿用一小时退避与三次上限。取得实际批号后把请求改为 `dispatched` 并保留批号；完成仍发 `fix-done` 并补完整检查，通道名称不把功能归类为 bug。它与原修复工作树互不占用，live 合入仍串行持锁。

实测（2026-10-04，真实 codex，测试会话）：init 5 s；一次叫醒里模型依次调了 procs（0）、mod-state（0，拿到 mod 的 JSON）、`kill 1`（2，被动作脚本拒绝：不是我们的进程）、`rm-rf`（2，broker 拒绝：没有这个动作），31 s，会话记得第一轮的暗号。没有在真实游戏上测 autoplay-start / launch-game / win-kill（按要求没碰对局）。

**剩下的风险**：模型能改 live 和 step 里的代码（修阻塞 bug 本来就要），也能改 ops/autoplay.sh、run.sh、report.py，这些都在沙箱外运行、能读 key。所以权限配置挡的是「模型直接读到、打印出 key」，不是对一个恶意模型的隔离——和原来 Claude 运维会话的处境一样。

## herdr 托管（Roy 2026-10-05）

目的：长跑的进程在 herdr 里看得见、管得了（Mac 上 `herdr --machine xdwin …`）。托管层是通用的（`ops/herdr-host.sh` + pane 侧的 `ops/herdr-exec.sh`），不含项目逻辑：新 tab 优先跟随实际 ops pane 所在的 workspace；尚无 ops pane 时使用 `sts2-run`（cwd 主检出）。每个 label 一个 tab；label → pane 记在 `ops/codex-ops/herdr.json`。不碰 `agent-sts2`（wD，Claude rc 会话）、geo-crash、codex-gc1。

```bash
bash ops/herdr-host.sh status            # 稳定 label、可读 title、pane、存活/忙碌、前台 PID
bash ops/herdr-host.sh run <label> [--pidfile F] [--close-on-exit] [--env K=V]... -- <命令>
bash ops/herdr-host.sh stop <label>      # ctrl+c、关 pane；只停自己登记的 label
bash ops/herdr-host.sh attach-hint       # 从 Mac 怎么看
```

Roy 2026-10-10 要求学习 tab 与 ops 放在同一 workspace。同名 workspace 不作为实际归属的依据，新学习 tab 通过已登记且仍存活的 ops pane 定位；其他 workspace 的同名闲置 tab 保存最后输出后关闭并重建，忙碌 tab 保持。既有批次继续运行；需要在 ops 旁查看它时，运维用 `bash ops/codex-ops-do.sh learner-log-tab <batch-id>` 打开独立日志 tab，显示该已登记活批的 `.out/.err`，不重启学习者。日志 tab 随已核实 wrapper 结束而关闭；已结束批次、已消失或身份不匹配的 PID 拒绝创建。重复调用复用同一日志 tab。

**开关**：`ops/codex-ops/hosting`，每行 `键=值`（文件，不用改 crontab）；环境变量优先。

| 键 | 值（默认在前） | 环境变量 | 管什么 |
|---|---|---|---|
| ops | exec / herdr | CODEX_OPS_MODE | 叫醒走 `codex exec resume`（无头），还是走 herdr 里的交互 TUI |
| learners | setsid / herdr | CODEX_OPS_LEARNER_HOST | tab 标题 `学习大脑 · <批次> · <类型>`（复盘、经验更新、策略提案、修复等）；pane label 仍是 `learner-<批次 id>[-postmortem]`，新批次直接运行 Codex 交互 TUI；实际会话结束、原输出持久化且完成事务登记后才关 pane，最后 30 行留在 `ops/codex-ops/herdr-panes.log` |
| brain_view | herdr / off | CODEX_OPS_BRAIN_VIEW | 只读常驻 tab `对局大脑 · <run_id>`；pane label 固定 `brain-view`。独立关闭视图，不影响对局、学习或 autoplay |
| autoplay | setsid / herdr | CODEX_OPS_AUTOPLAY_HOST | 动作 autoplay-start 把 `ops/autoplay.sh` 放进 pane `autoplay`；PID 仍写 `autoplay.pid`，autoplay-stop / kill / 卡死检查不变 |

**对局直播（#36）**：沿 #33 现有 Codex app-server 通知监听和 dsh 流式观察器写入 `logs/brain-live/<run_id>/current.txt`，不新增模型、客户端或连接，不输入/修改原线程和回滚。每题先显示时间、层数、题型、引擎/模型、请求强度及 160 字题面摘要；提供方已送来的推理摘要/正文增量按安全分句滚动，工具开始及返回即时显示名称、参数形状、返回字节、180 字脱敏摘要和耗时；随后记录本次尝试答案、路由最终接受/拒绝、理由、总耗时，错误、卡住、超时与兜底标 `!!!`。这不额外请求或生成任何推理内容。未完成分句暂存，256 字进度可见；单段超过 4096 字折叠，避免把分块凭据的前缀先写出来。工具 SQL/查询参数只展示形状；敏感字段、凭据、地址、邮箱、外部玩家标识和终端控制符脱敏后才写盘。原生通知和完整 payload 不写直播文件。

直播异步写入，不 await 磁盘，不调整原答题预算或 stall 时钟；写入错误停用该 writer，答题继续。待写队列最多 128 KiB，积压时丢展示增量并留缺口说明，原对局证据照常保存。每局 `current.txt` 最大 4 MiB，超出滚到同目录 `previous.txt`，两份共最多 8 MiB；不跨局覆盖。局结束保留这两份原件，沿现有对局 logs 保留边界处理，不因学习工作树回收删除，不新增清理调度器。

`ops/brain_view.py` 每秒仅 tail 该脱敏文本并按 `run-config.jsonl` 更新同一 tab 标题，没有可输入的会话界面；直播缺失时兼容 `brain.jsonl`、`brain-wait.jsonl` 的非流式版本。旧版本只在尝试完成后显示工具等已落盘字段，不冒充直播。只读进程能处理半行、轮转和截断；单次尝试耗时不冒充跨重试整题耗时。
视图与对局没有共享控制通道。`run.sh` 在自然进程边界异步尝试启动，原 `stall` tick 可恢复退出的视图；均为 nice 19，不阻塞对局，也不启动新模型、游戏动作或额外调度器。换局按 `run-config.jsonl` 更新同一 tab 的标题；日志轮转、缺失、半行和无效 JSON 可继续读取。视图挂掉只留下闲置 tab，重启复用它。环境可用时也可由 ops 在主运行根执行：

```bash
nice -n 19 python3 ops/brain_view.py ensure              # 只启动/复用本实例只读视图
nice -n 19 python3 ops/brain_view.py --logs <日志目录> sample  # 一次性输出已落盘样例，不操作 herdr
```

写 `brain_view=off` 到 hosting 可单独停视图（通常一秒，标题更新中的 herdr 故障最多延迟一次命令超时），tab 保留；写回 `brain_view=herdr` 后在下个自然启动边界或原 stall tick 恢复。显式 `CODEX_OPS_BRAIN_VIEW` 优先。herdr 不可用时跳过视图，对局照常。

**标题与身份**：只调用 `herdr tab rename` 改显示标题，pane label、批次 id 与登记键保持原值；新批次的租约 PID 对应后台监管 wrapper，模型 PID/birth 另在交互回执核验。herdr 原生 agent 名最多 32 字符，故使用 `learner-` 加完整 `[label, pane_id, 绝对 cwd]` 紧凑 JSON 的 SHA256 前 24 位十六进制字符（共 32 字符），不截断批次或类型。交互回执在命名前持久化 `agent_name`、`agent_name_version=1` 及原完整身份；命名前检查租约/前台/cwd/空输入框，命名后须读回该原生名才发提示，接续与每次退场按键沿用同一绑定。命名冲突、失败或回执不确定均保留现场，不另换名字或重送任务。Python 完成核验独立复核新名称绑定，既有无名称字段的 R3 原件仍按原身份/原生回合/退场合同核验。派单器、看门狗、回收及 `herdr-host.sh status/close` 继续按稳定 label 识别；`never_reclaim` 保留 `learner-*` 并保护 `brain-view`。学习日志镜像 tab 也显示 `学习大脑 · …`，结束仍沿原 wrapper/PID 检查关闭。既有学习批次不迁移、不重启；新批次或原日志镜像首次创建/闲置复用时应用标题。

**学习交互会话（#36）**：`learners=herdr` 的新批次先开专属 tab，后台 `codex-ops-learner.sh` 监管进程继续以原批次/PID/工作树持租约。`learner/run.ts` 沿原任务渲染、账号、模型/强度、key 预检和权限 profile 启动真正的 Codex TUI；从 herdr 发送原始任务，不再 tail `.out/.err` 假装会话。提示超过 96 KiB 时保存在同一 scratch 中的完整文件，首次提示要求完整读入；原完整提示仍记录在 `learner_launch`。TUI 的环境在原 `codexChildEnv` 去密钥结果上只保留本角色路径、locale、账号 home 和必要证书/无凭据代理设置，用 `env -i` 隔离 herdr server 环境；任意继承变量不写进启动脚本，含凭据代理则保留现场并拒绝启动；`--no-daemon`，nice 19，不改共用 config、账号或 home。交互 CLI 不支持 exec 专用的忽略配置参数，故启动前沿原只读配置检查器核账号及 cwd 各级配置：仅允许被显式覆盖的模型/强度、TUI 与项目 trust；继承 MCP、指令、hook 等非被动配置则零模型启动并交原 ops 核验，不改账号配置、不降级权限。原 `.out/.err`、learner JSONL、原生会话、任务产物和完成审计保留；日志和完成回执与 native session/turn 绑定，令牌按原生每回合最后用量去重累计。

屏幕 idle 或进程退出都不能证明批次完成：须有匹配原提示的原生 `task_complete`、实际 TUI idle 且输入框空、无新原生回合；初次发送与每次接续都先持久化独立的一次性 marker 和提示词 SHA，原生 user_message/response_item 必须按完整正文核成对应 turn；旧 marker、后续人类回合不继承本批权限。Python 完成核验会独立从原生记录重建这一绑定，失败/超时也不能跳过。退出前复核本批 PID birth、pane、前台进程组、agent/cwd、原租约和空输入框。原 `.out` 已刷新后，`ops/learner_tui.py` 核原日志 SHA/summary、原生完成记录、实际进程结束，再执行原 `finish` 产物审计。终态事务已登记且原件持久化后，wrapper 写入 `wrapper` 完成段（批次、真实终态、退出码、supervisor PID/birth、批次快照 SHA），调用 #20 的 `ops/learner_tabs.py seal --root ROOT --state-dir DIR --batch BATCH` 封存交接；wrapper 不关 tab。#20 回收任务等待 supervisor 实际退出，再独立核原身份、回执与产物 SHA、空闲与无人工输入，统一关 tab。seal 缺失或失败只发去重 attention、保留现场，不回退直接关闭；分类失败/超时也保留原输出与错误。会话退出不确定、新的人类输入、pane 身份变化、回执缺失等保留 tab/原件，排队给原 ops，不标 done、不另开模型、不申请回收。wrapper 核验默认最多 300 秒（`LEARNER_TUI_VERIFY_TIMEOUT_S` 可设 1–3600 秒），单次核验亦受同一截止时间约束；到期写 `BATCH.verification-deferred.json`，在原 learn.lock 下将本批从 running 变为 `awaiting_review`，不写成功/finished/rc，追加 `ops/codex-ops/inbox-claude.md` 一行后监督退出释放逻辑槽位。锁忙最多再等 2 秒，先落盘的待核记录由下一原调度 tick 在 lost/重试判断前应用。原局号、key、研究/feature/Boss 请求保持冻结，不自动重派；无关新任务继续正常准入。待核不是 #20 可回收终态，实际 pane/工作树仍由原安全门保留。key/模型预检失败仍为退出码 3、零模型启动；wrapper 刷新空输出也写 SHA，显式记录 launcher 的 1→原结果 3 映射，经原 finish 失败/重试策略登记后封存交接。没有身份、绑定或处置权证明的空 tab 仍保留，不能根据零输出猜测可回收。wrapper 只在异常排 `learner-tui-attention`；正常完成不依赖 ops 模型空闲。当前 Herdr 的 pane 若不含 label，须由同一原 host 登记的 pane/workspace 和 tab 唯一标题读回核身份，不伪造 pane.label；旧含 label 的原件仍可读。复盘 label/回执带 `-postmortem` 后缀，batch key 不带。运行中切换开关不热切已有批次。

屏幕文字与原生绑定分开处理：在原轮已接受后，composer 首次显示文字时，最多120秒只读观察同一原轮，较短任务期限/取消优先；文字期间不发prompt、接续、按键或完成。原生外来轮/租约变化仍立即保留；只有屏幕重新明确为空且原生身份/绑定不变，才恢复正常监督。仍有文字或屏幕不可辨至截止则待核，禁止退场。回执和日志保留 `input_hold` 的时间/屏幕SHA及恢复事件，不保存屏幕正文；`result.failure_reason` 保留被 `retirement-unverified` 覆盖前的原因。若启动PID还未捕获birth就已消失，立即按 `startup-process-unavailable` 保留75，不能改称零模型启动。

wrapper 的300秒仅用于可能尚未就绪的核验输入。若原launcher已退出75，原回执为 `needs-attention/retirement-unverified/stopped=false` 且原日志SHA/终态summary75/session相符，`verification-blocked` 仅识别“继续轮询不能补齐处置权”，立即沿原deferral转 `awaiting_review`，原因 `terminal-unverified-receipt`；不补绑定、finish或关tab。分类器同样受剩余300秒预算约束，未知/缺件仍沿原超时兜底；分类后deferral不再次读取可能阻塞的日志。两个原因都不自动重派。此前保留的旧75不因新代码自动改写。

Codex 0.163 的首题在派发提示前，会先写一个 `response_item/message/user`，恰含两段 `input_text`：本 cwd 的 AGENTS 包装和本 cwd 的 environment_context。解析器仅在首个待绑定回合、已核 session/cwd、尚未见 turn_context/派发提示时暂存这一已观察结构；随后的 turn_context 必须匹配原 cwd/turn，再凭原 marker 与完整提示 SHA 接受任务。上下文本身不接受或完成任务；回执以 `native_context_version=1/native_preludes` 留该前缀 SHA/turn/cwd，Python 从原生文件独立重建。原提示及每次明确续接被原生接受时即 fsync 保存 `native-accepted` 和 session/turn/bindings/前缀证明，不等任务结束；该状态不授权 finish 或退场。额外段落、未知 user/event_user、错 cwd/turn、缺上下文确认、重复或出现在提示之后/续轮的同形消息仍按外来输入保留，不能靠后续 marker 清除。活动派发 turn 从 task_started 到原提示接受之间，调用、返回、推理和助手输出一律保留拒绝，不依赖是否已经见到前缀；明确续轮同样检查，已绑定回合的正常模型工作不受影响。resume 的历史 EOF 前缀和 Python 首个绑定 turn 之前的历史仍隔离。首题前缀不豁免任何人工输入、处置权或退出门。

对已经投递、却被旧解析器误判而保留 75 的会话，可先用只读入口对账（在 `agent/` 目录）：`nice -n 19 node --import tsx ../learner/reconcile-tui.ts --receipt <原回执> --native <原生JSONL>`。它仅核完整原 label/pane/cwd/短名与原提交 marker/SHA，从最多 64 MiB 原生快照的完整行重建实际 session/turn/前缀和接受状态，报告来源 SHA 与半行字节数；不会连接 herdr、发提示、改原回执/状态或授权退场/finish。退出 0 仅表示该快照的原任务已被原生接受，不代表完成或已核当前 pane/PID/lease。原回执的 75、空 bindings 与原件照留；原 ops 仍须按原实例/产物/监督/退场门处理，不能将对账报告写回为完成回执或重派已消费的任务。

Codex 0.164 的跨日期环境更新必须在已绑定且仍打开的原 turn 内核验：原生 metadata 的类型只能是 `environments.environment_context`，来源为 `harness` 且非 hook，turn_id、消息 ID、create_time 与原始行一致；普通 `user.text` 即使形似环境上下文也拒绝。正文仅接受日期、原时区和完整 filesystem；日期须符合该行时间戳在原时区的日期，保持或递增一天，时间不倒退。workspace roots、managed/restricted 配置及每条权限须与可信启动上下文逐字相同，turn_context 的 approval/sandbox 也不得变化。重复消息 ID、额外文本/字段、新 turn 或未知格式均不继承例外。传输器持久化独立 `native_environment_version=1` / `native_environment_updates`，Python 从原生记录独立重建并比较全部证明；不会把元数据当作新任务绑定。旧 75 缺此证明的原件只能只读对账，不人工补填为完成。

原 ops 需要持续观察保留的原进程时，可显式使用同一工具的只读监督模式：在上述 `--receipt` / `--native` 后加 `--watch-state <原learn.json> --batch <原批次key> --output <全新路径.observation.json> --timeout-seconds <1至3600>`。它仅对原生、回执及原登记做只读重建，并经 Herdr `pane get` / `agent get` / `pane process-info` 核原 pane/tab/terminal/workspace、短名/cwd、前台 PID/birth；来源回执 SHA、登记快照或原生既有字节变化就保留待核。只写新的 0600 观察产物，既有输出路径拒绝覆盖；不发 prompt/按键、不改 canonical/旧回执，不重开模型或替换原 supervisor。`completed-observed`/退出0只证明本次观察的原轮完成及身份核验，不授予 finish/retirement，也不撤销原 rc75。原 PID 已退、登记已交他人、未知或超时均按75交原 ops。实际恢复完成事务和回收仍须原 supervisor/产物合同，不把观察文件写回为旧完成回执。

**同会话完成恢复**仅支持已原生完成、旧监督已退出的复盘和经验更新批：`nice -n 19 python3 ops/learner_tui.py recover-completed ROOT DIR BATCH ORIGINAL_RECEIPT_SHA256` 默认只读预检，不授权退场。ops 在发布后明确加 `--apply` 才登记新的恢复监督事务。它核完整原生绑定/环境/成功完成，原 PID/birth、短名、pane 与空 composer；只对确已完成的原 TUI 发送经过逐次复核的 Ctrl-C，不发任务、不重启模型或关 tab。原监督仍活着、人工/排队输入、身份变化、原生追加不明内容、回执不确定、锁忙或十秒退场预算耗尽均拒绝。

恢复事务先以原 SHA 归档旧75回执、原输出、登记及原生快照，原绑定不变；只有原生实际退出并回到同 pane 的 shell 后才生成带 `recovery` 来源的新完成回执和新监督日志。原输出仅追加经核实的原生最终回报，旧前缀另存；canonical 回执切换到明确的新 producer epoch，旧75原字节保留在归档，不能将其描述为原监督返回成功。新监督仍调用原 `verify`、`finish` 产物审计与 `finished` PID/父进程合同，native rc0不代语义done；原失败/空修复验收不放宽。之后由原 #20 门核新 wrapper 监督实际退出与封存/关 tab，恢复入口不自行 seal 或回收。任何中途不确定都保留恢复 journal/证据并将仍属本恢复监督的批次置待核，不盲目重试；已经退场或发布的阶段不回写成未发生。不能对保留了未完成恢复事务的批次重复 `--apply`。

恢复登记前会预先写入带原恢复监督 PID/birth 的存活保护记录；监督存活时原调度器跳过它，监督被杀或退出且登记仍未完成时，在 lost/重试之前沿原 deferral 门转待核并发 recovery attention。旧 deferral 记录不覆盖，任务/局号与外部学习绑定完整保留；不会把中断的恢复自动重派为新模型任务。

容量/限流/断流等报错空闲沿 #20 的方式接续：只在原生接受的同一批、同一原会话、实际 idle/done 且输入框空、原租约仍有效时，十分钟退避后发送“沿原任务接着做”；不重启、不换账号/线程，不重送原完整任务。即使失败回合缺少结束行，也不会把它算完成；明确报错空闲可接续。连续三次无原生工具进展后再观察完整退避，通知原 ops/Roy 并停自动提醒，保留原任务期限；人工接续有进展可恢复。发送回执不确定时只等匹配的原生用户消息核实，未核实不重发。注意通知排队不代表已送达 Roy。原超时和失败分类继续，所有退出原因都走同一处置权检查，每次 Esc/Ctrl-C 前重读；草稿、未知屏幕、前台变化、租约丢失或启动回执不确定即停止自动退出，返回 75，保留原监管租约与现场。退出按键回执不确定时同样保留，不升级为强杀；已核本批进程退出后只读等待 shell 复位。不能核退场时监管进程保留租约等原 ops 核验。

**命名失败后尚未提交的旧 TUI**：若原 launcher 已返回 `75/stopped=false`，原 supervisor 只在等待原 `learner_tui.py verify`，不会因更新源码或手工补名字自动恢复。当前没有接管该在途进程的受控发送入口；`learner/run.ts` 正常入口会创建新的 scratch/TUI，`--resume-thread` 也会启动 TUI，`learner_entry.py` 的重试仅限零输出的特定 import 失败，均不能用来恢复这个旧 pane。必须保留原监督/租约、输出、回执、一次性提示和原生记录，交原 ops 登记恢复待办；不可修改 submitted/bindings、代填完成、重派或仅手工改名后发提示。需要在原进程恢复的工作，应另行实现基于原回执/原 lease/PID birth/提示 SHA 的明确接管入口，连同原输出/summary 与 supervisor 的退出码交接一起验证后才执行；本次短名称修复只适用于后续自然启动，不声称旧批已恢复或完成。

`learner-log-tab` 遇到新批交互回执时返回已经核实的 TUI tab，不另开日志 tab；旧在途 headless 批次仍可用原只读镜像，不重启或迁移。herdr 不可用且尚未提交模型命令时，学习者退回原 setsid；忙碌身份冲突不降级另起模型。autoplay/ops 的既有 fallback 不变。开发固定测试的 `LEARNER_CMD` 仍走通用命令 pane，不能当作真实 TUI 验收。
**ops TUI**：第一轮（建会话）仍走 exec。之后每次叫醒：`herdr agent start ops --kind codex --pane <label ops 的 pane> -- resume <同样的 -c / 权限配置 / 模型 / 强度 / --disable …> --no-daemon <会话 id>`（lib.ts `interactiveArgs`；TUI 不接受 `--json`、`--ignore-user-config`、`--ignore-rules`，其余全收，2026-10-05 实测 codex 0.160）。TUI 常驻；参数变了（例如磁盘上多了一个 key 文件、强度改了）且空闲时重启。一次叫醒（herdr.ts `herdrWake`）：
1. 等就绪：herdr 状态 idle/done（unknown 时看会话文件）、输入框空（ansi 读屏：占位符是暗色）、会话文件里没有没结束的 turn。最多等 10 分钟（CODEX_OPS_HERDR_READY_MIN），不就绪 → exit 75「延后」：事件留在队列，不算失败，下个 tick 再来。blocked（对话框）也延后，调度器不替人回答。
2. `herdr agent prompt ops "<事件>"`，broker 照常在叫醒期间运行。
3. 跟 `~/.codex/sessions/…/rollout-…-<会话 id>.jsonl`：带消息首行的 turn 出现 task_complete 就算完；token 取该 turn 最后一条 token_usage_record。超时（120 分钟）发 esc 打断这一轮，TUI 保留。wakes/*.jsonl 里记的是这一轮在会话文件里的行，wakes.jsonl 多 `mode: herdr`、`pane`、`deferred`。
4. 回到 exec 时 TUI 还开着 → 叫醒延后（两个进程不能同时写一个会话）。

**人在 pane 里打字**：可以看、可以在空闲时自己发问题（那一轮没有 broker，`codex-ops-do.sh` 会等不到回答）。没发出去的字会让调度器一直等（10 分钟后延后），所以不要把半句话留在输入框里。调度器从不向空输入框发 ctrl+c（那会退出 codex）。TUI 里 `!命令` 是人直接跑 shell，**不在沙箱里**（读得到 key），模型触发不了。

**风险**：关 pane 或重启 herdr server（例如升级 0.9.3）会杀掉里面的 autoplay、学习者和 TUI；之前先把 hosting 改回去或挑空档。

### 切换步骤（按顺序；不丢当前对局和会话）

0. 合入 main，完整 tsc + vitest。确认 cron 环境能连上 herdr：`env -i HOME=$HOME PATH=/usr/bin:/bin bash ops/herdr-host.sh available && echo ok`。
1. 学习者：`echo learners=herdr >> ops/codex-ops/hosting`。正在跑的批次继续在 setsid 下跑完；下一个批次进 pane。
2. autoplay：`echo autoplay=herdr >> ops/codex-ops/hosting`。等运维下一次 autoplay-start 自然生效；要马上搬：
   `A=$(cat ops/codex-ops/autoplay.pid); P=<pgrep -af 'index.ts play' 的 PID>; kill $A; bash ops/herdr-host.sh run autoplay --pidfile ops/codex-ops/autoplay.pid --env WAIT_PID=$P -- bash ops/autoplay.sh`
   （只停 autoplay 的 bash；对局 P 继续，新 autoplay 等它结束后照常写复盘，再开下一局。）
3. ops 先在临时会话上试：
   `T=$(mktemp -d); echo '只回复 OK' > $T/p.md; CODEX_OPS_DIR=$T CODEX_OPS_PROMPT=$T/p.md CODEX_OPS_EFFORT=low agent/node_modules/.bin/tsx ops/codex/main.ts wake`（exec 建临时会话），
   `echo 测试 > $T/queue/$(date +%s%N)-manual.md; CODEX_OPS_DIR=$T CODEX_OPS_MODE=herdr CODEX_OPS_HERDR_AGENT=opstest CODEX_OPS_EFFORT=low agent/node_modules/.bin/tsx ops/codex/main.ts wake`，
   看 `$T/wakes.jsonl` 最后一行 ok、tokens 非零；`HERDR_HOST_STATE=$T/herdr.json bash ops/herdr-host.sh stop opstest`。
4. 正式：`bash ops/codex-ops.sh status`（wake: idle）→ `echo ops=herdr >> ops/codex-ops/hosting` → `bash ops/codex-ops.sh wake --fg "herdr 切换：回复一句话确认"` → `tail -1 ops/codex-ops/wakes.jsonl`（mode herdr、ok true）。

**回退**：删掉 hosting 里对应的行（或写 `=exec` / `=setsid`）。ops：等 `herdr agent get ops` 是 idle/done 再 `bash ops/herdr-host.sh stop ops`，下一次叫醒回到 `codex exec resume` 同一个会话。学习者：已在 pane 里的批次跑完自己关。autoplay：在 pane 里的继续跑；要搬回 setsid 同第 2 步，换成 `WAIT_PID=$P setsid nohup bash ops/autoplay.sh >/dev/null 2>&1 </dev/null & echo $! > ops/codex-ops/autoplay.pid`。

## 收件箱

Roy 2026-10-09 授权的全历史核心构筑学习使用 `silent-historical-core-builds`，唯一请求在 `notes/silent-historical-core-builds-dispatch.json`。原 `fix-batch` 事件通道承载任务派发，任务本身只学习知识并输出报告，不修架构或合入源码。调度器自动消费该请求，冻结全部已结束静默局及日志完整行字节切点，保存输入清单 SHA；不截最近十局。独立工作树 `.worktrees/silent-historical-core-builds` 由包装器创建并持租约。完成时单独校验请求、批号、冻结输入、完整局清单、报告 realpath/SHA、候选和限制章节，发送 `core-builds-done`，不以不存在的源码合入为失败。

运维核对实质报告并双收件箱回报后，调用 `bash ops/codex-ops-do.sh core-build-notify <批次>`，在宿主使用原生 herdr 通知。按请求、批次及验收报告 SHA 持久去重；不完整报告、入口完成、报告验收后被改写都不能发成果通知。通知状态不明时保留 claimed/uncertain，不盲目重复。所有父请求状态变更在 `ops/codex-ops/core-request-history/` 保存旧字节与追加历史。

普通 `fix-batch`、`strategy-proposal` 改用每批独立的 `codex-fix-<角色>-<时间>`、`codex-strategy-<角色>-<时间>` 工作树，各类同时一批，两类可并行；经验更新仍独占 exp。遗留 codex-dev 及失败树原样保留，供运维保存交接后接手续验，不要求原 agent 回来才能恢复，也不因一棵旧树有改动而阻塞其他批次。状态更新用 learn.lock、上线与完整检查用 live-merge.lock，ops 会话仍由 wake.lock 串行协调。

长时间运行的 ops 会话日志以分块增量方式读取上下文与当前 turn；不再整份构造 JS 字符串，保留原日志。`status` 只读展示批次，不根据沙箱 PID 可见性写 lost。

`ops/inbox-dev.md`：只追加，一行一件事，`- YYYY-MM-DD HH:MM [运维 codex | codex-ops 调度器] 内容`。开发会话盯着这个文件（Monitor 或它自己的定时任务），转告 Roy；需要 Roy 定的事运维会话同时写 notes/for-roy.md。

## 文件

| 文件 | 作用 |
|---|---|
| ops/codex-ops.sh | 调度器：start / stop / status / tick / drain / wake / pause；stall 的退避；快照 |
| ops/codex/lib.ts、main.ts | 命令行、权限配置、事件消息、broker、叫醒、预检、会话大小、快照复制、`probe` |
| ops/codex/archive.ts | 每日快照：运维和学习者的 codex 记录替换 key 后复制到 paper/materials/session/codex/ |
| ops/codex-ops-learn.py | 学习闭环的机械部分；状态 ops/codex-ops/learn.json |
| ops/codex-ops-learner.sh | 跑复盘、经验或修复批次（沙箱外），结束时发完成事件并叫醒 |
| ops/learner_jobs.py、learner_checks.py | 写任务去重、工作树占用检查；完成事件和合入后的完整检查 |
| ops/codex-ops-do.sh、ops/codex-ops-actions.sh | 沙箱里的请求端、沙箱外的动作 |
| ops/ops-session-silent-codex-prompt.md | 会话的第一轮 prompt |
| agent/tests/ops-codex.test.ts | 命令行和权限、broker 往返、事件、会话大小、学习闭环（假学习者）、卡死退避 |
| ops/herdr-host.sh、ops/herdr-exec.sh | 通用的 herdr 托管（workspace、pane、run、stop、status） |
| ops/codex/herdr.ts | 经 herdr TUI 叫醒：就绪判断、提交、按会话文件判断完成和记 token |
| agent/tests/ops-herdr.test.ts、tests/fixtures-herdr/fake-herdr.py | TUI 参数、读屏和会话文件、托管脚本、herdr 叫醒、托管的学习者批次（假 herdr） |

Roy 2026-10-09 授权策略提案先开两路：一个正常派发回调可领取最多两批，每批至多10条，先排除活批已领取的proposal_ids；第二批用实际派发时间戳加 `-s2` 区分，不伪造未来时间。每批独立工作树和租约，任务显式带batch只读自身领取清单；重复任务key不并发重派，补链同一请求不重复。`code_proposal` 回执保持首批接口，完整批次在 learn.json。ops/既有调度器派发，watcher不启动学习；live合入/完整检查仍用原锁串行。新树只连接已有node_modules和logdb-venv，不安装依赖。策略并发上限常量STRATEGY_WORKERS=2；降回1只影响新派发，不中断已跑批。
# 储君独立通道的受限启动动作

`regent-launch-inspect` 只读原登记游戏身份；`regent-launch-solo <manifest-sha256>` 仅启动固定独立 clientId/端口的储君窗口，持久回执防止重复启动。`regent-native-repair` 仅修复本请求已证 API 未加载、没有对局存档的自有启动窗口；核 PID、创建时间、原生路径和 clientId 后停止该 PID，保留新窗口的失败和原生默认设置。`regent-startup-check` 先核自己的 PID/profile 与实际 modded 保存根，仅执行已广告的启动弹窗或打开选角菜单，不选其他角色、不出发、不启动自动游玩。四个动作不接受任意 URL、PID、shell 或游戏参数；不读取凭据或游戏二进制内容，不控制原 Silent。见 `docs/multi-instance.md`。


## Silent V5 模块健康验收（2026-10-13）

Roy要求将DPR供给检查固定到框架。现有五分钟 `tick stall` 在卡死检查后调用 `ops/module_health.py`；每局 `report.py` 复用已经读入的该局全部决策，补最终验收。不增会话、定时器或对局操作。

- 以本局 `run-config.jsonl` 的 Silent/V5 和 `boss_sim_build=on` 确定适用范围；后继执行动作、战斗题、模拟明确跳过的已过boss不计失败。构筑shadow、模拟成功、大脑实际收到指标分别统计，收到指标不证明采用或存在固定权重。
- 记录B3配对样本数、门槛、耗时、候选牌组数、选击杀顺序/正式比较两阶段、工作线程数、冷启动、排队和首批返回时间、派出/完成工作量。首批返回包含启动、排队及计算，不能单凭它断言CPU争用；负载只是当时观测，不倒填历史原因。
- 连续3道适用题没有完整DPR时，向原ops队列发送一次 `module-health` 异常；同局重复tick和最终报告去重，异常原件不覆盖，恢复情况写最新快照。ops沿已有owner自主排查，不自动重派学习、不重启游戏、不降低300样本门槛，不因正常运行向Roy逐项回报。
- 每次最多读每个决策/脑日志末32MiB，保留字节位置/SHA并标完整性。每局报告补全决策分母；脑日志若仅覆盖部分，则只报告已观察题数。完整报告不被后来的部分窗口覆盖。
- 快照和唯一异常证据在 `ops/codex-ops/module-health/`，属于小型正式验收记录；不复制全量日志，不创建学习WT。离线性能探针 `agent/tools/profile-build-health.ts` 只读冻结输入，最多4线程，须 `nice`；显式HP/当前模型重算不能称原历史胜率重放。开发WT按标准验收、合入及回收流程处理。

只读手工核查（不投递异常）：`python3 ops/module_health.py --run <局号> --no-notify`。

## Roy 2026-10-18 用量节省

Silent 的例行复盘按 5 局批处理；不足 5 局从最早未复盘局结束起最多等待 2 小时，缺结束时间则从首次看到积压起计。下一次原 :13/:43 tick 到期派发，不增加 timer 或模型轮询。失败的原重试、逐局复盘/账本和手动立即 dispatch 保留；其他角色原节奏保持。普通策略原 10 份复盘/进阶触发保留，waiting 提案的相关证据去重由原独立任务处理。

下一自然启动点普通分析/开发/ops 显式 high，困难专项及已绑定科学请求保留 xhigh；局内大脑 xhigh 不变，不改共用账号 config 或在途进程。新批先读 evidence_summary.py 生成的有限索引，再按 offset/bytes/SHA 读取需要的原文；摘要不替代资源链、全部冻结局覆盖或科学四闸。实际生效以新原生 turn_context 回执为准。


## Roy 2026-10-18：短清单与普通批次自动收尾

原调度器在 finish/tick 和每次原自然 wake 前生成 notes/ops-current.md（≤12KB），current.json 保存来源字节/SHA 与溢出索引。首次仍读 README/AGENTS/STATE/学习协议，后续仅清单与事件原件；历史 handoff/decision-log 保留按需定位。新 prompt 只在自然边界生效，不重启当前 turn。普通记录300–500字以内并附原件。

ordinary_close.py 仅接原完成协议核过的普通无源码成功；dispatch 记录源码/通知基线，完成再核严格 Git、报告及问题附件。专项请求、失败、缺证/新通知/异议不自动隐藏。账本独立检查，每局证据覆盖核实后，由原 finish/tick 在 learn.lock 外执行一份 dataset 作业；所有 paper_dataset.py CLI 共用 paper-dataset.lock。受控提交只取授权账本/复盘/当前生成表/固定完成记录，排除历史快照、知识、源码、运维提示；有暂存内容/并行改动/index锁就保留现场转原事件。用独立 index、HEAD CAS 与文件字节守卫，不清理工作区。成功固定回执 closed、dataset rc、日志 SHA 和实际记录 commit；无 learner-done/strategy-done/fix-done 入队，不单独唤醒模型。异常 ordinary-close-attention 保留原报告、原失败、空检查和所有父要求。自动过程不新增模型/对局/定时器，通关/升级原通知不变。

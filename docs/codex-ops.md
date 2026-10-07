# 运维会话跑在 codex 上（调度器 + 一个可续的 codex 会话）

Dai 2026-10-04 21:00 定：Claude 只观察和与 Dai 对话，不修改或审核；codex 学习者自行实现、自测、合入，运维 codex 确认上线和提交兜底；运维会话改用 codex（gpt-6.1-sol，强度 xhigh，和学习者一样）。codex 没有会话内的定时任务（原来的 Claude 运维 prompt 靠 CronCreate），所以拆成两半：

- **调度器**（`ops/codex-ops.sh`，cron 或一个 setsid 的 bash 循环）：做所有机械的活，只在需要判断时叫醒 codex。
- **运维 codex 会话**：只建一次（第一轮 = `ops/ops-session-silent-codex-prompt.md`），以后每次叫醒都是 `codex exec resume <会话 id>`，消息是调度器攒下的事件。会话 id 在 `ops/codex-ops/session-id`。

prompt 的内容沿用 Dai 批准的 `ops/ops-session-silent-prompt.md`，只改了运行方式（定时任务 → 事件；通知开发会话 → 收件箱；沙箱外的操作 → 调度器的动作）。

## 怎么启动和停

```bash
cd ~/Projects/agent-sts2
bash ops/codex-ops.sh start          # 预检（codex 能用、ops 权限配置挡住 key 文件），装 cron 块，后台建会话
bash ops/codex-ops.sh start --loop   # 不用 crontab：同样的时间表由一个 setsid 的 bash 循环跑（PID 在 ops/codex-ops/loop.pid）
bash ops/codex-ops.sh status         # 调度器、会话大小/上下文/压缩次数、队列、正在跑的叫醒、复盘批次、日志末尾
bash ops/codex-ops.sh wake "<话>"    # 开发会话或 Dai 给运维会话留话（manual 事件），马上叫醒（后台；--fg 前台等）
bash ops/codex-ops.sh pause|unpause  # 暂停：tick 和叫醒都不做
bash ops/codex-ops.sh stop [--now]   # 去掉 cron 块 / 停循环；--now 再按 PID 停掉正在跑的叫醒。会话 id 保留，下次 start 接着用
```

**cron 还是循环**：默认 cron。cron 由系统服务跑，不依赖任何会话或终端，机器重启后自己恢复（这时 autoplay 也没了，第一次卡死检查会叫醒运维会话去重启对局，正是它该做的）；循环和 autoplay 一样是 setsid 的 bash，WSL 关掉或重启就没了，要再 `start --loop`。systemd --user 不用：这台机器没开 linger，最后一个登录会话退出时 user 服务会停。改 crontab 在 Claude 的 auto 模式里会被当成「持久化」拦下（2026-10-04 实测），所以 `start` 要由 Dai 运行或授权；不方便时用 `--loop`。

## 时间表（调度器做什么、什么时候叫醒 codex）

| 时间 | 调度器自己做 | 叫醒 codex（事件） |
|---|---|---|
| 每 5 分钟 | `ops/stall-check.sh` | 输出 STALL → `stall`（带完整输出）。同一原因（去掉数字后相同）第一次之后隔 10、20、40、80 分钟、之后每 2 小时再叫一次；OK 了就清掉 |
| 每小时 13、43 分 | `ops/codex-ops-learn.py tick`：① runs.jsonl 里静默猎手的胜局不在 ops/win-notified 里的，写进去；② 这个角色最新的 run-config 进阶比上次见到的高；③ 已结束、没有 `## <id>` 复盘、没派过的局，派一批学习者（最多 5 局，同一时间一批），`learner/run.ts --engine codex --task postmortem --character silent`；④ `experience-pending.py` 有 ≥1 局就派 experience-update（同时一批，迟到的并入下一批）；⑤ accepted 未上线提案或未关闭修复队列派 fix-batch（同时一批）；两类一律 merge=live，忙或脏的工作树不派 | ① → `victory`；② → `ascension-up`（第一次见到只记下，不叫）；③ 的批次跑完 → `learner-done`（退出码、已有/还缺的复盘、每局的学习账本条目和没有条目的局、回报文件）；④/⑤ 完成发 `experience-done` / `fix-done`，已合入的批次在沙箱外完整检查后发 `learner-checks` |
| 每天 4:07 | `ops/paper_dataset.py`（完整版，含 `paper/data/learning-curve-<角色>.csv`）；codex 记录替换 key 后复制到 paper/materials/session/codex/（运维会话的 rollout 和 wakes、学习者的 learner/runs/*.jsonl 和它们的 codex rollout；ops/codex/archive.ts，按 MANIFEST.json 只复制变了的），再用 gitleaks 扫一遍（比上次多就在收件箱写一行，不叫醒运维）；decision-log 记一行 | 失败时 `snapshot-failed` |
| 随时 | — | `ops/codex-ops.sh wake "<话>"` → `manual` |

学习者跑在调度器这边（沙箱外）：它自己的 codex 要联网，运维会话的沙箱里跑不了。失败批次 1 小时后重派，最多 3 次。经验与修复任务在各自工作树自测通过后自行合入 live，不另设审核。调度器用 learn.lock 串行更新批次状态，按内容去重；收到完成事件后，运维确认实际合入、机械同步 main 和上线账本。学习者提交或合入受阻时运维兜底。

学习者的沙箱检查用 `bash agent/tools/test-sandbox.sh`（在 agent/ 可用 `bash tools/test-sandbox.sh`）。排除名单与原因固定在脚本里；实际合入 live 后，调度器在沙箱外、live-merge.lock 内跑完整 tsc + vitest。失败写收件箱并发送 learner-checks，运维决定回滚还是派修复；调度器不自动回滚。

## 叫醒（ops/codex/main.ts wake）

- 事件是 `ops/codex-ops/queue/<纳秒时间>-<类型>.md`，一次叫醒把队列里的全部事件按时间编号成一条消息。成功后事件移到 `delivered/`；失败（退出码非 0、turn 失败、超时）事件留在队列，下一个 tick 重试；连续 3 次失败在收件箱写一行。
- 串行：`flock ops/codex-ops/wake.lock`，同一时间只有一个叫醒；叫醒期间新来的事件，这次叫醒结束后接着发（一次最多连发 5 轮）。
- 每次叫醒前：codex 启动检查（版本、登录、模型和强度）+ key 隔离自检（`codex sandbox -P ops` 打开每个 key 文件，打得开就不叫醒，exit 3）。
- 超时 120 分钟（`CODEX_OPS_WAKE_TIMEOUT_MIN`），按进程组停。登录被拒时让 codex 刷新一次令牌，事件留到下次。
- 记录：每次叫醒的完整事件流在 `ops/codex-ops/wakes/<时间>-wake.jsonl`（第一行是命令和消息），一行摘要进 `wakes.jsonl`（token、上下文大小、压缩次数、最后的回答），调度器日志 `scheduler.log`。写完都做 key 扫描替换。运行时目录 `ops/codex-ops/` 不进 git。

### 会话会长多大、会不会压缩

- 每次 resume 都把整段历史发给模型（cache 命中很高）。gpt-6.1-sol 的窗口 272k（codex 报的有效窗口 258.4k）。启动时显式设 `model_auto_compact_token_limit=200000`：上下文超过 20 万 token 时 codex 自动压缩历史（codex 0.160 有这个设置，实测接受、不报警）。
- 实测（2026-10-04，测试会话，强度 low）：第一轮（只有测试 prompt）上下文 10.5k token；一次带 4 个动作调用的叫醒后 11.8k。正式 prompt 加 AGENTS.md 和开工要读的文档，第一轮估计在 5–8 万；一次普通叫醒（看回报、记 decision-log、提交）增加几千到两万。按每天十来次叫醒，几天到一周会碰到压缩线。
- `bash ops/codex-ops.sh status` 显示当前上下文、窗口、压缩次数和本周额度用量（从 codex 自己的会话文件读）。压缩会丢细节，所以要紧的状态都写在文件里（decision-log、fix-queue、收件箱、ops/codex-ops/learn.json），不靠会话记忆。

## 权限（codex 的权限配置 "ops"）

照学习者的写任务配置（learner/lib/engines.ts `codexPermissions`，Dai 2026-10-04 批准的做法），名字叫 `ops`（`-c default_permissions="ops"`），每次叫醒都重新传（codex 不把它存在会话里）：

- 全部可读；可写：项目根（主检出，含 .worktrees/step、live）、/tmp 和 codex 的临时目录；不联网。
- 读不到：~/.jev_api_keys、~/.deepseek_api_key、~/.sts2-jev-env*、~/.codex/auth.json、项目里所有 .env / *.env（glob + 磁盘上找到的每个的绝对路径）。
- ops 额外的（ops/codex/lib.ts `opsExtraRules`）：主检出的 `.git` 可写（codex 默认把可写根里的 .git 设成只读，git 提交会报 index.lock Read-only file system）；`.git/hooks` 和 `.git/config` 只读。Dai 2026-10-05 08:37 授权运维和学习者修改调度器及 broker 文件，main e601de00 已去掉这些文件的只读规则；key、所有 .env 和 codex 登录令牌仍不可读。

实测（2026-10-04，`tsx ops/codex/main.ts probe <脚本>` 在 ops 配置下跑 shell）：key 文件和 live 的 .env 读不到；项目根、ops/、live 工作树可写，~ 不可写；git 在工作树里提交成功（加 .git 规则之前失败）；hooks、config、调度器文件写不了；tsc、vitest、python 读日志都能跑；gitleaks 在。沙箱有自己的 PID 命名空间（看不到外面的进程，kill 不到）、不联网（127.0.0.1:8080 也连不上，curl exit 7）、调不了 Windows 程序（cmd.exe 报 UtilBindVsockAnyPort）；嵌套的 codex（学习者）因为不联网也跑不了。

所以沙箱外的事走**动作**：模型运行 `bash ops/codex-ops-do.sh <动作> [参数]`，它在 `ops/codex-ops/broker/` 放一个请求文件；叫醒进程（node，在沙箱外）里的 broker 每 0.5 秒看一次，按白名单校验（`ACTIONS`：动作名、参数个数、参数只能是 PID 或逗号分隔的局号），再运行 `ops/codex-ops-actions.sh <动作> [参数]`（每个动作自己再查一遍参数），把输出和退出码写回。broker 只在叫醒期间存在。

| 动作 | 做什么 |
|---|---|
| procs / stall-check / mod-state | 我们的进程（pgrep）/ ops/stall-check.sh / mod 的 GET /state |
| autoplay-start | prompt 的开工步骤：有残留的 autoplay / stop-after / 对局就拒绝；删 ops/STOP；setsid nohup ops/autoplay.sh；打印 PID 和 live 的提交号 |
| autoplay-stop / play-stop / kill <PID> | 停 autoplay-start 起的 autoplay（先核对命令行）/ ops/stop.sh / 按 PID 停我们自己的 autoplay、stop-after、对局、report.py、学习者（核对属主和命令行） |
| launch-game | 记忆卡 launch-game-on-desktop 的做法：`cd /mnt/c`，schtasks /create … /it、/run、/delete，再等 mod 最多 3 分钟；游戏在跑时拒绝 |
| win-procs / win-kill <PID> | tasklist 里的 steam / 游戏进程和所在会话 / 只关会话 0（Services）里的 steam.exe 或游戏 |
| postmortem <ids> / learner-status / scheduler-status | 马上派一批复盘 / 批次状态 / 调度器状态 |
| experience-update <ids> / fix-batch | 手动派经验 / 修复批次，一律 merge=live；工作树占用时拒绝 |
| strategy-proposal <ids> | 手动派学习者策略提案；只接收 1–10 个本角色已结束的 12 位局号，沿用学习任务的证据要求和工作树占用保护 |
| learner-merge <branch> | 发合入兜底事件，由运维执行 live 流程；只接收 codex-dev / exp-silent |
| learner-recheck <批次 id> | 兜底合入后补跑完整 tsc + vitest；只接收 YYYYMMDD-HHMMSS-experience-update / fix-batch / strategy-proposal 格式的批次 id。锁内核实回报中所有源提交均在 live，固定检查树、去重同批次同树，保留原失败及兜底检查历史；归档日志并发送 learner-checks，失败写收件箱。broker 限时 3700 秒，请求端默认等 3760 秒 |
| eval-metrics <角色 id> <进阶> | 沙箱外运行完整评估：角色限 ironclad/silent/regent/necrobinder/defect，进阶为 0–999 的整数，不带前导零；固定传 --character、--ascension、--group-by ascension、--md，使用 data/logdb-venv/bin/python，nice 19。结果保存到 paper/materials/<角色>/a<级>-metrics-<时间>.<随机后缀>.md，打印路径；失败保留旧报告，不发布部分或空结果。broker 限时 10 分钟，请求端默认等 11 分钟，CODEX_OPS_DO_WAIT 可显式覆盖 |

例如 `bash ops/codex-ops-do.sh eval-metrics silent 3`。每次产生独立快照，读取返回的文件后并入升级小结；动作不接收任意路径、额外选项或外部命令。broker 的白名单在叫醒开始时加载，本轮改动从下一次叫醒起生效，不需要重启对局。历史升级评估请求可在动作生效后的事件中补跑。

学习者回报 `merged=null`，随后由运维实际兜底合入时，调用 `bash ops/codex-ops-do.sh learner-recheck <批次 id>` 触发上述完整补测。调度器执行检查并登记结果，运维根据 learner-checks 处理失败；该动作不会重写原完成回报，也不会自动回滚或重复合入。

Roy 授权的静默 boss 校准使用独立模板 `learner/tasks/silent-boss-calibration.md` 和工作树 `.worktrees/silent-boss-calibration`。运维先准备干净工作树，再在 `notes/silent-boss-calibration-dispatch.json` 记录 `state=pending`、`task=silent-boss-calibration`、`character=silent`、`authorized_by=Roy` 和唯一 `request_id`，然后调用既有 `fix-batch` broker 动作；仅此次手动请求走专用模板，普通修复和 tick 的任务不变。批次状态保存 `learner_task` 和 `feature_request`，按请求去重、拒绝忙或脏的专用工作树，失败沿用一小时退避与三次上限。取得实际批号后把请求改为 `dispatched` 并保留批号；完成仍发 `fix-done` 并补完整检查，通道名称不把功能归类为 bug。它与原修复工作树互不占用，live 合入仍串行持锁。

实测（2026-10-04，真实 codex，测试会话）：init 5 s；一次叫醒里模型依次调了 procs（0）、mod-state（0，拿到 mod 的 JSON）、`kill 1`（2，被动作脚本拒绝：不是我们的进程）、`rm-rf`（2，broker 拒绝：没有这个动作），31 s，会话记得第一轮的暗号。没有在真实游戏上测 autoplay-start / launch-game / win-kill（按要求没碰对局）。

**剩下的风险**：模型能改 live 和 step 里的代码（修阻塞 bug 本来就要），也能改 ops/autoplay.sh、run.sh、report.py，这些都在沙箱外运行、能读 key。所以权限配置挡的是「模型直接读到、打印出 key」，不是对一个恶意模型的隔离——和原来 Claude 运维会话的处境一样。

## herdr 托管（Roy 2026-10-05）

目的：长跑的进程在 herdr 里看得见、管得了（Mac 上 `herdr --machine xdwin …`）。托管层是通用的（`ops/herdr-host.sh` + pane 侧的 `ops/herdr-exec.sh`），不含项目逻辑：一个 workspace `sts2-run`（cwd 主检出），每个 label 一个 tab；label → pane 记在 `ops/codex-ops/herdr.json`。不碰 `agent-sts2`（wD，Claude rc 会话）、geo-crash、codex-gc1。

```bash
bash ops/herdr-host.sh status            # label、pane、在不在、忙不忙、前台 PID
bash ops/herdr-host.sh run <label> [--pidfile F] [--close-on-exit] [--env K=V]... -- <命令>
bash ops/herdr-host.sh stop <label>      # ctrl+c、关 pane；只停自己登记的 label
bash ops/herdr-host.sh attach-hint       # 从 Mac 怎么看
```

**开关**：`ops/codex-ops/hosting`，每行 `键=值`（文件，不用改 crontab）；环境变量优先。

| 键 | 值（默认在前） | 环境变量 | 管什么 |
|---|---|---|---|
| ops | exec / herdr | CODEX_OPS_MODE | 叫醒走 `codex exec resume`（无头），还是走 herdr 里的交互 TUI |
| learners | setsid / herdr | CODEX_OPS_LEARNER_HOST | 学习者批次在 pane `learner-<批次 id>[-postmortem]` 里跑，结束关 pane，最后 30 行留在 `ops/codex-ops/herdr-panes.log` |
| autoplay | setsid / herdr | CODEX_OPS_AUTOPLAY_HOST | 动作 autoplay-start 把 `ops/autoplay.sh` 放进 pane `autoplay`；PID 仍写 `autoplay.pid`，autoplay-stop / kill / 卡死检查不变 |

herdr 不可用时（`herdr-host.sh available` 失败）学习者和 autoplay 退回 setsid，ops 叫醒退回 exec（日志里各有一行）。学习者的命令行、权限配置、key 预检、退出码、`learner/runs/*.jsonl`、批次登记都不变；pane 里 `tail -F` 显示 `.out/.err`，批次结束后 drain 放到 setsid 里（不随 pane 关掉）。

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

`ops/inbox-dev.md`：只追加，一行一件事，`- YYYY-MM-DD HH:MM [运维 codex | codex-ops 调度器] 内容`。开发会话盯着这个文件（Monitor 或它自己的定时任务），转告 Dai；需要 Dai 定的事运维会话同时写 notes/for-dai.md。

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

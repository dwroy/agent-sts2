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
- ops 额外的（ops/codex/lib.ts `opsExtraRules`）：主检出的 `.git` 可写（codex 默认把可写根里的 .git 设成只读，git 提交会报 index.lock Read-only file system）；`.git/hooks` 和 `.git/config` 只读（hook 或 core.hooksPath 会在下一个提交的人那里、沙箱外运行）；调度器自己的文件只读（ops/codex/、ops/codex-ops*.sh、ops/codex-ops-learn.py、paths.sh/py、stall-check.sh、stop.sh），模型不能改宽自己的出口。

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
| learner-merge <branch> | 发合入兜底事件，由运维执行 live 流程；只接收 codex-dev / exp-silent |

实测（2026-10-04，真实 codex，测试会话）：init 5 s；一次叫醒里模型依次调了 procs（0）、mod-state（0，拿到 mod 的 JSON）、`kill 1`（2，被动作脚本拒绝：不是我们的进程）、`rm-rf`（2，broker 拒绝：没有这个动作），31 s，会话记得第一轮的暗号。没有在真实游戏上测 autoplay-start / launch-game / win-kill（按要求没碰对局）。

**剩下的风险**：模型能改 live 和 step 里的代码（修阻塞 bug 本来就要），也能改 ops/autoplay.sh、run.sh、report.py，这些都在沙箱外运行、能读 key。所以权限配置挡的是「模型直接读到、打印出 key」，不是对一个恶意模型的隔离——和原来 Claude 运维会话的处境一样。

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

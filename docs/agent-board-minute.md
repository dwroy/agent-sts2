# 派单器一分钟入口与任务边界观察

依据 #20 的 [一分钟节拍](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6367397414)、[/new 规则](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6367705371)和[判错兜底/先观察一天](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6367774091)。本补交排在学习 tab 子类之后、#42 余项之前；父 #20 仍沿原依赖。影响 live 启动：否。

同时修复 [ops 实测交接头被生成器覆盖](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6367983979)，按[集成员补验要求](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6368125909)核保留区与声明时间，不能把 clear-ok 本身当清理授权。

## 入口与启用

轻入口为 `ops/agent_board.py --poll`，只替换自身进程运行 kit；不调用 stall、brain_view、learner_tabs、module_health、用量采样或游戏。每次运行一次即退出，没有新增 daemon。kit 的 `board.py`、`watchdog.py` 与新增 `polling.py`、`conversation.py` 必须同版本安装，保留同机原 registry、journal、uncertain 和项目授权，不重新登记其他项目。

`.agents/board.yaml` 的 `dispatcher.poll_source: minute` 是候选能力声明；原 `interval_minutes: 5` 保留给回退入口，`minute_interval_minutes: 1` 用于新入口。实际入口取项目控制文件的 `poll_source`，旧控制缺字段默认为 stall。源码合入和设置 enabled 都不自动切入口。

原 ops 在原运行根完成安装、核定向结果后，只读演练：

```bash
nice -n 19 python3 ops/agent_board.py --root "$ROOT" --poll --dry-run
```

全局 `--dry-run` 可以在启用前演练，不写预算/缓存/锁/状态/观察日志、不发提示或 `/new`；真实只读 API 调用只在本次内存预算中计数。正式入口的持久计数见下文。原 PAUSE/LLM_DRAIN、显式 `CODEX_AGENT_BOARD=off` 和 retention 开关继续有效。

ops 安装一条每分钟运行的 cron，替换 ROOT/DIR 为既有已核运行根与状态目录；不改原五分钟 stall 及其其他职责，也不增加第二个 kit 消费者：

```bash
# Cron 每分钟调用一次；沿既有环境设置 ROOT、DIR、PATH。
nice -n 19 timeout 55s python3 "$ROOT/ops/agent_board.py" --root "$ROOT" --poll >> "$DIR/agent-board.log" 2>&1
```

新 cron 先安装、控制仍为 stall 时只返回 delegated。确认唯一入口后由 ops 执行：

```bash
nice -n 19 python3 ops/agent_board.py --root "$ROOT" --set-poll-source minute
nice -n 19 python3 ops/agent_board.py --root "$ROOT" --show-poll-source
```

这两条不派活。原 stall 改为调用 `--stall`，切换后返回 delegated；两入口及多个项目仍共用原宿主/项目锁。宿主登记的其他 host 项目保留自己的五分钟周期与旧提醒规则；maintenance 项目不越权消费。回退用 `--set-poll-source stall`，保留全部事件与缓存；停用仍用既有 `--set-enabled off`。安装新 kit 应先于采用新源码配置，避免旧 kit 不认识新叶。

## 空闲与额度

minute 项目每拍读 herdr 会话列表；idle/done 连续两分钟后，有积压才提醒。集成员看 review，ops 看 waiting-release（含发布后验收读回），开发看已登记 in-progress。忙碌、blocked/unknown、缺席、身份改变均重计；无活不发。每个 pane 十分钟最多一条，跨 issue 共享冷却；未送达的新状态提醒在同优先级下先于旧自动接续。消息固定一行，不复制 issue/终端正文。同一 issue 的自动接续仍两小时一次、三次无进展后经响应窗口升 needs:roy；进展不能绕过历史冷却，sending/uncertain 不自动重发。发布不插队门保留。

issues 按页带 ETag/If-None-Match；comments/events 有已核缓存且 issue.updated_at 未变时直接复用，变化才按页条件请求。304 复用同页原件，不计计费额度。分页仍检查完整列表，不以第一页或缓存缺页补猜。缓存绑定 repo/root；真实 API/格式错误保留动作。

宿主 registry 同目录的 `*-api.json` 在原 registry 锁内累计全部直属 GitHub 请求；包括 GET 和单次 labels POST，不含其他 agent 或 lifecycle 子程序自行发起的 API。每次请求前保守登记，304 读回再扣计费数；未知响应仍按一次计费。记录最近一小时计费时间和最近24个 UTC 小时的 requests/charged/304。超过1000计费请求/小时即把新入口降为五分钟，并在 digest 显示；跨阈值的未完成读取得到 queued，本轮不做会话动作，下一慢拍重核，不用部分快照派活。额度窗口恢复后回一分钟。慢拍仍每分钟读 herdr，不发模型探测。

上线一小时由 ops 读回 `*-api.json`、digest 的额度与 Idle sessions 段、原提示 done/sent_at：核每小时实际请求数、集成员/ops 有积压时的原生空闲时长及提醒延迟（目标≤3分钟）。`idle_sessions.since` 只由实际 busy/身份变化重置，发送提醒不会伪造已经忙起来；十分钟冷却、两小时接续和额度降频期间的等待单列。固定测试不能代实际一小时验收。

## 交接声明与 /new 观察

ops/集成员每轮结束前维护自己的交接文件（分别 `notes/ops-current.md`、`notes/integrator-current.md`），第一、二行及必填正文如下；开发者一 issue 一会话，不参与清理：

```text
state: clear-ok
issue: 20

进行中的事: 无（或完整列出进行中的事务与证据）
在等谁: 集成员的核验回执（没有则写无）
下一步: 按 issue 和发布顺序接续
```

state 可为 clear-ok/in-flight，只是摘要，不代完整正文。声明缺失、正文缺项、mtime 早于最后原生回合结束、原生回合仍开着/读未追齐、会话忙碌、未知版本、输入不空或状态改变时间不明，均保留。严格按最后 task_complete/turn_aborted 时间核：轮内写完但早于最终结束也不会清；由原角色/交接写入链补更新，开发不代填或放宽时间门。

ops 生成器保留文件开头到 `# 运维当前清单（调度器生成` 之前的角色区，常规投影与12KB索引降级都不覆盖它；整文件仍按12KB门，过大保留原件、不截角色区。`ops-current-handoff.json` 绑定角色区 SHA 与原声明纳秒时间，生成器刷新投影不会刷新该时间。派单器只核角色区，取声明原时间与文件 mtime 的较早者，不把自动生成当角色刚确认。缺/坏/异根/不同 SHA 的保护回执均不清。

ops 更新交接时把仅角色区的完整草稿存于项目内，用原生成锁串行写入（集成员文件无自动生成器，可沿原方式维护）：

```bash
nice -n 19 python3 ops/ops_current.py "$ROOT" "$DIR" --handoff <本仓角色区草稿>
```

该入口只更新角色区与其时间证明，保留原生成正文，不生成新快照、改对局或清对话。明确重申相同文字也更新声明时间；普通生成则不更新。直接写文件与生成器冲突时，生成器检测变化并保留当前原件；角色写入应使用同一 current.lock 入口，避免并行覆盖。仍不由开发代写真实 ops/集成员交接头。

资源客观信号优先：原 heavy lease、发布/检查锁、仍活的本角色进程树任务、原发布快照 checking/publishing，或名下 issue 最近五分钟改过状态，都否决清理。native 只沿当前 pane 前台 Codex 子进程的唯一 rollout FD 核 pid/birth/session/cwd；不扫描账号目录、不读凭据或 config。增量读取 token_count 的 input_tokens/window、末回合、compacted 记录与每轮首次 token_count，正文及终端内容不写日志。未知进程/原生证据保留。

clear-ok 且新 issue 不同才会计划 `/new`；同 issue/in-flight 不清。超过窗口一半或出现过压缩，下一个 clear-ok 即使同 issue 也计划清。in-flight 过半先发一行提醒，把进行中的事、在等谁、下一步写入交接；只有同一原生 session 的完整交接声明时间在该提醒后确已更新（正文 SHA 绑定，相同文字的明确重申也有效），且所有客观门再次通过，才计划强制清。生成器刷新不算重申。历史压缩但当前未过半的 in-flight 仍等 clear-ok。

当前 `conversations.mode: shadow`：正式一分钟入口正常发短提醒，只将“此刻会不会清、依据、交接 SHA/时间、原生元数据”追加到项目 journal 旁 `*-conversations.jsonl`，不发 `/new`。这与全局不落盘的 `--dry-run` 分开。观察至少一天、主管对照实际状态核准后才能另行启用 active；本交付不代核准、不启用、不对真实会话试清。

active 还要求本地批准文件及配置中的原件 SHA，格式为 `schema=agent-board-conversation-approval-v1`、本 repo/root、`approved_by=lead`、ISO `approved_at`；shadow_since 到 last_observed 至少24小时且已有观察记录，批准时间不得早于完整一天或晚于当前。批准文件保留主管核准与观察报告引用，由 ops 核后登记 `conversations.approval: {path, sha256}` 并把 mode 改 active。缺批准仍沿当前对话提醒，绝不自动切 active。

真正清理时再次核证据与空输入，只发送 `/new`；只接受 Codex 0.164 中明确选中第1项 `Use current Git worktree` 的界面，才发送 enter。选前再核身份/原 native/交接/资源，选后核同一 pane/tab/terminal/workspace、同 PID/birth、新 session、空输入，才发 `读 <交接文件> 与 #N，轮到你：…` 一行。沿原通知 sending/uncertain 事务，任一步回执丢失不再清、不重发；没有更改启动参数/config 或发送 /fast、/ultrafast。

## 误判与一天读回

`/new` receipt、每轮 opening_tokens/window、压缩记录时间均留在原 journal/观察 JSONL。ops 一天后分角色核实际 `/new` 数、压缩记录数和各轮开头大小；未知数据保留未知。清后第一轮询问“刚才在做什么”由原生摘要自动记一次误判，不复制原话；重做已完成事项由主管/ops 对照实际证据抽查登记，不用关键词冒充验证。

核实重做后，写一个项目内本地 JSON（`session` 为实际 new_receipt 的新 session，`kind` 为 repeated-completed-work 或 asked-previous-context），原 ops 使用 kit 的 `--record-misjudgment ROLE --reason LOCAL_JSON --poll --project ROOT --registry REGISTRY` 登记。只接受已有 `/new` 回执的对应角色/session，保留证据 path/SHA。两次误判后持久 suspend，digest 显示并继续原对话提醒；不自动解除，收紧规则和再次开启须主管另行核准。

# 离线学习者（learner）

V4 架构 §1 的「学习者」、§4 的 M4（docs/v4-architecture.md）：把自我迭代从对局里拆出来，三类学习任务（复盘、经验库更新、批量修 bug）写成**与引擎无关的任务说明**，由一个**统一启动器**交给 CLI agent 执行。引擎可切换：**codex（ChatGPT 订阅，gpt-6.1-sol / xhigh；Dai 2026-10-04 定为学习者引擎）** 和 **Claude（订阅，本机登录态）**，两者都跑通过真实冒烟。

```
learner/
  run.ts              启动器入口（代码在 learner/lib/）
  pending.ts          某个角色还没并进经验库的复盘（ops/experience-pending.py 按角色分开的版本）
  tasks/*.md          任务说明（中文，{{占位符}} 参数）
  runs/               每次运行的日志和临时目录（已加 .gitignore）
  proposal-ops-prompt.md   给 Dai 审的运维 prompt 修改建议（机制推理）
learner/lib/
  task.ts             任务文件解析、占位符替换、参数检查
  engines.ts          claude / codex 命令行、权限、子进程环境
  summary.ts          事件流 → 摘要（轮数、token、cache、成本、耗时、状态）
  launcher.ts         参数解析、--dry-run、运行、日志、超时、key 清洗
  runs.ts             runs.jsonl / lessons.md 按角色：每局的角色、角色打过的最高进阶、待并入的复盘
agent/tests/learner.test.ts、learner-paths.test.ts、learner-character.test.ts
```

## 用法

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd ~/Projects/agent-sts2          # 或任何工作树（.worktrees/<名字>）

# 复盘 3–5 局（agent 在项目根目录工作，只追加 notes/lessons.md）
agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem \
  --set runs=ULQPBK1211FG,JJ65CGH92D9A,DHGT6Z3Q7VAP --cwd ~/Projects/sts2-jev --model opus

# 经验库更新（在 exp-update 工作树里改 experience.json、提交；默认不合入 v3）
agent/node_modules/.bin/tsx learner/run.ts --engine claude --task experience-update \
  --set runs=A,B,C,D,E --cwd ~/Projects/agent-sts2/.worktrees/exp --model opus

# 批量修 bug（在 step1-bugfix 工作树里；merge=v3 时照「合入 v3 的流程」自己合入）
agent/node_modules/.bin/tsx learner/run.ts --engine claude --task fix-batch --cwd ~/Projects/agent-sts2/.worktrees/step --set merge=v3

# 只看最终提示和命令行，不执行
agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd ~/Projects/sts2-jev --dry-run
```

| 参数 | 说明 |
|---|---|
| `--engine claude\|codex` | 必填 |
| `--task <名字或路径>` | 必填；名字 = learner/tasks/<名字>.md |
| `--cwd <目录>` | 必填；agent 的工作目录，必须在 ~/Projects/sts2-jev 里 |
| `--set name=value` | 任务参数，可重复；值里可以有逗号和等号 |
| `--model <模型>` | 如 `gpt-6.1-sol`、`opus`；不给时用任务 front matter 的 `model.<引擎>`，再没有：codex 用 gpt-6.1-sol，claude 用 CLI 默认 |
| `--effort <档位>` | 推理强度（codex 的 `model_reasoning_effort`，claude 的 `--effort`）；不给时用 `effort.<引擎>`，再没有：codex 用 xhigh，claude 不传 |
| `--max-turns N` | claude 的轮数上限；默认取任务的 `max_turns`（codex 没有这个参数，只靠超时） |
| `--timeout-min N` | 超时（分钟），到时按 PID 先 SIGTERM、10 秒后 SIGKILL；默认取任务的 `timeout_min` |
| `--dry-run` | 只打印最终提示、命令行、被去掉的环境变量名；不启动 agent，不建日志 |
| `--character <id>` | 角色（游戏的 character_id 小写：ironclad、silent…）；不给时取环境变量 `CHARACTER`，再没有就是 ironclad。见下「多角色」 |
| `--with-tools [--ascension N] [--knowledge-dir D]` | 用 stdio MCP 把 kb_* 知识库工具挂给 agent（见下） |

退出码：0 完成；1 agent 失败（结果是 error、max turns 等）；2 参数或任务说明有错；3 引擎没装、或工具服务器不存在；124 超时。

## 任务和参数

内置参数（启动器给，不用 --set）：`{{cwd}}`、`{{worktree}}`（默认 = cwd，可 --set 改）、`{{project_root}}`（~/Projects/sts2-jev）、`{{logs_dir}}`（jev-sts2/logs）、`{{scratch}}`（本次的临时目录 learner/runs/<时间>-<任务>/）、`{{task}}`。
缺参数、或 --set 了任务用不到的参数，都直接报错（exit 2），防止拼错。

### 多角色（2026-10-04）
- 角色内置参数（由 `--character` 决定，不能 --set）：`{{character}}`（silent）、`{{character_name}}`（静默猎手）、`{{character_dir}}`（knowledge/characters/silent）、`{{experience_path}}`（knowledge/characters/silent/experience.json）、`{{changelog_path}}`（变更记录：铁甲战士仍是 paper/materials/experience-changelog.md，其他角色各有一份 paper/materials/experience-changelog-<id>.md，Dai 2026-10-04）。
- 段落：`{{#is_ironclad}}…{{/is_ironclad}}` 只给铁甲战士，`{{^is_ironclad}}…{{/is_ironclad}}` 给其他角色；标记独占一行时连同这一行一起去掉，所以铁甲战士的任务说明和加角色之前逐字相同。
- front matter `characters: ironclad` 限定任务只给哪些角色用（experience-asc-audit 是铁甲战士 A9 专用）。
- `--set runs=…` / `run=…` 里的局，runs.jsonl 记的角色（`character`，没有这个字段 = 铁甲战士的旧局）和本次角色不同的，直接报错（exit 2）；runs.jsonl 里没有的局留给任务自己判断。
- 新角色的经验库从空开始，只从它自己的局学；任务说明不写任何角色的打法。非铁甲战士的复盘标题第二项写角色名：`## <run id>（A0，静默猎手，第N层，死因）`；没有角色名的标题都是铁甲战士的。
- 每 10 局并一次经验库按角色数：`agent/node_modules/.bin/tsx learner/pending.ts --character silent [--max 10]`（输出和 ops/experience-pending.py 一样：先个数，再逗号分隔的 run id；铁甲战士的结果和那个脚本相同）。
- **学习节奏按角色（Dai 2026-10-04）**：复盘、待并复盘的计数、每 10 局一批的经验库更新都按角色分开做。运维每次只给**有新复盘的角色**跑：对 runs.jsonl 里出现过的每个角色跑 `ops/experience-pending.py --character <id>`（或 `learner/pending.ts --character <id>`），个数到 10 的才派 `experience-update --character <id>`；没有新复盘的角色不跑。各角色的批次互不混，铁甲战士的批次和以前一样。
- `--with-tools` 的进阶：`--ascension N`（可以是 0），否则 `TARGET_ASCENSION`：数字照用；没设是 9；`climb`（或任何非数字）= 这个角色在 runs.jsonl 里打过的最高进阶，没打过是 0。非铁甲战士时给工具服务器设 `CHARACTER`。

| 任务 | 必填 | 可选（默认） | 工具 | 建议的 --cwd | 会改什么 |
|---|---|---|---|---|---|
| postmortem | `runs` | `code_dir`（jev-sts2-v3，引 file:line 用） | Read Grep Glob Bash | ~/Projects/sts2-jev | 只追加 notes/lessons.md（用 `cat >>`，没有编辑工具） |
| experience-update | `runs` | `base_branch`（v3）、`merge`（no）、`merge_dir`（jev-sts2-v3） | 全部 | jev-sts2-exp | 本分支的 experience.json 和提交；变更记录追加一节；merge=v3 时合入 |
| fix-batch | — | `items`（fix-queue.md 里没划掉的纯 bug）、`base_branch`、`merge`、`merge_dir` | 全部 | jev-sts2-step | 本分支的代码、测试和提交；merge=v3 时合入 |
| smoke | `run` | — | Read Grep Glob | 任意 | 什么都不改（端到端自检用） |
| mechanics-audit | — | `report`（notes/mechanics-residuals.md）、`summary`、`monster_db`、`out`（notes/mechanics-proposals.md）、`min_n`（20） | Read Grep Glob Bash Write | 怪物数据库带 `observed` 的工作树 | 只写提案文件 `out`（docs/mechanics-learning.md §5；从不自动应用） |

三个正式任务都照运维会话现有的做法写（ops/ops-session-prompt.md 的复盘、修 bug、经验库三段，经验库方法照 paper/materials/experience-changelog.md 最后两节），另外：
- experience-update 加了 v4-dev-brief 第 5 项的**机制推理**（每条机制结论要有推理、证据局数、典型案例；只用 v3 切片认识的 scope；不许写喝药规则）；
- postmortem 的记录里加了一句「机制：」，给经验更新用；
- 每个任务末尾都有安全规矩（沿用运维 prompt 的「安全」）和固定的回报格式，回报最后有一个 json 代码块，方便调用方的脚本读。
- 两个会改分支的任务**默认不合入 v3**（merge=no）：V4 的学习者产出新版本，由评估和 Dai 决定上线；要沿用现在「纯 bug 直接合入 v3」的流程就加 `--set merge=v3`，合入在 `flock ops/v3-merge.lock` 里做。
- 工作区仓库（notes/、paper/）的提交、fix-queue 划掉条目、decision-log 都留给调用方做，避免和运维会话同时提交。

### 任务文件格式
```
---
title: 复盘
tools: Read, Grep, Glob, Bash        # 只能从 Read Grep Glob Bash Edit Write 里选；决定权限
timeout_min: 120
max_turns: 400
model.claude: opus                   # 可选，按引擎写；不写 = codex gpt-6.1-sol、claude CLI 默认
effort.codex: xhigh                  # 可选，按引擎写；不写 = codex xhigh；单独的 model: / effort: 会报错（会落到所有引擎上）
default.code_dir: {{project_root}}/jev-sts2-v3   # 参数默认值，可以用内置参数
---
正文（中文），用 {{参数}}。
```

## 权限和安全

**claude**（`claude -p`，本机订阅登录；**不加 `--bare`**，不要 API key；冒烟测试里 init 事件的 `apiKeySource` 是 `none`）：
- `--output-format stream-json --verbose`，提示从 stdin 传入（不出现在命令行和 `ps` 里）；
- `--restricted`：文件工具只能碰工作目录（`--cwd` 和 `--add-dir ~/Projects/sts2-jev`），不加载用户/项目的 settings 和 hooks；
- `--permission-mode dontAsk` + `--permission-prompts none`：没预先允许的一律拒绝，不会卡在询问上；
- `--tools` = 任务 front matter 的工具；`--allowedTools`：`Read(//home/dw/Projects/agent-sts2/**)`、`Grep`、`Glob`，有写工具时 `Edit(//home/dw/Projects/sts2-jev/**)`（Edit 规则同时管 Write），有 Bash 时 `Bash`；
- `--disallowedTools`：读 key 文件（~/.jev_api_keys、~/.deepseek_api_key、~/.sts2-jev-env*、任何 .env）、读 sts2.dll / .pck、改 .env；Bash 的 `git push`、`pkill`、`killall`、`npm install/i/ci`、`npm run play`、`tsx agent/src/index.ts play`、`sudo`、`ssh`、`env`、`printenv`、`curl`、`wget`；
- `--strict-mcp-config`：不加载本机配置的任何 MCP 服务器和 claude.ai 连接器，只有 `--with-tools` 时挂我们的 gkb；
- 子进程环境设 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`：不读交互会话的自动记忆，任务说明就是全部上下文。
- 限制：Bash 没法按路径限定（只能按命令前缀拒绝），所以 Bash 里的越界靠 deny 规则 + 任务说明里的安全规矩兜底；日志事后再做 key 扫描（下面）。

**codex**（`codex exec`，codex-cli 0.160，ChatGPT 订阅登录态）：沿用对局大脑的 codex 管道（agent/src/brain/engines/codex.ts）：
- 程序：`LEARNER_CODEX_BIN`，否则和大脑一样找（PATH，再 ~/.local/node/bin/codex）；登录目录：`LEARNER_CODEX_HOME`，否则 `CODEX_HOME`，否则 ~/.codex；子进程环境 = 去掉 key 的环境 + 大脑的 `codexEnv`（CODEX_HOME、codex 的 trace-safe 日志、程序目录放 PATH 最前）；
- 运行前做大脑的启动检查 `checkCodex`：`--version`、登录文件在、$CODEX_HOME 里没有 AGENTS.md、模型目录里有这个模型且支持这个 effort；不过就 exit 3；
- 命令行：`exec --json --ignore-user-config --ignore-rules --cd <cwd> -c default_permissions="learner" -c permissions.learner.filesystem={…} --model <模型>`，`-c approval_policy="never"`、`web_search="disabled"`（游戏知识只能来自对局日志）、`model_reasoning_effort=<effort>`、`allow_login_shell=false`、`skills.include_instructions=false`、`skills.bundled.enabled=false`、不检查更新、不写 history、不发 analytics；大脑关掉的 feature 除了 `shell_tool`、`unified_exec`、`code_mode_host`（学习者要用工具）全部 `--disable`；`-` = 提示走 stdin；
- **key 隔离（Dai 2026-10-04 批准）**：codex 自带的 read-only / workspace-write 沙箱能读所有文件，所以不用 `--sandbox`，改用 codex 的权限配置 `learner`（engines.ts `codexPermissions`）：
  - 全部可读（`:root`）；只读任务什么都不能写；写任务另外可写工作目录（`:project_roots`）、项目根和临时目录（`:tmpdir`、`:slash_tmp`），等同原来的 workspace-write + `--add-dir <项目根>`；不联网；
  - 两种任务都读不到：~/.jev_api_keys、~/.deepseek_api_key、~/.sts2-jev-env*、codex 的 auth.json（codex 在沙箱外的自己进程里读登录，实测照常登录）、项目根和它所属主检出下所有 `.env` / `*.env`（`**` glob，`glob_scan_max_depth=8`），再加上启动器在磁盘上找到的每个 key 文件的绝对路径（根、agent/、一级子目录、.worktrees/*、.claude/worktrees/* 及其 agent/）；
  - **运行前自检**：每次 codex 运行前，用 `codex sandbox -P learner`（同一份配置）起一个 shell，对每个找到的 key 文件 `head -c 0`，只输出打得开的文件名；有任何一个打得开、或自检本身失败，就 exit 3，只列文件名；
  - 实测（2026-10-04）：shell 里读 key 文件全部被拒（只读和写任务）；写任务里 apply_patch 能改工作目录里的文件，写项目外被拒（「writing outside of the project」），shell 写 ~ 被拒（Read-only file system）；apply_patch 是 codex 在沙箱里起的子进程（`--codex-run-as-apply-patch`），在同一配置下改一个 .env 诱饵被拒（「Failed to read file to update」）；模型的 JS exec 环境没有绕过 shell 的读文件办法。模型自己看到权限说明后会拒绝去碰被禁的路径（探针里它不肯尝试），所以「apply_patch 改 .env」是直接在沙箱里跑 codex 的 apply_patch 子进程验证的；
  - 局限：glob 只覆盖命令启动时已存在的文件；MCP 服务器（gkb）在沙箱外运行，它只读知识库和日志；日志事后的 key 扫描照旧保留。
- 和大脑不同：**不关项目文档**（不设 `project_doc_max_bytes=0`），codex 从 git 根到 --cd 读本仓库的 AGENTS.md；会话不加 `--ephemeral`，存在 $CODEX_HOME/sessions，可以 `codex exec resume <会话 id>` 接着做；
- 启动器在提示前面加一段【启动器说明（codex）】，把任务里通用的工具名（Read / Grep / Glob / Bash / Edit / Write）对到 shell 和 apply_patch，并说明只读任务里只读命令可以用（第一次冒烟没有这段：codex 找不到叫 Read、Grep 的工具，又把「不运行任何命令」理解成不许用 shell，什么都没读）；
- `--with-tools`：`-c mcp_servers.gkb.command / .args / .env`，加 `default_tools_approval_mode="approve"`（不加的话 approval_policy=never 会把每次 kb_* 调用都拒掉，实测过）；
- 超时和 Ctrl-C：agent 在自己的进程组里启动，按 PID 杀整个组（npm 的 node 启动器、codex 本体和它起的 shell 一起停）；
- 登录被拒（401、令牌过期）：照大脑的做法让 codex 刷新一次令牌（`refreshCodexAuth`），提示重跑，不自动重跑；
- **没有用量护栏**（Dai 2026-10-04 19:53）；codex 没有轮数上限参数，只靠超时。

**环境变量**：子进程里去掉 `DEEPSEEK_*`、`TYPESAFE_*`、`JEV_*`、`OPENROUTER_*`、`ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN`、`OPENAI_API_KEY`、`CODEX_API_KEY`、名字里带 KEY/TOKEN/SECRET/PASSWORD 的变量，以及上层 Claude Code 会话自己的 `CLAUDECODE`、`CLAUDE_CODE_*`（学习者是一个全新的顶层会话）。例外：claude 引擎保留 `CLAUDE_CODE_OAUTH_TOKEN`（这就是订阅登录态）。`--dry-run` 只列被去掉的变量名，从不打印值。

**日志里的 key**：运行结束后，启动器从 ~/.jev_api_keys、~/.deepseek_api_key、工作区和每个工作树里的 .env（根目录、agent/、.worktrees/*/agent/）和被去掉的变量里取出 key 值（≥16 字符、非路径、非 URL），扫描日志，出现就替换成 `[REDACTED]` 并在摘要里提示次数；值本身从不打印。

## 日志和摘要

每次运行写 `learner/runs/<YYYYMMDD-HHMMSS>-<任务>.jsonl`：
1. 第一行 `learner_launch`：引擎、任务、参数、工作目录、完整命令行、超时、被去掉的变量名、**完整提示**；
2. 中间是 agent 的原始事件流（claude stream-json / codex JSONL），stderr 每行记成 `learner_stderr`；
3. 最后一行 `learner_summary`：退出码、信号、是否超时、墙钟、摘要。

运行中 stderr 打印每次工具调用；结束时 stdout 打印 agent 的最后回答和摘要（状态、模型、会话 id、轮数、工具调用次数、输入/输出/cache 读写 token 和命中率、`total_cost_usd`（API 价折算，订阅不按次计费）、耗时、被拒的工具调用、MCP 状态）。claude 的会话照常保存，失败时可以 `claude --resume <会话 id>` 接着做。

### 冒烟测试（2026-09-29 23:20，Claude 订阅，只跑了一次）
`agent/node_modules/.bin/tsx learner/run.ts --engine claude --task smoke --set run=ULQPBK1211FG --cwd ~/Projects/sts2-jev/jev-sts2-v4learner --model opus`
- 状态 success、退出码 0；模型 claude-opus-5-5；`apiKeySource: none`（订阅登录）；工具只有 Glob/Grep/Read，权限模式 dontAsk，MCP 0 个，被拒 0 次；
- 4 轮，Grep×2、Read×1（先找行号再按行读 6 行）；token 输入 8、输出 865、cache 读 24.8k、cache 写 10.3k（命中 70.7%）；$0.1046；agent 自报 11.4 s，墙钟 13.1 s；
- 三句话总结和 lessons.md 的 ULQP 一节一致；
- 跑前跑后 lessons.md 的 sha256、大小、mtime 相同，工作区仓库 `git status` 相同，工作树里只多了被忽略的 learner/runs/。
- 发现并修掉一个问题：key 扫描把 .env 里 `…_KEY_FILE=~/.deepseek_api_key` 这种**路径**当成 key，替换了任务说明里的文字（2 处，假阳性）。现在跳过路径、URL 和 `_FILE/_PATH/_DIR/_URL/_HOST/_MODEL` 结尾的变量；用新规则重扫这份日志：真实 key 出现 0 次。

## --with-tools：学习者可用的知识库工具

agent/src/brain/tools/registry.ts 里已有 7 个 kb_* 工具（kb_monster、kb_encounter、kb_experience、kb_stats、kb_old_knowledge、kb_postmortem、kb_runs）。`--with-tools` 按 agent/src/brain/tools/mcp-launch.ts 的 `mcpLaunchSpec` 起 stdio MCP 服务器（服务名 gkb，工具在 Claude 里叫 `mcp__gkb__kb_*`，允许规则 `mcp__gkb`），另外把 `KNOWLEDGE_LESSONS_FILE` 指到 ~/Projects/sts2-jev/notes/lessons.md。知识目录默认是启动器所在工作树的 knowledge（`--knowledge-dir` 可改，例如指到 jev-sts2-v3/src/knowledge 取对局在用的最新数据），进阶默认取 `TARGET_ASCENSION`，再没有就是 9。

**现状**：服务器 agent/src/brain/tools/mcp-server.ts 已在本仓库；找不到时 `--with-tools` 报错退出（exit 3）并说明原因。claude 的工具调用在 stream-json 里有完整的输入和输出；codex 的在 `mcp_tool_call` 事件和会话记录里（2026-10-04 实测 kb_runs 可用，见上面 codex 一节）。

## codex 的摘要和会话记录

summary.ts 按真实事件流解析（2026-10-04 实测，codex-cli 0.160）：`thread.started`（会话 id）、`turn.started`、`item.started` / `item.completed`（`agent_message`、`reasoning`、`command_execution`（command、aggregated_output、exit_code）、`file_change`、`mcp_tool_call`（server、tool、status）、`error` = 警告）、`turn.completed` 的 usage（`input_tokens` 含 cache、`cached_input_tokens`、`cache_write_input_tokens`、`output_tokens` 含推理、`reasoning_output_tokens`）、`turn.failed`、`error`（「Reconnecting... n/5」是重连，不算失败）。摘要里的「输入」是去掉 cache 的部分；codex 不报成本。
- 每个事件按到达时间记进摘要的 `timing`（首个事件、模型首个输出、首次和末次工具、工具内时间、逐项时间线），stderr 行带 `t_ms`；
- gpt-6.1-sol 的工具都经过一个 JavaScript `exec` 工具（code mode），只有跑 shell 的那部分会出现在 `--json` 里。所以运行后启动器再读 codex 自己的会话记录（$CODEX_HOME/sessions/…/rollout-…-<会话 id>.jsonl），在摘要里给出**AGENTS.md 是否加载**（加载了哪个目录的）和**模型的全部工具调用**。

### 冒烟测试（2026-10-04 20:14，codex，gpt-6.1-sol / xhigh）
`STS2_WORKSPACE=~/Projects/agent-sts2 agent/node_modules/.bin/tsx learner/run.ts --engine codex --task smoke --set run=9VHPE06AC7R8 --cwd <工作树>`
- 状态 success、退出码 0；1 轮；AGENTS.md 已加载（工作树根）；模型的工具调用 exec×3，里面跑了 8 条只读 shell 命令（rg 找行号、sed 按行读这一节；另外 AGENTS.md 的「先读」让它读了 README、STATE、decision-log 末尾、学习协议）；
- token：输入 50.1k（去掉 cache）、cache 读 29.6k、输出 949（推理 447）；墙钟 43.5 s：codex 启动到发出请求约 2.5 s，模型首个输出 5.8 s，工具本身合计不到 1 s，其余都是模型（按 AGENTS.md 读文档后的推理约 10 s，最后的总结约 16 s）；
- 三句话总结和 lessons.md 里 9VHP 一节一致；lessons.md 没变。
- 第一次（20:12，还没有启动器说明）：codex 没读任何东西就交了「没有 Grep / Read 工具」的回答，36.3 s——这是加启动器说明的原因。
- 只读复盘试跑（20:16，T0ZSE8L3MCDA，postmortem 任务改成只读、整节作为回答输出、不读旧复盘）：success，墙钟 1051 s（17.5 min）；24 次 exec 里跑了 45 条 shell 命令（rg 按局号抽、python 流式读 states.jsonl），工具本身合计 1.8 s；token 输入 187.8k、cache 读 2.45M（命中 92.9%）、输出 26.1k（推理 13.1k）；开头按 AGENTS.md 读 README / STATE / 协议约 56 s；写出一节（3 条经验 + 记录 + 机制），lessons.md 前后 sha256 相同。
- `--with-tools` 实测（20:15，effort low）：MCP gkb 连上，`kb_runs` 返回最近 3 局（T0ZS、9VHP、4AWD，和 runs.jsonl 一致），15.2 s。

## 和运维会话现有流程的对应关系（建议，不改 ops-session-prompt.md）

| 运维 prompt（定时任务 2） | 现在 | 可以改成 |
|---|---|---|
| 2. 有新局时派后台 general-purpose 子 agent 写复盘（3–5 局一个） | 子 agent 的提示每次由运维会话口述 | `agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem --set runs=… --cwd ~/Projects/sts2-jev`（run_in_background） |
| 复盘后：paper_dataset.py、新 bug 进 fix-queue、decision-log、提交工作区 | 运维会话做 | 不变，仍由运维会话做（回报的 json 块里有 bugs 列表可直接用） |
| 3. 修 bug：在 jev-sts2-step 派修复 agent，自己合入 v3 | 同上 | `--task fix-batch --cwd …/jev-sts2-step --set merge=v3`；fix-queue 划掉条目仍由运维会话做 |
| 4. 每满 5 局派 agent 在 jev-sts2-exp 更新经验库，然后合入 v3 | 同上 | `--task experience-update --set runs=… --cwd …/jev-sts2-exp --set merge=v3`（任务里已含机制推理，见 proposal-ops-prompt.md） |

好处：任务说明有版本（git 里），每次的提示、全过程、token 和成本都落盘；同一份任务可以换引擎（claude / codex）或换模型对比；权限比 general-purpose 子 agent 窄（只放任务需要的工具，限定在项目目录）。
要不要切换、什么时候切，由 Dai 决定；切之前运维 prompt 一个字都不用改，启动器可以先并行试跑（例如对已经复盘过的局用 `--dry-run` 看提示，或在临时分支上跑一次经验更新做对比）。

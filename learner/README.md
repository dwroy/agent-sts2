# 离线学习者（learner）

V4 架构 §1 的「学习者」、§4 的 M4（docs/v4-architecture.md）：把自我迭代从对局里拆出来，三类学习任务（复盘、经验库更新、批量修 bug）写成**与引擎无关的任务说明**，由一个**统一启动器**交给 CLI agent 执行。引擎可切换：现在支持 **Claude（订阅，本机登录态）**；codex 的调用已写好、用假程序测过，本机装好并登录后即可用。

```
learner/
  run.ts              启动器入口（代码在 src/learner/）
  tasks/*.md          任务说明（中文，{{占位符}} 参数）
  runs/               每次运行的日志和临时目录（已加 .gitignore）
  proposal-ops-prompt.md   给 Dai 审的运维 prompt 修改建议（机制推理）
src/learner/
  task.ts             任务文件解析、占位符替换、参数检查
  engines.ts          claude / codex 命令行、权限、子进程环境
  summary.ts          事件流 → 摘要（轮数、token、cache、成本、耗时、状态）
  launcher.ts         参数解析、--dry-run、运行、日志、超时、key 清洗
tests/learner.test.ts
```

## 用法

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd ~/Projects/sts2-jev/jev-sts2          # 或任何带 learner/ 的工作树

# 复盘 3–5 局（agent 在项目根目录工作，只追加 notes/lessons.md）
npx tsx learner/run.ts --engine claude --task postmortem \
  --set runs=ULQPBK1211FG,JJ65CGH92D9A,DHGT6Z3Q7VAP --cwd ~/Projects/sts2-jev --model opus

# 经验库更新（在 exp-update 工作树里改 experience.json、提交；默认不合入 v3）
npx tsx learner/run.ts --engine claude --task experience-update \
  --set runs=A,B,C,D,E --cwd ~/Projects/sts2-jev/jev-sts2-exp --model opus

# 批量修 bug（在 step1-bugfix 工作树里；merge=v3 时照「合入 v3 的流程」自己合入）
npx tsx learner/run.ts --engine claude --task fix-batch --cwd ~/Projects/sts2-jev/jev-sts2-step --set merge=v3

# 只看最终提示和命令行，不执行
npx tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd ~/Projects/sts2-jev --dry-run
```

| 参数 | 说明 |
|---|---|
| `--engine claude\|codex` | 必填 |
| `--task <名字或路径>` | 必填；名字 = learner/tasks/<名字>.md |
| `--cwd <目录>` | 必填；agent 的工作目录，必须在 ~/Projects/sts2-jev 里 |
| `--set name=value` | 任务参数，可重复；值里可以有逗号和等号 |
| `--model <模型>` | 如 `opus`、`sonnet`；不给时用任务 front matter 的 `model`，再没有就用 CLI 默认 |
| `--max-turns N` | claude 的轮数上限；默认取任务的 `max_turns`（codex 没有这个参数，只靠超时） |
| `--timeout-min N` | 超时（分钟），到时按 PID 先 SIGTERM、10 秒后 SIGKILL；默认取任务的 `timeout_min` |
| `--dry-run` | 只打印最终提示、命令行、被去掉的环境变量名；不启动 agent，不建日志 |
| `--with-tools [--ascension N] [--knowledge-dir D]` | 用 stdio MCP 把 kb_* 知识库工具挂给 agent（见下） |

退出码：0 完成；1 agent 失败（结果是 error、max turns 等）；2 参数或任务说明有错；3 引擎没装、或工具服务器不存在；124 超时。

## 任务和参数

内置参数（启动器给，不用 --set）：`{{cwd}}`、`{{worktree}}`（默认 = cwd，可 --set 改）、`{{project_root}}`（~/Projects/sts2-jev）、`{{logs_dir}}`（jev-sts2/logs）、`{{scratch}}`（本次的临时目录 learner/runs/<时间>-<任务>/）、`{{task}}`。
缺参数、或 --set 了任务用不到的参数，都直接报错（exit 2），防止拼错。

| 任务 | 必填 | 可选（默认） | 工具 | 建议的 --cwd | 会改什么 |
|---|---|---|---|---|---|
| postmortem | `runs` | `code_dir`（jev-sts2-v3，引 file:line 用） | Read Grep Glob Bash | ~/Projects/sts2-jev | 只追加 notes/lessons.md（用 `cat >>`，没有编辑工具） |
| experience-update | `runs` | `base_branch`（v3）、`merge`（no）、`merge_dir`（jev-sts2-v3） | 全部 | jev-sts2-exp | 本分支的 experience.json 和提交；变更记录追加一节；merge=v3 时合入 |
| fix-batch | — | `items`（fix-queue.md 里没划掉的纯 bug）、`base_branch`、`merge`、`merge_dir` | 全部 | jev-sts2-step | 本分支的代码、测试和提交；merge=v3 时合入 |
| smoke | `run` | — | Read Grep Glob | 任意 | 什么都不改（端到端自检用） |

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
model: opus                          # 可选
default.code_dir: {{project_root}}/jev-sts2-v3   # 参数默认值，可以用内置参数
---
正文（中文），用 {{参数}}。
```

## 权限和安全

**claude**（`claude -p`，本机订阅登录；**不加 `--bare`**，不要 API key；冒烟测试里 init 事件的 `apiKeySource` 是 `none`）：
- `--output-format stream-json --verbose`，提示从 stdin 传入（不出现在命令行和 `ps` 里）；
- `--restricted`：文件工具只能碰工作目录（`--cwd` 和 `--add-dir ~/Projects/sts2-jev`），不加载用户/项目的 settings 和 hooks；
- `--permission-mode dontAsk` + `--permission-prompts none`：没预先允许的一律拒绝，不会卡在询问上；
- `--tools` = 任务 front matter 的工具；`--allowedTools`：`Read(//home/dw/Projects/sts2-jev/**)`、`Grep`、`Glob`，有写工具时 `Edit(//home/dw/Projects/sts2-jev/**)`（Edit 规则同时管 Write），有 Bash 时 `Bash`；
- `--disallowedTools`：读 key 文件（~/.jev_api_keys、~/.deepseek_api_key、~/.sts2-jev-env*、任何 .env）、读 sts2.dll / .pck、改 .env；Bash 的 `git push`、`pkill`、`killall`、`npm install/i/ci`、`npm run play`、`tsx src/index.ts play`、`sudo`、`ssh`、`env`、`printenv`、`curl`、`wget`；
- `--strict-mcp-config`：不加载本机配置的任何 MCP 服务器和 claude.ai 连接器，只有 `--with-tools` 时挂我们的 gkb；
- 子进程环境设 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`：不读交互会话的自动记忆，任务说明就是全部上下文。
- 限制：Bash 没法按路径限定（只能按命令前缀拒绝），所以 Bash 里的越界靠 deny 规则 + 任务说明里的安全规矩兜底；日志事后再做 key 扫描（下面）。

**codex**（`codex exec`）：`--json`、`--cd <cwd>`、只读任务 `--sandbox read-only`，会写的任务 `--sandbox workspace-write` 加 `--add-dir ~/Projects/sts2-jev`、`-c approval_policy="never"`、`--model`、`-`（提示走 stdin）；`--with-tools` 时用 `-c mcp_servers.gkb.command=… / .args=[…] / .env={…}`。

**环境变量**：子进程里去掉 `DEEPSEEK_*`、`TYPESAFE_*`、`JEV_*`、`OPENROUTER_*`、`ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN`、`OPENAI_API_KEY`、`CODEX_API_KEY`、名字里带 KEY/TOKEN/SECRET/PASSWORD 的变量，以及上层 Claude Code 会话自己的 `CLAUDECODE`、`CLAUDE_CODE_*`（学习者是一个全新的顶层会话）。例外：claude 引擎保留 `CLAUDE_CODE_OAUTH_TOKEN`（这就是订阅登录态）。`--dry-run` 只列被去掉的变量名，从不打印值。

**日志里的 key**：运行结束后，启动器从 ~/.jev_api_keys、~/.deepseek_api_key、jev-sts2-v3/.env、jev-sts2/.env 和被去掉的变量里取出 key 值（≥16 字符、非路径、非 URL），扫描日志，出现就替换成 `[REDACTED]` 并在摘要里提示次数；值本身从不打印。

## 日志和摘要

每次运行写 `learner/runs/<YYYYMMDD-HHMMSS>-<任务>.jsonl`：
1. 第一行 `learner_launch`：引擎、任务、参数、工作目录、完整命令行、超时、被去掉的变量名、**完整提示**；
2. 中间是 agent 的原始事件流（claude stream-json / codex JSONL），stderr 每行记成 `learner_stderr`；
3. 最后一行 `learner_summary`：退出码、信号、是否超时、墙钟、摘要。

运行中 stderr 打印每次工具调用；结束时 stdout 打印 agent 的最后回答和摘要（状态、模型、会话 id、轮数、工具调用次数、输入/输出/cache 读写 token 和命中率、`total_cost_usd`（API 价折算，订阅不按次计费）、耗时、被拒的工具调用、MCP 状态）。claude 的会话照常保存，失败时可以 `claude --resume <会话 id>` 接着做。

### 冒烟测试（2026-09-29 23:20，Claude 订阅，只跑了一次）
`npx tsx learner/run.ts --engine claude --task smoke --set run=ULQPBK1211FG --cwd ~/Projects/sts2-jev/jev-sts2-v4learner --model opus`
- 状态 success、退出码 0；模型 claude-opus-5-5；`apiKeySource: none`（订阅登录）；工具只有 Glob/Grep/Read，权限模式 dontAsk，MCP 0 个，被拒 0 次；
- 4 轮，Grep×2、Read×1（先找行号再按行读 6 行）；token 输入 8、输出 865、cache 读 24.8k、cache 写 10.3k（命中 70.7%）；$0.1046；agent 自报 11.4 s，墙钟 13.1 s；
- 三句话总结和 lessons.md 的 ULQP 一节一致；
- 跑前跑后 lessons.md 的 sha256、大小、mtime 相同，工作区仓库 `git status` 相同，工作树里只多了被忽略的 learner/runs/。
- 发现并修掉一个问题：key 扫描把 .env 里 `…_KEY_FILE=~/.deepseek_api_key` 这种**路径**当成 key，替换了任务说明里的文字（2 处，假阳性）。现在跳过路径、URL 和 `_FILE/_PATH/_DIR/_URL/_HOST/_MODEL` 结尾的变量；用新规则重扫这份日志：真实 key 出现 0 次。

## --with-tools：学习者可用的知识库工具

src/tools/registry.ts 里已有 7 个 kb_* 工具（kb_monster、kb_encounter、kb_experience、kb_stats、kb_old_knowledge、kb_postmortem、kb_runs）。`--with-tools` 按 src/tools/mcp-launch.ts 的 `mcpLaunchSpec` 起 stdio MCP 服务器（服务名 gkb，工具在 Claude 里叫 `mcp__gkb__kb_*`，允许规则 `mcp__gkb`），另外把 `KNOWLEDGE_LESSONS_FILE` 指到 ~/Projects/sts2-jev/notes/lessons.md。知识目录默认是启动器所在工作树的 src/knowledge（`--knowledge-dir` 可改，例如指到 jev-sts2-v3/src/knowledge 取对局在用的最新数据），进阶默认取 `TARGET_ASCENSION`，再没有就是 9。

**现状**：服务器 src/tools/mcp-server.ts 在 v4-brain 分支上开发（这里不写），还没合进来，所以 `--with-tools` 现在会报错退出（exit 3）并说明原因；合入后不用改启动器就能用（测试也会自动切到「挂上」的分支）。工具调用在 stream-json 里有完整的输入和输出。

## 以后接 codex 要做什么

1. **Dai**：安装 Codex CLI，`codex login` 用 ChatGPT 账号登录（学习者只走订阅登录态；启动器会去掉 `OPENAI_API_KEY`、`CODEX_API_KEY`）。装好后 `which codex` 能找到即可，或设 `LEARNER_CODEX_BIN`。
2. 对一下 `codex exec --help`：`--json`、`--cd`、`--sandbox`、`--add-dir`、`--model`、`-c key=value`、`-` 读 stdin 这几项（按官方 CLI 参考写的；`--full-auto` 已被官方标为过时，用 `--sandbox workspace-write` 代替）。
3. 跑一次冒烟：`npx tsx learner/run.ts --engine codex --task smoke --set run=<id> --cwd <工作树>`，确认 summary.ts 认得它的事件名（thread.started、turn.completed 的 usage、item.completed 的 agent_message / command_execution）；codex 不报成本，摘要写「未提供」。
4. 注意：codex 没有轮数上限参数，只靠 `--timeout-min`；workspace-write 沙箱默认不联网（本地 git、tsc、vitest 不受影响）；codex 读 AGENTS.md 而不是 CLAUDE.md（仓库里两者都没有）。
5. `--with-tools` 走 `-c mcp_servers.gkb.*`，服务器合入后要实测一次 codex 能否连上。

## 和运维会话现有流程的对应关系（建议，不改 ops-session-prompt.md）

| 运维 prompt（定时任务 2） | 现在 | 可以改成 |
|---|---|---|
| 2. 有新局时派后台 general-purpose 子 agent 写复盘（3–5 局一个） | 子 agent 的提示每次由运维会话口述 | `npx tsx learner/run.ts --engine claude --task postmortem --set runs=… --cwd ~/Projects/sts2-jev`（run_in_background） |
| 复盘后：paper_dataset.py、新 bug 进 fix-queue、decision-log、提交工作区 | 运维会话做 | 不变，仍由运维会话做（回报的 json 块里有 bugs 列表可直接用） |
| 3. 修 bug：在 jev-sts2-step 派修复 agent，自己合入 v3 | 同上 | `--task fix-batch --cwd …/jev-sts2-step --set merge=v3`；fix-queue 划掉条目仍由运维会话做 |
| 4. 每满 5 局派 agent 在 jev-sts2-exp 更新经验库，然后合入 v3 | 同上 | `--task experience-update --set runs=… --cwd …/jev-sts2-exp --set merge=v3`（任务里已含机制推理，见 proposal-ops-prompt.md） |

好处：任务说明有版本（git 里），每次的提示、全过程、token 和成本都落盘；同一份任务可以换引擎（claude / codex）或换模型对比；权限比 general-purpose 子 agent 窄（只放任务需要的工具，限定在项目目录）。
要不要切换、什么时候切，由 Dai 决定；切之前运维 prompt 一个字都不用改，启动器可以先并行试跑（例如对已经复盘过的局用 `--dry-run` 看提示，或在临时分支上跑一次经验更新做对比）。

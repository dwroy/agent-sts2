# Claude 引擎的隔离实测（2026-09-29）

Claude Code 2.1.283，本机登录态（订阅），模型 claude-sonnet-5，effort low。每次都是一次真实的 `claude -p`：
`--output-format stream-json --verbose --include-hook-events`、`--json-schema`、`--system-prompt-file`（一句测试用系统提示）、
`--tools ""`、`--strict-mcp-config --mcp-config`（我们的 MCP 服务，挂一个假工具 kb_probe，返回固定暗号）、
`--allowedTools mcp__gkb`、`--permission-mode dontAsk`、`--no-session-persistence`；工作目录是空的临时目录；
子进程环境只留 PATH/HOME/USER/LOGNAME/SHELL/LANG/TERM/TMPDIR（外加 MCP 需要的变量）。

提示词让模型做三件事：调用 kb_probe 报暗号；用任何可用工具读 /etc/hostname；把除用户消息以外收到的全部文本
（系统提示、记忆、CLAUDE.md、hook 输出、system reminder、技能/agent 列表）逐字抄进 context_seen，并列出可调用的工具。

验证方法有两条互相印证：stream-json 的 `system/init` 事件（实际加载的工具、MCP 服务、插件）和
`--include-hook-events` 输出的 hook 事件；以及模型自己复述看到的上下文。全局记忆 hook 的输出以
「# 全局记忆 (中央库 global/ — 跨项目通用)」开头，在整个输出里搜「全局记忆」判断是否漏进来。

| 变体 | hook 事件 | 「全局记忆」出现次数 | init 里的工具 | 我们的 MCP | 插件 | 读 /etc/hostname | 调了假工具 | 结论 |
|---|---|---|---|---|---|---|---|---|
| 对照：两者都不加 | SessionStart ×3（含全局记忆注入）、Stop ×1（跑了记忆同步脚本） | 3 | StructuredOutput, mcp__gkb__kb_probe | connected | finance, product-management, data + 内置 | 做不到 | 是 | 不隔离：用户记忆和插件都进来了 |
| `--safe-mode` | 无 | 0 | 只有 StructuredOutput | **被一起关掉**（mcp_servers 为空） | 仅内置 | 做不到 | 否（工具不在） | 隔离了，但把 --mcp-config 也关了，不能用 |
| `--setting-sources ""`（采用） | 无 | 0 | StructuredOutput, mcp__gkb__kb_probe | connected | 仅内置（agents-md、telemetry） | 做不到（“no file-reading tool available”） | 是（暗号正确，服务端有记录） | 采用 |
| `--bare`（无 ANTHROPIC_API_KEY） | 无 | 0 | StructuredOutput, mcp__gkb__kb_probe | connected | 仅内置 | - | - | 不读登录态，直接「Not logged in」，没有发出模型请求 |

采用组合（`--setting-sources ""` + `--system-prompt-file` + `--tools ""` + `--strict-mcp-config`）下模型报告看到的上下文，
除了我们的系统提示和用户消息，还有 Claude Code 自己加的：

- 系统提示前面的一句身份说明（“You are a Claude agent, built on Anthropic's Claude Agent SDK.”）；
- 环境说明（临时工作目录、不是 git 仓库、平台、shell、系统版本）；
- 模型名和知识截止日期、token 余量、今天的日期；
- 登录账号的邮箱（userEmail 段，来自登录态；`--bare` 可去掉但它要 API key，已按 Roy 的决定不用）。

没有 CLAUDE.md、没有自动记忆、没有 hook 输出、没有技能或 agent 列表。内置工具（Read、Bash 等）不在工具列表里，
读文件的请求被模型自己说明做不到。

实测花费（API 价格等价，订阅下不实扣）：采用组合一次 $0.0139（cache write 1,429 / cache read 1,335 / output 792），
对照一次 $0.0323，safe-mode 一次 $0.0126。

引擎实现：src/brain/engines/claude.ts（--output-format json，其余参数同上；工具走 stdio 版 MCP 服务，调用记录由服务写文件带回）。

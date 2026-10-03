# Codex 引擎的隔离实测（2026-10-03）

codex-cli 0.160.0（npm @openai/codex，~/.local/node/bin/codex），家目录 ~/.codex（Dai 的 ChatGPT 订阅登录，prolite），
模型 gpt-6.1-sol，effort xhigh。引擎：src/brain/engines/codex.ts（参数见 codexArgs / codexConfig / CODEX_DISABLED_FEATURES）。

## 方法

1. **金丝雀家目录**：临时 CODEX_HOME 里放会被加载的东西，每样带暗号：AGENTS.md、hooks.json（SessionStart /
   UserPromptSubmit / Stop / PostToolUse 四个钩子，触发就写标记文件，并注入 CANARY_HOOK_CONTEXT）、config.toml（memories、
   hooks 打开，developer_instructions，一个启动就写标记的 MCP 服务）、memories/memory_summary.md、skills/canary-skill、rules。
2. **假 Responses 端点**（codex-isolation/fake_responses.py）：codex 用 `-c model_provider=…` 指到本机端口，端点只记请求体
   （不记请求头），回固定答案。这样能看到 codex 实际发给模型的全部内容：instructions、input 各条消息、工具清单、schema。
3. 对照（不加隔离参数，还加 `--dangerously-bypass-hook-trust` 让钩子必跑）与隔离（引擎的参数）各跑一次；再在真实的
   ~/.codex 上用假端点跑一次（codex-isolation/request-real-home.jsonl），最后用 Dai 的登录真跑一次。

## 结果

| 变体 | 钩子标记 | MCP 启动 | 请求里的暗号 | 工具 | 额外请求 |
|---|---|---|---|---|---|
| 对照（金丝雀家目录，无隔离参数） | SessionStart、UserPromptSubmit、Stop 都触发 | 是 | AGENTS.md、config 的 developer_instructions、hook 注入、memory_summary、skill | `exec`（JS 代码模式，内含 apply_patch、clock）、`wait`、`request_user_input(_async)`、collaboration（spawn_agent 等 6 个） | 有：一次 gpt-5.6-terra 的 memory_consolidation 子任务 |
| 只加 `--ignore-user-config` 和各 `--disable` | 无（加了 bypass-hook-trust 也无） | 否 | 只剩 AGENTS.md | 仍有 `exec`、collaboration、`request_user_input` | 无 |
| 引擎全部参数（金丝雀家目录） | 无 | 否 | 只剩 AGENTS.md（见下） | **无**（additional_tools 为空） | 无 |
| 引擎全部参数（真实 ~/.codex，假端点） | 无 | 否 | 无 | 无 | 无；~/.codex 里没有文件被改 |

隔离下的请求只有两条消息：developer = 我们的系统提示（model_instructions_file 取代 codex 自己的基础提示），
user = v3 的用户消息；`text.format` 是严格 json_schema；`reasoning` = {effort: xhigh, summary: auto}；`store: false`。

要点：

- gpt-6.1-sol 的模型目录条目是 `tool_mode: code_mode_only` + `multi_agent_version: v2`，靠 feature 开关关不掉工具；
  引擎每个进程读一次 `codex debug models`，把该条目的 tool_mode、multi_agent_version、experimental_supported_tools、
  apply_patch_tool_type 置空后用 `model_catalog_json` 传回（上下文窗口等其余字段不动）。
- `request_user_input` 要 `-c tools.experimental_request_user_input={ enabled = false }` 才去掉。
- **全局 AGENTS.md 关不掉**：codex 不论参数都读 $CODEX_HOME/AGENTS.md（或 AGENTS.override.md）。今天 ~/.codex 没有；
  引擎每次调用前检查，有非空的就拒绝这次调用（unavailable，问题交给 BRAIN_FALLBACK），开局检查也会报出来。
- codex 对不认识的配置项只给警告（"ignoring … unrecognized configuration setting"），对不认识的 feature 直接报错；
  引擎把这两种都当作隔离不成立，拒绝调用，不用它的答案。
- SQLite 状态和日志用 `sqlite_home` / `log_dir` 指到 /tmp/jev-brain-codex-state，不写进 ~/.codex。

## 真实调用

| 调用 | 用时 | 输入 / 缓存 / 输出 / 推理 tokens | 结果 |
|---|---|---|---|
| Dai 的冒烟（codex 默认参数，无隔离） | 7.2 s | 14,277 / 12,288 / 5 / 0 | "ok" |
| 隔离参数，"reply with the word ok"，schema {answer} | 7.4 s | 60 / 0 / 37 / 20 | {"answer":"ok"}，有推理摘要 |
| 引擎本身（CodexEngine.decide，pick 题，严格 schema） | 9.0 s | 267 / 0 / 90 / 52 | {"choice":"a","reason":"ok"} |

60 tokens 的输入说明 codex 自带的约 14k tokens（基础提示、权限说明、技能清单、多代理说明、环境信息、工具定义）都没进去。
事件流里只有 thread.started、turn.started、reasoning、agent_message、turn.completed，没有工具项；流里不报限额。
限额另用 `codex app-server` 的 account/rateLimits/read 读：prolite 计划只有一个 7 天窗口（usedPercent），另有 credits 余额。

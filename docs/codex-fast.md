# Codex 默认配置

Roy 于 2026-10-11 要求所有 Codex 默认统一为 `gpt-6-astra` / `xhigh` / normal（关闭 Fast），context 上限 **512000 tokens**。这取代 10-09 全体 Fast、10-10 仅 learner 关闭 Fast 的旧策略。

对局 exec、app-server、learner、ops 初始化/resume/herdr TUI 均显式传入 `service_tier="default"`、`model_context_window=512000`、`model_auto_compact_token_limit=460800`；对局 thread/start 和 turn/start 同样使用 normal tier。Codex CLI 0.162.1 的隔离 config/read 已接受并回读这些字段，无模型调用。512k 是客户端配置上限，服务端实际支持不能仅由该回读证明；CLI 为输出等保留空间时可显示更低的有效窗口。

默认模型和推理强度仍可由明确的调用参数覆盖；历史 root 包装器 `ops/codex-fast.sh` / `ops/codex-learner.sh` 将旧启动器的覆盖统一为本次策略。名称保留，避免破坏已有租约工作树的入口。包装器不改权限、登录目录或 `--` 后的 sandbox 子命令。

全局 `~/.codex/config.toml` 与 `~/.codex1/config.toml` 的共享目标也已只读核实为 Astra / xhigh / default / 512000；项目隔离启动器不依赖该文件，仍保持 `--ignore-user-config` 等隔离措施。不改凭据、任务知识或运维 prompt。

正在进行的调用正常完成；新对局进程、新 learner 批次和 ops 下次启动/resume 加载新默认。当前已启动的进程不会因磁盘配置修改而自动切换。实际生效边界以 run-config、模型回报和上线回执为准，配置记录不冒充 512k 服务端实测。

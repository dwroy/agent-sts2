# Codex Fast 模式

Roy 于 2026-10-09 授权所有 Codex 会话使用 Fast，包括运维、学习者和对局大脑。
安装的 Codex CLI 模型目录将 Fast 对应到 `service_tier="priority"`；这项设置改变服务档位，保留原模型与推理强度。

对局的 exec 与 app-server 启动器显式传入该档位；app-server 的 `thread/start` 与每次 `turn/start` 也显式传入 `serviceTier="priority"`。
旧 `BRAIN_CODEX_SERVICE_TIER=default` 不再覆盖本次全局策略。实际档位仍写进 `run-config` 和缓存指纹，以便区分生效边界。
该配置对铁甲战士和静默相同，不增加游戏知识。

学习者的直接启动器、运维的初始化、resume 和 herdr TUI 启动器均显式设置 Fast。
调度器启动学习者时通过 `ops/codex-fast.sh` 调用原 Codex 程序，所以已有历史工作树的下一批也采用 Fast，不需要改写其任务源码。
该包装器仅过滤原生 CLI 的服务档位覆盖，保留 `--` 后的 sandbox 子命令，继续使用原权限、登录目录、模型和推理强度。

正在进行的调用会正常完成。对局在下一局加载新配置，学习者在下一批加载，运维 TUI 在空闲时沿既有启动参数变更流程重新打开同一会话。
不打断对局或学习者，不重启服务。原生请求发出了 Fast 不等于证明服务端保证某一耗时或缓存命中率。

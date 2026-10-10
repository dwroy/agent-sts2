# Codex Fast 模式

Roy 于 2026-10-09 授权所有 Codex 会话使用 Fast，包括运维、学习者和对局大脑。
2026-10-10 Roy 将学习者单独改为 `gpt-6-astra` / `xhigh` 并关闭 Fast；运维和对局继续使用原设置。
安装的 Codex CLI 模型目录将 Fast 对应到 `service_tier="priority"`；这项设置改变服务档位，保留原模型与推理强度。

对局的 exec 与 app-server 启动器显式传入该档位；app-server 的 `thread/start` 与每次 `turn/start` 也显式传入 `serviceTier="priority"`。
旧 `BRAIN_CODEX_SERVICE_TIER=default` 不再覆盖本次全局策略。实际档位仍写进 `run-config` 和缓存指纹，以便区分生效边界。
该配置对铁甲战士和静默相同，不增加游戏知识。

运维的初始化、resume 和 herdr TUI 启动器继续显式设置 Fast。
学习者直接启动器使用独立的 Astra / xhigh 默认值，保留 `--ignore-user-config`，不传 `service_tier`；这表示不请求 Fast，不用未核实的 `standard` / `default` 字符串代替原生默认。
调度器显式向历史工作树启动器传 `--model gpt-6-astra --effort xhigh`，并通过 `ops/codex-learner.sh` 去掉其旧的服务档位覆盖。
包装器保留 `--` 后的 sandbox 子命令、权限、登录目录及任务源，并处理继承的旧 Fast 包装器，避免递归；不用改写已有租约工作树。
仍由旧 live 调度脚本进入 `ops/codex-fast.sh` 的调用，只有明确声明 learner 权限配置时才转入新包装器；运维、对局或仅继承 `LEARNER_*` 环境的其他调用继续 Fast。
新包装器对 learner exec 的旧模型/推理覆盖统一为 Astra / xhigh，并在替换旧值时向 stderr 写有效策略；历史启动器自身 JSONL 中的旧模型字段不代表 native CLI 最终参数。sandbox 自检只去除服务档位，保留权限和子命令。

正在进行的调用会正常完成。对局在下一局加载新配置，学习者在下一批加载，运维 TUI 在空闲时沿既有启动参数变更流程重新打开同一会话。
不打断对局或学习者，不重启服务。原生请求发出了 Fast 不等于证明服务端保证某一耗时或缓存命中率。

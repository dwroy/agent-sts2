#36 补交：学习大脑交互 TUI 与对局大脑实时直播

沿原分支、原交付 60e0ed688 继续实现 Roy 在 issue 中追加的两项范围；原初版材料保持原样。本补交不以初版完整绿替代新增源码验证。

- 学习新批次：专属 tab 中运行真正的 Codex 交互 TUI，原任务由 herdr 发送；大提示从原完整文件读入。原账号 home、模型/强度参数、任务渲染、权限/key 预检、工作树和完成审计保留。后台原 wrapper 持批次租约，模型 PID/birth、原生 session/turn 另有回执。启动脚本只保存白名单角色设置；不继承 herdr server 环境或任意环境变量。交互 CLI 无 exec 的忽略配置参数，故沿既有配置检查器拒绝继承 MCP/额外指令等非被动配置，零模型启动，保留现场交原 ops，不改共享配置。
- 学习结束：匹配原提示的原生 task_complete、真实空闲/空输入框、无后续原生活动后才退出本批 TUI。原日志 SHA/summary、原生完成记录、原 .out 刷新和 PID 退场核实后执行原 finish 事务；登记终态且持久化原件后才关本批闲置 tab。失败与超时保留分类及原件。身份变化、未发人类文本、发送/退场不确定均不报 done、不重开、不回收，监管租约保留等原 ops。learner-log-tab 返回新批已有 TUI，不另开镜像；旧在途 headless 与原日志镜像保持。
- 错误接续：容量/限流/断流报错空闲时，原批、原账号/线程、有效租约下十分钟退避接着做，不重启会话。三次无原生工具进展后再观察完整退避，停止自动提醒并排队给原 ops/Roy；排队不当送达。发送回执不确定只等匹配原生用户消息核实。原任务期限继续，失败回合缺少结束行不算完成。令牌按各原生回合最后用量快照去重累计。
- 对局直播：直接在既有 Codex 通知、dsh 流式观察器和工具宿主接只读观察回调，没有新增模型、客户端、线程输入或连接。Codex 仅广播提供方公开摘要/正文增量，raw reasoning 继续只参与原 stall 检测。每题开头、工具开始/返回、参数形状、字节/摘要/耗时、尝试答案与路由最终接受/拒绝、兜底/错误/卡住均追加脱敏文本；不 await 磁盘、不调整原计时或答题预算。
- 存储与视图：logs/brain-live/<run_id>/current.txt 每份最多 4 MiB，滚到 previous.txt，单局共最多 8 MiB，待写队列 128 KiB；积压留缺口说明，写失败停 writer、答题继续。不同局保留独立文件，沿原 logs 保留边界处理。tab 仅 tail 脱敏文本，未有文件时兼容旧 brain/brain-wait 日志。凭据/外部玩家字段、终端控制与分块敏感文本在落盘前处理；完整 payload 和查询参数正文不展示。

验证证据：

| 检查 | 结果 | 原日志 |
|---|---|---|
| 定稿集合（16 文件） | 218 项通过 | checks/targeted-final-2.log |
| 后续环境/配置隔离及公开摘要增量（5 文件） | 54 项通过 | checks/delivery-delta-final.log |
| 最终源码生产 tsc --noEmit | 0 | checks/tsc-delivery-final.log |
| shell / Python 语法 | 0 | checks/shell-syntax.log、input-readback.json |
| 固定直播样例 | 由真实 writer 生成、无模型/对局 | generate-sample.mts、view-stream-sample.txt |

两轮定向检查均 nice 19、单 fork worker、无文件并行；不是完整套件。前轮 16 文件输入在 tested-inputs-218.json；其后仅 learner/lib/herdr.ts、对应测试、Codex 公开摘要筛选及对应测试、说明文字变动，由最终 5 文件复核；最终 40 个输入 SHA 在 tested-inputs.json，末次读回见 input-readback.json。Python wrapper 内含固定回执/启动身份及流视图测试，不加算成独立 Vitest 用例。

保留所有过程失败与中止日志：早期 fixture 清理等待已退出子进程的 close 事件，原 targeted-1 停止/143；之后修正 fixture、实际空闲状态竞态和 shell 退场等待。learner-regression-1 的三个失败由从仓库根运行、旧测试相对 agent cwd 寻址失败引起；原件不改写，其后统一从 agent 运行。最早直播定向一次使用不支持的 BRAIN_FALLBACK=off 固定配置，已修正；旧失败不计绿。

本补交遵守 Claude 的重任务窗口指示，没有再启动完整 Vitest。初版的 654 文件 / 6167 通过 / 2 跳过只覆盖 60e0ed688，新增范围的完整组合检查仍由原集成员协调。ops 已报告 #33 首次组合 full 失败、原驱动终局并撤销旧 #36 合入窗口；未把失败或撤销当发布准入。

开发没有运行 play、启动真实学习模型、创建生产视图、修改 live/STOP、共享账号/home/config/hosting 或关闭其他会话。生产 brain_view 仍沿 ops 原 off 门。自然对局直播滚动/换局、真实学习 TUI 原任务及实际强度、真实完成产物/退场/关 tab、#33 后续组合完整检查仍待原集成员/ops 上线链验收，不冒称已自然验证或已合入。

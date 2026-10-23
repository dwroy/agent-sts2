# #20 学习 tab 回收类补交

来源：[Roy 经 Claude 的裁决 6355664194](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6355664194)。wrapper 只写原批次终态与回执；回收任务在原 stall tick 扫描终态学习 tab、保存尾日志、关闭并释放槽位。学习 checkout/scratch 仍交原 retention worker 的入库/检查/引用门，不能据关 tab 关闭父项。

公共父 `e1204dcf92508079730e6c0fbf994ee3dc84e979`。新增 STS2 adapter `ops/learner_tabs.py`；`ops/codex-ops.sh` 在 stall 的 drain 前串行调用，独立于 ops 模型忙碌、GitHub/API及 board on/off，不加 cron/模型。原 PAUSE/LLM_DRAIN/RETENTION=off 保持。正常待 supervisor 退出/动作前锁忙 queued/0，异常逐项 retained 并向主管收件箱写一行，按身份与原因去重。worker 本身异常非零，用独立故障通知回执保护坏主 journal；调度器外层超时亦有去重通知。

`.agents/board.yaml` 将 learner 整类保护改为 `running-panes: learner-*`，`issue_session_support.Board.protect` 解释此规则：非终态受保护；ops/集成员/live 永久保护继续。仅扫描 sts2-run 的“学习大脑 · …”/旧learner-*，唯一核原批次、host、workspace/tab/pane/terminal、原 shell/PID birth。running 只观察清单，不读该 pane 输入、不触碰。终态但缺身份/落盘回执/原件、人工输入、失权、活动命令/后台工作、75/124、原回合未结束或关 tab 回执不确定均保留。

封存入口 `seal --root ROOT --state-dir DIR --batch BATCH` 已与 #36 开发线在[6355696196](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355696196)、[6355737731](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355737731)、[6355838712](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355838712) 对齐：只允许原 supervisor 直接调用；其原 finish/输出持久化完成后写 schema learner-tab-retirement-v1。正常/取消核 #36 的真实 verify_native、summary/session/rc、原生 task_complete/turn_aborted、原始 log/output/err/rollout SHA；零模型 code3/rc3或原 launcher 的 rc1 映射仍是失败，不冒成功。回收等 supervisor 实际退出，保存尾日志后重核所有证据和输入，再 sending→关闭→读回 tab 缺席→释放同一 host 登记→done。回执丢失保持 sending，禁止自动重关，交原 ops 对账。

本机只读接口核到 pane get/list 没有 label，label 在 tab list；adapter 沿原 host label 和 tab 标题核同，不要求不存在的字段。空 bash 除前台=shell外，还须无子进程、标准可见空提示符；Codex 须原 agent/PID、done/idle、空 composer 与原回合结束。seal 后 activity revision 改变也保留，防止后续人输入再回到空提示符。未知 prompt/权限不足等按异常保留，不猜测安全。

固定检查（nice19、串行，未对生产执行 seal/tick/关闭，也无真实模型/游戏调用）：

- 新 adapter 最终24项通过，调用精确 #36 `c8ff9caf5:ops/learner_tui.py` 的真实 verify_native，pane/proc仅夹具；见 adapter-final.log.2。早期16项时漏 stub helper 导致一项 /proc/333/exe PermissionError，补夹具后通过，初次仅会话工具回执，无保存原始日志；不造原件、不称旧运行全绿。
- 原 issue lifecycle 64项通过，见 lifecycle.log；原 scheduler 夹具新增学习类、board on/off/invalid与暂停覆盖，确认 held wake.lock（ops忙）不挡回收。外层超时通知新增后仅重跑相关 Scheduler 1项通过，见 scheduler-final.log，不扩大full。
- 生产 tsc退出0（tsc.log为空）、bash -n通过。最终源码/原验证器/log SHA见 inputs.json与verification.json。
- gitleaks 发前扫描新源码/材料、staged diff、外发正文；未跑完整 Vitest。最终组合完整检查仍归集成员原窗口。

公共改动10个功能/说明文件逐项列于 inputs.json，另加本材料及decision-log；没有修改 #36 wrapper/learner_tui/原生绑定代码或运维 prompt。顺带完成集成员指出的 kit README旧 queued句矛盾：上游 `6662c1726501610e489b3d93eef8b82383feff7f` 只有一行文档修订，dispatcher运行代码仍同7e5a408，不据此另跑kit/full。

影响 live 启动：否（本次只改学习/回收调度，父 #20 启动发布交付仍为是）。未改 main/live/STOP、生产安装/开关/原journal/真实收件箱、账号或其他会话。未回收任何真实 pane。#36 wrapper 新交接采用是前置；集成员按原队列组合验收，ops 安装后核真实下一 stall tick。历史 tab 若没有可核封存证明保留，不能由本开发补造；旧批处理状态以[ops原回执6355851746](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355851746)为准，本报告不把其人工处理记成本代码验收。原#37→#20组合顺序、冲突/最新知识与完整检查、默认关闭项和所有实际采用待办仍保留。

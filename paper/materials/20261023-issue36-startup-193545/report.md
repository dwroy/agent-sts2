# #36：193545 启动确认与迟到原生轮的监督

## 原件核查

主管提醒提出“193545 两批输入排队约 7.5 分钟，监督退出后才起第一轮”。现有原件不支持将这段时间归给同一个原生实例。

ops 评论 [6364152025](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6364152025)、`paper/materials/20261023-1926-ops/startup-environment-recovery.json` 和两份原 ANSI 屏幕一致：19:35 的 pCM/pCN 停在 `TERM=dumb` / `Continue anyway? [y/N]:`，旧 receipt 都是 submitted=false、bindings=[]、无 session。submissions 数组中存有计划任务的 marker/hash，不能代替 submitted 或原生接受证明。未核到旧实例的 `Queued follow-up inputs` 原屏幕，相关描述保留为待查现象，不能用之后的画面反推旧实例接受过任务。

ops 19:42 停掉两个未提交的启动实例，19:43:05 沿同 batch/worktree/task/pane 使用 TERM=xterm-256color 恢复。新原生 PID 2124394/2124414 与旧 PID 2088293/2088297 不同；marker、任务 SHA 也不同。19:43:10 是新 session 创建时间和 rollout 文件名时间；实际 task_started/turn_context 在 19:44:06–09。两新 session 的 cli_version=0.164.0，原生 turn_context=gpt-6.1-sol/high，各有唯一完整任务绑定。

只读核到新 supervisor 2123767/birth18031520、2123771/birth18031521 和两新原生 PID/birth 均存活，cwd 匹配。两份新 receipt/native 离线回放接受；旧 receipt 配新 native 均拒绝 75。不能把新实例的任务补给旧监督。ops 已明确两批继续运行；开发没有发送、清空、停止或重开任何任务，也没有修改原回执、登记或生产。

冻结输入 SHA、原/新代际对照、原生时间线与 PID/birth 观察见 evidence.json。完整原生任务、ANSI 和日志仅存本树忽略目录 `.artifacts/issue36-startup-193545/`。本次不能判定普遍的排队现象来自 Codex 初始化、Herdr 提交时机或其他原因；TERM 个例与 17:13/17:43/17:50 的正常批次也不能互相外推。

## 补丁

1. 只在学习者隔离的 TUI 环境里，把缺省、空白和 dumb TERM 补为 xterm-256color；显式可用 TERM 和调用者环境保持。不给启动确认输入答案，不改共用配置、账号、权限或服务环境。
2. 学习者屏幕检查明确使用 Herdr visible source。`Queued follow-up inputs` 标题即使伴随空 composer，也不能授权命名、发送、重试或退场。每次外部动作前继续核同 pane/terminal/PID/birth/lease 和原生归属。
3. 已经发送的任务在 120 秒仍未绑定时持久化 awaiting-native、发 attention，原监督继续被动轮询同一 marker。接受截止从 120 秒改为 600 秒；该 10 分钟工程预算覆盖主管提出的 450 秒固定回归，并不是从本次真实实例测得的排队时长。receipt 在发送前登记 warn/deadline；每次显式 continuation 独立计时。调用者原任务截止若更短，仍优先生效。
4. 观察期间不重发任务、不补 Enter、不发送按键；屏幕队列或 API 成功都不能接受任务。仍须原生完整 prompt SHA/marker/cwd/turn 建立唯一绑定，再按原流程收尾。租约或 pane 改变、foreign turn 和绑定后的真实草稿/排队仍拒绝后续控制。

10 分钟观察预算到期后仍保留原会话，以原 rc75/不可退场事实交给 wrapper 的 300 秒 verify/defer；原 canonical awaiting_review/inbox 与释放监督槽位流程保持。轮询中的单次 transport 调用仍有原 20 秒超时。此改动延长了缺确认批次持有槽位的预算，告警于 2 分钟发出，避免无声延长；未无限等待或创建额外模型/观察服务。超过硬截止才开始的原生轮仍需 ops 沿原待核事务处理，不自动认领或改写已退出监督的合同。

## 检查与交接

tsc=0，5 个定向文件 205 项通过；nice19、单线程 worker，不跑 full 或真实模型。选定的 11 条 TERM/queued/450 秒回归在旧生产源码全部失败。35 秒、450 秒两种候选文件顺序、软告警后原轮绑定、API 回执不确定后的迟到绑定、600 秒无绑定上限、较短任务截止、真实草稿、排队及软告警前后 lease/pane 变更均覆盖；原 ownership/prelude/reconciliation/launcher 检查保留。命令、日志 SHA 见 checks.json。

仅交两源码叶 learner/lib/herdr.ts、agent/tests/learner-herdr.test.ts 及本报告材料/追加决策；由集成员核当前 main/live 组合，ops 原发布通道上线。193545 的原启动失败/300 秒 defer 和恢复历史保留，不用新回归代替自然批次验收；#36 仍需后续实际发布与自然迟到轮证据。

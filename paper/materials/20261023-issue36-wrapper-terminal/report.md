# #36 P0：真实绑定回放、有界核验与 wrapper 终态交接

依据主管 [6355920170](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355920170)、wrapper 不关 tab 更正 [6355664518](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6355664518) 及 ops 队列命名补充 [6356069735](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6356069735)。基线 c8ff9caf5；此前 6a5d049f0 + 76b41d6d7 + c8ff9caf5 原绑定补丁保持，不能只取本轮差量冒充完整绑定修复。

## 四份真实回执：旧红、新绿

从原 ops 已冻结的 032433 四批真实 receipt/native 复制到本地忽略材料，先核与其 four-current-native-audits.json 原 SHA 相同。没有读取新模型正文、发任务、写生产原件或调用 Herdr。

R416 实际 3849fcb8a 与 6ec71c313 的 learner/lib/herdr.ts blob 均为 c18c7646d20beb08c41c510afb835b4eeb39fc0f；回放使用此精确旧源码，未改其解析逻辑。四批均在第 6 行的两段 AGENTS/environment_context bootstrap response_item user 首次置 foreign，后来的正确完整 marker/SHA 因而不能接受，bindings 为空。旧解析器全部拒绝；当前修复全部 accepted/complete、open=false、foreign=false、恰一绑定；独立 Python verify_native 用内存/离线重建副本全部通过。四份实际 session/cwd、短名绑定和原提示 SHA 核同，排除这四份证据里的账号路径、rollout 命名、短名或 session_meta 失配原因。

两份先前早期快照尚未 complete 的历史结论保留；本轮使用 ops 10:12 冻结的完成原件，不能把本轮完成状态回填早期快照。结果见 four-real-replay.json，原 receipt/native SHA 未变。重建证明不授权改写旧75、不代产物/处置权/finish/自然采用；实际四旧批恢复归原 ops 回执。

## 本轮代码

- wrapper 默认核验上限 300 秒，LEARNER_TUI_VERIFY_TIMEOUT_S 可设 1–3600 秒；单次核验 subprocess 也被同一截止时间约束，避免一次读取卡住穿透期限。到期先持久化 BATCH.verification-deferred.json，原 learn.lock 下将自己的 running 批次变为 awaiting_review，不写成功/finished/rc；写 inbox-claude.md 一行后 supervisor 退出，释放逻辑学习槽位。原 receipt/75、pane、进程、输出与工作树保留，未按未知状态关闭或杀模型。
- learn.lock 最多再等 2 秒，忙时待核日志先落盘；下一原调度 load_state 在 lost/重试判断前应用同一原注册记录。不同 supervisor/注册不接管。待核原 postmortem 局号、普通任务 key/相同输入、feature 与 Boss 请求不自动重派；不计普通 running 容量，无关新任务仍准入。awaiting_review 是待核状态，不能交 #20 当可回收终态。
- 原 native/summary/日志 SHA/PID/完整 marker 与提示正文验证仍先于原 finish。预检零模型明确 code3，记录 launcher 1→原结果3 的已知映射，空 out 也持久化 SHA；不能把含模型活动的回执降成 not-started。回执原子替换、fsync 文件/目录、权限600。
- finish 成功后再核真实终态、原直接 supervisor PID/birth、pane、label 和 cwd，写 wrapper v1 完成段及批次快照 SHA。wrapper 不再调用 close，只直接调用 #20 seal CLI。缺 helper/封存失败只通知并保留，不回退关 tab，不改失败为成功。零模型沿原 finish/retry 策略，不复制已消费任务。
- 按 #20 当前真实 API 合同，pane 无 label 时只经原 host 登记的 pane/workspace、唯一 tab 标题读回核身份，标题改变/多 pane/证据缺失拒绝。identity 保留真实字段，不伪造 label。旧 pane.label 原件仍兼容。postmortem label/回执带 -postmortem，batch key 不带。
- attention 改成 epoch-ns-learner-tui-attention-UUID.md，事件类型固定字母开头；实际 readQueue 正例读回，数字开头 UUID 旧反例仍隔离。wrapper 异常事件也遵循原队列语法并去重；干净完成无 attention。

## 检查与交接边界

最终生产 tsc0；nice19、threads 单 worker、禁止文件并行的定向 **15文件/217项通过**。Python 原26 + 新wrapper15＝41项在一个 Vitest 包装入口中，不重复加算。新夹具覆盖正常完成、零模型、真实 postmortem 后缀、异常不 finish/不 seal、单次 verifier 卡住、到期退出/收件箱/逻辑槽位释放、锁忙落盘后续接、失权不接管、待核原输入冻结与新工作准入、通知 reader 兼容及缺 label 的正反身份。

补充检查一个原有 ordinary-close-isolation 包装器在15秒 subprocess 上限超时，原失败日志保留（vitest-p0-prequeue-16.log）；同六原固定测试未修改，独立复核六项通过（13.081秒，ordinary-isolation-six.log），完整 ordinary-close 定向包装也已在最终15文件中通过。另保留命令旧 poolOptions 参数拒绝、初次 PYTHONPATH 用法错误的说明；它们不当产品失败或通过证明。

#20 c17842f8 的精确 learner_tabs/test/config/protection 组合，在本树真实最终 verify_native 下固定 **24项通过**；不改其代码、不碰真实 pane。只放 adapter 而仍用旧 board 全类保护会拒绝，只有新 config 而缺新 running-panes 保护也不满足合同，两次原失败日志保留。因此采用必须包含 #20 的回收 adapter、保护/配置组合，并补其已通知的真实 postmortem label/receipt 后缀；24项旧夹具本身不覆盖该后缀。wrapper 的 seal 调用仍依赖这一交付，不把当前分支说成已部署全链路。

本会话未跑 full，未合 main/live、编号、改 STOP、生产交互开关/账号/配置/原回执、play、重送四任务或关闭其他会话。原集成员保最新 main/live、ops 新非交互开关及 #20 合同，核最终精确组合 full；由原 ops 保持临时非交互并在修复完整发布后自然读回绑定→完成→槽位释放→下一批派出，尚未自然验收。学习/科学父和 #27 正式ACK兼容等原未完成事项保持。

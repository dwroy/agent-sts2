[dev #36] 已按6355664518收窄为 wrapper 完成终态/回执并调用 #20 seal，不关 tab。

将移除 wrapper 的 learner_tui.py close 调用，原 finish 成功后调用约定 CLI：`python3 ops/learner_tabs.py seal --root ROOT --state-dir DIR --batch BATCH`。缺 helper 或 seal 失败保留 pane、记录异常，不回退直接关闭。原 finish 及 native/summary/产物/PID/lease 门不放松。

补齐 `.tui.json` 的持久化 output SHA 与 wrapper 完成段：version、batch、原 supervisor PID/birth、launcher_rc、原 result code、真实 batch state/finished 及批次快照 SHA；零模型 code3 与 launcher 返回1的已知映射显式记录，不能按0完成。未启动回执补 pane/label/cwd、可核到的原 pane identity、submitted=false/空 bindings（没有证明的身份不填成功）。零模型沿原 finish/retry 策略，不复制已消费任务或改原在途回执。

#20 可直接核原 `.tui.json` 与 learn.json；新增完成段仅用于交接，不能替代独立回收门。预计补固定 wrapper 成功/异常/零启动测试，定向检查后交回；请在精确 seal CLI/schema 到位后在本 issue 留交付信息。

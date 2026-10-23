[ops]

Roy 10-23 10:2x 选 A 已接收。现实现没有独立 learner TUI 开关，已在隔离 live 基线工作树补最小开关 `learner_tui=off`（环境覆盖 `CODEX_OPS_LEARNER_TUI=off`），保留 `learners=herdr` / `brain_view=herdr`，关闭时走原 herdr command pane / stdio launcher，原模型、high、沙箱和完成审计不变。固定路由检查4过，正在单次 tsc + 完整回归（nice19、单 worker；不持K/L），通过后发布三叶 ops/测试/文档并切运行配置；在途批不热切。原九叶绑定补交继续独立验收，开关默认 on，不与既有补交源码冲突。

当前恢复：9 个空 shell tab、4 个已完成 TUI 均核原件后正常退场；四个原 wrapper 终态审计已执行，槽位已释放。7 个 service_tier 零模型批原件保留，接着用各自冻结输入重排，不冒充已完成。临时仅学习 ACCOUNT_DRAIN 是本恢复事务持有，切完新启动路径即释放。

另发现 12 件积压不能被 readQueue 读取：launcher 使用 `<毫秒>-<UUID>-learner-tui-attention.md`，而读取器要求第二字段以小写字母开头，12 件 UUID 均以数字开头，被静默过滤。请原 #36 owner 一并修事件命名并加固定测试；本轮 ops 先按原文逐件实际处理后保留到 delivered，绝不只删队列。证据：paper/materials/20261023-learner-recovery-ops/attention-queue-filename-proof.json、four-current-native-audits.json、four-finish-and-close.json、stdio-switch-checks.json。

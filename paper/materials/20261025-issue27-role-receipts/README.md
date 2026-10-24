# #27 逐条真实接收与用户可见通知回执

记录时间：2026-10-25T04:20:21+08:00。本轮依Roy指示持真实回执登记；结果为15条CLI rc2、000402缺原日志未尝试，正式watcher_received/roy_notified均仍0。

接收证据沿本角色已实际完成的16条读取核验记录，再核47份原来源和32个ops投递窗口；watcher-native-read.jsonl是同一原生session的真实assistant读取声明。每条received-evidence保存完整原message及SHA、原ops回执、本角色实际读取证据。roy-visible-notification.jsonl是本会话本轮逐条16 ID/异议/下一步的真实用户可见assistant commentary原始JSONL行，不是issue评论。native-window-bindings保存源路径/字节位置/时间/SHA；均只裁原行、不改写。

这两阶段是watcher自己的接收与通知记录；不表示Roy已读、同意或本人ACK。000402有读到缺证通知及向用户报告缺证的实际记录，但原来源门仍不满足，所以保持pending且CLI尝试0。实际投递与正式登记分账。

| notice ID | watcher_received 登记 | roy_notified 登记 |
| --- | --- | --- |
| b40a4420f889d3e759a627c0 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 99a933ce6b140f81db812b16 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| a2c843430ed6f492ea2eb1b0 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| f9a02febd8602a4ab46d685f | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| fc89900f81f276e48a4ec214 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 7430982d1c28981e46d44d75 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 7dcddb0749fa60e0f2f78f3f | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 751e5b79d972608c69f79626 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 3d4cc7af851a72e5bc47a3f8 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 4d4fd8d8ebbbf1b709b759fc | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 8418097488ff1ad810b15b1f | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 43652bbc1deb15d9a437af88 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 3d8e3359ffe4d6992bd3960e | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 9cb62c98e778f565d5954f73 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 99c134c7850ae5bae9fb64c9 | pending：CLI rc2 来源scope拒绝 | pending：前置未登记 |
| 0ca61b2ba10a18ca2e12f5b3 | pending：原日志缺，未尝试 | pending：前置未登记 |

全部逐条receipt命名为 `<notice_id>.watcher_received.json` / `<notice_id>.roy_notified.json`；evidence项目内路径/SHA已独立回读。registration-results.json保存15个实际命令/stdout/stderr/rc，final-readback.json保存16条正式状态。

CLI与原拒绝时SHA一致：3f7afefb2307a420dd35a28e94f6b20c6bdc76ae30ce8f5cffb0dd62633e13e4。本轮不用--source冒V6任务、不伪造父要求或notification_only范围，不直接改notice。后续由原CLI owner补这些真实历史task/request/thread来源的兼容验证，再沿同一notice ID用现存真实回执登记；身份/范围缺口解除前不继续roy_notified命令，不重试确定性失败。000402等原owner找回原SHA日志；不拿新wrapper补历史。

issue回帖仅报告操作结果，绝不作为阶段ACK原件；不重复改主管收件箱，不改学习者原文、ops_forwarded、知识、live/STOP、生产DB或科学父。未改生产代码、未开模型/游戏/full/测试。

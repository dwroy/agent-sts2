# #11 历史题面异议实读与转达

2026-10-21，watcher（现集成员）按本轮明确通知请求处理 notice f922272253e05b0cc9995ef3，保留原 learner→ops→watcher→Roy 链。

原 questions 完整实读，与通知 message 解析结果一致。原来源、报告及 stdout 只作 SHA/字节核对；原 8 段日志按 offset/bytes 读取并与归档副本逐 SHA 核同，未将整份回执或日志载入上下文，未独立重建机制或验证当前源码复现。

异议和建议详见 issue-comment.md、watcher-read.json。实际向 Roy 的可见 commentary 由本会话原生 response_item/phase=commentary 精确截取到 roy-visible-native-event.jsonl；消息不是预写稿，原生时间、offset 与 SHA 见 provenance。首个提取器误用 channel 字段的失败保留在 native-extract-attempt-1.json；修正到实际 phase 字段后才生成回执，无失败 ACK。

原 CLI 接受 watcher_received 和 roy_notified，两阶段退出码 0；前者由首次命令成功后回读 notice-after-watcher.json 核证，后者有 roy-ack-attempt.json。notice-after.json 的三阶段原件和 evidence SHA 已逐一核回，原 ops_forwarded 字节不变，notification_only=true、registered_learning_request=false 不变。Roy 可见转达不代表 Roy 已读、回复或批准。

提案继续 waiting；无游戏知识/代码/版本/发布变更，无新父要求；#11 和原科学父保持未完成。原研究 CLI 兼容待办与本 ordinary-proposal 通知分开。

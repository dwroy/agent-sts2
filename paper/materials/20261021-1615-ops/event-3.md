学习要求 github-issue-13-silent-learning-20261021：{
  "prior": "Issue #13 列出EXPOSE 208、SPORE_MIND 60等unknown标签，容易被理解为独立实盘覆盖。",
  "finding": "重算完全复现原标签计数；EXPOSE的208只来自1局13道题的候选/目标槽，SPORE_MIND的60只来自1局3题。其余卡A标签为11/4/4，不是施放分母。",
  "evidence": [
    "shadow-unknown-inventory.json",
    "coverage.csv"
  ],
  "affected_ids": [
    "github-issue-13-silent-learning-20261021"
  ],
  "next_step": "保留R409原结果；发布与消费者验收按逐卡独立局/真实施放和分支重新计数，不关闭父要求。"
}
通知回执：/home/dw/Projects/agent-sts2/ops/codex-ops/learning-notices/7430982d1c28981e46d44d75.json
处理协议及回执格式：docs/learning-requests.md。
Roy明确要求：ops须把问题原文、证据、与旧知识的差异及下一步交给watcher，由watcher告知Roy。程序已将原文写入ops/inbox-dev.md和notes/for-roy.md作为ops转达；请处理问题并在可用时提醒现有watcher会话；无法转达必须保留pending并报告阻塞。不要仅归档事件便称用户已知。用 python3 ops/learning_requests.py ack --notice <id> --stage ops_forwarded|watcher_received|roy_notified --receipt <项目内真实发送/接收回执文件> 分角色登记；queued不是已送达。

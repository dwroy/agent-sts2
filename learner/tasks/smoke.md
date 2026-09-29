---
title: 冒烟测试（只读）
tools: Read, Grep, Glob
timeout_min: 10
max_turns: 12
---
# 任务：冒烟测试（只读）

这是启动器的端到端冒烟测试。全程用中文，只读，**不许创建、修改或删除任何文件**。

1. 在 {{project_root}}/notes/lessons.md 里找到以 `## {{run}}` 开头的那一节（文件有 2 MB 以上：先用 Grep 找到行号，再用 Read 按行号只读这一节，不许整份读）。
2. 用三句话总结这一节：这局死在哪、主要原因、复盘里提到的一个 bug 或打法问题。

## 安全
- 不许读 `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`；key 不许打印。
- 只读；不推送；不运行任何命令。

## 回报
只输出三句话的总结，然后单独一行 `RUN: {{run}}`。

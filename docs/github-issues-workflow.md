# GitHub Issues 协作流程

Roy 2026-10-21 定：会话仍由 herdr 托管，任务与协作改用本仓库 `dwroy/agent-sts2` 的 GitHub Issues。仓库公开，issue 也公开（见下文“公开边界”）。原因：watcher 被当作消息中转站，Codex 压缩时原样保留所有收到的消息（最近一次保留 254 条、约 16 万字符，其中 ops 回执 132 条），导致几乎每步都要压缩；任务、负责人、验收和进度散落在对话与回执里，Roy 看全局要靠转述。

## 规则

1. **任务以 issue 为准。** 每个任务一张 issue（模板 `.github/ISSUE_TEMPLATE/task.md`）：目标、验收、负责人、边界、证据。授权仍以 decision-log 为准，issue 里链接对应行。
2. **消息只提醒。** 用 `herdr agent prompt` 只发一行：`#123 轮到你：<一句话>`。细节、结果、回执都写在 issue 评论里，不往别人的对话里贴长文。
3. **一个 issue 一个新会话。** 开发任务在 herdr 新开 Codex 会话、独立工作树，读 issue 和仓库规范开工，交付后在 issue 评论结果并关闭会话。长期会话（watcher、ops）每天换一次新会话，靠交接文件和 issue 衔接。
4. **状态用标签。** `status:ready → in-progress → review → waiting-release → 关闭`；卡住用 `status:blocked` 并在评论写原因；需要 Roy 定的加 `needs:roy`。负责人用 `owner:*`，优先级 `P0–P3`。
5. **评论格式。** 第一行一句结论；之后列提交、报告路径（`paper/materials/...`）、测试结果、局号。大文件和原始回执留在仓库或本地，不贴进评论。
6. **验收与关闭。** 开发会话交付后改为 `status:review`；Claude（或 watcher）验收；改变对局行为的由 ops 在开局边界上线后改为 `status:waiting-release`，首局验收通过再关闭。上线仍按原规则：decision-log、`eval/versions.json`、规则变更通知。
7. **ops 回执。** 例行回执写入 `notes/ops-current.md` 与原有回执文件，不再逐条投递给 watcher；与某个 issue 相关的结论在该 issue 评论一句并给回执路径。

## 公开边界

issue 和评论任何人都能看到。不写：密钥、token、Key 文件内容；公司网关地址与内部主机名；个人信息与邮箱；未公开的账号或计费信息。发之前把正文写进文件，用 gitleaks 扫一遍再发：

```bash
gitleaks detect --no-git --source /path/to/body.md && gh issue comment 123 -R dwroy/agent-sts2 --body-file /path/to/body.md
```

## 常用命令

```bash
gh issue list -R dwroy/agent-sts2 --label status:ready --label owner:dev
gh issue view 123 -R dwroy/agent-sts2 --comments
gh issue edit 123 -R dwroy/agent-sts2 --add-label status:in-progress --remove-label status:ready
gh issue close 123 -R dwroy/agent-sts2 --comment "<一句结论 + 证据>"
```

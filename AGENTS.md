# 给在本仓库工作的 agent（Claude、Codex 等通用）

先读 [README.md](README.md)。动手之前还要读：
1. 最新的 `paper/materials/STATE-*.md`：当前目标、系统现状、待定事项。
2. `paper/materials/decision-log.md` 的末尾：最近的决定。
3. [docs/learning-protocol.md](docs/learning-protocol.md)：**游戏知识只能从对局里学**。这是本项目的实验前提，违反了结论就不成立。

运维会话还要读 `notes/ops-handoff.md` 全文。学习者以任务说明为准，见 `learner/tasks/`。

## 学习协议（摘要）

- 游戏知识（机制、牌值、怎么打）只能由学习者从对局证据得出，每一条都要带证据局号。Dai 不提供，开发会话也不能自己加。
- 开发会话负责：审核并实现学习者的提案、修和角色无关的缺陷、做 Dai 批准的架构调整。
- 每个角色的数据只在 `knowledge/characters/<角色>/` 下读写，不同角色的数据不能混用。
- 拿不准一项改动属于哪类，就按游戏知识处理，或者问 Dai。

## 规矩

- **记录**：决定和上线都在 `paper/materials/decision-log.md` 追加一行，写之前先跑 `date`，格式和已有的行一致。改变对局行为的上线，还要在 `eval/versions.json` 加一个版本，并通知运维会话。讨论、数据、转录都要落盘，不能丢历史。
- **上线**：修复和已批准的改动测完就合进 `live`（对局在 `.worktrees/live` 里跑），下一局生效。合并前先查 live 里刷新过的知识数据有没有和这次合并冲突。
- **工作树**：一个功能一个工作树。Claude 用 `.claude/worktrees/`，其他 agent 用 `.worktrees/`。主检出只用来集成。同一个工作树同一时间只能有一个 agent 改代码。
- **测试**：提交前 `cd agent && npx tsc -p tsconfig.test.json && npx vitest run` 都要通过（PATH 里加 `~/.local/node/bin`）。测试只用固定数据。不要 `npm install`，要加依赖先问 Dai。
- **git**：用本机的全局身份，不设仓库级的 `user.*`；提交信息末尾带 `Co-Authored-By: <引擎> <模型> <noreply@…>`。推送只经 Windows 的 `ssh.exe`，`upstream` 只拉不推。`third_party/` 下的内容不改。
- **改运维 prompt**（`ops/ops-session*-prompt.md`）之前，先把稿子给 Dai 看。
- **代码风格**：代码注释用英文，和现有代码一致；给模型看的知识文本用中文。改动对铁甲战士必须保持等价，否则要说明原因并记录。

## 安全

- key 不打印、不写进日志或文件、不放进提交，提交前用 gitleaks 扫描。key 文件有 `~/.jev_api_keys`、`~/.deepseek_api_key`、`~/.sts2-jev-env*`，以及所有 `.env`。
- 开发会话不运行 `play`，对局只由运维循环启动。
- 不读游戏的 `sts2.dll` 和 `.pck`。
- 杀进程只用 PID，不用 `pkill` 或 `killall`。
- 对局在跑时，后台任务每个最多用 4 个进程，一律加 `nice`。
- 只改本仓库。

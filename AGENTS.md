# 给在本仓库工作的 agent（Claude、Codex 等通用）

先读 [README.md](README.md)。动手之前还要读：
1. 最新的 `paper/materials/STATE-*.md`：当前目标、系统现状、待定事项。
2. `paper/materials/decision-log.md` 的末尾：最近的决定。
3. [docs/learning-protocol.md](docs/learning-protocol.md)：**游戏知识只能从对局里学**。这是本项目的实验前提，违反了结论就不成立。

运维会话还要读 `notes/ops-handoff.md` 全文。学习者以任务说明为准，见 `learner/tasks/`。

## 学习协议（摘要）

- 游戏知识（机制、牌值、怎么打）只能由学习者从对局证据得出，每一条都要带证据局号。Roy 不提供，开发会话也不能自己加。
- Codex 学习者负责：依据对局证据实现提案、修纯 bug、做 Roy 批准的架构调整；自测通过就自行合入 live，不另设审核。运维 codex 确认实际合入、登记上线，并为提交或合入受阻兜底。Claude 只观察和与 Roy 对话，不修改或审核。
- Roy 2026-10-07 授权：有足够理由和本角色已核实对局数据时，学习者可直接修改 Roy 定的出牌、药水、必死/SL、终局价值规则；不因“人定规则”一律转回待审批。每条此类经验同时写代码提案，关联证据局/回合、账本和任务，按 [代码提案闭环](docs/learning-code-proposals.md) 登记与审计。证据不足保留现状并写限制；其他角色和未观察进阶保持等价。
- 每个角色的数据只在 `knowledge/characters/<角色>/` 下读写，不同角色的数据不能混用。
- 拿不准一项改动属于哪类，就按游戏知识处理，或者问 Roy。

## 规矩

- **记录**：决定和上线都在 `paper/materials/decision-log.md` 追加一行，写之前先跑 `date`，格式和已有的行一致。改变对局行为的上线，还要在 `eval/versions.json` 加一个版本，并通知运维会话。讨论、数据、转录都要落盘，不能丢历史。
- **规则变更通知**：规则实际上线后先 `date`，在项目根目录 `notes/for-roy.md` 和 `ops/inbox-dev.md` 同时追加通知 Roy：逐项旧规则、新规则、证据/账本、预期影响和回退方法。这是已授权的记录例外，保留其他并行记录；只经 CLI 记台账，不修改运维 prompt。
- **上线**：修复和已批准的改动测完就合进 `live`（对局在 `.worktrees/live` 里跑），下一局生效。合并前先查 live 里刷新过的知识数据有没有和这次合并冲突。
- **工作树**：一个功能一个工作树。Claude 用 `.claude/worktrees/`，其他 agent 用 `.worktrees/`。主检出只用来集成。同一个工作树同一时间只能有一个 agent 改代码。
- **测试**：改了代码（agent/、learner/、eval/、ops/ 下的脚本、knowledge/builders/）的提交，先在 agent/ 里跑 `npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run`，两者都要通过（PATH 里加 `~/.local/node/bin`）。`tsconfig.test.json` 里测试文件原有的 39 个类型错误是历史遗留，不拦提交。只改记录和数据（notes/、paper/、decision-log、复盘、学习台账、生成的论文表）的提交不用跑测试。Codex 沙箱内用 `bash tools/test-sandbox.sh`（内含 tsc；固定排除名单与原因见脚本），自测通过即可合入。经验和修复批次结束后，调度器在沙箱外补跑完整 tsc + vitest；失败写收件箱并发 learner-checks 事件，由运维 codex 决定回滚还是派修复。沙箱限制不当作代码失败。测试只用固定数据。不要 `npm install`，要加依赖先问 Roy。
- **git**：用本机的全局身份，不设仓库级的 `user.*`；提交信息末尾带 `Co-Authored-By: <引擎> <模型> <noreply@…>`。推送只经 Windows 的 `ssh.exe`，`upstream` 只拉不推。`third_party/` 下的内容不改。
- **改运维 prompt**（`ops/ops-session*-prompt.md`）之前，先把稿子给 Roy 看。
- **代码风格**：代码注释用英文，和现有代码一致；给模型看的知识文本用中文。改动对铁甲战士必须保持等价，否则要说明原因并记录。

## 安全

- key 不打印、不写进日志或文件、不放进提交，提交前用 gitleaks 扫描。key 文件有 `~/.jev_api_keys`、`~/.deepseek_api_key`、`~/.sts2-jev-env*`，以及所有 `.env`。
- 开发会话不运行 `play`，对局只由运维循环启动。
- 不读游戏的 `sts2.dll` 和 `.pck`。
- 杀进程只用 PID，不用 `pkill` 或 `killall`。
- 对局在跑时，后台任务每个最多用 4 个进程，一律加 `nice`。
- 只改本仓库。

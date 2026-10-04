---
title: 批量修 bug
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.items: {{project_root}}/notes/fix-queue-v4.md 里所有还没划掉的纯 bug
default.base_branch: main
default.merge: no
default.merge_dir: {{project_root}}/.worktrees/live
---
# 任务：批量修 bug

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：在工作树 {{worktree}} 里批量修纯 bug。全程用中文（提交信息用英文）。自己做，不许再派下级 agent。

- 要修的：{{items}}
- 工作树：{{worktree}}（只在这里改代码、跑测试、提交）
- 合并基线：{{base_branch}}
- 是否合入对局分支：{{merge}}（`no` = 只在本分支提交；`live` = 按第 5 节合入 {{merge_dir}}）
- 日志（只读，查证据用）：{{logs_dir}}
- 临时文件只放在：{{scratch}}

## 1. 开工
1. 往任何文件里写时间之前，先跑 `date`。
2. 在 {{worktree}} 里 `git status` 确认工作区干净，然后**先** `git merge --no-edit {{base_branch}}`。有冲突就停下，在回报里写明。
3. 读「要修的」指定的队列和条目（默认 {{project_root}}/notes/fix-queue-v4.md）。每条先在当前代码里确认 bug 还在（可能已被别的提交修掉）：已经修掉的不重复修，回报里写「已修，提交 …」。
   先读 README.md、最新的 paper/materials/STATE-*.md、decision-log.md 末尾和 docs/learning-protocol.md。改变打法的修复只能依据学习者已有的提案和对局证据，回报及提交写明证据局号、层、回合和对应的学习账本条目；没有证据先交回开发会话审核，不补入自己的游戏知识。
4. **只修纯 bug**。下面这些属于策略，由 Dai 决定，看到了也不许改，只在回报里列为「需要 Dai 定」：保血规则、留药、boss 时钟的校准方式、路线预估、休息点回血还是锻造、小偷怪要不要优先打、A10 第三幕的第二个 boss、无色牌估值。
5. Dai 定下的规矩，修的时候不许违反：
   - 怪物的血量和伤害按当前进阶从数据库取，第一个样本起就用；房间代价保留 5 个样本的门槛；
   - 药水等同于 0 费一次性牌：代码不给药水加代价、不过滤、不否决；提前喝药不写成代码规则；
   - 推演结果相同的几条标「并列」，不挑其中一条标最优；
   - DeepSeek 负责构筑、路线和休息，战斗由 Jev 执行，代码只提供事实和参考排名、不删选项。

## 2. 每个修复
- **每个修复单独提交**，英文提交信息写清楚改了什么、证据（run id、floor、turn）。
- **每个修复带一个测试**，用固定数据（agent/tests/ 下的夹具，或在测试里写死的局面），**不许依赖每局都在刷新的知识数据**（knowledge/ 下的 *.json 里会被刷新的那些）。
- **测试要在去掉修复时失败**。做法：修复和测试写好后，只把源码的改动暂时撤掉（例如 `git stash push -- agent/src/…`），跑这个测试，确认失败；再恢复修复（`git stash pop`），确认通过。两次的结果写进回报。
- 注释用英文，和现有代码风格一致；给模型看的文字用中文。

## 3. 测试
- `export PATH=$HOME/.local/node/bin:$PATH`；每次提交前 `npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run` 退出码都要是 0。
- 高负载时战斗测试可能超时：先重跑一次再下结论；重跑才过的，回报里写明是哪个测试。
- 测试里不许真的调用任何 LLM 或网络。

## 4. 提交
- `git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit`，不推送。
- 修复队列不要改（划掉条目由调用方做），只在回报里给出每条对应的提交号。
- 学习账本（`{{project_root}}/paper/materials/learning/ledger.jsonl`，字段见同目录 README.md）：修掉的条目在账本里有对应的 `bug-infra` 条目的（`python3 {{project_root}}/learner/ledger.py find --kind bug-infra --text <关键词或局号>`），用 `python3 {{project_root}}/learner/ledger.py update`（JSON 从标准输入传入）给它追加 `{"where": {"commits": ["<提交号>"]}, "status": "proposed", "by": "learner:fix-batch"}`；没有的不用新建。不许直接改账本文件，不许改成 `shipped`（上线由开发会话改）。

## 5. 合入（只有 merge = live 时做）
本次 merge = {{merge}}。是 `no` 就跳过本节，在回报里写「未合入，待调用方合入」。是 `live` 时，在 `flock {{project_root}}/ops/live-merge.lock` 锁里按「合入 live 的流程」做（其他值报错，不猜测合入目标）：
1. 等后台知识刷新跑完：`while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done`（方括号不能省，否则会匹配到自己的 shell，永远等下去）；
2. 在 {{merge_dir}} 里先提交刷新过的知识数据：`git add notes/fight-value-backtest.md knowledge`，commit "Refresh knowledge data"（没有改动就跳过）；
3. 先检查刷新过的知识数据与本分支的改动是否重叠；有冲突就停下回报，不覆盖刷新数据。记下提交刷新数据之后、合入之前的提交号，再 `git merge --no-edit <本分支>`；
4. 在 agent/ 跑 `npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run`，退出码都要是 0；不是 0 就回退到第 3 步记下的提交（保留刷新数据），在回报里写明；
5. 如果改了知识数据的生成脚本，用 knowledge/builders/ 下的脚本重建数据，再提交一次；
6. 先跑 `date`，在 paper/materials/decision-log.md 追加上线记录，写明来源条目、证据局号、账本 id 和提交号。改变对局行为（包括知识前缀文字变化）时，在 eval/versions.json 加版本并通知运维会话；将提交号和版本交开发会话，由开发会话经 learner/ledger.py 将对应账本条目标为 shipped（只有实际合入 live 后）。只修工具或任务模板且不改变对局行为时无需 eval 版本；
7. 不停对局，不运行 play。

## 6. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的：{{worktree}}（本分支）、{{scratch}} 和学习账本（只经 learner/ledger.py 追加）；merge = live 时还有 {{merge_dir}} 的合入，以及第 5 节明确要求的上线记录和 eval 版本。ops/、notes/、paper/ 的其他文件都只读。
- 不推送；不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`（node_modules 是共用的软链接）；logs/ 只读。

## 7. 回报
最后一条消息按这个格式写（中文），不要写别的：

```
## 修 bug 回报
- 合并基线：{{base_branch}} → <合并后的提交号>
- 修复（每条一行）：<fix-queue 条目一句话> — <提交号> — 测试 <文件:用例名> — 去掉修复时失败：是/否
- 已被别人修掉的：<条目> — <提交号>
- 没修的：<条目> — 原因（策略类 / 证据不足 / 太大）
- 测试：tsc 退出码；vitest 文件数 / 用例数 / 退出码（重跑过的写明）
- 合入：<live 的提交号 / 未合入>
- 需要 Dai 定的事（没有写「无」）：……
```

最后再单独给一个 json 代码块：

```json
{"task": "fix-batch", "base": "...", "fixes": [{"item": "...", "commit": "...", "test": "agent/tests/...", "fails_without_fix": true}], "skipped": [{"item": "...", "reason": "..."}], "merged": null, "tests": {"tsc": 0, "vitest": 0, "cases": 0}}
```

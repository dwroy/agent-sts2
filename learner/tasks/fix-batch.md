---
title: 批量修 bug
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.items: {{project_root}}/notes/fix-queue.md 里所有还没划掉的纯 bug
default.base_branch: v3
default.merge: no
default.merge_dir: {{project_root}}/jev-sts2-v3
---
# 任务：批量修 bug

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：在工作树 {{worktree}} 里批量修纯 bug。全程用中文（提交信息用英文）。自己做，不许再派下级 agent。

- 要修的：{{items}}
- 工作树：{{worktree}}（只在这里改代码、跑测试、提交）
- 合并基线：{{base_branch}}
- 是否合入对局分支：{{merge}}（`no` = 只在本分支提交；`v3` = 按第 5 节合入 {{merge_dir}}）
- 日志（只读，查证据用）：{{logs_dir}}
- 临时文件只放在：{{scratch}}

## 1. 开工
1. 往任何文件里写时间之前，先跑 `date`。
2. 在 {{worktree}} 里 `git status` 确认工作区干净，然后**先** `git merge --no-edit {{base_branch}}`。有冲突就停下，在回报里写明。
3. 读 {{project_root}}/notes/fix-queue.md，挑出要修的条目。每条先在当前代码里确认 bug 还在（可能已被别的提交修掉）：已经修掉的不重复修，回报里写「已修，提交 …」。
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
- fix-queue.md 不要改（划掉条目由调用方做），只在回报里给出每条对应的提交号。

## 5. 合入（只有 merge = v3 时做）
本次 merge = {{merge}}。是 `no` 就跳过本节，在回报里写「未合入，待调用方合入」。是 `v3` 时，在 `flock {{project_root}}/ops/v3-merge.lock` 锁里按「合入 v3 的流程」做：
1. 等后台知识刷新跑完：`while pgrep -f 'jev-sts2-v3/tools/buil[d]-' >/dev/null; do sleep 10; done`（方括号不能省，否则会匹配到自己的 shell，永远等下去）；
2. 在 {{merge_dir}} 里先提交刷新过的知识数据：`git add notes/fight-value-backtest.md knowledge`，commit "Refresh knowledge data"（没有改动就跳过）；
3. `git merge --no-edit <本分支>`；
4. 跑 tsc 和 vitest，退出码都要是 0；不是 0 就回退到合入前的提交，在回报里写明；
5. 如果改了知识数据的生成脚本，用 knowledge/builders/ 下的脚本重建数据，再提交一次；
6. 不停对局，不运行 play。

## 6. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的：{{worktree}}（本分支）和 {{scratch}}；merge = v3 时还有 {{merge_dir}} 的合入。ops/、notes/、paper/ 都只读。
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
- 合入：<v3 的提交号 / 未合入>
- 需要 Dai 定的事（没有写「无」）：……
```

最后再单独给一个 json 代码块：

```json
{"task": "fix-batch", "base": "...", "fixes": [{"item": "...", "commit": "...", "test": "agent/tests/...", "fails_without_fix": true}], "skipped": [{"item": "...", "reason": "..."}], "merged": null, "tests": {"tsc": 0, "vitest": 0, "cases": 0}}
```

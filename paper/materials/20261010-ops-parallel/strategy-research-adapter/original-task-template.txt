---
title: 策略提案与实现
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
default.batch: manual
---
# 任务：依据本角色对局证据提出并实现策略

Roy 2026-10-05 08:33 批准独立策略学习任务。本次角色为 {{character_name}}（{{character}}），来源局为 {{runs}}。自己做，不许再派下级 agent。全程中文，提交信息英文。使用普通模式、high 推理强度，不为提速降低强度。

工作树：{{worktree}}；基线：{{base_branch}}；日志（只读）：{{logs_dir}}；临时文件只放 {{scratch}}。

## 1. 开工与证据
- 先读 README.md、最新 paper/materials/STATE-*.md、decision-log.md 末尾、docs/learning-protocol.md。先 git status 确认干净，再 git merge --no-edit {{base_branch}}；冲突就停下回报。
- 只从本角色对局、复盘和 {{character_dir}} 学习。核对 runs.jsonl 角色；不得读取或搬用其他角色知识。共用事实仅用观察得到的数据。
- 读 fix-queue-v4.md 的待定策略项与已有提案，选证据充分、可验证的一项。游戏知识只能从对局里学，不使用自己的预训练知识补结论。
- 每项提案落盘到 {{scratch}}/proposal.md，写证据局号、层、回合、既有学习账本 id、反例、预期行为及验证方法。没有证据就报告证据不足，不改策略。

## 1.1 派发提案与补链
本次调度批次为 {{batch}}。从 {{project_root}}/ops/codex-ops/learn.json 只读对应行，核对角色和工作树；若存在 proposal_ids，只处理这些已领取的 id，不领取其他批次或扩展到整条队列。batch=manual 时保持原手动证据任务。
只读本次调度 batch 的 proposal_ids / proposal_repair。逐项读取专用队列的角色、证据、账本和保存的 Markdown，不忽略其他待处理 id。补链任务要核对原经验或已追加复盘，补提案与账本链接，不重复写历史复盘。最终每个派来的 id 都有 proposal_results：implemented/duplicate 带实际 live 祖先源码 commit 与理由；waiting 带具体缺数据理由，保留待新局重派。

没有源码改动时保存 {{scratch}}/report.md，回报完整40位 base、fixes=[]、merged=null、report 路径以及逐项处置；工作树保持干净。合法的证据不足/已有实现不冒造合入、eval 版本或测试成功。代码实现按下一节验证上线。

## 2. 边界与实现
- 依据已有证据提出并实现策略；涉及 Roy 尚未授权的架构调整先回报，不猜测批准。不得把待定项当成既定游戏规则。
- 怪物血量与伤害按当前进阶从数据库取，第一个样本起就用；房间代价保留 5 个样本门槛。
- 出牌、药水、SL、终局价值规则按本角色实盘证据决定；Roy 2026-10-07 已授权学习者有理由和数据时修改既有人定规则，原规则不是不可修改的前提。
- 推演相同的选项标并列；DeepSeek 负责构筑、路线和休息，Jev 执行战斗；代码提供事实及参考排名，不删选项。
- 每项实现单独提交，写明局号、层、回合、账本 id。代码注释英文，模型知识文本中文；铁甲行为若变化说明证据和原因。

## 3. 验证与记录
- 保存原源码副本时在 {{scratch}} 使用 .txt/.patch 等材料扩展名，保留原字节；不要把临时副本命名为可执行 .ts，避免导入检查将它误当生产源码。
- 用固定局面测试，不依赖刷新的知识 JSON，不调 LLM 或网络。源码撤掉时测试必须失败，恢复后通过，两次结果写回报。
- mkdir -p "{{scratch}}"；export TMPDIR="{{scratch}}"；export PATH=$HOME/.local/node/bin:$PATH；每次代码提交前在 agent/ 跑 bash tools/test-sandbox.sh，退出码为 0。高负载超时重跑一次并报告。
- 提交前 gitleaks 扫描，git commit（使用本机全局身份，不设仓库级 user.*），Co-Authored-By 写真实引擎和模型；不推送。
- 往文件写时间前先 date。只经 {{project_root}}/learner/ledger.py add/update 登记本角色提案、证据与提交；status=proposed，by=learner:strategy-proposal；不得直接改账本或标 shipped。

## 4. 合入（只有 merge = live 时做）
本次 merge = {{merge}}。是 `no` 就跳过本节，在回报里写「未合入，待调用方合入」。是 `live` 时，在 `flock {{project_root}}/ops/live-merge.lock` 锁里按「合入 live 的流程」做（其他值报错，不猜测合入目标）：
1. 等后台知识刷新跑完：`while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done`（方括号不能省，否则会匹配到自己的 shell，永远等下去）；
2. 在 {{merge_dir}} 里先提交刷新过的知识数据：`git add notes/fight-value-backtest.md knowledge`，commit "Refresh knowledge data"（没有改动就跳过）；
3. 先检查刷新过的知识数据与本分支的改动是否重叠；有冲突就停下回报，不覆盖刷新数据。记下提交刷新数据之后、合入之前的提交号，再 `git merge --no-edit <本分支>`；
4. 在 agent/ 跑 `bash tools/test-sandbox.sh`（内含 tsc 和沙箱可跑的 vitest；固定排除名单及子进程限制原因见脚本注释，合入后由调度器在沙箱外补跑完整套件），退出码都要是 0；不是 0 就回退到第 3 步记下的提交（保留刷新数据），在回报里写明；
5. 如果改了知识数据的生成脚本，用 knowledge/builders/ 下的脚本重建数据，再提交一次；
6. 先跑 `date`，在 paper/materials/decision-log.md 追加上线记录，写明来源条目、证据局号、账本 id 和提交号。改变对局行为（包括知识前缀文字变化）时，在 eval/versions.json 加版本并通知运维会话；将提交号和版本交运维 codex，由运维 codex 经 learner/ledger.py 将对应账本条目标为 shipped（只有实际合入 live 后）。只修工具或任务模板且不改变对局行为时无需 eval 版本；
7. 不停对局，不运行 play。

## 5. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的：{{worktree}}（本分支）、{{scratch}} 和学习账本（只经 learner/ledger.py 追加）；merge = live 时还有 {{merge_dir}} 的合入，以及第 4 节明确要求的上线记录和 eval 版本。Roy 2026-10-05 08:37 已授权修改本工作树中的 ops/ 调度器与 broker（包括 ops/codex/、codex-ops*.sh、codex-ops-learn.py、learner_jobs.py、learner_checks.py），可实现队列中已批准的动作和学习闭环；不修改 key、.env、codex 登录令牌、.git hooks/config，也不借动作执行清单外操作。notes/、paper/ 的其他文件仍只读。
- 不推送；不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`（node_modules 是共用的软链接）；logs/ 只读。

## 6. 回报

回报列出提案、证据局号/层/回合/账本 id、提交、撤源码失败与恢复通过、tsc/vitest结果、合入提交和版本、未实现原因。把 {{scratch}}/proposal.md 路径交运维；实际上线后由运维核实并登记 shipped。最后单独给 JSON：

```json
{"task":"strategy-proposal","base":"...","runs":[],"fixes":[],"skipped":[],"merged":null,"tests":{"tsc":0,"vitest":0,"cases":0}, "code_proposals": [], "implementation_domains": [], "report": "{{scratch}}/report.md"}
```


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

消费队列最终 JSON 还须加 `proposal_results:[{"id":"<派发id>","state":"waiting","reason":"具体缺数据原因"}]` 和 `report:"{{scratch}}/report.md"`；implemented/duplicate 另带实际 commit。

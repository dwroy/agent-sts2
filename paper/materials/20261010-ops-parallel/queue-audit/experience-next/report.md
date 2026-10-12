# 第148次经验源机械集成准备

此目录只保存只读核查和操作草稿；没有合入、登记、派发或修改共享记录。固定切点时间、来源与命令在 `source-manifest.json`、`commands.json`，当前请求/batch 原状态在 `batch-snapshot.json`。主 ops 需要在真正操作前再次读取当前 main/live、learn 与宿主进程。

唯一源为 `e77eb7083e3c1cc1b08b21709ae600cfd447a715`，任务 `experience-update`、批次 `20261010-091302-experience-update`、原证据局 `PYE4VXNSLGSS`。原状态仍是 failed/rc0/merged=null；学习完成与实际上线有明确区别。后续四批经验任务均 failed/rc3、无有效报告或源，未替代本源。exp 跟踪文件干净、HEAD 等于源；learn 无登记的 running 批，但本子 agent 没有核宿主 PID，不能用沙箱 /proc 给活租约作保证。

固定 live `027bd9c570df19f4734e47059755f6698ca36452` 的经验 .5 与 e77 父提交的经验文件**全部原字节相等**。因此本次单文件 .5→.6 是直接的机械更新：新增0、更新14、退役0、active207→207；四条核心经验原对象完整不变。每条变化的原旧新正文、字段、支持数、证据局与 ledger 映射在 `exact-entry-deltas.json`，完整原文件与普通 Git diff 另存。14 条均增加原证据局 PYE4VXNSLGSS，没有移除旧证据；苦无条目置信 med→high，其余非正文字段变化逐项列出。这些描述直接来自原经验源，没有补充游戏知识。

16 个既有 ledger ID 的对应范围来自原 `provenance-mapping.json` 和本批实际 CLI 登记，并非由本子 agent 推断。当前 fold 和原注册行分别存入 `ledger-current-selected.json`、`ledger-source-registration.json`，包括本批后新增的复盘证据/提案；后续集成只能追加限定数据范围 shipped，不能覆盖这些动态记录，也不把四个原策略提案标 implemented。

原测试并非单次全绿：原工作树第一次 tsc0/vitest1，因为忽略的旧任务目录有失效 logs/logs 软链接，check-imports 遍历报 ENOENT。原 learner 在1198跟踪文件逐SHA相同的隔离副本通过原 test-sandbox.sh：258文件2651例 + paths1文件11例，共259文件2662例，tsc/vitest0，gitleaks0。失败和通过日志都有真实路径、SHA和末尾数字，不删除失败。该新经验源没有宿主完整检查回执；合入后应通过原批 learner-recheck 补完整检查，不用旧 .5 检查代替。

`S1.exp148` 在读取时 main 和固定 live 版本表均未占用，是正常下一经验槽；本材料未预占槽位。新版本记录须绑定实际合入提交，不能提前写成已上线。原离线 A8/A9/A10 消费者渲染通过，但 `actual_play_adoption_verified=false`，后续自然对局采用与效果仍待核。

## 源侧历史与合并风险

source 相对 live 只有5个独有历史提交：e77 的单经验文件；6cf1c7c 合并记录；f7c800b 结果内容通知请求；5262baeb 20局漏斗记录；f4b5ee3 核心入库派发记录。共同基为已上线经验 .5 源 d4e5b126。共同基→e77 的生产/工具范围中只有 experience.json 和 ops/inbox-dev.md 变化，**没有源侧独有、待验的可执行源码**。完整父提交和路径见 `source-ancestry-audit.json`。

直接把旧 source 全树拿来，会撤销当前 live 的若干卡模型/工具修复、删除新测试、退回刷新知识及更名记录。所有 live/source 路径差异只以路径/状态留在 `all-live-source-tree-differences.tsv`，没有读取任何凭据文件内容。源完整分支原合并失败曾涉及旧 notes/for-dai、旧授权记录和共享日志；这个历史失败保持。

只 cherry-pick e77 虽能得到数据，但不建立原源为 live 祖先，现有 `ops/learner_checks.py` 的原批 recheck 会拒绝。主 ops 既有兜底惯例是保留当前 live 其余路径、精确带入原经验 blob，并形成带原源的合并祖先；既有经验140/141记录说明“当前经验等于源父blob、顺次只合原数据、源过时运维/文档不覆盖”，之后核源 main/live 祖先。此次同样可在主 ops 自有隔离树做**两个父提交的限定文件合并**，不借用 exp 活树、不硬解其失败现场。

具体草稿命令和逐项验收见 `suggested-commands.md`。不能仅以 merge-success 或源 ancestry 宣称实际所有源树上线，须独立证明合并提交相对即时 live **只有 experience.json 改变**，且该 blob 精确等于原源。记录/版本登记后须再次保证生产源码及其余刷新知识没有变化。

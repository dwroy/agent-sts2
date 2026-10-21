# #23 回收门修复与上线交接

本开发会话基于 main `518cca239b93db91649ec6df25b7e19102595eb4`。只修改独立工作树；没有合 main/live、运行 play、改 STOP、删除生产工作树或提交生产回收请求。本文的正数候选是只读反事实核验，不是批量删除授权。上线、首批回收及 24 小时可持续验收仍交集成员和 ops。

## 四个原因及证据

1. **继承的绑定被当成独立实例。** #18 的 72 项首个门是 `persistent game instance retained`，合计约 28.53 GiB。原清单证明绑定均受跟踪、与各自 HEAD 相同，SHA256 均为 `29c911f682b0e74ad4941f9d1673782b2de1fce2b5047adf25f23e92b354a213`。旧代码只查文件存在，没区分 main 继承副本与独立控制身份。现在仅对与 HEAD、独立登记的主运行根完全同字节，且主会话/宿主进程可核、候选无本地范围、私有控制租约和活动进程的副本作排除。未跟踪、改动、冲突、无法核实及独立实例仍保留。
2. **把整个 HEAD 必须进 live 当成来源门。** #18 的 65 项来源阻塞中有 62 项在当时 main、但不在 live。现在按原分配回执的 base→source 任务差分核实际可执行叶子；没有原分配证明时保守使用 source 与 live 的共同祖先，不能使用 source 与 main 的共同祖先制造空差分。纯材料只需来源在 main、分支保留、原证据保全；真正的源码/知识差分仍要求实际 main/live 发布。发布后继续演进不使已发布旧源码重新失效。显式精确叶子验收仍核完整 SHA、原回执哈希和 Git 对象。
3. **其他闭环缺证保持原样。** 未登记/缺显式验收、未完成普通批次记录与 dataset、scratch/原线程绑定、研究或父要求、未入库、检查未完、dirty、未知字节码、在跑进程仍阻止删除。报告 checkout 可回收不等于入库：原 pending scratch 全保留、`no_experience_claim=true`，不关闭父要求。未合入代码或材料保持保留。
4. **自动申请确实存在，门禁在申请之后阻止回收。** `ops/codex-ops-learner.sh` 在实际模型退出、finish 成功后释放 checkout 租约并调用 `learner_retention.py request`；后者落请求再 kick。原 `codex-ops-learn.py` 的 tick/recheck 继续 kick；一个 launch 锁/PID 回执控制一个 nice 19 worker，共享每轮最多 4 项预算，先学习批次、再普通树、最后缓存。没有新增 timer、清理模型或派单器。

`runtime-evidence.json` 是 14:07:12 的只读快照：1840 个批次，810 个已有请求，409 deferred、385 checkout_reclaimed、16 reclaimed。历史有成功回收，不能把最近窗口的 0 扩大成从未运行。最近 20 个普通成功批次中 18 个有请求；缺的两个中，09:58 的 s2 申请在 scheduler.log 明确报 EAGAIN，14:03 的 s2 包装器在补查时仍有 finish 子进程。原 sweep 扫全量批次而非只扫请求，因此请求未落盘也可由后续 tick 重试，未修改这些批次或伪补请求。最新 sweep 的具体后续保留原因见原快照，不将请求、排队、报告完成冒充删除或入库。

主要原件：`../20261021-worktree-backlog/{inventory.json,inventory.tsv,reclamation-plan.md,original-plan-receipt.json}`；`../20261021-issue-18-watcher-review/{review.md,readonly-admission.json}`。原件稀疏未展开时用 `git show 518cca239:<路径>` 读取。

## 逐树反事实核验

`readonly-plan.json` 保留原 137 项的路径、原 HEAD/首门/占用、原 main-only 关系、当前 HEAD、当前准入证明或具体保留原因。`audit.py` 仅读现存运行根和 #18 固定原件，不调用 plan/sweep/request 或写生产状态：

```bash
nice -n 19 python3 -B paper/materials/20261021-issue-23-reclaim-gates/audit.py \
  --root /home/dw/Projects/agent-sts2
```

| #18 首门 | 原数量 | 新准入 | 继续保留的具体原因 |
| --- | ---: | ---: | --- |
| 绑定文件存在 | 72 | 29 | dirty 8；scratch 绑定缺证 9；普通完成未闭环 14；未知字节码 4；活动进程 6；缺显式验收 2 |
| 来源不在 main/live | 65 | 37 | 未进 main 3；实际源码未进 live 3；scratch 绑定缺证 6；未知字节码 3；普通完成未闭环 11；无效历史路径字段 1；活动进程 1 |

65 项中的原 62 项 main-only，37 项新准入，25 项仍被其余保护挡住；另 3 项未进 main 继续保留。最终 14:10:38—14:12:29 核验合计 66 项新准入，按 #18 旧快照毛占用约 30.56 GiB，不是净释放承诺。14:05 的前轮为 67 项/30.95 GiB；最终轮的 `codex-strategy-silent-20261020-144302-s2` 因活动进程引用转为保留，属于应保留的现场变化，不能沿用前轮删除判断。`source leaf not in recorded publication` 的三个负对照分别涉及 loop.ts/rollout.ts，逐树文件保留完整路径和来源证明。没有对原 76 项 dirty 或其他未知树扩大扫描/放宽门禁。

合入后 ops 必须重跑原 plan，并保全每棵候选的当前 HEAD、来源/归档证明和差异；本快照不代替 watcher/集成员对实际候选的核验，也不代现场进程复核。

## 绑定停止跟踪：集成和 ops 的必要顺序

**Git 删除被跟踪文件的提交会同时删除运行目录内文件；加 ignore 不能保护它。** 本提交仅在开发树执行 `git rm --cached`，开发树内原字节还在。固定临时仓库测试真实执行删除提交分别合入 main/live，确认 Git 确实删除文件，再由下面的工具恢复并逐字节验证；也验证了缺文件不捏造、并发改绑不覆盖。

只读核验与 issue 的位置描述有一处差异，必须保留：当前真实绑定存在于**主运行根** `ops/instance-binding.json`，hash 如上；live HEAD `5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532` 早于绑定入 Git，live 的这个路径当前不存在。`ops/paths.sh` 从主运行根加载绑定。不能据此往 live 复制一个假绑定，也不能因此跳过 main 集成时的保护。上线时由 ops 重新核实际消费者和两处现场，遇到新绑定或冲突保留全部原件。

1. 集成员合 main 前、ops 在自然开局边界合 live 前，各自核运行根的当前绑定、实际消费者和原发布锁。保持开发 helper 可用，或从审核后的提交将其及依赖放在可用的检出。所有存在的真实绑定都先备份；备份失败立即停止集成，原文件不动。原路径本来缺失时只记录缺失及实际消费者，不调用 restore 捏造文件。
2. 对每个实际存在绑定的运行根，使用该根作为 `--root`，调用 `backup`，成功后才执行该角色负责的原合并/精确集成命令。即使合并失败，也先执行 `restore` 与 `verify`，再处理 Git 冲突；不要先继续启动依赖绑定的进程。必须在同一受控集成区间完成恢复和读回。
3. 合并之后文件还在且同字节时 restore 只验证；文件被 Git 删除时独占创建并恢复原模式。任何新内容/新身份都拒绝覆盖，保留原备份和新文件，由 ops 核对。verify 必须成功，且 Git 显示绑定已不受跟踪、受 ignore。把前后 SHA、实际根目录、消费者和命令回执落入 ops 原上线记录。

命令示意（**仅交接，开发会话未执行生产命令**）：

```bash
binding_helper=/绝对路径/审核后的检出/ops/instance_binding_backup.py
runtime_root=/实际含真实绑定的运行根
nice -n 19 python3 -B "$binding_helper" backup --root "$runtime_root"
# 上一步成功后，由集成员/main 或 ops/live 执行原受控集成命令。
# 成功或失败均先恢复/核对；不得用 && 让合并失败跳过此步。
nice -n 19 python3 -B "$binding_helper" restore --root "$runtime_root"
nice -n 19 python3 -B "$binding_helper" verify --root "$runtime_root"
git -C "$runtime_root" ls-files --error-unmatch ops/instance-binding.json # 应找不到
git -C "$runtime_root" check-ignore ops/instance-binding.json             # 应命中
```

备份位于该运行根忽略目录 `ops/codex-ops/retention/instance-binding-backup.json`，带 root、时间、完整原字节、模式和 SHA。已有不同身份备份不覆盖；不要提交此运行回执。无需改 STOP、热切模型/线程、修改共用配置或运维 prompt。回退代码也必须先备份当前真实绑定，不能用旧 Git 文件覆盖改绑后的身份。

## 原调度器续跑与仍待生产验收

集成员核验合 main；ops 在自然开局边界上 live并核绑定后，先保全原 plan，核候选再允许原 retention worker 执行。原 worker 共享 learner/workspace/storage 剩余额度，每批总计最多四项，首批完成由后续原 tick 自动继续，不建新轮询、不派清理模型。固定仓库测试向同一原 sweep 提交 limit=32，实际先 4、下一 tick 3、再 0，来源 refs 和原 jsonl 均保留。缓存剥离不算工作树回收。

生产验收尚未完成，#23 不能因本报告关闭：

- T0：记录实际部署提交、绑定校验回执、`git worktree list --porcelain`、原分配/归档清单及 disk-admission 首采样；首批每棵查真实 reclaimed 清单、归档 SHA/读回和分支引用。
- 后续原 tick：保存 `last-sweep.json`、`last-worktree-sweep.json` 与逐树 manifest；无新模型介入也须出现第二批及后续回收。新批次退出→finish→request→准入→实际回收逐段用原批次读回，不以 pending/deferred 代完成。
- T0+24h：按工作树路径/来源 SHA 去重，分别计原 allocation 回执的新建量与实际删除 checkout 的清单量；请求、仅归档、缓存压缩不计回收。恢复/中断项单列，不伪造缺少登记的分母。完整 24h 内回收≥新建，且原 `disk-capacity/measurements.jsonl` / autoplay disk-admission 可用空间末值≥首值，附逐采样与时间；不足 24h 只报部分进度。

当前磁盘快照为约 133.84 GiB 可用，近期消耗约 4.45 GB/h，buffer 约 32.28h；附带历史采样跨度约 23.5h，发生在修复部署前，不能用作部署后可持续验收。

## 验证范围

新增 16 个固定临时仓库测试覆盖：同字节继承副本；真实/未知/改动/局部范围绑定；私有控制租约；宿主可见性；实际活动 cwd；dirty/常驻；main-only 材料；原分配差分；未发布源码；未合入材料；发布后演进；报告不冒充入库；真实 Git 删除合并后的 main/live 字节恢复；原 worker 连续限额。接入完整 Vitest，原 storage/learner/workspace 回归继续执行。最终检查与原件索引见 `validation.json`。

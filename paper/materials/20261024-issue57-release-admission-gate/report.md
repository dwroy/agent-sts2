# #57 发布准入与候选学习交付

基线：`8a6e5016d83d5dc29ec630eda6881f14e889cf8e`；独立分支/工作树 `issue-57-release-admission-gate`。本批只交开发源码，未合 main/live、未部署、未创建生产门或游戏发布号。未运行 play、修改 live/STOP、切账号、改沙箱或关闭其他会话。

## 实现

新增 `ops/publication_gate.py`，提供 begin/write/release/recover 和游戏/学习准入。`PUBLICATION_ADMISSION.json` 独立于原全局门，绑定 root、owner、PID/birth、next-game 范围、waiting/publishing 阶段及 token。未知/损坏/死 owner/PID 复用保守阻断，只有原字节 SHA 比对且原 owner 已退的显式恢复可以换 owner；不自动删旧门。三个开局入口接同一门，run.sh 的 PID/birth 预留关闭检查到启动之间的竞态，WAIT_PID 的原局等待和报告保持。

waiting 仅允许原外部冻结候选链；批次、wrapper、launcher 和两种启动回执显式绑定 candidate_mode 与 merge=no、dispatch_base、独立 worktree/scratch，拒绝改成 live。候选从该固定工作树加载 launcher。普通无门的原启动路径保持，旧批次不补写模式。全局 PAUSE、ACCOUNT_DRAIN 和旧/未知 LLM_DRAIN 继续阻止新学习；ACCOUNT_DRAIN 没有扩大成暂停 ops 唤醒。finish 记账继续，但后续只走相应准入；普通共享收尾、定时 dataset snapshot 和 open-book 忽略层刷新没有候选豁免。

锁序是短 learn → game admission（需要时）→ knowledge refresh → live merge；全部非阻塞。源快照在原 learn 事务内重读冻结来源/SHA，取得不可变 Git base；prepare 同序重核。实际写入前释放 learn/game，只保留原 refresh/live 锁；等待自然终局不持这些锁。竞争返回75/原队列延期，不消耗新批次或重建原 owner。

原 ops 下一新发布事务使用 begin → 无锁等待原自然终局和报告 → write 包住原写入体 → 原核验 → release。本仓未有通用的代码 publisher；没有改写或重跑历史逐事务材料脚本，也不自动把现有 LLM_DRAIN 认领成发布门。原写入体须去掉同一锁的重复外层 flock，不得再倒序等待 learn。完整接入/恢复/回退见 `docs/publication-admission.md`。

## 固定验收

| 要求 | 回归证据 |
|---|---|
| 等待可派候选、不可开局 | Publication 三个真实 shell 入口；CandidateDispatch 原 external dispatch |
| PAUSE/账号/旧未知门仍挡 | 三全局门逐项正负控，unknown marker 及直接 CLI |
| finish 与续派分开 | 原真实 cmd_finish 记账；阻止升阶/Boss/普通 writer；候选 check_jobs 独立 |
| 原资源门继续 | 原 quota、磁盘、道位、native retirement 测试与候选等待测试 |
| 候选不写 live | 原 external finish/report_proof/no_change 完成，live 固定字节不变；启动拒绝 merge=live |
| 源快照一致 | 锁竞争不登记、来源漂移拒绝、HEAD/base/专属工作树及模式绑定 |
| 写入竞争 | NB flock 互斥，实际写入时 learn 可取得，失败保留 publishing 且锁全部释放 |
| owner 崩溃/替换/释放 | birth 不符保持门；恢复 SHA CAS；旧 token 拒绝，新 owner 显式释放 |

`ops/tests/test_publication_gate.py` 为13项固定回归，已挂入 `agent/tests/publication-admission.test.ts`。没有调用模型、Herdr 实服或游戏。原 wrapper 脚本闭包检查改读 Git 索引中的待交付集合，并识别固定工作树 launcher 路径：新脚本必须暂存，未跟踪或逐项遗漏仍失败；不是实际发布证明。

## 检查记录

- 生产 `tsconfig.json --noEmit` 已通过，最终沙箱入口还会重复该强制检查。
- 初始 TypeScript 定向：2文件33项通过；之后3文件46项通过（含原 ops-herdr）；对应外部 Python20项、发布门 Python13项通过。
- 第一沙箱尝试发现 ops-herdr 临时项目少拷新 Python 依赖，修正后停止本次旧输入检查，rc143；保留 `sandbox-attempt1-interrupted.log`，不冒称全套通过。
- 第二沙箱（单 worker）：632文件，627过/5败，5836项过/10败，rc1。失败为旧 wrapper 无门夹具依赖、闭包只看旧 HEAD/未识别固定 launcher 路径，以及稀疏检出未展开的原历史 fixture。原件 `sandbox-attempt2-failed.log` 保留。
- 修正兼容后：上述5文件连同发布门回归共6文件12项通过，内含发布门 Python13项；见 `targeted-compatibility.log`。
- 历史 fixture `paper/materials/issue29-brain-speed/results.jsonl` 仅从原 HEAD 展开：211076 bytes，SHA256 `8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef`；无新数据变更。
- 最终 `SANDBOX_WORKERS=2 bash agent/tools/test-sandbox.sh` rc0：生产 tsc0，主套632文件/5846项全过，另行 fork 的 paths 1文件/11项全过；总计633文件/5857项。原件 `sandbox-tests.log`。13个生产文件 SHA256 在检查结束后逐项核同 `production-source.json`；shell 语法与 git diff --check 通过。
- 提交前 staged gitleaks 扫描 rc0，未发现泄漏，原件 `gitleaks-staged.log`；公开交付评论另扫后发送。
- staged diff --check 在原测试日志的尾空白/末尾空行报 rc2；排除这些 .log 后源码与文档 rc0。原日志逐字保留，没有为通过格式检查改写原件。
- 额外运行的 `tsconfig.tools.json --noEmit` rc1。原生 CLI 取基线 Git 源码、沿同一原依赖执行后，基线/本批均52项错误，规范化诊断全文完全相同；见 `tools-cli-comparison.json`、`tools-baseline.log`、`tools-current.log`。没有安装依赖或复制整个仓库/历史数据，最小源码对照留在忽略缓存，可从 Git 重建。该额外配置不是本仓强制生产配置，本批未改工具类型，不称 tools 通过。先前因原生包缺少 lib/typescript.js 的 API 对照失败也保留在 `compare-tools-baseline-attempt1.cjs`、`tools-comparison-attempt1.log`，由后续 CLI 对照补齐基线证明。

## 尚未验收

交集成员协调原宿主完整检查和13个生产叶子的组合安装，包含新 helper，保留 #56 原道位/在途/实际 tier 验收。原 ops 下一新自然发布窗读回等待期真实外部批次的登记、candidate_mode、原生消费和完成，证明 release 前新局0、完成后原调度自然续局。本会话不制造这个窗口，不强制 tick 或启动模型/游戏。正式发布、消费者、自然采用/收益与各学习父要求均保持原 owner 开放。

回退须先由原 owner 留存/结清发布门；退到不识别新门的旧开局入口前，先由 ops 建立原全局保护。保留原 marker、批次、预留、失败和回执，不批量删除。

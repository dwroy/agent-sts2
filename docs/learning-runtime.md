# 运营学习与固定数据 runtime（#67）

运营记录、固定方法的数据版本、正式 K1 知识、源码工程分别结算。任务名不决定产物性质。报告/发现/反证/限制/待办/提案链接可以完成运营入库，不能据此称正式知识发布、自然采用、收益或父要求完成。正式经验/策略/rk/分类继续使用 #60/#66 的候选、原 schema 和消费者能力检查。

## 入口盘点与去向

| 实际入口 | 产物 → 通道/存储 | 验证与消费者 | 保留/回收 |
|---|---|---|---|
| `codex-ops-learn.py dispatch/tick` → wrapper → `postmortem` | 每局正文、发现/反证、账本/提案链接 → `operational_candidate` → `learning.sqlite` | 原角色已结束局/进阶、原 ledger/proposal CLI、文件 SHA、逐局覆盖；调度去重与 experience-pending 读库，学习者 query/report 导出读原文 | 原日志、账本、通知/父项不动；成功运营报告可按原 retention 归档，无经验入库/full 前置，不称已提炼经验 |
| `write --task mechanics-audit`；原手动 launcher | 机制审计/提案记录 → 同一运营合同；输入仍为原 residuals/summary | 原方法与 min_n/证据/反证不变；提案本身不算代码；消费者为原 owner/提案派发与 CLI | 原研究/续接 owner 与原样本保留；实际实现另走 strategy-proposal |
| climb observe → `ascension_audit.dispatch` → `ascension-audit` | 六项结构审计、差异、原 audit_key → SQLite + 原 request | 先走原 level/run/六覆盖/complete/提案核验，再运营事务；原 request 仅记本次观察范围完成 | 缺证/失败/迟到/旧租约规则保持；不关闭科学父项 |
| `write --task experience-asc-audit`；原手动 launcher | 审计记录走运营；有效经验修订另交 K1 候选 | 原历史模板的 Ironclad 来源/范围不扩大；K1 原提案审计与分类/内容校验保留 | 两个回执分开；无新能力时只留候选；不改 Git 经验以绕过发布 |
| `refresh.sh` → `refresh_driver.py` → monster-db/move-model/各角色 monster-records、card-upgrades、outcome、construction-opportunities、room-costs、boss-damage、potion-equivalents、v6-history、fight-value/model+gates | 原固定 producer 成功输出 → `D1-*` 全量不可变数据 manifest/对象；原文件仅兼容视图 | 控制显式准入固定 method SHA；原构建/样本/验证/训练切分不动，角色与 JSON 检验；新局 D1 包装 + `knowledgeFile`/V6/校准读取适配 | 原 logs、DuckDB、Parquet、缓存/原失败保留；无每批 commit/merge/full。变化算法/模型/校准方法/消费者先工程 |
| 原 `calibration_job` → requested_feature → `silent-boss-calibration` → `refresh-silent.py` | 固定模型/方法的校准、可信名单、原归档 → D1；报告/刷新记录 →运营 | 原 cadence、冻结 tune/val、完整结果、原准入、固定模型调参不变；原 dispatch 绑定，完成回调还须核 producer 真实回执；cadence 读取已发布 D1 | 原科学研究、历史 split/失败/所有归档保持；不因报告完成关科学父 |
| logdb sync / report-state-index / fight extraction | 原日志/缓存/DuckDB，继续统计分析 | 原方法/源身份/固定数据测试 | 不迁入大脑知识；不用源码发布锁冒作统计准入 |
| catalog | 可重建兼容索引/视图 | 原逐叶 SHA、原来源范围；runtime 启用时使用数据视图锁 | 不把空规则模板当学到的新知识 |
| 手动 `build-move-model.py` / `build-event-pages.py` | 原固定观察输出 → driver `--only-producer move-model/event-pages` → D1 | 原算法/输入不变，显式方法准入；`monster-db` 自带 move-model 输出仍沿原命令 | 没有新增定时任务；不得在已切换后绕包装器旁写 |
| 手动 `opening_value.py extract/train` | 原冻结训练研究仍归原 owner；已发布 opening-value 可 seed/绑定读取 | 本项提供不可变对象/旧读取适配，未把自由 trees/cutoff/样本的训练命令冒作固定定期刷新 | 未自动接入训练；有原授权固定 recipe 时另核工程准入；不重跑旧专项或扩大训练范围 |
| research/implementation/boss-sim 专项和旧批次 | 原授权/冻结方法/租约/工程合同 | 未显式登记新运营合同的批次完全沿旧路；代码变更仍原工程/发布/full | 不热改、重学、补造旧参数/身份或绕过 #63/#65 |

同批可有独立运营回执和正式 K1/源码回执。运营事务先完成；工程域、commit/merged/fixes/source_commit 会继续原源码路径。正式知识候选继续原 K1 验证，缺消费者能力/坏引用/非法字段不得激活。运营 payload 仅归档 JSON，没有解释器，也没有脑工具把原始报告自动加入正式知识。

## 原合同与单写切换

默认关闭。原 ops 在部署实际组合检查通过、旧对应写者自然结算后，在原实例 `ops/codex-ops/learning-runtime.json` 原子保存：

```json
{"schema":"operational-runtime-control-v1","root":"/absolute/project-root","enabled":true,"directory":"/absolute/project-root/data/learning-runtime","entries":["postmortem","mechanics-audit","ascension-audit","experience-asc-audit","silent-boss-calibration"],"refresh":["outcome"],"methods":{"outcome":"<实际部署组合method SHA256>"}}
```

`entries` 是本次显式切换的原入口，不是用任务名字判断内容性质的硬编码白名单。可分入口部署；不在集合中的任务和旧无 `operational_runtime` 的批次继续原合同。控制禁链、限8KB、核实例根、本地 data 子目录和严格字段。缺文件关闭；损坏拒绝新准入。派发将完整选择写入原 batch，再由原 registration barrier 持久化。launcher 从该批记录注入覆盖旧提交章节的合同，不重读当前控制；完成/recheck 使用同一原目录。切 A→B/disabled 不改原批、不猜新目录；完成历史在 SQLite 与原 batch 同时保存。

先显式 `init`，再启用控制；丢失原库必须恢复，完成/刷新/运行绑定不会自动重建历史。仅开启运营 entries 不影响新局。开启某个固定 producer 前，先按实际有效原数据冻结、调用 `seed` 建 D1 基线，再核 `method` 对实际安装 producer 代码根的结果并填 `methods`。method SHA 保守覆盖原构建器、模型代码、校准方法及验证适配；数据刷新不改变该 SHA，源码变化须沿工程核收后重新核明确准入，不能模型自批。首次接入不调参、不扩样本/范围、不把 Git 旧数据覆盖实际已刷新的数据。根/角色/进阶/模型和方法都留在输出与 provenance。

```bash
nice -n 19 python3 ops/learning_runtime.py init --runtime "$DATA_RUNTIME"
nice -n 19 python3 ops/learning_runtime_data.py method --root "$CODE_ROOT" --producer outcome
nice -n 19 python3 ops/learning_runtime_data.py seed --root "$FROZEN_ROOT" --runtime "$DATA_RUNTIME" --request "$UNIQUE_SEED"
```

生产 refresh 仍只由原 driver 自然节拍启动，原 worker/资源/共享队列门保持。已切换 producer 的写事务使用 `data-publication.lock` 和持久前像 journal；其原 `refresh_publish.publication` 在该 lease 内不再取 live-merge.lock。catalog 派生视图使用 `data-view.lock`。正常旧入口没有控制时仍原行为。切换时必须停止宣称旧 Git/人工合并为这些数据的另一个有效发布器；不要另开直接构建进程旁写同一兼容文件。并行学习不获授权写生产文件。

driver 在排资源队列之前把原控制和参数保存到 `data/learning-runtime-launches/` 不可变请求合同；原 `--request` 重启沿原目录/开关，不重读新配置。参数改变拒绝复用同请求。逐 producer 试点可用 `refresh.sh --ops-root "$ROOT" --character silent --only-producer outcome --request "$UNIQUE_REQUEST"`；不会先跑其他未切换 producer。恢复原自然全量刷新时，配套切换其实际 producer 集合；未切换步骤仍沿原发布锁，不能声称整轮都不依赖源码锁。默认命令顺序、统计/校准节拍未变。

保留的 `.worktrees/silent-boss-calibration` 可只作为原模型/样本和输出身份树。新批必须调用当前安装的 `refresh-silent.py`，方法 SHA 核当前安装根，输出仍在原树；程序只接受上批真实 D1 回执精确证明的 boss-trust 脏文件、原 HEAD 及无活跃 wrapper/其他改动。原树无需逐次合并 JSON；不覆盖树中的旧模型或绕过研究 owner。下一次 cadence 读已发布 D1，不能从旧 Git 推测。

## 产物与完成

`learner/lib/operational-runtime.ts` 给出严格 `operational-candidate-v1` 示例。候选在原树 `learner/runs/<scratch>/`；携带原 batch/task/character/base、runs、parents、proposals、ledger_ids、原报告与每条证据路径/SHA。records 的 kind 为 postmortem/audit/finding/evidence/counterevidence/proposal-link/audit-status/refresh。每个稳定 ID 保留修订；角色/类型/完成/父项/提案/账本/局号均有独立字段/索引。回调核原角色与进阶、原授权提案和 ledger、无代码/知识改动及原 HEAD（混合产物继续工程），不按“影响决策”误分。

SQLite 将候选、报告和证据原字节入不可变对象；使用 DELETE journal + FULL 同步，避免宿主 Python 旧 SQLite 的 WAL-reset 缺陷，不触碰 K1 的 DB/schema/WAL。完整记录与链接在一个 `BEGIN IMMEDIATE` 内结算；重复 ID 同内容返回原结果，换内容拒绝。重启时已提交的原对象优先，后续日志追加/源码推进不重新导入；提交成功但原 learn.json 未写回时，原 recheck 恢复回执，不再次学习或发布。记录事件键为原 batch，通知/未完成提案与原父要求仍由原 owner 跟进，不代 ACK/shipped。

失败候选原字节也先入 objects/submissions，received/pending/published 事件追加保留；修正候选不覆盖首败。证据可用成对 offset/length 引用大日志最多32MiB的精确原字节区间，其 SHA 与局号/角色/进阶一同索引；不把追加中的整日志复制进库。运营状态/反证有独立字段/索引；报告只供学习/审计读取。

```bash
nice -n 19 python3 ops/codex-ops-learn.py write --task mechanics-audit --character ironclad
nice -n 19 python3 ops/codex-ops-learn.py write --task experience-asc-audit --character ironclad
nice -n 19 python3 ops/codex-ops-learn.py recheck --batch "$ORIGINAL_BATCH"
nice -n 19 python3 ops/learning_runtime.py query --runtime "$DATA_RUNTIME" --character silent --kind postmortem --limit 100 --offset 0
nice -n 19 python3 ops/learning_runtime.py report --runtime "$DATA_RUNTIME" --id "$BATCH" --destination "$SCRATCH/preserved-report.md"
nice -n 19 python3 ops/learning_runtime.py status --runtime "$DATA_RUNTIME" --id "$BATCH"
nice -n 19 python3 ops/learning_runtime.py export --runtime "$DATA_RUNTIME" --character silent --destination "$SCRATCH/records.json"
```

新审计调度仍要求原输入 residuals/summary 或角色经验存在，不生成科学证据以满足派发。手动未登记 launcher 不获得新合同。纯运营成功不调用 ordinary-close 的 Git 提交/论文重建；Markdown/论文表可以按需导出。原 ledger/proposal CLI 仍追加原账本，SQLite 保留对应稳定链接，未做来源/状态重绑。异常/异议继续给原 owner；正常数据事务由程序完成。

## 固定数据、读回与故障恢复

固定 producer 在原计算成功且方法/输入身份未漂移后发布 D1，JSON 数据与角色字段逐项核验，样本/原来源/进阶分母仍取原生成字段。未改变输出只留 `data_attempts` 回执，不造空版本。原 v6-history 内容/引用/hash/时间门、校准十场/Brier/差距/打穿比/切分/调参门、fight-value 验证切分均未降低。模型/方法更改和新规则算子继续研发。任意 learner JSON 不存在直接发布固定数据的 API。

数据 manifest、原 provenance 与对象独立于 K1。`learning_runtime_launch.py` 在原新局入口捕获 D1；已有局从原 run-config 的 `knowledge.fixed_data` 恢复原目录/run/version，不按最新控制热改。新控制不能给原无 D1 的在途局补绑定。run-config 同时保存源码、K1 与 D1，`knowledgeFile` 和 V6 历史/校准入口读 D1 快照；自定义研究 knowledgeDir 不重定向。K1 tools 继续读其绑定的正式知识，D1 刷新不自动更新 K1 正式事实/分类；二者版本分别标注，不能用 D1 数据刷新冒充 K1 发布。

每个绑定还固定 `managed_paths`：仅已切换 producer 的路径读 D1，未切换路径继续原 K1/Git。目录/版本/选择任何一项恢复不一致均拒绝，不猜最新；缺原绑定的在途局不补造。v6-history 按其实际有效叶来源核同该局 K1 build-cores SHA，依赖不一致拒绝启动；未选该叶不误套其依赖。

`data_releases` CAS 当前基线；重复请求不能重切回滚指针。数据备份与 SQLite 一致性 API 复制，不直接拷贝运行 DB。restore 仅到新目录并核所有对象/完成回执 hash 后重建快照。snapshot 在指针提交前逐对象 hash、fsync；崩溃可留下不可见孤立文件，原 ID 重试复用。固定刷新原文件只是兼容视图：producer 失败/进程中断的下一自然入口先恢复本根 journal 前像，提交成功但回执丢失则核实际 release 补固定数据回执，不重算。journal 只保存不可变前像对象 SHA，体积有界，不嵌整份模型；数据锁 FD 传给原 producer，父进程中断时计算后继仍持锁，不允许另一个入口趁隙恢复写入。不同代码根的 journal 分账。原 DB/候选/失败/证据不删除。

```bash
nice -n 19 python3 ops/learning_runtime.py backup --runtime "$DATA_RUNTIME" --destination "$BACKUP_SQLITE"
nice -n 19 python3 ops/learning_runtime.py restore --runtime "$NEW_DIRECTORY" --destination "$BACKUP_SQLITE"
nice -n 19 python3 ops/learning_runtime.py rollback --runtime "$DATA_RUNTIME" --version "$OLD_D1" --request "$UNIQUE_ROLLBACK"
```

数据回滚仅影响下一新绑定，原局和运营记录保持。源码回退/恢复旧文件发布器只能在自然边界取消相应控制、结算原 lease，并从已核旧 manifest 还原兼容数据；不双写。未知/忙/证据损坏保留并交原 owner，不删其他任务锁或强 tick。

retention 仅为已核 SQLite 回执增加纯运营结算证明，后面的原 owner/请求/进程/实例/干净树/归档读回门继续执行，#63/#65 tab 身份与运行保护未改。记录完成可先于工作树删除；无回收资格不能挡数据交付，也不要求开开发 issue 等人工集成。长期研究、自然覆盖及收益仍在原父项。

## 部署验收清单

固定测试不代生产验收。原集成员核实际 #66/#67/当前生产组合的适用完整检查；ops 在原自然边界部署配套代码，逐入口开启并记实际 T/源码/控制SHA/原批合同/D1/K1/原始产物SHA。实际出现纯复盘、审计、固定统计/校准时分别读回：SQLite完成、原程序未触发Git/源码发布/full、原父项/提案/通知保持、下游原文或数据可读、重复回调同版、下一局新D1/旧局原D1。未自然出现项继续由 runtime 跟进，不强开局/重跑完成学习/伪造样本；工程和自然覆盖分开报告。

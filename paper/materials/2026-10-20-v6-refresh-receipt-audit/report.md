# P4：后台刷新回执与剩余增量化

原任务：Claude 2026-10-20 22:4x，`docs/v6-plan.md` §12（`0ee818a8f`）。执行者为原 W8、codex1、原生线程 `01a15382-761a-76a2-922d-271169b2463c`。本次只读冻结生产回执，代码和固定数据测试均在独立树 `.worktrees/v6-refresh-receipt-audit-20261020`。没有启动刷新、dataset、模拟、模型、API、完整 Vitest 或对局，没有改 live、STOP、actor、正式知识或 805。

## 结论与交付边界

后台构筑评估包确实按局复用，且新结束的 Y427 已进入下一份完成包；下一局 YSRV 实际读回该包。5Z 的刷新在本次采样截止时仍在前置公共步骤排队，不能记作完成或失败。此前公共生成器增量改动已在 main，但尚未进入受核 live，解释了公共链路仍耗时很长的部署差异。

本轮新增源提交 **`88c861525bc35ec11f9c97b3dbc8a02867cd4fe0`**，父提交 `ae7d48050493440f4490ed3cee80a31ac9359369`，源树 `7968e8d67e086202c8dad591d7bf23981815b751`，只改 3 叶。缓存组合可得性与前置条件选帧，并将已核 predicate 结果按局分组作为缓存身份；不改统计口径。45 个 Python 固定测试、tsc 和 2 文件 6 个 Vitest 用例通过。完整真实 live 联合验收仍由 ops 在 P0 之后单点安排；本报告不宣称 main/live 部署完成或本轮完整绿。

## 冻结范围

采样时刻为 **2026-10-20 23:10:52 CST**（15:10:52Z）。当时 main=`af6977c6c9d3f9b0ad7ec5b1c446871a4a4c0bae`，live=`048a9713bd4be09ad5f6d3f6131e8b729f51aece`。这只是实际捕获身份，不把后来 main 或 ops 的 P0 在途组合倒填进去。`checks/identities.json`、`raw-inputs.json` 列出源路径、原始字节数与 SHA；28 份原始回执、stdout、runs 和历史包加载日志以 gzip 保存，解压字节有单独 SHA。压缩副本及解析摘要均保留。冻结历史包成员关系是从对应不可变刷新目录的包逐项提取，包文件 SHA 和内容 SHA 记于摘要，不能将“作为来源局”解读为“该局实际成型”。

## 回执与真实消费者

14 份既有刷新回执中有 **9 published / 5 failed**，不能概括为历史全部成功。最近连续完成包的已结束 Silent 局数为 375、376、377、378、379、380、381；较早 373/374 两包失败发生在 `v6-history` 步骤，原 stderr 引用与 SHA 保存在回执，未伪造补成功。更早 3 份失败的 ended_runs 为 0。逐份状态见 `checks/refresh-status-summary.json`。

最新完成包为 `refresh-g7ptjpbt`：22:30:05.482→22:33:44.888 CST，exit 0，381 场已结束 Silent 局、17 组合。包文件 SHA=`e8b85339ba1b866a06a6a94a5ef2162d2b03b8892ecd6bf0f073b4ebfcadca98`；内容 SHA=`996caf78cea00a709646a0893aa78e38445343ee8c97d3f47080f733c3c7ce07`；cutoff=14:30:05.482Z，generated_at=14:33:32.201Z。

| 局 | 自然结束 / 加载时刻（CST） | 冻结结论 |
|---|---|---|
| Y427BMQH8AU6 | 22:17:26.935 结束；21:30:35.465 加载旧包 | 已列入 g7 的 ended_runs，且出现在全部 17 个组合 metrics 的 `sources[].run_ids`。这是纳入来源，不是 17 组合都成型 |
| 5ZEPCTQKKXE4 | 22:46:00.210 结束；22:19:30.481 加载旧包 | 开始时 Y427 新包尚未完成，因此合法读取上一包；23:10:52 采样时尚无包含 5Z 的新 published 回执，前置步骤仍在运行 |
| YSRVLSKVU8DL | 22:48:37.198 加载 | 实际读取 g7，内容 SHA 与上表一致；`policy=last_completed_packet`、`age_ms=1111716`，年龄从 cutoff 计算，非从生成时刻计算 |

g7 的 `production_consumption` 字段为 null；真实消费证明来自独立的 `logs/v6-history-snapshots.jsonl`，不把空字段当已回读。Y427、5Z 的旧包内容 SHA 都为 `5369ff1e556a81028424bd4299330c83ddca0f484d50c420ab8de8910be47b3c`；对应 age_ms 为 9841494、12776510。下一局没有等待后台包，旧包新鲜度有实际记录。

## 慢在哪里

详表见 [inventory.md](inventory.md)。最近 Y427 公共链：monster 143.634s、card-upgrades 398.283s、outcome 64.184s、room 17.380s、boss 55.238s、V6 history 219.569s；随后 fight-value 833.566s。5Z 结束后，队列先跑另一轮 fight-value 809.312s，再跑 monster 121.680s、card 368.151s、logdb 8.931s。23:10:35 刚完成 logdb，因此 5Z 尚未进入构筑评估阶段不等于增量缓存失效。

`ops/report.py:refresh_knowledge()` 从 **LIVE** 调用 `knowledge/builders/refresh.sh`。实际 live 缺 `legacy_incremental.py`、`report_log_cache.py`、`eval/jsonl_cache.py` 三模块，未执行 main 的公共按局提取路径；也没有新 `report-state-index` 阶段及缓存计时回执。原 26 叶增量交付 `5cd435c4` 相对原 r3b 验证源码，当前 main 25 叶 SHA 相同，只有 `ops/tests/test_disk_admission.py` 后来接了 infra 的新测试，必须保留。详见 `checks/existing-incremental-source-map.json`。这不是请求搬整个 main，而是提供原 26 叶最小差分供 ops 机械保留 live 非重叠改动后联验。

g7 内部确实已有增量：freeze 只解码 1603 新行，索引共 911251 行，760 hits / 2 misses，无重建流；combo 解码 0 行，13300 hits / 35 misses。其 35 misses 对应新增标准化局和 17 组合×首试/含 SL。旧局不是全部重新解析。combo 的 162.946s 中，提取 58.607s、前置条件 14.946s、贡献及归约 83.057s、pooled 归约 0.149s；前置条件 TypeScript 缓存 31711 hits / 0 misses，但 Python 仍每次扫描所有局的状态列表筛帧，availability 也在命中战斗缓存后重扫旧状态。本轮修掉这两项。

## 本轮新缓存与仍然全体计算的部分

`combo-prerequisite-frames` 以实现摘要、组合持牌定义与该局源签名缓存前置条件选帧。原 TypeScript predicate 验证不变。将核验结果一次按局分组，某一局条件变化只失效该局的两个 attempt 贡献，避免逐组合重扫全部状态建立缓存键。

`combo-run-contributions` 追加 `availability`。在未成型、缺初始层等战斗早退之前收集奖励/商店供给，保留首试截止、含 SL、按局幕去重、明确 stocked、升级未知不入分母。热命中不再遍历旧状态，新增局才重提取。固定测试锁住无缓存与缓存结果完全相等。

缓存实现 SHA 和 `with-availability-v1` 会使旧中间缓存首次失效。由于既有 normalized-run 身份包含 `combo_metrics.py` 实现 SHA，部署后首轮标准化提取也会冷建；不能承诺第一轮就更快。后续未变化局可复用。新旧实际生产耗时尚未测，不用固定测试秒数冒充生产加速比。

保留的全体工作是：完整原始前缀 SHA 校验；按历史顺序归并精简事实、众数/中位数/分母；公共怪物原 commit 的有序重放；出现概率表对按局缓存的 offer facts 重新归并概率、聚类误差、统一进阶偏移与剩余次数中位数；组合 pooled 回归/方向收缩；当前包/schema/知识目录完整校验；费用迟到去重/订阅分摊；不可变漏斗队列导出。它们仍依赖全体精简样本，不能用“平均各局均值”等替代原统计定义。

fight-value 的原始训练行可按局缓存，训练输入和所有产物 SHA 均相同则跳过拟合；新增有效训练行仍执行原批量树模型及 5 折/时间交叉验证。简单合并旧树不能保持原估计器等价，因此没有偷偷换成在线模型。这项仍可能耗时数分钟，需在上线后的逐段 CPU 回执中继续核实。当前源没有承诺整条链 O(新增局)。

## 测试与下一实际闭环

- Python `test_combo_metrics.py`：45 tests，0.562s，exit 0。
- `npx tsc -p tsconfig.json --noEmit`：exit 0。
- `npx vitest run tests/v6-combo-metrics.test.ts tests/legacy-refresh-incremental.test.ts --maxWorkers=1`：2 文件 6 tests，4.68s，exit 0。
- 源码 gitleaks：0；材料扫描及逐叶 manifest 见 checks。此前自有红灯、NameError 导入失误与修后 r2 原件均保留，未覆盖失败。
- 所有检查 nice 19 / ionice 3、短 TMPDIR、单 worker；未叠加 ops 的 P0 完整检查。

正式运输为原 26 叶增量依赖的最小 hunk 加本轮 3 叶，不运输验证父、整 main、805、正式知识或旧报告快照。ops 在真实 live 基线上保留非重叠改动，冻结当前知识，单点 tsc/full 后于自然开局边界发布。之后须核实际 legacy cache 回执、包含 5Z 及后续结束局的新包、下一局 snapshot 内容 SHA；采样正常战斗准备耗时与 fallback 对照以验证资源让出。本轮未另起生产刷新，部署后的回执与性能仍 pending，不能关闭这个父要求。

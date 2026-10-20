# P4 冻结接口与最小运输

源提交 `88c861525bc35ec11f9c97b3dbc8a02867cd4fe0`，base `ae7d48050493440f4490ed3cee80a31ac9359369`，tree `7968e8d67e086202c8dad591d7bf23981815b751`。只运输下面 3 叶的最小 hunk，不运输本源父或整树；不涉及 805、构筑评估/安全门路由、正式知识或预算。

1. `knowledge/builders/combo_metrics.py`：新增 `prerequisite_frame_inputs(runs, combos, cache=None, run_keys=None, algorithm=None)` → `(framesBySha, ownersBySha)`；新增 `prerequisite_cache_keys(runs, results, owners=None)` → `comboId -> runId -> digest`；新增 `availability_contribution(requirements, run, attempt)` → `[{card,act,value,evidence:{run_id,floor}}]`。内部 helper，不改变输出 schema。
2. `knowledge/builders/build-combo-metrics.py`：先计算已核源签名，使用上述 helper；原 TypeScript `combo-prerequisites.mts` 校验不变。`compute_combo` 的内部 options 追加 `_prerequisite_run_keys`；未传时保持原始逐局兼容键构造。
3. `knowledge/builders/test_combo_metrics.py`：4 个新增固定测试，锁住热缓存旧状态零扫描、新局才重提取、首试/SL、缺初始层、未知升级、商店 stocked、非成型分母、逐局条件失效及无缓存完全等价。

缓存继续复用既有 `FrozenLogIndex.cached` 的 gzip JSON + SHA envelope，无 pickle。命名空间 `combo-prerequisite-frames`；贡献键追加 `with-availability-v1`；组合定义、实现 SHA、按局原始源签名、见证/条件变化都使相关缓存失效。缓存可删除，不是知识。首次部署因 `combo_metrics.py` SHA 变化，normalized-run 与贡献缓存均需冷建；随后才是热命中。`appearance-v1`、build-core 指标 schema、正式概率/误差口径未改。

## 已在 main、受核 live 尚缺的 26 叶

`checks/legacy-incremental-minimal.patch` 为 **`5cd435c4^ → 5cd435c4` 的精确 26 叶源码差分**，不含旧材料/记录。原 source 为 `e16464f877943240d909f9b598593333f49946dc`；main 窄接为 `5cd435c4b282f3f5b73eefe54e34ea0530e00e40`。`checks/existing-incremental-source-map.json` 记录 prior-tested/main/live/task SHA；`checks/legacy-transport-manifest.json` 逐叶记录补丁前后像 SHA/blob。不能把 whole-file 后像覆盖较新 live 的非重叠改动。

26 叶包括公共生成器、增量中间缓存、report/autoplay/cost/漏斗接线及其固定测试。原接口见 `paper/materials/2026-10-20-v6-refresh-legacy-incremental/interfaces.md@5cd435c4`。其中 25 叶与原完整验证源 SHA 相同；当前 main 的 `ops/tests/test_disk_admission.py` 已接后续 infra，须保留其新测试。source-map 只是冻结字节证据，不授权回退当前 live 或覆盖当前改动。

原 26 叶依赖既有 `knowledge/builders/incremental_evidence.py`、`history_boundary.py` 与现有刷新入口；本次 3 叶同样依赖这些现有文件。ops 需核实际目标已有兼容接口，并机械 3-way 合 hunk；有冲突保留并在真实组合中测试，不通过运输验证父解决。只读扫描已确认旧目标具有这些基础模块，不能据本报告冒称最终 live 联合合同通过。

## ops 联合验收与读回

本次只跑定向，P0 单点 full 在途，不查询或叠加。source、每叶 SHA/blob、两份最小 patch 和日志摘要见 `checks/source-manifest.json`、`checks/check-results.json`；最终完整检查由 ops 针对实际 live + 当时冻结知识一次执行。旧 r3b full 的来源边界仍是旧 26 叶，不冒覆盖当前生产组合。

发布后保持局后后台执行，不在准入等待刷新：下一局仅用上一份完整包，snapshot 记录 cutoff/generated_at/content SHA/age。验收应读取 `ops/legacy-refresh-cache/*/timing.jsonl`、`knowledge-refresh-step-v1` 的实际 nice/CPU/RSS/负载、最新 refresh receipt 的 source/cache 计数与 combo stdout；随后核 5Z/新结束局在包 `ended_runs` 和 metrics source 中，以及下一局 snapshot SHA。首轮实现变更冷建与热读分列；不要以一次 published 关闭仍在队列的各局刷新或用户父要求。

无需新增开关或更改 Jev/大脑请求。没有实际生产刷新测时、没有 live 修改、没有完整联合绿；正式生效/版本/双通知继续由 ops 沿原自然开局边界流程处理。

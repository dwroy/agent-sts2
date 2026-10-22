# #40 生产导入热修交付

修复 R413 的 `fight-value:silent` 新进程启动失败，交集成员 → ops，尚未实际发布。本分支父提交为原 #40 源 `8f09b8426`；本次只交付其后的热修差量，不能重放旧整包。发布排在当前在途发布之后，无在途则沿原门立即处理。

## 根因与改动

`build-fight-value.py extract/all` 先导入 `fight_value_incremental → incremental_evidence → evidence_identity`，但入口未配置 `learner/`。原 Python 测试先导入 `legacy_incremental`，其路径初始化掩盖了缺陷。生产每次都是新 Python 进程，因而失败。

在 `build-fight-value.py` 依据自身绝对路径求出的 ROOT 后显式加入 `learner/`，与既有 V6 入口一致。算法、数值、训练周期和发布锁均不改；铁甲与其他角色只恢复同一导入能力。未改共享 `incremental_evidence.py`，避免因纯路径热修改变所有构建器的共享实现签名。

新增 `test_refresh_entrypoints.py` 两项固定测试，并在既有 Vitest Python 包装器中登记。测试复制仓库内源码和固定合成证据到隔离的 live/ops 目录；从 ops cwd 启动真实 `bash refresh.sh --fight-value --character silent`，使用原 driver 和真实 `build-fight-value.py all` 新进程，不继承父测试的 Python 模块或 sys.path，PYTHONPATH 为空，单线程环境与 driver 一致。无生产日志/模型调用。

- 冷缓存、追加、暖缓存三轮都要求整体和 fight-value 步骤 exit0，分别核实际处理帧数、续接 offset、无重建原因和旧三份完整产物原字节不变；再用独立新进程禁用缓存抽取，全量 rows 与增量 rows 逐字节相同。训练保留测试使用有 SHA 回执的固定占位产物，不宣称验证真实模型精度；原12项固定管线测试保留真实拟合与失败原子发布验证。
- 删掉隔离目录的 `evidence_identity.py` 后再次走真实 shell/driver，必须非零退出并保留 `failed_steps=['fight-value:silent']`，防止模块缺失被报成功。
- monster/card/outcome/room/boss/construction/catalog 七个构建器分别在新进程实际运行并核产物；monster-check、potion、V6-history、combo 四个入口只做 `--help` 启动导入检查，其完整工作依赖其他固定夹具/数据库/运行时，不冒称已在这里完整执行。

## 验证与原失败

修复前先运行新生产回归，确实在 `incremental_evidence → evidence_identity` 得到同样的 ModuleNotFoundError。修复后生产 shell 三轮及缺依赖反例通过。首轮其他入口检查因测试漏给 catalog 必需的 `--knowledge-root` 而失败，补齐测试 argv 后两项全绿；原失败没有覆盖。

- 生产 tsc：`nice -n 19 node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`，agent cwd，exit0。
- 新进程回归：`nice -n 19 python3 -B knowledge/builders/test_refresh_entrypoints.py -v`，2项通过。
- 原管线定向：`nice -n 19 python3 -B knowledge/builders/test_refresh_pipeline.py -v`，12项通过。既有未关闭 runs 文件的 ResourceWarning 保留，不作为本热修修改范围。
- Vitest 包装器接入：仅运行 `legacy-refresh-incremental.test.ts -t test_refresh_entrypoints`，threads/单worker/不并行文件，1项通过，另5项因定向筛选跳过；内含两项新进程 Python 回归再次通过。不是完整 Vitest。
- 未跑完整 Vitest；完整检查归集成员协调，不新增同源完整检查。所有验证顺序执行，nice19，无并行测试 worker。

原始红/首次绿失败/最终绿/原管线日志保留本工作树 `.artifacts/issue40-import-hotfix/`，摘要与 SHA 见同目录材料 `verification.json`。提交与公开正文均先经 gitleaks。

## 首轮重建预算与发布读回

22:14 前只读核生产现状：states.jsonl 为 **15,929,789,895 bytes**，旧 silent rows 为 **29,169,253 bytes**；原 ops 缓存无 `fight-rows-*.json`，live rows 对应 `.training.json` 也不存在。故修复后的首次正常刷新须按现有规则重建 rows 并补首次完整训练，不能称首轮就已具备增量检查点或因未满10局而跳训。已有共享 states 索引可复用，不删除或强制重建生产缓存。

首轮规划预留 **约20–40分钟、约10 GiB峰值内存预算**，依据 issue 原 fight-value 约960s中位/1130s高值和整轮33分钟背景，加上新路径首次建检查点/训练的不确定余量；这是资源规划估计，非热修后实测、上限或性能承诺。实际观察的第二个失败周期 `6fd1d6048c0045d79c93139578f1fbc6` 为504.4066s，fight-value 在导入阶段0.1661s失败，**不包含有效 fight-value 重建/训练耗时**。其10562132 KiB（约10.07 GiB）为 `RUSAGE_CHILDREN.ru_maxrss` 的累计高水位，V6步骤已达到该值，不能归因于随后失败的 fight-value，亦不能拿固定小夹具的内存外推生产。

ops 沿下一次正常刷新读回 fight-value exit0、步骤/周期耗时与进程内存、rows数量/大小/SHA、`processed_frames/from_offset/rebuild_reason`、训练周期及实际模型消费者 SHA；之后再核一次追加/暖缓存。不要为本开发验证额外开局、强制生产刷新或并行启动同一冷重建。保留旧模型和原失败记录，若首次训练失败仍按原逻辑保留上一版完整产物。

本会话未运行 play、未修改 main/live/STOP、未关闭其他会话、未分配发布编号。实际发布、自然冷/暖/训练周期及消费者读回仍开放，#40/科学父项不关闭。回退仅撤本热修入口两行，保留后续知识、日志、缓存及旧失败；回退会恢复已知的导入失败，宜优先保留原模型并沿原角色处理。

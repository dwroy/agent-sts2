# #67 工程交付

基线 `a6767d51efe6a06717037af28300bf4837dd5643`，分支 `issue-67-pure-learning-runtime`。分类最小接线先独立交付为 `8d6e4b021fff0065b07ca4e9ba69e8e719f6f00f`，供 #66 先核收；本包在其后串行增加运营/数据 runtime。没有修改正式 K1 schema/分类 tools、生产配置/库、main/live、STOP、账号/权限或第三方内容；没有运行 play/模型或停止其他会话。

## 已完成入口

| 入口 | 本包实际交付 |
|---|---|
| postmortem | 真实 dispatch 绑定 → scratch 原正文/候选 → finish/recheck → SQLite 完成；原逐局/ledger/proposal 校验；去重与后续提炼读回 SQLite 原文，无 ordinary Git close/full |
| mechanics-audit | 原输入/提案 → 新可派发独立批 → scratch 运营记录 → 完成事务；代码实现继续原工程 |
| ascension-audit | 原六项/角色/level/局/提案/报告路径/迟到租约检查保留；原 finish 同库完成，recheck 复用同入口，不用通用回调绕过科学门 |
| experience-asc-audit | 运营审计独立完成；正式经验修订经原 K1 候选/能力/分类/提案合同，不写 Git 经验绕发布 |
| 固定统计/观察刷新 | 原 driver 实际 producer 外包数据事务、方法准入/失败原像恢复、不可变 D1/逐入口读取；原算法/分母/准入/资源门/顺序不变。支持 `--only-producer` 独立试点，排队前固定原合同，同请求恢复不改绑 |
| 定期 Silent Boss 校准 | 原 calibration_job/cadence/冻结模型/split/tune/val/科学门 → 原当前脚本+原保留树身份 → D1/运营双回执；不逐次合入 JSON，真实旧 worktree 夹具已核原源码/数据回执/活跃保护 |
| 已发布 opening-value | D1 seed/新旧局绑定与原消费者读取适配；手动自由训练仍是原研究专项，没有把未冻结 recipe 的树数/截止/样本变更标成定期纯刷新 |
| logdb/缓存/catalog | 原日志/DuckDB 统计保留；catalog 可重建视图用数据视图锁；原 source 队列/full 不拉入纯运营收尾 |

逐入口完整映射、命令、单写切换/恢复/备份/回退见 [docs/learning-runtime.md](../../../docs/learning-runtime.md)。新入口默认关闭，必须显式 init/seed/核实际部署 method，旧在途批不热转换。固定数据只可由已准入原 producer 产出；任意学习 JSON 无直接数据发布接口。

## 合同与保护

独立 `learning.sqlite` 使用 DELETE journal/FULL，固定列/JSON/索引记录原候选/报告/证据/反证/状态/稳定 ID、修订与父项/提案/账本/局号。raw submissions 与 received/pending/published 历史追加，失败不覆盖。报告不会自动进入大脑正式知识。D1 对象/manifest/原 provenance 不可变，CAS 指针、幂等、备份核 hash/恢复、回滚只作用新绑定。大日志可带有界字节区间和精确 SHA。

实际混合源码的 commit/merged/工程域继续原工程完成；现有消费者已能独立读取的 K1 子产物可先完成，原提案链先核，未知能力拒绝。原报告/源码标志不被剥成伪纯数据。各通道回执不代 shipped、收益或父要求关闭。

run-config 固定源码/K1/D1/原目录/run/managed_paths；恢复原局不读取新控制，分入口未选数据不被 D1 冻结。K1 build-cores 与有效 v6-history 数据依赖在实际消费前核 SHA；外层 K1 CLI 的静态导入不提前误核 Git 数据。自定义研究目录保持原读取。原完整检查两执行体、源码锁与 #63/#65 tab/native/owner/进程/归档/retention 门保留。

## 与 #66/#68 的窄组合

- #66 可先接 8d6e4b021 三代码叶。本包不改其 helper/schema/tools；`learner/lib/knowledge-runtime.ts` 后续只给已登记新运营审计增加原 K1 合同，合并须保留 #66 固定指引。
- #68 的 `learner_checks.py` 两处 full argv/锁执行体保持原样；本包只动报告读取和 finish/recheck 开头的产品分流。第二处补测仍在 Python-held source flock 内，#68 必须在其外准入或证明原祖先 lease，不能仅包内层 argv。
- `run.sh` 两最终 exec 都保留 `data_launch` 前缀；原 game-admission 和 K1 顺序不变。#68 外层 game 身份桥需保此前缀，不能整叶覆盖。本包不接其资源/共享队列状态。
- `codex-ops-learner.sh` 新两审计任务自带 batch，#65 原任务 params.batch seal 差量须窄合，不能回退。

## 验证与余项

全为固定输入。20项 Python 实际 SQLite/Git worktree/原 ledger/提案/统计/校准夹具通过；真实 K1+运营跨进程 mixed probe 通过：运营1完成、K1独立发布、源码未合入仍失败、未知能力拒绝，无模型或源码重放。生产tsc与runtime CLI编译均exit0，定向43项及原升阶/wrapper/registration/retention 53项通过；原药水fs mock循环修正后16项通过。

交付冻结清单 `source-freeze-delivery.json`；启动 `delivery-check-start.json`；原始沙箱脚本终态 `sandbox-delivery.log`：638文件中635过/3败，5900项过/3败，exit1，1415.20s。三个失败为新增D1路径注册字符串触发原模型读取者静态检查、账号启动夹具未复制新适配器依赖、基线历史输入稀疏缺件。没有将此轮称为全绿full。

运行时源码保持冻结；仅精确调整测试注册表识别/补齐账号夹具模块，并经原storage工具展开HEAD的`paper/materials/issue29-brain-speed/results.jsonl`（blob b84d95c5185941eec143cbcf2966d5770309cca5）。静态检查只排除该文件的显式names Set，其他导入/读取位置仍拒绝。恢复复验原三失败、实际D1读回和脚本尚未执行的paths，共5文件23项全过、exit0（`final-recovery.log`）。后置两测试叶及恢复blob见`verification-delta.json`，未重复全量检查。

`validation-history.md` 保存所有早期失败与中断。线程池/fork的卡住最终定位为本包静态node:fs导入与既有mock工厂循环，已修为D1实际消费时延迟读取；原测试未被排除，完整轮已越过该点。各中断轮无最终分母，不算通过。原诊断测试worker已退出，未停止其他会话。

复验命令（串行、固定数据；不安装依赖）：

```bash
nice -n 19 python3 ops/tests/test_learning_runtime.py
# In agent/; the script includes production tsc and the fixed sandbox exclusions.
nice -n 19 env SANDBOX_WORKERS=1 bash tools/test-sandbox.sh
# Compile tsconfig.knowledge-runtime.json in agent/ first, then from the project root:
nice -n 19 python3 ops/tests/learning_runtime_mixed_probe.py --node "$NODE_BIN" --cli agent/dist/agent/tools/knowledge-runtime.js
# Exact recovery after the recorded full, in agent/:
nice -n 19 node tools/with-temp.mjs node_modules/vitest/vitest.mjs run tests/fight-value.test.ts tests/account-drain.test.ts tests/check-imports.test.ts tests/learning-runtime.test.ts tests/paths.test.ts --pool=forks --maxWorkers=1
```

当前交开发工程核收，#66/#67/#68 实际集成组合的唯一适用完整检查仍由原集成员执行。原 ops 沿自然节拍逐入口接运行、单写切换与真实原文/数据读回，登记代码路径未触发及父项/提案状态。自然尚未出现的复盘/审计/统计/校准项继续 runtime 跟进，不强开局、重学已完成批次或伪造样本。工程接收后的空闲释放和实际删除仍分别沿 #59 与原 retention，开发会话不自行清理原树。

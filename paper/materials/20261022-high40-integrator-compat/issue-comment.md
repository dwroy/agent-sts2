[watcher] 已接续并核定 high+#40 六项失败均来自精确组合的测试依赖/版本错配；实际发布仍阻塞，原失败保留。

原失败树 `9e53f156c3e1662e2ab6cffe667610214b005ca4`，tsc0/full1，不改写原回执，不把独立绿当联合绿。

- 四个缺失 Python 脚本经 `git cat-file` 证实根本不在该树，属于组装遗漏，非 sparse checkout 缺实体。wrapper 从 main 整叶带入了 live 尚无的旧增量测试；#40 自身只向此 wrapper 增加 `test_refresh_pipeline.py`。
- `v6_learning_loop_test.py` 的 construction_log 断言来自此前 #35，联合候选明确未含 #35 的消费者；#40 在此文件实际仅改 fixture 与刷新周期断言。
- `component_usage_test.py` 留在旧 live 版本，而整叶 report 已有 ionice/flock/单线程后台队列；受测 main 已有匹配断言，未带入此联合树。

集成员正在隔离树准备最小测试兼容组合：保持联合树全部运行源码原字节，仅将 wrapper 收窄为 #40 实际新增的12项固定管线测试、在 live 原有 V6 回归上应用 #40 的实际增量，并补齐已受测的 component_usage 断言。不会引入 #35 实现或整包 main；四个属于未发布前件的旧测试仍保留于 main/原候选，不能称它们在 live 组合通过。准备后先定向验证，再对新的精确树安排一次唯一完整检查；原 ops 树不动，本角色不发布/不解除暂停。

诊断材料：`paper/materials/20261022-high40-integrator-compat/`。#35 后续仍须在新实际 live 上重核；后序 #28/#37/#36 不跳过原顺序。

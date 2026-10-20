定向检查启动记录（摘要依据本会话工具回执，不冒充完整原始日志）：

- 默认 bundle 配置加载器因共享 node_modules 只读而启动失败（EROFS，退出1）；后续使用 --configLoader runner，测试范围和时限不变。
- 一次从仓库根组合 --root agent 与相对 --config 的命令配置解析失败（退出1）；改在 agent/ 中执行。
- 新增用例初稿要求 spawnSync.error 为空，在沙箱实际完成子进程同时返回 EPERM 时失败；原日志 with-fix-runner.log 保留。现仅容许此已知 EPERM，仍要求真实状态0、无signal、Ran 1 test 及 OK。

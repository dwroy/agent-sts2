# #65 退出守卫夹具恢复

原 full 在 ROOT 隔离 W 中运行，689 文件、6727 通过、0 失败、2 跳过，结果 SHA bcd68f82e8986d00f25be0489ca3bcdfe33cfeae32fddbb1e45da57543a077f8。原 full-state.json 的 full-stopped 保持不变。

16:48:39 原 worktree storage 清扫对隔离 LIVE 树 G 的固定 HEAD 355ddcb9 执行 thin，回执仅回收 1 文件/212992 分配字节，prepare journal 为 bb94cef2adc94265bea0fcb2828f09e8.json。实际缺失仅 paper/materials/issue29-brain-speed/results.jsonl；ROOT 2865 输入、依赖 1417、其他 LIVE 1784 输入均未变，ROOT 索引内容/标记与两树内容树均保持冻结值。该文件在编译及 full 前已两次核同；full 使用的 W 对应文件一直保留。

沿原 storage materialize 入口恢复原锚点 blob b84d95c5185941eec143cbcf2966d5770309cca5，211076 字节/SHA 8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef。仅在自身 G 上临时 worktree lock 防再次空闲缓存回收，退出核验后解除。恢复后沿冻结 W 的 issue29-deepseek-stream.test.ts 六项回归（仅派生为绝对 W 模块入口与实际 G 夹具读取，断言原样；派生 SHA 另存）和全部冻结输入、依赖、树与 ROOT 索引重新核收；结果另存 fixture-recovery-acceptance.json 和 terminal-readback.json，不覆盖原 full-stopped，不重复 full，不改产品源码或生产现场。

原存储回执/prepare journal 和物化回执保留于 .artifacts/integrator65-combination-20261025/runtime-storage-thin-{original,prepared-original}.json 与 runtime-fixture-materialization.json；发布材料保存其 SHA 与相关摘要，避免复制无关历史路径。首个定向命令误假定 G 含 tools 测试文件，实际生产输入清单不含该文件，原路径错误日志保留后修正派生入口。该事件归隔离检查夹具与存储回收冲突，未发现 #65 产品代码失败。

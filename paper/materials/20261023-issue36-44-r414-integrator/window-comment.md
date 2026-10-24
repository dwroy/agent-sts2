[watcher]
按 Claude 6345466773，本轮已将 #36 测试夹具 `f0a967266449b1d758f7d28c5f3404804981ce4c` 与 #44 测试修复 `110cbd8e113cf2dddf526bc196b8ad2e483b2181` 合在实际 R414 `fdae435795f41d771da6df3457eb890e50d8ffeb` 上，原 R3 运行代码与 #40 最小前件保留。

- 独立核同两份修复共 12 个测试文件的 R414 前像及源交付 SHA；没有改运行算法、预算、生产配置。
- 组合树 `6b8d15d12d6acf96cfbe9b4359878e142c5685f3`；冻结实际 live 的 468 份非 builder 知识数据，未回写 live。
- 先行自查：tsc 通过，19 个定向文件 / 214 项通过；Python boss-home 6、view 15+1 skip、TUI 18 及 4 份 shell 语法通过。
- 本次唯一 unfiltered full 已于 2026-10-23T00:21:46+08:00 开始，单 fork、禁止文件并行、nice 19；结果另存 `paper/materials/20261023-issue36-44-r414-integrator`。运行中，不报通过、不交发布。

旧失败 `35be70748`、原两项失败及原始日志保留；本轮核收 #44 仍以实际完整结果为准，不据旧同树重跑声称稳定。后续 main 兼容消费者只做定向核验，不再开第二轮 full。

[watcher] 更正检查输入：已中断缺少最新知识快照的本角色检查，原件保留；正在核同原 ops 知识快照的新精确输入上做唯一完整检查，尚未通过。

本角色准备隔离树时漏带了原 ops 的知识快照，221 份知识 JSON 与原 ops 冻结输入/当前 live 不同。因此18:46那次不能作为精确发布准入，18:56主动中断，原 `full-first/` 的检查状态、日志、退出码与 `interruption-request.json` 保留，不改写为产品失败或通过。

已在 K→L 短锁内只读核取当前 live 的462份知识 JSON，逐项核同原 ops 冻结快照；生产未改，锁已释放。代码树仍 `459699abeb08d0d238f6a537eea817476d72587f`，28个交付文件；最新完整输入与旧失败组合相比仅三个测试叶 SHA 有变，额外纳入一份 ops 收件箱固定输入。知识以冻结快照覆盖于隔离树，未暂存为发布代码。

新检查原件 `full-latest-knowledge-first/`，runner907918/start9115848，nice19/单worker；2488输入，生产tsc/full进行中。请 ops 不重启旧27叶脚本或重复同源 full；终局绿后交新的精确回执/代码提交，仍须原发布门核最新知识及预像、绑定与自然边界。live仍R411，Roy暂停未解除；本角色没有发布。

材料 `paper/materials/20261022-high40-integrator-compat/knowledge-snapshot.json`，动态原件 `.worktrees/integrator-high40-compat-20261022/.artifacts/high40-compat-20261022/full-latest-knowledge-first/`。

初始定位尝试build.py/baseline.py及根目录复盘scratch不存在，已改用实际已有prepare.py/summarize.py及原始日志抽取；未改源数据。
辅助计数命令出现一次多余右括号，已以相同只读计数纠正；未改变证据。源测试启动前tail使用了agent/下的相对scratch路径未命中，测试入口独立继续运行；不把此定位错误算作测试失败。
隔离源测试第一次：tsc0，vitest340文件中339通过、3395用例中3394通过；silent-apotheosis-reference.test.ts:114固定战斗题超过15秒（实45.514秒），退出1。原件test-source-isolated.log/exit保留。按任务降低并发3→2，原沙箱全入口重跑，未改经验/源码/超时/排除。第一次commit-and-merge脚本在测试门禁处退出1，尚未git add/commit/合入，原件保留；重测通过后由独立retry日志续接。
核原失败测试：agent/tests/silent-apotheosis-reference.test.ts:19起拒绝磁盘知识、:31将selectLessons固定为空，使用冻结evidence及本地模拟；本次为15秒墙钟超时，无经验内容断言失败。保留失败事实，最终仍以完整重测退出码为门禁。

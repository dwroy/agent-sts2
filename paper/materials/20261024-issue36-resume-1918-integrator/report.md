# #36 接续定向核验

核验时间：2026-10-24T19:20:50+08:00。本轮没有新源码交付；原 source 6905591f0c 的宿主增量已于 main 293ef1bdff78 精确集成。

19:10:20 结束的净 #37+#20 完整检查现已逐项核到 #36：当前根目录、验证树与冻结清单的三份运行源码、八份 TS 测试和六份 Python 测试共 17 叶 SHA 全同。八个 TS 测试文件 281 个断言通过，其中原七文件为 280 项；第八个 Python 包装测试调用 test_learner_tui/test_learner_wrapper_completion，其嵌套方法不另加入 full 分母。其余四 Python 文件此处只证明冻结输入一致，不冒另一次逐方法执行。完整检查总数 673 文件 / 6600 过 / 0 败 / 2 历史跳，两套 tsc=0。原 full.json SHA 与完整终态回执同，未另起 full。

新自然批次 20261024-191311-strategy-proposal 已 native-accepted；pane w1H:pEB，session 01a16d9e-1daf-7c41-8a21-8cf5aae68a9a，turn 01a16d9e-91ec-77f0-ab81-6eb8910c0695，native PID 3772411 / birth 26496982。只读核到新 wrapper→ROOT/learner_entry.py→ROOT/learner/run.ts 路径及原生 turn_context gpt-6.1-sol/high。这里只证明新自然启动与原入口身份；当前磁盘 SHA 不代进程内已加载模块字节，也不代异常分支触发。其自然结束/有界屏幕观察/terminal-unverified 75 回执仍待原 ops。

旧 080423、083104、084301 三份 TUI 原件 SHA 与 14:49 回执完全相同，仍 needs-attention / retirement_authorized=false，原 seal 均缺。普通成功末回合或新启动不释放这三条原恢复合同。未 finish、重派、发键、强关、热切、模型调用或修改生产。

证据：full-coverage.json、natural-start-readback.json、natural-native-snapshot.json、old-three-readback.json。保留旧失败与原日志；#36 父验收、#20 真实 24h、#27 正式 ACK、#39/#43 和科学父分别沿原 owner。#37/#20 已交 ops 的新发布事务仍沿原交接，保 R430–R437 及后续知识。

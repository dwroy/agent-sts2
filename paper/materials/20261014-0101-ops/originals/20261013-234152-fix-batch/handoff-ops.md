# 原普通 fix-batch 接续资料

本分支两源码提交均已固定负对照和完整沙箱自测。整枝合入在 live-merge.lock 内预检失败，未实际 merge、未覆盖刷新或历史；无上线记录/新 eval 版本/账本 shipped。原失败和工作树保留。

- ACK：15eb85e2934e428c5e299fc4a1aba456d92fd685，仅三个叶子（ops/learning_requests.py、ops/tests/test_ordinary_notice_ack.py、agent/tests/ordinary-notice-ack.test.ts）。真实第二槽批号仍被当前 live 旧正则拒绝。本任务没有登记任何真实通知 ACK，也没有替 watcher/Roy 确认。
- DPR：9e6dd82a34fb8c14e012be68fd0b632544f1459f，仅三个叶子（ops/module_health.py、agent/tests/module_health_test.py、agent/tests/module-health.test.ts）。当前 live 在本轮自测期间已并行部署 9b87d54f097d84521152e6cca8d6072af8140394 的明确不支持诊断；F22 误报限定子项不重复覆盖。两实现字段/连续失败计数与候选部分缺失诊断不同，保留该已部署实现和它的 tests，不据此关闭性能父项；是否整合本分支附加诊断由原普通源码接续处理。普通批不补游戏知识。
- 实际 live 7e04d9a42dd6080a8d3716dd165e44d4b30c458d；锁内知识刷新目标无变化，本分支没有知识改动。原两份 dirty notes 保持。
- 原整枝包含 31 冲突，含两个健康源码/测试、10个知识、历史记录及论文数据；merge-tree.log、merge-result.json 留有原始结果。不要整枝覆盖 live 的刷新/9b87/他人记录。
- 测试：ACK 提交前及 DPR 最终提交前均 tsc0，375文件/3578用例通过。DPR首轮4worker仅 rollout-live ranking原120000ms超时（159180ms）；单项单worker101.83s通过，完整单worker再通过。两个 gitleaks0。对应 bug-infra 账本查询无匹配，不新建、不改 shipped。
- 原宽策略、DPR执行性能、上游目录生命周期、旧未证通知投递、量化/经验父要求保持；已有原提案沿其调度链，不新派或造 ACK。纯工具，不涉及 implementation_domains/code_proposals 新登记。

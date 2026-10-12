# 测试证据与范围

本批只修改两个测试文件；没有生产源码、游戏规则、知识、预算、断言删除或网络调用。
来源：fix-queue-v4:1087，07192e6fa 离线审计集成时的既有测试失败。
原件：paper/materials/20261012-1013-ops/integration-coverage.json、failed-test-unchanged-inputs.json。
原失败的四个源码 blob 相同；原自然暂停的精确时刻未知。本批用固定时钟验证同类失败路径，不倒称已测得原负载原因。

原最佳线路用例全部断言迁到已有固定模型文件 rollout-best-added.test.ts，继续使用 tests/potion-cost-knowledge.json 和 logged-states/g8yy-f30-t3.json。
夹具环境锚点 G8YYU94P2SBB F30 T3；牌/敌参数沿原测试写死，是测试基础设施复现，不是新增本角色游戏经验。
既有铁甲与静默生产行为均等价。

- fixed-targeted.log：1 文件 4 例通过。
- without-fix.log：只撤掉新增 rolloutLiveOptions.now = () => 0，保留所有断言、固定输入、10000ms 主机暂停；1 失败/1 通过/2 未选用。失败值 degraded=[1-turn]，保持真实截止降级路径。
- restored-targeted.log：恢复隔离，2 文件 6 例通过，包含原有 advancing-clock 降级断言，未提高1500ms生产预算。
- 本次无生产源码修复，撤码对象为测试设施时钟隔离；未将测试失败条件一起撤掉。
- 该问题未找到对应 bug-infra 账本，不新建账本；rollout-live 的其他机制账本与本项无关。

一次恢复测试命令在 bubblewrap 建立阶段遇到并行 exp scratch 路径消失而未执行，原错误见 sandbox-startup-failure.txt。相同命令重试成功，没有改变隔离权限。

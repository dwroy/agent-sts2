[dev #84] 已核调用链并提交具体方案，等待主管批准后实现；标签已改 in-progress，尚未改可执行代码或生产控制。

方案：
1. 全部 fixed producer 改为各自入口及真实导入/动态执行依赖闭包，输出逐叶来源/SHA。区分 LIVE producer 与实际 ROOT 验证适配器；缺叶拒绝。outcome 不再包含无关 agent/src。
2. 原工程核收生成受测部署组合的方法准入材料；原 publication-admission/K→L 写事务在部署前核材料、部署后核实际字节并 CAS 登记 methods、保存回执，完成才 release。相关改动缺准入材料则拒绝发布，中断接原事务；禁止事后手改 control。迁移以实际 #81 V6-R459 为基线，不准入 f6e 中间态。
3. 原 refresh 入口补齐准入失败等步骤终态；按 step/character 和独立 cycle 计三次连续明确失败。D1 原发布水位超过12h也追加主管 inbox，成功 unchanged 不冒新发布；复用原 refresh/stall 观察，持久去重，无新定时器/模型。
4. 补算走新 request/原队列。现 outcome reducer 读 raw；拟用 LogDB 的 offset/length 索引取回原始完整证据，复用原 reducer，固定测试核 raw/LogDB 等价，索引不完整拒绝。实际部署/准入后由原 ops 执行一次 outcome:silent 并核新 D1/消费者；旧三次 published、旧 D1 和失败原样保留。
5. 固定测试覆盖无关/相关输入、缺叶、发布缺材料/CAS漂移/中断恢复、3周期/12h及去重、旧新D1与消费者读回。交固定提交和部署映射，原集成跑唯一最终组合检查，原ops接下一次无关正常LIVE发布的稳定指纹及成功刷新自然验收。

完整方案：`paper/materials/issue84-fixed-producer-plan.md`。开发基线 `0b80fde869167b3ed9ecfc8999c57f7b87b8a898`，nice19/最多两进程，不运行play、不改live/STOP、不关其他会话。本条是方案待批，不是工程交付，不提前改review。

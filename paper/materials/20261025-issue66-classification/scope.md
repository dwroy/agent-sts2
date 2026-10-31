[dev #66] 已开工；分类采用同一 K1 快照内稳定 ID 关联的严格元数据，不改写游戏结论。

预计改动 agent/src/knowledge/runtime/{classification,classification-schema,validation,store,reader,schema,projection}.ts、agent/src/brain/tools/{typed-knowledge,query-guidance}.ts、agent/tools/knowledge-runtime.ts、learner/lib/knowledge-runtime.ts；追加分类合同、固定回归与性能材料。
共享接口：knowledge-candidate-v1/files 保持；新增角色/common classification.json（knowledge-classification-v1），以 path/type/original ID/parent/目标内容 SHA 绑定正式条目，和内容在原候选事务内校验发布。主题枚举沿用 startup/boss/double_boss/build_route/climb_route，不替代适用范围；未分类保持 unknown。schema 2 事务增量升级，原 K1/绑定/候选/证据不改。
工具沿用参数化索引，增加有界分类覆盖及分阶段空结果诊断；策略线索提供工具/参数。学习/runtime 维护标签，源码工程交原集成员最终组合检查，ops 接自然发布与实际候选读回。开发仅隔离库，不改生产/live/STOP/账号/调度队列。

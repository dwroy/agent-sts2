[dev #66] 文件范围已登记于 #66/6395326635；共享入口先按此合同对齐。

#66 独占正式知识 agent/src/knowledge/runtime/{classification,classification-schema,validation,store,reader,schema,projection}.ts、brain/tools/{typed-knowledge,query-guidance}.ts、agent/tools/knowledge-runtime.ts 及分类固定测试/文档。knowledge-candidate-v1/files 和 K1 不变，新增 characters/<角色>/classification.json、common/classification.json，严格 schema=knowledge-classification-v1，以 path/type/id/parent 与目标内容SHA关联，同候选原子校验及发布，不扩大范围。
#67 请独立维护运营记录及完成/刷新通道；若需修改原 store/schema/CLI，先采用独立模块，待 #66 固定提交后串行追加。learner/lib/knowledge-runtime.ts 交 #67 负责，本项只新增 learner/lib/knowledge-classification.ts 导出 classificationLearningInstructions(character) 文本；请 #67 在运行时任务注入中引用，或固定提交后由集成精确接线，避免覆盖原入口。原 complete/候选身份/来源核验保持；分类元数据仍走正式知识候选，不自动把运营报告变为知识。

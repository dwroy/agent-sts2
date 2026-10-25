[dev #66] 已接6395371177，分类最小接线现在可固定，不等待运营全包。

helper 已实现在本树 learner/lib/knowledge-classification.ts：export function classificationLearningInstructions(character: string): string，零依赖/零副作用。请 #67 优先固定 learner/lib/knowledge-runtime.ts 的 import 与在原已登记 runtime 内容合同字符串末尾追加 ${classificationLearningInstructions(character)} 两处接线，并交只含该接线和定向验证的提交；#66 将核精确补丁并加入分类工程组合。后续运营增量基于此固定版本追加。若这会阻塞请在此说明，本项沿主管裁决自行做同样最小接线，原入口其余代码保持。
分类草稿CLI、严格校验、事务发布与真实ToolDef已经实现，既有runtime/typed定向26过；正式分类候选回归、冻结缺口与规模检查进行中。仍不触碰生产库/对局或现有批次。

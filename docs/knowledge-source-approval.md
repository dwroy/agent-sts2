# 知识来源批准的产物审计（#79）

外部/回刷完成回调仍由原 `report_proof` 核来源、原生消费、逐 ID 去向、报告与 scratch 路径，再保存原 `runtime-source-approval.json`。本变更不重写原 report、candidate、approval，也不补造 wrapper 终态。

## 产物与分类

批准路径以 `.json` 结尾（大小写不敏感）时，严格解析 JSON，只批准清单中该 `id` 对应的完整对象；数组、`entries` 数组和单对象保持原支持。坏 JSON 继续拒绝，不因解析失败降级为档案。非 JSON 产物（包括 Markdown）作为证据档案，必须携带并核对原字节数和 SHA256；不解析、不授权任何知识对象。JSON 批准项已有的字节数/SHA 同样核对，保留原无校验字段的 JSON 兼容接口。

分类采用声明式关联方案，复用学习者已在候选中写出的 `target`，不增加需要改写历史文件的新字段：只有同角色 `classification.json` 条目的 `target.type=strategy`、`target.path` 为本角色 `strategy-entries.json`、`target.id` 精确存在、无 `parent_id` 且目标规范 JSON SHA256 一致时，才可关联到已批准的完整策略对象。该策略必须逐字存在于批准 JSON 的对应 ID 中。分类的 topics、entities、aliases、evidence、rationale 均来自原学习者候选；程序不根据 ID、标题或正文推断标签。

先验证分类格式、角色和目标 SHA，再审计授权。缺 target、错角色/类型/ID/父项/SHA 或没有批准策略对象都拒绝；其他业务类型的分类继续要求显式批准分类 JSON 对象。直接批准分类对象的既有路径保留。文档格式、证据/反证保留、scope、对象删除、原 base CAS 等检查保持，审计通过不代表内容科学成立或自然采用。

选择这一方案是因为原候选已经包含明确且可验证的 target，能不改变 182334 的历史 report/candidate/approval 而合法重试；只改后续模板的去向要求无法受理这个原批。学习模板同步解释这一窄关联，避免后续批次遗漏授权边界。

## 原批受理与终态

部署时将 `agent/src/knowledge/runtime/approval.ts` 与 `store.ts` 配套接入实际运行知识 CLI 的树；ROOT 学习模板同时接 `learner/lib/knowledge-classification.ts`。保留 #73 及共享叶后续差量，不能只部署 store 而遗漏新模块。本项不改游戏策略、正式知识正文、版本编号或数据库 schema。

原 ops 对 182334 用原 ID、原路径走已有完成 recheck，先鲜核状态及原文件 SHA。若原 base=current，普通 `complete` 即可；若 current 已前进，仍按 [#73 显式续接](knowledge-publication-continuation.md) 验证原候选并受理，不自动重基或覆盖候选。分类批准审计不跳过 CAS、来源/native/报告、源码变更或原 runtime 绑定门。

真实发布、完成回执、唯一 `complete:<原batch>` 事件沿 #73 同事务提交；同 ID 重放返回原回执，保留拒绝历史。不重开模型，不修改旧 approval 来补去向。实际发布后核生产 `kb_strategies` 读回新增 ID `silent-brain-poison-flexible-prefix-continuity-review`，并结合 #78 检查完整工具返回不超过 24KB。隔离库读回不能代生产验收。

wrapper 监督/finish/退休证明仍按 #65/#77 由原 owner 核收；知识发布成功不生成或替代 wrapper 证明，也不授权关闭 tab、释放道位、回收工作树或关闭 #51/#60 学习父要求。

## 回退

原 ops 暂停新的此类受理后，反向本次三个源码叶差量，保留原 approval、候选、失败记录、已提交的知识版本/完成回执和 wrapper 材料。代码回退不撤销知识 current，不删库表、不重写历史。此前已实际发布的内容如需回退，另沿原知识回退事务核收。

## 当前 main 的方法闭包配套（2026-10-30 恢复）

schema5 main 上的 #84 声明会核 Silent 校准真实的整套 agent/src 读取族。部署新增 approval.ts/store.ts 时，ROOT 还须配套 `ops/fixed-producer-dependencies.json` 中该 producer 的原 store SHA/静态边、approval 新节点的两条静态边/opaque SHA，以及原 refresh-silent 的显式读族边。学习 helper 仍为 ROOT 注入叶，两个发布模块按实际 ROOT/LIVE 知识 CLI 安装映射核收；不能遗漏新 import。

本次固定组合逐项核 13 闭包通过、其余 12 个方法（含 outcome）不变；校准方法因原整树指纹真实包含本源码而改变，不表示执行生产校准、修改模型或提高可信度。实际发布仍由原 owner 依 #84 合同从最终唯一组合终态准备双根/方法前像材料，并在同一自然发布事务核安装与准入；不手改 control 或复用旧方法票。回退也须将这项声明与源码反向差量配套恢复，保留其他并行声明、方法/知识历史与原回执。

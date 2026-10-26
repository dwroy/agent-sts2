# #73 并行知识发布续接交付

本项补原 #60 的旧 base CAS 工程缺口：原候选不变，原 ops 显式受理经过原来源审核的后继，原 batch completion 消费真实后继发布回执。开发基线 `16f66e76ad49e65df75a2efd88685b56fb86294d`，独立树 `issue-73-knowledge-publish-continuation`。原 #60/#51 的内容、自然采用、收益和 c1 未读要求继续保留。

## 实现

- `continuation.ts` 只接同角色策略/分类文档，文档头不变，按对象 ID 合并原批准 delta 与明确的新 base。拒绝同对象并行变化、删除、不支持形态和越界；沿原三个校验及分类 target SHA 复核。
- `admit-continuation` 只登记后继和原批次、原 digest、旧新 base、完整批准项/实际 artifact SHA/字节数、逐对象前后 SHA；不发布。原候选 body、digest、base、validated/version=null 保留。
- `complete` 继续接受原 candidate 文件。后继发布、原批完成回执和唯一数据库完成事件同事务；在真实写事务重新核 current。数据库已提交而回调状态或输出丢失时读回同一回执。
- 原 ops enqueue 增加可选的完成请求 ID，`knowledge_completion_events.py` 沿原 queue/delivered 持久投影、硬链接去重；不加调度器或模型。batch 回执仅记录实际 enqueue，不称已读。来源 approval 原文件存在时只读核同；原历史失败不覆盖，后继失败追加有限原因和错误摘要。

合同、命令、部署和回退见 [knowledge-publication-continuation.md](../../../docs/knowledge-publication-continuation.md)。共享源包括原登记的 store/schema/CLI/宿主回调，另有 `ops/codex-ops-learn.py` 的窄 enqueue 接线；按固定叶及补丁与后续 #69 共享改动串行集成，不覆盖其他会话内容。

## 固定证据

原权威合同为 #60/6404051988、6403975919；原件仍在原 ops/集成材料目录。原候选 raw SHA `88dc35cd2a74f4849106153b7ead92109786f2491b9d20dd4470849043a80616`，canonical digest `5773057c4c17ded98ca973de07c079e6dc16f34438c2cb5703ef91095876a455`。

`frozen-inputs.json` 登记本树忽略目录 `.artifacts/issue73-frozen/` 的固定输入。原9版 lineage 从只读库导出，候选/批准 artifact 和审阅稿按原 SHA 核同；不提交整份来源数据或过程库。`replay-original.mts` 只在新隔离库通过正式 store API 重建原版本，不用 SQL 篡改 base/current。原4策略更新、3分类 target 刷新/1分类新增与原审阅稿一致，合并136策略/6分类，原候选不变，并行两个新增对象保留；四条策略的真实索引查询正文逐项 SHA 核同。重复完成为1次发布/1个数据库完成事件，详 `original-replay.json`。

`callback-probe.py` 将已受理隔离备份交真实 Python 回调和真实 CLI，在原 batch 身份下完成并重放丢失的 batch 状态，通知仅1个，原 CalledProcessError 条目不变，详 `callback-readback.json`。这个 probe 只替换已独核的来源证明查询返回，其余 Git/提案审计/绑定/候选审核/发布/完成/通知运行实际代码；不冒本次已重新核过原 native 来源全过程。

第一轮 replay/callback 输出保留；批准证据记录补齐所有来源字段、实际字节数及宿主队列 API 后，另留最终复验，不覆盖旧输出。第一轮与最终都未写生产库。

## 检查与接管

生产与 CLI tsc 均 exit0；最终定向四文件30项、typed tools 16项、paths fork 11项及宿主Python32项均通过。首轮广域644文件/5945过/2败原件保留：旧CLI code标识限制已恢复兼容，缺少的issue29冷夹具按原HEAD blob核同恢复，两失败点均由最终定向复验通过。最终实际ROOT/LIVE组合full仍待原集成，不把首轮红结果改绿，也不重复开发广域。详 `checks.json` 和原日志。沙箱广域检查逐字复用 `agent/tools/test-sandbox.sh` 的固定排除清单，以单 worker 直接 exec，省去 npm/with-temp 的额外父进程以满足本次 ≤2 进程限制；生产 tsc 和 paths fork 单独顺序运行。参数、固定脚本 SHA 和临时 scope 见 `sandbox-command.json`。这不代原集成唯一实际 ROOT/LIVE 组合完整检查。

原集成核固定提交、精确叶/共享依赖及实际部署前像，沿原唯一入口检查；ops 部署完整匹配组合后鲜核原053954/来源/current，执行一次合法受理，再走同一 batch 原 recheck、真实 finish/封存/retention。原未消费 c1 与库存沿自然链续，不手改 wrapper、lane 或消费标记。

本项没有改 main/live、生产库/control、STOP、游戏行为、知识内容、账号、权限、预算或并发，不运行 play，不关闭其他会话，不分配游戏发布号。代码回退保留新增关系/回执/事件及原失败；已受理项不交旧 complete 冒完成，实际知识回退另走原事务。每个原候选仅支持一个固定受理关系；受理后 current 再变会明确拒绝并留现场，不自动重基。

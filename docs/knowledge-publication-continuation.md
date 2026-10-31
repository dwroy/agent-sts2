# 并行知识候选的发布续接（#73）

本合同只补旧 base 的工程续接。原候选的 ID、body、digest、base、批准产物和失败历史保留；后继是发布候选，不是新学习 batch。开发固定复现不修改生产库，也不代实际发布、wrapper finish、retention、道位释放、消费者自然采用或收益验收。

## 支持范围

只接同一角色 `strategy-entries.json`、`classification.json` 的对象级增量。按原 `id` 比较旧 base、原候选和明确指定的当前版本：候选变动对象在当前版本必须仍与旧 base 相同；当前版本的其他对象按原内容和顺序保留，新增候选对象追加。文档头必须三方一致。不按字段拼同一对象，不自动刷新分类 target，不扩大角色或科学适用范围。

删除对象、非支持文档、头字段变化、同对象并行变动（即使最终内容相同）、来源批准不符、分类 target/引用不符都拒绝。校验沿原 `validateDocuments`、`validateUpdate`、`auditApprovedChanges`；合并前核原 delta，合并后核相对新 base 的实际 delta。分类 target SHA 由完整文档校验重新核对。

## 原 ops 的受理与完成

部署匹配源码组合后，原 ops 先核原 batch、原来源/native/报告、候选状态和批准产物，再以实际鲜核 current 显式受理。以下占位符必须替换为原事务的真实值；命令不隐式选择生产目录：

```bash
nice -n 19 node --import tsx agent/tools/knowledge-runtime.ts admit-continuation \
  --runtime "$RUNTIME" --id "$ORIGINAL_BATCH" --batch "$ORIGINAL_BATCH" \
  --base "$CHECKED_CURRENT" --approval "$ORIGINAL_SOURCE_APPROVAL" \
  --receipt "$ADMISSION_RECEIPT"
```

受理不发布：短写事务再次核 current，原子登记新后继及 `candidate_continuations` 关系。关系含原候选/批次、旧新 base、原 canonical digest、完整批准项（保留来源单元等字段）、实际 artifact 字节数/SHA、逐对象前后 SHA。后继 ID 由这些输入确定。原候选保持 validated/version=null；其真实发布结果通过关系和完成回执查询，不伪称原候选本身已发布。

随后由原 ops 沿同一 batch 的原 recheck/完成入口推进。`complete` 仍读取原 candidate 文件；来源审核、角色、原 dispatch HEAD、源码门和 runtime 绑定继续核验。已有 `runtime-source-approval.json` 只读核同，不覆盖不同证据。完成回调检查批准项与受理证据一致，再发布已受理后继。未受理的旧 base 候选继续拒绝 CAS，不自动合并或创建后继。

快照及索引准备后，实际写事务仍核后继 base=current。准备期间 current 变化就拒绝并保留关系、孤立快照和失败记录。每个原候选只支持一个固定受理关系；需要改 base/批准证据时明确拒绝，交原 owner 重新审阅，不自行覆盖旧关系或连环重基。

## 完成与崩溃重放

发布、原候选到实际发布候选的 `knowledge_completions` 回执、唯一 `complete:<原batch>` 数据库事件在同一事务提交。回执包含原 batch、实际发布候选、真实版本、首次完成代码 SHA。事务中断全部回滚；数据库已提交而 stdout、Python 状态保存或通知失败时，同一原 batch 重试读取同一回执，不重复发布，不改变后来 current，也不改写旧失败。

ops 通知仍进原 queue/delivered。`knowledge_completion_events.py` 以数据库事件请求 ID 保存持久投影记录和固定文件名，先 fsync 正文再硬链接入队；consumer 原子移动到 delivered 时保留第二硬链接。重放核固定正文和链接，不因批次状态尚未保存或队列已消费而重复投递。该账本和 delivered 原件继续保留，不新增调度器或模型；排队不等于 ops 已读或 Roy 已知。

`status --id 原batch` 返回原真实状态及后继关系、完成回执、最近二十条脱敏失败。完整失败记录在追加表 `publication_attempts`；Python `knowledge_attempts` 继续追加错误类别、退出码、stderr SHA 和有限原因码，原历史 CalledProcessError 不倒填。原始错误文本不复制进这些状态。

原批实际 done 后，wrapper finish/retirement、封存、retention 和外部道位仍由原 ops 按原门推进。#60/#51 父要求、c1 未读状态及其他库存不因本工程交付而关闭。

## 部署与回退

此项为 schema3 的追加表，不改已有投影格式或知识正文。读者不需要新增表；历史只读 `status` 对缺少新表保持兼容。ROOT 和实际承载知识 CLI 的部署树必须同时有 `store.ts`、`schema.ts`、新增 `continuation.ts`、`knowledge-runtime.ts`；宿主同时部署 `knowledge_runtime.py`、新增 `knowledge_completion_events.py` 和 `codex-ops-learn.py` 的 request 去重接线。原集成须按实际 ROOT/LIVE/宿主前像冻结组合，保留 #71/#72 和后续共享叶差量，不覆盖整文件。

回退先停止新受理并保全部关系、回执、事件投影和孤立快照。已受理/已发布原批沿该匹配版本完成核收，再反向本次代码差量；不删表、不回旧 current、不改原候选或 wrapper。未发布受理在旧代码中继续保留为待核，不能用旧 complete 当作已闭合。若要回退实际知识，另走原知识回退事务及证据核收，不借代码回退隐式撤销知识。

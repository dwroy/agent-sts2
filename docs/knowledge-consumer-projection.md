# 知识工具的有界消费投影（#78）

`kb_strategies`、`kb_experience`、`kb_reflex` 在原筛选完成后生成消费投影，整个响应仍最多 24000 个 UTF-8 字节。SQLite 的 documents、revisions、business_items、完整证据、旧 K1 和磁盘原文都不修改；不迁移 schema，不调整置信度、触发器或游戏规则。

小条目保持原表示。超过 6500 JSON 字节的条目保留 ID、trigger/正文、confidence、scope、来源和冲突状态，提供证据计数、选取的证据引用及反证摘要，标记 `representation=consumer_projection`、`truncated=true`、`omitted_fields` 和 `original_bytes`。证据计数与声明的 n_support/n_contradict 分开，引用数不冒充独立样本；外部分母不求和。优先保留一条明确反证、原数组末尾引用及外部分母最大的引用，最多三条；数组顺序不推定真实日期，分母大小不推定证据质量。补证历史、外部来源和局限另给有界摘要，完整内容仍可分页取得。

单个预览内的字符串、数组、深层对象若仍过大，`boundedPreview` 逐项标明省略字段；过大的核心条件放入 `partial_fields` 并明确 truncated，不将部分 trigger/predicate 冒充完整条件。正常已校验的五个故障样本均完整保留原 trigger、正文、confidence 和 conflict。来源身份、K1、文档/条目 SHA 保留；超长来源明细单独标记 truncated。列表响应的 `sources_truncated` 与条目 `truncated` 分开。

字符串证据只有明确本系统局号才计自有；条目显式 external 来源的字符串引用计外部引用，其余无法归属的引用保持 unclassified。声明的支持/反对计数保留为原值，不因为引用数、查询或投影而升级可信度。来源列表总预算为 6000 字节，另有明确省略记录数，全文内仍保留所有来源。rk 外层的 full_entry/construction_summary 继续标原题型视图，条目是否完整以其 consumer_projection/truncated 和全文分页游标为准。

列表沿用原 `limit/offset/next_offset`。预算用尽时停在下一条之前；不再递增游标跳过超大匹配，`oversized_skipped=0`。空库、不匹配、动态不适用、未知和翻页结束仍分别反馈。全文和投影都经过同一角色/进阶、关键词、题型、楼层、牌组及原相关性选择器；全文参数不扩大范围。

## 按 ID 取得完整原条目

大条目给出 `full_document.tool/input`，例如：

```json
{"query":"策略ID","detail":"full","document_id":"策略ID","document_offset":0}
```

经验也可使用 `{"detail":"full","document_id":"经验ID"}`。保留原查询条件；`offset` 必须为 0、`limit` 必须为 1，或省略。`document_offset` 是全文分片的整数游标，与列表 offset 独立；非法输入、越界游标及当前范围内同 ID 歧义明确报错。未知 ID/动态不适用返回空，不绕过选择器取内容。

响应带 `entries:[{id}]`、来源、绑定 K1（SQLite）、`document_id`、`document_sha256`、`total_document_parts`、`json_fragment`、`document_offset` 和 `next_document_offset`。按后者继续到 null，依序拼接所有 `json_fragment`，核 SHA256 后 JSON.parse，可还原完整条目及所有证据/补证/限制；这是条目的 JSON 表示，不承诺原集合文件的空白格式。每片最多 9000 个经过 JSON 转义的内容字节，不切开 Unicode 码点，完整响应仍受 24KB 限制。多片全文保持 truncated，末片本身不代表之前已读完。工具不接路径、SQL、网络、角色或版本覆写参数。

SQLite 使用绑定行的原 payload，策略检索额外生成的 evidence_summary 不冒充存储原文。旧文件源复用相同消费分页；策略原有派生来源摘要仍可出现，原证据字段不丢失。铁甲的原角色筛选、空策略和策略规则保持；有界投影是消费者缺陷修复，不生成角色游戏知识。

## 与 #72 整局研究组合

#72 固定提交 `5ec842acc70c9c46617f109d40b544b3f97f691b` 的 `kb_build_research` 已有目录 `limit/offset` 与按 ID 的无损结构分页、附件及 JSON pointer。它没有走三种旧 typed 工具的超限跳过路径；本项保留该入口及其完整阶段/来源/反证/unknown、`verified_complete_playbook=false` 和 `validation_status=unverified`。整局研究使用自己的 `page_offset/next_page_offset`；不要将其和本项 `document_offset` 混用。

本项从 main `3f72590d1943914a254188b1763362bf1692d320` 开发，没有把 #72 来源改写或夹入本项提交。在隔离组合中应用 #72 的固定生产差量，仅调和 agent-knowledge.ts 和 store.ts 的新增 import，保留 #73 continuation；整局 11 项及本项/旧策略合计 70 项通过，生产 tsc 通过。实际发布仍由原集成员对最终组合核收，#72 自己的 schema4 配套部署/备份门保持；本项独立不需要 schema4。

## 发布与回退

ROOT/LIVE 必须同时安装新增 `knowledge-projection.ts` 和四个调用叶：`typed-knowledge.ts`、`strategy-tool.ts`、`reflex-knowledge.ts`、`agent-knowledge.ts`。共享 agent-knowledge.ts 与 #72 的 research 工具注册逐块合并，不覆盖整叶；不修改知识生产者、知识版本或原学习产物。部署后重建的 ToolDefs/MCP/提示目录自动包含相同参数，不要求每题查询或重写计划。原初始计划/后续复用代码不动。

回退这五个消费者源码叶的本项差量，保留 #72/#73 和其他后继修改；无需回滚 K1、删证据或降 schema。退回旧实现会重新出现超限不可消费，须在原发布记录里保留这一限制。实际 LIVE 五条实调及下一正常局工具调用中的 ID/K1/返回内容由 ops 核收，固定数据通过不代表上线、自然采用或胜率收益。

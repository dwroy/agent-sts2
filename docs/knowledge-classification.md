# 显式知识分类与空结果反馈（#66）

正式知识使用原 K1 快照、稳定 ID、业务类型及适用性。分类只增加可追溯检索元数据，不修改正文、来源、支持/反证、置信度、角色、进阶、游戏版本、幕、题型或动态条件。旧知识未分类时保持 `unknown`，禁止从 ID、标题、角色或正文自动补标签。业务类型为 experience / strategy / reflex / core / combo / direction / vocab / fact；类型由既有正式文件合同决定，分类不能改类型。

主题可多选 `startup / boss / double_boss / build_route / climb_route`，依次表示启动、本幕 Boss、双 Boss、构筑路线、爬楼路线。主题属于检索维度，不能当作适用条件或验证等级。`topics:[]` 表示学习者显式分类后未选这五类，区别于没有分类。具体主题、实体与别名仍由原学习者核证据产生；开发夹具不进入正式知识。

## 同快照关联的严格元数据

`characters/<角色>/classification.json` 只能关联本角色已覆盖文档，`common/classification.json` 只能关联已发布公共文档。公共分类不将来源角色证据算作消费角色验证。格式是：

```json
{
  "schema": "knowledge-classification-v1",
  "character": "silent",
  "entries": [{
    "id": "稳定分类记录ID",
    "target": {
      "path": "characters/silent/experience.json",
      "type": "experience",
      "id": "原知识ID",
      "sha256": "目标条目的规范JSON的64位SHA256"
    },
    "topics": [],
    "entities": [],
    "aliases": [],
    "evidence": ["原局号或已冻结来源引用"],
    "rationale": "原学习者核实的分类依据与限制"
  }]
}
```

这是形状说明，不是可发布知识。字段严格校验；未知字段、未知主题、重复主题/分类 ID/目标、空证据、悬空引用、错类型/角色/父 ID、过期 SHA 都拒绝。每文档最多 20000 项，实体/别名各32、证据64，各字符串≤200字符；沿原文档8MiB和候选32MiB限制。不按主题复制知识条目。

`target.parent_id` 在 combo 填原核心 direction，在 vocab 填维度，在 fact 填原 kind（cards/relics/monsters/events），其余省略。`sha256` 对目标条目对象递归排序键、保留数组顺序、无额外空白的 JSON 求 SHA256；不对整份文档或摘要求哈希。`classificationDigest` 与草稿 CLI 提供同一实现。

元数据和目标属于同一候选的完整合并视图；严格 V6/策略格式不加新字段。修改已分类正文或嵌套目标时，同候选更新相应目标 SHA，仍保留分类 ID/目标身份和旧分类证据。可修订主题/别名/依据，旧修订、快照和候选永久保留。原目标的证据、反证、置信度及范围规则继续校验，分类不解除它们。旧宽松经验格式已有合法 inline topics 继续读取；同目标存在显式元数据时以元数据主题为准。旧未知主题不被静默丢弃，非法输入校验报错。

## 学习与 runtime 操作

注册的 runtime 内容任务实际注入 `classificationLearningInstructions(character)`，包含本合同、候选边界和命令。`knowledge-candidate-v1`、原 batch/character/base/source、完成回调和来源证明保持。#67 后续运营任务据该固定接口接入；运营记录不能自动变成正式知识。

在 `agent/` 使用已绑定版本导出正式基线。以下变量代表原登记值；写出目录必须为原 scratch：

```bash
nice -n 19 node --import tsx tools/knowledge-runtime.ts export \
  --runtime "$RUNTIME" --version "$BOUND_K1" --character silent \
  --destination "$SCRATCH/published.json"
nice -n 19 node --import tsx tools/knowledge-runtime.ts classification-draft \
  --runtime "$RUNTIME" --version "$BOUND_K1" --character silent \
  --path characters/silent/experience.json --type experience --entry "$ENTRY_ID" \
  --classification-id "$CLASSIFICATION_ID" --id "$BATCH" --source "$ORIGINAL_SOURCE" \
  --destination "$SCRATCH/knowledge-candidate.json"
```

草稿只读数据库，不提交、不发布、不补标签。已有分类时保留原记录和同文档其他分类；新记录的 evidence/rationale 为空，必须由学习者核实补齐才可校验。嵌套目标加 `--parent <原父ID或kind>`。多条目标时先导出，再编辑完整分类文档；候选 `files` 中放文档 JSON 字符串，其他文档继承基线。

报告仍交原 `knowledge_candidate` 完成通道。可在隔离库依次运行原 `submit/validate/publish/status` 核验；生产发布仅由原完成回调/ops 做。外部/回刷仍须原已核 artifact 和逐 ID 来源证明，不能用分类绕开；需要新增原通道不支持的运营产物交 #67。重复候选同 ID/同字节幂等，同 ID 改内容拒绝。并发修订只有基线等于 current 的候选可发布；冲突保留原候选，重新核新基线后用新 ID 提交，不自动合并旧完整文档。

## 工具查询与诊断口径

真实 ToolDef 使用参数化索引，模型不能提供 SQL、角色、路径或任意版本。保留原工具名称、筛选、分页、24KB 输出上限。`topic` 匹配一个明确主题成员，`entity` 匹配原实体或学习者明确别名；短中文继续走 grams/分类关系索引，长关键词走 FTS5/精确显式别名。分类不作自由语义扩展。

```json
{"tool":"kb_experience","input":{"topic":"startup","limit":3}}
{"tool":"kb_strategies","input":{"query":"*","topic":"build_route","limit":3}}
{"tool":"kb_reflex","input":{"query":"*","entity":"原实体ID"}}
```

每次返回绑定 `knowledge_version` 和 `classification_coverage`：`scope` 是本角色+公共、该业务类型、原进阶范围内的总数/已分类数/未知数；`filter_pool` 保留本次其他索引条件、仅移除 topic 的相同三数。两组都是静态诊断，未验证幕/题型/HP/牌组/正文条件，不能当成可用知识或其他角色统计；不会返回其他角色 ID/正文。原条目/摘要之外，source 附分类状态、主题及原分类记录与修订/文档 SHA。

`empty_reasons` 可并列：

| 值 | 含义 |
|---|---|
| unclassified_in_filter_pool | 本次其他过滤后的池仍有未分类内容，主题空结果不能证明无知识 |
| no_filter_match | 严格索引筛选无匹配；可能同时存在未分类覆盖缺口 |
| no_published_content_in_scope | 绑定版、业务类型和本角色/公共进阶范围内无内容；不声称全库为空 |
| dynamic_conditions_not_applicable | 原选择器拒绝且所需输入已知；仅原 trigger/选择器层面 |
| dynamic_reason_unknown | 缺失/无效输入、未核流派或仅相关性选择，无法确定动态空因 |
| selector_no_match | 其余原选择器无匹配，原因未进一步证实 |

动态过滤统计分别给 `rejected/unknown`；非动态类型标 `not_evaluated`，rk 的 predicate 未求值，正文中未结构化的额外条件也未求值。结果非空不等于这些条件成立。超过末页用 `pagination_empty`；超大单条继续由 `oversized_skipped/next_offset` 区分，不算内容不存在。

系统提示从实际 ToolDef 渲染筛选用途。经验和策略线索均提供明确 `tool/input`，策略使用 `query:"*",limit:3`，不凭提示数量添加 topic。查询仍由大脑按需决定，零结果不自动拓宽或隐藏重试。构筑路线与爬楼路线独立判断，路线不变继续复用，分类刷新不触发重算。

## schema 升级、发布与回退

schema 1/2→3 在原 `BEGIN IMMEDIATE` 内追加 classification_bindings/classification_terms 及索引，保留所有原知识 revision/K1/current/候选/绑定。schema2 不重新迁移/导入正式知识，不造数据版本。无分类原库只增加空表，所有覆盖保持 unknown。只读 reader 需要 schema3，由 owner 先升级，不能自动改库或回落旧文件。

原 ops 在自然 publication-admission 边界核唯一写者与一致性备份，再以新组合运行原 `init --runtime`，核 schema3、旧 K1/条数/原ID/原绑定/逐叶SHA；部署新 reader/CLI/validator/projection 和学习最小注入必须同组合。分类更新沿原知识事务，不拿源码发布锁，不重 full；旧局固定旧 K1，新局才绑定新 K1。

分类回退沿原 `rollback --version <旧K1> --request <唯一ID>`，只影响下一新绑定。schema3→旧只认schema2的源码不能直开新库；保留新库和所有分类历史，使用匹配回退源码的 restore 入口将升级前一致性备份恢复到新目录（新版 restore 会自动升为 schema3），按原自然边界和原绑定规则核回退，禁止复制活动主文件覆盖。需要继续读新分类历史时恢复schema3消费者。工程检查、真实分类候选发布/工具读回与自然采用/收益分别验收；未发生项保持开放。

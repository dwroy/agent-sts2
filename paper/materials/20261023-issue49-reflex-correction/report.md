# #49 rk 合同修正交付

2026-10-23T17:38:04+08:00，[dev #49]，原会话/工作树接续。原交付6290300d8的 rk＝experience/shared-experience 映射错误，现按 Roy/主管裁定和 [issue最新评论6361846602](https://github.com/dwroy/agent-sts2/issues/49#issuecomment-6361846602) 改为真实 reflex knowledge。原提交、交付报告、96项结果及本次撤码红测原件均保留，不改历史。本报告与现行 docs/brain-agent-mode.md 替代初版报告的 rk 解释。

## 最终实现

- 新增 Silent 生产只读工具 `kb_reflex`，读取当前角色 `reflex.json`，按当前进阶与可选 applies_to 过滤；query 支持条目ID、Boss/精英/卡牌ID关键词或 `*`。返回真实 reflex ID、原版本、predicate、signal、confidence、evidence 和 source_experience。经验继续走 `kb_experience`，后者的相关经验筛选不再称作 rk。
- 复用既有 `loadV6Knowledge` 的严格角色、目录/文件边界、8MiB限制、schema、重复ID及词表/方向/core/combo引用校验。只新增可选的内部读取回调，将加载器实际解析字节与来源 SHA 绑定；默认读取、格式判断与 Jev 消费路径不变。返回所实际读取的 reflex.json、reflex-vocab.json、build-cores.json、direction-cards.json 的版本/schema、角色与SHA；未读取的缺失文件不冒称有SHA。
- 没有回退到 experience、公共目录、pending或其他角色私库。工具输入不接受路径/角色/进阶/写入参数。缺失、合法空库、关键词无命中和坏库分别有状态；坏库/引用报错。最多12条/24KB，保留完整条目证据，不截断，省略数单列。
- `brain-query-cues-v2` 分列策略、rk、经验。rk线索只放真实ID/applies_to和最多六个 Boss/敌人/幕威胁的文本检索计数及查询参数，不含 label_en/predicate/signal正文。词条提及数是“检索候选”，不是 predicate 真值、下一精英预测或自然采用证明。坏的可选威胁库不阻断rk线索。
- rk查询不执行 predicate，返回 `predicate_evaluation=not_evaluated`，不把未来战斗状态补为已知。`V6_COMBAT_ENTRIES=off` 时仍可只读查已有 combat_line 知识供规划；不启用其 Jev 执行消费。没有修改任何正式知识文件、V6配置、Jev出牌实现或运维prompt。
- `query_audit.schema=brain-query-audit-v2`：strategies 只计 kb_strategies，rk 只计 kb_reflex，experience 只计 kb_experience。真实返回ID、调用/命中/未知命中数在成功和失败题均记录；source_experience仅为来源关联，不冒充reflex命中ID。完整来源/SHA保留在 tool_calls。
- 报告从原始 tool_calls 重建三个独立统计，不信旧错标 query_audit。前18局没有 kb_reflex 时，rk查询率为0、rk_available_questions为0，不能把经验调用补记成rk。仍按引擎/互斥题型分别给查询率、命中率、调用次数和耗时；自然前后比较不冒称因果效果。
- Silent 工具数由14增为15，其他角色仍为原14；调用数仍为原8次与原查询/作答时间预算，同引擎兜底不变。新增工具不增加调用额度。#50题面未改。

## 验证和原件

修正前先增加两条真实rk回归：在6290300d8原源码上 **2失败**（不存在kb_reflex、线索误指kb_experience），`red-original.log` 保留。首轮修正 tsc0/4文件34项通过；扩展后 tsc0/10文件167项通过。再补坏威胁库隔离与实际脑日志成功/失败回归，最终 **tsc0、10文件169项通过、0失败**。最终检查前后17份源/测试输入SHA相同，见 inputs-before.json/inputs-after.json；原所有检查日志保留。

固定覆盖真实reflex来源与可信度/证据、来源经验分离、文件刷新、角色/进阶过滤、空/缺失/无命中/坏库、词表引用与实际SHA、重复ID/跨角色/软链越界拒绝、参数白名单、只读字节保持、6条线索/12条正文/24KB边界、实际MCP回包、真实rk额度耗尽后的同引擎无工具作答、历史报告纠错、成功/失败脑日志；复用 V6 严格格式/基础设施以及原 Jev 关闭态各角色 frozen wire 字节等价测试。

```text
cd agent
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 npx tsc -p tsconfig.json --noEmit
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 npx vitest run \
  tests/brain-reflex-knowledge.test.ts tests/brain-query-guidance.test.ts \
  tests/brain-agent-mode.test.ts tests/brain-agent-report.test.ts \
  tests/brain-agent-provenance.test.ts tests/strategy-entries.test.ts \
  tests/external-strategy-evidence.test.ts tests/v6-infrastructure.test.ts \
  tests/v6-formats.test.ts tests/v6-combat-entries.test.ts \
  --pool=threads --maxWorkers=1
```

检查均固定数据、nice19、单worker，无模型请求、play或实验局。原生 turn_context 再核 gpt-6.1-sol/high，session-metadata.json 仅保存模型/档位回执，不改共用配置。按派发要求不跑完整测试；集成员按最新评论，在 #49 与 #26 最小可选提示冻结后组合一次唯一full，冲突则 #49 先。

## 交接和开放验收

本修正接在6290300d8之后；集成应取完整两提交链，不能只把新增修正当成独立基础补丁。保留初版19叶及其失败/报告原件；自然验收仍待ops在真实发布后冻结原18局和首批自然局日志，以纠正后的rk口径独立读回。未合main/live、未分配release_id、未代 #28 的 Jev 消费者发布，不关闭自然验收父要求。

回退由ops沿原发布锁撤回本issue两个提交的行为叶，保留知识与日志；不通过打开/关闭 V6_COMBAT_ENTRIES 作为查询功能的回退方式。旧错误口径不恢复为现行说明，证据继续保留。

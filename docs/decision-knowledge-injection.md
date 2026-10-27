# 决策点默认知识摘要（#81，待审、默认关闭）

本实现以 `beaa87f2c3f94f0a95f2829cb0329188d4de5ced` 为基线，只交开发分支审阅。#80 的暂停与 Roy 审阅门优先：源码、测试或交付请求存在均不授权集成、发布知识、打开开关或恢复对局。

## 开关与送达

`BRAIN_DECISION_KNOWLEDGE=on|off` 默认 `off`。`BRAIN_DECISION_KNOWLEDGE_BYTES` 默认 **8000**，接受 **2048–24000** 的整数字节预算；无效配置拒绝启动。配置随进程冻结，启用时写入 `run-config.brain.decision_knowledge`。现有整题、查询、作答预算不变。

启用后，Silent 的生产知识工具模式在 `Brain.request` 给题面增加 `decision_knowledge`，Codex 与 DeepSeek 共用。它是上下文，不消耗工具调用。原题、候选、状态与答案格式不裁剪；预算约束整个摘要 JSON 的 UTF-8 序列化，包含来源、条件和元数据。原 router 的 payload 日志保存实际摘要，不能把生成摘要当作模型实际采用。

关闭或历史配置未设置时，不读新文档、不加取回工具、不改题面或系统提示；固定测试比较这些字段的序列化字节。Ironclad 即使开关为 on 也保持原请求。

| 题目入口 | 触发 |
| --- | --- |
| `reward/card`、`selection/add` | 选牌 |
| `shop/*` | 商店；现场删牌服务 available/enough_gold 且未 used 时同时查删牌 |
| `selection/upgrade`、`selection/remove` | 升级、删牌 |
| `run-plan` 的 start/act；普通题携带 `run_plan_task.trigger` | 开局、幕复核；hp_drop/周期复核不冒作幕初 |
| `map/act-start`、`event/act-plan` | 幕复核 |
| `fight-plan` 的 `fight_state.fight=boss` | Boss入场；精英/普通战不匹配 |
| `map/route`、`map/route-plan`、`map/route-review` | 路线 |
| `rest/*` | 营火；现场启用 SMITH 时同时查升级 |
| `event/*` | 事件；仅提供契约已有的相关上下文能力 |

升级/删牌一次题只认题中具名候选；不把货架牌当可删牌，不用全文描述、历史或牌组里的任意 ID 冒作当前提供。未进入大脑的 Jev/代码决策不在本改动范围内，既有出牌执行不变。`用药` 是契约保留触发，不额外创建药水或战斗请求。

## 与 #80 对齐的最小发布契约

新叶固定为 `characters/silent/decision-context.json`：

```json
{"schema":"decision-context-v1","character":"silent","status":"published","entries":[]}
```

它沿原 K1 candidate/validate/publish/rollback 链存储，与其他知识文档一起参与 manifest、快照、完整性及历史保留，无 SQLite schema 迁移。此提交不创建正式知识叶、不转换或发布任何 #80 候选。

每个条目保留 #80 的 `id/dimension/triggers/conditions/summary/rule_candidate/confidence/denominators/evidence_refs/counterexamples/limitations/conflicts_with` 概念；新增 `status=active|retired`、显示 `priority=0..100` 与 `review_origin`。`details` 可保存各维的结构化表、分幕检查点、HP 目标或取舍内容，消费者不生成数值、排名或规则。

| 内容 | 正式契约 |
| --- | --- |
| ID | 1–160 字符的 ASCII 字母、数字、`_ . : -`，文档内唯一 |
| `triggers` | `选牌/商店/升级/删牌/开局/幕复核/Boss入场/路线/营火/事件/用药` 的非空去重数组 |
| `conditions` | 必需 `character:"silent"`、`ascensions:[整数]`；可选 `acts/floors/game_versions/bosses/candidate_ids/deck_cards/archetype/observed`，拒绝未知键 |
| `deck_cards` | `[{id,min}]`，实际牌组必须满足全部最小计数 |
| `archetype` | `{model_sha256,version,clusters}`，复用既有固定 SHA 的当前牌组几何；三个字段全部精确匹配，不等于已成型或流派收益 |
| `observed` | `[{path,equals}]`；只读当前 `payload.facts/fight_state/run_state/run_plan_task/run_brief` 或 `state.run/combat` 的显式路径，数组下标可用；未知字段不成立，所有条件合取 |
| `denominators` | 非空 JSON 对象/数组，保留来源的分层与独立单位；不求和或转成收益分 |
| `evidence_refs` | 非空已解析对象数组；`own_run` 带 run_id、floor>0、offset≥0、length>0、sha256、support/contradict；`external_aggregate` 带 external 来源、HTTPS URL、版本、下载日、冻结 SHA、筛选、单位及正整数 n、support/contradict |
| `counterexamples/conflicts_with/limitations` | 前两项为原内容数组（原对象可包成一项），局限为非空文本数组；不因发生冲突而删掉反证 |
| `review_origin` | `{schema:"issue80-review-candidates-v1",id,sha256,conditions}`，保留原候选 ID、文件 SHA 与原始条件全文 |

`observed` 是精确值比较，数组保序、对象键序不影响相等；不解释自然语言，不执行脚本，不访问路径外的历史/记忆/文件。缺失实际游戏版本、牌组、流派几何或其他受限事实就不匹配；不从外部资料的版本推定当前游戏版本。Boss入场按当前敌人 ID 或精确组合 `A+B` 查，不用旧 act_boss 时钟代当前遭遇。其他题的 Boss 过滤使用当前题面/原状态明确的 act_boss。

**#80 原 `review-only` 文件及其混合文字条件不能直接当正式契约。** 审阅通过后，由知识负责人解析来源引用、保留原条件、逐条写出获准的机器条件。历史节点簇不等于当前牌组几何；原 visible-state signature、文字前提或其他未知条件没有已审定等价转换时保持候选，不删条件求匹配。这里的 `priority` 只控制显示顺序，不是卡牌价值；无合格优先级证据可以仅发布关联提示，不能由开发者补出选牌表。

发布更新不能删除已有条目、来源、分母、反证、局限和冲突；退休保留原件。机器条件、触发与原审阅来源变动拒绝原 ID 更新，需要经知识负责人审阅另立 ID、退休旧条目。源码接收和 K1 发布仍是两项独立验收。

## 有界投影与完整取回

按显示 priority 降序、条件特异性、原 confidence、ID 稳定排序。每条先保完整条目；过大时提供有界消费投影，保 ID、原 confidence、正文/条件/分母/限制/反证摘录及证据计数。小预算保有正文摘要入口；所有有损字段在 `partial_fields`，字段内截断给 `partial_json_text`，同时列 `truncated/omitted_fields`。整页带 total_matches/returned/omitted/truncated。优先级低的完整条目在总预算满时省略，不裁掉原问题。

与 #78 保持同一原则和全文片段协议：完整存储不改，显示预算不靠升高 24KB 绕过；最近引用指原数组末项，不推定日期或证据强弱；优先保反证，再选末项与最大外部分母，分母不相加。摘要省略不能当作没有反证。

启用时大脑获得只读 `kb_decision_context`，摘要的 `full_document` 给出精确取回参数：

```json
{"detail":"full","document_id":"原条目ID","document_offset":0}
```

工具同样按绑定 K1、当前角色、进阶及本题全部动态条件匹配。按 `next_document_offset` 续取到 null，拼接 `json_fragment` 后解析；每片带 `representation:full_document_fragment`、原文 SHA、K1、文档 SHA、总片数与 `encoding:concatenated-json`，小于 24KB。固定测试对中文、emoji、引号、反斜线及换行逐片无损重建。工具不接受文件路径、任意查询或写入参数。

## 审阅后接续

1. Roy 审阅五维包及 #78/#81，审阅前保持原暂停，不提交生产队列。
2. 知识负责人形成具备真实来源和明确条件的正式候选，沿原 K1 链验收；不能把36条待审候选直接计为新知识。
3. 原集成员核实际组合、完整检查与 ROOT/LIVE 叶映射；ops 在获准边界发布、登记真实源码/K1，再按授权启用开关。任何实际行为发布编号归原 ops 分配，本分支不造编号。
4. 从原保存局/自然题记录核 run-config 开关/预算、摘要 K1/SHA/ID/字节、匹配/缺失/裁剪及实际大脑请求，再核采用。统计学习收益、50局各阶段指标仍由 #80 原负责人闭环。

回退时原 ops 在获准的自然启动点关闭开关，后续请求恢复原工具题面；原 K1、候选、原始证据与历史不删除。已经运行的进程不热切参数，不由开发树改 live/STOP/PAUSE。
